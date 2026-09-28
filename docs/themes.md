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

Private themes live in `PRIVATE_THEMES` (`si` today). They may appear in Desk as enable-only for private pitches; they must **not** be marketed as the public catalog.

## Ritual (checklist)

1. Pick a short kebab id (e.g. `ink`). Avoid colliding with `phosphor` or `si`.
2. Extend `ProductTheme` / `isProductTheme` / boot script in `src/lib/theme.tsx`.
3. Add `html[data-theme="…"]` (+ light mode) token block in `src/styles.css` — remap the same `--color-ph-*` variables Phosphor uses.
4. Add the id to `PUBLIC_THEMES` (or `PRIVATE_THEMES` if it must stay enable-only).
5. Expose it in `ThemeSelect` (public options first; keep SI labeled private).
6. Verify: `?theme=<id>`, Desk toggle, light/dark (`data-mode`), chat + desk + landing still readable.
7. Document in README Docs table. Do **not** put SI chrome in OSS promo screenshots.

## Shipping example: Ink

`ink` is the second **public** theme — cool slate / cyan tokens on the same Phosphor surface classes. Try:

```bash
npm run dev
# http://localhost:8080/?theme=ink
# or Desk → Theme → Ink (public)
# reset: ?theme=phosphor
```

SI remains: `?theme=si` or Desk → Super Intelligence (private).

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
