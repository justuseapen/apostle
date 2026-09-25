import type { ApostlePlugin } from "./types";

/**
 * File an ask on the Desk Missing list (roadmap the operator has not built).
 * Tool name: create_missing · slash: /missing · alias file_ask.
 *
 * Upsert is dynamically imported so slash-skill unit tests can load this module
 * without resolving the DB layer.
 */
export const createMissingPlugin: ApostlePlugin = {
  id: "create_missing",
  name: "File ask",
  blurb: "Add a Missing roadmap row on the Desk (title + optional detail).",
  needs: { network: [], secrets: [], approval: false },
  tool: {
    type: "function",
    function: {
      name: "create_missing",
      description:
        "File a Missing ask on the operator Desk roadmap when the user wants a capability that is not built yet. Also called file_ask. Use when the user says to log, file, or add a missing feature/ask. Args: title (short capability name), optional detail (example or why), optional priority (now|next|later|spike).",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short capability name for the Missing list (e.g. Sandbox workspace computer).",
          },
          detail: {
            type: "string",
            description: "Optional example ask or why it matters.",
          },
          priority: {
            type: "string",
            description: "Optional roadmap bucket: now, next, later, or spike.",
          },
        },
        required: ["title"],
      },
    },
  },
  async run(args, ctx) {
    if (!ctx?.userId) {
      return "Cannot file a Missing ask without an operator session.";
    }
    const title = (args.title || "").trim();
    if (title.length < 2) {
      return "Need a title for the Missing ask (at least 2 characters).";
    }
    const detail = (args.detail || "").trim();
    const priority = (args.priority || "").trim().toLowerCase();
    const note =
      priority && ["now", "next", "later", "spike"].includes(priority)
        ? `Priority: ${priority}`
        : "";
    const { upsertGap } = await import("../gaps.ts");
    const result = await upsertGap({
      userId: ctx.userId,
      title,
      example: detail || `Filed via create_missing: ${title}`,
      note,
    });
    if (!result) {
      return `Skipped — “${title}” was dismissed on the Desk, or the title was empty.`;
    }
    if (result.created) {
      return `Filed on Desk → Missing: “${result.title}”. Open /admin to see the roadmap.`;
    }
    return `Updated Desk → Missing: “${result.title}” (hit count +1). Open /admin to see the roadmap.`;
  },
};
