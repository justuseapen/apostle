import type { ApostlePlugin } from "./types";

/**
 * Base64 encode / decode UTF-8 text. No network.
 * Uses Web APIs so the module stays safe to import from client slash catalogs.
 */
export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function decodeBase64(text: string): string {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export const base64Plugin: ApostlePlugin = {
  id: "base64",
  name: "Base64",
  blurb: "Encode or decode UTF-8 text as Base64.",
  needs: { network: [], secrets: [], approval: false },
  tool: {
    type: "function",
    function: {
      name: "base64",
      description:
        "Encode UTF-8 text to Base64, or decode Base64 to UTF-8. Actions: encode (default), decode. No network.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to encode, or Base64 to decode." },
          action: {
            type: "string",
            description: "encode | decode (default encode).",
          },
        },
        required: ["text"],
      },
    },
  },
  async run(args) {
    const text = args.text ?? "";
    if (!text) return "Provide text.";
    if (text.length > 50_000) return "Text is too long (max 50000 chars).";
    const action = (args.action || "encode").trim().toLowerCase();
    if (action === "encode") {
      return encodeBase64(text);
    }
    if (action === "decode") {
      try {
        if (!/^[A-Za-z0-9+/=\s]+$/.test(text)) {
          return "That does not look like Base64.";
        }
        return decodeBase64(text.replace(/\s+/g, ""));
      } catch {
        return "Could not decode that Base64.";
      }
    }
    return `Unknown action "${action}". Use encode or decode.`;
  },
};
