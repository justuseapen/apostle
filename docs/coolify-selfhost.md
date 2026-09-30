# Coolify / Docker self-host

Apostle’s default `npm run build` targets the **Vercel** Nitro preset. For a
long-running container (Coolify, Docker Compose, a VPS), use the **node-server**
path instead.

## Create an instance (checklist)

1. Provision Postgres (Coolify database in the same project/network, Neon, etc.).
2. Create a Coolify app with `build_pack=dockerfile`, port **`8080`**, this repo’s
   `Dockerfile`.
3. Set env (runtime, not committed):

   | Variable | Meaning |
   | --- | --- |
   | `DATABASE_URL` | Postgres URL on the Coolify/Docker network |
   | `BETTER_AUTH_SECRET` | Stable ≥32-char session secret |
   | `BETTER_AUTH_URL` | Public HTTPS origin visitors actually open |

4. Attach a domain (`domains` in the Coolify API; DNS **A**/CNAME to the host).
5. Deploy. Open `/login` → email/password sign-up → `/admin` (Desk) → paste an
   OpenAI-compatible base URL + API key → Save → enable plugins → chat at `/`.

Do **not** commit secrets. Gateway keys belong in Desk, never in `VITE_` vars.
Leave the public theme as Phosphor — do not set `VITE_APOSTLE_THEME=si` on a
public host (SI stays private).

Optional broker OAuth: set all three of `GROK_AUTH_ISSUER`,
`GROK_AUTH_CLIENT_ID`, `GROK_AUTH_CLIENT_SECRET`, and register this origin’s
callback URLs. Incomplete broker config leaves **email/password** as the working
path (`emailAndPasswordEnabled` is on).

## What this ships

| Piece | Role |
| --- | --- |
| `npm run build:selfhost` | `NITRO_PRESET=node-server` Vite/Nitro build → `.output/server/index.mjs` |
| `npm start` | Apply `migrations/*.sql`, then serve on `NITRO_HOST`/`NITRO_PORT` (default `0.0.0.0:8080`) |
| `Dockerfile` | Multi-stage image for Coolify (`build_pack=dockerfile`) |

## Coolify gotchas (from dogfood)

These burned a real install — the repo and Dockerfile already defend against the
code ones; the API/UI ones still need human attention.

| Gotcha | Do this instead |
| --- | --- |
| Git repo as `https://github.com/owner/repo` | Use **`owner/repo`** only. Coolify prepends `https://github.com/` for public apps; a full URL becomes `https://github.com/https://github.com/...` and the deploy fails. |
| Setting `fqdn` via API | Use the **`domains`** field (comma-separated `https://…` URLs). `fqdn` is rejected on create/update. |
| `NODE_ENV=production` at build | Coolify may inject it as a build ARG and `npm ci` then skips `devDependencies` (vite/nitro). The Dockerfile runs `npm ci --include=dev`. Prefer marking `NODE_ENV` **runtime-only** in Coolify env settings. |
| Playwright in the client bundle | Production builds used to fail resolving `chromium-bidi`. Vite stubs Playwright on the **client** build; the Browser plugin still needs browsers on the host (not in this image). |
| `BETTER_AUTH_URL` ≠ browser origin | Cookies and redirects break. After DNS, set `BETTER_AUTH_URL` to the final HTTPS hostname and restart. |

## Local smoke

```bash
npm ci
npm run build:selfhost
DATABASE_URL=postgresql://… BETTER_AUTH_SECRET=… BETTER_AUTH_URL=http://127.0.0.1:8080 npm start
# or
docker build -t apostle:local .
```

## Browser plugin on this image

The Docker image does **not** install Playwright browsers. Chat, Desk, and the
non-browser plugins are the supported path here. Enabling Browser in Desk without
browsers on the host fails at tool runtime.
