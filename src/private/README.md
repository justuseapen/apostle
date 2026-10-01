# Private overlays (not shipped in OSS)

Customer brand skins — tokens, wordmarks, fonts, copy — **must not** be committed to this
repository.

## Layout

```
src/private/
  README.md          ← this file (tracked)
  local/             ← gitignored; your private overlay lives here
    theme-overlay.css
    brand.tsx        ← optional brand lockup overrides
```

Copy assets into `local/` on a private machine or CI secret store, then import from a
deploy branch that never pushes those files to the public remote.

## Contract

- Public `ProductTheme` ids stay in `src/lib/theme.tsx` / `PUBLIC_THEMES` only.
- Overlay CSS may target `html[data-theme="<private-id>"]` **only** when that id is
  registered in a private fork or private package — not in the public catalog.
- Themes never register tools.

See [`docs/themes.md`](../../docs/themes.md).
