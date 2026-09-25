import type { ApostlePlugin } from "./types";

export const clockPlugin: ApostlePlugin = {
  id: "get_time",
  name: "Clock",
  blurb: "Current time in a timezone.",
  needs: { network: [], secrets: [], approval: false },
  tool: {
    type: "function",
    function: {
      name: "get_time",
      description: "Return the current time in an IANA timezone. Default America/New_York.",
      parameters: {
        type: "object",
        properties: { timezone: { type: "string" } },
      },
    },
  },
  async run(args) {
    const tz = args.timezone || "America/New_York";
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        dateStyle: "full",
        timeStyle: "long",
      }).format(new Date());
    } catch {
      return `Unknown timezone: ${tz}`;
    }
  },
};
