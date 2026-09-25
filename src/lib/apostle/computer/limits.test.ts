import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COMPUTER_LIMITS } from "./limits.ts";
import { SHELL_HELP } from "./shell.ts";

describe("computer limits copy", () => {
  it("states browser sandbox and host limits honestly", () => {
    assert.match(COMPUTER_LIMITS, /browser sandbox/i);
    assert.match(COMPUTER_LIMITS, /not a host terminal|Not a host|host filesystem/i);
    assert.match(COMPUTER_LIMITS, /at your own risk/i);
    assert.match(COMPUTER_LIMITS, /Firecracker|CLI|Electron/i);
    assert.match(SHELL_HELP, /not your Mac/i);
    assert.match(SHELL_HELP, /no network/i);
  });
});
