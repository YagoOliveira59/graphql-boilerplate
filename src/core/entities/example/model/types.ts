// ─── Example Document & Model Types ───────────────────────────────────────────
// TODO: Rename this file and update types to match your entity.

import { HydratedDocument, Model } from 'mongoose'

export type ExampleShape = {
  // TODO: Replace with your entity's fields
  name: string
  description?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export type ExampleDocument = HydratedDocument<ExampleShape> & {
  wasNew: boolean
  modPaths: string[]
}

export type ExampleModel = Model<ExampleDocument> & {
  // TODO: Add custom statics as needed
}
