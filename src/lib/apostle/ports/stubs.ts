import { isLocalGateway, resolveGateway } from "../gateway.ts";
import type {
  AgentRuntimePort,
  ApostlePorts,
  ContextAssembler,
  CorpusRetriever,
  EntitlementsPort,
  ExportPort,
  GatewayPort,
  IdentityPort,
  MemoryItem,
  MemoryPort,
  Mission,
  Project,
  PromptLibraryItem,
  ProviderAdapter,
  SafetyPort,
  Skill,
  SkillsRegistry,
  ThemePort,
  WorkspaceStore,
} from "./types.ts";

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** OSS identity stub — real Better Auth wiring lands in a later story. */
export function stubIdentity(): IdentityPort {
  return {
    async resolveCurrent() {
      return null;
    },
  };
}

/** Open entitlements — enterprise adapters tighten privately. */
export function stubEntitlements(): EntitlementsPort {
  return {
    async forUser() {
      return {
        unlimitedHistory: true,
        missionsPerMonth: 10,
        scheduledPrompts: 5,
        modelArena: false,
        exportEnabled: true,
      };
    },
  };
}

export function stubProvider(id: string, label: string): ProviderAdapter {
  return {
    id,
    label,
    async health() {
      return "unknown";
    },
    async complete() {
      throw new Error("provider_not_implemented");
    },
  };
}

export function stubProviders(): ProviderAdapter[] {
  const resolved = resolveGateway({});
  const local = isLocalGateway(resolved.baseUrl);
  return [
    stubProvider(local ? "local" : "primary", local ? "Local OpenAI-compatible" : "Primary gateway"),
    stubProvider("floor", "Floor / continuity adapter"),
  ];
}

export function stubGateway(providers: ProviderAdapter[]): GatewayPort {
  return {
    async listProviders() {
      return providers;
    },
    async completeTurn(req) {
      const safety = stubSafety();
      const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
      const verdict = await safety.screen({
        userId: req.userId,
        text: lastUser?.content ?? "",
      });
      if (!verdict.allowed) {
        return {
          text: verdict.reason ?? "Blocked by safety policy.",
          modelId: req.modelId ?? "none",
          providerId: "safety",
          failoverNotice: null,
        };
      }

      const chain = providers;
      let notice: string | null = null;
      for (let i = 0; i < chain.length; i++) {
        const p = chain[i]!;
        try {
          const health = await p.health();
          if (health === "down") {
            notice = `Provider ${p.label} unavailable — trying next.`;
            continue;
          }
          // Stub providers throw; treat as failover until a real adapter exists.
          await p.complete({
            messages: req.messages,
            modelId: req.modelId ?? "default",
          });
        } catch {
          notice =
            i < chain.length - 1
              ? `Provider ${p.label} failed — trying next.`
              : "Running on floor / continuity adapter (stub).";
          if (i === chain.length - 1) {
            return {
              text: "[AgentRuntime / provider stub — wire a real ProviderAdapter]",
              modelId: req.modelId ?? "floor",
              providerId: p.id,
              failoverNotice: notice,
            };
          }
        }
      }
      return {
        text: "[no providers]",
        modelId: "none",
        providerId: "none",
        failoverNotice: notice,
      };
    },
  };
}

export function stubContext(): ContextAssembler {
  return {
    async assemble(input) {
      return {
        system: "You are Apostle. Be concise and useful.",
        messages: input.threadMessages,
        memoryIds: [],
        citationIds: [],
      };
    },
  };
}

export function stubWorkspace(): WorkspaceStore {
  const projects = new Map<string, Project[]>();
  const prompts = new Map<string, PromptLibraryItem[]>();
  const threadProjects = new Map<string, string | null>(); // `${userId}:${threadId}`
  return {
    async listProjects(userId) {
      return projects.get(userId) ?? [];
    },
    async createProject(userId, name) {
      const row: Project = {
        id: id("proj"),
        userId,
        name: name.trim().slice(0, 120) || "Untitled project",
        defaultModelId: null,
        createdAt: nowIso(),
      };
      const list = projects.get(userId) ?? [];
      list.push(row);
      projects.set(userId, list);
      return row;
    },
    async listPrompts(userId, projectId) {
      const all = prompts.get(userId) ?? [];
      if (projectId === undefined) return all;
      return all.filter((p) => p.projectId === projectId);
    },
    async upsertPrompt(item) {
      const row: PromptLibraryItem = {
        id: item.id ?? id("prm"),
        userId: item.userId,
        projectId: item.projectId,
        title: item.title.trim().slice(0, 160) || "Untitled prompt",
        body: item.body,
      };
      const list = prompts.get(item.userId) ?? [];
      const idx = list.findIndex((p) => p.id === row.id);
      if (idx >= 0) list[idx] = row;
      else list.push(row);
      prompts.set(item.userId, list);
      return row;
    },
    async attachThread(userId, threadId, projectId) {
      if (projectId) {
        const owned = (projects.get(userId) ?? []).some((p) => p.id === projectId);
        if (!owned) throw new Error("project_not_found");
      }
      threadProjects.set(`${userId}:${threadId}`, projectId);
    },
    async getThreadProjectId(userId, threadId) {
      const key = `${userId}:${threadId}`;
      if (!threadProjects.has(key)) return null;
      return threadProjects.get(key) ?? null;
    },
  };
}

