import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ColorMode = "dark" | "light";

/**
 * Public catalog themes only. Customer / private skins live outside this repo
 * (gitignored overlay or private package) — never ship private brand assets in OSS.
 * Themes never register tools. See docs/themes.md.
 */
export type ProductTheme = "phosphor" | "ink" | "eapen";

export const MODE_STORAGE_KEY = "apostle-mode";
export const THEME_STORAGE_KEY = "apostle-theme";

/** Public catalog — Phosphor default + Ink + Eapen (workshop brand). */
export const PUBLIC_THEMES = ["phosphor", "ink", "eapen"] as const;

const ModeContext = createContext<{
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
} | null>(null);

const ThemeContext = createContext<{
  theme: ProductTheme;
  setTheme: (theme: ProductTheme) => void;
} | null>(null);

export function isProductTheme(value: string | null | undefined): value is ProductTheme {
  return value === "phosphor" || value === "ink" || value === "eapen";
}

export function isPublicTheme(value: string | null | undefined): boolean {
  return isProductTheme(value);
}

export function readStoredMode(): ColorMode {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function readStoredTheme(): ProductTheme {
  if (typeof window === "undefined") return "phosphor";
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("theme");
    if (isProductTheme(fromQuery)) return fromQuery;
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isProductTheme(stored)) return stored;
    const fromEnv = (import.meta as { env?: { VITE_APOSTLE_THEME?: string } }).env
      ?.VITE_APOSTLE_THEME;
    if (isProductTheme(fromEnv)) return fromEnv;
  } catch {
    /* ignore */
  }
  return "phosphor";
}

export function applyColorMode(mode: ColorMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-mode", mode);
  root.style.colorScheme = mode;
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  syncThemeColorMeta();
}

export function applyProductTheme(theme: ProductTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  syncThemeColorMeta();
}

function syncThemeColorMeta() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const mode = root.getAttribute("data-mode") === "light" ? "light" : "dark";
  const themeAttr = root.getAttribute("data-theme");
  const theme = isProductTheme(themeAttr) ? themeAttr : "phosphor";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  if (theme === "ink") {
    meta.setAttribute("content", mode === "light" ? "#e8eef4" : "#0a1018");
  } else if (theme === "eapen") {
    meta.setAttribute("content", mode === "light" ? "#f1ece2" : "#131111");
  } else {
    meta.setAttribute("content", mode === "light" ? "#dde3ec" : "#0b0c10");
  }
}

/**
 * FOUC-prevention snippet for `<head>` — keep in sync with applyColorMode /
 * applyProductTheme. Honors ?theme=, localStorage, then optional meta default.
 */
export const MODE_BOOT_SCRIPT = `(function(){try{var m=localStorage.getItem(${JSON.stringify(MODE_STORAGE_KEY)});if(m!=="light"&&m!=="dark")m="dark";document.documentElement.setAttribute("data-mode",m);document.documentElement.style.colorScheme=m;var ok=function(t){return t==="phosphor"||t==="ink"||t==="eapen";};var t=null;try{t=new URLSearchParams(location.search).get("theme");}catch(e){}if(!ok(t)){t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});}if(!ok(t)){var meta=document.querySelector('meta[name="apostle-default-theme"]');t=meta&&meta.getAttribute("content");}if(!ok(t))t="phosphor";document.documentElement.setAttribute("data-theme",t);try{localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)},t);}catch(e){}}catch(e){document.documentElement.setAttribute("data-mode","dark");document.documentElement.setAttribute("data-theme","phosphor");document.documentElement.style.colorScheme="dark";}})();`;

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>("dark");

  useEffect(() => {
    const initial = readStoredMode();
    setModeState(initial);
    applyColorMode(initial);
  }, []);

  const setMode = useCallback((next: ColorMode) => {
    setModeState(next);
    applyColorMode(next);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next: ColorMode = prev === "light" ? "dark" : "light";
      applyColorMode(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, setMode, toggleMode }), [mode, setMode, toggleMode]);

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ProductTheme>("phosphor");

  useEffect(() => {
    const initial = readStoredTheme();
    setThemeState(initial);
    applyProductTheme(initial);
    // Persist query selection so pitch links stick without rewriting every URL.
    try {
      const params = new URLSearchParams(window.location.search);
      if (isProductTheme(params.get("theme"))) {
        window.localStorage.setItem(THEME_STORAGE_KEY, params.get("theme")!);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setTheme = useCallback((next: ProductTheme) => {
    setThemeState(next);
    applyProductTheme(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useColorMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error("useColorMode must be used within ModeProvider");
  }
  return ctx;
}

export function useProductTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useProductTheme must be used within ThemeProvider");
  }
  return ctx;
}

/** Design-faithful [light]/[dark] control — shared across product chrome. */
export function ModeToggle({ className = "" }: { className?: string }) {
  const { mode, toggleMode } = useColorMode();
  const label = mode === "light" ? "[dark]" : "[light]";
  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className={`border-2 border-ph-line2 bg-transparent px-2 py-0.5 font-mono text-xs text-ph-bone hover:border-ph-focus hover:bg-ph-focus hover:text-ph-on ${className}`}
    >
      {label}
    </button>
  );
}

const THEME_LABELS: Record<ProductTheme, string> = {
  phosphor: "Phosphor (public)",
  ink: "Ink (public)",
  eapen: "Eapen (public)",
};

/** Desk catalog control — public themes only. */
export function ThemeSelect({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useProductTheme();

  return (
    <label className={`flex items-center gap-2 font-mono text-xs text-ph-dim ${className}`}>
      <span className="uppercase tracking-wide">Theme</span>
      <select
        value={theme}
        onChange={(e) => {
          const next = e.target.value;
          if (isProductTheme(next)) setTheme(next);
        }}
        className="h-9 border-2 border-ph-border bg-ph-void px-2 text-ph-bone outline-none focus:border-ph-focus"
        aria-label="Product theme"
      >
        {PUBLIC_THEMES.map((id) => (
          <option key={id} value={id}>
            {THEME_LABELS[id]}
          </option>
        ))}
      </select>
    </label>
  );
}
