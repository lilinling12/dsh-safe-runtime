import { afterEach, beforeEach, describe, expect, it } from "vitest";
import AgentRegistry from "@deepseek-ai/dsh-agent";
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
import {
  createAgentFixture,
  createHarnessTestScope,
  type HarnessTestScope,
} from "./harness-runtime.js";

function digest(value: unknown): string {
  return `m4-044:${JSON.stringify(value)}`;
}

describe("M4-044 approval subsystem uniqueness", () => {
  let harness: HarnessTestScope;

  beforeEach(async () => {
    harness = await createHarnessTestScope();
  });

  afterEach(async () => {
    await harness.dispose();
  });

  it("pins the exact approval ownership feature baseline", () => {
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

  it("does not compose native ToolRuntime ASK with an automatic standalone requestApproval call", async () => {
    await harness.ctx.plugin(SessionStore);
    await harness.ctx.plugin(AgentRegistry);
    await harness.ctx.plugin(SystemPrompt);
    await harness.ctx.plugin(ApprovalService, { policy: "ask" });
    await harness.ctx.plugin(ToolRuntime);

    const ctx = await harness.inject(["sessions", "agents", "approval", "tools"]);
    const adapter = createDshRc5Adapter(ctx, { digest });
    const session = ctx.sessions.create(SessionId("m4-044-uniqueness-session"));
    session.append("turn/start", { turn: 1 });
    const agent = createAgentFixture(ctx, session);
    ctx.agents.register(agent);

    let approvalServiceCalls = 0;
    let bodyCalls = 0;
    let preExecuteCalls = 0;
    ctx.on("tools/pre-execute", (_exec, next) => {
      preExecuteCalls += 1;
      return next();
    });
    ctx.on("approval/request", () => {
      approvalServiceCalls += 1;
      return Promise.resolve<ApprovalOutcome>("allowed-once");
    });

    ctx.tools.register(defineTool({
      name: "m4_044_unique_approval",
      description: "M4-044 approval uniqueness source-conformance tool",
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
    adapter.registerToolPolicy(() => ({
      kind: "ASK",
      reason: "native owner",
    }));

    const nativeResult = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-044-native-call"),
      name: "m4_044_unique_approval",
      arguments: {},
      agent,
    });

    expect(nativeResult.isError).toBe(false);
    expect(bodyCalls).toBe(1);
    expect(preExecuteCalls).toBe(1);
    expect(approvalServiceCalls).toBe(1);
    const nativeAudit = session.events.filter((event) => event.type.startsWith("approval/"));
    expect(nativeAudit).toHaveLength(2);
    expect(nativeAudit.map(({ type }) => type)).toEqual([
      "approval/asked",
      "approval/decided",
    ]);
    const [nativeAsked, nativeDecided] = nativeAudit;
    if (nativeAsked?.type !== "approval/asked" || nativeDecided?.type !== "approval/decided") {
      throw new Error("expected one native approval audit pair");
    }
    expect(nativeDecided.data.id).toBe(nativeAsked.data.id);

    // Both public entry points target the same native ApprovalService. The count
    // must advance only when the caller explicitly chooses requestApproval();
    // registerToolPolicy() must never schedule this second invocation itself.
    await expect(adapter.requestApproval({
      sessionRef: "m4-044-uniqueness-session",
      callRef: "m4-044-standalone-call",
      toolName: "m4_044_unique_approval",
      reason: "explicit standalone invocation",
    })).resolves.toBe("ALLOWED_ONCE");

    expect(approvalServiceCalls).toBe(2);
    expect(bodyCalls).toBe(1);
    expect(preExecuteCalls).toBe(1);
    const combinedAudit = session.events.filter((event) => event.type.startsWith("approval/"));
    expect(combinedAudit).toHaveLength(4);
    expect(combinedAudit.map(({ type }) => type)).toEqual([
      "approval/asked",
      "approval/decided",
      "approval/asked",
      "approval/decided",
    ]);

    const asked = combinedAudit.filter((event) => event.type === "approval/asked");
    const firstAsked = asked[0];
    const secondAsked = asked[1];
    if (firstAsked?.type !== "approval/asked" || secondAsked?.type !== "approval/asked") {
      throw new Error("expected two service-owned approval/asked events");
    }
    expect(firstAsked.data.callId).toBe(CallId("m4-044-native-call"));
    expect(secondAsked.data.callId).toBe(CallId("m4-044-standalone-call"));
    expect(firstAsked.data.id).not.toBe(secondAsked.data.id);
    const standaloneDecided = combinedAudit[3];
    if (standaloneDecided?.type !== "approval/decided") {
      throw new Error("expected the explicit approval decision");
    }
    expect(standaloneDecided.data.id).toBe(secondAsked.data.id);
  });
});
