// ─── MongoDB Connection ────────────────────────────────────────────────────────
// Connects Mongoose to MongoDB on import (side-effect module).
// Import this once in src/index.ts before starting the server.

import mongoose from 'mongoose'

import logger from '@/lib/winston'

if (!process.env.MONGODB_URI) throw new Error('Environment variable MONGODB_URI not set')
const mongoDbUri = process.env.MONGODB_URI

mongoose.connect(mongoDbUri)

mongoose.set('strictQuery', false)
mongoose.set('debug', process.env.NODE_ENV === 'development')

mongoose.connection.on('connecting', () => {
  logger.debug('💾 Connecting to MongoDB')
})

mongoose.connection.on('connected', () => {
  logger.debug('💾 Connected to MongoDB successfully')
})

mongoose.connection.on('disconnecting', () => {
  logger.debug('💾 Disconnecting from MongoDB')
})

mongoose.connection.on('disconnected', () => {
  logger.debug('💾 Disconnected from MongoDB successfully')
})
