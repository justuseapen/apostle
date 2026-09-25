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
    assert.ok(ENTERPRISE_GAP_SEEDS.length >= 12);
    const titles = ENTERPRISE_GAP_SEEDS.map((s) => s.title);
    assert.ok(titles.includes("Three-column run layout"));
    assert.ok(titles.includes("Sandbox workspace computer"));
    assert.ok(titles.includes("Allowlisted browser trail"));
    assert.ok(titles.includes("Human approval cards"));
    assert.ok(titles.includes("Search through threads"));
    assert.ok(titles.includes("Thread management"));
    assert.ok(titles.includes("Automations"));
    assert.ok(titles.includes("Better VM"));
    assert.ok(!titles.includes("Launch ready for OSS attention"));
    const browser = ENTERPRISE_GAP_SEEDS.find((s) => s.title === "Allowlisted browser trail");
    assert.ok(browser?.note.toLowerCase().includes("partial"));
    const search = ENTERPRISE_GAP_SEEDS.find((s) => s.title === "Search through threads");
    assert.ok(search?.note.toLowerCase().includes("partial"));
    const threads = ENTERPRISE_GAP_SEEDS.find((s) => s.title === "Thread management");
    assert.ok(threads?.note.toLowerCase().includes("partial"));
  });
});
