// ─── APIError ──────────────────────────────────────────────────────────────────
// Extends GraphQLError to carry an HTTP status code alongside the GraphQL error
// code. Throw this in resolvers, services, and REST handlers for consistent
// error responses.
//
// Usage:
//   throw new APIError('Not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } })

import { GraphQLError } from 'graphql'

import { APIErrorOptions } from '@/shared/errors/type'

export class APIError extends GraphQLError {
  readonly options: APIErrorOptions

  constructor(message: string, options?: APIErrorOptions) {
    const settedOptions = options ?? { extensions: { code: 'INTERNAL_SERVER_ERROR', http: { status: 500 } } }
    super(message, settedOptions)
    this.options = settedOptions
  }
}
