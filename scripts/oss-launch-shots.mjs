#!/usr/bin/env node
/**
 * Fresh Phosphor-only screenshots for OSS launch (README + store media).
 * Never opens ?theme=si.
 */
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.APOSTLE_URL || "http://localhost:8080";
const STORE =
  process.env.APOSTLE_STORE ||
  "/Users/justuseapen/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-4786174e-05cc-40b7-8c8e-0c709bf98e95/files";
const MEDIA = join(STORE, "media");
const REPO = join(process.cwd(), "screenshots");
mkdirSync(MEDIA, { recursive: true });
mkdirSync(REPO, { recursive: true });

const email = process.env.APOSTLE_EMAIL || "test@apostle.local";
const password = process.env.APOSTLE_PASSWORD || "password123";

async function shot(page, name) {
  const file = `oss-launch-${name}.png`;
  const opts = { fullPage: false, timeout: 15_000, animations: "disabled" };
  await page.screenshot({ path: join(MEDIA, file), ...opts });
  await page.screenshot({ path: join(REPO, file), ...opts });
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
    localStorage.removeItem("apostle.theme");
  });
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /Sign in|Log in|Continue/i }).first().click();
  await page.waitForTimeout(1500);
  if (page.url().includes("login")) {
    const need = page.getByRole("button", { name: /Need an account/i });
    if (await need.isVisible().catch(() => false)) {
      await need.click();
      await page.getByPlaceholder("Name").fill("OSS Launch");
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

  // Landing (signed out) — force Phosphor
  await page.goto(`${BASE}/?theme=phosphor`);
  await page.evaluate(() => localStorage.setItem("apostle.theme", "phosphor"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "landing");

  await signIn(page);
  await page.goto(`${BASE}/?theme=phosphor`);
  await dismissOnboarding(page);
  await page.waitForTimeout(600);
  await shot(page, "chat");

  // Seed a computer write via UI slash if composer exists
  const composer = page.locator("textarea, [contenteditable='true']").first();
  if (await composer.isVisible().catch(() => false)) {
    await composer.click();
    await composer.fill(
      "Call the computer tool with action write, path /oss-launch.txt, content hello from oss launch — then list.",
    );
    await page.keyboard.press("Enter");
    await page.waitForTimeout(4000);
  }
  await shot(page, "computer");

  await page.goto(`${BASE}/admin?theme=phosphor`);
  await page.waitForTimeout(800);
  await shot(page, "desk");

  // Scroll plugins into view
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((n) =>
      /PLUGINS/i.test(n.textContent || ""),
    );
    el?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(400);
  await shot(page, "plugins");

  // Missing section
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((n) =>
      /MISSING/i.test(n.textContent || ""),
    );
    el?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(400);
  await shot(page, "missing");

  // Browser: soft path — desk allowlist + chat slash
  await page.goto(`${BASE}/?theme=phosphor`);
  await dismissOnboarding(page);
  if (await composer.isVisible().catch(() => false)) {
    await composer.click();
    await composer.fill(
      "Call the browser tool with action open, url https://example.com",
    );
    await page.keyboard.press("Enter");
    await page.waitForTimeout(6000);
  }
  await shot(page, "browser");

  writeFileSync(
    join(MEDIA, "oss-launch-verdict.json"),
    JSON.stringify(
      {
        theme: "phosphor",
        si: false,
        files: [
          "oss-launch-landing.png",
          "oss-launch-chat.png",
          "oss-launch-desk.png",
          "oss-launch-plugins.png",
          "oss-launch-missing.png",
          "oss-launch-computer.png",
          "oss-launch-browser.png",
        ],
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  // Mirror browser-computer phosphor shots as fallbacks if empty computer shot
  for (const legacy of [
    "browser-computer-phosphor.png",
    "browser-use-desk.png",
    "browser-use-chat.png",
  ]) {
    try {
      copyFileSync(join(REPO, legacy), join(MEDIA, `legacy-${legacy}`));
    } catch {
      /* optional */
    }
  }

  await browser.close();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
