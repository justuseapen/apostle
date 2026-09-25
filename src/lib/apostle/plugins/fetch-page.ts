import type { ApostlePlugin } from "./types";

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

export const fetchPagePlugin: ApostlePlugin = {
  id: "fetch_page",
  name: "Page fetch",
  blurb: "Read a public https page as text.",
  needs: { network: ["https"], secrets: [], approval: false },
  tool: {
    type: "function",
    function: {
      name: "fetch_page",
      description: "Fetch a public https URL and return readable text. No logins, no localhost.",
      parameters: {
        type: "object",
        properties: { url: { type: "string" } },
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
        headers: { "User-Agent": "Apostle/0.1" },
        redirect: "follow",
      });
      const text = await res.text();
      const stripped = text
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 3500);
      return `HTTP ${res.status}\n${stripped || "(empty)"}`;
    } catch {
      return "Could not fetch that page.";
    } finally {
      clearTimeout(timer);
    }
  },
};
