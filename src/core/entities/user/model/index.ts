// ─── User Model ────────────────────────────────────────────────────────────────
// Mongoose schema for the User entity.
// TODO: Remove fields that are not relevant to your domain.
// TODO: Add fields specific to your application.

import { GraphQLError } from 'graphql'
import { CallbackWithoutResultAndOptionalError, model, MongooseError, Schema } from 'mongoose'

import logger from '@/lib/winston'

import { UserDocument, UserModel } from '@/core/entities/user/model/types'

const UserSchema = new Schema<UserDocument, UserModel>(
  {
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      trim: true,
      default: ''
    },
    picture: String,
    role: {
      type: String,
      enum: ['ADMIN', 'USER'],
      default: 'USER'
    },
    active: {
      type: Boolean,
      required: true,
      default: true
    }
  },
  {
    timestamps: true,
    // TODO: Add custom statics here
    statics: {
      async getOne(filter: Record<string, unknown>) {
        const user = await this.findOne(filter)
        if (!user) {
          throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } })
        }
        return user
      }
    }
  }
)

// ─── Text index for search ────────────────────────────────────────────────────
UserSchema.index({ firstName: 'text', lastName: 'text' })

// ─── Virtual: full name ───────────────────────────────────────────────────────
UserSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`.trim()
})

// ─── Pre-save: track wasNew and modified paths (used in post-save) ────────────
UserSchema.pre('save', function (next) {
  this.wasNew = this.isNew
  this.modPaths = this.modifiedPaths().filter((path: string) => path !== 'updatedAt')
  next()
})

// ─── Post-save: logging ───────────────────────────────────────────────────────
UserSchema.post('save', function (document, next) {
  if (document.wasNew) {
    logger.info(`Created new user ${document.id} successfully`)
  } else if (document.modPaths.length) {
    logger.info(`User ${document.id} updated: ${document.modPaths.join(', ')}`)
  }
  next()
})

// ─── Post-save: duplicate key error handling ──────────────────────────────────
UserSchema.post(
  'save',
  function (error: MongooseError, _document: UserDocument, next: CallbackWithoutResultAndOptionalError) {
    // @ts-ignore — MongoServerError has a `code` property
    if (error.name === 'MongoServerError' && error.code === 11000) {
      next(new GraphQLError('User already exists', { extensions: { code: 'CONFLICT', http: { status: 409 } } }))
    } else {
      next(error)
    }
  }
)

export default model<UserDocument, UserModel>('User', UserSchema)
