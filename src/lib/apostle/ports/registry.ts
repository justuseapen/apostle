import { createDefaultPorts } from "./stubs.ts";
import type { ApostlePorts } from "./types.ts";
import { createWorkspaceStore } from "./workspace-store.ts";
import type { Sql } from "../../db.ts";

let cached: ApostlePorts | null = null;

/**
 * Process-wide ports (stubs by default — safe for unit tests).
 * App boot should call `installAppPorts(getSql)` once to mount the SQL workspace.
 */
export function getPorts(): ApostlePorts {
  if (!cached) cached = createDefaultPorts();
  return cached;
}

/** Mount SQL-backed WorkspaceStore for real app / preview processes. */
export function installAppPorts(getSql: () => Promise<Sql>): ApostlePorts {
  cached = createDefaultPorts({
    workspace: createWorkspaceStore(getSql),
  });
  return cached;
}

/** Test helper — replace the process registry. */
export function setPortsForTests(ports: ApostlePorts | null) {
  cached = ports;
}

export { createDefaultPorts } from "./stubs.ts";
