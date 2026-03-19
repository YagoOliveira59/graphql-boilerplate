// ─── Apollo Server Utilities ───────────────────────────────────────────────────
// Contains:
//   - Apollo plugins (logging, error handling, landing page)
//   - setContext: builds the GraphQL context on every request
//   - getAuthorizationHeader: helper to extract the Authorization header

import { ApolloServerPlugin, ContextFunction } from '@apollo/server'
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled'
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault
} from '@apollo/server/plugin/landingPage/default'
import { StandaloneServerContextFunctionArgument } from '@apollo/server/standalone'

import { getTestRedisDeps } from '@/lib/apollo/testRedisDeps'
import logger, { getLoggerChildWithTrace } from '@/lib/winston'

import { checkAuthToken, extractBearerToken } from '@/core/authorization'
import { models } from '@/core/shared/models'

import { APIError } from '@/shared/errors'
import * as types from '@/shared/types'

// ─── Landing page plugin ───────────────────────────────────────────────────────
export const plugins: Array<ApolloServerPlugin<types.Context>> = [ApolloServerPluginLandingPageDisabled()]

if (JSON.parse(process.env.GRAPHQL_PLAYGROUND ?? 'false')) {
  if (process.env.NODE_ENV === 'production') {
    plugins.push(ApolloServerPluginLandingPageProductionDefault({ footer: false }))
  } else {
    plugins.push(ApolloServerPluginLandingPageLocalDefault({ footer: false }))
  }
}

// ─── Request lifecycle plugin ─────────────────────────────────────────────────
// Logs request start/end timing and errors for every GraphQL operation.
const apolloLifecyclePlugin = (): ApolloServerPlugin<types.Context> => {
  return {
    requestDidStart: async ({ request }) => {
      const startTime = new Date().getTime()
      const requestHeaders = request?.http?.headers
      let reqLogger = getLoggerChildWithTrace(requestHeaders)
      reqLogger.info({ message: '⏱️ Request started' })

      return {
        didResolveOperation: async ({ operationName }) => {
          const operationNameResolved = operationName ?? requestHeaders?.get('X-Operation-Name') ?? undefined
          reqLogger = getLoggerChildWithTrace(requestHeaders, operationNameResolved)
        },
        willSendResponse: async () => {
          const totalTimeMs = new Date().getTime() - startTime
          reqLogger.info({ message: '⏱️ Request ended', timeMs: totalTimeMs })
        },
        didEncounterErrors: async ({ errors }) => {
          const totalTimeMs = new Date().getTime() - startTime
          reqLogger.info({ message: '💩 Request error', timeMs: totalTimeMs, errors })
        }
      }
    },
    invalidRequestWasReceived: async ({ error }) => {
      const reqLogger = getLoggerChildWithTrace()
      reqLogger.error({ message: '💩 Bad request', errors: [error] })
    },
    unexpectedErrorProcessingRequest: async ({ requestContext, error }) => {
      const requestHeaders = requestContext.request?.http?.headers
      const operationName =
        requestContext.request?.operationName ?? requestHeaders?.get('X-Operation-Name') ?? undefined
      const reqLogger = getLoggerChildWithTrace(requestHeaders, operationName)
      reqLogger.error({ message: '🚨 Unexpected error', errors: [error] })
    }
  }
}
plugins.push(apolloLifecyclePlugin())

// ─── Context builder ──────────────────────────────────────────────────────────
// Runs on every GraphQL request. Extracts and validates the auth token,
// then builds the context object passed to all resolvers.
//
// TODO: Extend this context with your own services (e.g. billingService, searchService).
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const setContext: ContextFunction<[StandaloneServerContextFunctionArgument], types.Context> = async ({
  req: request
}) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const operationName = request?.body?.operationName ?? request?.headers?.['X-Operation-Name'] ?? ''
  const reqLogger = getLoggerChildWithTrace(request?.headers, operationName)

  const authorization = request?.headers?.authorization ?? ''
  const authToken = extractBearerToken(authorization)

  const redisDeps = getTestRedisDeps()
  const { user, permissions } = await checkAuthToken(authToken, models, reqLogger, redisDeps)

  return {
    models,
    user,
    request,
    logger: reqLogger,
    permissions
  }
}

// ─── Auth header helper ───────────────────────────────────────────────────────
export const getAuthorizationHeader = (request: StandaloneServerContextFunctionArgument['req']) => {
  const { authorization } = request.headers
  if (!authorization) {
    logger.error('Request Authorization header not found')
    throw new APIError('Request Authorization header not found', {
      extensions: { code: 'AUTHENTICATION_HEADER_REQUIRED', http: { status: 400 } }
    })
  }
  return authorization
}
