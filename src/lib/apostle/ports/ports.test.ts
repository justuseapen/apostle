/**
 * Sovereignty ports — registry and stub behavior.
 * Run: node --experimental-strip-types --test src/lib/apostle/ports/ports.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultPorts, getPorts, setPortsForTests } from "./index.ts";

describe("apostle ports", () => {
  it("createDefaultPorts exposes all 13 surfaces", () => {
    const p = createDefaultPorts();
    const keys = [
      "identity",
      "entitlements",
      "gateway",
      "providers",
      "context",
      "workspace",
      "memory",
      "corpus",
      "agentRuntime",
      "skills",
      "export",
      "safety",
      "theme",
    ] as const;
    for (const k of keys) {
      assert.ok(k in p, `missing port ${k}`);
    }
    assert.ok(Array.isArray(p.providers));
    assert.ok(p.providers.length >= 1);
  });

  it("workspace + memory + skills stubs round-trip", async () => {
    const p = createDefaultPorts();
    const proj = await p.workspace.createProject("u1", "Demo");
    assert.equal(proj.name, "Demo");
    const listed = await p.workspace.listProjects("u1");
    assert.equal(listed.length, 1);

    const mem = await p.memory.upsert({
      userId: "u1",
      projectId: proj.id,
      scope: "project",
      text: "Prefers concise answers",
    });
    const mems = await p.memory.list("u1", proj.id);
    assert.ok(mems.some((m) => m.id === mem.id));

    const skill = await p.skills.upsert({
      userId: "u1",
      projectId: null,
      name: "Brief",
      description: "Keep replies short",
      instructions: "Reply in under three sentences.",
    });
    assert.ok((await p.skills.list("u1")).some((s) => s.id === skill.id));
  });

  it("agentRuntime stub enqueues missions", async () => {
    const p = createDefaultPorts();
    const m = await p.agentRuntime.enqueueMission({
      userId: "u1",
      projectId: null,
      threadId: null,
      title: "Research",
      brief: "Summarize docs",
    });
    assert.equal(m.status, "queued");
    assert.equal((await p.agentRuntime.getMission("u1", m.id))?.id, m.id);
  });

  it("export stub returns schema v1", async () => {
    const arch = await createDefaultPorts().export.buildArchive("u1");
    assert.equal(arch.schemaVersion, "1");
    assert.equal(arch.userId, "u1");
  });

  it("theme port lists public catalog only", () => {
    const themes = createDefaultPorts().theme.listPublicThemes();
    assert.ok(themes.includes("phosphor"));
    assert.ok(themes.includes("ink"));
    assert.ok(themes.includes("eapen"));
    assert.ok(!themes.includes("si" as never));
  });

  it("corpus stub returns empty (no private adapters in OSS)", async () => {
    const hits = await createDefaultPorts().corpus.search({ query: "test" });
    assert.deepEqual(hits, []);
  });

  it("getPorts caches a process registry", () => {
    setPortsForTests(null);
    const a = getPorts();
    const b = getPorts();
    assert.equal(a, b);
    setPortsForTests(null);
  });

  it("gateway stub engages failover notice when providers throw", async () => {
    const p = createDefaultPorts();
    const result = await p.gateway.completeTurn({
      userId: "u1",
      threadId: "t1",
      messages: [{ role: "user", content: "hello" }],
      modelId: "default",
    });
    assert.ok(result.text.length > 0);
    assert.ok(result.failoverNotice);
  });
});
