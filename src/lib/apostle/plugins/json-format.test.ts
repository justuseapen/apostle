import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatJson, jsonFormatPlugin } from "./json-format.ts";

describe("json_format plugin", () => {
  it("declares deny-by-default needs", () => {
    assert.deepEqual(jsonFormatPlugin.needs, { network: [], secrets: [], approval: false });
    assert.equal(jsonFormatPlugin.tool.function.name, "json_format");
  });

  it("pretty / minify / validate", async () => {
    const raw = '{"a":1,"b":[2]}';
    assert.equal(formatJson(raw, "minify"), '{"a":1,"b":[2]}');
    assert.match(formatJson(raw, "pretty"), /\n/);
    assert.equal(await jsonFormatPlugin.run({ text: raw, action: "validate" }), "valid JSON");
    assert.match(await jsonFormatPlugin.run({ text: "{nope" }), /Invalid JSON/);
  });
});
