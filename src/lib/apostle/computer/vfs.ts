/**
 * Server-side virtual filesystem for the Computer plugin.
 * Persists in Postgres/PGLite — never touches the host disk.
 */
import { basename, isDirectChild, isUnder, normalizePath, parentPath } from "./paths.ts";

export type ComputerFileRow = {
  path: string;
  content: string;
  updated_at: string;
};

export type WorkspaceRef = { userId: string; threadId: string };

const MAX_CONTENT = 120_000;
const MAX_FILES = 200;

async function sqlClient() {
  const { getSql } = await import("../../db.ts");
  return getSql();
}

function threadKey(threadId?: string | null) {
  const t = (threadId || "default").trim() || "default";
  return t.slice(0, 80);
}

export function workspaceRef(userId: string, threadId?: string | null): WorkspaceRef {
  return { userId, threadId: threadKey(threadId) };
}

async function allFiles(ws: WorkspaceRef): Promise<ComputerFileRow[]> {
  const sql = await sqlClient();
  return sql<ComputerFileRow>`
    select path, content, updated_at::text as updated_at
    from computer_files
    where user_id = ${ws.userId} and thread_id = ${ws.threadId}
    order by path asc
  `;
}

export async function listWorkspace(
  ws: WorkspaceRef,
  rawPath?: string,
): Promise<string> {
  const norm = normalizePath(rawPath || "/");
  if (typeof norm !== "string") return norm.error;
  const files = await allFiles(ws);
  if (norm !== "/") {
    const exact = files.find((f) => f.path === norm);
    if (exact) {
      return `file ${norm} (${exact.content.length} bytes)`;
    }
  }
  const kids = new Set<string>();
  for (const f of files) {
    if (norm === "/") {
      const top = f.path.slice(1).split("/")[0];
      if (top) kids.add(top + (f.path.slice(1).includes("/") ? "/" : ""));
    } else if (isUnder(norm, f.path) && f.path !== norm) {
      const rest = f.path.slice(norm.length + 1);
      const first = rest.split("/")[0];
      if (first) kids.add(first + (rest.includes("/") ? "/" : ""));
    }
  }
  const lines = [...kids].sort();
  if (!lines.length) {
    return norm === "/"
      ? "(empty workspace)\nHint: computer write a README.md, or run: echo hello > notes.txt"
      : `(empty) ${norm}`;
  }
  return lines.map((n) => (n.endsWith("/") ? `dir  ${n}` : `file ${n}`)).join("\n");
}

export async function readFile(ws: WorkspaceRef, rawPath: string): Promise<string> {
  const norm = normalizePath(rawPath);
  if (typeof norm !== "string") return norm.error;
  if (norm === "/") return "Cannot read the root directory — use list.";
  const sql = await sqlClient();
  const rows = await sql<{ content: string }>`
    select content from computer_files
    where user_id = ${ws.userId} and thread_id = ${ws.threadId} and path = ${norm}
  `;
  if (!rows[0]) return `No such file: ${norm}`;
  return rows[0].content;
}

export async function writeFile(
  ws: WorkspaceRef,
  rawPath: string,
  content: string,
  opts?: { append?: boolean },
): Promise<string> {
  const norm = normalizePath(rawPath);
  if (typeof norm !== "string") return norm.error;
  if (norm === "/") return "Cannot write the root path.";
  const body = content ?? "";
  if (body.length > MAX_CONTENT) return `Content too large (max ${MAX_CONTENT} chars).`;

  const sql = await sqlClient();
  const existing = await sql<{ content: string }>`
    select content from computer_files
    where user_id = ${ws.userId} and thread_id = ${ws.threadId} and path = ${norm}
  `;
  let next = body;
  if (opts?.append && existing[0]) next = existing[0].content + body;
  if (next.length > MAX_CONTENT) return `Content too large after append (max ${MAX_CONTENT} chars).`;

  if (!existing[0]) {
    const count = await sql<{ n: number }>`
      select count(*)::int as n from computer_files
      where user_id = ${ws.userId} and thread_id = ${ws.threadId}
    `;
    if ((count[0]?.n ?? 0) >= MAX_FILES) {
      return `Workspace file limit reached (${MAX_FILES}). Delete some files first.`;
    }
  }

  // Ensure parent "dirs" exist as prefix convention only — no dir rows needed.
  await sql`
    insert into computer_files (user_id, thread_id, path, content, updated_at)
    values (${ws.userId}, ${ws.threadId}, ${norm}, ${next}, now())
    on conflict (user_id, thread_id, path) do update set
      content = excluded.content,
      updated_at = now()
  `;
  return `Wrote ${norm} (${next.length} bytes)`;
}

export async function removePath(ws: WorkspaceRef, rawPath: string, recursive = false): Promise<string> {
  const norm = normalizePath(rawPath);
  if (typeof norm !== "string") return norm.error;
  if (norm === "/") return "Refusing to delete the workspace root.";
  const sql = await sqlClient();
  if (recursive) {
    const files = await allFiles(ws);
    const victims = files.filter((f) => f.path === norm || isUnder(norm, f.path));
    for (const f of victims) {
      await sql`
        delete from computer_files
        where user_id = ${ws.userId} and thread_id = ${ws.threadId} and path = ${f.path}
      `;
    }
    return victims.length
      ? `Removed ${victims.length} path(s) under ${norm}`
      : `Nothing to remove at ${norm}`;
  }
  const rows = await sql`
    delete from computer_files
    where user_id = ${ws.userId} and thread_id = ${ws.threadId} and path = ${norm}
    returning path
  `;
  if (!rows.length) {
    // Treat as directory prefix
    const files = await allFiles(ws);
    const kids = files.filter((f) => isDirectChild(norm, f.path) || isUnder(norm, f.path));
    if (kids.length) {
      return `Directory not empty: ${norm} (use recursive remove or rm -r)`;
    }
    return `No such file: ${norm}`;
  }
  return `Removed ${norm}`;
}

export async function mkdir(ws: WorkspaceRef, rawPath: string): Promise<string> {
  const norm = normalizePath(rawPath);
  if (typeof norm !== "string") return norm.error;
  if (norm === "/") return "Root already exists.";
  // Marker file so empty dirs show up in listings.
  const marker = `${norm}/.keep`;
  const existing = await readFile(ws, marker);
  if (!existing.startsWith("No such file")) return `Directory exists: ${norm}`;
  return writeFile(ws, marker, "");
}

export async function listFileRows(ws: WorkspaceRef): Promise<ComputerFileRow[]> {
  return allFiles(ws);
}

export async function clearWorkspace(ws: WorkspaceRef): Promise<number> {
  const sql = await sqlClient();
  const rows = await sql<{ path: string }>`
    delete from computer_files
    where user_id = ${ws.userId} and thread_id = ${ws.threadId}
    returning path
  `;
  return rows.length;
}

export { basename, parentPath, MAX_CONTENT, MAX_FILES };
