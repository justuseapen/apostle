import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runShell, SHELL_HELP } from "./shell.ts";

const ws = { userId: "test-user", threadId: "test-thread" };

describe("computer shell guards", () => {
  it("returns help without touching storage", async () => {
    const out = await runShell(ws, "help");
    assert.equal(out, SHELL_HELP);
  });

  it("blocks host-style and network commands", async () => {
    const blocked = await Promise.all([
      runShell(ws, "curl https://example.com"),
      runShell(ws, "ls | cat"),
      runShell(ws, "echo hi; rm -rf /"),
      runShell(ws, "bash -c id"),
    ]);
    for (const out of blocked) {
      assert.match(out, /Blocked/i);
    }
  });

  it("rejects unknown commands", async () => {
    const out = await runShell(ws, "foobar");
    assert.match(out, /Unknown command/);
  });
});
