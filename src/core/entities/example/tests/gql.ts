// ─── Example GraphQL Test Operations ──────────────────────────────────────────
// GraphQL query/mutation strings used in integration tests.

export const GET_EXAMPLES = /* GraphQL */ `
  query GetExamples($input: ExamplesInput) {
    examples(input: $input) {
      items {
        id
        name
        description
        active
        createdAt
        updatedAt
      }
      total
      page
      pages
    }
  }
`

export const GET_EXAMPLE = /* GraphQL */ `
  query GetExample($id: ID!) {
    example(id: $id) {
      id
      name
      description
      active
    }
  }
`

export const CREATE_EXAMPLE = /* GraphQL */ `
  mutation CreateExample($input: CreateExampleInput!) {
    createExample(input: $input) {
      id
      name
      description
      active
    }
  }
`

export const UPDATE_EXAMPLE = /* GraphQL */ `
  mutation UpdateExample($input: UpdateExampleInput!) {
    updateExample(input: $input) {
      id
      name
      description
      active
    }
  }
`

export const DELETE_EXAMPLE = /* GraphQL */ `
  mutation DeleteExample($id: ID!) {
    deleteExample(id: $id)
  }
`
