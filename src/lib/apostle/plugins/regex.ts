import type { ApostlePlugin } from "./types";

/**
 * Test a JavaScript regex against text. No network.
 * Length-capped; flags limited to gimsuy.
 */
const FLAG_OK = /^[gimsuy]*$/;

export function runRegex(
  pattern: string,
  text: string,
  flags = "",
): { ok: true; matched: boolean; matches: string[] } | { ok: false; error: string } {
  if (!pattern) return { ok: false, error: "Provide a pattern." };
  if (pattern.length > 500) return { ok: false, error: "Pattern is too long (max 500)." };
  if (text.length > 50_000) return { ok: false, error: "Text is too long (max 50000)." };
  if (!FLAG_OK.test(flags)) {
    return { ok: false, error: "Flags may only include g i m s u y." };
  }
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid pattern";
    return { ok: false, error: msg };
  }
  if (!flags.includes("g")) {
    const m = text.match(re);
    if (!m) return { ok: true, matched: false, matches: [] };
    return { ok: true, matched: true, matches: [m[0], ...m.slice(1)] };
  }
  const matches: string[] = [];
  for (const m of text.matchAll(re)) {
    matches.push(m[0]);
    if (matches.length >= 50) break;
  }
  return { ok: true, matched: matches.length > 0, matches };
}

export const regexPlugin: ApostlePlugin = {
  id: "regex",
  name: "Regex",
  blurb: "Test a JavaScript regex against text (match / groups).",
  needs: { network: [], secrets: [], approval: false },
  tool: {
    type: "function",
    function: {
      name: "regex",
      description:
        "Test a JavaScript regular expression against text. Returns whether it matched and up to 50 matches (or capture groups for non-global). Flags: gimsuy. No network.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Regex pattern (without surrounding / /)." },
          text: { type: "string", description: "Haystack text to test against." },
          flags: {
            type: "string",
            description: "Optional flags: g i m s u y (default empty).",
          },
        },
        required: ["pattern", "text"],
      },
    },
  },
  async run(args) {
    const result = runRegex(args.pattern ?? "", args.text ?? "", (args.flags || "").trim());
    if (!result.ok) return result.error;
    if (!result.matched) return "no match";
    return `matched\n${result.matches.join("\n")}`;
  },
};
