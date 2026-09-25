import type { ApostlePlugin } from "./types";
import {
  BROWSER_BLURB,
  BROWSER_LIMITS,
  SCREENSHOT_MARK_END,
  SCREENSHOT_MARK_START,
} from "../browser/limits.ts";

/**
 * Allowlisted Browser — Playwright against Desk allowlist + screenshot trail.
 * Tool name: browser · slash: /browse
 * Network: https only, further restricted by allowlist. Not a desktop agent.
 *
 * Session/trail/allowlist are dynamically imported so slash-skill unit tests
 * can load this module without resolving the DB / Playwright layer.
 */
export const browserPlugin: ApostlePlugin = {
  id: "browser",
  name: "Browser",
  blurb: BROWSER_BLURB,
  needs: { network: ["https"], secrets: [], approval: false },
  tool: {
    type: "function",
    function: {
      name: "browser",
      description:
        "Allowlisted browser: open/navigate an https URL on the Desk allowlist, take a screenshot/snapshot, optionally click or type a CSS selector, close the session, or list the screenshot trail. Prefer this when the user wants to browse a public page and see screenshots. Actions: open, navigate, snapshot, screenshot, click, type, close, trail, info, allowlist.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description:
              "One of: open, navigate, snapshot, screenshot, click, type, close, trail, info, allowlist",
          },
          url: {
            type: "string",
            description: "https URL for open/navigate (must match Desk allowlist).",
          },
          selector: {
            type: "string",
            description: "CSS selector for click/type.",
          },
          text: {
            type: "string",
            description: "Text to type for action=type.",
          },
        },
        required: ["action"],
      },
    },
  },
  async run(args, ctx) {
    if (!ctx?.userId) {
      return "Browser needs an operator session.";
    }
    const action = (args.action || "").trim().toLowerCase();
    if (action === "info" || action === "help" || action === "limits") {
      return BROWSER_LIMITS;
    }

    const { getSql } = await import("../../db.ts");
    const sql = await getSql();
    const { parseAllowlist, assertAllowlistedUrl, allowlistToLines } = await import(
      "../browser/allowlist.ts"
    );
    const {
      getOrCreatePage,
      rememberNav,
      sessionInfo,
      closeSession,
      snapshotPng,
    } = await import("../browser/session.ts");
    const { saveScreenshot, listScreenshots, dataUrl } = await import("../browser/trail.ts");

    const threadId = (ctx.threadId || "default").slice(0, 80);
    const settings = await sql<{ browser_allowlist: string }>`
      select browser_allowlist from settings where user_id = ${ctx.userId}
    `;
    const allowlist = parseAllowlist(settings[0]?.browser_allowlist);

    if (action === "allowlist" || action === "list_allowlist") {
      return `Desk allowlist (edit under Desk → Browser allowlist):\n${allowlistToLines(JSON.stringify(allowlist))}`;
    }

    if (action === "trail" || action === "history") {
      const rows = await listScreenshots(sql, ctx.userId, threadId, 12);
      if (!rows.length) return "Screenshot trail empty for this thread.";
      return rows
        .map(
          (r, i) =>
            `${i + 1}. ${r.action} · ${r.title || "(no title)"} · ${r.url}\n   id=${r.id} · ${r.created_at}`,
        )
        .join("\n");
    }

    if (action === "close") {
      const closed = await closeSession(ctx.userId, threadId);
      return closed ? "Browser session closed." : "No open browser session.";
    }

    if (action === "open" || action === "navigate" || action === "goto") {
      const check = assertAllowlistedUrl(args.url || "", allowlist);
      if (!check.ok) return check.error;
      const page = await getOrCreatePage(ctx.userId, threadId);
      try {
        await page.goto(check.url.toString(), {
          waitUntil: "domcontentloaded",
          timeout: 20_000,
        });
      } catch (e) {
        return `Navigation failed: ${e instanceof Error ? e.message : "error"}`;
      }
      const title = (await page.title().catch(() => "")) || "";
      const finalUrl = page.url();
      // Re-check final URL after redirects.
      const finalCheck = assertAllowlistedUrl(finalUrl, allowlist);
      if (!finalCheck.ok) {
        await closeSession(ctx.userId, threadId);
        return `Blocked after redirect: ${finalCheck.error}`;
      }
      await rememberNav(ctx.userId, threadId, finalUrl, title);
      const png = await snapshotPng(page);
      const b64 = png.toString("base64");
      const shot = await saveScreenshot(sql, {
        userId: ctx.userId,
        threadId,
        url: finalUrl,
        title,
        action: action === "open" ? "open" : "navigate",
        dataBase64: b64,
      });
      return formatShotResult({
        verb: action === "open" ? "Opened" : "Navigated",
        url: finalUrl,
        title,
        shotId: shot.id,
        preview: dataUrl(shot.mime, b64),
      });
    }

    if (action === "snapshot" || action === "screenshot") {
      const info = sessionInfo(ctx.userId, threadId);
      if (!info.open) {
        return "No open page. Call action=open with an allowlisted url first.";
      }
      const page = await getOrCreatePage(ctx.userId, threadId);
      const title = (await page.title().catch(() => info.title)) || "";
      const url = page.url() || info.url;
      const check = assertAllowlistedUrl(url, allowlist);
      if (!check.ok) return check.error;
      const png = await snapshotPng(page);
      const b64 = png.toString("base64");
      const shot = await saveScreenshot(sql, {
        userId: ctx.userId,
        threadId,
        url,
        title,
        action: "snapshot",
        dataBase64: b64,
      });
      return formatShotResult({
        verb: "Snapshot",
        url,
        title,
        shotId: shot.id,
        preview: dataUrl(shot.mime, b64),
      });
    }

    if (action === "click") {
      const selector = (args.selector || "").trim();
      if (!selector) return "click needs selector.";
      if (selector.length > 300) return "selector is too long.";
      const info = sessionInfo(ctx.userId, threadId);
      if (!info.open) return "No open page. open an allowlisted url first.";
      const page = await getOrCreatePage(ctx.userId, threadId);
      try {
        await page.waitForSelector(selector, { state: "visible", timeout: 8_000 });
        await page.click(selector, { timeout: 8_000 });
        await page.waitForLoadState("domcontentloaded", { timeout: 8_000 }).catch(() => null);
      } catch (e) {
        return `Click failed: ${e instanceof Error ? e.message : "error"}`;
      }
      const title = (await page.title().catch(() => "")) || "";
      const url = page.url();
      const check = assertAllowlistedUrl(url, allowlist);
      if (!check.ok) {
        await closeSession(ctx.userId, threadId);
        return `Blocked after click navigation: ${check.error}`;
      }
      await rememberNav(ctx.userId, threadId, url, title);
      const png = await snapshotPng(page);
      const b64 = png.toString("base64");
      const shot = await saveScreenshot(sql, {
        userId: ctx.userId,
        threadId,
        url,
        title,
        action: "click",
        dataBase64: b64,
      });
      return formatShotResult({
        verb: `Clicked ${selector}`,
        url,
        title,
        shotId: shot.id,
        preview: dataUrl(shot.mime, b64),
      });
    }

    if (action === "type") {
      const selector = (args.selector || "").trim();
      const text = args.text ?? "";
      if (!selector) return "type needs selector.";
      if (selector.length > 300) return "selector is too long.";
      if (text.length > 4000) return "text is too long (max 4000).";
      const info = sessionInfo(ctx.userId, threadId);
      if (!info.open) return "No open page. open an allowlisted url first.";
      const page = await getOrCreatePage(ctx.userId, threadId);
      try {
        await page.waitForSelector(selector, { state: "visible", timeout: 8_000 });
        await page.fill(selector, text, { timeout: 8_000 });
        // blur so controlled inputs commit; then snapshot
        await page.locator(selector).evaluate((el) => (el as HTMLElement).blur()).catch(() => null);
      } catch (e) {
        return `Type failed: ${e instanceof Error ? e.message : "error"}`;
      }
      const title = (await page.title().catch(() => "")) || "";
      const url = page.url();
      await rememberNav(ctx.userId, threadId, url, title);
      const png = await snapshotPng(page);
      const b64 = png.toString("base64");
      const shot = await saveScreenshot(sql, {
        userId: ctx.userId,
        threadId,
        url,
        title,
        action: "type",
        dataBase64: b64,
      });
      return formatShotResult({
        verb: `Typed into ${selector}`,
        url,
        title,
        shotId: shot.id,
        preview: dataUrl(shot.mime, b64),
      });
    }

    return `Unknown action "${action}". Use open, navigate, snapshot, click, type, close, trail, allowlist, or info.`;
  },
};

function formatShotResult(input: {
  verb: string;
  url: string;
  title: string;
  shotId: string;
  preview: string;
}) {
  // Keep preview in result for ToolCard; trail also persists in DB.
  const preview =
    input.preview.length > 180_000
      ? "(preview omitted — open Context → Browser for full trail)"
      : `${SCREENSHOT_MARK_START}\n${input.preview}\n${SCREENSHOT_MARK_END}`;
  return [
    `${input.verb}`,
    `url: ${input.url}`,
    `title: ${input.title || "(none)"}`,
    `screenshotId: ${input.shotId}`,
    preview,
  ].join("\n");
}
