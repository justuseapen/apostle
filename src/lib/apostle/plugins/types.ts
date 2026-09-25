/**
 * Frozen plugin contract.
 *
 * To add a plugin: create a file that exports an ApostlePlugin, then register
 * it in ./index.ts. Do not edit the chat harness (server.ts) for tool wiring.
 *
 * Default is deny: declare network / secrets / approvals on the plugin.
 * Core refuses anything not declared.
 *
 * Optional PluginRunContext carries the operator session when a tool needs
 * durable per-user writes (e.g. create_missing → gaps table). Most tools ignore it.
 */
export type PluginNeeds = {
  /** Outbound network hosts the tool may call. Empty = none. */
  network: string[];
  /** Secret env keys the tool may read. Empty = none. */
  secrets: string[];
  /** Whether a human must approve before this tool runs. */
  approval: boolean;
};

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
};

/** Request-scoped context passed from the chat harness into plugin.run. */
export type PluginRunContext = {
  userId: string;
};

export type ApostlePlugin = {
  id: string;
  name: string;
  blurb: string;
  needs: PluginNeeds;
  tool: ToolDefinition;
  run: (args: Record<string, string>, ctx?: PluginRunContext) => Promise<string>;
};
