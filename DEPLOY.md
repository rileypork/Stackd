# Deploy Stackd to Cloudflare Workers

Cloudflare Workers is the primary host. ChatGPT Sites files (`.openai/hosting.json` and the `sites()` Vite plugin) are kept so the old Sites pipeline still builds, but that URL is stale and should not be treated as production.

## Prerequisites

- Node.js `>=22.13.0`
- A Cloudflare API token with Workers + D1 edit permission (the **Edit Cloudflare Workers** template, plus **D1: Edit** if that template does not include it)
- Account ID `a92148bfe63559febe0950140ce8487e` (already in `wrangler.jsonc`)

Set the token in the environment (do not commit it):

```bash
export CLOUDFLARE_API_TOKEN="..."
```

## Bindings already configured

`wrangler.jsonc` deploys Worker `stackd` and binds:

- D1 `DB` → database name `stackd`, id `a4d78b4f-b5e9-4126-9a84-48b284825ace`
- Assets `ASSETS` (vinext client build)
- Images `IMAGES` (vinext `next/image` optimizer)
- Var `STACKD_DEV_USER_EMAIL=rileyporcarello@gmail.com`

Local `npm run dev` uses Miniflare SQLite for the same `DB` binding. It does **not** talk to the remote `stackd` database.

## D1 migrations

Remote D1 already has drizzle migrations `0000_eminent_viper`, `0001_flippant_hardball`, and `0002_organic_caretaker`. **Do not re-apply them** and **do not wipe data**.

`wrangler.jsonc` does not set `migrations_dir` on purpose. Wrangler tracks `__d1_migrations`; this repo’s SQL lives in `drizzle/` and is tracked by drizzle. Pointing Wrangler at `drizzle/` would treat 0000–0002 as new and try to run them again.

For a *new* drizzle migration later:

1. Generate it with `npm run db:generate`
2. Apply only the new file to the remote DB (for example with `wrangler d1 execute stackd --remote --file=drizzle/<new>.sql`, or a one-off process that records drizzle’s journal)
3. Confirm the change against a copy first if the SQL is destructive

Local schema:

```bash
npm run dev            # hit the app once so Miniflare creates the local DB
npm run db:migrate:local
```

## Identity on Workers

ChatGPT Sites injects `oai-authenticated-user-*` headers. Those headers are **not** present on `*.workers.dev`.

Resolution order:

1. `oai-authenticated-user-email` if it is a non-empty header (Sites)
2. `local@stackd.dev` on `localhost` / `127.0.0.1` / `::1`
3. `STACKD_DEV_USER_EMAIL` from the Worker env (wrangler `vars` or a secret of the same name)
4. If that var is unset, `rileyporcarello@gmail.com`
5. If that var is set to an empty string, no fallback — API routes return 401

To override the committed var without editing the repo:

```bash
printf '%s' 'someone@example.com' | npx wrangler secret put STACKD_DEV_USER_EMAIL
```

Secrets override `vars` of the same name. ChatGPT sign-in/out paths are only advertised when Sites headers are present.

## Build and deploy

From the repo root, with `CLOUDFLARE_API_TOKEN` set:

```bash
npm ci
npm run build
npx wrangler deploy
```

Equivalent: `npm run deploy` after a successful `npm run build`.

This replaces the existing dashboard Worker named `stackd` (empty template) with the vinext app. Expected workers.dev URL:

`https://stackd.rileyporcarello.workers.dev`

`--dry-run` checks the built Worker without publishing:

```bash
npm run build
npx wrangler deploy --dry-run
```

`npx vinext deploy` also works (it builds, then runs `wrangler deploy`). Prefer the explicit `npm run build && npx wrangler deploy` split so you can inspect the build before publishing.

## GitHub main

After this config is on `main`, deploy from a checkout of `main` with Riley’s token as above. Optional: store `CLOUDFLARE_API_TOKEN` as a GitHub Actions secret and add a `push` to `main` workflow that runs the same three commands.

## OpenAI Sites

`.openai/hosting.json` still declares D1 binding name `DB` for the Sites control plane. Cloudflare Workers is the source of truth for production routing, D1, and identity.
