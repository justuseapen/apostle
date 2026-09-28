#!/usr/bin/env node
/**
 * Launch plugin screenshots → store media/plugins-launch-*.png
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

const email = process.env.APOSTLE_EMAIL || "test@apostle.local";
const password = process.env.APOSTLE_PASSWORD || "password123";

async function shot(page, name) {
  const file = `plugins-launch-${name}.png`;
  await page.screenshot({
    path: join(MEDIA, file),
    fullPage: false,
    timeout: 15_000,
    animations: "disabled",
  });
  console.log("shot", file);
}

async function dismissOnboarding(page) {
  const gotIt = page.getByRole("button", { name: /Got it/i });
  if (await gotIt.isVisible().catch(() => false)) {
    await gotIt.click();
    await page.waitForTimeout(400);
  }
}

async function signIn(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.removeItem("apostle.onboarding.seen");
    localStorage.setItem("apostle-theme", "phosphor");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.locator('input[type="email"]').click();
  await page.locator('input[type="email"]').fill("");
  await page.locator('input[type="email"]').pressSequentially(email, { delay: 15 });
  await page.locator('input[type="password"]').click();
  await page.locator('input[type="password"]').fill("");
  await page.locator('input[type="password"]').pressSequentially(password, { delay: 15 });
  await page.getByRole("button", { name: /Sign in/i }).click();
  await page.waitForTimeout(1500);
  if (page.url().includes("login")) {
    const need = page.getByRole("button", { name: /Need an account/i });
    if (await need.isVisible().catch(() => false)) {
      await need.click();
      await page.getByPlaceholder("Name").fill("Launch");
      await page.locator('input[type="email"]').pressSequentially(email, { delay: 15 });
      await page.locator('input[type="password"]').pressSequentially(password, { delay: 15 });
      await page.getByRole("button", { name: /Create account/i }).click();
      await page.waitForTimeout(2000);
    }
  }
  await page.waitForFunction(() => !location.pathname.includes("login"), null, {
    timeout: 45000,
  });
  await dismissOnboarding(page);
}

async function main() {
  // Soft-enable launch plugins for the running PGLite process.
  try {
    const seed = await fetch(`${BASE}/api/dev/seed`, { method: "POST" });
    console.log("seed", seed.status, await seed.text().then((t) => t.slice(0, 120)));
  } catch (e) {
    console.warn("seed skipped", e.message);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await signIn(page);

  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: /^Plugins$/i }).click();
  await page.waitForTimeout(800);
  await shot(page, "desk-plugins");

  // Scroll plugin list to show lower entries (weather / computer / browser).
  await page.evaluate(() => {
    const list = document.querySelector("ul.divide-y-2");
    if (list) list.scrollTop = list.scrollHeight;
  });
  await page.waitForTimeout(300);
  await shot(page, "desk-plugins-more");

  await page.goto(`${BASE}/?theme=phosphor`, { waitUntil: "networkidle" });
  await dismissOnboarding(page);
  await page.waitForTimeout(600);

  const composer = page.locator("textarea, [contenteditable='true']").first();
  await composer.click();
  await composer.fill("/");
  await page.waitForTimeout(700);
  await shot(page, "slash-menu");

  await composer.fill("/uuid");
  await page.waitForTimeout(500);
  await shot(page, "slash-uuid");

  await composer.fill("/weather");
  await page.waitForTimeout(500);
  await shot(page, "slash-weather");

  await browser.close();
  console.log("done →", MEDIA);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
