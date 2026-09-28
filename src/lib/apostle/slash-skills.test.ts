import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterSlashSkills, listSlashSkills, slashQuery } from "./slash-skills.ts";

describe("slash skills", () => {
  it("lists installed plugins plus desk and help", () => {
    const ids = listSlashSkills().map((s) => s.id);
    for (const id of [
      "get_time",
      "calc",
      "hash",
      "uuid",
      "base64",
      "json_format",
      "regex",
      "fetch_page",
      "link_unfurl",
      "weather",
      "create_missing",
      "computer",
      "browser",
      "desk",
      "help",
    ]) {
      assert.ok(ids.includes(id), `missing slash skill ${id}`);
    }
  });

  it("detects active slash query", () => {
    assert.equal(slashQuery("/"), "");
    assert.equal(slashQuery("/ti"), "ti");
    assert.equal(slashQuery("/time"), "time");
    assert.equal(slashQuery("/time now"), null);
    assert.equal(slashQuery("hello"), null);
  });

  it("filters by command and aliases", () => {
    const hits = filterSlashSkills("clock");
    assert.equal(hits.length, 1);
    assert.equal(hits[0]?.id, "get_time");
    const calc = filterSlashSkills("calc");
    assert.ok(calc.some((s) => s.id === "calc"));
    const ti = filterSlashSkills("ti");
    assert.equal(ti.length, 1);
    assert.equal(ti[0]?.id, "get_time");
    const missing = filterSlashSkills("missing");
    assert.ok(missing.some((s) => s.id === "create_missing"));
    const fileAsk = filterSlashSkills("file_ask");
    assert.ok(fileAsk.some((s) => s.id === "create_missing"));
    const computer = filterSlashSkills("shell");
    assert.ok(computer.some((s) => s.id === "computer"));
    const browse = filterSlashSkills("browse");
    assert.ok(browse.some((s) => s.id === "browser"));
    const hash = filterSlashSkills("sha256");
    assert.ok(hash.some((s) => s.id === "hash"));
    assert.ok(filterSlashSkills("uuid").some((s) => s.id === "uuid"));
    assert.ok(filterSlashSkills("unfurl").some((s) => s.id === "link_unfurl"));
    assert.ok(filterSlashSkills("weather").some((s) => s.id === "weather"));
    assert.ok(filterSlashSkills("json").some((s) => s.id === "json_format"));
  });
});
