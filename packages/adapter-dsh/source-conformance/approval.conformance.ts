import { afterEach, describe, expect, it } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import AgentRegistry, { type Agent } from "@deepseek-ai/dsh-agent";
import { CallId } from "@deepseek-ai/dsh-llm";
import SessionStore, { SessionId } from "@deepseek-ai/dsh-session";
import ApprovalService, { type ApprovalOutcome } from "@deepseek-ai/dsh-user-approval";

import { createDshRc5Adapter } from "../src/binding.js";
import type { RuntimeEvent } from "../src/runtime-events.js";

function digest(value: unknown): string {
  return `test:${JSON.stringify(value)}`;
}

async function setupLiveAgent(sessionId: string) {
  const ctx = new Context();
  await ctx.plugin(SessionStore);
  await ctx.plugin(AgentRegistry);
  await ctx.plugin(ApprovalService);

  const session = ctx.sessions.create(SessionId(sessionId));
  session.append("turn/start", { turn: 1 });
  const agent = {
    id: session.id,
    session,
  } as unknown as Agent;
  ctx.agents.register(agent);

  return {
    ctx,
    session,
    agent,
    adapter: createDshRc5Adapter(ctx, { digest }),
  };
}

describe("DeepSeek Harness rc5 approval binding", () => {
  const contexts: Context[] = [];

  afterEach(async () => {
    while (contexts.length > 0) {
      const ctx = contexts.pop();
      if (ctx !== undefined) await ctx.dispose();
    }
  });

  it("maps Harness allowed-once and preserves Harness-generated audit identity", async () => {
    const { ctx, session, adapter } = await setupLiveAgent("approval-allowed");
    contexts.push(ctx);
    ctx.on("approval/request", () => Promise.resolve<ApprovalOutcome>("allowed-once"));

    const outcome = await adapter.requestApproval({
      sessionRef: "approval-allowed",
      callRef: "call-1",
      toolName: "write",
      reason: "test approval",
    });

    expect(outcome).toBe("ALLOWED_ONCE");
    const asked = session.events.find((event) => event.type === "approval/asked");
    const decided = session.events.find((event) => event.type === "approval/decided");
    expect(asked?.type).toBe("approval/asked");
    expect(decided?.type).toBe("approval/decided");
    if (asked?.type !== "approval/asked" || decided?.type !== "approval/decided") {
      throw new Error("approval audit pair was not persisted");
    }
    expect(asked.data.callId).toBe(CallId("call-1"));
    expect(decided.data.id).toBe(asked.data.id);
    expect(decided.data.outcome).toBe("allowed-once");
  });

  it("maps the no-answer path to UNAVAILABLE and retains the durable pair", async () => {
    const { ctx, session, adapter } = await setupLiveAgent("approval-unavailable");
    contexts.push(ctx);

    await expect(adapter.requestApproval({
      sessionRef: "approval-unavailable",
      toolName: "write",
    })).resolves.toBe("UNAVAILABLE");

    const audit = session.events.filter((event) => event.type.startsWith("approval/"));
    expect(audit.map((event) => event.type)).toEqual(["approval/asked", "approval/decided"]);
  });

  it("emits normalized approval evidence using the Harness-generated approval id", async () => {
    const { ctx, session, adapter } = await setupLiveAgent("approval-observed");
    contexts.push(ctx);
    const events: RuntimeEvent[] = [];
    const observation = adapter.observe({ accept: (event) => { events.push(event); } });
    ctx.on("approval/request", () => Promise.resolve<ApprovalOutcome>("rejected"));

    await expect(adapter.requestApproval({
      sessionRef: "approval-observed",
      callRef: "call-observed",
      toolName: "write",
    })).resolves.toBe("REJECTED");
    await observation.drain();

    const asked = session.events.find((event) => event.type === "approval/asked");
    if (asked?.type !== "approval/asked") throw new Error("missing approval/asked");
    const normalized = events.find((event) => event.type === "approval.decided");
    expect(normalized).toMatchObject({
      type: "approval.decided",
      sessionRef: "approval-observed",
      approvalRef: String(asked.data.id),
      callRef: "call-observed",
      outcome: "REJECTED",
    });
    await observation.dispose();
  });

  it("rejects approval requests when the requested session is not a live agent", async () => {
    const ctx = new Context();
    await ctx.plugin(SessionStore);
    await ctx.plugin(AgentRegistry);
    await ctx.plugin(ApprovalService);
    contexts.push(ctx);
    const adapter = createDshRc5Adapter(ctx, { digest });

    await expect(adapter.requestApproval({
      sessionRef: "missing-agent",
      toolName: "write",
    })).rejects.toMatchObject({ code: "HARNESS_AGENT_NOT_LIVE" });
  });

  it("preserves Harness's open-turn precondition", async () => {
    const { ctx, session, adapter } = await setupLiveAgent("approval-closed");
    contexts.push(ctx);
    session.append("turn/end", { turn: 1, reason: { kind: "completed" } });

    await expect(adapter.requestApproval({
      sessionRef: "approval-closed",
      toolName: "write",
    })).rejects.toThrow(/outside an open turn/);
  });
});
