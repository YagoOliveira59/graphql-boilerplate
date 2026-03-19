// ─── Apollo + Express Server ───────────────────────────────────────────────────
// Sets up Express with Apollo Server as GraphQL middleware.
// Also registers REST endpoints for authentication and health checks.
//
// Endpoints:
//   GET  /health  — Health check (used by load balancers and Docker)
//   GET  /auth    — Exchange a Firebase ID token for an internal JWT
//   GET  /refresh — Refresh an existing internal JWT
//   POST /        — Main GraphQL endpoint

import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { expressMiddleware } from '@as-integrations/express4'
import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import { createServer } from 'http'
import mongoose from 'mongoose'
import { AddressInfo } from 'net'

import { getTestRedisDeps, setTestRedisDeps } from '@/lib/apollo/testRedisDeps'
import { getAuthorizationHeader, plugins, setContext } from '@/lib/apollo/utils'
import logger from '@/lib/winston'

import schema from '@/core'
import { extractBearerToken, getAuthToken, refreshAuthToken } from '@/core/authorization'
import { models } from '@/core/shared/models'

import { APIError } from '@/shared/errors'
import { Context } from '@/shared/types'

export { getTestRedisDeps, setTestRedisDeps }

// ─── Required environment variables ──────────────────────────────────────────
// Fail fast at startup if critical variables are missing.
// TODO: Add your own required environment variables here.
const requiredEnvVars = ['NODE_ENV', 'FIREBASE_PROJECT_ID'] as const

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new APIError(`Environment variable ${envVar} not set`, {
      extensions: { code: 'INTERNAL_ENV_NOT_SET', http: { status: 500 } }
    })
  }
}

export const startApolloServer = async ({ port }: { port: number }) => {
  const app = express()
  const httpServer = createServer(app)

  plugins.push(ApolloServerPluginDrainHttpServer({ httpServer }))
  const server = new ApolloServer<Context>({ schema, plugins, logger })

  await server.start()

  app.use(cors<cors.CorsRequest>())

  // ─── Health check ────────────────────────────────────────────────────────
  app.get('/health', async (_req, res) => {
    const isMongooseConnected = mongoose.connection.readyState === 1
    if (isMongooseConnected) {
      return res.status(200).send('Health check OK')
    }
    return res.status(503).send('Health check failed')
  })

  // ─── Auth: Firebase ID token → internal JWT ───────────────────────────────
  app.get('/auth', async (req, res) => {
    try {
      const authorization = getAuthorizationHeader(req)
      const authToken = await getAuthToken({
        authorization,
        models,
        logger,
        request: req,
        redisDeps: getTestRedisDeps()
      })
      return res
        .header('Access-Control-Expose-Headers', 'Authorization')
        .header('Authorization', authToken)
        .status(200)
        .json({ message: 'Authentication success' })
    } catch (error) {
      const apiError = error as APIError
      return res
        .status(apiError.options?.extensions?.http.status ?? 500)
        .json({ message: apiError.message, code: apiError.options?.extensions?.code })
    }
  })

  // ─── Auth: Refresh internal JWT ───────────────────────────────────────────
  app.get('/refresh', async (req, res) => {
    try {
      const authorization = getAuthorizationHeader(req)
      const refreshedAuthToken = await refreshAuthToken({
        authorization,
        models,
        request: req,
        logger,
        redisDeps: getTestRedisDeps()
      })
      return res
        .header('Access-Control-Expose-Headers', 'Authorization')
        .header('Authorization', refreshedAuthToken)
        .status(200)
        .json({ message: 'Authentication refresh success' })
    } catch (error) {
      const apiError = error as APIError
      return res
        .status(apiError.options?.extensions?.http.status ?? 500)
        .json({ message: apiError.message, code: apiError.options?.extensions?.code })
    }
  })

  // TODO: Add more REST endpoints here as needed (e.g. webhooks, file uploads)

  // ─── GraphQL endpoint ─────────────────────────────────────────────────────
  app.use('/', bodyParser.json({ limit: '50mb' }), expressMiddleware(server, { context: setContext }))

  httpServer.listen(port, () => {
    logger.info(`🚀 Server ready at http://localhost:${port}/`)
    logger.info('🌎 NODE_ENV', { NODE_ENV: process.env.NODE_ENV })
  })

  const address = Object.prototype.hasOwnProperty.call(httpServer.address()?.valueOf(), 'port')
    ? (httpServer.address() as AddressInfo)
    : undefined
  const portUp = address?.port ?? port

  return { server, url: `http://localhost:${portUp}/` }
}
