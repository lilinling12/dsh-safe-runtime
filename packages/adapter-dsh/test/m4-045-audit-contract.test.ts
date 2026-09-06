import vectors from "../../../fixtures/dsh-audit-admission/digest-vectors.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import {
  AUDIT_EVENT_TYPES, AUDIT_PROFILE, assertAuditEvent, assertAuditSummary,
  assertDigestProbe, digestCanonicalEnvelope, type AuditDeliverySummary,
  type ExpectedAuditEvent,
} from "../source-conformance/m4-045-audit-contract.js";
import {
  auditDigestBoundaryCases, auditDigestUnsupportedCases,
} from "../source-conformance/m4-045-audit-digest-cases.js";

const CANARY = "M4_045_SYNTHETIC_SECRET_CANARY";
const digest = vectors.vectors[3]!.expectedDigest;
const base = {
  profile: AUDIT_PROFILE, eventKey: digest, sessionKey: digest,
  observedAt: "2026-09-06T00:00:00.000Z",
};
// Authored observations only. They exercise the oracle; they are not runtime output.
const events: readonly ExpectedAuditEvent[] = [
  { ...base, type: "session.started", source: "startup" },
  { ...base, type: "turn.started", turnKey: digest },
  { ...base, type: "step.started", turnKey: digest, stepKey: digest },
  { ...base, type: "tool.requested", callKey: digest, toolNameDigest: digest, argumentsDigest: vectors.vectors[0]!.expectedDigest },
  { ...base, type: "tool.completed", callKey: digest, toolNameDigest: digest, resultDigest: vectors.vectors[2]!.expectedDigest, outcome: "success" },
  { ...base, type: "approval.decided", approvalKey: digest, outcome: "ALLOWED_ONCE" },
  { ...base, type: "model.request.failed", turnKey: digest, stepKey: digest, failureClassDigest: digest, failureDigest: vectors.vectors[7]!.expectedDigest },
  { ...base, type: "turn.completion_requested", turnKey: digest },
  { ...base, type: "turn.ended", turnKey: digest, status: "completed" },
].map((event) => Object.freeze(event));
const complete: AuditDeliverySummary = Object.freeze({
  delivered: 2, projectionRejected: 0, deliveryFailed: 0, countsExact: true,
  status: "COMPLETE", diagnostics: Object.freeze([]),
});
const incomplete: AuditDeliverySummary = Object.freeze({
  delivered: 2, projectionRejected: 1, deliveryFailed: 1, countsExact: true,
  status: "INCOMPLETE", diagnostics: Object.freeze(["AUDIT_INPUT_UNSUPPORTED", "AUDIT_SINK_FAILED"] as const),
});

