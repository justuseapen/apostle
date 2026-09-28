import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clockPlugin } from "./clock.ts";

describe("clock plugin", () => {
  it("formats now in a timezone", async () => {
    const out = await clockPlugin.run({ timezone: "UTC" });
    assert.match(out, /^UTC:/);
    assert.match(out, /UTC: \d{4}-/);
  });

  it("formats a given instant and a second zone", async () => {
    const out = await clockPlugin.run({
      timezone: "America/New_York",
      also_timezone: "Asia/Tokyo",
      at: "2026-01-01T00:00:00.000Z",
    });
    assert.match(out, /America\/New_York:/);
    assert.match(out, /Asia\/Tokyo:/);
    assert.match(out, /2026-01-01T00:00:00.000Z/);
  });

  it("rejects bad timezone and instant", async () => {
    assert.match(await clockPlugin.run({ timezone: "Not/AZone" }), /Unknown timezone/);
    assert.match(await clockPlugin.run({ at: "nope" }), /Could not parse/);
  });
});
