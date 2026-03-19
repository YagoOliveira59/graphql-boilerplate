// ─── Shared Types ──────────────────────────────────────────────────────────────
// Central type definitions used across the entire application.
// The `Context` interface is the most important — it's available in every resolver.

import { BaseContext } from '@apollo/server'
import { StandaloneServerContextFunctionArgument } from '@apollo/server/standalone'
import { HydratedDocument } from 'mongoose'
import { type Logger } from 'winston'

import { UserDocument } from '@/core/entities/user/model/types'
import { Models } from '@/core/shared/models'

import { ALLOWED_WORKERS } from '@/shared/constants'

/**
 * Extended Mongoose document type.
 * Adds tracking fields used for audit logging in pre-save hooks.
 */
export type CustomHydratedDocument<T> = HydratedDocument<T> & {
  wasNew: boolean
  modPaths: string[]
  $locals: {
    ip: string | string[] | undefined
  }
}

/**
 * Identifies which internal service/worker made a request.
 * Populated when the request comes from a machine token (/internal endpoint).
 */
export type WorkerSource = (typeof ALLOWED_WORKERS)[number]

/**
 * GraphQL context — available in every resolver as the third argument.
 *
 * TODO: Extend this interface with additional services your project needs:
 *   - billingService: BillingService
 *   - searchService: SearchService
 *   - featureFlag: FeatureFlagContext
 *   - etc.
 */
export interface Context extends BaseContext {
  /** The authenticated user. Available after a successful /auth token exchange. */
  user: UserDocument
  /** Mongoose models registry — use this instead of importing models directly in resolvers. */
  models: Models
  /** The raw Express request object. */
  request: StandaloneServerContextFunctionArgument['req']
  /** Winston logger enriched with trace context for this request. */
  logger: Logger
  /** Feature permission flags decoded from the JWT. */
  permissions: Record<string, boolean>
  /** Present when the request was made by an internal service, not a user. */
  workerSource?: WorkerSource
}
