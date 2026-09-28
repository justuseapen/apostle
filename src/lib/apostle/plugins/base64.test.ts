import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { base64Plugin, decodeBase64, encodeBase64 } from "./base64.ts";

describe("base64 plugin", () => {
  it("declares deny-by-default needs", () => {
    assert.deepEqual(base64Plugin.needs, { network: [], secrets: [], approval: false });
  });

  it("round-trips utf8", async () => {
    const text = "hello — Apostle";
    const encoded = encodeBase64(text);
    assert.equal(decodeBase64(encoded), text);
    assert.equal(await base64Plugin.run({ text }), encoded);
    assert.equal(await base64Plugin.run({ text: encoded, action: "decode" }), text);
  });

  it("rejects empty and unknown actions", async () => {
    assert.match(await base64Plugin.run({}), /Provide text/);
    assert.match(await base64Plugin.run({ text: "x", action: "flip" }), /Unknown action/);
  });
});
