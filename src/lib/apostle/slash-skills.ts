import { browserPlugin } from "./plugins/browser.ts";
import { calcPlugin } from "./plugins/calc.ts";
import { clockPlugin } from "./plugins/clock.ts";
import { computerPlugin } from "./plugins/computer.ts";
import { createMissingPlugin } from "./plugins/create-missing.ts";
import { fetchPagePlugin } from "./plugins/fetch-page.ts";
import { hashPlugin } from "./plugins/hash.ts";
import type { ApostlePlugin } from "./plugins/types.ts";

/**
 * Slash skills for the chat composer.
 * Plugin entries mirror the installed registry (same plugins as plugins/index.ts).
 * desk/help are product actions.
 */
export type SlashSkill = {
  id: string;
  /** Command typed after `/` (e.g. "time") */
  command: string;
  label: string;
  blurb: string;
  /** Optional aliases that also match the filter */
  aliases?: string[];
} & (
  | { kind: "insert"; prompt: string }
  | { kind: "desk" }
  | { kind: "help" }
);

/** Keep aligned with `plugins/index.ts` PLUGINS list. */
const INSTALLED: ApostlePlugin[] = [
  clockPlugin,
  fetchPagePlugin,
  calcPlugin,
  createMissingPlugin,
  hashPlugin,
  computerPlugin,
  browserPlugin,
];

const PLUGIN_PROMPTS: Record<string, { command: string; aliases?: string[]; prompt: string }> = {
  get_time: {
    command: "time",
    aliases: ["get_time", "clock"],
    prompt: "What time is it right now? Use the get_time tool.",
  },
  fetch_page: {
    command: "fetch",
    aliases: ["fetch_page", "page"],
    prompt: "Fetch and summarize this page: https://",
  },
  calc: {
    command: "calc",
    aliases: ["calculator", "math"],
    prompt: "Calculate: ",
  },
  create_missing: {
    command: "missing",
    aliases: ["file_ask", "ask", "gap"],
    prompt:
      "File this Missing ask on the Desk with the create_missing tool: title \"",
  },
  hash: {
    command: "hash",
    aliases: ["sha256", "checksum", "digest"],
    prompt: "Hash this text with the hash tool (sha256): ",
  },
  computer: {
    command: "computer",
    aliases: ["shell", "fs", "workspace", "vfs"],
    prompt:
      "Use the computer tool (browser sandbox workspace). First call action info if unsure of limits, then list/read/write/run as needed: ",
  },
  browser: {
    command: "browse",
    aliases: ["browser", "screenshot", "web"],
    prompt:
      "Use the browser tool (allowlisted Playwright). Call action open with url https://example.com then snapshot. ",
  },
};
export function listSlashSkills(): SlashSkill[] {
  const fromPlugins: SlashSkill[] = INSTALLED.map((p) => {
    const preset = PLUGIN_PROMPTS[p.id] ?? {
      command: p.id,
      prompt: `Use the ${p.id} tool.`,
    };
    return {
      id: p.id,
      command: preset.command,
      aliases: preset.aliases,
      label: p.name,
      blurb: p.blurb,
      kind: "insert" as const,
      prompt: preset.prompt,
    };
  });

  return [
    ...fromPlugins,
    {
      id: "desk",
      command: "desk",
      label: "DESK",
      blurb: "Open gateway, models, and plugins.",
      kind: "desk",
    },
    {
      id: "help",
      command: "help",
      aliases: ["onboarding", "guide"],
      label: "HELP",
      blurb: "Re-open the first-run setup guide.",
      kind: "help",
    },
  ];
}

/** Active slash query: draft is `/` or `/filter` with no space yet. */
export function slashQuery(draft: string): string | null {
  const m = /^\/([^\s]*)$/.exec(draft);
  return m ? (m[1] ?? "") : null;
}

export function filterSlashSkills(query: string, skills = listSlashSkills()): SlashSkill[] {
  const q = query.toLowerCase();
  if (!q) return skills;
  return skills.filter((s) => {
    if (s.command.startsWith(q)) return true;
    if ((s.aliases ?? []).some((a) => a.toLowerCase().startsWith(q) || a.toLowerCase().includes(q))) {
      return true;
    }
    if (s.label.toLowerCase().includes(q)) return true;
    // Blurbs only for longer queries — avoids /ti matching "arithmetic"
    if (q.length >= 3 && s.blurb.toLowerCase().includes(q)) return true;
    return false;
  });
}
