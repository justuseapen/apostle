import type { ApostlePlugin, PluginRunContext } from "./types";
import { browserPlugin } from "./browser";
import { calcPlugin } from "./calc";
import { clockPlugin } from "./clock";
import { computerPlugin } from "./computer";
import { createMissingPlugin } from "./create-missing";
import { fetchPagePlugin } from "./fetch-page";

/**
 * Registry. Add a plugin by importing it here — do not touch the chat harness.
 * Default plugin ids stay enabled for new operators (see settings default).
 */
const PLUGINS: ApostlePlugin[] = [
  clockPlugin,
  fetchPagePlugin,
  calcPlugin,
  createMissingPlugin,
  computerPlugin,
  browserPlugin,
];

const byId = new Map(PLUGINS.map((p) => [p.id, p]));
const byToolName = new Map(PLUGINS.map((p) => [p.tool.function.name, p]));

export function listPlugins(): ApostlePlugin[] {
  return PLUGINS;
}

export function catalogPlugins() {
  return PLUGINS.map((p) => ({
    id: p.id,
    name: p.name,
    blurb: p.blurb,
    needs: p.needs,
  }));
}

export function isKnownPluginId(id: string): boolean {
  return byId.has(id);
}

export function toolsFor(enabledIds: string[]) {
  return PLUGINS.filter((p) => enabledIds.includes(p.id)).map((p) => p.tool);
}

export async function runPluginTool(
  name: string,
  rawArgs: string,
  ctx?: PluginRunContext,
): Promise<string> {
  const plugin = byToolName.get(name);
  if (!plugin) return "Unknown tool.";
  let args: Record<string, string> = {};
  try {
    args = JSON.parse(rawArgs || "{}") as Record<string, string>;
  } catch {
    args = {};
  }
  return plugin.run(args, ctx);
}

/** Short list for the missing-capability classifier. */
export function installedCapabilityBlurb(): string {
  return PLUGINS.map((p) => `${p.name} (${p.tool.function.name})`).join(", ");
}

export { type ApostlePlugin, type PluginRunContext } from "./types";
