import { afterEach, beforeEach, describe, expect, it } from "vitest";
import AgentRegistry, { type Agent } from "@deepseek-ai/dsh-agent";
import { CallId } from "@deepseek-ai/dsh-llm";
import SessionStore, { SessionId } from "@deepseek-ai/dsh-session";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";
import ApprovalService, { type ApprovalOutcome } from "@deepseek-ai/dsh-user-approval";

import { createDshRc5Adapter } from "../src/binding.js";
import type {
  ApprovalDecidedEvent,
  RuntimeEvent,
  ToolCompletedEvent,
} from "../src/runtime-events.js";
import {
  createAgentFixture,
  createHarnessTestScope,
  type HarnessTestScope,
} from "./harness-runtime.js";

function digest(value: unknown): string {
  return `test:${JSON.stringify(value)}`;
}

function completedEvent(observed: readonly RuntimeEvent[], callRef: string): ToolCompletedEvent {
  const event = observed.find(
    (candidate): candidate is ToolCompletedEvent =>
      candidate.type === "tool.completed" && candidate.callRef === callRef,
  );
  if (event === undefined) throw new Error(`missing tool.completed for ${callRef}`);
  return event;
}

function approvalEvent(observed: readonly RuntimeEvent[], callRef: string): ApprovalDecidedEvent {
  const event = observed.find(
    (candidate): candidate is ApprovalDecidedEvent =>
      candidate.type === "approval.decided" && candidate.callRef === callRef,
  );
  if (event === undefined) throw new Error(`missing approval.decided for ${callRef}`);
  return event;
}

async function setupApprovalAgent(harness: HarnessTestScope, sessionId: string) {
  await harness.ctx.plugin(SessionStore);
  await harness.ctx.plugin(AgentRegistry);
  await harness.ctx.plugin(SystemPrompt);
  await harness.ctx.plugin(ApprovalService);
  const ctx = await harness.inject(["sessions", "agents", "approval"]);
  const session = ctx.sessions.create(SessionId(sessionId));
  session.append("turn/start", { turn: 1 });
  const agent = createAgentFixture(ctx, session) as Agent;
  ctx.agents.register(agent);
  return { ctx, session, agent, adapter: createDshRc5Adapter(ctx, { digest }) };
}

async function setupToolRuntime(harness: HarnessTestScope, sessionId: string, withApproval = false) {
  await harness.ctx.plugin(SessionStore);
  await harness.ctx.plugin(SystemPrompt);
  if (withApproval) await harness.ctx.plugin(ApprovalService);
  await harness.ctx.plugin(ToolRuntime);
  const dependencies = withApproval
    ? ["sessions", "tools", "approval"] as const
    : ["sessions", "tools"] as const;
  const ctx = await harness.inject(dependencies);
  const session = ctx.sessions.create(SessionId(sessionId));
  session.append("turn/start", { turn: 1 });
  const agent = createAgentFixture(ctx, session);
  return { ctx, session, agent, adapter: createDshRc5Adapter(ctx, { digest }) };
}

