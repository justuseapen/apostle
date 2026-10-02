/**
 * Apostle sovereignty / product-plane ports.
 *
 * Apostle owns these surfaces. Enterprise adapters mount privately
 * (gitignored overlay or private package) — never commit customer brand,
 * SSO, corpus, or plan SKUs into this repository.
 *
 * TrueForge (optional) implements AgentRuntimePort below the gateway only.
 * See docs/ports.md and docs/v1-roadmap.md.
 */

/** Authenticated principal for desk / chat. */
export type ApostleIdentity = {
  userId: string;
  email: string | null;
  displayName: string | null;
};

export type IdentityPort = {
  /** Resolve the current request identity, or null if signed out. */
  resolveCurrent(): Promise<ApostleIdentity | null>;
};

/** Plan / feature gates — OSS default is open; enterprise adapters restrict. */
export type EntitlementFlags = {
  unlimitedHistory: boolean;
  missionsPerMonth: number;
  scheduledPrompts: number;
  modelArena: boolean;
  exportEnabled: boolean;
};

export type EntitlementsPort = {
  forUser(userId: string): Promise<EntitlementFlags>;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** Model that produced this message, when known. */
  modelId?: string | null;
};

export type ProviderHealth = "healthy" | "degraded" | "down" | "unknown";

export type ProviderAdapter = {
  id: string;
  label: string;
  health(): Promise<ProviderHealth>;
  /**
   * Stream or complete a turn. Stubs may throw "not_implemented".
   * Real adapters normalize tool calls to Apostle's plugin shape later.
   */
  complete(input: {
    messages: ChatMessage[];
    modelId: string;
    signal?: AbortSignal;
  }): Promise<{ text: string; modelId: string }>;
};

export type GatewayTurnRequest = {
  userId: string;
  threadId: string;
  messages: ChatMessage[];
  /** Preferred model; gateway may failover. */
  modelId?: string | null;
};

export type GatewayTurnResult = {
  text: string;
  modelId: string;
  /** Set when failover engaged (plain language for the client). */
  failoverNotice?: string | null;
  providerId: string;
};

export type GatewayPort = {
  /**
   * Owned control point: entitlements + safety + route + meter.
   * Must not delegate authz to an external harness.
   */
  completeTurn(req: GatewayTurnRequest): Promise<GatewayTurnResult>;
  listProviders(): Promise<ProviderAdapter[]>;
};

export type AssembledContext = {
  system: string;
  messages: ChatMessage[];
  memoryIds: string[];
  citationIds: string[];
};

export type ContextAssembler = {
  assemble(input: {
    userId: string;
    projectId: string | null;
    threadMessages: ChatMessage[];
    modelId: string;
  }): Promise<AssembledContext>;
};

export type Project = {
  id: string;
  userId: string;
  name: string;
  defaultModelId: string | null;
  createdAt: string;
};

export type PromptLibraryItem = {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  body: string;
};

export type WorkspaceStore = {
  listProjects(userId: string): Promise<Project[]>;
  createProject(userId: string, name: string): Promise<Project>;
  listPrompts(userId: string, projectId?: string | null): Promise<PromptLibraryItem[]>;
  upsertPrompt(
    item: Omit<PromptLibraryItem, "id"> & { id?: string },
  ): Promise<PromptLibraryItem>;
  /** Attach or unfile a thread. Null projectId leaves the thread unfiled (valid for legacy rows). */
  attachThread(
    userId: string,
    threadId: string,
    projectId: string | null,
  ): Promise<void>;
  getThreadProjectId(userId: string, threadId: string): Promise<string | null>;
};

export type MemoryScope = "global" | "project";

export type MemoryItem = {
  id: string;
  userId: string;
  projectId: string | null;
  scope: MemoryScope;
  text: string;
  updatedAt: string;
};

export type MemoryPort = {
  list(userId: string, projectId?: string | null): Promise<MemoryItem[]>;
  upsert(item: Omit<MemoryItem, "id" | "updatedAt"> & { id?: string }): Promise<MemoryItem>;
  remove(userId: string, id: string): Promise<void>;
};

