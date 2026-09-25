import { createHash } from "node:crypto";
import type { ApostlePlugin } from "./types";

/**
 * Example third-party-style plugin — no network, no secrets, no harness edits.
 * Copy this file as a scaffold: types → register in index.ts → slash prompt → Desk enable → test.
 */
const ALGOS = ["sha256", "sha1", "md5"] as const;
type Algo = (typeof ALGOS)[number];

function isAlgo(value: string): value is Algo {
  return (ALGOS as readonly string[]).includes(value);
}

export function digestText(text: string, algorithm: Algo = "sha256"): string {
  return createHash(algorithm).update(text, "utf8").digest("hex");
}

export const hashPlugin: ApostlePlugin = {
  id: "hash",
  name: "Hash",
  blurb: "SHA-256 / SHA-1 / MD5 digest of text. Example third-party-style plugin.",
  needs: { network: [], secrets: [], approval: false },
  tool: {
    type: "function",
    function: {
      name: "hash",
      description:
        "Return a hex digest of text. Algorithms: sha256 (default), sha1, md5. No network. Prefer when the user wants a checksum or fingerprint of a string.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to hash." },
          algorithm: {
            type: "string",
            description: "sha256 | sha1 | md5 (default sha256).",
          },
        },
        required: ["text"],
      },
    },
  },
  async run(args) {
    const text = args.text ?? "";
    if (!text) return "Provide text to hash.";
    if (text.length > 50_000) return "Text is too long (max 50000 chars).";
    const raw = (args.algorithm || "sha256").trim().toLowerCase();
    if (!isAlgo(raw)) {
      return `Unknown algorithm "${raw}". Use sha256, sha1, or md5.`;
    }
    const hex = digestText(text, raw);
    return `${raw}: ${hex}`;
  },
};
