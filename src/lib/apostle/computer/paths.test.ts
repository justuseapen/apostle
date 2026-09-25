import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { basename, isDirectChild, isUnder, normalizePath, parentPath } from "./paths.ts";

describe("computer paths", () => {
  it("normalizes relative and absolute paths", () => {
    assert.equal(normalizePath("/a/b"), "/a/b");
    assert.equal(normalizePath("a/b", "/"), "/a/b");
    assert.equal(normalizePath("../x", "/a"), "/x");
    const escaped = normalizePath("../x", "/");
    assert.ok(typeof escaped !== "string");
    assert.match((escaped as { error: string }).error, /escapes/);
    assert.equal(normalizePath(".", "/notes"), "/notes");
    assert.equal(normalizePath("/"), "/");
  });

  it("parent and basename", () => {
    assert.equal(parentPath("/a/b.txt"), "/a");
    assert.equal(basename("/a/b.txt"), "b.txt");
    assert.equal(parentPath("/"), "/");
  });

  it("direct child and under", () => {
    assert.equal(isDirectChild("/", "/a"), true);
    assert.equal(isDirectChild("/", "/a/b"), false);
    assert.equal(isDirectChild("/a", "/a/b"), true);
    assert.equal(isUnder("/a", "/a/b/c"), true);
    assert.equal(isUnder("/a", "/b"), false);
  });
});
