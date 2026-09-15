import AgentRegistry from "@deepseek-ai/dsh-agent";
import { CallId } from "@deepseek-ai/dsh-llm";
import SessionStore, { SessionId, type SessionEvent } from "@deepseek-ai/dsh-session";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createDshRc5Adapter } from "../src/binding.js";
import { DSH_AUDIT_PROFILE, type DshAuditEvent } from "../src/audit-events.js";
import type { RuntimeEvent } from "../src/runtime-events.js";
import { assertAuditEvent } from "./m4-045-audit-contract.js";
import { createAgentFixture, createHarnessTestScope } from "./harness-runtime.js";

const CANARY = "M4_045_SYNTHETIC_SECRET_CANARY";

function canonical(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

function digest(domain: string, value: unknown): string {
  return "sha256:" + createHash("sha256")
    .update(canonical([DSH_AUDIT_PROFILE, domain, value]), "utf8")
    .digest("hex");
}

function auditCompleted(events: readonly DshAuditEvent[], sessionRef: string, callRef: string) {
  const callKey = digest("identity/call", [sessionRef, callRef]);
  const event = events.find(
    (candidate) => candidate.type === "tool.completed" && candidate.callKey === callKey,
  );
  if (event?.type !== "tool.completed") throw new Error(`missing audit completion for ${callRef}`);
  return event;
}

function ordinaryCompleted(events: readonly RuntimeEvent[], callRef: string) {
  const event = events.find(
    (candidate) => candidate.type === "tool.completed" && candidate.callRef === callRef,
  );
  if (event?.type !== "tool.completed") throw new Error(`missing ordinary completion for ${callRef}`);
  return event;
}

describe("M4-045 real rc5 audit source ownership and coexistence", () => {
  it("keeps ordinary digest privileged while two audit subscribers share authoritative final classification", async () => {
    const harness = await createHarnessTestScope();
    let ordinarySubscription: ReturnType<ReturnType<typeof createDshRc5Adapter>["observe"]> | undefined;
    let auditSubscriptionA: ReturnType<ReturnType<typeof createDshRc5Adapter>["observeAudit"]> | undefined;
    let auditSubscriptionB: ReturnType<ReturnType<typeof createDshRc5Adapter>["observeAudit"]> | undefined;
    try {
      await harness.ctx.plugin(SessionStore);
      await harness.ctx.plugin(AgentRegistry);
      await harness.ctx.plugin(SystemPrompt);
      await harness.ctx.plugin(ToolRuntime);
      const ctx = await harness.inject(["sessions", "agents", "tools"]);
      const sessionRef = `m4-045-audit-${CANARY}`;
      const session = ctx.sessions.create(SessionId(sessionRef));
      const agent = createAgentFixture(ctx, session);
      ctx.agents.register(agent);

      const ordinary: RuntimeEvent[] = [];
      const auditA: DshAuditEvent[] = [];
      const auditB: DshAuditEvent[] = [];
      let bodyCalls = 0;
      const adapter = createDshRc5Adapter(ctx, {
        digest: () => CANARY,
        now: () => "2026-09-08T00:00:00.000Z",
      });
      ordinarySubscription = adapter.observe({ accept(event) { ordinary.push(event); } });
      auditSubscriptionA = adapter.observeAudit({ accept(event) { auditA.push(event); } });
      auditSubscriptionB = adapter.observeAudit({ accept(event) { auditB.push(event); } });

      adapter.registerToolPolicy((request) => request.toolName === "m4_045_denied"
        ? { kind: "DENY", reason: CANARY }
        : { kind: "ALLOW" });

      for (const name of ["m4_045_success", "m4_045_denied", "m4_045_cancelled"] as const) {
        ctx.tools.register(defineTool({
          name,
          description: `M4-045 ${CANARY}`,
          parameters: {},
          output: {
            schema: { type: "string" },
            render: (_args: unknown, value: string) => [{ type: "text", text: value }],
          },
          async execute() { bodyCalls += 1; return `body-${CANARY}`; },
          finalizeContent: () => [{ type: "text", text: `final-${CANARY}` }],
        }));
      }

      session.append("turn/start", { turn: 1 });
      session.append("step/start", { turn: 1, step: 0 });

      const rawArguments = `{ "token": "${CANARY}" }`;
      const successCall = CallId(`success-${CANARY}`);
      session.append("tool/call", {
        turn: 1, step: 0, callId: successCall, name: "m4_045_success", arguments: rawArguments,
      });
      const success = await ctx.tools.execute({
        signal: new AbortController().signal,
        callId: successCall,
        name: "m4_045_success",
        arguments: { token: CANARY },
        agent,
      });

      const deniedCall = CallId(`denied-${CANARY}`);
      session.append("tool/call", {
        turn: 1, step: 0, callId: deniedCall, name: "m4_045_denied", arguments: rawArguments,
      });
      const denied = await ctx.tools.execute({
        signal: new AbortController().signal,
        callId: deniedCall,
        name: "m4_045_denied",
        arguments: { token: CANARY },
        agent,
      });

      const cancelledCall = CallId(`cancelled-${CANARY}`);
      session.append("tool/call", {
        turn: 1, step: 0, callId: cancelledCall, name: "m4_045_cancelled", arguments: rawArguments,
      });
      const controller = new AbortController();
      controller.abort();
      const cancelled = await ctx.tools.execute({
        signal: controller.signal,
        callId: cancelledCall,
        name: "m4_045_cancelled",
        arguments: { token: CANARY },
        agent,
      });

      const [ordinarySummary, auditSummaryA, auditSummaryB] = await Promise.all([
        ordinarySubscription.drain().then(() => undefined),
        auditSubscriptionA.drain(),
        auditSubscriptionB.drain(),
      ]);
      expect(ordinarySummary).toBeUndefined();
      expect(auditSummaryA.status).toBe("COMPLETE");
      expect(auditSummaryB).toEqual(auditSummaryA);
      expect(auditSummaryA.delivered).toBe(auditA.length);
      expect(auditA).toEqual(auditB);
      expect(auditA.every(Object.isFrozen)).toBe(true);
      expect(JSON.stringify(auditA)).not.toContain(CANARY);

      expect(success.isError).toBe(false);
      expect(denied.isError).toBe(true);
      expect(cancelled.isError).toBe(true);
      expect(bodyCalls).toBe(1);

      const ordinarySuccess = ordinaryCompleted(ordinary, String(successCall));
      const ordinaryDenied = ordinaryCompleted(ordinary, String(deniedCall));
      const ordinaryCancelled = ordinaryCompleted(ordinary, String(cancelledCall));
      expect(ordinarySuccess.resultDigest).toBe(CANARY);
      expect(ordinaryDenied.resultDigest).toBe(CANARY);
      expect(ordinaryCancelled.resultDigest).toBe(CANARY);
      expect(ordinaryDenied.outcome).toBe("denied");
      expect(ordinaryCancelled.outcome).toBe("cancelled");

      const auditSuccess = auditCompleted(auditA, sessionRef, String(successCall));
      const auditDenied = auditCompleted(auditA, sessionRef, String(deniedCall));
      const auditCancelled = auditCompleted(auditA, sessionRef, String(cancelledCall));
      expect(auditSuccess.resultDigest).toBe(digest("result/final-json", success));
      expect(auditDenied.resultDigest).toBe(digest("result/final-json", denied));
      expect(auditCancelled.resultDigest).toBe(digest("result/final-json", cancelled));
      expect(auditSuccess.outcome).toBe("success");
      expect(auditDenied.outcome).toBe("denied");
      expect(auditCancelled.outcome).toBe("cancelled");

      const nativeRequested = session.events.find(
        (event: SessionEvent) => event.type === "tool/call" && String(event.data.callId) === String(successCall),
      );
      if (nativeRequested?.type !== "tool/call") throw new Error("missing native tool/call");
      const auditRequested = auditA.find(
        (event) => event.type === "tool.requested"
          && event.callKey === digest("identity/call", [sessionRef, String(successCall)]),
      );
      if (auditRequested?.type !== "tool.requested") throw new Error("missing audit tool.requested");
      assertAuditEvent(auditRequested, Object.freeze({
        profile: DSH_AUDIT_PROFILE,
        type: "tool.requested",
        eventKey: digest("identity/event", [sessionRef, `${sessionRef}/seq:${nativeRequested.seq}`]),
        sessionKey: digest("identity/session", sessionRef),
        observedAt: new Date(nativeRequested.time).toISOString(),
        turnKey: digest("identity/turn", [sessionRef, `${sessionRef}/turn:1`]),
        stepKey: digest("identity/step", [sessionRef, `${sessionRef}/turn:1/step:0`]),
        callKey: digest("identity/call", [sessionRef, String(successCall)]),
        toolNameDigest: digest("metadata/tool-name", "m4_045_success"),
        argumentsDigest: digest("arguments/raw-string", rawArguments),
      }), [CANARY]);

      for (const [index, [callRef, name, result]] of [
        [successCall, "m4_045_success", success],
        [deniedCall, "m4_045_denied", denied],
        [cancelledCall, "m4_045_cancelled", cancelled],
      ].entries()) {
        const completedEvent = auditCompleted(auditA, sessionRef, String(callRef));
        expect(completedEvent.eventKey).toBe(digest(
          "identity/event",
          [sessionRef, `${sessionRef}/audit-live:tool-result:${index + 1}`],
        ));
        expect(completedEvent.toolNameDigest).toBe(digest("metadata/tool-name", name));
        expect(completedEvent.resultDigest).toBe(digest("result/final-json", result));
      }
    } finally {
      await auditSubscriptionB?.dispose();
      await auditSubscriptionA?.dispose();
      await ordinarySubscription?.dispose();
      await harness.dispose();
    }
  });
});
