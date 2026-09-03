import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Context } from "@deepseek-ai/cordis";
import { CallId } from "@deepseek-ai/dsh-llm";
import SessionStore, { SessionId } from "@deepseek-ai/dsh-session";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";
import ApprovalService, { type ApprovalOutcome } from "@deepseek-ai/dsh-user-approval";

import { createDshRc5Adapter } from "../src/binding.js";
import {
  DSH_RC5_FEATURES,
  DSH_TESTED_BASELINE,
  requireAdapterFeatures,
} from "../src/feature-matrix.js";
import type { RuntimeEvent } from "../src/runtime-events.js";
import {
  createAgentFixture,
  createHarnessTestScope,
  type HarnessTestScope,
} from "./harness-runtime.js";

function digest(value: unknown): string {
  return `m4-042:${JSON.stringify(value)}`;
}

async function setupWithApproval(
  harness: HarnessTestScope,
  policy: "ask" | "never" = "ask",
) {
  await harness.ctx.plugin(SessionStore);
  await harness.ctx.plugin(SystemPrompt);
  await harness.ctx.plugin(ApprovalService, { policy });
  await harness.ctx.plugin(ToolRuntime);
  const ctx = await harness.inject(["sessions", "approval", "tools"]);
  return { ctx, adapter: createDshRc5Adapter(ctx, { digest }) };
}

async function setupWithoutApproval(harness: HarnessTestScope) {
  await harness.ctx.plugin(SessionStore);
  await harness.ctx.plugin(SystemPrompt);
  await harness.ctx.plugin(ToolRuntime);
  const ctx = await harness.inject(["sessions", "tools"]);
  return { ctx, adapter: createDshRc5Adapter(ctx, { digest }) };
}

function createOpenAgent(ctx: Context, sessionRef: string) {
  const session = ctx.sessions.create(SessionId(sessionRef));
  session.append("turn/start", { turn: 1 });
  return {
    session,
    agent: createAgentFixture(ctx, session),
  };
}

