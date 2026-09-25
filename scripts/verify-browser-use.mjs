#!/usr/bin/env node
/**
 * E2E: allowlisted Browser plugin — real Playwright open + screenshot trail UI.
 */
import { mkdirSync, writeFileSync } from "node:fs";
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

const email = process.env.APOSTLE_EMAIL || "test@apostle.local";
const password = process.env.APOSTLE_PASSWORD || "password123";

async function shot(page, file) {
  await page.screenshot({
    path: join(MEDIA, file),
    fullPage: false,
    timeout: 15_000,
    animations: "disabled",
  });
  await page.screenshot({
    path: join(REPO_SHOTS, file),
    fullPage: false,
    timeout: 15_000,
    animations: "disabled",
  });
  console.log("shot", file);
}

async function ensureBrowserOn(page) {
  const rows = page.locator("li");
  const n = await rows.count();
  for (let i = 0; i < n; i++) {
    const text = await rows.nth(i).innerText();
    if (text.includes("Allowlisted Playwright") || /^Browser\b/.test(text.trim())) {
      if (!/\[on\]/i.test(text)) await rows.nth(i).click();
      return true;
    }
  }
  return false;
}

async function ensureComputerListed(page) {
  const rows = page.locator("li");
  const n = await rows.count();
  for (let i = 0; i < n; i++) {
    const text = await rows.nth(i).innerText();
    if (/^Computer\b/m.test(text) || text.includes("Browser workspace")) return true;
  }
  return false;
}

async function signIn(page) {
  await page.goto(`${BASE}/login`);
  await page.evaluate(() => localStorage.removeItem("apostle.onboarding.seen"));
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  const submit = page.getByRole("button", { name: /Sign in|Log in|Continue/i }).first();
  await submit.click();
  await page.waitForTimeout(1500);
  if (page.url().includes("login")) {
    const need = page.getByRole("button", { name: /Need an account/i });
    if (await need.isVisible().catch(() => false)) {
      await need.click();
      await page.getByPlaceholder("Name").fill("Browser Use Tester");
      await page.getByPlaceholder("Email").fill(`browser.${Date.now()}@example.com`);
      await page.getByPlaceholder("Password").fill(password);
      await page.getByRole("button", { name: /Create account/i }).click();
      await page.waitForTimeout(2000);
    }
  }
  await page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 45000 });
  const gotIt = page.getByRole("button", { name: /Got it/i });
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(120000);

  await signIn(page);

  await page.goto(`${BASE}/admin`);
  await page.waitForTimeout(1500);
  const hasPlugin = await ensureBrowserOn(page);
  const computerListed = await ensureComputerListed(page);
  await page.getByRole("button", { name: /Save desk/i }).click();
  await page.waitForTimeout(1200);
  await shot(page, "browser-use-desk.png");

  const allow = page.getByText(/BROWSER ALLOWLIST/i);
  if (await allow.count()) {
    await allow.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await shot(page, "browser-use-allowlist.png");
  }

  await page.goto(`${BASE}/?theme=si`);
  await page.waitForTimeout(1000);
  await shot(page, "browser-use-si.png");

  await page.goto(`${BASE}/?theme=phosphor`);
  await page.waitForTimeout(1000);

  const composer = page.locator('input[placeholder*="ask anything"], textarea').last();
  if (await composer.count()) {
    await composer.fill("/browse");
    await page.waitForTimeout(500);
    await shot(page, "browser-use-slash.png");
    await composer.fill("");
  }

  // Real allowlisted Playwright open via authenticated server fn.
  const live = await page.evaluate(async () => {
    const mod = await import("/src/lib/apostle/server.ts");
    let tid = (await mod.listThreads())[0]?.id ?? null;
    if (!tid) {
      const created = await mod.createThread({ data: { title: "Browser use verify" } });
      tid = created.id;
    }
    const opened = await mod.runBrowserTool({
      data: {
        threadId: tid,
        args: { action: "open", url: "https://example.com/" },
      },
    });
    const trail = await mod.listBrowserTrail({
      data: { threadId: tid, includeData: true },
    });
    if (opened.ok) {
      window.dispatchEvent(
        new CustomEvent("apostle:demo-message", {
          detail: {
            threadId: tid,
            content:
              "Opened allowlisted https://example.com/ via Browser plugin (Playwright). Screenshot trail in the tool card and Context → Browser.",
            tools: [
              {
                name: "browser",
                args: JSON.stringify({ action: "open", url: "https://example.com/" }),
                result: opened.result,
              },
            ],
          },
        }),
      );
    }
    return {
      threadId: tid,
      opened,
      trailCount: trail.items.length,
      hasPreview: Boolean(trail.items[0]?.dataUrl),
    };
  });
  console.log("live", JSON.stringify({ ...live, opened: { ok: live.opened?.ok, error: live.opened?.error, resultHead: String(live.opened?.result || "").slice(0, 180) } }));

  await page.waitForTimeout(1000);
  await shot(page, "browser-use-chat.png");

  const browserTab = page.getByRole("button", { name: /^Browser$/i });
  if (await browserTab.count()) {
    await browserTab.first().click();
    await page.waitForTimeout(800);
    await shot(page, "browser-use-trail.png");
  }

  // Computer Artifacts still reachable
  const artifactsTab = page.getByRole("button", { name: /^Artifacts$/i });
  if (await artifactsTab.count()) {
    await artifactsTab.first().click();
    await page.waitForTimeout(400);
    await shot(page, "browser-use-computer-still.png");
  }

  const verdict = {
    ok: hasPlugin && live.opened?.ok === true && live.trailCount > 0,
    hasPlugin,
    computerListed,
    liveOk: live.opened?.ok === true,
    trailCount: live.trailCount,
    hasPreview: live.hasPreview,
    shots: [
      "browser-use-desk.png",
      "browser-use-allowlist.png",
      "browser-use-si.png",
      "browser-use-slash.png",
      "browser-use-chat.png",
      "browser-use-trail.png",
      "browser-use-computer-still.png",
    ],
  };
  writeFileSync(join(REPO_SHOTS, "browser-use-verdict.json"), JSON.stringify(verdict, null, 2));
  writeFileSync(join(MEDIA, "browser-use-verdict.json"), JSON.stringify(verdict, null, 2));
  console.log(JSON.stringify(verdict, null, 2));

  await browser.close();
  if (!verdict.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
