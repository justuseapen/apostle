/** Shared gap (Missing ask) helpers — used by auto-classifier and create_missing tool. */

export function slugifyGap(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || "ask";
}

export type UpsertGapInput = {
  userId: string;
  title: string;
  example?: string;
  note?: string;
  /** When true, do not bump hits on existing rows (seed idempotency). */
  seed?: boolean;
};

export type UpsertGapResult = {
  id: string;
  title: string;
  slug: string;
  created: boolean;
};

/**
 * Insert or bump a Missing row for the operator.
 * Skips dismissed slugs. Returns null if title is empty.
 */
export async function upsertGap(input: UpsertGapInput): Promise<UpsertGapResult | null> {
  const title = input.title.trim().slice(0, 80);
  if (title.length < 2) return null;
  const slug = slugifyGap(title);
  const example = (input.example ?? title).trim().slice(0, 280);
  const note = (input.note ?? "").trim().slice(0, 500);
  const { getSql } = await import("../db.ts");
  const sql = await getSql();

  const existing = await sql<{ id: string; status: string }>`
    select id, status from gaps where user_id = ${input.userId} and slug = ${slug}
  `;
  if (existing[0]?.status === "dismissed") return null;

  if (existing[0]) {
    if (input.seed) {
      return { id: existing[0].id, title, slug, created: false };
    }
    await sql`
      update gaps
      set hits = hits + 1,
          example = ${example},
          title = ${title},
          note = case when ${note} = '' then note else ${note} end,
          updated_at = now()
      where id = ${existing[0].id} and user_id = ${input.userId}
    `;
    return { id: existing[0].id, title, slug, created: false };
  }

  const id = crypto.randomUUID();
  await sql`
    insert into gaps (id, user_id, slug, title, example, note)
    values (${id}, ${input.userId}, ${slug}, ${title}, ${example}, ${note})
  `;
  return { id, title, slug, created: true };
}

/** Enterprise buy-in matrix gaps — seed so Desk Missing is never empty for the pitch. */
export const ENTERPRISE_GAP_SEEDS: {
  title: string;
  example: string;
  note: string;
}[] = [
  {
    title: "Three-column run layout",
    example: "threads | chat | context / artifacts / run",
    note: "Hero UI · P1 shell",
  },
  {
    title: "Streaming tool cards",
    example: "Rich tool-call cards in chat (args, status, result)",
    note: "Hero UI · P1",
  },
  {
    title: "Artifacts / files panel",
    example: "Files affordance beside the run",
    note: "Hero UI · P1 stub → real FS later",
  },
  {
    title: "Human approval cards",
    example: "Approve once / for run / deny — protocol halt",
    note: "P3 · plugin.approval is declared but no HITL yet",
  },
  {
    title: "Memory drawer",
    example: "Per-user revocable memory (≠ RAG)",
    note: "P2 · separate from Knowledge",
  },
  {
    title: "Knowledge / RAG with citations",
    example: "Corpus search with citation chips",
    note: "P2 · separate from Memory",
  },
  {
    title: "Sandbox workspace computer",
    example: "Isolated shell + filesystem (default deny network)",
    note: "P1 · browser Computer spike in flight; CLI/desktop deferred; Firecracker = enterprise Spike",
  },
  {
    title: "Better VM",
    example: "Clearer sandbox boundary + richer runtime beyond VFS builtins",
    note: "Next · deepen browser Computer; do not promise Firecracker as OSS default",
  },
  {
    title: "Allowlisted browser trail",
    example: "Contained Chromium + domain allowlist + screenshots",
    note: "P2 · Partial — Browser plugin (Playwright + Desk allowlist + screenshot trail) in flight; Firecracker residency still Spike",
  },
  {
    title: "Search through threads",
    example: "Find past conversations by content or title",
    note: "Next · ChatGPT-shaped desk hygiene",
  },
  {
    title: "Thread management",
    example: "Rename, delete, sort/reorder sidebar threads",
    note: "Next · operator desk hygiene",
  },
  {
    title: "Automations",
    example: "Scheduled / triggered runs without a live chat turn",
    note: "Later · audited, desk-owned",
  },
  {
    title: "Admin audit log",
    example: "Approvals + spend caps in control plane",
    note: "P3 · beyond token usage events",
  },
  {
    title: "MCP tool bus",
    example: "search, mail, browser, repo, internal APIs",
    note: "Later · frozen plugin contract is the port",
  },
];

export async function seedEnterpriseGaps(userId: string): Promise<{ filed: number; skipped: number }> {
  let filed = 0;
  let skipped = 0;
  for (const seed of ENTERPRISE_GAP_SEEDS) {
    const row = await upsertGap({
      userId,
      title: seed.title,
      example: seed.example,
      note: seed.note,
      seed: true,
    });
    if (row?.created) filed += 1;
    else skipped += 1;
  }
  return { filed, skipped };
}
