/**
 * Idempotent local-dev defaults: test user + Ollama gateway/model map.
 *
 * Runs on PGLite bootstrap (no DATABASE_URL) unless APOSTLE_SEED_LOCAL=0.
 * Force on Neon with APOSTLE_SEED_LOCAL=1. Never seeds production blindly.
 */
import { hashPassword } from "better-auth/crypto";
import type { Sql } from "../db";

export const LOCAL_SEED_EMAIL = "test@apostle.local";
export const LOCAL_SEED_PASSWORD = "password123";
export const LOCAL_SEED_NAME = "Local Dev";
/** Stable id when inserting fresh; existing email wins on re-seed. */
export const LOCAL_SEED_USER_ID = "local-dev-seed-user";
export const LOCAL_SEED_ACCOUNT_ID = "local-dev-seed-account";

/** Same as `OLLAMA_GATEWAY_BASE` in gateway.ts — keep in sync. */
export const LOCAL_SEED_GATEWAY_BASE = "http://localhost:11434/v1";

/** Documented local tool-capable model — keep in sync with onboarding/desk copy. */
export const LOCAL_SEED_MODEL = "qwen3:0.6b";

export const LOCAL_SEED_MODEL_MAP = {
  cheap: LOCAL_SEED_MODEL,
  default: LOCAL_SEED_MODEL,
  strong: LOCAL_SEED_MODEL,
  vision: LOCAL_SEED_MODEL,
} as const;

export const LOCAL_SEED_PLUGINS = [
  "get_time",
  "fetch_page",
  "calc",
  "create_missing",
  "computer",
] as const;

export type LocalSeedResult = {
  ok: true;
  userId: string;
  email: string;
  password: string;
  gatewayBaseUrl: string;
  modelMap: typeof LOCAL_SEED_MODEL_MAP;
  createdUser: boolean;
  updatedSettings: boolean;
};

/** True when local Ollama/dev seed should run. */
export function shouldSeedLocal(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const flag = (env.APOSTLE_SEED_LOCAL ?? "").trim();
  if (flag === "0" || flag.toLowerCase() === "false") return false;
  if (flag === "1" || flag.toLowerCase() === "true") return true;
  // Default: only the in-process PGLite path (no Neon URL).
  return !(env.DATABASE_URL && env.DATABASE_URL.trim());
}

/**
 * Upsert the local test user + desk gateway/model map.
 * Safe to call repeatedly — password and Ollama settings are reset to defaults.
 */
export async function seedLocalDevDefaults(sql: Sql): Promise<LocalSeedResult> {
  const email = LOCAL_SEED_EMAIL;
  const name = LOCAL_SEED_NAME;
  const passwordHash = await hashPassword(LOCAL_SEED_PASSWORD);

  const existing = await sql.query<{ id: string }>(
    `select "id" from "user" where "email" = $1 limit 1`,
    [email],
  );
  const userId = existing[0]?.id ?? LOCAL_SEED_USER_ID;
  const createdUser = !existing[0];

  if (createdUser) {
    await sql.query(
      `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
       values ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [userId, name, email],
    );
  } else {
    await sql.query(
      `update "user" set "name" = $1, "emailVerified" = true, "updatedAt" = CURRENT_TIMESTAMP
       where "id" = $2`,
      [name, userId],
    );
  }

  const accounts = await sql.query<{ id: string }>(
    `select "id" from "account"
     where "userId" = $1 and "providerId" = 'credential' limit 1`,
    [userId],
  );
  if (accounts[0]) {
    await sql.query(
      `update "account" set "password" = $1, "updatedAt" = CURRENT_TIMESTAMP where "id" = $2`,
      [passwordHash, accounts[0].id],
    );
  } else {
    await sql.query(
      `insert into "account" (
         "id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt"
       ) values ($1, $2, 'credential', $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [LOCAL_SEED_ACCOUNT_ID, userId, userId, passwordHash],
    );
  }

  const modelMapJson = JSON.stringify(LOCAL_SEED_MODEL_MAP);
  const pluginsJson = JSON.stringify([...LOCAL_SEED_PLUGINS]);

  await sql.query(
    `insert into settings (
       user_id, system_prompt, plugins, model_map, enforce_quota,
       gateway_base_url, gateway_api_key
     ) values ($1, '', $2, $3, false, $4, '')
     on conflict (user_id) do update set
       plugins = excluded.plugins,
       model_map = excluded.model_map,
       enforce_quota = excluded.enforce_quota,
       gateway_base_url = excluded.gateway_base_url,
       gateway_api_key = excluded.gateway_api_key`,
    [userId, pluginsJson, modelMapJson, LOCAL_SEED_GATEWAY_BASE],
  );

  return {
    ok: true,
    userId,
    email,
    password: LOCAL_SEED_PASSWORD,
    gatewayBaseUrl: LOCAL_SEED_GATEWAY_BASE,
    modelMap: LOCAL_SEED_MODEL_MAP,
    createdUser,
    updatedSettings: true,
  };
}
