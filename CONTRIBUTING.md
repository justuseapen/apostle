# Contributing

Apostle is WordPress for a chat assistant: **themes** change the look; **plugins** change what it can do. Core stays small.

## How to help

1. **File a Missing ask** from chat (`create_missing` / Desk → Missing) when something ChatGPT-shaped is absent. Prefer real product gaps over meta checklist items.
2. **Open a PR** against `main` for plugins, docs, or harness fixes. Keep plugins in `src/lib/apostle/plugins/` — do not edit the chat harness to hard-code tools.
3. Match the frozen plugin contract: declare `needs.network`, secrets, and approvals. Default is deny.
4. Stay honest in copy: Computer and Browser are **partial / spike**, not “done.” Super Intelligence (`si`) is a **private** skin — not a public catalog theme. Billing / Stripe stays **out for OSS**.

## Add a plugin (afternoon ritual)

Follow [`docs/plugins.md`](./docs/plugins.md). Short checklist:

1. Copy `src/lib/apostle/plugins/hash.ts` (Hash is the third-party-style example).
2. Implement `ApostlePlugin` + register in `plugins/index.ts`.
3. Add slash prompt in `slash-skills.ts` (keep lists aligned).
4. Desk → Plugins → enable → Save.
5. Add a unit test; run `npm test` / `npm run test:ci`.

## Add a public theme

Follow [`docs/themes.md`](./docs/themes.md). Remap `--color-ph-*` under `html[data-theme="…"]`. Phosphor + Ink are public; **SI stays private / enable-only**.

## Local loop

```bash
npm install
npm run dev          # http://localhost:8080 — PGLite seeds Ollama + test user
npm run seed         # re-seed against a running server
npm test && npm run typecheck && npm run lint
```

Sign in as `test@apostle.local` / `password123`. Disable auto-seed with `APOSTLE_SEED_LOCAL=0`.

## Docs worth reading first

- [README](./README.md) — product story, roadmap, run path
- [Plugins](./docs/plugins.md) — author path + checklist
- [Themes](./docs/themes.md) — public theme contract (SI private)
- [Computer spike](./docs/browser-computer-spike.md) — VFS limits
- [Browser use](./docs/browser-use.md) — allowlist + screenshot trail
- [Demo script](./docs/demo-script.md) — 60–90s walkthrough
