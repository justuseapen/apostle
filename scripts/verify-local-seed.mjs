#!/usr/bin/env node
/**
 * Verify seeded local user can sign in and desk shows Ollama URL + model map.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.APOSTLE_URL || "http://localhost:8080";
const STORE =
  process.env.APOSTLE_STORE ||
  "/Users/justuseapen/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-4786174e-05cc-40b7-8c8e-0c709bf98e95/files";
const MEDIA = join(STORE, "media");
mkdirSync(MEDIA, { recursive: true });
mkdirSync(join(process.cwd(), "screenshots"), { recursive: true });

const email = "test@apostle.local";
const password = "password123";

function parseSetCookie(header) {
  if (!header) return null;
  const first = header.split(";")[0];
  const eq = first.indexOf("=");
  if (eq < 0) return null;
  return { name: first.slice(0, eq), value: first.slice(eq + 1) };
}

async function main() {
  const seedRes = await fetch(`${BASE}/api/dev/seed`, { method: "POST" });
  const seed = await seedRes.json();
  if (!seedRes.ok || !seed.ok) {
    console.error("seed failed", seed);
    process.exit(1);
  }
  console.log("seeded", seed.email, seed.gatewayBaseUrl);

  const signRes = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE,
    },
    body: JSON.stringify({ email, password }),
  });
  const signBody = await signRes.json();
  if (!signRes.ok || !signBody.user) {
    console.error("API sign-in failed", signRes.status, signBody);
    process.exit(1);
  }
  console.log("api sign-in ok", signBody.user.email);

  const rawCookies = signRes.headers.getSetCookie?.() ?? [];
  if (!rawCookies.length) {
    const single = signRes.headers.get("set-cookie");
    if (single) rawCookies.push(single);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  const cookies = [];
  for (const raw of rawCookies) {
    const parsed = parseSetCookie(raw);
    if (!parsed) continue;
    cookies.push({
      name: parsed.name,
      value: decodeURIComponent(parsed.value),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    });
  }
  if (signBody.token) {
    cookies.push({
      name: "__Host-grok-auth.session_token",
      value: signBody.token.includes(".") ? signBody.token : `${signBody.token}.`,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    });
  }
  // Prefer Set-Cookie from response when present
  if (cookies.length) await context.addCookies(cookies);

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  // Also exercise the login form (UI path)
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await Promise.all([
    page.waitForURL((u) => u.pathname === "/" || u.pathname === "/admin", {
      timeout: 45000,
      waitUntil: "domcontentloaded",
    }).catch(() => null),
    page.locator('button[type="submit"]').click(),
  ]);
  await page.waitForTimeout(1500);
  if (page.url().includes("/login")) {
    // Fall back: cookies from API sign-in
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(1000);
  }
  console.log("signed in →", page.url());

  const gotIt = page.getByRole("button", { name: /Got it/i });
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click();

  await page.goto(`${BASE}/admin`);
  await page.waitForTimeout(1500);
  const body = await page.locator("body").innerText();
  const hasUrl = /localhost:11434/.test(body);
  const hasModel = /qwen3:0\.6b/.test(body);
  const gateway = /GATEWAY · \w+/.exec(body)?.[0] ?? "missing";
  console.log(JSON.stringify({ hasUrl, hasModel, gateway, path: new URL(page.url()).pathname }));

  await page.screenshot({ path: join(MEDIA, "local-seed-desk.png"), fullPage: false });
  await page.screenshot({
    path: join(process.cwd(), "screenshots", "local-seed-desk.png"),
    fullPage: false,
  });

  await browser.close();

  if (!hasUrl || !hasModel) {
    console.error("FAIL: desk missing Ollama URL or model map");
    process.exit(1);
  }
  if (!/GATEWAY · DESK/.test(gateway)) {
    console.error("FAIL: expected GATEWAY · DESK for Ollama", gateway);
    process.exit(1);
  }
  console.log("PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