describe("M4-045 test-only audit contract oracle (not producer acceptance)", () => {
  it.each(events)("DAP-004 closed authored shape: $type", (expected) => {
    assertAuditEvent(Object.freeze({ ...expected }), expected, [CANARY]);
  });

  it("covers all nine types and rejects absent required or extra fields on every type", () => {
    expect(events.map((event) => event["type"])).toEqual(AUDIT_EVENT_TYPES);
    for (const expected of events) {
      for (const key of Object.keys(expected)) {
        const missing = { ...expected };
        delete missing[key];
        expect(() => assertAuditEvent(Object.freeze(missing), expected)).toThrow("M4_045_AUDIT_CONTRACT_MISMATCH");
      }
      for (const key of ["arguments", "result", "failure", "reason", "prompt", "environment",
        "stdout", "stderr", "stack", "cause", "processLocalTokenRef", "extensions", "rawRef"]) {
        expect(() => assertAuditEvent(Object.freeze({ ...expected, [key]: CANARY }), expected))
          .toThrow("M4_045_AUDIT_CONTRACT_MISMATCH");
      }
    }
  });

  it("DAP-009/010 rejects canaries and wrong but digest-shaped substitutions in every digest field", () => {
    for (const expected of events) {
      for (const key of Object.keys(expected).filter((key) => key.endsWith("Key") || key.endsWith("Digest"))) {
        for (const value of [CANARY, "sha256:" + "0".repeat(64)]) {
          expect(() => assertAuditEvent(Object.freeze({ ...expected, [key]: value }), expected, [CANARY]))
            .toThrow("M4_045_AUDIT_CONTRACT_MISMATCH");
        }
      }
    }
  });

  it("DAP-013 optional call/root/error fields require an independent matching expectation", () => {
    for (const [index, fields] of [[3, { rootCallKey: digest, turnKey: digest, stepKey: digest }],
      [4, { errorCodeDigest: digest }], [5, { callKey: digest }]] as const) {
      const expected = Object.freeze({ ...events[index]!, ...fields });
      assertAuditEvent(Object.freeze({ ...expected }), expected);
      expect(() => assertAuditEvent(events[index], expected)).toThrow();
      expect(() => assertAuditEvent(expected, events[index]!)).toThrow();
    }
  });

  it("DAP-016 rejects invalid closed enums and timestamps even if the expectation repeats the defect", () => {
    for (const [index, key, value] of [[0, "source", CANARY], [4, "outcome", "allowed"],
      [5, "outcome", "ALLOWED_ALWAYS"], [8, "status", "success"],
      [1, "observedAt", CANARY], [1, "observedAt", "2026-09-06"]] as const) {
      const invalid = Object.freeze({ ...events[index]!, [key]: value });
      expect(() => assertAuditEvent(invalid, invalid)).toThrow("M4_045_AUDIT_CONTRACT_MISMATCH");
    }
  });

  it("DAP-020/024 oracle errors do not invoke hostile properties or include raw diagnostics", () => {
    let reads = 0;
    const hostile = Object.freeze(Object.defineProperty({ ...events[4] }, "resultDigest", {
      enumerable: true, get() { reads += 1; throw new Error(CANARY); },
    }));
    expect(() => assertAuditEvent(hostile, events[4]!)).toThrow("M4_045_AUDIT_CONTRACT_MISMATCH");
    expect(reads).toBe(0);
    expect(() => assertAuditEvent({ ...events[4] }, events[4]!)).toThrow();
    const poisoned = Object.freeze(Object.assign({ ...events[4] }, { [Symbol("hidden")]: CANARY }));
    expect(() => assertAuditEvent(poisoned, events[4]!)).toThrow();
  });

  it.each(vectors.vectors)("DAP-018 independently hashes authored canonical bytes: $id", async (vector) => {
    expect(JSON.parse(vector.canonicalEnvelope)).toEqual([AUDIT_PROFILE, vector.domain, vector.input]);
    expect(await digestCanonicalEnvelope(vector.canonicalEnvelope)).toBe(vector.expectedDigest);
    assertDigestProbe(() => ({ kind: "digest", value: vector.expectedDigest }),
      vector.domain, vector.input, { kind: "digest", value: vector.expectedDigest });
    expect(() => assertDigestProbe(() => ({ kind: "digest", value: "sha256:" + "0".repeat(64) }),
      vector.domain, vector.input, { kind: "digest", value: vector.expectedDigest })).toThrow();
  });

  it("DAP-005/012 distinguishes whitespace, session and identity-domain vectors", () => {
    expect(vectors.vectors[0]!.expectedDigest).not.toBe(vectors.vectors[1]!.expectedDigest);
    expect(new Set(vectors.vectors.slice(3, 6).map((vector) => vector.expectedDigest)).size).toBe(3);
  });

  it("DAP-022 freezes inclusive depth, node and UTF-8 byte boundary fixtures for the future encoder", async () => {
    const cases = await auditDigestBoundaryCases();
    expect(cases.map((entry) => entry.id)).toEqual(["DAL-001", "DAL-002", "DAL-003", "DAL-004", "DAL-005", "DAL-006"]);
    expect(cases.map((entry) => entry.expected.kind)).toEqual(["digest", "rejected", "digest", "rejected", "digest", "rejected"]);
    expect((cases[2]!.source as unknown[]).length + 4).toBe(65_536);
    expect((cases[3]!.source as unknown[]).length + 4).toBe(65_537);
    for (const [index, bytes] of [[4, 1_048_576], [5, 1_048_577]] as const) {
      expect(new TextEncoder().encode(JSON.stringify([AUDIT_PROFILE, "result/final-json", cases[index]!.source])).length).toBe(bytes);
    }
    for (const entry of cases.filter((entry) => entry.expected.kind === "rejected")) {
      expect(() => assertDigestProbe(() => ({ kind: "digest", value: digest }),
        entry.domain, entry.source, entry.expected)).toThrow();
    }
  });

  it("DAP-019/021 rejects an always-accepting probe on each unsupported input fixture", () => {
    const cases = auditDigestUnsupportedCases();
    expect(cases).toHaveLength(16);
    for (const entry of cases) {
      expect(() => assertDigestProbe(() => ({ kind: "digest", value: digest }),
        entry.domain, entry.source, entry.expected)).toThrow();
    }
  });

  it("DAP-025/028 distinguishes settled delivery from false success", () => {
    assertAuditSummary(complete, complete);
    assertAuditSummary(incomplete, incomplete);
    for (const patch of [
      { status: "COMPLETE" }, { deliveryFailed: 0 }, { projectionRejected: -1 },
      { diagnostics: Object.freeze([]) }, { delivered: 3 },
      { delivered: Number.MAX_SAFE_INTEGER + 1 }, { message: CANARY },
    ]) {
      expect(() => assertAuditSummary(Object.freeze({ ...incomplete, ...patch }), incomplete))
        .toThrow("M4_045_AUDIT_CONTRACT_MISMATCH");
    }
  });

  it("DAP-024/027 rejects unsafe, duplicated, unordered or mutable diagnostics and inexact COMPLETE", () => {
    for (const diagnostics of [
      Object.freeze([CANARY]), Object.freeze(["AUDIT_SINK_FAILED", "AUDIT_INPUT_UNSUPPORTED"]),
      Object.freeze(["AUDIT_INPUT_UNSUPPORTED", "AUDIT_INPUT_UNSUPPORTED", "AUDIT_SINK_FAILED"]),
      ["AUDIT_INPUT_UNSUPPORTED", "AUDIT_SINK_FAILED"],
    ]) {
      expect(() => assertAuditSummary(Object.freeze({ ...incomplete, diagnostics }), incomplete)).toThrow();
    }
    const overflow: AuditDeliverySummary = Object.freeze({
      delivered: Number.MAX_SAFE_INTEGER, projectionRejected: 0, deliveryFailed: 0,
      countsExact: false, status: "INCOMPLETE", diagnostics: Object.freeze(["AUDIT_LIMIT_EXCEEDED"] as const),
    });
    assertAuditSummary(overflow, overflow);
    expect(() => assertAuditSummary(Object.freeze({ ...overflow, status: "COMPLETE" }), overflow)).toThrow();
  });
});
