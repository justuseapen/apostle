import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_GATEWAY_BASE,
  OPENROUTER_GATEWAY_BASE,
  envGatewayKey,
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
  });
});

describe("calc plugin", () => {
  it("evaluates arithmetic and rejects code", async () => {
    assert.equal(await calcPlugin.run({ expression: "(2+3)*4" }), "20");
    assert.match(await calcPlugin.run({ expression: "process.exit(1)" }), /Only numbers/);
  });
});
