# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-03-19

### Added
- Initial boilerplate release
- Apollo Server 5 + Express 4 integration
- Firebase Admin SDK authentication with internal RS256 JWT
- MongoDB connection via Mongoose with migration support (migrate-mongo)
- Redis client with caching utilities
- Google Cloud Pub/Sub publisher setup
- Generic `Example` entity as a template for new domain entities
- GraphQL schema auto-discovery and merging
- `@role` directive for role-based access control
- Winston structured logger with Google Cloud Trace support
- Multi-stage Dockerfile (development / builder / production)
- Docker Compose for local development (app + MongoDB + Redis)
- GitHub Actions CI workflow (lint, type check, test, docker build)
- ESLint + Prettier + EditorConfig code quality setup
- AVA + Supertest integration test setup
- GraphQL Code Generator configuration
- Knip unused code detection
