import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Context } from "@deepseek-ai/cordis";
import { CallId } from "@deepseek-ai/dsh-llm";
import SessionStore, { SessionId } from "@deepseek-ai/dsh-session";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";

import { createDshRc5Adapter } from "../src/binding.js";
import {
  DSH_RC5_FEATURES,
  requireAdapterFeatures,
} from "../src/feature-matrix.js";
import type { ToolPolicyRequest } from "../src/ports.js";
import {
  createAgentFixture,
  createHarnessTestScope,
  type HarnessTestScope,
} from "./harness-runtime.js";

const signal = new AbortController().signal;

function digest(value: unknown): string {
  return `m4-040:${JSON.stringify(value)}`;
}

async function setupTools(harness: HarnessTestScope) {
  await harness.ctx.plugin(SystemPrompt);
  await harness.ctx.plugin(ToolRuntime);
  const ctx = await harness.inject(["tools"]);
  return {
    ctx,
    adapter: createDshRc5Adapter(ctx, { digest }),
  };
}

async function setupToolsAndSessions(harness: HarnessTestScope) {
  await harness.ctx.plugin(SessionStore);
  await harness.ctx.plugin(SystemPrompt);
  await harness.ctx.plugin(ToolRuntime);
  const ctx = await harness.inject(["sessions", "tools"]);
  return {
    ctx,
    adapter: createDshRc5Adapter(ctx, { digest }),
  };
}

function registerStringTool(
  ctx: Context,
  name: string,
  onBody?: () => void,
): void {
  ctx.tools.register(defineTool({
    name,
    description: `M4-040 source-conformance tool ${name}`,
    parameters: {},
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }],
    },
    async execute() {
      onBody?.();
      return "executed";
    },
  }));
}

