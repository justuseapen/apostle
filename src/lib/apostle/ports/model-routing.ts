/**
 * Model switch + floor failover — owned by the gateway plane.
 * Preferred (picker / thread) → router map label → floor / continuity.
 */

export type ModelRouteInput = {
  /** Explicit picker or threads.preferred_model_id. */
  preferredModelId?: string | null;
  /** Desk model_map[router label]. */
  routerModelId: string;
  /** Continuity / floor adapter model id. */
  floorModelId: string;
};

/** Deduped chain ending at floor. Empty inputs collapse to ["default"]. */
export function resolveModelChain(input: ModelRouteInput): string[] {
  const chain: string[] = [];
  const push = (raw: string | null | undefined) => {
    const id = (raw ?? "").trim();
    if (!id) return;
    if (chain.includes(id)) return;
    chain.push(id);
  };
  push(input.preferredModelId);
  push(input.routerModelId);
  push(input.floorModelId);
  if (chain.length === 0) chain.push("default");
  return chain;
}

export function floorFailoverNotice(failedModelId: string, floorModelId: string): string {
  return `Primary model ${failedModelId} failed — continuing on floor model ${floorModelId}.`;
}

export function providerFailoverNotice(failedLabel: string, nextLabel: string): string {
  return `Provider ${failedLabel} failed — trying ${nextLabel}.`;
}

export type FailoverPick<T> = {
  result: T;
  modelId: string;
  failoverNotice: string | null;
  /** Index in the chain that succeeded. */
  attemptIndex: number;
};

/**
 * Try each model id in order. First success wins; notice set when not the first attempt.
 */
export async function pickFailoverResult<T>(
  chain: string[],
  attempt: (modelId: string, index: number) => Promise<T>,
): Promise<FailoverPick<T>> {
  if (chain.length === 0) {
    throw new Error("model_chain_empty");
  }
  let lastError: unknown = null;
  for (let i = 0; i < chain.length; i++) {
    const modelId = chain[i]!;
    try {
      const result = await attempt(modelId, i);
      return {
        result,
        modelId,
        failoverNotice:
          i === 0
            ? null
            : floorFailoverNotice(chain[0]!, modelId),
        attemptIndex: i,
      };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? "all_models_failed"));
}

/** Resolve floor id from desk map / env without naming customer SKUs. */
export function resolveFloorModelId(input: {
  modelMapFloor?: string | null;
  envFloor?: string | null;
  fallback?: string;
}): string {
  const fromMap = (input.modelMapFloor ?? "").trim();
  if (fromMap) return fromMap;
  const fromEnv = (input.envFloor ?? "").trim();
  if (fromEnv) return fromEnv;
  return (input.fallback ?? "floor").trim() || "floor";
}