function registerStringTool(
  ctx: Context,
  name: string,
  onBody?: () => void,
): void {
  ctx.tools.register(defineTool({
    name,
    description: `M4-042 source-conformance tool ${name}`,
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

describe("M4-042 pinned rc5 native approval routing", () => {
  let harness: HarnessTestScope;

  beforeEach(async () => {
    harness = await createHarnessTestScope();
  });

  afterEach(async () => {
    await harness.dispose();
  });

  it("pins the supported approval feature contract", () => {
    expect(DSH_TESTED_BASELINE).toEqual({
      version: "0.1.0-rc.5",
      commit: "47f943859bef60e4160492346772ded9b24f765a",
    });
    expect(() => requireAdapterFeatures(DSH_RC5_FEATURES, [
      "toolsPreExecute",
      "approvalOneShot",
      "approvalFailClosed",
    ])).not.toThrow();
  });

  it("does not originate approval for safe-runtime ALLOW", async () => {
    const { ctx, adapter } = await setupWithApproval(harness);
    let approvalCalls = 0;
    let bodyCalls = 0;
    ctx.on("approval/request", () => {
      approvalCalls += 1;
      return Promise.resolve<ApprovalOutcome>("allowed-once");
    });
    registerStringTool(ctx, "m4_042_allow", () => { bodyCalls += 1; });
    adapter.registerToolPolicy(() => ({ kind: "ALLOW" }));

    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-042-allow"),
      name: "m4_042_allow",
      arguments: {},
    });

    expect(result.isError).toBe(false);
    expect(approvalCalls).toBe(0);
    expect(bodyCalls).toBe(1);
  });

  it("does not originate approval for safe-runtime DENY and prevents body entry", async () => {
    const { ctx, adapter } = await setupWithApproval(harness);
    let approvalCalls = 0;
    let bodyCalls = 0;
    ctx.on("approval/request", () => {
      approvalCalls += 1;
      return Promise.resolve<ApprovalOutcome>("allowed-once");
    });
    registerStringTool(ctx, "m4_042_deny", () => { bodyCalls += 1; });
    adapter.registerToolPolicy(() => ({ kind: "DENY", reason: "policy denied" }));

    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-042-deny"),
      name: "m4_042_deny",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(approvalCalls).toBe(0);
    expect(bodyCalls).toBe(0);
  });

  it("routes one reached ASK through exactly one native approval request with exact correlation", async () => {
    const { ctx, adapter } = await setupWithApproval(harness);
    const { session, agent } = createOpenAgent(ctx, "m4-042-allowed-session");
    const signal = new AbortController().signal;
    let approvalCalls = 0;
    let bodyCalls = 0;
    let projection: {
      readonly sameAgent: boolean;
      readonly toolName: string;
      readonly callId: string | undefined;
      readonly hasReason: boolean;
      readonly reason: string | undefined;
      readonly sameSignal: boolean;
    } | undefined;
    const normalizedEvents: RuntimeEvent[] = [];
    const observation = adapter.observe({
      accept: (event) => { normalizedEvents.push(event); },
    });

    ctx.on("approval/request", (request) => {
      approvalCalls += 1;
      projection = {
        sameAgent: request.agent === agent,
        toolName: request.toolName,
        callId: request.callId === undefined ? undefined : String(request.callId),
        hasReason: Object.hasOwn(request, "reason"),
        reason: request.reason,
        sameSignal: request.signal === signal,
      };
      return Promise.resolve<ApprovalOutcome>("allowed-once");
    });
    registerStringTool(ctx, "m4_042_native_ask", () => { bodyCalls += 1; });
    adapter.registerToolPolicy(() => ({
      kind: "ASK",
      reason: "exact approval reason",
    }));

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("m4-042-native-call"),
      name: "m4_042_native_ask",
      arguments: { opaque: true },
      agent,
    });
    await observation.drain();

    expect(result.isError).toBe(false);
    expect(bodyCalls).toBe(1);
    expect(approvalCalls).toBe(1);
    expect(projection).toEqual({
      sameAgent: true,
      toolName: "m4_042_native_ask",
      callId: "m4-042-native-call",
      hasReason: true,
      reason: "exact approval reason",
      sameSignal: true,
    });

    const asked = session.events.find((event) => event.type === "approval/asked");
    const decided = session.events.find((event) => event.type === "approval/decided");
    if (asked?.type !== "approval/asked" || decided?.type !== "approval/decided") {
      throw new Error("native ToolRuntime ASK did not persist one approval audit pair");
    }
    expect(asked.data.toolName).toBe("m4_042_native_ask");
    expect(asked.data.callId).toBe(CallId("m4-042-native-call"));
    expect(asked.data.reason).toBe("exact approval reason");
    expect(decided.data.id).toBe(asked.data.id);
    expect(decided.data.outcome).toBe("allowed-once");

    expect(normalizedEvents).toContainEqual(expect.objectContaining({
      type: "approval.decided",
      sessionRef: "m4-042-allowed-session",
      approvalRef: String(asked.data.id),
      callRef: "m4-042-native-call",
      outcome: "ALLOWED_ONCE",
    }));
    await observation.dispose();
  });

  it("preserves ASK reason omission on the native approval request", async () => {
    const { ctx, adapter } = await setupWithApproval(harness);
    const { session, agent } = createOpenAgent(ctx, "m4-042-no-reason-session");
    let hasReason = true;
    let bodyCalls = 0;
    ctx.on("approval/request", (request) => {
      hasReason = Object.hasOwn(request, "reason");
      return Promise.resolve<ApprovalOutcome>("allowed-once");
    });
    registerStringTool(ctx, "m4_042_no_reason", () => { bodyCalls += 1; });
    adapter.registerToolPolicy(() => ({ kind: "ASK" }));

    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-042-no-reason"),
      name: "m4_042_no_reason",
      arguments: {},
      agent,
    });

    expect(result.isError).toBe(false);
    expect(hasReason).toBe(false);
    expect(bodyCalls).toBe(1);
    const asked = session.events.find((event) => event.type === "approval/asked");
    if (asked?.type !== "approval/asked") throw new Error("missing approval/asked");
    expect(Object.hasOwn(asked.data, "reason")).toBe(false);
  });

  it("keeps allowed-once subject to the later monotonic guard", async () => {
    const { ctx, adapter } = await setupWithApproval(harness);
    const { agent } = createOpenAgent(ctx, "m4-042-guard-session");
    let approvalCalls = 0;
    let bodyCalls = 0;
    ctx.on("approval/request", () => {
      approvalCalls += 1;
      return Promise.resolve<ApprovalOutcome>("allowed-once");
    });
    registerStringTool(ctx, "m4_042_guard_after_approval", () => { bodyCalls += 1; });
    adapter.registerToolPolicy(() => ({ kind: "ASK", reason: "approval first" }));
    adapter.registerMonotonicToolGuard?.(() => ({
      kind: "DENY",
      reason: "hard invariant after approval",
    }));

    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-042-guard-after-approval"),
      name: "m4_042_guard_after_approval",
      arguments: {},
      agent,
    });

    expect(result.isError).toBe(true);
    expect(approvalCalls).toBe(1);
    expect(bodyCalls).toBe(0);
  });

  it("maps rejected to denial before dispatch", async () => {
    const { ctx, adapter } = await setupWithApproval(harness);
    const { agent } = createOpenAgent(ctx, "m4-042-rejected-session");
    let bodyCalls = 0;
    ctx.on("approval/request", () => Promise.resolve<ApprovalOutcome>("rejected"));
    registerStringTool(ctx, "m4_042_rejected", () => { bodyCalls += 1; });
    adapter.registerToolPolicy(() => ({ kind: "ASK" }));

    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-042-rejected"),
      name: "m4_042_rejected",
      arguments: {},
      agent,
    });

    expect(result.isError).toBe(true);
    expect(bodyCalls).toBe(0);
  });

  it("maps the real no-answer path to unavailable with one audit pair and no body entry", async () => {
    const { ctx, adapter } = await setupWithApproval(harness);
    const { session, agent } = createOpenAgent(ctx, "m4-042-unavailable-session");
    let bodyCalls = 0;
    registerStringTool(ctx, "m4_042_unavailable", () => { bodyCalls += 1; });
    adapter.registerToolPolicy(() => ({ kind: "ASK" }));

    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-042-unavailable"),
      name: "m4_042_unavailable",
      arguments: {},
      agent,
    });

    expect(result.isError).toBe(true);
    expect(bodyCalls).toBe(0);
    const audit = session.events.filter((event) => event.type.startsWith("approval/"));
    expect(audit).toHaveLength(2);
    const decided = audit[1];
    if (decided?.type !== "approval/decided") throw new Error("missing approval/decided");
    expect(decided.data.outcome).toBe("unavailable");
  });

  it("contains throwing and malformed answerers to unavailable without dispatch", async () => {
    const hostileCases: readonly {
      readonly suffix: string;
      readonly install: (ctx: Context) => void;
    }[] = [
      {
        suffix: "throw",
        install: (ctx) => {
          ctx.on("approval/request", () => Promise.reject(new Error("answerer failed")));
        },
      },
      {
        suffix: "malformed",
        install: (ctx) => {
          ctx.on("approval/request", () =>
            Promise.resolve("not-an-outcome" as unknown as ApprovalOutcome));
        },
      },
    ];

    for (const hostileCase of hostileCases) {
      const localHarness = await createHarnessTestScope();
      try {
        const { ctx, adapter } = await setupWithApproval(localHarness);
        const { session, agent } = createOpenAgent(
          ctx,
          `m4-042-${hostileCase.suffix}-session`,
        );
        let bodyCalls = 0;
        hostileCase.install(ctx);
        const toolName = `m4_042_${hostileCase.suffix}`;
        registerStringTool(ctx, toolName, () => { bodyCalls += 1; });
        adapter.registerToolPolicy(() => ({ kind: "ASK" }));

        const result = await ctx.tools.execute({
          signal: new AbortController().signal,
          callId: CallId(`m4-042-${hostileCase.suffix}`),
          name: toolName,
          arguments: {},
          agent,
        });

        expect(result.isError).toBe(true);
        expect(bodyCalls).toBe(0);
        const decided = session.events.find((event) => event.type === "approval/decided");
        if (decided?.type !== "approval/decided") throw new Error("missing approval/decided");
        expect(decided.data.outcome).toBe("unavailable");
      } finally {
        await localHarness.dispose();
      }
    }
  });

  it("keeps cancellation terminal when a late answer tries to allow", async () => {
    const { ctx, adapter } = await setupWithApproval(harness);
    const { session, agent } = createOpenAgent(ctx, "m4-042-cancelled-session");
    const controller = new AbortController();
    let bodyCalls = 0;
    ctx.on("approval/request", () => {
      controller.abort();
      return Promise.resolve<ApprovalOutcome>("allowed-once");
    });
    registerStringTool(ctx, "m4_042_cancelled", () => { bodyCalls += 1; });
    adapter.registerToolPolicy(() => ({ kind: "ASK" }));

    const result = await ctx.tools.execute({
      signal: controller.signal,
      callId: CallId("m4-042-cancelled"),
      name: "m4_042_cancelled",
      arguments: {},
      agent,
    });

    expect(result.isError).toBe(true);
    expect(bodyCalls).toBe(0);
    const decided = session.events.find((event) => event.type === "approval/decided");
    if (decided?.type !== "approval/decided") throw new Error("missing approval/decided");
    expect(decided.data.outcome).toBe("cancelled");
  });

  it("fails closed without an approval service and fabricates no approval audit", async () => {
    const { ctx, adapter } = await setupWithoutApproval(harness);
    const { session, agent } = createOpenAgent(ctx, "m4-042-service-absent-session");
    let bodyCalls = 0;
    registerStringTool(ctx, "m4_042_service_absent", () => { bodyCalls += 1; });
    adapter.registerToolPolicy(() => ({ kind: "ASK", reason: "approval required" }));

    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-042-service-absent"),
      name: "m4_042_service_absent",
      arguments: {},
      agent,
    });

    expect(result.isError).toBe(true);
    expect(bodyCalls).toBe(0);
    expect(session.events.filter((event) => event.type.startsWith("approval/"))).toEqual([]);
  });

  it("fails closed for an agent-less ASK without invoking approval", async () => {
    const { ctx, adapter } = await setupWithApproval(harness);
    let approvalCalls = 0;
    let bodyCalls = 0;
    ctx.on("approval/request", () => {
      approvalCalls += 1;
      return Promise.resolve<ApprovalOutcome>("allowed-once");
    });
    registerStringTool(ctx, "m4_042_agentless", () => { bodyCalls += 1; });
    adapter.registerToolPolicy(() => ({ kind: "ASK" }));

    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-042-agentless"),
      name: "m4_042_agentless",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(approvalCalls).toBe(0);
    expect(bodyCalls).toBe(0);
  });

  it("applies approval policy never before answerer dispatch and records rejected", async () => {
    const { ctx, adapter } = await setupWithApproval(harness, "never");
    const { session, agent } = createOpenAgent(ctx, "m4-042-never-session");
    let answererCalls = 0;
    let bodyCalls = 0;
    ctx.on("approval/request", () => {
      answererCalls += 1;
      return Promise.resolve<ApprovalOutcome>("allowed-once");
    });
    registerStringTool(ctx, "m4_042_never", () => { bodyCalls += 1; });
    adapter.registerToolPolicy(() => ({ kind: "ASK" }));

    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-042-never"),
      name: "m4_042_never",
      arguments: {},
      agent,
    });

    expect(result.isError).toBe(true);
    expect(answererCalls).toBe(0);
    expect(bodyCalls).toBe(0);
    const decided = session.events.find((event) => event.type === "approval/decided");
    if (decided?.type !== "approval/decided") throw new Error("missing approval/decided");
    expect(decided.data.outcome).toBe("rejected");
  });

  it("preserves ApprovalService open-turn precondition without dispatch", async () => {
    const { ctx, adapter } = await setupWithApproval(harness);
    const session = ctx.sessions.create(SessionId("m4-042-closed-turn-session"));
    const agent = createAgentFixture(ctx, session);
    let answererCalls = 0;
    let bodyCalls = 0;
    ctx.on("approval/request", () => {
      answererCalls += 1;
      return Promise.resolve<ApprovalOutcome>("allowed-once");
    });
    registerStringTool(ctx, "m4_042_closed_turn", () => { bodyCalls += 1; });
    adapter.registerToolPolicy(() => ({ kind: "ASK" }));

    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-042-closed-turn"),
      name: "m4_042_closed_turn",
      arguments: {},
      agent,
    });

    expect(result.isError).toBe(true);
    expect(answererCalls).toBe(0);
    expect(bodyCalls).toBe(0);
    expect(session.events.filter((event) => event.type.startsWith("approval/"))).toEqual([]);
  });

  it("allows an earlier pre-execute listener to terminate before safe-runtime ASK", async () => {
    const { ctx, adapter } = await setupWithApproval(harness);
    const { agent } = createOpenAgent(ctx, "m4-042-earlier-session");
    let safeRuntimeCalls = 0;
    let approvalCalls = 0;
    let bodyCalls = 0;
    registerStringTool(ctx, "m4_042_earlier", () => { bodyCalls += 1; });
    ctx.on("tools/pre-execute", () =>
      Promise.resolve({ kind: "deny" as const, reason: "earlier boundary" }));
    adapter.registerToolPolicy(() => {
      safeRuntimeCalls += 1;
      return { kind: "ASK" };
    });
    ctx.on("approval/request", () => {
      approvalCalls += 1;
      return Promise.resolve<ApprovalOutcome>("allowed-once");
    });

    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-042-earlier"),
      name: "m4_042_earlier",
      arguments: {},
      agent,
    });

    expect(result.isError).toBe(true);
    expect(safeRuntimeCalls).toBe(0);
    expect(approvalCalls).toBe(0);
    expect(bodyCalls).toBe(0);
  });

  it("allows an outer waterfall listener to replace a downstream ASK before native approval", async () => {
    const { ctx, adapter } = await setupWithApproval(harness);
    const { agent } = createOpenAgent(ctx, "m4-042-replaced-session");
    let outerCalls = 0;
    let approvalCalls = 0;
    let bodyCalls = 0;
    registerStringTool(ctx, "m4_042_replaced", () => { bodyCalls += 1; });
    ctx.on("tools/pre-execute", async (_exec, next) => {
      outerCalls += 1;
      const downstream = await next();
      expect(downstream).toEqual({ kind: "ask", reason: "downstream ask" });
      return { kind: "deny" as const, reason: "outer replaced ask" };
    });
    adapter.registerToolPolicy(() => ({ kind: "ASK", reason: "downstream ask" }));
    ctx.on("approval/request", () => {
      approvalCalls += 1;
      return Promise.resolve<ApprovalOutcome>("allowed-once");
    });

    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-042-replaced"),
      name: "m4_042_replaced",
      arguments: {},
      agent,
    });

    expect(result.isError).toBe(true);
    expect(outerCalls).toBe(1);
    expect(approvalCalls).toBe(0);
    expect(bodyCalls).toBe(0);
  });
});
