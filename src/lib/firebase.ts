// ─── Firebase Admin SDK ────────────────────────────────────────────────────────
// Initializes Firebase Admin and exposes helpers used by the auth system.
// The SDK verifies Firebase ID tokens issued by the client app.
//
// TODO: Configure your Firebase project at https://console.firebase.google.com/
// and fill in the FIREBASE_* variables in your .env file.

import admin, { FirebaseError } from 'firebase-admin'
import { DecodedIdToken, getAuth } from 'firebase-admin/auth'

import logger from '@/lib/winston'

import { APIError } from '@/shared/errors'

const firebaseOptions: admin.AppOptions = {}

if (!process.env.FIREBASE_DATABASE_URL) {
  throw new APIError('Environment variable FIREBASE_DATABASE_URL not set', {
    extensions: { code: 'INTERNAL_ENV_NOT_SET', http: { status: 500 } }
  })
}
firebaseOptions.databaseURL = process.env.FIREBASE_DATABASE_URL

if (!process.env.FIREBASE_PROJECT_ID) {
  throw new APIError('Environment variable FIREBASE_PROJECT_ID not set', {
    extensions: { code: 'INTERNAL_ENV_NOT_SET', http: { status: 500 } }
  })
}
firebaseOptions.projectId = process.env.FIREBASE_PROJECT_ID

// Use explicit credentials when not running inside GCP with a default service account
if (JSON.parse(process.env.FIREBASE_USE_DEFAULT_SERVICE_ACCOUNT ?? 'false') === false) {
  if (!process.env.FIREBASE_CLIENT_EMAIL) {
    throw new APIError('Environment variable FIREBASE_CLIENT_EMAIL not set', {
      extensions: { code: 'INTERNAL_ENV_NOT_SET', http: { status: 500 } }
    })
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL

  if (!process.env.FIREBASE_PRIVATE_KEY) {
    throw new APIError('Environment variable FIREBASE_PRIVATE_KEY not set', {
      extensions: { code: 'INTERNAL_ENV_NOT_SET', http: { status: 500 } }
    })
  }
  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')

  firebaseOptions.credential = admin.credential.cert({
    projectId: firebaseOptions.projectId,
    clientEmail,
    privateKey
  })
}

const app = admin.initializeApp(firebaseOptions)

/** Looks up a Firebase user by email. Returns null if not found. */
export const getUserByEmail = async (email: string) => {
  try {
    return await getAuth(app).getUserByEmail(email)
  } catch (error) {
    const firebaseError = error as FirebaseError
    if (firebaseError.code === 'auth/user-not-found') {
      logger.info('Firebase user not found by email.', { email })
      return null
    }
    logger.error('Failed to get Firebase user by email.', { error, email })
    throw new APIError('Failed to get Firebase user by email', {
      extensions: { code: 'INTERNAL_ERROR', http: { status: 500 } }
    })
  }
}

/** Deletes a Firebase user by UID. */
export const deleteUser = async (uid: string) => {
  try {
    await getAuth(app).deleteUser(uid)
  } catch (error) {
    logger.error('Failed to delete Firebase user.', { error, uid })
    throw new APIError('Failed to delete Firebase user', {
      extensions: { code: 'INTERNAL_ERROR', http: { status: 500 } }
    })
  }
}

/** Revokes all refresh tokens for a Firebase user (forces re-login). */
export const revokeSession = async (uid: string) => {
  try {
    await getAuth(app).revokeRefreshTokens(uid)
    const userRecord = await getAuth(app).getUser(uid)
    const tokenRevokeTime = new Date(userRecord.tokensValidAfterTime ?? '').getTime() / 1000
    logger.info(`Tokens revoked at: ${tokenRevokeTime}`, uid)
  } catch (error) {
    logger.error('Failed to revoke Firebase session.', error)
    throw new APIError('Failed to revoke Firebase session', {
      extensions: { code: 'INTERNAL_ERROR', http: { status: 500 } }
    })
  }
}

/** Creates a Firebase custom token for the given user data. */
export const getCustomToken = async (firebaseUserData: { uid: string; [key: string]: unknown }) => {
  try {
    return await getAuth(app).createCustomToken(firebaseUserData.uid, firebaseUserData)
  } catch (error) {
    logger.error('Failed to create Firebase custom token.', error)
    throw new APIError('Failed to create Firebase custom token', {
      extensions: { code: 'INTERNAL_ERROR', http: { status: 500 } }
    })
  }
}

/** Verifies a Firebase ID token and returns the decoded payload. */
export const checkIdToken = async (idToken: string) => {
  try {
    return await getAuth(app).verifyIdToken(idToken, true)
  } catch (error) {
    logger.error('Invalid Firebase token.', { error })
    throw new APIError('Invalid Firebase token', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } }
    })
  }
}

/** Retrieves and validates a Firebase user record by UID. */
export const checkUserRecord = async (uid: string, loginTime: Date) => {
  const userRecord = await getAuth(app).getUser(uid)
  if (!userRecord) {
    throw new APIError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } } })
  }
  if (!userRecord.email) {
    throw new APIError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } } })
  }
  if (userRecord.disabled) {
    throw new APIError('User disabled', { extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } } })
  }

  const [emailUsername, emailDomain] = userRecord.email.split('@')
  const [firstName, ...otherNames] = userRecord.displayName?.trim().split(/\s+/).filter(Boolean) ?? []
  const lastName = otherNames.join(' ')

  return {
    uid: userRecord.uid,
    email: userRecord.email,
    firstName: firstName || emailUsername,
    lastName: lastName || emailDomain,
    picture: userRecord.photoURL,
    providers: userRecord.providerData.map((info) => info.providerId),
    loginTime
  }
}

/**
 * Returns normalized user info from a decoded Firebase ID token.
 * In non-production environments, skips the full user record check for speed.
 */
export const getUser = async (decodedIdToken: DecodedIdToken) => {
  const loginTime = new Date(decodedIdToken.auth_time * 1000)
  if (process.env.NODE_ENV === 'production') {
    return checkUserRecord(decodedIdToken.uid, loginTime)
  }

  if (!decodedIdToken.email) {
    throw new APIError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } } })
  }

  const [firstName, lastName] = decodedIdToken.email.split('@')
  return {
    uid: decodedIdToken.uid,
    email: decodedIdToken.email,
    firstName,
    lastName,
    picture: decodedIdToken.picture as string | undefined,
    providers: [decodedIdToken.firebase.sign_in_provider],
    loginTime
  }
}

/** Generates a Firebase password reset link for the given email. */
export const generatePasswordResetLink = async (email: string) => {
  try {
    return await getAuth(app).generatePasswordResetLink(email)
  } catch (error) {
    const firebaseError = error as FirebaseError
    if (firebaseError.code === 'auth/user-not-found') {
      logger.info('Firebase user not found for password reset', { email })
      return null
    }
    logger.error('Failed to generate password reset link.', { error, email })
    throw new APIError('Failed to generate password reset link', {
      extensions: { code: 'INTERNAL_ERROR', http: { status: 500 } }
    })
  }
}

export default app
