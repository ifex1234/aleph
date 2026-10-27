# Aleph marketing site

Next.js 16 marketing site for [Aleph](https://aleph.zeravest.com). Server-side
rendered; analytics requests are rewritten to `server-aleph`. Deployed to Vercel.

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

Deployed to Vercel on push to the production branch (`master`). Set this env
var on the Vercel project:

- `ANALYTICS_API_URL` - base URL of the `server-aleph` deployment (for example
  `https://api.example.com`). Same-origin `/api/track` and `/api/analytics`
  requests are rewritten to this server.

The admin key is entered in the `/admin` page and forwarded through the rewrite;
it does not need to be set on Vercel.

## Analytics

The analytics implementation lives in `server-aleph`: Drizzle schema/bootstrap
and the `POST /api/track` / `GET /api/analytics` endpoints. This site keeps the
same-origin URLs as Next.js rewrites to `ANALYTICS_API_URL`.

- `POST /api/track?event_type=visit|download|game_play&anon_id=&platform=` -
  visits are deduped per device per UTC hour; downloads are deduped per device
  per platform (`windows` / `macos` / `linux`).
- `GET /api/analytics?days=N` - visitors, downloads + `by_platform`, game plays,
  and a daily series; requires `X-Admin-Key`.
- `/admin` - dashboard; enter the admin key in the page.

Analytics tables are created automatically by `server-aleph` on first request.

## Notes

- SSR (no `output: "export"`) so the analytics rewrites can run. Do not
  re-enable static export - it would break them.
- Self-hosted fonts under `public/fonts/`. Referenced from `app/globals.css` via absolute paths - do not introduce a `basePath`, it does not rewrite CSS `url()` values.
- `getGitHubStars()` runs at build time. Authenticated via `GITHUB_TOKEN` in CI to avoid the 60/hr unauthenticated rate limit; falls back to a hardcoded count if the API call fails.
