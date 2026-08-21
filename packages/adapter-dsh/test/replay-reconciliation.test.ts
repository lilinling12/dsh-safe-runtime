import { describe, expect, it } from "vitest";

import { DshAdapterError } from "../src/errors.js";
import {
  reconcileReplayEvidence,
  type ReplayDurableFact,
  type ReplayReconciliationInput,
} from "../src/replay-reconciliation.js";
import type { SidecarEvidenceRecord } from "../src/sidecar.js";

function fact(sessionRef: string, sequence: number, digest = `digest:${sequence}`): ReplayDurableFact {
  return {
    sessionRef,
    durableSequence: sequence,
    durableEventRef: `${sessionRef}/seq:${sequence}`,
    eventDigest: digest,
  };
}

function evidence(
  sessionRef: string,
  sequence: number,
  evidenceRef: string,
  evidenceDigest = `digest:${evidenceRef}`,
): SidecarEvidenceRecord {
  return {
    sessionRef,
    durableSequence: sequence,
    durableEventRef: `${sessionRef}/seq:${sequence}`,
    evidenceRef,
    evidenceDigest,
  };
}

function input(
  sessionRef: string,
  snapshot: readonly ReplayDurableFact[],
  live: readonly ReplayDurableFact[] = [],
  sidecar: readonly SidecarEvidenceRecord[] = [],
): ReplayReconciliationInput {
  return { sessionRef, snapshot, live, sidecar };
}

