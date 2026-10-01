# Themes — add a public skin without touching SI

**Audience:** someone who wants a Phosphor-compatible look for OSS, without forking the harness or cataloguing private skins.  
**Law:** a theme is clothes, not hands. Themes never register tools. Super Intelligence (`si`) stays **private** (enable-only — not a public catalog entry). Billing stays out for OSS.

## Package contract

A public theme is:

| Piece | What |
|-------|------|
| `data-theme="<id>"` | Set on `<html>` by `applyProductTheme` / boot script |
| Token overrides | CSS under `html[data-theme="<id>"]` remapping `--color-ph-*` (+ optional fonts / radius) |
| Catalog entry | Public themes listed in `PUBLIC_THEMES` + Desk `ThemeSelect` |
| Enable path | `?theme=<id>`, Desk → Theme, `localStorage`, optional `VITE_APOSTLE_THEME` / meta `apostle-default-theme` |

**Allowed:** color tokens, fonts, border radius, scanline / chrome polish that still uses existing Phosphor class names (`ph-*`, `border-ph-*`, etc.).  
**Not allowed:** tools, plugins, gateway logic, Missing seeds, private SI brand assets in OSS promo shots.

Private themes live in `PRIVATE_THEMES` (`si` today). They are **not** listed in Desk by default.
Enable for private pitches with `?theme=si` (still works) or build with
`VITE_APOSTLE_SHOW_PRIVATE_THEMES=1` so Desk shows the SI option. Do **not** market SI as the
public catalog.

## Ritual (checklist)

1. Pick a short kebab id (e.g. `ink`, `eapen`). Avoid colliding with `phosphor` or `si`.
2. Extend `ProductTheme` / `isProductTheme` / `isPublicTheme` / boot script in `src/lib/theme.tsx` (boot script allowlist is duplicated — keep it in sync).
3. Add `html[data-theme="…"]` (+ light mode) token block in `src/styles.css` — remap the same `--color-ph-*` variables Phosphor uses.
4. Add any new webfonts to the Google Fonts link in `src/routes/__root.tsx`.
5. Add the id to `PUBLIC_THEMES` (or `PRIVATE_THEMES` if it must stay enable-only).
6. Expose public ids in `ThemeSelect` (derived from `PUBLIC_THEMES`). Private skins stay off the Desk list unless `VITE_APOSTLE_SHOW_PRIVATE_THEMES=1` (or the session is already on that skin).
7. Verify: `?theme=<id>`, Desk toggle, light/dark (`data-mode`), chat + desk + landing still readable.
8. Document in README Docs table. Do **not** put SI chrome in OSS promo screenshots.

## Shipping examples

### Ink

`ink` — cool slate / cyan tokens on the same Phosphor surface classes:

```bash
npm run dev
# http://localhost:8080/?theme=ink
# or Desk → Theme → Ink (public)
# reset: ?theme=phosphor
```

### Eapen

`eapen` — warm ink / paper / gold tokens from [eapentechnology.com](https://eapentechnology.com) (`styles/site.css` `:root`):

```bash
npm run dev
# http://localhost:8080/?theme=eapen
# or Desk → Theme → Eapen (public)
```

Source map (brand → Phosphor):

| Brand token | Phosphor token |
|-------------|----------------|
| `--ink-deep` `#131111` | `--color-ph-void` |
| `--surface` `#211c1c` | `--color-ph-tile` |
| `--ink` `#191616` | `--color-ph-term` / `--color-ph-on` |
| `--paper` `#f1ece2` | `--color-ph-bone` (dark) / void (light) |
| `--muted` `#b9aea3` | `--color-ph-mute` |
| `--gold` `#d6b36a` | `--color-ph-focus` |
| `--red` `#762a33` | `--color-ph-missing` (light; lifted on dark) |
| Archivo / Newsreader / IBM Plex Mono | `--font-sans` / `--font-display` / `--font-mono` |

SI remains: `?theme=si` (or Desk when `VITE_APOSTLE_SHOW_PRIVATE_THEMES=1`).

## Token map (minimum)

Override at least:

- `--color-ph-void`, `--color-ph-tile`, `--color-ph-term`, `--color-ph-raise`
- `--color-ph-border`, `--color-ph-line2`
- `--color-ph-dim`, `--color-ph-mute`, `--color-ph-bone`, `--color-ph-on`
- `--color-ph-focus`, `--color-ph-missing`, `--color-ph-tool`, `--color-ph-warn`
- Optional: `--font-sans`, `--font-display`, `--font-marginalia`, `--radius`

Keep light mode via `html[data-theme="…"][data-mode="light"]`.

## Related

- Theme runtime: `src/lib/theme.tsx`
- Tokens: `src/styles.css`
- Plugins (tools, not look): [`plugins.md`](./plugins.md)
- Enterprise matrix (SI private): [`enterprise-buyin-roadmap.md`](./enterprise-buyin-roadmap.md)
