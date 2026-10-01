/**
 * Regression: public theme catalog stays in sync across type guards,
 * ThemeSelect options, CSS blocks, and the FOUC boot script.
 *
 * Run: node --test scripts/theme-catalog.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const themeTs = readFileSync(join(root, "src/lib/theme.tsx"), "utf8");
const styles = readFileSync(join(root, "src/styles.css"), "utf8");
const rootTsx = readFileSync(join(root, "src/routes/__root.tsx"), "utf8");

const PUBLIC = ["phosphor", "ink", "eapen"];
const PRIVATE = ["si"];
const ALL = [...PUBLIC, ...PRIVATE];

describe("theme catalog", () => {
  it("lists public themes in PUBLIC_THEMES", () => {
    const m = themeTs.match(/export const PUBLIC_THEMES = \[([^\]]+)\]/);
    assert.ok(m, "PUBLIC_THEMES missing");
    for (const id of PUBLIC) {
      assert.match(m[1], new RegExp(`"${id}"`));
    }
  });

  it("accepts each theme in isProductTheme / isPublicTheme", () => {
    for (const id of ALL) {
      assert.match(themeTs, new RegExp(`value === "${id}"`));
    }
    for (const id of PUBLIC) {
      assert.match(
        themeTs,
        new RegExp(`isPublicTheme[\\s\\S]*?value === "${id}"`),
      );
    }
  });

  it("exposes each public theme in ThemeSelect; SI gated", () => {
    assert.match(themeTs, /THEME_LABELS/);
    for (const id of PUBLIC) {
      assert.match(themeTs, new RegExp(`${id}: ".*\\(public\\)"`));
    }
    assert.match(themeTs, /showPrivateThemesInDesk/);
    assert.match(themeTs, /VITE_APOSTLE_SHOW_PRIVATE_THEMES/);
    assert.match(themeTs, /Super Intelligence \(private\)/);
    assert.match(themeTs, /\[\.\.\.PUBLIC_THEMES\]/);
    // Default Desk path must not hard-code an always-on SI <option>
    assert.doesNotMatch(
      themeTs,
      /<option value="si">Super Intelligence \(private\)<\/option>/,
    );
  });

  it("has dark + light CSS token blocks per theme (except phosphor defaults)", () => {
    for (const id of ["ink", "eapen", "si"]) {
      assert.match(styles, new RegExp(`html\\[data-theme="${id}"\\]`));
      assert.match(
        styles,
        new RegExp(`html\\[data-theme="${id}"\\]\\[data-mode="light"\\]`),
      );
    }
  });

  it("keeps boot script allowlist in sync", () => {
    const boot = themeTs.match(/export const MODE_BOOT_SCRIPT = `([^`]+)`/);
    assert.ok(boot, "MODE_BOOT_SCRIPT missing");
    for (const id of ALL) {
      assert.match(boot[1], new RegExp(`"${id}"`));
    }
  });

  it("loads Eapen webfonts from Google Fonts", () => {
    assert.match(rootTsx, /family=Archivo/);
    assert.match(rootTsx, /family=Newsreader/);
  });
});
