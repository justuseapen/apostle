import type { Sql } from "../../db.ts";
import type { AgentRuntimePort, Mission, MissionStatus } from "./types.ts";

type MissionRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  thread_id: string | null;
  title: string;
  brief: string;
  status: MissionStatus;
  created_at: string | Date;
};

function asIso(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString();
}

function mapRow(row: MissionRow): Mission {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    threadId: row.thread_id,
    title: row.title,
    status: row.status,
    createdAt: asIso(row.created_at),
  };
}

/**
 * Local in-process AgentRuntime — enqueues then completes without an external harness.
 * Optional TrueForge HTTP client: set TRUEFORGE_BASE_URL (+ optional TRUEFORGE_API_KEY).
 */
export function createLocalAgentRuntime(getSql: () => Promise<Sql>): AgentRuntimePort {
  const trueforgeBase = (process.env.TRUEFORGE_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const trueforgeKey = (process.env.TRUEFORGE_API_KEY ?? "").trim();

  return {
    async enqueueMission(input) {
      if (trueforgeBase) {
        try {
          const res = await fetch(`${trueforgeBase}/v1/missions`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(trueforgeKey ? { authorization: `Bearer ${trueforgeKey}` } : {}),
            },
            body: JSON.stringify({
              title: input.title,
              brief: input.brief,
              projectId: input.projectId,
              threadId: input.threadId,
              userId: input.userId,
            }),
          });
          if (res.ok) {
            const body = (await res.json()) as { id?: string; status?: MissionStatus };
            if (body.id) {
              const sql = await getSql();
              const id = body.id;
              const status = body.status ?? "queued";
              const rows = await sql<MissionRow>`
                insert into missions (id, user_id, project_id, thread_id, title, brief, status, created_at, updated_at)
                values (
                  ${id}, ${input.userId}, ${input.projectId}, ${input.threadId},
                  ${input.title.slice(0, 160)}, ${input.brief.slice(0, 8000)}, ${status}, now(), now()
                )
                on conflict (id) do update set
                  title = excluded.title,
                  brief = excluded.brief,
                  status = excluded.status,
                  updated_at = now()
                returning id, user_id, project_id, thread_id, title, brief, status, created_at
              `;
              if (rows[0]) return mapRow(rows[0]);
            }
          }
          // Fall through to local if TrueForge is unreachable — gateway stays owned.
        } catch {
          // local path below
        }
      }

      const sql = await getSql();
      const id = crypto.randomUUID();
      const title = input.title.trim().slice(0, 160) || "Untitled mission";
      const brief = input.brief.trim().slice(0, 8000);
      // Local stub: enqueue then mark completed in-process (no external harness required).
      const rows = await sql<MissionRow>`
        insert into missions (id, user_id, project_id, thread_id, title, brief, status, created_at, updated_at)
        values (
          ${id}, ${input.userId}, ${input.projectId}, ${input.threadId},
          ${title}, ${brief}, 'completed', now(), now()
        )
        returning id, user_id, project_id, thread_id, title, brief, status, created_at
      `;
      const row = rows[0];
      if (!row) throw new Error("mission_enqueue_failed");
      return mapRow(row);
    },

    async getMission(userId, id) {
      const sql = await getSql();
      const rows = await sql<MissionRow>`
        select id, user_id, project_id, thread_id, title, brief, status, created_at
        from missions
        where id = ${id} and user_id = ${userId}
      `;
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async completeMission(userId, id, status = "completed") {
      const sql = await getSql();
      const next: MissionStatus = status === "failed" ? "failed" : "completed";
      const rows = await sql<MissionRow>`
        update missions
        set status = ${next}, updated_at = now()
        where id = ${id} and user_id = ${userId}
        returning id, user_id, project_id, thread_id, title, brief, status, created_at
      `;
      return rows[0] ? mapRow(rows[0]) : null;
    },
  };
}
