import type { Sql } from "../../db.ts";
import type { MemoryItem, MemoryPort, MemoryScope } from "./types.ts";

type MemoryRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  scope: MemoryScope;
  text: string;
  updated_at: string | Date;
};

function asIso(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString();
}

function mapRow(row: MemoryRow): MemoryItem {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    scope: row.scope,
    text: row.text,
    updatedAt: asIso(row.updated_at),
  };
}

export function createMemoryStore(getSql: () => Promise<Sql>): MemoryPort {
  return {
    async list(userId, projectId) {
      const sql = await getSql();
      if (projectId === undefined) {
        const rows = await sql<MemoryRow>`
          select id, user_id, project_id, scope, text, updated_at
          from memory_items
          where user_id = ${userId}
          order by updated_at desc
        `;
        return rows.map(mapRow);
      }
      if (projectId === null) {
        const rows = await sql<MemoryRow>`
          select id, user_id, project_id, scope, text, updated_at
          from memory_items
          where user_id = ${userId} and scope = 'global'
          order by updated_at desc
        `;
        return rows.map(mapRow);
      }
      const rows = await sql<MemoryRow>`
        select id, user_id, project_id, scope, text, updated_at
        from memory_items
        where user_id = ${userId}
          and (scope = 'global' or project_id = ${projectId})
        order by updated_at desc
      `;
      return rows.map(mapRow);
    },

    async upsert(item) {
      const sql = await getSql();
      const id = item.id ?? crypto.randomUUID();
      const text = item.text.trim();
      if (text.length < 1) throw new Error("memory_empty");
      if (item.scope === "project") {
        if (!item.projectId) throw new Error("memory_project_required");
        const owned = await sql`
          select id from projects where id = ${item.projectId} and user_id = ${item.userId}
        `;
        if (!owned[0]) throw new Error("project_not_found");
      }
      const projectId = item.scope === "global" ? null : item.projectId;
      const rows = await sql<MemoryRow>`
        insert into memory_items (id, user_id, project_id, scope, text, updated_at, created_at)
        values (${id}, ${item.userId}, ${projectId}, ${item.scope}, ${text}, now(), now())
        on conflict (id) do update set
          project_id = excluded.project_id,
          scope = excluded.scope,
          text = excluded.text,
          updated_at = now()
        returning id, user_id, project_id, scope, text, updated_at
      `;
      const row = rows[0];
      if (!row) throw new Error("memory_upsert_failed");
      return mapRow(row);
    },

    async remove(userId, id) {
      const sql = await getSql();
      await sql`
        delete from memory_items where id = ${id} and user_id = ${userId}
      `;
    },
  };
}
