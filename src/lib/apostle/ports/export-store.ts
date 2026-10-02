import type { Sql } from "../../db.ts";
import type { ExportArchive, ExportPort } from "./types.ts";

/**
 * Build an open schema v1 archive for the signed-in user.
 * See docs/export-schema-v1.md.
 */
export function createExportStore(getSql: () => Promise<Sql>): ExportPort {
  return {
    async buildArchive(userId) {
      const sql = await getSql();

      const projects = await sql<{
        id: string;
        name: string;
        default_model_id: string | null;
        created_at: string | Date;
      }>`
        select id, name, default_model_id, created_at
        from projects
        where user_id = ${userId}
        order by created_at asc
      `;

      const threads = await sql<{
        id: string;
        title: string;
        project_id: string | null;
        preferred_model_id: string | null;
        created_at: string | Date;
      }>`
        select id, title, project_id, preferred_model_id, created_at
        from threads
        where user_id = ${userId}
        order by created_at asc
      `;

      const messages = await sql<{
        id: string;
        thread_id: string;
        role: string;
        content: string;
        meta: string | null;
        created_at: string | Date;
      }>`
        select id, thread_id, role, content, meta, created_at
        from messages
        where user_id = ${userId}
        order by created_at asc
      `;

      const memory = await sql<{
        id: string;
        project_id: string | null;
        scope: string;
        text: string;
        updated_at: string | Date;
      }>`
        select id, project_id, scope, text, updated_at
        from memory_items
        where user_id = ${userId}
        order by updated_at asc
      `;

      const prompts = await sql<{
        id: string;
        project_id: string | null;
        title: string;
        body: string;
        created_at: string | Date;
      }>`
        select id, project_id, title, body, created_at
        from prompt_library
        where user_id = ${userId}
        order by created_at asc
      `;

      const skills = await sql<{
        id: string;
        project_id: string | null;
        name: string;
        description: string;
        instructions: string;
      }>`
        select id, project_id, name, description, instructions
        from skills
        where user_id = ${userId}
        order by updated_at asc
      `;

      const files = await sql<{
        id: string;
        project_id: string;
        name: string;
        mime: string | null;
        size_bytes: number;
        storage_key: string;
        created_at: string | Date;
      }>`
        select id, project_id, name, mime, size_bytes, storage_key, created_at
        from project_files
        where user_id = ${userId}
        order by created_at asc
      `;

      const iso = (v: string | Date) => (typeof v === "string" ? v : v.toISOString());

      const archive: ExportArchive = {
        schemaVersion: "1",
        createdAt: new Date().toISOString(),
        userId,
        payload: {
          projects: projects.map((p) => ({
            id: p.id,
            name: p.name,
            defaultModelId: p.default_model_id,
            createdAt: iso(p.created_at),
          })),
          threads: threads.map((t) => ({
            id: t.id,
            title: t.title,
            projectId: t.project_id,
            preferredModelId: t.preferred_model_id,
            createdAt: iso(t.created_at),
          })),
          messages: messages.map((m) => ({
            id: m.id,
            threadId: m.thread_id,
            role: m.role,
            content: m.content,
            meta: m.meta,
            createdAt: iso(m.created_at),
          })),
          memory: memory.map((m) => ({
            id: m.id,
            projectId: m.project_id,
            scope: m.scope,
            text: m.text,
            updatedAt: iso(m.updated_at),
          })),
          prompts: prompts.map((p) => ({
            id: p.id,
            projectId: p.project_id,
            title: p.title,
            body: p.body,
            createdAt: iso(p.created_at),
          })),
          skills: skills.map((s) => ({
            id: s.id,
            projectId: s.project_id,
            name: s.name,
            description: s.description,
            instructions: s.instructions,
          })),
          files: files.map((f) => ({
            id: f.id,
            projectId: f.project_id,
            name: f.name,
            mime: f.mime,
            sizeBytes: f.size_bytes,
            storageKey: f.storage_key,
            createdAt: iso(f.created_at),
          })),
        },
      };
      return archive;
    },
  };
}
