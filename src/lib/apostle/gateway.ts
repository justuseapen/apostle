/**
 * OpenAI-compatible gateway resolution — desk key wins, then env, then none.
 */
export const DEFAULT_GATEWAY_BASE = "https://api.x.ai/v1";

export function normalizeBaseUrl(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_GATEWAY_BASE;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:" && u.protocol !== "http:") return DEFAULT_GATEWAY_BASE;
    return `${u.origin}${u.pathname}`.replace(/\/+$/, "");
  } catch {
    return DEFAULT_GATEWAY_BASE;
  }
}

export function maskKey(key: string): string {
  const t = key.trim();
  if (t.length < 8) return t ? "••••" : "";
  return `••••${t.slice(-4)}`;
}

export type GatewayResolved = {
  baseUrl: string;
  apiKey: string;
  source: "desk" | "env" | "none";
};

export function resolveGateway(input: {
  gateway_base_url?: string | null;
  gateway_api_key?: string | null;
  envKey?: string | null;
}): GatewayResolved {
  const baseUrl = normalizeBaseUrl(input.gateway_base_url);
  const deskKey = (input.gateway_api_key ?? "").trim();
  if (deskKey) return { baseUrl, apiKey: deskKey, source: "desk" };
  const envKey = (input.envKey ?? "").trim();
  if (envKey) return { baseUrl, apiKey: envKey, source: "env" };
  return { baseUrl, apiKey: "", source: "none" };
}
