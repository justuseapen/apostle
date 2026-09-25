# Apostle

WordPress for a chat assistant.

Install it, paste a model key, and you have a product people can talk to. The look is a theme. What it can do is a plugin. When someone asks for something you have not built yet, the desk records it so you can add it.

A solo developer should be able to point this at their own audience, charge for it, and not maintain an agent framework.

## What it is

Two URLs, one product.

- `/` is the chat.
- `/admin` is the desk: voice, plugins, which model runs, spend, and the list of asks you cannot fulfill yet.

Core stays small. It chats with zero plugins. A theme never owns the harness. A plugin declares what it needs, and core refuses the rest.

The model sits behind one OpenAI-compatible gateway. This build talks to Grok. The same slot is meant for OpenRouter, Ollama, or any other compatible endpoint. A router picks a label before each turn (`cheap`, `default`, `strong`, `vision`) and the desk maps those labels to model ids. Later that choice can be a typed decision model (Jev) instead of the local heuristic.

## What ships now

- Threads, streaming-style replies, and a per-user history.
- Sign-in, so threads and desk settings belong to the operator.
- A desk-owned gateway: base URL + API key (OpenAI-compatible). Falls back to `XAI_API_KEY`, then `OPENROUTER_API_KEY`, then `OPENAI_API_KEY`.
- A frozen plugin contract under `src/lib/apostle/plugins/` — register a plugin there; do not edit the harness.
- Plugins: clock, public https page fetch, calculator, file-ask (`create_missing`), and **Computer** (browser-sandbox VFS + constrained shell — not host FS).
- A model map and a token log.
- An optional free-plan cap (40 messages) so a paid plan has something to lift.
- **Missing.** If a person asks for a capability the installed tools cannot do, the ask is logged with a count. Start it, dismiss it, or mark it done.

## Roadmap

Sequenced against what a ChatGPT-shaped product needs — and against enterprise buy-in asks (sovereign chat + harness + sandbox, human approval, data plane). Gaps stay honest; nothing below is marked done unless it ships.

**Now**

1. Private themes selectable without forking core (`?theme=`, desk Theme tile, optional deploy default). Phosphor stays public; Super Intelligence (`si`) is the first private customer skin (enable-only — not a public catalog entry).
2. Honest Hero chrome for enterprise buy-in: tool cards, three-column run layout, artifacts / memory / knowledge / approval shells — without pretending the backends ship.

**Next** — the ChatGPT-shaped gaps, ordered so P0→P1 enterprise asks land first:

1. Users who are not the operator. Invite link, quota, their own threads.
2. Computer (browser-first). Jailed VFS + constrained shell as a plugin; Artifacts lists workspace files. OPFS / File System Access where the browser allows. **CLI / desktop companion deferred.** Real host shell and Firecracker-class isolation stay enterprise Spike — not this OSS default. Network remains default deny.
3. Tool cards in the chat surface (streaming tool-call UI, not just JSON in the thread).
4. Knowledge. Upload a corpus, retrieve it, cite it. (Enterprise P2 — RAG drawer.)
5. Memory. Facts about a person, separate from the corpus. (Enterprise P2.)
6. Browser. A page inside the same cage, with an allowlist + screenshot trail. (Enterprise P2.)
7. Approvals in the protocol. A tool that needs a person pauses the run; approve once / for run / deny, all audited. (Enterprise P3 — HITL.)
8. Jev (or any decision model) as the router: which model, and whether a tool needs a person to approve it. (Enterprise model gateway / SI-Router.)

**Later**

- Theme catalog beyond the private skins above.
- Plugin catalog.
- Background runs that finish after the tab closes; subagents; spend caps per run/team. (Enterprise P3.)
- Admin audit log UI spanning approvals, tool use, and overflow. (Enterprise P3 control plane.)
- Observability traces (cost, runs) — Langfuse-class, replaceable.
- Channels besides the web.
- MCP tool bus as the standard plugin port (search, mail, browser, repo, internal APIs).

**Spike / research (not ship commitments)**

- 30-day architecture spike: browser isolation + data residency guarantees.
- Firecracker-class sandbox proof (no host mounts, egress allowlist, per-run lifetime) — **enterprise**, separate from the OSS browser Computer plugin.
- Optional tiny local companion for true host FS later — document as a limit until then; do not ship Electron/CLI in the OSS spike.

**Future / deferred**

- Desktop computer-use VM and distribution onto a customer’s existing surfaces (enterprise P4 — direction only).
- **CLI / desktop Computer app — deferred.** Explore browser Computer first; revisit native only when browser APIs are proven insufficient.
- **Billing / Stripe / plans — out for OSS.** Apostle is open-source; do not implement Stripe or paid plans as a near-term priority. The optional free-plan message cap stays as a desk control, not a billing product. Enterprise margin can be sponsored differently if needed.

Not on the list until the above is dull: WhatsApp, a workflow canvas, a new model as the product.


## Run it

Node 22.

```bash
npm install
npm run dev          # http://localhost:8080 — PGLite auto-seeds Ollama + test user
npm run seed         # re-seed against a running server (idempotent)
# Optional: env fallback when the desk key is empty
XAI_API_KEY=your-key npm run dev
# or: OPENROUTER_API_KEY=… / OPENAI_API_KEY=…
```

Local defaults (no desk setup): sign in as `test@apostle.local` / `password123`. Gateway is `http://localhost:11434/v1` with model map → `qwen3:0.6b`. Disable with `APOSTLE_SEED_LOCAL=0`.

Open `http://localhost:8080`. Or configure DESK (`/admin`) yourself → paste base URL + API key → Save → chat.

Private Super Intelligence skin (does not change the public Phosphor default): open `http://localhost:8080/?theme=si`, or pick **Super Intelligence** under Desk → Theme. Reset with `?theme=phosphor`. For a customer-only deploy, set the `<meta name="apostle-default-theme" content="si">` default (or `VITE_APOSTLE_THEME=si` at build) so Phosphor stays the open-source look everywhere else.

OpenRouter example: base `https://openrouter.ai/api/v1`, key from openrouter.ai/keys, model ids like `openai/gpt-4o-mini` in the model map.

Without `DATABASE_URL`, data lives in an embedded Postgres that resets when the process stops. Set `DATABASE_URL` for anything you want to keep.

Sign-in is Google or X through the hosted broker. If that redirect is refused on your machine, email-and-password is the local fallback (`src/lib/auth/email-password.ts`).

## Where the code is

| Path | What |
|---|---|
| `src/routes/index.tsx` | Chat |
| `src/routes/admin.tsx` | Desk |
| `src/lib/apostle/server.ts` | Gateway call, router, missing-ask log |
| `src/lib/apostle/plugins/` | Frozen plugin contract + registry |
| `migrations/` | Schema. Add the next number. Do not edit an applied file. |

## Law

1. Core chats with no plugins.
2. Themes do not register tools.
3. Plugins declare network, secrets, and approvals. Default is deny.
4. One gateway object. The harness does not import five vendor SDKs.
5. User content (threads, plugins, themes) survives a core update.
6. "Full access to the host" is never a default.
