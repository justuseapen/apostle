# Coolify / Docker self-host

Apostle’s default `npm run build` targets the **Vercel** Nitro preset. For a
long-running container (Coolify, Docker Compose, a VPS), use the **node-server**
path instead.

## What this ships

| Piece | Role |
| --- | --- |
| `npm run build:selfhost` | `NITRO_PRESET=node-server` Vite/Nitro build → `.output/server/index.mjs` |
| `npm start` | Apply `migrations/*.sql`, then serve on `NITRO_HOST`/`NITRO_PORT` (default `0.0.0.0:8080`) |
| `Dockerfile` | Multi-stage image used by Coolify (`build_pack=dockerfile`) |

Do **not** commit secrets. Set them in the host/Coolify environment.

## Required environment

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Neon, Coolify Postgres, etc.) |
| `BETTER_AUTH_SECRET` | Stable ≥32-char session secret |
| `BETTER_AUTH_URL` | Public HTTPS origin visitors use (e.g. `https://apostle.example.com`) |

Optional: `GROK_AUTH_ISSUER` + `GROK_AUTH_CLIENT_ID` + `GROK_AUTH_CLIENT_SECRET` for broker OAuth (Google/X). Incomplete broker config leaves **email/password** as the working sign-in path (`emailAndPasswordEnabled` is on).

Gateway API keys belong in **Desk**, not in git or `VITE_` vars.

Theme: leave the public default as Phosphor. Do not set `VITE_APOSTLE_THEME=si` on a public dogfood host — SI stays private.

## Coolify sketch

1. Create a Postgres database in the same Coolify project/network.
2. Create a **public GitHub** application, `build_pack=dockerfile`, branch with this Dockerfile, port `8080`.
3. Set the three required env vars; point `BETTER_AUTH_URL` at the HTTPS hostname Coolify assigns (or your custom domain).
4. Deploy; open `/`, sign up with email/password, open `/admin` (Desk), paste an OpenAI-compatible base URL + key, enable plugins.

Custom domain: add a DNS **A** (or CNAME) record to the Coolify host, then attach the FQDN in Coolify so Traefik can issue Let’s Encrypt.

## Local image smoke

```bash
npm ci
npm run build:selfhost
DATABASE_URL=postgresql://… BETTER_AUTH_SECRET=… BETTER_AUTH_URL=http://127.0.0.1:8080 npm start
# or
docker build -t apostle:local .
```

## Browser plugin on this image

The Docker image does **not** install Playwright browsers. Chat, Desk, and the
non-browser plugins are the dogfood path. Enabling Browser in Desk without a
host that has Playwright browsers installed will fail at tool runtime.
