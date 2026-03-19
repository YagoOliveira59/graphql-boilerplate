// ─── User Document & Model Types ───────────────────────────────────────────────

import { HydratedDocument, Model, QueryWithHelpers } from 'mongoose'

export type UserRole = 'ADMIN' | 'USER'

export type UserShape = {
  email: string
  firstName: string
  lastName: string
  picture?: string
  role: UserRole
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export type UserDocument = HydratedDocument<UserShape> & {
  wasNew: boolean
  modPaths: string[]
  // Virtuals
  name: string
}

// TODO: Add custom query helpers and statics as needed
type UserQueryHelpers = Record<string, QueryWithHelpers<unknown, UserDocument>>

export type UserModel = Model<UserDocument, UserQueryHelpers> & {
  getOne(filter: Record<string, unknown>): Promise<UserDocument>
}
