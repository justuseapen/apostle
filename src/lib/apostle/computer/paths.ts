/**
 * Normalize and jail virtual workspace paths.
 * No host FS — paths are logical keys inside the Computer VFS.
 */

const MAX_PATH = 240;
const MAX_SEGMENTS = 24;

export function normalizePath(raw: string | undefined | null, cwd = "/"): string | { error: string } {
  const input = (raw ?? "").trim() || ".";
  const base = cwd.startsWith("/") ? cwd : `/${cwd}`;
  const joined = input.startsWith("/")
    ? input
    : `${base.replace(/\/$/, "")}/${input}`;

  const parts: string[] = [];
  for (const seg of joined.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") {
      if (parts.length === 0) return { error: "Path escapes the workspace root." };
      parts.pop();
      continue;
    }
    if (seg.includes("\0") || /[\\:]/.test(seg)) {
      return { error: `Illegal path segment: ${seg}` };
    }
    parts.push(seg);
  }
  if (parts.length > MAX_SEGMENTS) return { error: "Path too deep." };
  const path = "/" + parts.join("/");
  if (path.length > MAX_PATH) return { error: "Path too long." };
  return path === "/" ? "/" : path;
}

export function parentPath(path: string): string {
  if (path === "/") return "/";
  const i = path.lastIndexOf("/");
  if (i <= 0) return "/";
  return path.slice(0, i) || "/";
}

export function basename(path: string): string {
  if (path === "/") return "";
  const i = path.lastIndexOf("/");
  return path.slice(i + 1);
}

/** Directory prefix for listing children of `dir` (exact one level). */
export function isDirectChild(dir: string, filePath: string): boolean {
  if (dir === "/") {
    const rest = filePath.slice(1);
    return rest.length > 0 && !rest.includes("/");
  }
  if (!filePath.startsWith(dir + "/")) return false;
  const rest = filePath.slice(dir.length + 1);
  return rest.length > 0 && !rest.includes("/");
}

export function isUnder(dir: string, filePath: string): boolean {
  if (dir === "/") return filePath !== "/";
  return filePath === dir || filePath.startsWith(dir + "/");
}
