// ─── Example Query Resolvers ───────────────────────────────────────────────────
// TODO: Rename and adapt to your entity's query logic.

import { Context } from '@/shared/types'
import { APIError } from '@/shared/errors'

// ─── Pagination helper ────────────────────────────────────────────────────────
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20

const parsePagination = (pagination?: { page?: number | null; limit?: number | null }) => {
  const page = Math.max(pagination?.page ?? DEFAULT_PAGE, 1)
  const limit = Math.min(pagination?.limit ?? DEFAULT_LIMIT, 100) // cap at 100
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

// ─── Resolvers ────────────────────────────────────────────────────────────────

export const examples = async (
  _parent: unknown,
  args: { input?: { pagination?: { page?: number | null; limit?: number | null } | null } | null },
  { models }: Context
) => {
  const { page, limit, skip } = parsePagination(args.input?.pagination ?? undefined)

  // TODO: Add filtering, sorting, and search as needed
  const [items, total] = await Promise.all([
    models.Example.find({ active: true }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    models.Example.countDocuments({ active: true })
  ])

  const pages = Math.ceil(total / limit)

  return {
    items,
    total,
    page: pages === 0 ? 0 : page,
    pages
  }
}

export const example = async (_parent: unknown, { id }: { id: string }, { models }: Context) => {
  const found = await models.Example.findById(id)
  if (!found) {
    throw new APIError('Example not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } })
  }
  return found
}
