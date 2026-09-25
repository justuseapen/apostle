import type { ApostlePlugin } from "./types";

/** Safe arithmetic: numbers, + - * / ( ), decimals. No identifiers. */
const EXPR = /^[\d\s.+\-*/()]+$/;

export const calcPlugin: ApostlePlugin = {
  id: "calc",
  name: "Calculator",
  blurb: "Evaluate a simple arithmetic expression.",
  needs: { network: [], secrets: [], approval: false },
  tool: {
    type: "function",
    function: {
      name: "calc",
      description:
        "Evaluate a basic arithmetic expression using only numbers and + - * / ( ). Example: (12.5 + 3) * 2",
      parameters: {
        type: "object",
        properties: { expression: { type: "string" } },
        required: ["expression"],
      },
    },
  },
  async run(args) {
    const expression = (args.expression || "").trim();
    if (!expression) return "Provide an expression.";
    if (expression.length > 120) return "Expression is too long.";
    if (!EXPR.test(expression)) return "Only numbers and + - * / ( ) are allowed.";
    try {
      // Isolated Function — no scope access; expression already character-gated.
      const value = Function(`"use strict"; return (${expression});`)() as unknown;
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return "That did not evaluate to a finite number.";
      }
      return String(value);
    } catch {
      return "Could not evaluate that expression.";
    }
  },
};
