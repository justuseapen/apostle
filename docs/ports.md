# Ports — owned product plane, replaceable runtime

**Audience:** someone wiring Apostle for self-host or a private enterprise deploy.  
**Law:** Apostle owns the gateway and workspace. Optional agent harnesses (e.g. TrueForge) sit **below** the gateway via `AgentRuntimePort`. Customer brand, SSO, corpus, and plan SKUs are **never committed** to this repository — mount them as private adapters.

See also: [`v1-roadmap.md`](./v1-roadmap.md), [`themes.md`](./themes.md).

## Ownership boundary

```
Clients
   │
   ▼
Apostle Gateway + Workspace + Memory + Export + Desk + Themes
   │  AgentRuntimePort
   ▼
TrueForge / local stub (tools, sandbox, missions, schedules)
   │
   ▼
ProviderAdapters (OpenAI-compatible, floor, …)
```

## Port catalog

| Port | Owns | OSS default |
|------|------|-------------|
| `IdentityPort` | Who is signed in | Stub → Better Auth |
| `EntitlementsPort` | Plan gates | Open flags |
| `GatewayPort` | Authz, route, meter, failover | Stub over provider list |
| `ProviderAdapter` | One model backend | Stub primary + floor |
| `ContextAssembler` | System + memory + RAG + thread window | `createContextAssembler` (+ stub) |
| `WorkspaceStore` | Projects, prompts, thread↔project | SQL (`createWorkspaceStore`) + in-memory stub |
| `MemoryPort` | Portable global/project memory | SQL (`createMemoryStore`) + stub |
| `CorpusRetriever` | Public-plane search only | Empty stub |
| `AgentRuntimePort` | Missions / long tool loops | Local in-memory stub |
| `SkillsRegistry` | Workspace skill bundles | In-memory stub |
| `ExportPort` | Open archive schema | Empty v1 payload |
| `SafetyPort` | Gateway-owned screening | Allow-all stub |
| `ThemePort` | Public theme catalog | `PUBLIC_THEMES` |

Code: `src/lib/apostle/ports/`.

```ts
import { getPorts, installAppPorts } from "@/lib/apostle/ports";
import { getSql } from "@/lib/db";

installAppPorts(() => getSql()); // server boot — SQL workspace

const ports = getPorts();
await ports.workspace.createProject(userId, "Personal");
```

## Private adapters

- Put customer SSO, live corpus, entitlements SKUs, and brand chrome in `src/private/local/` (gitignored) or a private package.
- Do **not** name customers or ship their assets in OSS docs, screenshots, or source.
- Swap implementations by wrapping `createDefaultPorts()` / `setPortsForTests` / a future Desk config — without forking `GatewayPort` ownership.

## TrueForge

TrueForge is an optional **AgentRuntimePort** implementation for missions, MCP, sandbox-as-tool, and approvals. It must not become the authn/authz edge or the workspace store. Sales / deploy language: “Apostle is the product plane; the agent engine is swappable.”

## Workspace schema

Migration `migrations/0009_workspace_projects.sql` adds `projects`, `project_files`, `prompt_library`, and nullable `threads.project_id` (legacy threads stay unfiled).

## Memory schema

Migration `migrations/0010_portable_memory.sql` adds `memory_items` (global | project). Chat Context → Memory drawer lists, adds, and deletes items.

## Model switch + failover

Migration `migrations/0011_thread_preferred_model.sql` adds `threads.preferred_model_id`. Chat model picker sets the thread default; history is unchanged. `resolveModelChain` / `pickFailoverResult` (`model-routing.ts`) try preferred → router map → floor (`APOSTLE_FLOOR_MODEL` or cheap/default). Failover writes `meta.failoverNotice`.

## Missions + skills

Migration `migrations/0012_missions_and_skills.sql`. Local `AgentRuntimePort` completes missions in-process; optional TrueForge via `TRUEFORGE_BASE_URL` (+ `TRUEFORGE_API_KEY`). Skills are workspace instruction bundles (`SkillsRegistry`) — distinct from harness Plugins. See [`export-schema-v1.md`](./export-schema-v1.md).

## Export / Vault

`ExportPort` / `createExportStore` builds schema v1 JSON. Context → Vault downloads `apostle-export-v1-*.json`.