export type CorpusHit = {
  id: string;
  title: string;
  snippet: string;
  url: string | null;
  citedAt: string;
};

export type CorpusRetriever = {
  /**
   * Public-plane retrieval only. Private workspace data must never enter this path.
   * OSS stub returns []. Enterprise adapters mount privately.
   */
  search(input: {
    query: string;
    limit?: number;
  }): Promise<CorpusHit[]>;
};

export type MissionStatus = "queued" | "running" | "completed" | "failed";

export type Mission = {
  id: string;
  userId: string;
  projectId: string | null;
  threadId: string | null;
  title: string;
  status: MissionStatus;
  createdAt: string;
};

export type AgentRuntimePort = {
  /** Long-running work below the gateway (TrueForge or local stub). */
  enqueueMission(input: {
    userId: string;
    projectId: string | null;
    threadId: string | null;
    title: string;
    brief: string;
  }): Promise<Mission>;
  getMission(userId: string, id: string): Promise<Mission | null>;
  /** Mark a mission finished. Local runtime uses this; TrueForge may sync status. */
  completeMission(
    userId: string,
    id: string,
    status?: Extract<MissionStatus, "completed" | "failed">,
  ): Promise<Mission | null>;
};

export type Skill = {
  id: string;
  userId: string;
  projectId: string | null;
  name: string;
  description: string;
  instructions: string;
};

export type SkillsRegistry = {
  list(userId: string, projectId?: string | null): Promise<Skill[]>;
  upsert(skill: Omit<Skill, "id"> & { id?: string }): Promise<Skill>;
  remove(userId: string, id: string): Promise<void>;
};

export type ExportArchivePayload = {
  projects: Array<{
    id: string;
    name: string;
    defaultModelId: string | null;
    createdAt: string;
  }>;
  threads: Array<{
    id: string;
    title: string;
    projectId: string | null;
    preferredModelId?: string | null;
    createdAt: string;
  }>;
  messages: Array<{
    id: string;
    threadId: string;
    role: string;
    content: string;
    meta: string | null;
    createdAt: string;
  }>;
  memory: Array<{
    id: string;
    projectId: string | null;
    scope: string;
    text: string;
    updatedAt: string;
  }>;
  prompts: Array<{
    id: string;
    projectId: string | null;
    title: string;
    body: string;
    createdAt: string;
  }>;
  skills: Array<{
    id: string;
    projectId: string | null;
    name: string;
    description: string;
    instructions: string;
  }>;
  files: Array<{
    id: string;
    projectId: string;
    name: string;
    mime: string | null;
    sizeBytes: number;
    storageKey: string;
    createdAt: string;
  }>;
};

export type ExportArchive = {
  schemaVersion: "1";
  createdAt: string;
  userId: string;
  /** Open schema v1 collections — see docs/export-schema-v1.md. */
  payload: ExportArchivePayload;
};

export type ExportPort = {
  buildArchive(userId: string): Promise<ExportArchive>;
};

export type SafetyVerdict = {
  allowed: boolean;
  reason: string | null;
};

export type SafetyPort = {
  /** Gateway-owned screening applied identically across models. */
  screen(input: { userId: string; text: string }): Promise<SafetyVerdict>;
};

/** Public theme ids only in OSS; private skins via overlay. */
export type ThemePort = {
  listPublicThemes(): readonly string[];
  resolveDefault(): string;
};

export type ApostlePorts = {
  identity: IdentityPort;
  entitlements: EntitlementsPort;
  gateway: GatewayPort;
  providers: ProviderAdapter[];
  context: ContextAssembler;
  workspace: WorkspaceStore;
  memory: MemoryPort;
  corpus: CorpusRetriever;
  agentRuntime: AgentRuntimePort;
  skills: SkillsRegistry;
  export: ExportPort;
  safety: SafetyPort;
  theme: ThemePort;
};
