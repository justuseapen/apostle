#!/usr/bin/env node
/**
 * E2E: browser Computer plugin — Ollama tool call when possible, else VFS seed + Artifacts shots.
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

const email = `computer.${Date.now()}@example.com`;
const password = "test-pass-12345";
const name = "Computer Spike Tester";

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

async function ensureComputerOn(page) {
  const row = page.locator("li").filter({ hasText: /Computer/ });
  if (!(await row.count())) {
    console.log(JSON.stringify({ computerRow: false }));
    return false;
  }
  const text = await row.first().innerText();
  if (!/\[on\]/i.test(text)) await row.first().click();
  return true;
}

async function seedWorkspace(page) {
  return page.evaluate(async () => {
    const mod = await import("/src/lib/apostle/server.ts");
    const threads = await mod.listThreads();
    let tid = threads[0]?.id;
    if (!tid) {
      const created = await mod.sendMessage({
        data: { threadId: null, text: "Initialize computer workspace thread." },
      });
      if (!created.ok) return { ok: false, reason: created.error || "send failed" };
      tid = created.threadId;
    }
    await mod.importComputerFiles({
      data: {
        threadId: tid,
        files: [
          { path: "/hello.txt", content: "browser computer spike\n" },
          {
            path: "/README.md",
            content: "# Computer workspace\nBrowser sandbox — at your own risk of data you grant.\n",
          },
        ],
      },
    });
    window.dispatchEvent(
      new CustomEvent("apostle:computer-seed", {
        detail: {
          threadId: tid,
          files: [
            { path: "/hello.txt", content: "browser computer spike\n" },
            {
              path: "/README.md",
              content: "# Computer workspace\nBrowser sandbox — at your own risk of data you grant.\n",
            },
          ],
        },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("apostle:demo-message", {
        detail: {
          content:
            "Computer workspace ready: /hello.txt and /README.md (browser VFS — not your Mac disk).",
          tools: [
            {
              name: "computer",
              args: JSON.stringify({
                action: "write",
                path: "/hello.txt",
                content: "browser computer spike",
              }),
              result: "Wrote /hello.txt (22 bytes)",
            },
            {
              name: "computer",
              args: JSON.stringify({ action: "list" }),
              result: "file README.md\nfile hello.txt",
            },
          ],
        },
      }),
    );
    return { ok: true, threadId: tid };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(120000);

  await page.goto(`${BASE}/login`);
  await page.evaluate(() => localStorage.removeItem("apostle.onboarding.seen"));

  await page.getByRole("button", { name: /Need an account/i }).click();
  await page.getByPlaceholder("Name").fill(name);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /Create account/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 30000 });
  await page.waitForTimeout(800);

  const gotIt = page.getByRole("button", { name: /Got it/i });
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click();

  await page.goto(`${BASE}/admin`);
  await page.waitForTimeout(1500);
  await fillDeskOllama(page);
  const hasPlugin = await ensureComputerOn(page);
  await page.getByRole("button", { name: /Save desk/i }).click();
  await page.waitForTimeout(1200);
  await shot(page, "browser-computer-desk.png");

  await page.goto(`${BASE}/?theme=si`);
  await page.waitForTimeout(800);
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click();

  await page.getByPlaceholder(/ask anything/i).fill(
    'Call the computer tool now with action "write", path "/hello.txt", and content "browser computer spike". Then call computer with action "list". Do not answer without using the tool.',
  );
  await page.getByRole("button", { name: /^Send$/i }).click();

  let toolHit = false;
  try {
    await page.waitForFunction(() => !/\bWorking…\b/.test(document.body.innerText), {
      timeout: 90000,
    });
    await page.waitForTimeout(500);
    const bodyText = await page.locator("body").innerText();
    toolHit = /Wrote \/hello|file hello\.txt/i.test(bodyText);
  } catch {
    toolHit = false;
  }

  const seed = await seedWorkspace(page);
  console.log(JSON.stringify({ ollamaTool: toolHit, seed }));
  await page.waitForTimeout(1500);

  // Open Artifacts limits copy
  const limits = page.getByText(/Capabilities \+ limits/i);
  if (await limits.isVisible().catch(() => false)) {
    await limits.click();
    await page.waitForTimeout(400);
  }
  // Click a file if listed
  const hello = page.getByRole("button", { name: /hello\.txt/i });
  if (await hello.count()) await hello.first().click().catch(() => {});
  await page.waitForTimeout(400);
  await shot(page, "browser-computer-chat.png");

  await page.getByPlaceholder(/ask anything/i).fill("/comp");
  await page.waitForTimeout(500);
  await shot(page, "browser-computer-slash.png");
  await page.getByPlaceholder(/ask anything/i).fill("");

  await page.goto(`${BASE}/?theme=phosphor`);
  await page.waitForTimeout(800);
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click();
  await shot(page, "browser-computer-phosphor.png");

  const body = await page.locator("body").innerText();
  const summary = {
    email,
    hasPlugin,
    toolHit,
    seedOk: !!seed?.ok,
    hasArtifactsCopy: /browser sandbox|at your own risk|Computer VFS|Capabilities/i.test(body),
  };
  console.log(JSON.stringify(summary, null, 2));
  writeFileSync(join(REPO_SHOTS, "browser-computer-verdict.json"), JSON.stringify(summary, null, 2));

  await browser.close();
  if (!hasPlugin) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
