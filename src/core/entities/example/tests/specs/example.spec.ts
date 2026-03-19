// ─── Example Integration Tests ─────────────────────────────────────────────────
// End-to-end tests using Supertest + AVA.
// These tests run against a real MongoDB and Redis instance (configured via .env).
//
// To run:
//   pnpm test
//
// TODO: Replace with tests relevant to your entity.

import test from 'ava'
import supertest from 'supertest'

import { startApolloServer } from '@/lib/apollo'

import { generateExample } from '@/core/entities/example/tests/generators'
import { CREATE_EXAMPLE, DELETE_EXAMPLE, GET_EXAMPLES, UPDATE_EXAMPLE } from '@/core/entities/example/tests/gql'

// ─── Test setup ───────────────────────────────────────────────────────────────
let request: ReturnType<typeof supertest>

test.before(async () => {
  const { url } = await startApolloServer({ port: 0 })
  request = supertest(url)
})

// ─── Tests ────────────────────────────────────────────────────────────────────
// TODO: Add a helper to obtain an auth token for the test user
// const authHeaders = { Authorization: 'Bearer <token>' }

test('creates an example', async (t) => {
  const payload = generateExample()

  const res = await request
    .post('/')
    // .set(authHeaders)
    .send({
      query: CREATE_EXAMPLE,
      variables: { input: payload }
    })

  t.is(res.status, 200)
  t.is(res.body.errors, undefined)
  t.is(res.body.data.createExample.name, payload.name)
  t.true(res.body.data.createExample.active)
})

test('lists examples', async (t) => {
  const res = await request
    .post('/')
    // .set(authHeaders)
    .send({
      query: GET_EXAMPLES,
      variables: {}
    })

  t.is(res.status, 200)
  t.is(res.body.errors, undefined)
  t.true(Array.isArray(res.body.data.examples.items))
})

test('updates an example', async (t) => {
  // First create one
  const payload = generateExample()
  const createRes = await request
    .post('/')
    .send({ query: CREATE_EXAMPLE, variables: { input: payload } })

  const id = createRes.body.data.createExample.id

  const res = await request
    .post('/')
    .send({
      query: UPDATE_EXAMPLE,
      variables: { input: { id, name: 'Updated Name' } }
    })

  t.is(res.status, 200)
  t.is(res.body.errors, undefined)
  t.is(res.body.data.updateExample.name, 'Updated Name')
})

test('deletes an example', async (t) => {
  const payload = generateExample()
  const createRes = await request
    .post('/')
    .send({ query: CREATE_EXAMPLE, variables: { input: payload } })

  const id = createRes.body.data.createExample.id

  const res = await request
    .post('/')
    .send({ query: DELETE_EXAMPLE, variables: { id } })

  t.is(res.status, 200)
  t.is(res.body.errors, undefined)
  t.true(res.body.data.deleteExample)
})
