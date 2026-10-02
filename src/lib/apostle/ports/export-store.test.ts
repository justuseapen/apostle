/**
 * Export schema v1 store (payload shape).
 * Run: node --experimental-strip-types --test src/lib/apostle/ports/export-store.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Sql } from "../../db.ts";
import { createExportStore } from "./export-store.ts";
import { stubExport } from "./stubs.ts";

function emptySql(): Sql {
  const run = async <T>(text: string): Promise<T[]> => {
    const q = text.replace(/\s+/g, " ").trim().toLowerCase();
    if (
      q.includes("from projects") ||
      q.includes("from threads") ||
      q.includes("from messages") ||
      q.includes("from memory_items") ||
      q.includes("from prompt_library") ||
      q.includes("from skills") ||
      q.includes("from project_files")
    ) {
      return [] as T[];
    }
    throw new Error(`unexpected sql: ${q}`);
  };
  return ((strings: TemplateStringsArray, ..._values: unknown[]) =>
    run(strings.join("?"))) as unknown as Sql;
}

describe("export store", () => {
  it("stub returns schema v1 empty collections", async () => {
    const arch = await stubExport().buildArchive("u1");
    assert.equal(arch.schemaVersion, "1");
    assert.deepEqual(arch.payload.skills, []);
    assert.deepEqual(arch.payload.projects, []);
  });

  it("SQL export returns v1 payload keys", async () => {
    const store = createExportStore(async () => emptySql());
    const arch = await store.buildArchive("u1");
    assert.equal(arch.schemaVersion, "1");
    assert.equal(arch.userId, "u1");
    for (const key of [
      "projects",
      "threads",
      "messages",
      "memory",
      "prompts",
      "skills",
      "files",
    ]) {
      assert.ok(key in arch.payload, `missing ${key}`);
    }
  });
});
