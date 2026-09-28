import type { ApostlePlugin } from "./types";

/**
 * Datetime / timezone helper — current wall clock or format a given ISO instant
 * in one or two IANA zones. No network.
 */
function formatInZone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "full",
    timeStyle: "long",
  }).format(date);
}

export const clockPlugin: ApostlePlugin = {
  id: "get_time",
  name: "Clock",
  blurb: "Current or given time in IANA timezones (format / convert).",
  needs: { network: [], secrets: [], approval: false },
  tool: {
    type: "function",
    function: {
      name: "get_time",
      description:
        "Return the current time, or format an ISO-8601 instant, in an IANA timezone. Optionally also show a second zone for conversion. Default timezone America/New_York. Prefer when the user asks what time it is, for timezone conversion, or to format a timestamp.",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "Primary IANA timezone (default America/New_York).",
          },
          at: {
            type: "string",
            description:
              "Optional ISO-8601 instant to format (e.g. 2026-09-28T15:00:00Z). Default: now.",
          },
          also_timezone: {
            type: "string",
            description: "Optional second IANA timezone to show alongside the primary.",
          },
        },
      },
    },
  },
  async run(args) {
    const tz = (args.timezone || "America/New_York").trim() || "America/New_York";
    let date: Date;
    if (args.at?.trim()) {
      date = new Date(args.at.trim());
      if (Number.isNaN(date.getTime())) {
        return `Could not parse instant: ${args.at}`;
      }
    } else {
      date = new Date();
    }

    const lines: string[] = [];
    try {
      lines.push(`${tz}: ${formatInZone(date, tz)}`);
    } catch {
      return `Unknown timezone: ${tz}`;
    }

    const also = args.also_timezone?.trim();
    if (also) {
      try {
        lines.push(`${also}: ${formatInZone(date, also)}`);
      } catch {
        return `Unknown timezone: ${also}`;
      }
    }

    lines.push(`UTC: ${date.toISOString()}`);
    return lines.join("\n");
  },
};
