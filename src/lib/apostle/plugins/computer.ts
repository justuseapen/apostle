import type { ApostlePlugin } from "./types";
import { COMPUTER_BLURB, COMPUTER_LIMITS } from "../computer/limits.ts";

/**
 * Browser Computer — jailed VFS + constrained shell.
 * Tool name: computer · slash: /computer
 * Does not touch the host filesystem. Network: none (default deny).
 *
 * VFS/shell are dynamically imported so slash-skill unit tests can load this
 * module without resolving the DB layer (same pattern as create_missing).
 */
export const computerPlugin: ApostlePlugin = {
  id: "computer",
  name: "Computer",
  blurb: COMPUTER_BLURB,
  needs: { network: [], secrets: [], approval: false },
  tool: {
    type: "function",
    function: {
      name: "computer",
      description:
        "Browser-sandbox Computer: list/read/write files in a per-thread virtual workspace, or run a constrained shell command (ls, cat, echo, mkdir, rm, head, wc, find, help). Not a host terminal — no network, no real bash. Actions: list, read, write, run, info. Prefer this when the user wants files or a simple shell in chat.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description: "One of: list, read, write, run, info",
          },
          path: {
            type: "string",
            description: "Workspace path for list/read/write (e.g. /README.md).",
          },
          content: {
            type: "string",
            description: "File contents for write.",
          },
          command: {
            type: "string",
            description: "Shell command for action=run (e.g. ls, cat notes.txt, echo hi > a.txt).",
          },
        },
        required: ["action"],
      },
    },
  },
  async run(args, ctx) {
    if (!ctx?.userId) {
      return "Computer needs an operator session.";
    }
    const action = (args.action || "").trim().toLowerCase();
    if (action === "info" || action === "help" || action === "limits") {
      return COMPUTER_LIMITS;
    }

    const { workspaceRef, listWorkspace, readFile, writeFile } = await import("../computer/vfs.ts");
    const { runShell } = await import("../computer/shell.ts");
    const ws = workspaceRef(ctx.userId, ctx.threadId);

    if (action === "list" || action === "ls") {
      return listWorkspace(ws, args.path || "/");
    }
    if (action === "read" || action === "cat") {
      if (!args.path) return "read needs path.";
      return readFile(ws, args.path);
    }
    if (action === "write") {
      if (!args.path) return "write needs path.";
      return writeFile(ws, args.path, args.content ?? "");
    }
    if (action === "run" || action === "shell" || action === "exec") {
      return runShell(ws, args.command || args.path || "");
    }
    return `Unknown action "${action}". Use list, read, write, run, or info.`;
  },
};