describe("DeepSeek Harness rc5 cancellation binding", () => {
  let harness: HarnessTestScope;

  beforeEach(async () => {
    harness = await createHarnessTestScope();
  });

  afterEach(async () => {
    await harness.dispose();
  });

  it("maps an explicitly aborted real approval request to CANCELLED with durable correlation", async () => {
    const { session, adapter } = await setupApprovalAgent(harness, "approval-cancelled");
    const controller = new AbortController();
    controller.abort();

    await expect(adapter.requestApproval({
      sessionRef: "approval-cancelled",
      callRef: "approval-cancelled-1",
      toolName: "write",
      signal: controller.signal,
    })).resolves.toBe("CANCELLED");

    const audit = session.events.filter(event => event.type.startsWith("approval/"));
    expect(audit).toHaveLength(2);
    const [asked, decided] = audit;
    if (asked?.type !== "approval/asked" || decided?.type !== "approval/decided") {
      throw new Error("cancelled approval did not persist one asked/decided pair");
    }
    expect(asked.data.callId).toBe(CallId("approval-cancelled-1"));
    expect(decided.data.id).toBe(asked.data.id);
    expect(decided.data.outcome).toBe("cancelled");
  });

  it("materializes ABORTED_BEFORE_DISPATCH without entering the registered body", async () => {
    const { ctx, agent, adapter } = await setupToolRuntime(harness, "cancel-before-dispatch");
    const observed: RuntimeEvent[] = [];
    const subscription = adapter.observe({ accept: event => { observed.push(event); } });
    let bodyCalls = 0;

    try {
      ctx.tools.register(defineTool({
        name: "cancel-before-dispatch-tool",
        description: "prove cancellation before body dispatch",
        parameters: {},
        output: {
          schema: { type: "string" },
          render: (_args, value) => [{ type: "text", text: value }],
        },
        async execute() {
          bodyCalls += 1;
          return "executed";
        },
      }));

      const controller = new AbortController();
      controller.abort();
      const result = await ctx.tools.execute({
        signal: controller.signal,
        callId: CallId("cancel-before-dispatch-1"),
        name: "cancel-before-dispatch-tool",
        arguments: {},
        agent,
      });
      await subscription.drain();

      expect(bodyCalls).toBe(0);
      expect(result.isError).toBe(true);
      expect(result.error?.info.code).toBe("ABORTED_BEFORE_DISPATCH");
      const completed = completedEvent(observed, "cancel-before-dispatch-1");
      expect(completed.outcome).toBe("cancelled");
      expect(completed.errorCode).toBe("ABORTED_BEFORE_DISPATCH");
      expect(completed.resultDigest).toBe(digest(result));
    } finally {
      await subscription.dispose();
    }
  });

  it("materializes ABORTED after a cooperatively settling body has entered", async () => {
    const { ctx, agent, adapter } = await setupToolRuntime(harness, "cancel-after-entry");
    const observed: RuntimeEvent[] = [];
    const subscription = adapter.observe({ accept: event => { observed.push(event); } });
    const controller = new AbortController();
    let bodyCalls = 0;
    let markEntered: (() => void) | undefined;
    const entered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });

    try {
      ctx.tools.register(defineTool({
        name: "cancel-after-entry-tool",
        description: "prove cancellation after body entry",
        parameters: {},
        output: {
          schema: { type: "string" },
          render: (_args, value) => [{ type: "text", text: value }],
        },
        async execute(_args, exec) {
          bodyCalls += 1;
          return await new Promise<string>((resolve) => {
            exec.signal.addEventListener("abort", () => resolve("settled-after-abort"), { once: true });
            markEntered?.();
          });
        },
      }));

      const execution = ctx.tools.execute({
        signal: controller.signal,
        callId: CallId("cancel-after-entry-1"),
        name: "cancel-after-entry-tool",
        arguments: {},
        agent,
      });
      await entered;
      controller.abort();
      const result = await execution;
      await subscription.drain();

      expect(bodyCalls).toBe(1);
      expect(result.isError).toBe(true);
      expect(result.error?.info.code).toBe("ABORTED");
      const completed = completedEvent(observed, "cancel-after-entry-1");
      expect(completed.outcome).toBe("cancelled");
      expect(completed.errorCode).toBe("ABORTED");
      expect(completed.resultDigest).toBe(digest(result));
    } finally {
      await subscription.dispose();
    }
  });

  it("uses explicit approval-cancelled correlation for the same call without broad error-code inference", async () => {
    const { ctx, session, agent, adapter } = await setupToolRuntime(
      harness,
      "approval-cancelled-tool",
      true,
    );
    const observed: RuntimeEvent[] = [];
    const subscription = adapter.observe({ accept: event => { observed.push(event); } });
    let bodyCalls = 0;

    try {
      ctx.tools.register(defineTool({
        name: "approval-cancelled-tool",
        description: "prove approval cancellation correlation",
        parameters: {},
        output: {
          schema: { type: "string" },
          render: (_args, value) => [{ type: "text", text: value }],
        },
        async execute() {
          bodyCalls += 1;
          return "executed";
        },
      }));
      ctx.on("approval/request", () => Promise.resolve<ApprovalOutcome>("cancelled"));
      adapter.registerToolPolicy(() => ({ kind: "ASK", reason: "requires approval" }));

      const result = await ctx.tools.execute({
        signal: new AbortController().signal,
        callId: CallId("approval-cancelled-tool-1"),
        name: "approval-cancelled-tool",
        arguments: {},
        agent,
      });
      await subscription.drain();

      expect(bodyCalls).toBe(0);
      expect(result.isError).toBe(true);
      expect(result.error?.info.code).not.toBe("ABORTED");
      expect(result.error?.info.code).not.toBe("ABORTED_BEFORE_DISPATCH");

      const audit = session.events.filter(event => event.type.startsWith("approval/"));
      expect(audit).toHaveLength(2);
      const [asked, decided] = audit;
      if (asked?.type !== "approval/asked" || decided?.type !== "approval/decided") {
        throw new Error("approval-cancelled tool did not persist one asked/decided pair");
      }
      expect(asked.data.callId).toBe(CallId("approval-cancelled-tool-1"));
      expect(decided.data.id).toBe(asked.data.id);
      expect(decided.data.outcome).toBe("cancelled");

      expect(approvalEvent(observed, "approval-cancelled-tool-1").outcome).toBe("CANCELLED");
      const completed = completedEvent(observed, "approval-cancelled-tool-1");
      expect(completed.outcome).toBe("cancelled");
      expect(completed.resultDigest).toBe(digest(result));
    } finally {
      await subscription.dispose();
    }
  });
});
