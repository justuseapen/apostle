/**
 * Model chain + failover helpers.
 * Run: node --experimental-strip-types --test src/lib/apostle/ports/model-routing.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  floorFailoverNotice,
  pickFailoverResult,
  resolveFloorModelId,
  resolveModelChain,
} from "./model-routing.ts";

describe("model routing", () => {
  it("resolveModelChain prefers picker then router then floor", () => {
    assert.deepEqual(
      resolveModelChain({
        preferredModelId: "claude",
        routerModelId: "grok",
        floorModelId: "local",
      }),
      ["claude", "grok", "local"],
    );
  });

  it("resolveModelChain dedupes and skips blanks", () => {
    assert.deepEqual(
      resolveModelChain({
        preferredModelId: "  ",
        routerModelId: "local",
        floorModelId: "local",
      }),
      ["local"],
    );
  });

  it("pickFailoverResult returns notice when not first attempt", async () => {
    const picked = await pickFailoverResult(["bad", "good"], async (modelId) => {
      if (modelId === "bad") throw new Error("down");
      return `ok:${modelId}`;
    });
    assert.equal(picked.result, "ok:good");
    assert.equal(picked.modelId, "good");
    assert.equal(picked.failoverNotice, floorFailoverNotice("bad", "good"));
    assert.equal(picked.attemptIndex, 1);
  });

  it("pickFailoverResult has null notice on first success", async () => {
    const picked = await pickFailoverResult(["a", "b"], async (id) => id);
    assert.equal(picked.failoverNotice, null);
    assert.equal(picked.modelId, "a");
  });

  it("resolveFloorModelId prefers env then fallback", () => {
    assert.equal(
      resolveFloorModelId({ envFloor: "ollama/llama", fallback: "floor" }),
      "ollama/llama",
    );
    assert.equal(resolveFloorModelId({ fallback: "cheap-model" }), "cheap-model");
  });
});
