// ─── Example Test Generators ───────────────────────────────────────────────────
// Factory functions for creating test fixtures using @faker-js/faker.
// TODO: Add fields matching your actual entity shape.

import { faker } from '@faker-js/faker'

/**
 * Generates a random Example document payload for use in tests.
 * Partial overrides are merged with the generated defaults.
 */
export const generateExample = (overrides: Partial<{ name: string; description: string; active: boolean }> = {}) => ({
  name: faker.commerce.productName(),
  description: faker.lorem.sentence(),
  active: true,
  ...overrides
})
