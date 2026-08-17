import type { Evidence } from "@dsh-safe/protocol";
import { describe, expect, it } from "vitest";

import {
  createSidecarEvidenceRecord,
  DshAdapterError,
  type CorrelationRecord,
} from "../src/index.js";

const evidence = (eventRef: string): Evidence => ({
  evidenceRef: "evidence:tool-result:1",
  kind: "tool-result",
  source: {
    adapter: "deepseek-harness",
    eventRef,
  },
  digest: "sha256:0123456789abcdef",
  observedAt: "2026-08-17T12:00:00.000Z",
});

describe("DeepSeek Harness durable sidecar correlation", () => {
  it("projects only durable correlation fields and excludes process-local tokens", () => {
    const correlation: CorrelationRecord = {
      adapterEventRef: "session:abc/seq:12",
      durableSequence: 12,
      sessionRef: "session:abc",
      turnRef: "session:abc/turn:2",
      stepRef: "session:abc/turn:2/step:1",
      callRef: "call_42",
      processLocalTokenRef: "opaque-process-token",
    };

    const record = createSidecarEvidenceRecord(
      correlation,
      evidence("session:abc/seq:12"),
    );

    expect(record).toEqual({
      durableEventRef: "session:abc/seq:12",
      durableSequence: 12,
      sessionRef: "session:abc",
      turnRef: "session:abc/turn:2",
      stepRef: "session:abc/turn:2/step:1",
      callRef: "call_42",
      evidenceRef: "evidence:tool-result:1",
      evidenceDigest: "sha256:0123456789abcdef",
    });
    expect(record).not.toHaveProperty("processLocalTokenRef");
  });

  it("rejects process-local correlation that has no durable Harness sequence", () => {
    const correlation: CorrelationRecord = {
      adapterEventRef: "session:abc/live:tool-result:1",
      sessionRef: "session:abc",
      callRef: "call_42",
      processLocalTokenRef: "opaque-process-token",
    };

    let failure: unknown;
    try {
      createSidecarEvidenceRecord(
        correlation,
        evidence("session:abc/live:tool-result:1"),
      );
    } catch (error: unknown) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(DshAdapterError);
    expect(failure).toMatchObject({
      code: "INVALID_SIDECAR_EVIDENCE_CORRELATION",
    });
  });

  it("rejects evidence that is not anchored to the same durable Harness event", () => {
    const correlation: CorrelationRecord = {
      adapterEventRef: "session:abc/seq:12",
      durableSequence: 12,
      sessionRef: "session:abc",
      callRef: "call_42",
    };

    expect(() => createSidecarEvidenceRecord(
      correlation,
      evidence("session:abc/seq:13"),
    )).toThrow(/does not match session:abc\/seq:12/);
  });

  it("rejects a non-Harness evidence source at the adapter sidecar boundary", () => {
    const correlation: CorrelationRecord = {
      adapterEventRef: "session:abc/seq:12",
      durableSequence: 12,
      sessionRef: "session:abc",
    };
    const wrongAdapter = {
      ...evidence("session:abc/seq:12"),
      source: { adapter: "other-adapter", eventRef: "session:abc/seq:12" },
    };

    expect(() => createSidecarEvidenceRecord(correlation, wrongAdapter))
      .toThrow(/adapter must be deepseek-harness/);
  });
});
