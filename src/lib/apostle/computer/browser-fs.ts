/**
 * Browser-side helpers for Computer Artifacts.
 * OPFS mirror + File System Access API import (Chrome/Edge).
 * Never claims host shell access.
 */

export type BrowserFsCapability = {
  opfs: boolean;
  directoryPicker: boolean;
};

type DirHandle = {
  getDirectoryHandle: (name: string, opts?: { create?: boolean }) => Promise<DirHandle>;
  getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<FileHandle>;
  kind?: string;
  [Symbol.asyncIterator]?: () => AsyncIterator<[string, { kind: string }]>;
};

type FileHandle = {
  getFile: () => Promise<File>;
  createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>;
  kind?: string;
};

export function detectBrowserFs(): BrowserFsCapability {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { opfs: false, directoryPicker: false };
  }
  const opfs = typeof navigator.storage?.getDirectory === "function";
  const directoryPicker =
    typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker ===
    "function";
  return { opfs, directoryPicker };
}

const OPFS_ROOT = "apostle-computer";

async function opfsThreadDir(threadId: string): Promise<DirHandle | null> {
  try {
    const storage = navigator.storage as { getDirectory?: () => Promise<DirHandle> };
    if (!storage.getDirectory) return null;
    const root = await storage.getDirectory();
    const app = await root.getDirectoryHandle(OPFS_ROOT, { create: true });
    return app.getDirectoryHandle(threadId.slice(0, 80) || "default", { create: true });
  } catch {
    return null;
  }
}

/** Mirror a server VFS file into Origin Private File System (best-effort). */
export async function mirrorToOpfs(
  threadId: string,
  path: string,
  content: string,
): Promise<{ ok: boolean; error?: string }> {
  const dir = await opfsThreadDir(threadId);
  if (!dir) return { ok: false, error: "OPFS not available in this browser." };
  try {
    const name = path.replace(/^\//, "").replace(/\//g, "__") || "root.txt";
    const handle = await dir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "OPFS write failed" };
  }
}

export async function listOpfsMirror(threadId: string): Promise<string[]> {
  const dir = await opfsThreadDir(threadId);
  if (!dir) return [];
  const names: string[] = [];
  try {
    if (!dir[Symbol.asyncIterator]) return [];
    for await (const [name] of dir as AsyncIterable<[string, { kind: string }]>) {
      names.push(name.replace(/__/g, "/"));
    }
  } catch {
    // Safari / older Chromium iteration differences
  }
  return names.sort();
}

export type ImportedFile = { path: string; content: string };

/**
 * Prompt the user to grant a directory (File System Access API),
 * then read text files (shallow) for import into the Computer VFS.
 */
export async function pickDirectoryImport(opts?: {
  maxFiles?: number;
  maxBytes?: number;
}): Promise<{ files: ImportedFile[]; error?: string }> {
  const maxFiles = opts?.maxFiles ?? 40;
  const maxBytes = opts?.maxBytes ?? 80_000;
  const w = window as unknown as {
    showDirectoryPicker?: (o?: { mode?: string }) => Promise<DirHandle>;
  };
  if (typeof w.showDirectoryPicker !== "function") {
    return {
      files: [],
      error:
        "File System Access API not available — use Chrome/Edge, or write files via the computer tool.",
    };
  }
  try {
    const handle = await w.showDirectoryPicker({ mode: "read" });
    const files: ImportedFile[] = [];
    if (!handle[Symbol.asyncIterator]) {
      return { files: [], error: "Directory iteration not supported." };
    }
    for await (const [name, entry] of handle as AsyncIterable<
      [string, FileHandle & { kind: string }]
    >) {
      if (files.length >= maxFiles) break;
      if (entry.kind !== "file") continue;
      if (name.startsWith(".")) continue;
      const file = await entry.getFile();
      if (file.size > maxBytes) continue;
      if (
        !/^text\/|json|javascript|typescript|markdown|svg|xml|csv|empty/i.test(file.type) &&
        !/\.(md|txt|json|ts|tsx|js|jsx|css|html|svg|csv|yml|yaml|toml|sh)$/i.test(name)
      ) {
        continue;
      }
      const content = await file.text();
      files.push({ path: `/${name}`, content: content.slice(0, maxBytes) });
    }
    if (!files.length) {
      return { files: [], error: "No small text files found in that folder." };
    }
    return { files };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Picker cancelled";
    if (/abort|cancel/i.test(msg)) return { files: [], error: "Folder grant cancelled." };
    return { files: [], error: msg };
  }
}
