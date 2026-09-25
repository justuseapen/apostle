import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ENTERPRISE_GAP_SEEDS, slugifyGap } from "./gaps.ts";

describe("gaps", () => {
  it("slugifies titles stably", () => {
    assert.equal(slugifyGap("Three-column run layout"), "three-column-run-layout");
    assert.equal(slugifyGap("  MCP tool bus  "), "mcp-tool-bus");
    assert.equal(slugifyGap("!!!"), "ask");
  });

  it("ships enterprise seed list for the pitch desk", () => {
    assert.ok(ENTERPRISE_GAP_SEEDS.length >= 8);
    const titles = ENTERPRISE_GAP_SEEDS.map((s) => s.title);
    assert.ok(titles.includes("Three-column run layout"));
    assert.ok(titles.includes("Sandbox workspace computer"));
    assert.ok(titles.includes("Human approval cards"));
  });
});
