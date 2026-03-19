// ─── Example Mutation Resolvers ────────────────────────────────────────────────
// TODO: Rename and adapt to your entity's mutation logic.

import { Context } from '@/shared/types'
import { APIError } from '@/shared/errors'

// ─── Resolvers ────────────────────────────────────────────────────────────────

export const createExample = async (
  _parent: unknown,
  { input }: { input: { name: string; description?: string; active?: boolean } },
  { models, user, logger }: Context
) => {
  // TODO: Add authorization checks here if needed
  // if (!context.permissions.canCreateExamples) throw new APIError(...)

  const example = new models.Example({
    name: input.name,
    description: input.description,
    active: input.active ?? true
  })

  await example.save()

  logger.info('Example created', { id: example.id, userId: user?._id?.toString() })

  return example
}

export const updateExample = async (
  _parent: unknown,
  { input }: { input: { id: string; name?: string; description?: string; active?: boolean } },
  { models, logger }: Context
) => {
  const example = await models.Example.findById(input.id)
  if (!example) {
    throw new APIError('Example not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } })
  }

  // TODO: Add authorization check (e.g. only creator or ADMIN can update)

  if (input.name !== undefined) example.name = input.name
  if (input.description !== undefined) example.description = input.description
  if (input.active !== undefined) example.active = input.active

  await example.save()

  logger.info('Example updated', { id: example.id })

  return example
}

export const deleteExample = async (
  _parent: unknown,
  { id }: { id: string },
  { models, logger }: Context
): Promise<boolean> => {
  const example = await models.Example.findById(id)
  if (!example) {
    throw new APIError('Example not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } })
  }

  // TODO: Add authorization check (e.g. only ADMIN can delete)

  await example.deleteOne()

  logger.info('Example deleted', { id })

  return true
}
