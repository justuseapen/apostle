# Enterprise buy-in · requirements ↔ roadmap

**Customer / theme:** TMTG · **Super Intelligence** (`si`)  
**Apostle:** branch `cursor/browser-computer-spike-c659` · [apostle#4](https://github.com/justuseapen/apostle/pull/4)  
**How to enable the private theme for the pitch**

1. Local: `http://localhost:8080/?theme=si` (persists in `localStorage`)
2. Desk → **Theme** → Super Intelligence (private)
3. Reset: `?theme=phosphor` or Desk → Phosphor (public)
4. Customer-only deploy: set meta `apostle-default-theme` to `si`, or build with `VITE_APOSTLE_THEME=si`

Phosphor remains the public default. SI does not register tools (theme law).

**Evidence:** `media/enterprise-theme-*.png` · `media/missing-tool-desk.png` · `media/hero-gaps-*.png` · `media/browser-computer-*.png` · `media/browser-use-*.png`  
**Computer spike doc:** `docs/browser-computer-spike.md`  
**Browser use (in flight on #4):** `docs/browser-use.md`  
**OSS launch checklist:** Project store `docs/oss-launch-ready.md`

**File a Missing ask from chat:** tool `create_missing` · slash `/missing` (aliases `file_ask`, `ask`, `gap`). Desk also auto-seeds the buy-in matrix when Missing is empty, and has **Seed enterprise gaps**.

---

## Matrix

| # | Requirement (from buy-in deck) | Apostle today | Roadmap bucket | Honesty note |
|---|--------------------------------|---------------|----------------|--------------|
| 1 | Chat + streaming + gateway (P0) | Shipped — threads, streaming-style replies, desk-owned OpenAI-compatible gateway | Done / maintain | Not full AG-UI event bus yet |
| 2 | Private corporate chrome matching brand board | Shipped — `data-theme=si` tokens, SI lockup, Inter/Poppins, Signal/Pulse/Halt | **Now** (theme select without fork) | Private skin; not a public catalog |
| 3 | Tool cards in chat (P1) | **Partial — shipped this slice** — richer ToolCard (args/result/collapse); not streaming AG-UI events | **Next** | Still not a live event bus |
| 4 | Sandboxed shell + filesystem (P1 / workspace computer) | **Partial — browser Computer spike** — VFS + constrained shell plugin; Artifacts lists files; OPFS / File System Access import | **Next** (browser-first; deepen via Better VM) | **Not** host shell; CLI/desktop deferred; default deny on network stays law |
| 4b | **Better VM** (clearer sandbox / richer runtime) | Not shipped — next honest step beyond VFS builtins | **Next** | Do **not** promise Firecracker as OSS default |
| 5 | Firecracker-class isolation proof | Not shipped | **Spike** (enterprise) | Separate from OSS browser Computer / Better VM |
| 6 | MCP tool bus (search, mail, browser, repo, APIs) | Frozen plugin contract (clock, fetch, calculator, create_missing, **computer**, browser-in-flight) | **Later** | MCP is the intended port |
| 7 | Allowlisted browser + screenshot trail (P2) | **Partial — shipped this slice** — Browser plugin (Playwright + Desk allowlist + screenshot trail in tool cards / Context → Browser) | **Next** (Browser deepen) | Not Firecracker; sessions in-memory; desktop computer-use deferred |
| 8 | Memory drawer (per-user, revocable) (P2) | **Partial — shell only** — right-column Memory drawer stub | **Next** (Memory) | No persistence / revoke yet |
| 9 | Knowledge / RAG with citations (P2) | **Partial — shell only** — Knowledge drawer stub | **Next** (Knowledge) | Separate from Memory; no corpus |
| 10 | Human approvals in protocol (P3) | **Partial — UI shell** — ApprovalCard (once / run / deny) local-only; no protocol halt | **Next** (Approvals + Jev router) | Not audited yet |
| 11 | Subagents + background runs (P3) | Not shipped | **Later** | Disconnect / rejoin is deck fiction |
| 11b | **Automations** (scheduled / triggered runs) | Not shipped | **Later** | Desk-owned, audited; not a live chat turn |
| 12 | Admin audit log + spend caps (P3 control plane) | Token log only; Missing roadmap + create_missing tool; no approval audit UI | **Later** | Budgets ≠ Stripe plans; billing not on the OSS Now path |
| 13 | Model router (SI-Router / open weights + overflow) | Heuristic label router + desk model map; Ollama/OpenRouter/Grok | **Next** (Jev as typed router) | Overflow metering not productized |
| 14 | Data plane residency / trust boundary | Local/Postgres operator data; no residency guarantees | **Spike** | Do not promise without infra sign-off |
| 15 | Multi-user / identity beyond operator | Sign-in is operator-scoped | **Next** (invite users) | Enterprise identity is thicker |
| 15b | **Thread management** (rename, delete, sort/reorder) | Not shipped — sidebar is create/select only | **Next** | Operator desk hygiene |
| 15c | **Search through threads** | Not shipped | **Next** | ChatGPT-shaped find-without-scroll |
| 16 | Desktop computer-use + TMTG surface distribution (P4) | Out of scope | **Future / deferred** | Direction only — not a date |
| 17 | Billing / plans / margin | Not started — **skipped for OSS** | **Deferred / out for OSS** | No Stripe/plans work; free-plan message cap stays a desk control only. Enterprise margin can be sponsored differently if needed. |
| — | **Hero three-column run layout** | **Partial — shipped this slice** — threads \| chat \| context (xl+) | **Next** polish | Mobile keeps two-pane |
| — | **Artifacts / files panel** | **Partial — wired to Computer VFS** — lists/preview/import; not a full IDE | **Next** polish | Browser sandbox honesty copy in drawer |
| — | **CLI / desktop Computer app** | Not started — **deferred** | **Future / deferred** | Browser exploration first (Justus) |
| — | **Launch ready for OSS attention** | Checklist in Project store `docs/oss-launch-ready.md` | **Now** | Meta readiness — not a Missing plugin ask; SI stays private |
| — | **Desk Missing population** | **Shipped** — `create_missing` tool + enterprise seed (incl. search, thread mgmt, Better VM, automations) | Done / maintain | Pitch desk never empty |

---

## Roadmap changes made in README

- Pulled **private themes** into **Now** (SI ships; Phosphor untouched).
- Reordered **Next** so Computer + tool cards precede Knowledge/Memory/Browser, matching P0→P1→P2.
- **Computer** reframed **browser-first** (VFS + constrained shell); CLI/desktop deferred; Firecracker remains enterprise Spike.
- Added **Better VM** as the honest Next deepen beyond current VFS/builtins (no Firecracker-as-OSS-default promise).
- Added **Thread management** and **Search through threads** to **Next**.
- Added **Automations** to **Later**.
- Added **Launch ready for OSS attention** to **Now** with detailed checklist in Project store `docs/oss-launch-ready.md`.
- Added explicit **Approvals** and **Jev router** rows aligned to HITL / SI-Router.
- Added **Later** items for background runs, admin audit, MCP bus, observability.
- Added **Spike** (browser isolation + residency; Firecracker proof) and **Future/deferred** (P4 + CLI/desktop Computer) so the ask’s “UI fiction ≠ ship” line stays visible.
- **Billing / Stripe / plans** moved off **Now** → **Future / deferred · out for OSS** (master-sync; no Stripe implementation).
- Browser called **partial — shipped / in flight** on #4 (allowlisted Playwright + screenshot trail).

---

## Pitch one-liner for Justus

Apostle covers P0 (chat + gateway), wears Super Intelligence chrome, files Missing asks from chat, and ships a **browser Computer** spike (VFS + constrained shell + Artifacts) with honest sandbox limits — not a host jail and not Firecracker. **Better VM** is the next honest deepen. Thread search/management and automations are on the OSS product roadmap; launch-ready is a checklist, not vapor. CLI/desktop stay deferred; real HITL protocol and enterprise isolation remain the next enterprise builds.
