# Themes — add a public skin

**Audience:** someone who wants a Phosphor-compatible look for OSS, without forking the harness.  
**Law:** a theme is clothes, not hands. Themes never register tools. **Private / customer brand skins do not live in this repository.** Billing stays out for OSS.

## Package contract

A public theme is:

| Piece | What |
|-------|------|
| `data-theme="<id>"` | Set on `<html>` by `applyProductTheme` / boot script |
| Token overrides | CSS under `html[data-theme="<id>"]` remapping `--color-ph-*` (+ optional fonts / radius) |
| Catalog entry | Public themes listed in `PUBLIC_THEMES` + Desk `ThemeSelect` |
| Enable path | `?theme=<id>`, Desk → Theme, `localStorage`, optional `VITE_APOSTLE_THEME` / meta `apostle-default-theme` |

**Allowed:** color tokens, fonts, border radius, scanline / chrome polish that still uses existing Phosphor class names (`ph-*`, `border-ph-*`, etc.).  
**Not allowed:** tools, plugins, gateway logic, Missing seeds, **any private customer brand assets** (tokens, wordmarks, fonts, copy).

### Private customer skins

Customer chrome (tokens, lockups, fonts) must stay **outside** this git tree — e.g. a gitignored `src/private/local/` overlay or a private package mounted at deploy time. Do not add private theme ids to `ProductTheme` / `PUBLIC_THEMES` in OSS. Do not commit brand-board CSS or wordmarks here.

Stub contract: see [`src/private/README.md`](../src/private/README.md).

## Ritual (checklist)

1. Pick a short kebab id (e.g. `ink`, `eapen`). Avoid colliding with `phosphor`.
2. Extend `ProductTheme` / `isProductTheme` / boot script in `src/lib/theme.tsx` (boot script allowlist is duplicated — keep it in sync).
3. Add `html[data-theme="…"]` (+ light mode) token block in `src/styles.css` — remap the same `--color-ph-*` variables Phosphor uses.
4. Add any new webfonts to the Google Fonts link in `src/routes/__root.tsx`.
5. Add the id to `PUBLIC_THEMES` (Desk `ThemeSelect` reads that list).
6. Verify: `?theme=<id>`, Desk toggle, light/dark (`data-mode`), chat + desk + landing still readable.
7. Document in README Docs table. Promo screenshots stay on public themes only.

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
- Enterprise capability matrix (no private chrome in-repo): [`enterprise-buyin-roadmap.md`](./enterprise-buyin-roadmap.md)
