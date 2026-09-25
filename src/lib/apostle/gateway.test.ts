import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_GATEWAY_BASE,
  LOCAL_GATEWAY_KEY,
  OLLAMA_GATEWAY_BASE,
  OPENROUTER_GATEWAY_BASE,
  envGatewayKey,
  isLocalGateway,
  maskKey,
  normalizeBaseUrl,
  resolveGateway,
} from "./gateway.ts";
import { calcPlugin } from "./plugins/calc.ts";

describe("gateway", () => {
  it("normalizes base URLs and rejects junk", () => {
    assert.equal(normalizeBaseUrl("https://openrouter.ai/api/v1/"), "https://openrouter.ai/api/v1");
    assert.equal(normalizeBaseUrl(""), "https://api.x.ai/v1");
    assert.equal(normalizeBaseUrl("not-a-url"), "https://api.x.ai/v1");
    assert.equal(normalizeBaseUrl("http://localhost:11434/v1/"), OLLAMA_GATEWAY_BASE);
  });

  it("prefers desk key over env", () => {
    const g = resolveGateway({
      gateway_base_url: "https://openrouter.ai/api/v1",
      gateway_api_key: "sk-desk-key-1234",
      envKey: "sk-env",
    });
    assert.equal(g.source, "desk");
    assert.equal(g.apiKey, "sk-desk-key-1234");
    assert.equal(g.baseUrl, "https://openrouter.ai/api/v1");
  });

  it("falls back to env, then none", () => {
    assert.equal(resolveGateway({ envKey: "sk-env" }).source, "env");
    assert.equal(resolveGateway({}).source, "none");
  });

  it("treats loopback Ollama as desk without a real key", () => {
    assert.equal(isLocalGateway(OLLAMA_GATEWAY_BASE), true);
    assert.equal(isLocalGateway("http://127.0.0.1:11434/v1"), true);
    assert.equal(isLocalGateway(DEFAULT_GATEWAY_BASE), false);
    const g = resolveGateway({ gateway_base_url: OLLAMA_GATEWAY_BASE });
    assert.equal(g.source, "desk");
    assert.equal(g.apiKey, LOCAL_GATEWAY_KEY);
    assert.equal(g.baseUrl, OLLAMA_GATEWAY_BASE);
  });

  it("swaps default xAI base when env prefers OpenRouter", () => {
    const g = resolveGateway({
      gateway_base_url: DEFAULT_GATEWAY_BASE,
      envKey: "sk-or-test",
      envPreferredBase: OPENROUTER_GATEWAY_BASE,
    });
    assert.equal(g.source, "env");
    assert.equal(g.baseUrl, OPENROUTER_GATEWAY_BASE);
  });

  it("reads env keys in priority order", () => {
    assert.equal(envGatewayKey({ XAI_API_KEY: "x", OPENROUTER_API_KEY: "o" }).apiKey, "x");
    assert.equal(
      envGatewayKey({ OPENROUTER_API_KEY: "o" }).preferredBase,
      OPENROUTER_GATEWAY_BASE,
    );
    assert.equal(envGatewayKey({}).apiKey, "");
  });

  it("masks keys", () => {
    assert.equal(maskKey("sk-abcdefghij"), "••••ghij");
    assert.equal(maskKey(LOCAL_GATEWAY_KEY), "local");
  });
});

describe("calc plugin", () => {
  it("evaluates arithmetic and rejects code", async () => {
    assert.equal(await calcPlugin.run({ expression: "(2+3)*4" }), "20");
    assert.match(await calcPlugin.run({ expression: "process.exit(1)" }), /Only numbers/);
  });
});
