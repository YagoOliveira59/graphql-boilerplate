# GraphQL Boilerplate

A production-ready GraphQL API boilerplate built with **Apollo Server 5**, **Express**, **TypeScript**, **MongoDB** and **Firebase Auth**.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Language | TypeScript 5 |
| Transpiler | SWC (fast builds, no `tsc` emit) |
| Package manager | pnpm 9 |
| GraphQL | Apollo Server 5 + `@as-integrations/express4` |
| HTTP framework | Express 4 |
| Database | MongoDB 8 via Mongoose |
| Cache | Redis 7 |
| Authentication | Firebase Admin SDK → internal RS256 JWT |
| Events | Google Cloud Pub/Sub (optional) |
| Logger | Winston (human-readable dev / JSON prod) |
| Tests | AVA + Supertest + Sinon + @faker-js/faker |
| Code quality | ESLint + Prettier + EditorConfig + Knip |
| Migrations | migrate-mongo |
| Codegen | GraphQL Code Generator |
| CI/CD | GitHub Actions |
| Container | Docker (multi-stage) + Docker Compose |

---

## Project Structure

```
src/
├── core/
│   ├── authorization/        # Firebase → JWT auth flow
│   ├── directives/           # Custom GraphQL directives (@role, etc.)
│   ├── entities/
│   │   └── example/          # Template entity — copy to create new ones
│   │       ├── graphql/      # Schema (.graphql), resolvers, queries, mutations
│   │       ├── model/        # Mongoose schema + types
│   │       ├── shared/       # Entity-specific types
│   │       ├── tests/        # Test helpers + integration specs
│   │       └── utils/        # Pure business logic functions
│   ├── shared/
│   │   └── models.ts         # Central Mongoose model registry
│   └── index.ts              # Merges all schemas + resolvers, applies directives
├── lib/
│   ├── apollo/               # Apollo Server setup + context builder
│   ├── firebase.ts           # Firebase Admin SDK helpers
│   ├── mongoose/             # MongoDB connection (side-effect import)
│   ├── pubsub/               # Google Cloud Pub/Sub publishers
│   ├── redis.ts              # Redis client + caching utilities
│   └── winston.ts            # Logger with GCP trace support
├── shared/
│   ├── constants.ts          # App-wide constants
│   ├── enums.ts              # App-wide enums
│   ├── errors/               # APIError class (GraphQLError + HTTP status)
│   └── types.ts              # Central Context type + shared types
├── utils/
│   └── index.ts              # Shared pure utility functions
└── index.ts                  # Entry point
```

---

## Prerequisites

