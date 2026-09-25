import type { Sql } from "../../db.ts";

export type ScreenshotRow = {
  id: string;
  url: string;
  title: string;
  action: string;
  mime: string;
  data_base64: string;
  created_at: string;
};

const MAX_TRAIL = 24;
/** Cap stored PNG ~1.2MB base64 to keep PGLite happy. */
const MAX_B64 = 1_600_000;

export async function saveScreenshot(
  sql: Sql,
  input: {
    userId: string;
    threadId: string;
    url: string;
    title: string;
    action: string;
    mime?: string;
    dataBase64: string;
  },
): Promise<ScreenshotRow> {
  const id = crypto.randomUUID();
  const mime = input.mime || "image/png";
  const data = input.dataBase64.slice(0, MAX_B64);
  await sql`
    insert into browser_screenshots (id, user_id, thread_id, url, title, action, mime, data_base64)
    values (
      ${id},
      ${input.userId},
      ${input.threadId},
      ${input.url.slice(0, 2000)},
      ${input.title.slice(0, 240)},
      ${input.action.slice(0, 40)},
      ${mime},
      ${data}
    )
  `;
  // Cap trail length per thread.
  const extras = await sql<{ id: string }>`
    select id from browser_screenshots
    where user_id = ${input.userId} and thread_id = ${input.threadId}
    order by created_at desc
    offset ${MAX_TRAIL}
  `;
  for (const row of extras) {
    await sql`delete from browser_screenshots where id = ${row.id}`;
  }
  const rows = await sql<ScreenshotRow>`
    select id, url, title, action, mime, data_base64, created_at::text as created_at
    from browser_screenshots where id = ${id}
  `;
  return rows[0]!;
}

export async function listScreenshots(
  sql: Sql,
  userId: string,
  threadId: string,
  limit = 20,
): Promise<Omit<ScreenshotRow, "data_base64">[]> {
  return sql`
    select id, url, title, action, mime, created_at::text as created_at
    from browser_screenshots
    where user_id = ${userId} and thread_id = ${threadId}
    order by created_at desc
    limit ${Math.min(limit, MAX_TRAIL)}
  `;
}

export async function getScreenshot(
  sql: Sql,
  userId: string,
  id: string,
): Promise<ScreenshotRow | null> {
  const rows = await sql<ScreenshotRow>`
    select id, url, title, action, mime, data_base64, created_at::text as created_at
    from browser_screenshots
    where id = ${id} and user_id = ${userId}
    limit 1
  `;
  return rows[0] ?? null;
}

export function dataUrl(mime: string, b64: string) {
  return `data:${mime};base64,${b64}`;
}
