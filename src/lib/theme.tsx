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

export const MODE_STORAGE_KEY = "apostle-mode";

const ModeContext = createContext<{
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
} | null>(null);

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
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", mode === "light" ? "#dde3ec" : "#0b0c10");
  }
}

/** FOUC-prevention snippet for `<head>` — keep in sync with applyColorMode. */
export const MODE_BOOT_SCRIPT = `(function(){try{var m=localStorage.getItem(${JSON.stringify(MODE_STORAGE_KEY)});if(m!=="light"&&m!=="dark")m="dark";document.documentElement.setAttribute("data-mode",m);document.documentElement.style.colorScheme=m;}catch(e){document.documentElement.setAttribute("data-mode","dark");document.documentElement.style.colorScheme="dark";}})();`;

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

export function useColorMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error("useColorMode must be used within ModeProvider");
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
