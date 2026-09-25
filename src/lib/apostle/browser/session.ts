/**
 * In-memory Playwright sessions keyed by userId:threadId.
 * Dies on server restart — documented ceiling for this OSS spike.
 */
import type { Browser, Page } from "playwright";

type Session = {
  browser: Browser;
  page: Page;
  url: string;
  title: string;
};

const sessions = new Map<string, Session>();

function key(userId: string, threadId: string) {
  return `${userId}:${threadId || "default"}`;
}

export async function getOrCreatePage(
  userId: string,
  threadId: string,
): Promise<Page> {
  const k = key(userId, threadId);
  const existing = sessions.get(k);
  if (existing) return existing.page;

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    userAgent: "ApostleBrowser/0.1 (allowlisted; +https://github.com/justuseapen/apostle)",
  });
  sessions.set(k, { browser, page, url: "about:blank", title: "" });
  return page;
}

export async function rememberNav(
  userId: string,
  threadId: string,
  url: string,
  title: string,
) {
  const s = sessions.get(key(userId, threadId));
  if (s) {
    s.url = url;
    s.title = title;
  }
}

export function sessionInfo(userId: string, threadId: string) {
  const s = sessions.get(key(userId, threadId));
  if (!s) return { open: false as const };
  return { open: true as const, url: s.url, title: s.title };
}

export async function closeSession(userId: string, threadId: string) {
  const k = key(userId, threadId);
  const s = sessions.get(k);
  if (!s) return false;
  sessions.delete(k);
  try {
    await s.browser.close();
  } catch {
    /* ignore */
  }
  return true;
}

/** Take a PNG screenshot; returns base64 without data: prefix. */
export async function snapshotPng(page: Page): Promise<Buffer> {
  return page.screenshot({ type: "png", fullPage: false });
}
