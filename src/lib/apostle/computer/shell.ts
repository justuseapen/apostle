/**
 * Constrained workspace shell — NOT a host terminal.
 * Parses a tiny command language against the Computer VFS only.
 * No pipes, no network, no process spawn, no host paths.
 */
import type { WorkspaceRef } from "./vfs.ts";
import * as vfs from "./vfs.ts";

export const SHELL_HELP = `Computer shell (browser sandbox — not your Mac):
  help
  pwd
  ls [path]
  cat <path>
  echo <text>              (also: echo text > file  |  echo text >> file)
  touch <path>
  mkdir [-p] <path>
  rm [-r|-rf] <path>
  cp <src> <dst>
  mv <src> <dst>
  grep [-i] <pattern> [path]
  head [-n N] <path>
  wc <path>
  find [path]
  clear                    (wipe this thread's workspace)

Limits: no pipes, no host FS, no network, no real processes.
Workspace is a jailed VFS per chat thread. At your own risk of data you import.`;

function tokenize(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) {
        out.push(cur);
        cur = "";
      }
      continue;
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

export async function runShell(ws: WorkspaceRef, command: string): Promise<string> {
  const line = (command || "").trim();
  if (!line) return "Provide a command. Try: help";
  if (line.length > 2000) return "Command too long.";

  // echo with redirect before general metachar checks
  const echoRedir = /^echo\s+([\s\S]*?)\s*(>>|>)\s*(\S+)\s*$/i.exec(line);
  if (echoRedir) {
    const text = echoRedir[1]!.replace(/^["']|["']$/g, "");
    const op = echoRedir[2]!;
    const path = echoRedir[3]!;
    return vfs.writeFile(ws, path, text + "\n", { append: op === ">>" });
  }

  if (/[|;&`$(){}<>]/.test(line) || /\b(sudo|curl|wget|npm|node|python|ssh|bash|sh|exec|chmod|chown|nc)\b/i.test(line)) {
    return "Blocked: that syntax is not allowed in the browser sandbox shell.";
  }

  const args = tokenize(line);
  const cmd = (args[0] || "").toLowerCase();

  switch (cmd) {
    case "help":
    case "?":
      return SHELL_HELP;
    case "pwd":
      return "/";
    case "ls":
      return vfs.listWorkspace(ws, args[1] || "/");
    case "cat":
      if (!args[1]) return "Usage: cat <path>";
      return vfs.readFile(ws, args[1]);
    case "touch":
      if (!args[1]) return "Usage: touch <path>";
      return vfs.writeFile(ws, args[1], "");
    case "mkdir": {
      const paths = args.slice(1).filter((a) => a !== "-p");
      if (!paths.length) return "Usage: mkdir [-p] <path>";
      const parts: string[] = [];
      for (const p of paths) parts.push(await vfs.mkdir(ws, p));
      return parts.join("\n");
    }
    case "rm": {
      const recursive = args.includes("-r") || args.includes("-rf") || args.includes("-fr");
      const paths = args.slice(1).filter((a) => !a.startsWith("-"));
      if (!paths.length) return "Usage: rm [-r] <path>";
      const parts: string[] = [];
      for (const p of paths) parts.push(await vfs.removePath(ws, p, recursive));
      return parts.join("\n");
    }
    case "echo": {
      const text = args.slice(1).join(" ");
      return text;
    }
    case "head": {
      let n = 10;
      let path = args[1];
      if (args[1] === "-n" && args[2]) {
        n = Math.min(200, Math.max(1, Number(args[2]) || 10));
        path = args[3];
      }
      if (!path) return "Usage: head [-n N] <path>";
      const content = await vfs.readFile(ws, path);
      if (content.startsWith("No such file") || content.startsWith("Cannot")) return content;
      return content.split("\n").slice(0, n).join("\n");
    }
    case "wc": {
      if (!args[1]) return "Usage: wc <path>";
      const content = await vfs.readFile(ws, args[1]);
      if (content.startsWith("No such file") || content.startsWith("Cannot")) return content;
      const lines = content.length ? content.split("\n").length : 0;
      const words = content.trim() ? content.trim().split(/\s+/).length : 0;
      return `${lines} ${words} ${content.length} ${args[1]}`;
    }
    case "find": {
      const root = args[1] || "/";
      const rows = await vfs.listFileRows(ws);
      const norm = root === "/" ? "/" : root;
      const hits = rows
        .map((r) => r.path)
        .filter((p) => (norm === "/" ? true : p === norm || p.startsWith(norm.replace(/\/$/, "") + "/")));
      return hits.length ? hits.join("\n") : "(none)";
    }
    case "cp": {
      if (!args[1] || !args[2]) return "Usage: cp <src> <dst>";
      return vfs.copyFile(ws, args[1], args[2]);
    }
    case "mv": {
      if (!args[1] || !args[2]) return "Usage: mv <src> <dst>";
      return vfs.moveFile(ws, args[1], args[2]);
    }
    case "grep": {
      const ignoreCase = args.includes("-i");
      const rest = args.slice(1).filter((a) => a !== "-i");
      const pattern = rest[0];
      const path = rest[1];
      if (!pattern) return "Usage: grep [-i] <pattern> [path]";
      return vfs.grepWorkspace(ws, pattern, { path, ignoreCase });
    }
    case "clear": {
      const n = await vfs.clearWorkspace(ws);
      return `Cleared workspace (${n} file(s) removed).`;
    }
    default:
      return `Unknown command: ${cmd}. Try: help`;
  }
}
