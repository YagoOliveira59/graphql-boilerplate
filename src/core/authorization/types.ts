// ─── Authorization Types ───────────────────────────────────────────────────────

import { StandaloneServerContextFunctionArgument } from '@apollo/server/standalone'
import { Logger } from 'winston'

import { RedisDeps } from '@/lib/apollo/testRedisDeps'

import { Models } from '@/core/shared/models'

/** Payload embedded in the internal JWT (signed with RS256). */
export type AuthTokenPayload = {
  userId: string
  userRole: string
  /** Firebase custom token — present for regular user sessions. */
  tokenFb?: string
  /** Worker token — present for machine-to-machine sessions. */
  workerToken?: string
  /** Feature permission flags. TODO: customize to your needs. */
  features?: Record<string, boolean>
  exp: number
  iat: number
}

/** Payload from a decoded Firebase custom token. */
export type TokenFbPayload = {
  uid: string
  claims: { loginTime: string }
  exp: number
  iat: number
}

/** Payload from a decoded worker/service token. */
export type WorkerTokenPayload = {
  source: string
  userId?: string
  email?: string
  exp: number
  iat: number
}

// ─── Function argument types ──────────────────────────────────────────────────

export type GetAuthTokenArgsType = {
  authorization: string
  models: Models
  logger: Logger
  request: StandaloneServerContextFunctionArgument['req']
  redisDeps?: RedisDeps
}

export type RefreshAuthTokenArgsType = GetAuthTokenArgsType

export type ValidateAuthTokenArgsType = {
  authToken: string
  secret: string
  considerExpTolerance: boolean
  userId: string
  logger: Logger
  redisDeps?: RedisDeps
}
