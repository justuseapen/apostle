import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { linkUnfurlPlugin } from "./link-unfurl.ts";

describe("link_unfurl plugin", () => {
  it("declares https network need", () => {
    assert.deepEqual(linkUnfurlPlugin.needs, {
      network: ["https"],
      secrets: [],
      approval: false,
    });
    assert.equal(linkUnfurlPlugin.tool.function.name, "link_unfurl");
  });

  it("rejects non-https and localhost", async () => {
    assert.match(await linkUnfurlPlugin.run({ url: "http://example.com" }), /public https/);
    assert.match(await linkUnfurlPlugin.run({ url: "https://localhost/x" }), /public https/);
    assert.match(await linkUnfurlPlugin.run({ url: "not-a-url" }), /not a URL/);
  });
});
