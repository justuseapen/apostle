import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeUuids, uuidPlugin } from "./uuid.ts";

describe("uuid plugin", () => {
  it("declares deny-by-default needs", () => {
    assert.deepEqual(uuidPlugin.needs, { network: [], secrets: [], approval: false });
    assert.equal(uuidPlugin.tool.function.name, "uuid");
  });

  it("generates a single uuid by default", async () => {
    const out = await uuidPlugin.run({});
    assert.match(out, /^[0-9a-f-]{36}$/i);
  });

  it("generates multiple uuids", async () => {
    const list = makeUuids(3);
    assert.equal(list.length, 3);
    assert.equal(new Set(list).size, 3);
    const out = await uuidPlugin.run({ count: "3" });
    assert.equal(out.split("\n").length, 3);
  });

  it("rejects bad counts", async () => {
    assert.match(await uuidPlugin.run({ count: "0" }), /1 to 20/);
    assert.match(await uuidPlugin.run({ count: "99" }), /too high/);
  });
});
