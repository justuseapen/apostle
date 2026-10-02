import type { Sql } from "../../db.ts";
import { createLocalAgentRuntime } from "./agent-runtime.ts";
import { createContextAssembler } from "./context-assembler.ts";
import { createExportStore } from "./export-store.ts";
import { createMemoryStore } from "./memory-store.ts";
import { createSkillsStore } from "./skills-store.ts";
import { createDefaultPorts } from "./stubs.ts";
import type { ApostlePorts } from "./types.ts";
import { createWorkspaceStore } from "./workspace-store.ts";

let cached: ApostlePorts | null = null;

/**
 * Process-wide ports (stubs by default — safe for unit tests).
 * App boot should call `installAppPorts(getSql)` once to mount SQL stores.
 */
export function getPorts(): ApostlePorts {
  if (!cached) cached = createDefaultPorts();
  return cached;
}

/**
 * Mount SQL-backed workspace / memory / skills / export / local AgentRuntime
 * (+ optional TrueForge via TRUEFORGE_BASE_URL) for real app processes.
 */
export function installAppPorts(getSql: () => Promise<Sql>): ApostlePorts {
  const memory = createMemoryStore(getSql);
  cached = createDefaultPorts({
    workspace: createWorkspaceStore(getSql),
    memory,
    context: createContextAssembler({ memory }),
    skills: createSkillsStore(getSql),
    export: createExportStore(getSql),
    agentRuntime: createLocalAgentRuntime(getSql),
  });
  return cached;
}

/** Test helper — replace the process registry. */
export function setPortsForTests(ports: ApostlePorts | null) {
  cached = ports;
}

export { createDefaultPorts } from "./stubs.ts";
