# Apostle V1 — owned context plane roadmap

**Status:** active  
**Branch:** `cursor/v1-prototype-primitives-545f`  
**North star:** Self-hostable product plane (identity, workspace, memory, gateway, export, Desk, themes) with a replaceable agent runtime underneath (TrueForge by default for missions/tools). Enterprise customers plug in via **private adapters** — never committed to this repository.

## Law

1. **Apostle owns the gateway** — authz, entitlements, safety, metering, context assembly, model switch/failover. No third-party harness in the critical path.
2. **TrueForge (optional) sits below** — `AgentRuntimePort` for missions, MCP/tools, sandbox, approvals, schedules.
3. **Themes never register tools.** Private customer chrome stays out of OSS (`src/private/local/`).
4. **Public vs private data planes stay separate** — workspace never trains third-party models by default.
5. **Customer brand, SSO, corpus, and plan names stay out of version control.** Ship generic ports here; mount private adapters at deploy time.

## V1 scope (must)

| # | Capability | Port / surface |
|---|------------|----------------|
| 1 | Formalize ports + stub adapters | all ports |
| 2 | Workspace: projects + threads + files + prompts | `WorkspaceStore` |
| 3 | Portable memory panel (CRUD, global/project) | `MemoryPort` |
| 4 | Mid-thread model switch + attribution + floor failover | `GatewayPort` / `ProviderAdapter` / `ContextAssembler` |
| 5 | Export schema v1 + Vault | `ExportPort` |
| 6 | Agent runtime wire-up (local stub + TrueForge client) | `AgentRuntimePort` |
| 7 | Skills as workspace objects | `SkillsRegistry` |

## V1 out of scope (honest)

- Customer SSO / paid-plan entitlement adapters (private package)
- Customer live-corpus RAG adapters (private `CorpusRetriever`)
- Model Arena
- Firecracker / Daytona hardening
- Native mobile shells (shared Workspace API first)

## Execution

Stories live in [`prd.json`](../prd.json) for one-story iterations. Human overview stays here.

```bash
npm run typecheck
npm test
```
