import { describe, expect, it } from "vitest";

import {
  DSH_RC5_FEATURES,
  normalizeDurableEvent,
  normalizeFinalToolResult,
  requireAdapterFeatures,
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

  it("normalizes the live final result as the authoritative outcome", () => {
    const event = normalizeFinalToolResult(
      "session:abc",
      {
        callId: "call_42",
        name: "bash",
        arguments: { command: "pnpm test" },
      },
      { isError: false },
      "sha256:result",
      "2026-08-17T08:00:02.000Z",
    );

    expect(event.outcome).toBe("success");
    expect(event.callRef).toBe("call_42");
    expect(event.resultDigest).toBe("sha256:result");
  });

  it("classifies explicit denial-like Harness error codes as denied", () => {
    const event = normalizeFinalToolResult(
      "session:abc",
      { callId: "call_7", name: "write", arguments: {} },
      { isError: true, error: { info: { code: "TOOL_DENIED" } } },
      "sha256:denied",
      "2026-08-17T08:00:03.000Z",
    );

    expect(event.outcome).toBe("denied");
    expect(event.errorCode).toBe("TOOL_DENIED");
  });

  it("fails closed when a requested adapter feature is unsupported", () => {
    expect(() =>
      requireAdapterFeatures(DSH_RC5_FEATURES, ["toolsArgumentRewrite"]),
    ).toThrow(/UNSUPPORTED_ADAPTER_FEATURES/);
  });

  it("does not treat scoped tool restrictions as an authority boundary", () => {
    expect(DSH_RC5_FEATURES.toolsScopedRestriction).toBe(true);
    expect(DSH_RC5_FEATURES.toolsRestrictionIsAuthorityBoundary).toBe(false);
  });

  it("rejects unknown durable turn-end semantics", () => {
    expect(() =>
      normalizeDurableEvent(
        "session:abc",
        {
          type: "turn/end",
          seq: 99,
          time: Date.parse("2026-08-17T08:00:04Z"),
          data: { turn: 2, reason: { kind: "future-reason" } },
        },
        digest,
      ),
    ).toThrow(/UNSUPPORTED_HARNESS_TURN_END_REASON/);
  });
});
