/**
 * Local AgentRuntime (missions).
 * Run: node --experimental-strip-types --test src/lib/apostle/ports/agent-runtime.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Sql } from "../../db.ts";
import { createLocalAgentRuntime } from "./agent-runtime.ts";

function createFakeSql(): Sql {
  const missions: Array<{
    id: string;
    user_id: string;
    project_id: string | null;
    thread_id: string | null;
    title: string;
    brief: string;
    status: string;
    created_at: string;
  }> = [];

  const run = async <T>(text: string, params: unknown[]): Promise<T[]> => {
    const q = text.replace(/\s+/g, " ").trim().toLowerCase();

    if (q.startsWith("insert into missions")) {
      // status is a SQL literal ('completed' / from TrueForge path ${status})
      const statusMatch = q.match(/'?(queued|running|completed|failed)'?/);
      const row = {
        id: String(params[0]),
        user_id: String(params[1]),
        project_id: (params[2] as string | null) ?? null,
        thread_id: (params[3] as string | null) ?? null,
        title: String(params[4]),
        brief: String(params[5]),
        status:
          params.length >= 7
            ? String(params[6])
            : statusMatch?.[1] ?? "completed",
        created_at: new Date().toISOString(),
      };
      const idx = missions.findIndex((m) => m.id === row.id);
      if (idx >= 0) missions[idx] = row;
      else missions.push(row);
      return [row] as T[];
    }

    if (q.startsWith("update missions")) {
      const status = String(params[0]);
      const id = String(params[1]);
      const userId = String(params[2]);
      const row = missions.find((m) => m.id === id && m.user_id === userId);
      if (!row) return [] as T[];
      row.status = status;
      return [row] as T[];
    }

    if (q.includes("from missions") && q.includes("where id")) {
      const id = String(params[0]);
      const userId = String(params[1]);
      return missions.filter((m) => m.id === id && m.user_id === userId) as T[];
    }

    throw new Error(`unexpected sql: ${q}`);
  };

  return ((strings: TemplateStringsArray, ...values: unknown[]) =>
    run(strings.join("?"), values)) as unknown as Sql;
}

describe("local agent runtime", () => {
  it("enqueues and completes missions in-process", async () => {
    const prev = process.env.TRUEFORGE_BASE_URL;
    delete process.env.TRUEFORGE_BASE_URL;
    try {
      const sql = createFakeSql();
      const runtime = createLocalAgentRuntime(async () => sql);
      const mission = await runtime.enqueueMission({
        userId: "u1",
        projectId: null,
        threadId: null,
        title: "Draft notes",
        brief: "Write a short outline",
      });
      assert.equal(mission.status, "completed");
      const got = await runtime.getMission("u1", mission.id);
      assert.equal(got?.title, "Draft notes");
      const failed = await runtime.completeMission("u1", mission.id, "failed");
      assert.equal(failed?.status, "failed");
    } finally {
      if (prev === undefined) delete process.env.TRUEFORGE_BASE_URL;
      else process.env.TRUEFORGE_BASE_URL = prev;
    }
  });
});
