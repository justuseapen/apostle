import type { ApostlePlugin } from "./types";

/** Block obvious private / loopback targets (same spirit as fetch_page). */
function blockedHost(hostname: string) {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".local") ||
    h === "0.0.0.0" ||
    h.startsWith("127.") ||
    h.startsWith("10.") ||
    h.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(h)
  );
}

function metaContent(html: string, attr: "name" | "property", key: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${key}["']`,
    "i",
  );
  const m = html.match(re);
  return (m?.[1] || m?.[2] || "").trim() || undefined;
}

function pageTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m?.[1]?.replace(/\s+/g, " ").trim() || undefined;
}

/**
 * Fetch a public https URL and return title / Open Graph preview fields.
 * Network: public https only. No logins.
 */
export const linkUnfurlPlugin: ApostlePlugin = {
  id: "link_unfurl",
  name: "Link unfurl",
  blurb: "Preview a public https link (title, description, site).",
  needs: { network: ["https"], secrets: [], approval: false },
  tool: {
    type: "function",
    function: {
      name: "link_unfurl",
      description:
        "Fetch a public https URL and return link preview fields (title, og:title, description, site_name, canonical url). No logins, no localhost. Prefer for “what is this link” or unfurl cards — use fetch_page when the user wants page body text.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "https URL to unfurl." },
        },
        required: ["url"],
      },
    },
  },
  async run(args) {
    let url: URL;
    try {
      url = new URL(args.url || "");
    } catch {
      return "That is not a URL.";
    }
    if (url.protocol !== "https:" || blockedHost(url.hostname)) {
      return "Only public https pages are allowed.";
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": "Apostle/0.1", Accept: "text/html,application/xhtml+xml" },
        redirect: "follow",
      });
      const html = (await res.text()).slice(0, 200_000);
      const title =
        metaContent(html, "property", "og:title") ||
        metaContent(html, "name", "twitter:title") ||
        pageTitle(html) ||
        "(no title)";
      const description =
        metaContent(html, "property", "og:description") ||
        metaContent(html, "name", "description") ||
        metaContent(html, "name", "twitter:description") ||
        "(no description)";
      const site =
        metaContent(html, "property", "og:site_name") || url.hostname;
      const image = metaContent(html, "property", "og:image");
      const finalUrl = res.url || url.toString();
      const lines = [
        `HTTP ${res.status}`,
        `url: ${finalUrl}`,
        `site: ${site}`,
        `title: ${title}`,
        `description: ${description.slice(0, 500)}`,
      ];
      if (image) lines.push(`image: ${image}`);
      return lines.join("\n");
    } catch {
      return "Could not unfurl that link.";
    } finally {
      clearTimeout(timer);
    }
  },
};
