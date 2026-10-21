# Aleph marketing site

Next.js 16 marketing site for [Aleph](https://aleph.zeravest.com). Server-side
rendered (API routes for analytics), deployed to Vercel.

## Develop

```bash
cd web
bun install
bun run dev
```

Opens [http://localhost:3029](http://localhost:3029).

## Build

```bash
bun run build
```

## Deploy

Deployed to Vercel on push to `main`. Set these env vars on the Vercel project:

- `ANALYTICS_DATABASE_URL` — Postgres connection string for the analytics DB
  (Neon works; `sslmode=require` is honored automatically). On first request
  the `analytics_events` table and indexes are created automatically.
- `ADMIN_KEY` — key that unlocks `GET /api/analytics` and the `/admin`
  dashboard page.

## Analytics

Self-contained, backed by **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`, postgres-js driver).

- Schema: `db/schema.ts` (`analytics_events` — event_type, anon_id, platform, unique dedupe_key, created_at)
- Client: `db/index.ts` (lazy, idempotent `ensureSchema()` so a fresh database works with zero migrations)
- Migration files: `drizzle/` — regenerate after schema changes with `npm run db:generate`, apply with `npm run db:migrate` (or `db:push` to sync directly)
- `db:studio` opens Drizzle Studio against `ANALYTICS_DATABASE_URL`

Routes:

- `POST /api/track?event_type=visit|download|game_play&anon_id=&platform=` — visit deduped
  per device per UTC hour, download deduped per device **per platform** (`windows`/`macos`/`linux`)
- `GET /api/analytics?days=N` — visitors, downloads + `by_platform`, game plays, daily series; requires `X-Admin-Key` header
- `GET /admin?key=` (or the in-page key form) — dashboard

The database is Aleph's own (separate from any other app). On first request the
schema is created automatically if missing.

## Notes

- SSR (no `output: "export"`) so the `/api/*` analytics routes can run. Do not
  re-enable static export — it would break them.
- Self-hosted fonts under `public/fonts/`. Referenced from `app/globals.css` via absolute paths — do not introduce a `basePath`, it does not rewrite CSS `url()` values.
- `getGitHubStars()` runs at build time. Authenticated via `GITHUB_TOKEN` in CI to avoid the 60/hr unauthenticated rate limit; falls back to a hardcoded count if the API call fails.
