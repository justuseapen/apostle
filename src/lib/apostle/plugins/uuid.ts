import type { ApostlePlugin } from "./types";

/**
 * Generate UUIDv4 values. No network. Pure Web Crypto.
 */
export function makeUuids(count = 1): string[] {
  const n = Math.min(Math.max(1, Math.floor(count)), 20);
  return Array.from({ length: n }, () => crypto.randomUUID());
}

export const uuidPlugin: ApostlePlugin = {
  id: "uuid",
  name: "UUID",
  blurb: "Generate UUIDv4 identifiers (1–20).",
  needs: { network: [], secrets: [], approval: false },
  tool: {
    type: "function",
    function: {
      name: "uuid",
      description:
        "Generate one or more random UUIDv4 strings. No network. Prefer when the user needs an id, token placeholder, or unique key.",
      parameters: {
        type: "object",
        properties: {
          count: {
            type: "string",
            description: "How many UUIDs to generate (1–20, default 1).",
          },
        },
      },
    },
  },
  async run(args) {
    const raw = (args.count || "1").trim();
    const count = Number.parseInt(raw, 10);
    if (!Number.isFinite(count) || count < 1) {
      return "Provide count as an integer from 1 to 20.";
    }
    if (count > 20) return "Count is too high (max 20).";
    return makeUuids(count).join("\n");
  },
};