describe("reconcileReplayEvidence", () => {
  it("collapses exact snapshot/live overlap and appends the contiguous live tail", () => {
    const sessionRef = "session:replay";
    const result = reconcileReplayEvidence(input(
      sessionRef,
      [fact(sessionRef, 0), fact(sessionRef, 1)],
      [fact(sessionRef, 1), fact(sessionRef, 2)],
    ));

    expect(result).toEqual({
      kind: "REPLAY_RECONCILED",
      sessionRef,
      nextDurableSequence: 3,
      durableFacts: [fact(sessionRef, 0), fact(sessionRef, 1), fact(sessionRef, 2)],
      evidence: [],
    });
  });

  it("returns durable fact conflict before a lower-priority sequence gap", () => {
    const sessionRef = "session:precedence";
    const result = reconcileReplayEvidence(input(
      sessionRef,
      [fact(sessionRef, 0)],
      [fact(sessionRef, 2), fact(sessionRef, 1), fact(sessionRef, 3)],
    ));

    expect(result).toEqual({
      kind: "REPLAY_CONFLICT",
      sessionRef,
      code: "DURABLE_FACT_CONFLICT",
      durableSequence: 1,
    });
  });

  it("returns the first missing durable sequence for a live-tail gap", () => {
    const sessionRef = "session:gap";
    expect(reconcileReplayEvidence(input(
      sessionRef,
      [fact(sessionRef, 0)],
      [fact(sessionRef, 2), fact(sessionRef, 3)],
    ))).toEqual({
      kind: "REPLAY_CONFLICT",
      sessionRef,
      code: "DURABLE_SEQUENCE_GAP",
      durableSequence: 1,
    });
  });

  it("anchors, deduplicates, and deterministically orders sidecar evidence", () => {
    const sessionRef = "session:evidence";
    const privateUse = evidence(sessionRef, 0, "\uE000");
    const astral = evidence(sessionRef, 0, "😀");
    const result = reconcileReplayEvidence(input(
      sessionRef,
      [fact(sessionRef, 0)],
      [],
      [astral, privateUse, astral],
    ));

    expect(result).toEqual({
      kind: "REPLAY_RECONCILED",
      sessionRef,
      nextDurableSequence: 1,
      durableFacts: [fact(sessionRef, 0)],
      evidence: [privateUse, astral],
    });
  });

  it("reports orphan evidence before contradictory evidence identity", () => {
    const sessionRef = "session:evidence-precedence";
    const first = evidence(sessionRef, 1, "evidence:1", "digest:a");
    const second = { ...first, evidenceDigest: "digest:b" };

    expect(reconcileReplayEvidence(input(
      sessionRef,
      [fact(sessionRef, 0)],
      [],
      [first, second],
    ))).toEqual({
      kind: "REPLAY_CONFLICT",
      sessionRef,
      code: "SIDECAR_ORPHAN",
      durableSequence: 1,
    });
  });

  it("reports contradictory copies of the same evidenceRef as EVIDENCE_CONFLICT", () => {
    const sessionRef = "session:evidence-conflict";
    const first = evidence(sessionRef, 0, "evidence:1", "digest:a");
    const second = { ...first, callRef: "call:changed" };

    expect(reconcileReplayEvidence(input(
      sessionRef,
      [fact(sessionRef, 0)],
      [],
      [first, second],
    ))).toEqual({
      kind: "REPLAY_CONFLICT",
      sessionRef,
      code: "EVIDENCE_CONFLICT",
      durableSequence: 0,
    });
  });

  it("defensively snapshots and freezes successful output", () => {
    const sessionRef = "session:freeze";
    const sourceFact = fact(sessionRef, 0);
    const sourceEvidence = evidence(sessionRef, 0, "evidence:freeze");
    const result = reconcileReplayEvidence(input(sessionRef, [sourceFact], [], [sourceEvidence]));

    expect(result.kind).toBe("REPLAY_RECONCILED");
    if (result.kind !== "REPLAY_RECONCILED") throw new Error("unexpected conflict");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.durableFacts)).toBe(true);
    expect(Object.isFrozen(result.durableFacts[0])).toBe(true);
    expect(Object.isFrozen(result.evidence)).toBe(true);
    expect(Object.isFrozen(result.evidence[0])).toBe(true);
    expect(result.durableFacts[0]).not.toBe(sourceFact);
    expect(result.evidence[0]).not.toBe(sourceEvidence);
  });

  it("fails closed on a non-contiguous snapshot instead of treating it as a semantic tail gap", () => {
    const sessionRef = "session:bad-snapshot";
    expect(() => reconcileReplayEvidence(input(
      sessionRef,
      [fact(sessionRef, 0), fact(sessionRef, 2)],
    ))).toThrowError(expect.objectContaining<DshAdapterError>({
      code: "INVALID_REPLAY_RECONCILIATION_INPUT",
    }));
  });

  it("fails closed on non-canonical or wrong-session durable identity", () => {
    const sessionRef = "session:identity";
    expect(() => reconcileReplayEvidence(input(sessionRef, [{
      ...fact(sessionRef, 0),
      durableEventRef: "wrong",
    }]))).toThrowError(expect.objectContaining<DshAdapterError>({
      code: "INVALID_REPLAY_RECONCILIATION_INPUT",
    }));

    expect(() => reconcileReplayEvidence(input(sessionRef, [fact("session:other", 0)])))
      .toThrowError(expect.objectContaining<DshAdapterError>({
        code: "INVALID_REPLAY_RECONCILIATION_INPUT",
      }));
  });

  it("rejects process-local or unknown sidecar fields rather than persisting hidden identity", () => {
    const sessionRef = "session:sidecar-shape";
    const polluted = {
      ...evidence(sessionRef, 0, "evidence:polluted"),
      processLocalTokenRef: "exec:opaque",
    };

    expect(() => reconcileReplayEvidence({
      sessionRef,
      snapshot: [fact(sessionRef, 0)],
      live: [],
      sidecar: [polluted],
    })).toThrowError(expect.objectContaining<DshAdapterError>({
      code: "INVALID_REPLAY_RECONCILIATION_INPUT",
    }));
  });

  it("rejects lone surrogates before UTF-8 evidence ordering", () => {
    const sessionRef = "session:unicode";
    expect(() => reconcileReplayEvidence(input(
      sessionRef,
      [fact(sessionRef, 0)],
      [],
      [evidence(sessionRef, 0, "\ud800")],
    ))).toThrowError(expect.objectContaining<DshAdapterError>({
      code: "INVALID_REPLAY_RECONCILIATION_INPUT",
    }));
  });
});
