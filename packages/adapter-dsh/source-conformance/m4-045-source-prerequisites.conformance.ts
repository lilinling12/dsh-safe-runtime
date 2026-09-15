import AgentRegistry from "@deepseek-ai/dsh-agent";
import { CallId } from "@deepseek-ai/dsh-llm";
import SessionStore, { SessionId } from "@deepseek-ai/dsh-session";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";
import { describe, expect, it } from "vitest";

import { createDshRc5Adapter } from "../src/binding.js";
import type { RuntimeEvent } from "../src/runtime-events.js";
import { AUDIT_PROFILE, assertAuditEvent } from "./m4-045-audit-contract.js";
import { createAgentFixture, createHarnessTestScope } from "./harness-runtime.js";

const CANARY = "M4_045_SYNTHETIC_SECRET_CANARY";

// Prerequisite evidence only. This test deliberately observes the existing raw
// source/ordinary channel, not an unimplemented audit producer.
describe("M4-045 pinned source prerequisites (not audit acceptance)", () => {
  it("DAP-003/005/006/014/032 captures exact request and rewritten final result while ordinary observation remains privileged", async () => {
    const harness = await createHarnessTestScope();
    let subscription: ReturnType<ReturnType<typeof createDshRc5Adapter>["observe"]> | undefined;
    try {
      await harness.ctx.plugin(SessionStore);
      await harness.ctx.plugin(AgentRegistry);
      await harness.ctx.plugin(SystemPrompt);
      await harness.ctx.plugin(ToolRuntime);
      const ctx = await harness.inject(["sessions", "agents", "tools"]);
      const sessionRef = "m4-045-" + CANARY;
      const session = ctx.sessions.create(SessionId(sessionRef));
      const agent = createAgentFixture(ctx, session);
      ctx.agents.register(agent);
      const digestInputs: unknown[] = [];
      const observed: RuntimeEvent[] = [];
      let finalSource: unknown;
      let executions = 0;
      let policyArguments: unknown;
      const toolName = "m4_045_source_probe";
      const callId = CallId("m4-045-" + CANARY);
      const rawArguments = '{ "token": "' + CANARY + '" }';
      const adapter = createDshRc5Adapter(ctx, {
        digest(value) { digestInputs.push(value); return CANARY; },
        now: () => "2026-09-06T00:00:00.000Z",
      });
      adapter.registerToolPolicy((request) => {
        policyArguments = request.arguments;
        return { kind: "ALLOW" };
      });
      subscription = adapter.observe({ accept(event) { observed.push(event); } });
      ctx.on("tools/result", (exec, result) => {
        expect(exec.callId).toBe(callId);
        expect(Object.isFrozen(exec)).toBe(true);
        finalSource = result;
      });
      ctx.tools.register(defineTool({
        name: toolName,
        description: "M4-045 synthetic source boundary probe",
        parameters: {},
        output: {
          schema: { type: "string" },
          render: (_args, value) => [{ type: "text", text: value }],
        },
        async execute() { executions += 1; return "body"; },
        finalizeContent: () => [{ type: "text", text: "final:" + CANARY }],
      }));
      ctx.on("tools/post-execute", () => Promise.resolve({
        kind: "accept" as const, content: [{ type: "text" as const, text: "post-execute" }],
      }));
      session.append("turn/start", { turn: 1 });
      session.append("step/start", { turn: 1, step: 0 });
      session.append("tool/call", {
        turn: 1, step: 0, callId, name: toolName, arguments: rawArguments,
      });
      const argumentsValue = { token: CANARY };
      const result = await ctx.tools.execute({
        signal: new AbortController().signal, callId, name: toolName,
        arguments: argumentsValue, agent,
      });
      await subscription.drain();

      expect(executions).toBe(1);
      expect(policyArguments).toEqual(argumentsValue);
      expect(result.isError).toBe(false);
      expect(finalSource).toBe(result);
      expect(Object.isFrozen(result)).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "final:" + CANARY }]);
      expect(digestInputs.some((value) => value === rawArguments)).toBe(true);
      expect(digestInputs.some((value) => value === result)).toBe(true);

      const nativeCalls = session.events.filter((event) => event.type === "tool/call");
      expect(nativeCalls).toHaveLength(1);
      const native = nativeCalls[0];
      if (native?.type !== "tool/call") throw new Error("missing native source fact");
      expect(native.data.arguments).toBe(rawArguments);
      const requested = observed.find((event) => event.type === "tool.requested");
      const completed = observed.find((event) => event.type === "tool.completed");
      if (requested?.type !== "tool.requested" || completed?.type !== "tool.completed") {
        throw new Error("missing ordinary observations");
      }
      expect(requested.argumentsDigest).toBe(CANARY);
      expect(completed.resultDigest).toBe(CANARY);
      expect(requested.callRef).toBe(completed.callRef);
      expect(completed.sessionRef).toBe(sessionRef);
      expect(observed.filter((event) => event.type === "tool.completed")).toHaveLength(1);

      // A legal RuntimeEvent is NOT legal audit evidence. No synthetic audit
      // producer is substituted to make this source-prerequisite test pass.
      const placeholder = "sha256:" + "0".repeat(64);
      const authoredAuditShape = Object.freeze({
        profile: AUDIT_PROFILE, type: "tool.completed", eventKey: placeholder,
        sessionKey: placeholder, observedAt: "2026-09-06T00:00:00.000Z",
        callKey: placeholder, toolNameDigest: placeholder,
        resultDigest: placeholder, outcome: "success",
      });
      expect(() => assertAuditEvent(Object.freeze({ ...completed }), authoredAuditShape, [CANARY]))
        .toThrow("M4_045_AUDIT_CONTRACT_MISMATCH");
    } finally {
      await subscription?.dispose();
      await harness.dispose();
    }
  });
});
