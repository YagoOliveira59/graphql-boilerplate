// ─── Authorization ─────────────────────────────────────────────────────────────
// Core authentication and token management functions.
//
// Flow:
//   1. Client authenticates with Firebase and gets a Firebase ID token
//   2. Client sends the Firebase token to GET /auth
//   3. Server verifies the Firebase token, loads the user from DB,
//      and issues a signed internal JWT (RS256)
//   4. Client uses the internal JWT for all subsequent GraphQL requests
//   5. When the JWT is close to expiry, the client calls GET /refresh
//
// Token types:
//   - Firebase ID token: issued by Firebase, verified with Firebase Admin SDK
//   - Internal JWT (RS256): issued by this server, used for GraphQL auth
//
// TODO: Customize getUserPermissions() to fit your permission model.

import { decode, sign, verify } from 'jsonwebtoken'
import { Logger } from 'winston'

import { checkUserRecord, checkIdToken, getCustomToken, getUser } from '@/lib/firebase'

import { TOKEN_TOLERANCE_MINUTES } from '@/core/authorization/constants'
import { AuthTokenPayload, GetAuthTokenArgsType, RefreshAuthTokenArgsType, TokenFbPayload } from '@/core/authorization/types'
import { Models } from '@/core/shared/models'

import { APIError } from '@/shared/errors'
import { RedisDeps } from '@/lib/apollo/testRedisDeps'

// ─── Token secret ─────────────────────────────────────────────────────────────
const getTokenSecret = () => {
  if (!process.env.APP_TOKEN_SECRET) {
    throw new APIError('Environment variable APP_TOKEN_SECRET not set', {
      extensions: { code: 'INTERNAL_ENV_NOT_SET', http: { status: 500 } }
    })
  }
  return process.env.APP_TOKEN_SECRET.replace(/\\n/g, '\n')
}

// ─── Permission builder ───────────────────────────────────────────────────────
/**
 * Returns a map of feature permissions for the given user.
 * TODO: Replace with your actual permission logic (e.g. role-based, plan-based).
 */
const getUserPermissions = async (user: { role: string }): Promise<Record<string, boolean>> => {
  return {
    // TODO: Add your feature flags / permissions here
    isAdmin: user.role === 'ADMIN'
  }
}

// ─── Token generation ─────────────────────────────────────────────────────────
const generateAuthToken = async ({
  firebaseCustomToken,
  user,
  secret,
  logger
}: {
  firebaseCustomToken: string
  user: { _id: { toString(): string }; role: string }
  secret: string
  logger: Logger
}): Promise<string> => {
  const permissions = await getUserPermissions(user)
  const { exp, iat } = decode(firebaseCustomToken) as { exp: number; iat: number }

  const tokenPayload: AuthTokenPayload = {
    ...permissions,
    tokenFb: firebaseCustomToken,
    userId: user._id.toString(),
    userRole: user.role,
    features: permissions,
    exp,
    iat
  }

  const authToken = sign(tokenPayload, secret, { algorithm: 'RS256' })

  logger.info('🔐 Generated user authorization token', {
    userId: user._id.toString(),
    permissions,
    exp,
    iat
  })

  return `Bearer ${authToken}`
}

// ─── Token validation ─────────────────────────────────────────────────────────
const validateAuthToken = async ({
  authToken,
  secret,
  considerExpTolerance,
  userId,
  logger
}: {
  authToken: string
  secret: string
  considerExpTolerance: boolean
  userId: string
  logger: Logger
  redisDeps?: RedisDeps
}): Promise<AuthTokenPayload> => {
  try {
    const decodedToken = verify(authToken, secret, { algorithms: ['RS256', 'HS256'] }) as AuthTokenPayload

    if (considerExpTolerance) {
      const minutesToExpire = (decodedToken.exp - decodedToken.iat) / 60
      if (minutesToExpire < TOKEN_TOLERANCE_MINUTES) {
        logger.info('🔐 Authorization token nearing expiry', { userId })
        throw new APIError('Authorization token expired', {
          extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } }
        })
      }
    }

    return decodedToken
  } catch (error) {
    if (error instanceof APIError) throw error
    logger.info('🔐 Invalid or expired authorization token', { error, userId })
    throw new APIError('Authorization token invalid or expired', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } }
    })
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Strips the 'Bearer ' prefix from an Authorization header value. */
export const extractBearerToken = (authorization: string) => {
  if (authorization.startsWith('Bearer ')) return authorization.substring(7)
  return authorization
}

