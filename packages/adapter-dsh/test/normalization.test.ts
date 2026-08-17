import { describe, expect, it, vi } from "vitest";

import {
  DSH_RC5_FEATURES,
  OrderedRuntimeEventDispatcher,
  normalizeDurableEvent,
  normalizeFinalToolResult,
  requireAdapterFeatures,
  type RuntimeEvent,
} from "../src/index.js";

const digest = (value: unknown): string => `digest:${String(value)}`;

describe("DeepSeek Harness rc5 normalization", () => {
  it("normalizes durable tool/call as intent, not success", () => {
    const event = normalizeDurableEvent(
      "session:abc",
      {
        type: "tool/call",
        seq: 12,
        time: Date.parse("2026-08-17T08:00:00Z"),
        data: {
          turn: 2,
          step: 1,
          callId: "call_42",
          name: "bash",
          arguments: "{\"command\":\"pnpm test\"}",
        },
      },
      digest,
    );

    expect(event).toEqual({
      type: "tool.requested",
      eventRef: "session:abc/seq:12",
      sessionRef: "session:abc",
      observedAt: "2026-08-17T08:00:00.000Z",
      turnRef: "session:abc/turn:2",
      stepRef: "session:abc/turn:2/step:1",
      callRef: "call_42",
      toolName: "bash",
      argumentsDigest: "digest:{\"command\":\"pnpm test\"}",
    });
  });

  it("normalizes the live final result as the authoritative success outcome", () => {
    const event = normalizeFinalToolResult(
      "session:abc",
      { callId: "call_42", name: "bash", arguments: { command: "pnpm test" } },
      { isError: false },
      "sha256:result",
      "2026-08-17T08:00:02.000Z",
    );
    expect(event.outcome).toBe("success");
  });

  it("classifies denial only from authoritative policy correlation", () => {
    const event = normalizeFinalToolResult(
      "session:abc",
      { callId: "call_7", name: "write", arguments: {} },
      { isError: true },
      "sha256:denied",
      "2026-08-17T08:00:03.000Z",
      { policyDenied: true },
    );
    expect(event.outcome).toBe("denied");
  });

  it("classifies approval cancellation only from authoritative correlation", () => {
    const event = normalizeFinalToolResult(
      "session:abc",
      { callId: "call_cancelled", name: "write", arguments: {} },
      { isError: true },
      "sha256:cancelled",
      "2026-08-17T08:00:03.000Z",
      { policyCancelled: true },
    );
    expect(event.outcome).toBe("cancelled");
  });

  it("does not infer denial from an arbitrary error-code substring", () => {
    const event = normalizeFinalToolResult(
      "session:abc",
      { callId: "call_8", name: "write", arguments: {} },
      { isError: true, error: { info: { code: "TOOL_DENIED" } } },
      "sha256:error",
      "2026-08-17T08:00:03.000Z",
    );
    expect(event.outcome).toBe("error");
  });

  it.each(["ABORTED", "ABORTED_BEFORE_DISPATCH"])(
    "maps the exact Harness cancellation code %s",
    (code) => {
      const event = normalizeFinalToolResult(
        "session:abc",
        { callId: "call_cancel", name: "bash", arguments: {} },
        { isError: true, error: { info: { code } } },
        "sha256:cancelled",
        "2026-08-17T08:00:03.000Z",
      );
      expect(event.outcome).toBe("cancelled");
    },
  );

  it("rejects an impossible non-success correlation", () => {
    expect(() => normalizeFinalToolResult(
      "session:abc",
      { callId: "call_bad", name: "write", arguments: {} },
      { isError: false },
      "sha256:bad",
      "2026-08-17T08:00:03.000Z",
      { policyDenied: true },
    )).toThrow(/correlated as non-success but Harness reported success/);
  });

  it("rejects conflicting correlation facts", () => {
    expect(() => normalizeFinalToolResult(
      "session:abc",
      { callId: "call_bad", name: "write", arguments: {} },
      { isError: true },
      "sha256:bad",
      "2026-08-17T08:00:03.000Z",
      { policyDenied: true, policyCancelled: true },
    )).toThrow(/conflicting denied and cancelled/);
  });

  it("fails closed when a requested adapter feature is unsupported", () => {
    expect(() => requireAdapterFeatures(DSH_RC5_FEATURES, ["toolsArgumentRewrite"]))
      .toThrow(/required DeepSeek Harness adapter features are unavailable/);
  });

  it("does not treat scoped tool restrictions as an authority boundary", () => {
    expect(DSH_RC5_FEATURES.toolsScopedRestriction).toBe(true);
    expect(DSH_RC5_FEATURES.toolsRestrictionIsAuthorityBoundary).toBe(false);
  });

  it("rejects unknown durable turn-end semantics", () => {
    expect(() => normalizeDurableEvent(
      "session:abc",
      {
        type: "turn/end",
        seq: 99,
        time: Date.parse("2026-08-17T08:00:04Z"),
        data: { turn: 2, reason: { kind: "future-reason" } },
      },
      digest,
    )).toThrow(/unsupported DeepSeek Harness turn-end reason/);
  });

  it("rejects malformed event timestamps instead of emitting invalid ISO time", () => {
    expect(() => normalizeDurableEvent(
      "session:abc",
      { type: "turn/start", seq: 1, time: Number.NaN, data: { turn: 1 } },
      digest,
    )).toThrow(/event time/);
  });
});

describe("OrderedRuntimeEventDispatcher", () => {
  const event = (eventRef: string): RuntimeEvent => ({
    type: "turn.started",
    eventRef,
    sessionRef: "session:abc",
    observedAt: "2026-08-17T08:00:00.000Z",
    turnRef: `session:abc/${eventRef}`,
  });

  it("preserves event order across asynchronous sinks", async () => {
    const observed: string[] = [];
    const dispatcher = new OrderedRuntimeEventDispatcher(
      {
        async accept(value) {
          await Promise.resolve();
          observed.push(value.eventRef);
        },
      },
      vi.fn(),
    );
    dispatcher.enqueue(event("1"));
    dispatcher.enqueue(event("2"));
    await dispatcher.drain();
    expect(observed).toEqual(["1", "2"]);
  });

  it("contains sink failures and continues later delivery", async () => {
    const observed: string[] = [];
    const failures = vi.fn();
    const dispatcher = new OrderedRuntimeEventDispatcher(
      {
        accept(value) {
          if (value.eventRef === "bad") throw new Error("sink failed");
          observed.push(value.eventRef);
        },
      },
      failures,
    );
    dispatcher.enqueue(event("bad"));
    dispatcher.enqueue(event("good"));
    await dispatcher.drain();
    expect(failures).toHaveBeenCalledTimes(1);
    expect(observed).toEqual(["good"]);
  });
});
