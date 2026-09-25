import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { digestText, hashPlugin } from "./hash.ts";

describe("hash plugin", () => {
  it("declares deny-by-default needs", () => {
    assert.deepEqual(hashPlugin.needs, { network: [], secrets: [], approval: false });
    assert.equal(hashPlugin.id, "hash");
    assert.equal(hashPlugin.tool.function.name, "hash");
  });

  it("digests sha256 of hello", async () => {
    const out = await hashPlugin.run({ text: "hello" });
    assert.equal(out, `sha256: ${digestText("hello", "sha256")}`);
    assert.match(out, /^sha256: [a-f0-9]{64}$/);
  });

  it("supports sha1 and md5", async () => {
    const sha1 = await hashPlugin.run({ text: "hello", algorithm: "sha1" });
    assert.match(sha1, /^sha1: [a-f0-9]{40}$/);
    const md5 = await hashPlugin.run({ text: "hello", algorithm: "md5" });
    assert.match(md5, /^md5: [a-f0-9]{32}$/);
  });

  it("rejects empty text and unknown algorithms", async () => {
    assert.match(await hashPlugin.run({}), /Provide text/);
    assert.match(await hashPlugin.run({ text: "x", algorithm: "blake3" }), /Unknown algorithm/);
  });
});
