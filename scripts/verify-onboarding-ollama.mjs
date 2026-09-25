#!/usr/bin/env node
/**
 * Local E2E: onboarding → desk Ollama → clock tool chat.
 * Writes screenshots under the Project store media/ and repo screenshots/.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.APOSTLE_URL || "http://localhost:8080";
const STORE =
  process.env.APOSTLE_STORE ||
  "/Users/justuseapen/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-4786174e-05cc-40b7-8c8e-0c709bf98e95/files";
const MEDIA = join(STORE, "media");
const REPO_SHOTS = join(process.cwd(), "screenshots");
mkdirSync(MEDIA, { recursive: true });
mkdirSync(REPO_SHOTS, { recursive: true });

const email = `ollama.${Date.now()}@example.com`;
const password = "test-pass-12345";
const name = "Ollama Tester";

async function shot(page, file) {
  await page.screenshot({ path: join(MEDIA, file), fullPage: false });
  await page.screenshot({ path: join(REPO_SHOTS, file), fullPage: false });
  console.log("shot", file);
}

async function fillDeskOllama(page) {
  const labels = page.locator("label");
  const n = await labels.count();
  for (let i = 0; i < n; i++) {
    const label = labels.nth(i);
    const text = (await label.innerText()).toLowerCase().trim();
    const input = label.locator("input");
    if (!(await input.count())) continue;
    if (text.includes("base url")) {
      await input.fill("http://localhost:11434/v1");
      continue;
    }
    if (text === "cheap" || text === "default" || text === "strong" || text === "vision") {
      await input.fill("qwen3:0.6b");
    }
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(90000);

  await page.goto(`${BASE}/login`);
  await page.evaluate(() => localStorage.removeItem("apostle.onboarding.seen"));

  await page.getByRole("button", { name: /Need an account/i }).click();
  await page.getByPlaceholder("Name").fill(name);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /Create account/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 30000 });
  await page.waitForTimeout(1000);

  // Force first-run guide
  await page.evaluate(() => localStorage.removeItem("apostle.onboarding.seen"));
  await page.reload();
  await page.waitForTimeout(600);
  if (!(await page.getByRole("dialog").isVisible().catch(() => false))) {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("apostle:onboarding-open")));
  }
  await page.getByRole("dialog").waitFor({ state: "visible" });
  await shot(page, "onboarding-first-run.png");

  // Light mode variant
  const mode = page.locator("header").getByRole("button").first();
  if (await mode.count()) {
    await mode.click().catch(() => {});
    await page.waitForTimeout(250);
    await shot(page, "onboarding-light.png");
  }

  await page.getByRole("button", { name: /Got it/i }).click();
  await page.waitForTimeout(200);

  await page.goto(`${BASE}/admin`);
  await page.waitForTimeout(1000);
  await fillDeskOllama(page);
  await page.getByRole("button", { name: /Save desk/i }).click();
  await page.waitForTimeout(1500);
  const deskText = await page.locator("body").innerText();
  console.log("desk gateway:", /GATEWAY · \w+/.exec(deskText)?.[0], /localhost:11434/.test(deskText));
  await shot(page, "onboarding-desk-ollama.png");

  await page.goto(`${BASE}/`);
  await page.waitForTimeout(800);
  const gotIt = page.getByRole("button", { name: /Got it/i });
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click();

  await page.getByPlaceholder(/ask anything/i).fill(
    "What time is it in America/New_York? Use the get_time tool.",
  );
  await page.getByRole("button", { name: /^Send$/i }).click();

  // Wait until Working… clears and we have tool output or a dated reply
  await page.waitForFunction(() => {
    const t = document.body.innerText;
    if (/\bWorking…\b/.test(t)) return false;
    return /get_time/.test(t) || /\b(AM|PM|EDT|EST|Eastern)\b/i.test(t);
  }, { timeout: 120000 });

  await page.waitForTimeout(500);
  const chatText = await page.locator("body").innerText();
  console.log("--- chat excerpt ---");
  console.log(chatText.slice(-1500));
  const toolOk = /get_time/.test(chatText);
  const timeOk = /\b(AM|PM|EDT|EST|Eastern)\b/i.test(chatText);
  const err = /Gateway \d+|No model gateway/i.test(chatText);
  console.log(JSON.stringify({ toolOk, timeOk, err, email }));

  await shot(page, "ollama-tool-chat.png");
  await browser.close();

  if (err || (!toolOk && !timeOk)) {
    console.error("FAIL: tool chat did not succeed");
    process.exit(1);
  }
  console.log("PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
