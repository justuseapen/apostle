/**
 * SQL-backed workspace store + migration contract.
 * Run: node --experimental-strip-types --test src/lib/apostle/ports/workspace-store.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { Sql } from "../../db.ts";
import { createDefaultPorts } from "./stubs.ts";
import { createWorkspaceStore } from "./workspace-store.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

/** Minimal Sql fake that understands the workspace-store query shapes. */
function createFakeSql(): Sql {
  const projects: Array<{
    id: string;
    user_id: string;
    name: string;
    default_model_id: string | null;
    created_at: string;
  }> = [];
  const prompts: Array<{
    id: string;
    user_id: string;
    project_id: string | null;
    title: string;
    body: string;
    created_at: string;
  }> = [];
  const threads: Array<{
    id: string;
    user_id: string;
    project_id: string | null;
  }> = [{ id: "thr_1", user_id: "u1", project_id: null }];

  const run = async <T>(text: string, params: unknown[]): Promise<T[]> => {
    const q = text.replace(/\s+/g, " ").trim().toLowerCase();

    if (q.startsWith("insert into projects")) {
      const row = {
        id: String(params[0]),
        user_id: String(params[1]),
        name: String(params[2]),
        default_model_id: null,
        created_at: new Date().toISOString(),
      };
      projects.push(row);
      return [row] as T[];
    }

    if (q.includes("from projects") && q.includes("where user_id") && q.startsWith("select id, user_id")) {
      const userId = String(params[0]);
      return projects.filter((p) => p.user_id === userId) as T[];
    }

    if (q.includes("from projects") && q.includes("select id from projects")) {
      const id = String(params[0]);
      const userId = String(params[1]);
      return projects.filter((p) => p.id === id && p.user_id === userId).map((p) => ({ id: p.id })) as T[];
    }

    if (q.startsWith("insert into prompt_library")) {
      const row = {
        id: String(params[0]),
        user_id: String(params[1]),
        project_id: (params[2] as string | null) ?? null,
        title: String(params[3]),
        body: String(params[4]),
        created_at: new Date().toISOString(),
      };
      const idx = prompts.findIndex((p) => p.id === row.id);
      if (idx >= 0) prompts[idx] = row;
      else prompts.push(row);
      return [row] as T[];
    }

    if (q.includes("from prompt_library") && q.includes("project_id is not distinct")) {
      const userId = String(params[0]);
      const projectId = (params[1] as string | null) ?? null;
      return prompts.filter(
        (p) => p.user_id === userId && p.project_id === projectId,
      ) as T[];
    }

    if (q.includes("from prompt_library") && q.includes("where user_id")) {
      const userId = String(params[0]);
      return prompts.filter((p) => p.user_id === userId) as T[];
    }

    if (q.startsWith("update threads")) {
      const projectId = (params[0] as string | null) ?? null;
      const threadId = String(params[1]);
      const userId = String(params[2]);
      const thr = threads.find((t) => t.id === threadId && t.user_id === userId);
      if (!thr) return [] as T[];
      thr.project_id = projectId;
      return [{ id: thr.id }] as T[];
    }

    if (q.includes("select project_id from threads")) {
      const threadId = String(params[0]);
      const userId = String(params[1]);
      const thr = threads.find((t) => t.id === threadId && t.user_id === userId);
      if (!thr) return [] as T[];
      return [{ project_id: thr.project_id }] as T[];
    }

    throw new Error(`fake sql: unhandled query: ${q.slice(0, 120)}`);
  };

  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0] ?? "";
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1] ?? ""}`;
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(text, params);
  return sql;
}

describe("workspace migration", () => {
  it("adds projects, project_files, prompt_library, and threads.project_id", () => {
    const sql = readFileSync(join(root, "migrations/0009_workspace_projects.sql"), "utf8");
    assert.match(sql, /create table if not exists projects/);
    assert.match(sql, /create table if not exists project_files/);
    assert.match(sql, /create table if not exists prompt_library/);
    assert.match(sql, /alter table threads add column if not exists project_id/);
  });
});

describe("createWorkspaceStore", () => {
  it("creates projects, prompts, and attaches threads (null stays valid)", async () => {
    const fake = createFakeSql();
    const store = createWorkspaceStore(async () => fake);

    assert.equal(await store.getThreadProjectId("u1", "thr_1"), null);

    const proj = await store.createProject("u1", "Research");
    assert.equal(proj.name, "Research");
    assert.equal((await store.listProjects("u1")).length, 1);

    await store.attachThread("u1", "thr_1", proj.id);
    assert.equal(await store.getThreadProjectId("u1", "thr_1"), proj.id);

    await store.attachThread("u1", "thr_1", null);
    assert.equal(await store.getThreadProjectId("u1", "thr_1"), null);

    const prompt = await store.upsertPrompt({
      userId: "u1",
      projectId: proj.id,
      title: "Daily brief",
      body: "Summarize overnight changes.",
    });
    assert.equal(prompt.title, "Daily brief");
    assert.equal((await store.listPrompts("u1", proj.id)).length, 1);
  });

  it("rejects attach to another user's project", async () => {
    const fake = createFakeSql();
    const store = createWorkspaceStore(async () => fake);
    const proj = await store.createProject("u1", "Mine");
    await assert.rejects(
      () => store.attachThread("u2", "thr_1", proj.id),
      /project_not_found/,
    );
  });
});

describe("stub workspace attach", () => {
  it("round-trips attachThread on the in-memory stub", async () => {
    const ws = createDefaultPorts().workspace;
    const proj = await ws.createProject("u1", "Demo");
    await ws.attachThread("u1", "t9", proj.id);
    assert.equal(await ws.getThreadProjectId("u1", "t9"), proj.id);
    await ws.attachThread("u1", "t9", null);
    assert.equal(await ws.getThreadProjectId("u1", "t9"), null);
  });
});
