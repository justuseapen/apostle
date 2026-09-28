import type { ApostlePlugin } from "./types";

/**
 * Pretty-print, minify, or validate JSON. No network.
 */
export function formatJson(text: string, action: "pretty" | "minify" | "validate"): string {
  const parsed = JSON.parse(text) as unknown;
  if (action === "validate") {
    return "valid JSON";
  }
  if (action === "minify") {
    return JSON.stringify(parsed);
  }
  return JSON.stringify(parsed, null, 2);
}

export const jsonFormatPlugin: ApostlePlugin = {
  id: "json_format",
  name: "JSON",
  blurb: "Pretty-print, minify, or validate JSON text.",
  needs: { network: [], secrets: [], approval: false },
  tool: {
    type: "function",
    function: {
      name: "json_format",
      description:
        "Pretty-print, minify, or validate a JSON string. Actions: pretty (default), minify, validate. No network. Prefer when the user pastes JSON to format or check.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "JSON text to process." },
          action: {
            type: "string",
            description: "pretty | minify | validate (default pretty).",
          },
        },
        required: ["text"],
      },
    },
  },
  async run(args) {
    const text = (args.text ?? "").trim();
    if (!text) return "Provide JSON text.";
    if (text.length > 100_000) return "Text is too long (max 100000 chars).";
    const raw = (args.action || "pretty").trim().toLowerCase();
    if (raw !== "pretty" && raw !== "minify" && raw !== "validate") {
      return `Unknown action "${raw}". Use pretty, minify, or validate.`;
    }
    try {
      return formatJson(text, raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "parse error";
      return `Invalid JSON: ${msg}`;
    }
  },
};
