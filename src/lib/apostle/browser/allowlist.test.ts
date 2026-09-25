import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowlistFromLines,
  hostAllowed,
  assertAllowlistedUrl,
  parseAllowlist,
} from "./allowlist.ts";
import { DEFAULT_BROWSER_ALLOWLIST } from "./limits.ts";

describe("browser allowlist", () => {
  it("parses defaults when empty", () => {
    const list = parseAllowlist("");
    assert.ok(list.includes("example.com"));
    assert.equal(list.length, DEFAULT_BROWSER_ALLOWLIST.length);
  });

  it("matches exact and wildcard hosts", () => {
    const list = ["example.com", "*.wikipedia.org", "github.com"];
    assert.equal(hostAllowed("example.com", list), true);
    assert.equal(hostAllowed("www.example.com", list), false);
    assert.equal(hostAllowed("en.wikipedia.org", list), true);
    assert.equal(hostAllowed("wikipedia.org", list), true);
    assert.equal(hostAllowed("github.com", list), true);
    assert.equal(hostAllowed("evil.com", list), false);
  });

  it("blocks private hosts even if listed", () => {
    assert.equal(hostAllowed("localhost", ["localhost"]), false);
    assert.equal(hostAllowed("127.0.0.1", ["127.0.0.1"]), false);
    assert.equal(hostAllowed("192.168.1.1", ["*"]), false);
  });

  it("assertAllowlistedUrl requires https + allowlist", () => {
    const list = ["example.com"];
    assert.equal(assertAllowlistedUrl("https://example.com/", list).ok, true);
    assert.equal(assertAllowlistedUrl("http://example.com/", list).ok, false);
    assert.equal(assertAllowlistedUrl("https://evil.com/", list).ok, false);
  });

  it("round-trips desk lines", () => {
    const json = allowlistFromLines("example.com\n*.wikipedia.org\n");
    const parsed = parseAllowlist(json);
    assert.deepEqual(parsed, ["example.com", "*.wikipedia.org"]);
  });
});