/**
 * Exchanges a Firebase ID token for an internal JWT.
 * Called by the GET /auth endpoint.
 */
export const getAuthToken = async ({ authorization, models, logger, request: _request, redisDeps: _redisDeps }: GetAuthTokenArgsType): Promise<string> => {
  const secret = getTokenSecret()
  const firebaseToken = extractBearerToken(authorization)

  // 1. Verify the Firebase token
  const decodedIdToken = await checkIdToken(firebaseToken)

  // 2. Get normalized user info from Firebase
  const firebaseUserData = await getUser(decodedIdToken)

  // 3. Find or create the user in your database
  // TODO: Implement your user upsert logic here
  const user = await models.User.findOneAndUpdate(
    { email: firebaseUserData.email },
    {
      $setOnInsert: {
        email: firebaseUserData.email,
        firstName: firebaseUserData.firstName,
        lastName: firebaseUserData.lastName,
        picture: firebaseUserData.picture,
        role: 'USER'
      }
    },
    { upsert: true, new: true }
  )

  if (!user) {
    throw new APIError('User not found', { extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } } })
  }

  // 4. Create a Firebase custom token (embedded in internal JWT)
  const firebaseCustomToken = await getCustomToken({ uid: decodedIdToken.uid })

  return generateAuthToken({ firebaseCustomToken, user, secret, logger })
}

/**
 * Refreshes an existing internal JWT if still valid (or re-generates if expired).
 * Called by the GET /refresh endpoint.
 */
export const refreshAuthToken = async ({ authorization, models, request, logger, redisDeps }: RefreshAuthTokenArgsType): Promise<string> => {
  const secret = getTokenSecret()
  const authToken = extractBearerToken(authorization)

  try {
    // If the token is still valid (with tolerance), return it as-is
    const decoded = decode(authToken) as AuthTokenPayload
    await validateAuthToken({ authToken, secret, considerExpTolerance: true, userId: decoded?.userId, logger, redisDeps })
    return `Bearer ${authToken}`
  } catch (_error) {
    // Token expired — re-authenticate via Firebase
    return getAuthToken({ authorization: `Bearer ${extractBearerToken(authToken)}`, models, logger, request, redisDeps })
  }
}

/**
 * Validates an internal JWT and returns the user + permissions.
 * Called on every GraphQL request in setContext.
 */
export const checkAuthToken = async (
  authToken: string,
  models: Models,
  logger: Logger,
  redisDeps?: RedisDeps
): Promise<{ user: Awaited<ReturnType<Models['User']['findById']>>; permissions: Record<string, boolean> }> => {
  const secret = getTokenSecret()
  const { userId } = decode(authToken) as AuthTokenPayload

  const { features, tokenFb } = await validateAuthToken({
    authToken,
    secret,
    considerExpTolerance: false,
    userId,
    logger,
    redisDeps
  })

  // Verify the embedded Firebase token is still valid (checks revocation)
  if (tokenFb) {
    const { uid, loginTime } = (() => {
      const decoded = decode(tokenFb) as TokenFbPayload
      return { uid: decoded.uid, loginTime: new Date(decoded.claims.loginTime) }
    })()
    await checkUserRecord(uid, loginTime)
  }

  const user = await models.User.findById(userId)
  if (!user) {
    throw new APIError('User not found', { extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } } })
  }

  const permissions = features ?? {}
  logger.info('👤 User authenticated', { userId: user._id.toString() })
  return { user, permissions }
}
