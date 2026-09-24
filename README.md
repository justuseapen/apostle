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
- Two plugins: clock, and fetch of a public https page.
- A model map and a token log.
- An optional free-plan cap (40 messages) so a paid plan has something to lift.
- **Missing.** If a person asks for a capability the installed tools cannot do, the ask is logged with a count. Start it, dismiss it, or mark it done.

## Roadmap

**Now.** Make the gateway a setting (OpenRouter key, base URL, model map) instead of a hardcoded host. Freeze the plugin contract so a third plugin does not require editing the harness.

**Next.** The things a ChatGPT-shaped product is naked without:

1. Billing. Plans, a Stripe plugin, usage against the plan, margin on the desk.
2. Users who are not the operator. Invite link, quota, their own threads.
3. Computer. A jailed shell and files, as a plugin, default deny on the network.
4. Knowledge. Upload a corpus, retrieve it, cite it.
5. Memory. Facts about a person, separate from the corpus.
6. Browser. A page inside the same cage, with an allowlist.
7. Jev (or any decision model) as the router: which model, and whether a tool needs a person to approve it.

**Later.** A theme you can swap without forking core. A catalog of plugins. Background runs that finish after the tab closes. Channels besides the web.

Not on the list until the above is dull: desktop control, WhatsApp, a workflow canvas, a new model.

## Run it

Node 22.

```bash
npm install
XAI_API_KEY=your-key npm run dev
```

Open `http://localhost:8080`.

Without `DATABASE_URL`, data lives in an embedded Postgres that resets when the process stops. Set `DATABASE_URL` for anything you want to keep.

Sign-in is Google or X through the hosted broker. If that redirect is refused on your machine, email-and-password is the local fallback (`src/lib/auth/email-password.ts`).

## Where the code is

| Path | What |
|---|---|
| `src/routes/index.tsx` | Chat |
| `src/routes/admin.tsx` | Desk |
| `src/lib/apostle/server.ts` | Gateway, plugins, router, missing-ask log |
| `migrations/` | Schema. Add the next number. Do not edit an applied file. |

## Law

1. Core chats with no plugins.
2. Themes do not register tools.
3. Plugins declare network, secrets, and approvals. Default is deny.
4. One gateway object. The harness does not import five vendor SDKs.
5. User content (threads, plugins, themes) survives a core update.
6. "Full access to the host" is never a default.
