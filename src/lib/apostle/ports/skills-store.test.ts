/**
 * Skills registry SQL store.
 * Run: node --experimental-strip-types --test src/lib/apostle/ports/skills-store.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Sql } from "../../db.ts";
import { createSkillsStore } from "./skills-store.ts";

function createFakeSql(): Sql {
  const projects = [{ id: "proj_1", user_id: "u1" }];
  const skills: Array<{
    id: string;
    user_id: string;
    project_id: string | null;
    name: string;
    description: string;
    instructions: string;
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

    if (q.startsWith("insert into skills")) {
      const row = {
        id: String(params[0]),
        user_id: String(params[1]),
        project_id: (params[2] as string | null) ?? null,
        name: String(params[3]),
        description: String(params[4]),
        instructions: String(params[5]),
        updated_at: new Date().toISOString(),
      };
      const idx = skills.findIndex((s) => s.id === row.id);
      if (idx >= 0) skills[idx] = row;
      else skills.push(row);
      return [row] as T[];
    }

    if (q.includes("delete from skills")) {
      const id = String(params[0]);
      const userId = String(params[1]);
      for (let i = skills.length - 1; i >= 0; i--) {
        if (skills[i]!.id === id && skills[i]!.user_id === userId) skills.splice(i, 1);
      }
      return [] as T[];
    }

    if (q.includes("from skills") && q.includes("project_id is null")) {
      const userId = String(params[0]);
      return skills.filter((s) => s.user_id === userId && s.project_id === null) as T[];
    }

    if (q.includes("from skills") && q.includes("or project_id")) {
      const userId = String(params[0]);
      const projectId = String(params[1]);
      return skills.filter(
        (s) =>
          s.user_id === userId && (s.project_id === null || s.project_id === projectId),
      ) as T[];
    }

    if (q.includes("from skills") && q.includes("where user_id")) {
      const userId = String(params[0]);
      return skills.filter((s) => s.user_id === userId) as T[];
    }

    throw new Error(`unexpected sql: ${q}`);
  };

  const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    return run(strings.join("?"), values);
  }) as unknown as Sql;
  return sql;
}

describe("skills store", () => {
  it("upserts and lists workspace skills", async () => {
    const sql = createFakeSql();
    const store = createSkillsStore(async () => sql);
    const skill = await store.upsert({
      userId: "u1",
      projectId: null,
      name: "Brief",
      description: "Keep it short",
      instructions: "Reply in under three sentences.",
    });
    assert.equal(skill.name, "Brief");
    const listed = await store.list("u1");
    assert.equal(listed.length, 1);
    await store.remove("u1", skill.id);
    assert.equal((await store.list("u1")).length, 0);
  });

  it("rejects empty instructions", async () => {
    const sql = createFakeSql();
    const store = createSkillsStore(async () => sql);
    await assert.rejects(
      () =>
        store.upsert({
          userId: "u1",
          projectId: null,
          name: "X",
          description: "",
          instructions: "   ",
        }),
      /skill_instructions_empty/,
    );
  });
});
