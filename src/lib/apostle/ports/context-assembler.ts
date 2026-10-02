import type { AssembledContext, ChatMessage, ContextAssembler, MemoryPort } from "./types.ts";

/**
 * Builds the model-facing context from owned state.
 * Memory is injected into the system preamble so model switches stay lossless.
 */
export function createContextAssembler(deps: {
  memory: MemoryPort;
  systemBase?: string;
}): ContextAssembler {
  const systemBase =
    deps.systemBase ?? "You are Apostle. Be concise, concrete, and useful.";

  return {
    async assemble(input) {
      const memories = await deps.memory.list(input.userId, input.projectId);
      const memoryIds = memories.map((m) => m.id);
      const memoryBlock =
        memories.length === 0
          ? ""
          : [
              "",
              "User memory (editable by the user; honor unless they contradict it):",
              ...memories.map((m) => `- [${m.scope}] ${m.text}`),
            ].join("\n");

      const system = `${systemBase}${memoryBlock}`;
      const messages: ChatMessage[] = input.threadMessages;

      return {
        system,
        messages,
        memoryIds,
        citationIds: [],
      };
    },
  };
}