export function stubMemory(): MemoryPort {
  const items = new Map<string, MemoryItem[]>();
  return {
    async list(userId, projectId) {
      const all = items.get(userId) ?? [];
      if (projectId === undefined) return all;
      if (projectId === null) return all.filter((m) => m.scope === "global");
      return all.filter((m) => m.projectId === projectId || m.scope === "global");
    },
    async upsert(item) {
      const row: MemoryItem = {
        id: item.id ?? id("mem"),
        userId: item.userId,
        projectId: item.projectId,
        scope: item.scope,
        text: item.text,
        updatedAt: nowIso(),
      };
      const list = items.get(item.userId) ?? [];
      const idx = list.findIndex((m) => m.id === row.id);
      if (idx >= 0) list[idx] = row;
      else list.push(row);
      items.set(item.userId, list);
      return row;
    },
    async remove(userId, memId) {
      const list = items.get(userId) ?? [];
      items.set(
        userId,
        list.filter((m) => m.id !== memId),
      );
    },
  };
}

export function stubCorpus(): CorpusRetriever {
  return {
    async search() {
      return [];
    },
  };
}

export function stubAgentRuntime(): AgentRuntimePort {
  const missions = new Map<string, Mission>();
  return {
    async enqueueMission(input) {
      const row: Mission = {
        id: id("msn"),
        userId: input.userId,
        projectId: input.projectId,
        threadId: input.threadId,
        title: input.title,
        status: "queued",
        createdAt: nowIso(),
      };
      missions.set(row.id, row);
      // In-process local path: mark complete immediately so OSS dogfood needs no harness.
      row.status = "completed";
      return row;
    },
    async getMission(userId, missionId) {
      const row = missions.get(missionId);
      if (!row || row.userId !== userId) return null;
      return row;
    },
    async completeMission(userId, missionId, status = "completed") {
      const row = missions.get(missionId);
      if (!row || row.userId !== userId) return null;
      row.status = status === "failed" ? "failed" : "completed";
      return row;
    },
  };
}

export function stubSkills(): SkillsRegistry {
  const skills = new Map<string, Skill[]>();
  return {
    async list(userId, projectId) {
      const all = skills.get(userId) ?? [];
      if (projectId === undefined) return all;
      return all.filter((s) => s.projectId === projectId || s.projectId === null);
    },
    async upsert(skill) {
      const row: Skill = {
        id: skill.id ?? id("skl"),
        userId: skill.userId,
        projectId: skill.projectId,
        name: skill.name,
        description: skill.description,
        instructions: skill.instructions,
      };
      const list = skills.get(skill.userId) ?? [];
      const idx = list.findIndex((s) => s.id === row.id);
      if (idx >= 0) list[idx] = row;
      else list.push(row);
      skills.set(skill.userId, list);
      return row;
    },
    async remove(userId, skillId) {
      const list = skills.get(userId) ?? [];
      skills.set(
        userId,
        list.filter((s) => s.id !== skillId),
      );
    },
  };
}

export function stubExport(): ExportPort {
  return {
    async buildArchive(userId) {
      return {
        schemaVersion: "1",
        createdAt: nowIso(),
        userId,
        payload: {
          projects: [],
          threads: [],
          messages: [],
          memory: [],
          prompts: [],
          skills: [],
          files: [],
        },
      };
    },
  };
}

export function stubSafety(): SafetyPort {
  return {
    async screen() {
      return { allowed: true, reason: null };
    },
  };
}

/** Keep in sync with PUBLIC_THEMES in src/lib/theme.tsx (avoid importing JSX into node tests). */
const PUBLIC_THEME_IDS = ["phosphor", "ink", "eapen"] as const;

export function stubTheme(): ThemePort {
  return {
    listPublicThemes() {
      return PUBLIC_THEME_IDS;
    },
    resolveDefault() {
      return "phosphor";
    },
  };
}

/** Default OSS port graph — safe stubs; swap adapters privately at deploy. */
export function createDefaultPorts(overrides: Partial<ApostlePorts> = {}): ApostlePorts {
  const providers = stubProviders();
  return {
    identity: stubIdentity(),
    entitlements: stubEntitlements(),
    providers,
    gateway: stubGateway(providers),
    context: stubContext(),
    workspace: stubWorkspace(),
    memory: stubMemory(),
    corpus: stubCorpus(),
    agentRuntime: stubAgentRuntime(),
    skills: stubSkills(),
    export: stubExport(),
    safety: stubSafety(),
    theme: stubTheme(),
    ...overrides,
  };
}
