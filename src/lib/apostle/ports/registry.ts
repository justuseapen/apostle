import { createDefaultPorts } from "./stubs.ts";
import type { ApostlePorts } from "./types.ts";

let cached: ApostlePorts | null = null;

/** Process-wide default ports (stubs until wired to DB / TrueForge). */
export function getPorts(): ApostlePorts {
  if (!cached) cached = createDefaultPorts();
  return cached;
}

/** Test helper — replace the process registry. */
export function setPortsForTests(ports: ApostlePorts | null) {
  cached = ports;
}

export { createDefaultPorts } from "./stubs.ts";
