#!/usr/bin/env node
/**
 * Nitro's vercel preset bundles electric-sql__pglite.mjs but does not always
 * emit the sibling .data / .wasm files the WASM loader reads via relative path.
 * Copy them next to the bundled module so `npm run preview` (local built-output
 * QA without DATABASE_URL) can boot PGLite. Deployed Neon builds never load them.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "node_modules/@electric-sql/pglite/dist");
const destDir = join(root, ".vercel/output/functions/__server.func/_libs");

if (!existsSync(destDir)) {
  console.log("[pglite-assets] no vercel server output — skip");
  process.exit(0);
}
if (!existsSync(srcDir)) {
  console.warn("[pglite-assets] @electric-sql/pglite not installed — skip");
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
const files = readdirSync(srcDir).filter((f) => f.endsWith(".wasm") || f.endsWith(".data"));
for (const file of files) {
  copyFileSync(join(srcDir, file), join(destDir, file));
}
console.log(`[pglite-assets] copied ${files.length} file(s) into serverless output`);
