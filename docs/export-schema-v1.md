# Export schema v1

**Audience:** operators and clients that need a portable, open archive of a user's private workspace.  
**Port:** `ExportPort.buildArchive(userId)` → `ExportArchive`.

## Principles

1. The archive is **user-owned** private-plane data — not public corpus.
2. Schema version is a string (`"1"`). Bump when breaking field shapes.
3. Bytes for large files stay behind `storageKey`; the JSON lists metadata only.
4. Skills in the archive are **workspace skill bundles**, not harness plugins.

## Top-level shape

```json
{
  "schemaVersion": "1",
  "createdAt": "2026-10-02T12:00:00.000Z",
  "userId": "<user id>",
  "payload": {
    "projects": [],
    "threads": [],
    "messages": [],
    "memory": [],
    "prompts": [],
    "skills": [],
    "files": []
  }
}
```

## Collections

| Key | Fields |
|-----|--------|
| `projects` | `id`, `name`, `defaultModelId`, `createdAt` |
| `threads` | `id`, `title`, `projectId`, `preferredModelId`, `createdAt` |
| `messages` | `id`, `threadId`, `role`, `content`, `meta`, `createdAt` |
| `memory` | `id`, `projectId`, `scope` (`global`\|`project`), `text`, `updatedAt` |
| `prompts` | `id`, `projectId`, `title`, `body`, `createdAt` |
| `skills` | `id`, `projectId`, `name`, `description`, `instructions` |
| `files` | `id`, `projectId`, `name`, `mime`, `sizeBytes`, `storageKey`, `createdAt` |

`meta` on messages is JSON text (router label, model attribution, tool traces, optional `failoverNotice`).

## Vault UI

Desk → **Vault** (or Context → Vault) calls `exportUserArchive` and downloads `apostle-export-v1.json`. Delete-with-receipt is a later story.

## Skills vs Plugins

| | Skills | Plugins |
|--|--------|---------|
| Owned by | User workspace | Operator / harness |
| Content | Instructions + optional file refs | Tool implementations |
| Export | Included in schema v1 | Not included (install-time) |
| Port | `SkillsRegistry` | Plugin catalog / Computer / Browser |

## Code

- `createExportStore` in `src/lib/apostle/ports/export-store.ts`
- Stub: `stubExport()` returns empty collections with `schemaVersion: "1"`
