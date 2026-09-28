# Browser use

**Status:** partial OSS ship — allowlisted Playwright + screenshot trail · desktop computer-use deferred · Firecracker still enterprise Spike · billing still out for OSS  
**Theme:** Phosphor (public) + Super Intelligence (`?theme=si`) stay chrome-only — Browser is a plugin, not a theme.

## What it is

A **Browser** plugin in the frozen registry (`id: browser`, tool `browser`) that opens **Desk-allowlisted https** pages with server-side Playwright and records a **screenshot trail**:

| Action | What it does |
|--------|----------------|
| `open` / `navigate` | Goto URL (allowlist + https only), snapshot |
| `snapshot` / `screenshot` | Capture current page |
| `click` | Click a CSS selector, then snapshot |
| `type` | Fill a CSS selector, then snapshot |
| `close` | Close the in-memory Playwright session |
| `trail` | List recent screenshots for this thread |
| `allowlist` | Print Desk allowlist |
| `info` | Print capabilities + limits |

Slash: `/browse` (aliases `browser`, `screenshot`, `web`).

Screenshots appear:

- Inline on **Tool · browser** cards in chat
- In **Context → Browser** (xl viewport) as a trail

## How to try

```bash
# from repo root
npm run db:migrate   # applies 0007_browser_use
npm run seed         # soft-enables browser for test@apostle.local
npm run dev          # :8080
```

1. Open `http://localhost:8080` (Phosphor) or `http://localhost:8080/?theme=si`.
2. Sign in as `test@apostle.local` / `password123` (or create an account — Browser soft-enables).
3. Desk → confirm **Browser** is `[on]` → review **Browser allowlist** (defaults include `example.com`, Wikipedia, GitHub, MDN, httpbin) → Save.
4. Point the gateway at Ollama if you want model-driven tool calls: base `http://localhost:11434/v1`, models `qwen3:0.6b`.
5. In chat, try:
   - `/browse` then ask to open `https://example.com` and snapshot
   - Explicit: *Call the browser tool with action open, url https://example.com*
6. Open **Context → Browser** — trail should show the screenshot after the tool turn.

Without a model that emits tool calls, use the verify script (seeds a demo tool card + real Playwright open):

```bash
node scripts/verify-browser-use.mjs
```

## Allowlist how-to

1. Desk → **Browser allowlist**
2. One host per line (`example.com` or `*.wikipedia.org`)
3. Save desk
4. Non-allowlisted hosts and all localhost / private IPs are refused — even if listed

## Capabilities (honest)

- Server-side **Playwright Chromium** (already in Apostle/Grok envs)
- Per-thread in-memory browser session (dies on server restart)
- Screenshot rows in Postgres/PGLite (`browser_screenshots`), capped per thread
- Desk enable toggle + allowlist editor (host count on save); soft-enable for seeded local ops
- Desk → Browser → **Live sessions** (list / close in-memory Playwright sessions)
- Context → Browser: session status + **Close session**; click/type wait for visible selectors

## Limits (ceiling)

- **Not** a user-desktop browser or Electron/CLI companion
- **Not** authenticated multi-site sessions that survive restarts
- **Not** Firecracker / contained Chromium residency proof
- Arbitrary web is **default deny** — only Desk allowlist
- Click/type are CSS-selector primitives, not a vision computer-use agent
- Tiny models may need explicit prompts to emit `browser` tool calls

## Related

- Computer (VFS) spike: `docs/browser-computer-spike.md`
- Enterprise matrix: `docs/enterprise-buyin-roadmap.md`
- Demo: `docs/demo-script.md`
- Repo screenshots: `screenshots/oss-launch-*.png` (Phosphor only — do not use SI chrome for OSS promo)
