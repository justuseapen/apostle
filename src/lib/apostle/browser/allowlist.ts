import { DEFAULT_BROWSER_ALLOWLIST } from "./limits.ts";

/** Parse desk allowlist JSON (array of host patterns). */
export function parseAllowlist(raw: string | null | undefined): string[] {
  if (!raw || !raw.trim()) return [...DEFAULT_BROWSER_ALLOWLIST];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_BROWSER_ALLOWLIST];
    const hosts = parsed
      .map((h) => String(h || "").trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 80);
    return hosts.length ? hosts : [...DEFAULT_BROWSER_ALLOWLIST];
  } catch {
    return [...DEFAULT_BROWSER_ALLOWLIST];
  }
}

/** Normalize desk textarea (one host per line) → JSON array string. */
export function allowlistFromLines(text: string): string {
  const hosts = text
    .split(/[\n,]+/)
    .map((h) => h.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter(Boolean)
    .slice(0, 80);
  return JSON.stringify(hosts.length ? hosts : [...DEFAULT_BROWSER_ALLOWLIST]);
}

export function allowlistToLines(raw: string | null | undefined): string {
  return parseAllowlist(raw).join("\n");
}

/**
 * Host match: exact, or `*.example.com` suffix (also matches bare example.com).
 * Blocks localhost / private IPs even if somehow listed.
 */
export function hostAllowed(hostname: string, allowlist: string[]): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (isBlockedHost(h)) return false;
  for (const pattern of allowlist) {
    const p = pattern.toLowerCase().trim();
    if (!p) continue;
    if (p.startsWith("*.")) {
      const suffix = p.slice(2);
      if (h === suffix || h.endsWith(`.${suffix}`)) return true;
    } else if (h === p) {
      return true;
    }
  }
  return false;
}

export function isBlockedHost(hostname: string) {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".local") ||
    h === "0.0.0.0" ||
    h.startsWith("127.") ||
    h.startsWith("10.") ||
    h.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(h) ||
    h === "[::1]" ||
    h === "::1"
  );
}

export function assertAllowlistedUrl(
  urlStr: string,
  allowlist: string[],
): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return { ok: false, error: "That is not a URL." };
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "Only https URLs are allowed." };
  }
  if (!hostAllowed(url.hostname, allowlist)) {
    return {
      ok: false,
      error: `Host "${url.hostname}" is not on the Desk allowlist. Edit Desk → Browser allowlist, then retry.`,
    };
  }
  return { ok: true, url };
}
