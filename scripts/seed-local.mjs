#!/usr/bin/env node
/**
 * Idempotent local-dev seed against a running Apostle (default http://localhost:8080).
 *
 * Creates/updates test@apostle.local + Ollama gateway/model map via POST /api/dev/seed.
 * Requires the app to allow local seed (PGLite / no DATABASE_URL, or APOSTLE_SEED_LOCAL=1).
 *
 * Usage:
 *   npm run seed
 *   APOSTLE_URL=http://127.0.0.1:8080 npm run seed
 */
const BASE = (process.env.APOSTLE_URL || "http://localhost:8080").replace(/\/+$/, "");

async function main() {
  const infoRes = await fetch(`${BASE}/api/dev/seed`);
  const info = await infoRes.json().catch(() => ({}));
  if (!infoRes.ok) {
    console.error("[seed] GET /api/dev/seed failed:", infoRes.status, info);
    process.exit(1);
  }
  if (!info.allowed) {
    console.error(
      "[seed] Server refused local seed (DATABASE_URL set?). Set APOSTLE_SEED_LOCAL=1 or use PGLite.",
    );
    console.error(info);
    process.exit(1);
  }

  const res = await fetch(`${BASE}/api/dev/seed`, { method: "POST" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) {
    console.error("[seed] POST failed:", res.status, body);
    process.exit(1);
  }

  console.log("[seed] ok");
  console.log(`  email:    ${body.email}`);
  console.log(`  password: ${body.password}`);
  console.log(`  gateway:  ${body.gatewayBaseUrl}`);
  console.log(`  models:   ${JSON.stringify(body.modelMap)}`);
  console.log(`  userId:   ${body.userId} (${body.createdUser ? "created" : "updated"})`);
  console.log(`  sign-in:  ${BASE}/login`);
}

main().catch((err) => {
  console.error("[seed] failed:", err?.message || err);
  console.error("Is Apostle running? npm run dev  # http://localhost:8080");
  process.exit(1);
});
