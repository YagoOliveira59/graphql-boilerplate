# Contributing

Thank you for considering contributing to this boilerplate!

## Development workflow

1. Fork the repository and clone your fork
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Copy the environment file: `cp .env.example config/.env` and fill in the values
4. Install dependencies: `pnpm install`
5. Start the dev stack: `docker compose up mongo redis -d`
6. Start the dev server: `pnpm dev`
7. Make your changes, add tests, and verify everything passes
8. Push to your branch and open a pull request

## Code standards

- No semicolons, single quotes, 2-space indent (enforced by ESLint + Prettier)
- Max 120 characters per line
- All public functions should have a JSDoc comment
- Tests are required for new features — use `pnpm test` to run the full suite
- Use `pnpm lint:fix` to auto-fix style issues before committing

## Commit convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for X
fix: correct Y behavior
docs: update README
chore: upgrade dependencies
refactor: simplify Z
test: add tests for W
```

## Adding a new entity

1. Copy `src/core/entities/example/` to `src/core/entities/yourEntity/`
2. Rename all files and identifiers from `Example` / `example` to your entity name
3. Register your Mongoose model in `src/core/shared/models.ts`
4. Add codegen mapper in `codegen.yml`
5. Run `pnpm generate` to regenerate TypeScript types
6. Write integration tests in `tests/specs/`

## Running tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Single file
pnpm with-env ava src/core/entities/example/tests/specs/example.spec.ts
```
