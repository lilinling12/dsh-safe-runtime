import { describe, expect, it } from "vitest";

import {
  OrderedAuditEventDispatcher,
  incrementAuditCounter,
} from "../src/audit-dispatcher.js";
import {
  DSH_AUDIT_PROFILE,
  type AuditProjectionResult,
  type DshAuditEvent,
} from "../src/audit-events.js";
import { assertAuditSummary } from "../source-conformance/m4-045-audit-contract.js";

const EVENT: DshAuditEvent = Object.freeze({
  profile: DSH_AUDIT_PROFILE,
  type: "session.started",
  eventKey: "sha256:" + "1".repeat(64),
  sessionKey: "sha256:" + "2".repeat(64),
  observedAt: "2026-09-08T00:00:00.000Z",
  source: "startup",
});
const ADMITTED: AuditProjectionResult = Object.freeze({ kind: "event", event: EVENT });

describe("M4-045 ordered bounded audit delivery", () => {
  it("delivers serially with single attempts and sticky INCOMPLETE after sink failure", async () => {
    const order: string[] = [];
    let calls = 0;
    const dispatcher = new OrderedAuditEventDispatcher({
      async accept() {
        calls += 1;
        order.push(`start:${calls}`);
        await Promise.resolve();
        if (calls === 2) throw new Error("M4_045_SYNTHETIC_SECRET_CANARY");
        order.push(`end:${calls}`);
      },
    });

    dispatcher.capture(ADMITTED);
    dispatcher.capture(ADMITTED);
    dispatcher.capture(ADMITTED);
    const first = await dispatcher.drain();
    expect(calls).toBe(3);
    expect(order).toEqual(["start:1", "end:1", "start:2", "start:3", "end:3"]);
    assertAuditSummary(first, Object.freeze({
      delivered: 2,
      projectionRejected: 0,
      deliveryFailed: 1,
      countsExact: true,
      status: "INCOMPLETE",
      diagnostics: Object.freeze(["AUDIT_SINK_FAILED"] as const),
    }));

    dispatcher.capture(ADMITTED);
    const second = await dispatcher.drain();
    expect(second.delivered).toBe(3);
    expect(second.status).toBe("INCOMPLETE");
    expect(second.diagnostics).toEqual(["AUDIT_SINK_FAILED"]);
  });

  it("records projection rejection without invoking the sink", async () => {
    let calls = 0;
    const dispatcher = new OrderedAuditEventDispatcher({ accept() { calls += 1; } });
    dispatcher.capture(Object.freeze({ kind: "rejected", code: "AUDIT_INPUT_UNSUPPORTED" }));
    const summary = await dispatcher.drain();
    expect(calls).toBe(0);
    expect(summary).toEqual(Object.freeze({
      delivered: 0,
      projectionRejected: 1,
      deliveryFailed: 0,
      countsExact: true,
      status: "INCOMPLETE",
      diagnostics: Object.freeze(["AUDIT_INPUT_UNSUPPORTED"]),
    }));
  });

  it("bounds queued plus in-flight work at 1024 and rejects the next fact explicitly", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let calls = 0;
    const dispatcher = new OrderedAuditEventDispatcher({
      async accept() { calls += 1; await gate; },
    });
    for (let index = 0; index < 1_024; index += 1) dispatcher.capture(ADMITTED);
    dispatcher.capture(ADMITTED);
    release();
    const summary = await dispatcher.drain();
    expect(calls).toBe(1_024);
    expect(summary.delivered).toBe(1_024);
    expect(summary.projectionRejected).toBe(1);
    expect(summary.status).toBe("INCOMPLETE");
    expect(summary.diagnostics).toEqual(["AUDIT_LIMIT_EXCEEDED"]);
  });

  it("drain covers prior capture while closeCapture prevents later admission", async () => {
    const accepted: DshAuditEvent[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const dispatcher = new OrderedAuditEventDispatcher({
      async accept(event) { accepted.push(event); await gate; },
    });
    dispatcher.capture(ADMITTED);
    const draining = dispatcher.drain();
    dispatcher.closeCapture();
    dispatcher.capture(ADMITTED);
    release();
    const summary = await draining;
    expect(accepted).toHaveLength(1);
    expect(summary.delivered).toBe(1);
    expect(Object.isFrozen(summary)).toBe(true);
    expect(Object.isFrozen(summary.diagnostics)).toBe(true);
  });

  it("uses saturating safe-integer arithmetic for counter exhaustion", () => {
    expect(incrementAuditCounter(Number.MAX_SAFE_INTEGER - 1)).toEqual({
      value: Number.MAX_SAFE_INTEGER,
      exact: true,
    });
    expect(incrementAuditCounter(Number.MAX_SAFE_INTEGER)).toEqual({
      value: Number.MAX_SAFE_INTEGER,
      exact: false,
    });
    expect(incrementAuditCounter(-1)).toEqual({
      value: Number.MAX_SAFE_INTEGER,
      exact: false,
    });
  });
});
