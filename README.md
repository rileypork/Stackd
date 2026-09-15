# Stackd

Stackd is a personal software operating system for discovering, organizing, and tracking every tool you use. It combines a private app library, subscription and trial tracking, project mapping, imports, and evidence-backed discovery.

**Production host is Cloudflare Workers** (`https://stackd.rileyporcarello.workers.dev`). ChatGPT Sites config remains in the repo but is not the live deployment.

## Features

- Private, user-specific software library
- App, project, trial, subscription, and inactive-history views
- Gmail-first evidence model for discovery and billing signals
- CSV and JSON imports and exports
- Persistent storage with Cloudflare D1 and Drizzle
- ChatGPT Sites identity when `oai-authenticated-user-*` headers are present; Workers fallback identity otherwise
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

On localhost the API uses `local@stackd.dev` as the signed-in user. ChatGPT `oai-authenticated-user-*` headers still win when present. On Cloudflare Workers, identity falls back to `STACKD_DEV_USER_EMAIL` (default `rileyporcarello@gmail.com`). See [DEPLOY.md](DEPLOY.md).

Other commands:

```bash
npm run build      # production bundle
npm run deploy     # wrangler deploy (run build first)
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # node:test unit tests in tests/
npm run db:generate  # regenerate drizzle migrations from db/schema.ts
```

## Production deploy

```bash
export CLOUDFLARE_API_TOKEN="..."
npm ci
npm run build
npx wrangler deploy
```

D1 database `stackd` (`a4d78b4f-b5e9-4126-9a84-48b284825ace`) is already migrated through `0002_organic_caretaker`. Do not re-apply those migrations. Full steps, secrets, and identity notes are in [DEPLOY.md](DEPLOY.md).

## Project structure

- `app/` — UI and API routes
- `db/` — database access and schema (`user_apps`, `user_projects`)
- `drizzle/` — D1 migrations (do not point Wrangler `migrations_dir` at this folder; remote is already applied)
- `public/` — logos and social assets
- `worker/` — Cloudflare Worker entrypoint
- `wrangler.jsonc` — Cloudflare Workers config (account, D1 `DB`, assets)
- `.openai/hosting.json` — leftover OpenAI Sites hosting configuration
