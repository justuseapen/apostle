#!/usr/bin/env node
/**
 * Toolkit hardening screenshots → store media/toolkit-*.png (Phosphor only).
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
  const file = `toolkit-${name}.png`;
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
  await page.goto(`${BASE}/login`);
  await page.evaluate(() => {
    localStorage.removeItem("apostle.onboarding.seen");
    localStorage.setItem("apostle-theme", "phosphor");
  });
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /Sign in|Log in|Continue/i }).first().click();
  await page.waitForTimeout(1500);
  if (page.url().includes("login")) {
    const need = page.getByRole("button", { name: /Need an account/i });
    if (await need.isVisible().catch(() => false)) {
      await need.click();
      await page.getByPlaceholder("Name").fill("Toolkit");
      await page.getByPlaceholder("Email").fill(email);
      await page.getByPlaceholder("Password").fill(password);
      await page.getByRole("button", { name: /Create account/i }).click();
      await page.waitForTimeout(2000);
    }
  }
  await page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 45000 });
  await dismissOnboarding(page);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await signIn(page);

  // Chat with thread search chrome
  await page.goto(`${BASE}/?theme=phosphor`);
  await dismissOnboarding(page);
  await page.waitForTimeout(800);
  await shot(page, "chat-threads");

  // Desk overview / status chrome
  await page.goto(`${BASE}/admin`);
  await page.waitForTimeout(1000);
  await shot(page, "desk-overview");

  // Plugins section (Hash visible)
  await page.getByRole("button", { name: /^Plugins$/i }).click();
  await page.waitForTimeout(500);
  await shot(page, "desk-plugins");

  // Browser section
  await page.getByRole("button", { name: /^Browser$/i }).click();
  await page.waitForTimeout(500);
  await shot(page, "desk-browser");

  // Theme section — Ink listed (SI private)
  await page.getByRole("button", { name: /^Theme$/i }).click();
  await page.waitForTimeout(500);
  await shot(page, "desk-theme");

  // Ink theme smoke (public) — still write as toolkit-ink for author path
  await page.goto(`${BASE}/?theme=ink`);
  await dismissOnboarding(page);
  await page.waitForTimeout(800);
  await shot(page, "ink-chat");

  // Back to Phosphor for any further promo
  await page.goto(`${BASE}/?theme=phosphor`);
  await page.waitForTimeout(400);

  await browser.close();
  console.log("done →", MEDIA);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
