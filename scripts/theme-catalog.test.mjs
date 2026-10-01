/**
 * Regression: public theme catalog stays in sync across type guards,
 * ThemeSelect options, CSS blocks, and the FOUC boot script.
 * Private customer skins must not appear in OSS.
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
const brand = readFileSync(join(root, "src/components/apostle/brand.tsx"), "utf8");
const rootTsx = readFileSync(join(root, "src/routes/__root.tsx"), "utf8");

const PUBLIC = ["phosphor", "ink", "eapen"];

describe("theme catalog", () => {
  it("lists public themes in PUBLIC_THEMES", () => {
    const m = themeTs.match(/export const PUBLIC_THEMES = \[([^\]]+)\]/);
    assert.ok(m, "PUBLIC_THEMES missing");
    for (const id of PUBLIC) {
      assert.match(m[1], new RegExp(`"${id}"`));
    }
  });

  it("accepts each public theme in isProductTheme", () => {
    for (const id of PUBLIC) {
      assert.match(themeTs, new RegExp(`value === "${id}"`));
    }
  });

  it("exposes each public theme in ThemeSelect labels", () => {
    assert.match(themeTs, /THEME_LABELS/);
    for (const id of PUBLIC) {
      assert.match(themeTs, new RegExp(`${id}: ".*\\(public\\)"`));
    }
  });

  it("has dark + light CSS token blocks per non-default public theme", () => {
    for (const id of ["ink", "eapen"]) {
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
    for (const id of PUBLIC) {
      assert.match(boot[1], new RegExp(`"${id}"`));
    }
  });

  it("loads Eapen webfonts from Google Fonts", () => {
    assert.match(rootTsx, /family=Archivo/);
    assert.match(rootTsx, /family=Newsreader/);
  });

  it("does not ship private SI brand assets in OSS", () => {
    assert.doesNotMatch(themeTs, /\b"si"\b/);
    assert.doesNotMatch(themeTs, /Super Intelligence/);
    assert.doesNotMatch(themeTs, /PRIVATE_THEMES/);
    assert.doesNotMatch(themeTs, /isSi/);
    assert.doesNotMatch(styles, /data-theme="si"/);
    assert.doesNotMatch(styles, /si-pulse/);
    assert.doesNotMatch(brand, /SiMark|SUPER INTELLIGENCE|TMTG/);
    assert.doesNotMatch(rootTsx, /family=Poppins|family=Inter/);
  });
});