describe("M4-040 pinned rc5 tools/pre-execute registration", () => {
  let harness: HarnessTestScope;

  beforeEach(async () => {
    harness = await createHarnessTestScope();
  });

  afterEach(async () => {
    await harness.dispose();
  });

  it("projects exact host call identity, tool name, and frozen Harness arguments", async () => {
    const { ctx, adapter } = await setupTools(harness);
    registerStringTool(ctx, "m4_040_host_projection");

    let observedHarnessArguments: unknown;
    ctx.on("tools/pre-execute", async (exec, next) => {
      observedHarnessArguments = exec.arguments;
      return next();
    });

    let request: Readonly<ToolPolicyRequest> | undefined;
    adapter.registerToolPolicy((value) => {
      request = value;
      return { kind: "DENY", reason: "projection captured" };
    });

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("m4-040-host-call"),
      name: "m4_040_host_projection",
      arguments: { path: "./opaque value" },
    });

    expect(result.isError).toBe(true);
    expect(request).toMatchObject({
      callRef: "m4-040-host-call",
      rootCallRef: "m4-040-host-call",
      toolName: "m4_040_host_projection",
      scope: { kind: "host" },
    });
    expect(request?.arguments).toBe(observedHarnessArguments);
    expect(Object.isFrozen(request?.arguments)).toBe(true);
    expect("turnRef" in (request ?? {})).toBe(false);
  });

  it("preserves nested root identity and exact agent scope without synthesizing extra authority", async () => {
    const { ctx, adapter } = await setupToolsAndSessions(harness);
    registerStringTool(ctx, "m4_040_agent_projection");

    const session = ctx.sessions.create(SessionId("m4-040-session"));
    const agent = createAgentFixture(ctx, session);
    let request: Readonly<ToolPolicyRequest> | undefined;

    adapter.registerToolPolicy((value) => {
      request = value;
      return { kind: "DENY", reason: "projection captured" };
    });

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("m4-040-child"),
      rootCallId: CallId("m4-040-root"),
      name: "m4_040_agent_projection",
      arguments: {},
      agent,
    });

    expect(result.isError).toBe(true);
    expect(request).toMatchObject({
      callRef: "m4-040-child",
      rootCallRef: "m4-040-root",
      toolName: "m4_040_agent_projection",
      scope: {
        kind: "agent",
        sessionRef: String(session.id),
        agentRef: String(agent.id),
      },
    });
    expect("subject" in (request ?? {})).toBe(false);
    expect("guaranteeLevel" in (request ?? {})).toBe(false);
  });

  it("treats safe-runtime ALLOW as delegation so a downstream listener can still deny", async () => {
    const { ctx, adapter } = await setupTools(harness);
    let bodyCalls = 0;
    let downstreamCalls = 0;
    registerStringTool(ctx, "m4_040_allow_delegate", () => { bodyCalls += 1; });

    adapter.registerToolPolicy(() => ({ kind: "ALLOW" }));
    ctx.on("tools/pre-execute", () => {
      downstreamCalls += 1;
      return Promise.resolve({ kind: "deny", reason: "downstream denied" });
    });

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("m4-040-allow-delegate"),
      name: "m4_040_allow_delegate",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(downstreamCalls).toBe(1);
    expect(bodyCalls).toBe(0);
  });

  it("short-circuits downstream listeners for safe-runtime DENY", async () => {
    const { ctx, adapter } = await setupTools(harness);
    let bodyCalls = 0;
    let downstreamCalls = 0;
    registerStringTool(ctx, "m4_040_deny_short_circuit", () => { bodyCalls += 1; });

    adapter.registerToolPolicy(() => ({ kind: "DENY", reason: "safe-runtime denied" }));
    ctx.on("tools/pre-execute", () => {
      downstreamCalls += 1;
      return Promise.resolve({ kind: "allow" });
    });

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("m4-040-deny-short-circuit"),
      name: "m4_040_deny_short_circuit",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(downstreamCalls).toBe(0);
    expect(bodyCalls).toBe(0);
  });

  it("short-circuits downstream listeners for safe-runtime ASK", async () => {
    const { ctx, adapter } = await setupTools(harness);
    let bodyCalls = 0;
    let downstreamCalls = 0;
    registerStringTool(ctx, "m4_040_ask_short_circuit", () => { bodyCalls += 1; });

    adapter.registerToolPolicy(() => ({ kind: "ASK", reason: "approval required" }));
    ctx.on("tools/pre-execute", () => {
      downstreamCalls += 1;
      return Promise.resolve({ kind: "allow" });
    });

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("m4-040-ask-short-circuit"),
      name: "m4_040_ask_short_circuit",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(downstreamCalls).toBe(0);
    expect(bodyCalls).toBe(0);
  });

  it("converts an async policy rejection to stable fail-closed denial without leaking the error", async () => {
    const { ctx, adapter } = await setupTools(harness);
    let bodyCalls = 0;
    let downstreamCalls = 0;
    registerStringTool(ctx, "m4_040_reject_fail_closed", () => { bodyCalls += 1; });

    adapter.registerToolPolicy(async () => {
      throw new Error("secret policy backend detail");
    });
    ctx.on("tools/pre-execute", () => {
      downstreamCalls += 1;
      return Promise.resolve({ kind: "allow" });
    });

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("m4-040-reject-fail-closed"),
      name: "m4_040_reject_fail_closed",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(downstreamCalls).toBe(0);
    expect(bodyCalls).toBe(0);
    expect(JSON.stringify(result)).not.toContain("secret policy backend detail");
  });

  it("demonstrates why reorderable pre-execute registration alone is not a hard enforcement boundary", async () => {
    const { ctx, adapter } = await setupTools(harness);
    let safeRuntimeCalls = 0;
    let bodyCalls = 0;
    registerStringTool(ctx, "m4_040_earlier_short_circuit", () => { bodyCalls += 1; });

    ctx.on("tools/pre-execute", () =>
      Promise.resolve({ kind: "deny", reason: "earlier listener stopped waterfall" }));
    adapter.registerToolPolicy(() => {
      safeRuntimeCalls += 1;
      return { kind: "ALLOW" };
    });

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("m4-040-earlier-short-circuit"),
      name: "m4_040_earlier_short_circuit",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(safeRuntimeCalls).toBe(0);
    expect(bodyCalls).toBe(0);
  });

  it("requires toolsPreExecute feature support explicitly rather than silently succeeding", () => {
    const unavailable = Object.freeze({
      ...DSH_RC5_FEATURES,
      toolsPreExecute: false,
    });

    expect(() => requireAdapterFeatures(unavailable, ["toolsPreExecute"]))
      .toThrow(/required DeepSeek Harness adapter features are unavailable: toolsPreExecute/);
  });
});
