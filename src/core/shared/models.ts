// ─── Models Registry ───────────────────────────────────────────────────────────
// Central registry of all Mongoose models. Passed through the GraphQL context
// so resolvers never import models directly — they always use context.models.
//
// TODO: Import and register your entity models here as you add them.

import Example from '@/core/entities/example/model'
import User from '@/core/entities/user/model'

export const models = {
  Example,
  User
  // TODO: Add more models here as you create new entities:
  // MyEntity,
}

export type Models = typeof models
