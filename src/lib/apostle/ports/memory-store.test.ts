/**
 * Portable memory store + context assembler.
 * Run: node --experimental-strip-types --test src/lib/apostle/ports/memory-store.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { Sql } from "../../db.ts";
import { createContextAssembler } from "./context-assembler.ts";
import { createMemoryStore } from "./memory-store.ts";
import { stubMemory } from "./stubs.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

function createFakeSql(): Sql {
  const projects = [{ id: "proj_1", user_id: "u1" }];
  const items: Array<{
    id: string;
    user_id: string;
    project_id: string | null;
    scope: "global" | "project";
    text: string;
    updated_at: string;
  }> = [];

  const run = async <T>(text: string, params: unknown[]): Promise<T[]> => {
    const q = text.replace(/\s+/g, " ").trim().toLowerCase();

    if (q.includes("select id from projects")) {
      const id = String(params[0]);
      const userId = String(params[1]);
      return projects
        .filter((p) => p.id === id && p.user_id === userId)
        .map((p) => ({ id: p.id })) as T[];
    }

    if (q.startsWith("insert into memory_items")) {
      const row = {
        id: String(params[0]),
        user_id: String(params[1]),
        project_id: (params[2] as string | null) ?? null,
        scope: String(params[3]) as "global" | "project",
        text: String(params[4]),
        updated_at: new Date().toISOString(),
      };
      const idx = items.findIndex((m) => m.id === row.id);
      if (idx >= 0) items[idx] = row;
      else items.push(row);
      return [row] as T[];
    }

    if (q.includes("delete from memory_items")) {
      const id = String(params[0]);
      const userId = String(params[1]);
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i]!.id === id && items[i]!.user_id === userId) items.splice(i, 1);
      }
      return [] as T[];
    }

    if (q.includes("from memory_items") && q.includes("scope = 'global'")) {
      const userId = String(params[0]);
      return items.filter((m) => m.user_id === userId && m.scope === "global") as T[];
    }

    if (q.includes("from memory_items") && q.includes("or project_id")) {
      const userId = String(params[0]);
      const projectId = String(params[1]);
      return items.filter(
        (m) =>
          m.user_id === userId && (m.scope === "global" || m.project_id === projectId),
      ) as T[];
    }

    if (q.includes("from memory_items") && q.includes("where user_id")) {
      const userId = String(params[0]);
      return items.filter((m) => m.user_id === userId) as T[];
    }

    throw new Error(`fake sql unhandled: ${q.slice(0, 100)}`);
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

describe("memory migration", () => {
  it("creates memory_items with scope check", () => {
    const sql = readFileSync(join(root, "migrations/0010_portable_memory.sql"), "utf8");
    assert.match(sql, /create table if not exists memory_items/);
    assert.match(sql, /scope in \('global', 'project'\)/);
  });
});

describe("createMemoryStore", () => {
  it("upserts global memory and lists it", async () => {
    const fake = createFakeSql();
    const store = createMemoryStore(async () => fake);
    const row = await store.upsert({
      userId: "u1",
      scope: "global",
      projectId: null,
      text: "Prefers short answers",
    });
    assert.equal(row.scope, "global");
    const list = await store.list("u1", null);
    assert.equal(list.length, 1);
    await store.remove("u1", row.id);
    assert.equal((await store.list("u1")).length, 0);
  });

  it("requires project for project-scoped memory", async () => {
    const fake = createFakeSql();
    const store = createMemoryStore(async () => fake);
    await assert.rejects(
      () =>
        store.upsert({
          userId: "u1",
          scope: "project",
          projectId: null,
          text: "x",
        }),
      /memory_project_required/,
    );
  });
});

describe("createContextAssembler", () => {
  it("injects memory into system preamble and records ids", async () => {
    const memory = stubMemory();
    await memory.upsert({
      userId: "u1",
      scope: "global",
      projectId: null,
      text: "Name is Ada",
    });
    const assembler = createContextAssembler({ memory });
    const assembled = await assembler.assemble({
      userId: "u1",
      projectId: null,
      threadMessages: [{ role: "user", content: "Hi" }],
      modelId: "default",
    });
    assert.match(assembled.system, /Name is Ada/);
    assert.equal(assembled.memoryIds.length, 1);
    assert.equal(assembled.messages.length, 1);
  });
});
