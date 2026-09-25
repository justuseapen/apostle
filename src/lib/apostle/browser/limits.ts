/**
 * Browser plugin capabilities — shown in tool info + Desk / Context UX.
 * Honest about Playwright ceiling; not a desktop computer-use agent.
 */
export const BROWSER_LIMITS = `Apostle Browser (allowlisted)

What works now:
• Server-side Playwright Chromium against Desk allowlisted https hosts
• Actions: open/navigate, snapshot/screenshot, click, type, close, trail, info
• Screenshot trail in chat tool cards + Context → Browser drawer
• Desk: enable toggle + allowlist editor (one host or *.suffix per line)

What does NOT work:
• Arbitrary web (default deny — only allowlisted hosts)
• Logins / cookies / authenticated sessions across restarts
• Desktop computer-use, Electron, or a local CLI browser companion
• Streaming AG-UI browser events
• Firecracker / contained Chromium residency proof (enterprise Spike)

Ceiling: headless Chromium on the Apostle server process. Sessions are
in-memory per thread and die on server restart. Not a user-desktop browser.
Screenshots are stored per operator/thread (capped). At your own risk of
any allowlisted URL you open.`;

export const BROWSER_BLURB =
  "Allowlisted Playwright browse + screenshot trail. Not a desktop agent.";

/** Marker pair embedded in tool results so ToolCard can render previews. */
export const SCREENSHOT_MARK_START = "===screenshot===";
export const SCREENSHOT_MARK_END = "===/screenshot===";

export const DEFAULT_BROWSER_ALLOWLIST = [
  "example.com",
  "*.example.com",
  "en.wikipedia.org",
  "www.wikipedia.org",
  "*.wikipedia.org",
  "github.com",
  "*.github.com",
  "developer.mozilla.org",
  "httpbin.org",
  "*.httpbin.org",
] as const;
