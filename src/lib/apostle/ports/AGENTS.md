# Sovereignty ports

- Customer brand / SSO / corpus / plan SKUs: **never commit** here. Use `src/private/local/` (gitignored) or a private package.
- TrueForge belongs behind `AgentRuntimePort` only — Apostle keeps the gateway. Optional env: `TRUEFORGE_BASE_URL`, `TRUEFORGE_API_KEY`.
- Floor failover model: `APOSTLE_FLOOR_MODEL` or Desk `model_map.cheap` / `default`.
- Node tests import with explicit `.ts` suffixes (see sibling `*.test.ts` files). App code may import `@/lib/apostle/ports`.
- SQL workspace: `createWorkspaceStore` + migration `0009_workspace_projects.sql`; call `installAppPorts(() => getSql())` on server boot.
- Portable memory: migration 0010 + createMemoryStore; Context → Memory drawer wired via list/upsert/delete server fns.
- Model switch: migration 0011 + `model-routing.ts`; chat picker + `sendMessage({ modelId })` + `meta.failoverNotice`.
- Missions/skills: migration 0012 + `createLocalAgentRuntime` / `createSkillsStore`. Skills ≠ Plugins (see docs/export-schema-v1.md).
- Export: `createExportStore` + Context → Vault; schema documented in docs/export-schema-v1.md.
