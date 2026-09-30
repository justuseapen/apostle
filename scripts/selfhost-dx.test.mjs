#!/usr/bin/env node
/**
 * Guardrails for the Coolify / node-server self-host path.
 * Catches the DX gaps that broke the eapen.ai dogfood before they regress.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

describe("selfhost DX", () => {
  it("exposes build:selfhost + start scripts", () => {
    const pkg = JSON.parse(read("package.json"));
    assert.match(pkg.scripts["build:selfhost"], /NITRO_PRESET=node-server/);
    assert.match(pkg.scripts.start, /migrate\.mjs/);
    assert.match(pkg.scripts.start, /\.output\/server\/index\.mjs/);
  });

  it("Dockerfile forces devDependencies despite Coolify NODE_ENV=production", () => {
    const docker = read("Dockerfile");
    assert.match(docker, /npm ci --include=dev/);
    assert.match(docker, /npm run build:selfhost/);
    assert.match(docker, /CMD \["npm", "start"\]/);
  });

  it("vite keeps Playwright out of the client bundle and allows node-server", () => {
    const vite = read("vite.config.ts");
    assert.match(vite, /stubPlaywrightOnClient/);
    assert.match(vite, /apostle:stub-playwright-client/);
    assert.match(vite, /process\.env\.NITRO_PRESET \|\| "vercel"/);
  });

  it("documents Coolify owner/repo and domains gotchas", () => {
    const doc = read("docs/coolify-selfhost.md");
    assert.match(doc, /owner\/repo/);
    assert.match(doc, /domains/);
    assert.match(doc, /npm ci --include=dev/);
    assert.match(doc, /Playwright/);
  });
});
