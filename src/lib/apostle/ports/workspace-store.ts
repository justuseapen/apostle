import type { Sql } from "../../db.ts";
import type { Project, PromptLibraryItem, WorkspaceStore } from "./types.ts";

type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  default_model_id: string | null;
  created_at: string | Date;
};

type PromptRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  body: string;
};

function asIso(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString();
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    defaultModelId: row.default_model_id,
    createdAt: asIso(row.created_at),
  };
}

function mapPrompt(row: PromptRow): PromptLibraryItem {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    title: row.title,
    body: row.body,
  };
}

/**
 * Postgres / PGLite-backed workspace store.
 * Pass `getSql` so tests can inject a fake and production can use `@/lib/db`.
 */
export function createWorkspaceStore(getSql: () => Promise<Sql>): WorkspaceStore {
  return {
    async listProjects(userId) {
      const sql = await getSql();
      const rows = await sql<ProjectRow>`
        select id, user_id, name, default_model_id, created_at
        from projects
        where user_id = ${userId}
        order by created_at desc
      `;
      return rows.map(mapProject);
    },

    async createProject(userId, name) {
      const sql = await getSql();
      const id = crypto.randomUUID();
      const trimmed = name.trim().slice(0, 120) || "Untitled project";
      const rows = await sql<ProjectRow>`
        insert into projects (id, user_id, name, default_model_id, created_at)
        values (${id}, ${userId}, ${trimmed}, null, now())
        returning id, user_id, name, default_model_id, created_at
      `;
      const row = rows[0];
      if (!row) throw new Error("project_insert_failed");
      return mapProject(row);
    },

    async listPrompts(userId, projectId) {
      const sql = await getSql();
      if (projectId === undefined) {
        const rows = await sql<PromptRow>`
          select id, user_id, project_id, title, body
          from prompt_library
          where user_id = ${userId}
          order by created_at desc
        `;
        return rows.map(mapPrompt);
      }
      const rows = await sql<PromptRow>`
        select id, user_id, project_id, title, body
        from prompt_library
        where user_id = ${userId} and project_id is not distinct from ${projectId}
        order by created_at desc
      `;
      return rows.map(mapPrompt);
    },

    async upsertPrompt(item) {
      const sql = await getSql();
      const id = item.id ?? crypto.randomUUID();
      const title = item.title.trim().slice(0, 160) || "Untitled prompt";
      const body = item.body;
      if (item.projectId) {
        const owned = await sql`
          select id from projects where id = ${item.projectId} and user_id = ${item.userId}
        `;
        if (!owned[0]) throw new Error("project_not_found");
      }
      const rows = await sql<PromptRow>`
        insert into prompt_library (id, user_id, project_id, title, body, created_at)
        values (${id}, ${item.userId}, ${item.projectId}, ${title}, ${body}, now())
        on conflict (id) do update set
          project_id = excluded.project_id,
          title = excluded.title,
          body = excluded.body
        returning id, user_id, project_id, title, body
      `;
      const row = rows[0];
      if (!row) throw new Error("prompt_upsert_failed");
      return mapPrompt(row);
    },

    async attachThread(userId, threadId, projectId) {
      const sql = await getSql();
      if (projectId) {
        const owned = await sql`
          select id from projects where id = ${projectId} and user_id = ${userId}
        `;
        if (!owned[0]) throw new Error("project_not_found");
      }
      const updated = await sql`
        update threads
        set project_id = ${projectId}
        where id = ${threadId} and user_id = ${userId}
        returning id
      `;
      if (!updated[0]) throw new Error("thread_not_found");
    },

    async getThreadProjectId(userId, threadId) {
      const sql = await getSql();
      const rows = await sql<{ project_id: string | null }>`
        select project_id from threads
        where id = ${threadId} and user_id = ${userId}
      `;
      if (!rows[0]) return null;
      return rows[0].project_id ?? null;
    },
  };
}
