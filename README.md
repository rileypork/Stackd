# Stackd

Stackd is a personal software operating system for discovering, organizing, and tracking every tool you use. It combines a private app library, subscription and trial tracking, project mapping, imports, and evidence-backed discovery.

## Features

- Private, user-specific software library
- App, project, trial, subscription, and inactive-history views
- Gmail-first evidence model for discovery and billing signals
- CSV and JSON imports and exports
- Persistent storage with Cloudflare D1 and Drizzle
- Sign in with ChatGPT identity support
- Responsive light and dark themes

## Local development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

The first time you run the dev server, open http://localhost:3000 once so Miniflare creates the local D1 database, then apply the schema:

```bash
npm run db:migrate:local
```

On localhost the API uses `local@stackd.dev` as the signed-in user; in production identity comes from the ChatGPT `oai-authenticated-user-*` headers.

Other commands:

```bash
npm run build      # production bundle
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # node:test unit tests in tests/
npm run db:generate  # regenerate drizzle migrations from db/schema.ts
```

## Project structure

- `app/` — UI and API routes
- `db/` — database access and schema
- `drizzle/` — D1 migrations
- `public/` — logos and social assets
- `worker/` — Cloudflare Worker entrypoint
- `.openai/hosting.json` — OpenAI Sites hosting configuration

## Data principles

Stackd is designed around explicit consent and minimal evidence retention. Gmail-derived records should keep only the metadata needed to support conclusions such as price, renewal, cancellation, and activity—not complete message bodies.
