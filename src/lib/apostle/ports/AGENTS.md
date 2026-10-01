# Sovereignty ports

- Customer brand / SSO / corpus / plan SKUs: **never commit** here. Use `src/private/local/` (gitignored) or a private package.
- TrueForge belongs behind `AgentRuntimePort` only — Apostle keeps the gateway.
- Node tests import with explicit `.ts` suffixes (see sibling `*.test.ts` files). App code may import `@/lib/apostle/ports`.
- SQL workspace: `createWorkspaceStore` + migration `0009_workspace_projects.sql`; call `installAppPorts(() => getSql())` on server boot.
- Portable memory: migration 0010 + createMemoryStore; Context → Memory drawer wired via list/upsert/delete server fns.
