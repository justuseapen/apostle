import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { regexPlugin, runRegex } from "./regex.ts";

describe("regex plugin", () => {
  it("declares deny-by-default needs", () => {
    assert.deepEqual(regexPlugin.needs, { network: [], secrets: [], approval: false });
  });

  it("matches and returns groups", async () => {
    const single = runRegex(String.raw`(\w+)@(\w+)`, "a@b.com");
    assert.equal(single.ok, true);
    if (single.ok) {
      assert.equal(single.matched, true);
      assert.deepEqual(single.matches, ["a@b", "a", "b"]);
    }
    const out = await regexPlugin.run({
      pattern: String.raw`\d+`,
      text: "a1b22c",
      flags: "g",
    });
    assert.equal(out, "matched\n1\n22");
    assert.equal(await regexPlugin.run({ pattern: "z", text: "abc" }), "no match");
  });

  it("rejects bad flags", async () => {
    assert.match(await regexPlugin.run({ pattern: "a", text: "a", flags: "x" }), /Flags/);
  });
});
