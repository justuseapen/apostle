/**
 * OpenAI-compatible gateway resolution — desk key wins, then env, then none.
 * Loopback bases (Ollama) need no real key; we synthesize a placeholder Bearer.
 */
export const DEFAULT_GATEWAY_BASE = "https://api.x.ai/v1";
export const OPENROUTER_GATEWAY_BASE = "https://openrouter.ai/api/v1";
export const OPENAI_GATEWAY_BASE = "https://api.openai.com/v1";
export const OLLAMA_GATEWAY_BASE = "http://localhost:11434/v1";
/** Dummy Bearer for local OpenAI-compatible servers that ignore auth. */
export const LOCAL_GATEWAY_KEY = "ollama";

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

/** True for localhost / loopback OpenAI-compatible servers (Ollama, LM Studio, etc.). */
export function isLocalGateway(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  } catch {
    return false;
  }
}

export function maskKey(key: string): string {
  const t = key.trim();
  if (!t) return "";
  if (t === LOCAL_GATEWAY_KEY) return "local";
  if (t.length < 8) return "••••";
  return `••••${t.slice(-4)}`;
}

export type GatewayResolved = {
  baseUrl: string;
  apiKey: string;
  source: "desk" | "env" | "none";
};

/** Env keys checked in order when the desk key is empty. */
export function envGatewayKey(env: NodeJS.ProcessEnv = process.env): {
  apiKey: string;
  preferredBase: string | null;
} {
  const xai = (env.XAI_API_KEY ?? "").trim();
  if (xai) return { apiKey: xai, preferredBase: DEFAULT_GATEWAY_BASE };
  const openrouter = (env.OPENROUTER_API_KEY ?? "").trim();
  if (openrouter) return { apiKey: openrouter, preferredBase: OPENROUTER_GATEWAY_BASE };
  const openai = (env.OPENAI_API_KEY ?? "").trim();
  if (openai) return { apiKey: openai, preferredBase: OPENAI_GATEWAY_BASE };
  return { apiKey: "", preferredBase: null };
}

export function resolveGateway(input: {
  gateway_base_url?: string | null;
  gateway_api_key?: string | null;
  envKey?: string | null;
  /** When env is used and desk base is still the xAI default, prefer this host. */
  envPreferredBase?: string | null;
}): GatewayResolved {
  let baseUrl = normalizeBaseUrl(input.gateway_base_url);
  const deskKey = (input.gateway_api_key ?? "").trim();
  if (deskKey) return { baseUrl, apiKey: deskKey, source: "desk" };
  // Local Ollama (etc.): desk base alone is enough — no cloud key.
  if (isLocalGateway(baseUrl)) {
    return { baseUrl, apiKey: LOCAL_GATEWAY_KEY, source: "desk" };
  }
  const envKey = (input.envKey ?? "").trim();
  if (envKey) {
    // Desk left the default xAI URL but the env key is OpenRouter/OpenAI — use that host.
    if (
      input.envPreferredBase &&
      baseUrl === DEFAULT_GATEWAY_BASE &&
      input.envPreferredBase !== DEFAULT_GATEWAY_BASE
    ) {
      baseUrl = normalizeBaseUrl(input.envPreferredBase);
    }
    return { baseUrl, apiKey: envKey, source: "env" };
  }
  return { baseUrl, apiKey: "", source: "none" };
}

export const GATEWAY_MISSING_ERROR =
  "No model gateway. On DESK set a cloud key, or point Base URL at local Ollama (http://localhost:11434/v1) and map models — or set XAI_API_KEY / OPENROUTER_API_KEY / OPENAI_API_KEY.";
