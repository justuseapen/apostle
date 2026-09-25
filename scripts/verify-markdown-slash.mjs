#!/usr/bin/env node
/**
 * Verify markdown rendering + slash skills menu on localhost.
 * Writes media/chat-markdown.png and media/slash-skills.png to the Project store.
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

const email = `mdslash.${Date.now()}@example.com`;
const password = "test-pass-12345";
const name = "MD Slash Tester";

async function shot(page, file) {
  await page.screenshot({ path: join(MEDIA, file), fullPage: false });
  await page.screenshot({ path: join(REPO_SHOTS, file), fullPage: false });
  console.log("shot", file);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(60000);

  await page.goto(`${BASE}/login`);
  await page.evaluate(() => localStorage.setItem("apostle.onboarding.seen", "1"));

  await page.getByRole("button", { name: /Need an account/i }).click();
  await page.getByPlaceholder("Name").fill(name);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /Create account/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 30000 });
  await page.waitForTimeout(800);

  // Dismiss onboarding if it still pops
  const gotIt = page.getByRole("button", { name: /Got it/i });
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click();

  // --- Slash menu ---
  const input = page.getByPlaceholder(/ask anything/i);
  await input.click();
  await input.fill("/");
  await page.waitForTimeout(200);
  const menu = page.getByRole("listbox", { name: /Slash skills/i });
  await menu.waitFor({ state: "visible" });
  const menuText = await menu.innerText();
  console.log("--- slash menu ---");
  console.log(menuText);
  const hasTime = /\/time/i.test(menuText);
  const hasFetch = /\/fetch/i.test(menuText);
  const hasCalc = /\/calc/i.test(menuText);
  const hasDesk = /\/desk/i.test(menuText);
  const hasHelp = /\/help/i.test(menuText);
  if (!(hasTime && hasFetch && hasCalc && hasDesk && hasHelp)) {
    throw new Error(`Slash menu missing skills: ${JSON.stringify({ hasTime, hasFetch, hasCalc, hasDesk, hasHelp })}`);
  }
  await shot(page, "slash-skills.png");

  // Filter
  await input.fill("/ti");
  await page.waitForTimeout(150);
  const filtered = await menu.innerText();
  if (!/\/time/i.test(filtered) || /\/calc/i.test(filtered)) {
    throw new Error(`Filter failed: ${filtered}`);
  }
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  const afterSelect = await input.inputValue();
  if (!/get_time/i.test(afterSelect)) {
    throw new Error(`Select did not insert prompt: ${afterSelect}`);
  }
  console.log("slash select ok:", afterSelect);

  // --- Markdown (demo message with tool trace preserved) ---
  await input.fill("");
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("apostle:demo-message", {
        detail: {
          content: [
            "**Get Time** is ready.",
            "",
            "Use it when you need a real clock:",
            "",
            "- Ask for a timezone",
            "- Or say “what time is it”",
            "",
            "Inline `get_time` and a [public link](https://example.com).",
            "",
            "```ts",
            'await get_time({ timezone: "America/New_York" })',
            "```",
          ].join("\n"),
          tools: [
            {
              name: "get_time",
              result: "Friday, September 25, 2026 at 12:00:00 PM EDT",
            },
          ],
        },
      }),
    );
  });
  await page.waitForTimeout(400);

  // Bold should be a <strong>, not raw **
  const strong = page.locator(".ph-md strong");
  await strong.first().waitFor({ state: "visible" });
  const strongText = await strong.first().innerText();
  if (strongText !== "Get Time") {
    throw new Error(`Expected bold Get Time, got: ${strongText}`);
  }
  const rawStars = await page.locator("body").innerText();
  // Tool trace still present
  if (!/get_time/.test(rawStars)) {
    throw new Error("Tool trace missing after markdown render");
  }
  // Raw **Get Time** should not appear as literal asterisks in the MD body
  const mdText = await page.locator(".ph-md").innerText();
  if (mdText.includes("**Get Time**")) {
    throw new Error("Raw markdown asterisks still visible");
  }
  await shot(page, "chat-markdown.png");

  console.log(JSON.stringify({ ok: true, email, hasTime, hasFetch, hasCalc, hasDesk, hasHelp }));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
