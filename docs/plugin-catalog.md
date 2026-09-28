# Launch plugin catalog

Frozen registry under `src/lib/apostle/plugins/`. Themes never register tools. Each plugin declares `needs`; core refuses the rest.

Author path: [`plugins.md`](./plugins.md). Local seed soft-enables the full launch set for `test@apostle.local`.

## Shipping (13)

| Id | Name | Slash | One-liner | Network | Secrets | Approval |
|----|------|-------|-----------|---------|---------|----------|
| `get_time` | Clock | `/time` | Current or given time in IANA zones (format / convert) | none | none | no |
| `calc` | Calculator | `/calc` | Safe arithmetic (`+ - * / ( )`) | none | none | no |
| `hash` | Hash | `/hash` | SHA-256 / SHA-1 / MD5 digest of text | none | none | no |
| `uuid` | UUID | `/uuid` | Generate UUIDv4 (1–20) | none | none | no |
| `base64` | Base64 | `/base64` | Encode / decode UTF-8 as Base64 | none | none | no |
| `json_format` | JSON | `/json` | Pretty-print, minify, or validate JSON | none | none | no |
| `regex` | Regex | `/regex` | Test a JS regex against text | none | none | no |
| `fetch_page` | Page fetch | `/fetch` | Read a public https page as text | public https | none | no |
| `link_unfurl` | Link unfurl | `/unfurl` | Title / OG preview for a public https link | public https | none | no |
| `weather` | Weather | `/weather` | Current conditions via Open-Meteo (no API key) | open-meteo hosts | none | no |
| `create_missing` | File ask | `/missing` | File a Missing roadmap row on the Desk | none | none | no |
| `computer` | Computer | `/computer` | Per-thread VFS + constrained shell (**not** host FS) | none | none | no |
| `browser` | Browser | `/browse` | Allowlisted Playwright + screenshot trail | Desk allowlist https | none | no |

## Honesty

- **Computer** — partial. Browser-sandbox workspace only. No host shell, no Firecracker as OSS default.
- **Browser** — partial. Desk allowlist + Playwright. Not desktop computer-use; Firecracker residency still Spike.
- **Weather** — free Open-Meteo geocoding + forecast. No key. Not a paid weather product.
- **Link unfurl / Page fetch** — public https only; no localhost / private ranges; no logins.
- **Scratch notes** — use Computer VFS (`write` / `read`). There is no separate memory/RAG plugin at launch.

## Intentionally absent (for now)

| Ask | Why |
|-----|-----|
| Memory drawer / RAG with citations | Enterprise P2 — do not fake retrieval |
| RSS / headlines feed | Easy to spam; unfurl + fetch cover “what’s on this URL” |
| Host shell / arbitrary web | Law: default deny; Computer/Browser honesty unchanged |
| API-key weather vendors | Open-Meteo covers the demo without secrets |
| Billing / Stripe plugins | Out for OSS |
| MCP tool bus | Later — frozen contract is the port |

## Desk defaults

- Migration `0028_launch_plugins.sql` sets the settings column default to the launch list.
- `LOCAL_SEED_PLUGINS` mirrors that list for the local Ollama demo user.
- Existing operators get soft-enable for new utilities on next settings load (Desk can still disable).
