// ─── Example Model ─────────────────────────────────────────────────────────────
// Mongoose schema for the Example entity.
// TODO: Rename to match your entity. Update schema fields, indexes, hooks, etc.

import { GraphQLError } from 'graphql'
import { CallbackWithoutResultAndOptionalError, model, MongooseError, Schema } from 'mongoose'

import logger from '@/lib/winston'

import { ExampleDocument, ExampleModel } from '@/core/entities/example/model/types'

const ExampleSchema = new Schema<ExampleDocument, ExampleModel>(
  {
    // TODO: Replace with your entity's fields
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    active: {
      type: Boolean,
      default: true,
      required: true
    }
  },
  { timestamps: true }
)

// TODO: Add indexes relevant to your query patterns
ExampleSchema.index({ name: 'text' })
ExampleSchema.index({ active: 1 })

// ─── Pre-save: track wasNew and modified paths ────────────────────────────────
ExampleSchema.pre('save', function (next) {
  this.wasNew = this.isNew
  this.modPaths = this.modifiedPaths().filter((p: string) => p !== 'updatedAt')
  next()
})

// ─── Post-save: logging ───────────────────────────────────────────────────────
ExampleSchema.post('save', function (document, next) {
  if (document.wasNew) {
    logger.info(`Created new example ${document.id}`)
  } else if (document.modPaths.length) {
    logger.info(`Example ${document.id} updated: ${document.modPaths.join(', ')}`)
  }
  next()
})

// ─── Post-save: conflict error handling ──────────────────────────────────────
ExampleSchema.post(
  'save',
  function (error: MongooseError, _document: ExampleDocument, next: CallbackWithoutResultAndOptionalError) {
    // @ts-ignore
    if (error.name === 'MongoServerError' && error.code === 11000) {
      next(new GraphQLError('Example already exists', { extensions: { code: 'CONFLICT', http: { status: 409 } } }))
    } else {
      next(error)
    }
  }
)

export default model<ExampleDocument, ExampleModel>('Example', ExampleSchema)
