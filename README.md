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
- Three plugins: clock, public https page fetch, and calculator.
- A model map and a token log.
- An optional free-plan cap (40 messages) so a paid plan has something to lift.
- **Missing.** If a person asks for a capability the installed tools cannot do, the ask is logged with a count. Start it, dismiss it, or mark it done.

## Roadmap

**Now.** Billing. Plans, a Stripe plugin, usage against the plan, margin on the desk.

**Next.** The things a ChatGPT-shaped product is naked without:

1. Users who are not the operator. Invite link, quota, their own threads.
2. Computer. A jailed shell and files, as a plugin, default deny on the network.
3. Knowledge. Upload a corpus, retrieve it, cite it.
4. Memory. Facts about a person, separate from the corpus.
5. Browser. A page inside the same cage, with an allowlist.
6. Jev (or any decision model) as the router: which model, and whether a tool needs a person to approve it.

**Later.** A theme you can swap without forking core. A catalog of plugins. Background runs that finish after the tab closes. Channels besides the web.

Not on the list until the above is dull: desktop control, WhatsApp, a workflow canvas, a new model.

## Run it

Node 22.

```bash
npm install
# Optional: env fallback when the desk key is empty
XAI_API_KEY=your-key npm run dev
# or: OPENROUTER_API_KEY=… / OPENAI_API_KEY=…
```

Open `http://localhost:8080`. Sign in → **DESK** (`/admin`) → paste base URL + API key → Save → chat.

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
