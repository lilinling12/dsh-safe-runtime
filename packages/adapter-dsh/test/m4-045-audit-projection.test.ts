import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { DSH_AUDIT_PROFILE } from "../src/audit-events.js";
import {
  projectAuditApprovalDecided,
  projectAuditDurableEvent,
  projectAuditFinalToolResult,
  projectAuditModelRequestFailed,
  projectAuditSessionStarted,
  projectAuditTurnCompletionRequested,
} from "../src/audit-projection.js";
import { assertAuditEvent, type ExpectedAuditEvent } from "../source-conformance/m4-045-audit-contract.js";

const CANARY = "M4_045_SYNTHETIC_SECRET_CANARY";
const OBSERVED_AT = "2026-09-08T00:00:00.000Z";

function canonical(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

function independentDigest(domain: string, value: unknown): string {
  return "sha256:" + createHash("sha256")
    .update(canonical([DSH_AUDIT_PROFILE, domain, value]), "utf8")
    .digest("hex");
}

function expectedBase(sessionRef: string, eventRef: string, observedAt = OBSERVED_AT) {
  return {
    profile: DSH_AUDIT_PROFILE,
    eventKey: independentDigest("identity/event", [sessionRef, eventRef]),
    sessionKey: independentDigest("identity/session", sessionRef),
    observedAt,
  } as const;
}

function unwrap(result: ReturnType<typeof projectAuditDurableEvent>) {
  expect(result.kind).toBe("event");
  if (result.kind !== "event") throw new Error("expected admitted audit event");
  return result.event;
}

describe("M4-045 owned audit projection", () => {
  it("projects the nine closed event types with independently authored digests", () => {
    const sessionRef = `session-${CANARY}`;
    const turnRef = `${sessionRef}/turn:1`;
    const stepRef = `${turnRef}/step:2`;
    const callRef = `call-${CANARY}`;
    const approvalRef = `approval-${CANARY}`;
    const toolName = `tool-${CANARY}`;
    const rawArguments = `{ "token": "${CANARY}" }`;
    const resultSource = Object.freeze({
      isError: false,
      value: CANARY,
      content: Object.freeze([Object.freeze({ type: "text", text: CANARY })]),
    });
    const failureSource = Object.freeze({ code: `FAIL-${CANARY}`, detail: CANARY });

    const authored: readonly [unknown, ExpectedAuditEvent][] = [
      [projectAuditSessionStarted(sessionRef, "live:session", OBSERVED_AT, "startup"), Object.freeze({
        ...expectedBase(sessionRef, "live:session"), type: "session.started", source: "startup",
      })],
      [projectAuditDurableEvent(sessionRef, Object.freeze({
        type: "turn/start", seq: 1, time: Date.parse(OBSERVED_AT), data: Object.freeze({ turn: 1 }),
      })), Object.freeze({
        ...expectedBase(sessionRef, `${sessionRef}/seq:1`), type: "turn.started",
        turnKey: independentDigest("identity/turn", [sessionRef, turnRef]),
      })],
      [projectAuditDurableEvent(sessionRef, Object.freeze({
        type: "step/start", seq: 2, time: Date.parse(OBSERVED_AT), data: Object.freeze({ turn: 1, step: 2 }),
      })), Object.freeze({
        ...expectedBase(sessionRef, `${sessionRef}/seq:2`), type: "step.started",
        turnKey: independentDigest("identity/turn", [sessionRef, turnRef]),
        stepKey: independentDigest("identity/step", [sessionRef, stepRef]),
      })],
      [projectAuditDurableEvent(sessionRef, Object.freeze({
        type: "tool/call", seq: 3, time: Date.parse(OBSERVED_AT),
        data: Object.freeze({
          turn: 1, step: 2, callId: callRef, rootCallId: callRef,
          name: toolName, arguments: rawArguments, ignored: CANARY,
        }),
      })), Object.freeze({
        ...expectedBase(sessionRef, `${sessionRef}/seq:3`), type: "tool.requested",
        turnKey: independentDigest("identity/turn", [sessionRef, turnRef]),
        stepKey: independentDigest("identity/step", [sessionRef, stepRef]),
        callKey: independentDigest("identity/call", [sessionRef, callRef]),
        rootCallKey: independentDigest("identity/call", [sessionRef, callRef]),
        toolNameDigest: independentDigest("metadata/tool-name", toolName),
        argumentsDigest: independentDigest("arguments/raw-string", rawArguments),
      })],
      [projectAuditFinalToolResult(
        sessionRef, "live:result", OBSERVED_AT, callRef, toolName, resultSource,
      ), Object.freeze({
        ...expectedBase(sessionRef, "live:result"), type: "tool.completed",
        callKey: independentDigest("identity/call", [sessionRef, callRef]),
        toolNameDigest: independentDigest("metadata/tool-name", toolName),
        resultDigest: independentDigest("result/final-json", resultSource), outcome: "success",
      })],
      [projectAuditApprovalDecided(
        sessionRef, 4, Date.parse(OBSERVED_AT), approvalRef, callRef, "allowed-once",
      ), Object.freeze({
        ...expectedBase(sessionRef, `${sessionRef}/seq:4`), type: "approval.decided",
        approvalKey: independentDigest("identity/approval", [sessionRef, approvalRef]),
        callKey: independentDigest("identity/call", [sessionRef, callRef]), outcome: "ALLOWED_ONCE",
      })],
      [projectAuditModelRequestFailed(
        sessionRef, "live:failure", OBSERVED_AT, 1, 2, failureSource,
      ), Object.freeze({
        ...expectedBase(sessionRef, "live:failure"), type: "model.request.failed",
        turnKey: independentDigest("identity/turn", [sessionRef, turnRef]),
        stepKey: independentDigest("identity/step", [sessionRef, stepRef]),
        failureClassDigest: independentDigest("metadata/failure-class", `FAIL-${CANARY}`),
        failureDigest: independentDigest("failure/source-json", failureSource),
      })],
      [projectAuditTurnCompletionRequested(
        sessionRef, "live:stopping", OBSERVED_AT, 1,
      ), Object.freeze({
        ...expectedBase(sessionRef, "live:stopping"), type: "turn.completion_requested",
        turnKey: independentDigest("identity/turn", [sessionRef, turnRef]),
      })],
      [projectAuditDurableEvent(sessionRef, Object.freeze({
        type: "turn/end", seq: 5, time: Date.parse(OBSERVED_AT),
        data: Object.freeze({ turn: 1, reason: Object.freeze({ kind: "completed", detail: CANARY }) }),
      })), Object.freeze({
        ...expectedBase(sessionRef, `${sessionRef}/seq:5`), type: "turn.ended",
        turnKey: independentDigest("identity/turn", [sessionRef, turnRef]), status: "completed",
      })],
    ];

    for (const [result, expected] of authored) {
      const projected = result as ReturnType<typeof projectAuditDurableEvent>;
      expect(projected.kind).toBe("event");
      if (projected.kind !== "event") throw new Error("unexpected projection rejection");
      assertAuditEvent(projected.event, expected, [CANARY]);
      expect(Object.isFrozen(projected.event)).toBe(true);
    }
  });

  it("preserves identity joins but separates sessions and identity domains", () => {
    const callRef = `call-${CANARY}`;
    const raw = '{"x":1}';
    const left = unwrap(projectAuditDurableEvent("session-a", Object.freeze({
      type: "tool/call", seq: 1, time: 0,
      data: Object.freeze({ turn: 1, step: 0, callId: callRef, name: "tool", arguments: raw }),
    })));
    const right = unwrap(projectAuditDurableEvent("session-b", Object.freeze({
      type: "tool/call", seq: 1, time: 0,
      data: Object.freeze({ turn: 1, step: 0, callId: callRef, name: "tool", arguments: raw }),
    })));
    if (left.type !== "tool.requested" || right.type !== "tool.requested") throw new Error("wrong type");
    expect(left.callKey).not.toBe(right.callKey);
    expect(left.callKey).not.toBe(left.eventKey);
    expect(left.argumentsDigest).toBe(right.argumentsDigest);
  });

  it("uses the whole final materialized result and never an earlier or digest-shaped substitute", () => {
    const earlier = Object.freeze({ isError: false, value: "body", content: Object.freeze([]) });
    const final = Object.freeze({
      isError: false,
      value: CANARY,
      content: Object.freeze([Object.freeze({ type: "text", text: `final-${CANARY}` })]),
      meta: Object.freeze({ secret: CANARY }),
    });
    const result = projectAuditFinalToolResult(
      "session", "live", OBSERVED_AT, "call", `sha256:${"a".repeat(64)}`, final,
    );
    expect(result.kind).toBe("event");
    if (result.kind !== "event" || result.event.type !== "tool.completed") throw new Error("wrong projection");
    expect(result.event.resultDigest).toBe(independentDigest("result/final-json", final));
    expect(result.event.resultDigest).not.toBe(independentDigest("result/final-json", earlier));
    expect(result.event.toolNameDigest).toBe(
      independentDigest("metadata/tool-name", `sha256:${"a".repeat(64)}`),
    );
  });

  it("rejects accessors, unsupported prototypes and cycles atomically without invoking getters", () => {
    let reads = 0;
    const hostileData = Object.freeze(Object.defineProperty({
      turn: 1, step: 0, callId: "call", name: "tool",
    }, "arguments", {
      enumerable: true,
      get() { reads += 1; throw new Error(CANARY); },
    }));
    expect(projectAuditDurableEvent("session", Object.freeze({
      type: "tool/call", seq: 1, time: 0, data: hostileData,
    }))).toEqual({ kind: "rejected", code: "AUDIT_INPUT_UNSUPPORTED" });
    expect(reads).toBe(0);

    const errorResult = new Error(CANARY) as unknown as Record<string, unknown>;
    errorResult["isError"] = true;
    expect(projectAuditFinalToolResult(
      "session", "live", OBSERVED_AT, "call", "tool", errorResult,
    )).toEqual({ kind: "rejected", code: "AUDIT_INPUT_UNSUPPORTED" });

    const cyclic: Record<string, unknown> = { isError: false };
    cyclic["self"] = cyclic;
    expect(projectAuditFinalToolResult(
      "session", "live", OBSERVED_AT, "call", "tool", cyclic,
    )).toEqual({ kind: "rejected", code: "AUDIT_INPUT_UNSUPPORTED" });
  });

  it("rejects invalid required refs/enums/time and keeps optional correlation absent", () => {
    expect(projectAuditSessionStarted("", "event", OBSERVED_AT, "startup"))
      .toEqual({ kind: "rejected", code: "AUDIT_INPUT_INVALID" });
    expect(projectAuditSessionStarted("session", "event", CANARY, "startup"))
      .toEqual({ kind: "rejected", code: "AUDIT_INPUT_INVALID" });
    expect(projectAuditApprovalDecided("session", 1, 0, "approval", undefined, "ALLOWED_ALWAYS"))
      .toEqual({ kind: "rejected", code: "AUDIT_INPUT_INVALID" });

    const admitted = projectAuditApprovalDecided("session", 1, 0, "approval", undefined, "rejected");
    expect(admitted.kind).toBe("event");
    if (admitted.kind !== "event" || admitted.event.type !== "approval.decided") throw new Error("wrong event");
    expect("callKey" in admitted.event).toBe(false);
  });
});
