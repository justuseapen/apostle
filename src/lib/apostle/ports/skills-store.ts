import type { Sql } from "../../db.ts";
import type { Skill, SkillsRegistry } from "./types.ts";

type SkillRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  description: string;
  instructions: string;
};

function mapRow(row: SkillRow): Skill {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    name: row.name,
    description: row.description,
    instructions: row.instructions,
  };
}

export function createSkillsStore(getSql: () => Promise<Sql>): SkillsRegistry {
  return {
    async list(userId, projectId) {
      const sql = await getSql();
      if (projectId === undefined) {
        const rows = await sql<SkillRow>`
          select id, user_id, project_id, name, description, instructions
          from skills
          where user_id = ${userId}
          order by updated_at desc
        `;
        return rows.map(mapRow);
      }
      if (projectId === null) {
        const rows = await sql<SkillRow>`
          select id, user_id, project_id, name, description, instructions
          from skills
          where user_id = ${userId} and project_id is null
          order by updated_at desc
        `;
        return rows.map(mapRow);
      }
      const rows = await sql<SkillRow>`
        select id, user_id, project_id, name, description, instructions
        from skills
        where user_id = ${userId}
          and (project_id is null or project_id = ${projectId})
        order by updated_at desc
      `;
      return rows.map(mapRow);
    },

    async upsert(skill) {
      const sql = await getSql();
      const id = skill.id ?? crypto.randomUUID();
      const name = skill.name.trim().slice(0, 120) || "Untitled skill";
      const description = skill.description.trim().slice(0, 400);
      const instructions = skill.instructions.trim();
      if (instructions.length < 1) throw new Error("skill_instructions_empty");
      if (skill.projectId) {
        const owned = await sql`
          select id from projects where id = ${skill.projectId} and user_id = ${skill.userId}
        `;
        if (!owned[0]) throw new Error("project_not_found");
      }
      const rows = await sql<SkillRow>`
        insert into skills (id, user_id, project_id, name, description, instructions, created_at, updated_at)
        values (
          ${id}, ${skill.userId}, ${skill.projectId}, ${name}, ${description}, ${instructions}, now(), now()
        )
        on conflict (id) do update set
          project_id = excluded.project_id,
          name = excluded.name,
          description = excluded.description,
          instructions = excluded.instructions,
          updated_at = now()
        returning id, user_id, project_id, name, description, instructions
      `;
      const row = rows[0];
      if (!row) throw new Error("skill_upsert_failed");
      return mapRow(row);
    },

    async remove(userId, id) {
      const sql = await getSql();
      await sql`
        delete from skills where id = ${id} and user_id = ${userId}
      `;
    },
  };
}