- Node.js 20+ (use `nvm use` if you have nvm)
- pnpm 9+ (`npm install -g corepack && corepack enable`)
- Docker + Docker Compose (for local MongoDB + Redis)
- A Firebase project (see [Firebase setup](#firebase-setup))

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url> my-project
cd my-project
pnpm install
```

### 2. Configure environment

```bash
cp .env.example config/.env
```

Open `config/.env` and fill in the required values (marked with `TODO`).

### 3. Start infrastructure

```bash
# Start MongoDB and Redis only (recommended for dev)
docker compose up mongo redis -d

# OR start everything including the app
docker compose up
```

### 4. Run database migrations

```bash
pnpm migrate:up
```

### 5. Start the dev server

```bash
pnpm dev
```

The server will start at `http://localhost:4000/`.

If `GRAPHQL_PLAYGROUND=true`, the GraphQL sandbox is available at the same URL.

---

## Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start in watch mode with nodemon |
| `pnpm build` | Compile with SWC to `./build/` |
| `pnpm start` | Run the compiled build |
| `pnpm prod` | Run migrations then start (used in production) |
| `pnpm test` | Run all integration tests with c8 coverage |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Check for lint errors |
| `pnpm lint:fix` | Auto-fix lint errors |
| `pnpm ts:check` | Type-check without emitting |
| `pnpm generate` | Run GraphQL Code Generator |
| `pnpm migrate:up` | Apply pending migrations |
| `pnpm migrate:down` | Roll back the last migration |
| `pnpm knip` | Detect unused exports and files |

---

## Authentication Flow

```
Client                   API                      Firebase
  |                       |                           |
  |-- Firebase ID token ->|                           |
  |   (GET /auth)         |-- verifyIdToken --------->|
  |                       |<-- DecodedIdToken ---------|
  |                       |-- load/create user in DB  |
  |                       |-- generateAuthToken()     |
  |<-- Internal JWT ------|   (RS256, embedded tokenFb)|
  |                       |                           |
  |-- Internal JWT ------>|                           |
  |   (GraphQL request)   |-- checkAuthToken()        |
  |                       |-- build context           |
  |<-- GraphQL response --|                           |
```

1. Client authenticates with Firebase and receives a Firebase ID token
2. Client calls `GET /auth` with the Firebase token in `Authorization: Bearer <token>`
3. Server verifies the token with Firebase Admin, loads the user from MongoDB
4. Server returns a signed RS256 JWT as `Authorization: Bearer <token>`
5. Client uses the internal JWT for all GraphQL requests
6. Client calls `GET /refresh` when the token is about to expire

---

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project
2. Enable **Authentication** and add the sign-in methods you need (Email/Password, Google, etc.)
3. Go to **Project Settings → Service accounts** and generate a new private key
4. Fill in the `FIREBASE_*` variables in `config/.env`

For local development, you can use the [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite):

```bash
firebase emulators:start --only auth
```

---

## Adding a New Entity

1. **Copy the example entity:**
   ```bash
   cp -r src/core/entities/example src/core/entities/myEntity
   ```

2. **Rename** all occurrences of `Example` / `example` to your entity name in the copied files

3. **Register the model** in `src/core/shared/models.ts`:
   ```ts
   import MyEntity from '@/core/entities/myEntity/model'
   export const models = { ..., MyEntity }
   ```

4. **Add the codegen mapper** in `codegen.yml`:
   ```yaml
   config:
     mappers:
       MyEntity: '@/core/entities/myEntity/model/types#MyEntityDocument'
   ```

5. **Regenerate types:**
   ```bash
   pnpm generate
   ```

6. **Write tests** in `src/core/entities/myEntity/tests/specs/`

---

## Creating a Database Migration

```bash
# Create a new migration file
pnpm migrate-mongo create my-migration-name

# Apply all pending migrations
pnpm migrate:up

# Roll back the last migration
pnpm migrate:down
```

Migrations live in `./migrations/` and run automatically on `pnpm prod`.

---

## Docker

### Development

```bash
docker compose up
```

### Production build

```bash
docker build --target production -t graphql-boilerplate:latest .
docker run -p 4000:4000 --env-file config/.env graphql-boilerplate:latest
```

---

## Code Style

- No semicolons
- Single quotes
- 2-space indentation
- Max 120 characters per line
- Import order enforced: `modules` → `@/lib` → `@/core` → `@/services` → `@/shared` → `@/utils` → relative

Run `pnpm lint:fix` before committing to auto-fix style issues.

---

## Environment Variables Reference

See [`.env.example`](.env.example) for the full list with descriptions.

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | HTTP port (default: 4000) |
| `NODE_ENV` | Yes | `development` / `production` / `test` |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `REDIS_URL` | Yes | Redis connection URL |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_DATABASE_URL` | Yes | Firebase Realtime Database URL |
| `FIREBASE_USE_DEFAULT_SERVICE_ACCOUNT` | Yes | `true` when running in GCP |
| `FIREBASE_CLIENT_EMAIL` | If not using default SA | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | If not using default SA | Firebase service account private key |
| `APP_TOKEN_SECRET` | Yes | RS256 private key for internal JWTs |
| `JWT_SECRET` | Yes | Secret for worker/service tokens |
| `GRAPHQL_PLAYGROUND` | No | `true` to enable the GraphQL sandbox |
| `LOG_HUMAN` | No | `true` for colored logs, `false` for JSON |
| `EVENTS_TOPIC` | No | Pub/Sub topic name for events |
| `EVENTS_PROJECT` | No | GCP project ID for Pub/Sub |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT
