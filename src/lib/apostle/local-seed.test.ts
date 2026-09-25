import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  shouldSeedLocal,
  LOCAL_SEED_EMAIL,
  LOCAL_SEED_PASSWORD,
  LOCAL_SEED_MODEL,
  LOCAL_SEED_MODEL_MAP,
} from "./local-seed.ts";

describe("shouldSeedLocal", () => {
  it("defaults on when DATABASE_URL is unset", () => {
    assert.equal(shouldSeedLocal({}), true);
    assert.equal(shouldSeedLocal({ DATABASE_URL: "" }), true);
    assert.equal(shouldSeedLocal({ DATABASE_URL: "   " }), true);
  });

  it("defaults off when DATABASE_URL is set", () => {
    assert.equal(shouldSeedLocal({ DATABASE_URL: "postgres://x" }), false);
  });

  it("respects APOSTLE_SEED_LOCAL override", () => {
    assert.equal(shouldSeedLocal({ APOSTLE_SEED_LOCAL: "0" }), false);
    assert.equal(shouldSeedLocal({ APOSTLE_SEED_LOCAL: "false" }), false);
    assert.equal(
      shouldSeedLocal({ DATABASE_URL: "postgres://x", APOSTLE_SEED_LOCAL: "1" }),
      true,
    );
    assert.equal(
      shouldSeedLocal({ DATABASE_URL: "postgres://x", APOSTLE_SEED_LOCAL: "true" }),
      true,
    );
  });
});

describe("local seed constants", () => {
  it("uses documented Ollama model and obvious credentials", () => {
    assert.equal(LOCAL_SEED_EMAIL, "test@apostle.local");
    assert.equal(LOCAL_SEED_PASSWORD, "password123");
    assert.equal(LOCAL_SEED_MODEL, "qwen3:0.6b");
    for (const label of ["cheap", "default", "strong", "vision"] as const) {
      assert.equal(LOCAL_SEED_MODEL_MAP[label], "qwen3:0.6b");
    }
  });
});
