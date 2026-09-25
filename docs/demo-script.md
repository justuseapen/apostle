# Demo script (60–90s)

Phosphor only. Do **not** flip to `?theme=si` for an OSS audience.

## Prep (once)

```bash
npm install
npm run dev          # http://localhost:8080
# optional re-seed:
npm run seed
```

Ollama running locally with `qwen3:0.6b` (or point Desk gateway at any OpenAI-compatible endpoint).

## Script

1. **Sign in** — `test@apostle.local` / `password123`.
2. **Chat** — send a short hello. Show threads + streaming reply.
3. **Computer** — `/computer` then ask to write `/hello.txt` and list the workspace (or: *Call the computer tool with action write, path /hello.txt, content hi*). Open **Artifacts** — file appears. Say out loud: browser VFS, not host FS, network default deny.
4. **Missing** — ask for something not installed (e.g. “search my old threads”). Show Desk → Missing count / row.
5. **Desk theme note** — open `/admin`, point at Theme: Phosphor is public; Super Intelligence is private enable-only (`?theme=si`) — do not demo SI chrome for OSS.

Optional if time: Desk → Browser allowlist → `/browse` open `https://example.com` → Context → Browser trail. Say: allowlisted Playwright, not Firecracker, not desktop computer-use.

## Stop lines (keep saying)

- Computer / Browser are **partial / spike** — not done.
- **Better VM** is the honest Next deepen; Firecracker is enterprise Spike.
- Billing / Stripe is **out for OSS**.
