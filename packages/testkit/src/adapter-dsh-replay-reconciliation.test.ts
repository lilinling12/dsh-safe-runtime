import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import {
  AdapterDshReplayReconciliationFixtureError,
  parseAdapterDshReplayReconciliationFixture,
  runAdapterDshReplayReconciliationFixture,
  type AdapterDshReplayDurableFact,
  type AdapterDshReplayReconciliationObservable,
  type AdapterDshReplayReconciliationStimulus,
  type AdapterDshReplaySidecarEvidence,
} from "./adapter-dsh-replay-reconciliation.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixtureRoot = resolve(root, "fixtures/tck/valid");
const specPath = resolve(root, "specs/0016-m3-adapter-dsh-replay-reconciliation-tck.md");
const runnerPath = resolve(here, "adapter-dsh-replay-reconciliation.ts");
const fixtureNames = [
  "adapter-dsh-replay-clean-snapshot.json",
  "adapter-dsh-replay-overlap-tail.json",
  "adapter-dsh-replay-sidecar-anchor.json",
  "adapter-dsh-replay-sidecar-idempotent.json",
  "adapter-dsh-replay-durable-conflict.json",
  "adapter-dsh-replay-sequence-gap.json",
  "adapter-dsh-replay-sidecar-orphan.json",
  "adapter-dsh-replay-evidence-conflict.json",
] as const;

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} is not an object`);
  }
  return value as JsonRecord;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array`);
  return value;
}

async function loadRaw(name: (typeof fixtureNames)[number]): Promise<JsonRecord> {
  return record(JSON.parse(await readFile(resolve(fixtureRoot, name), "utf8")), "fixture");
}

async function load(name: (typeof fixtureNames)[number]) {
  return parseAdapterDshReplayReconciliationFixture(await loadRaw(name));
}

function source(raw: JsonRecord): JsonRecord {
  return record(record(raw.stimulus, "stimulus").source, "source");
}

function snapshotFacts(raw: JsonRecord): unknown[] {
  return array(record(source(raw).snapshot, "snapshot").facts, "snapshot.facts");
}

function liveFacts(raw: JsonRecord): unknown[] {
  return array(record(source(raw).live, "live").facts, "live.facts");
}

function sidecar(raw: JsonRecord): unknown[] {
  return array(source(raw).sidecar, "sidecar");
}

function sidecarEqual(
  left: AdapterDshReplaySidecarEvidence,
  right: AdapterDshReplaySidecarEvidence,
): boolean {
  return left.durableEventRef === right.durableEventRef
    && left.durableSequence === right.durableSequence
    && left.sessionRef === right.sessionRef
    && left.turnRef === right.turnRef
    && left.stepRef === right.stepRef
    && left.callRef === right.callRef
    && left.evidenceRef === right.evidenceRef
    && left.evidenceDigest === right.evidenceDigest;
}

/**
 * For valid Unicode scalar strings, UTF-8 byte lexicographic order is exactly
 * Unicode scalar-value order. Comparing code points keeps this test projection
 * runtime-independent and deliberately avoids locale-sensitive collation.
 */
function utf8ByteCompare(left: string, right: string): number {
  const leftPoints = Array.from(left, char => char.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, char => char.codePointAt(0) ?? 0);
  const limit = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < limit; index += 1) {
    const delta = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return leftPoints.length - rightPoints.length;
}

function conflict(
  sessionRef: string,
  code: "DURABLE_FACT_CONFLICT" | "DURABLE_SEQUENCE_GAP" | "SIDECAR_ORPHAN" | "EVIDENCE_CONFLICT",
  durableSequence: number,
): AdapterDshReplayReconciliationObservable {
  return { kind: "REPLAY_CONFLICT", sessionRef, code, durableSequence };
}

/**
 * Test-side semantic projection used only to exercise the generic TCK runner.
 * It receives parsed source facts, never expectation data.
 */
function projectFromSource(
  stimulus: AdapterDshReplayReconciliationStimulus,
): AdapterDshReplayReconciliationObservable {
  const sessionRef = stimulus.request.sessionRef;
  const snapshot = [...stimulus.source.snapshot.facts];
  const live = stimulus.source.live.facts;
  const factConflicts: number[] = [];
  const gaps: number[] = [];
  let previousLiveSequence: number | undefined;
  let next = snapshot.length;

  for (const fact of live) {
    if (previousLiveSequence !== undefined && fact.durableSequence <= previousLiveSequence) {
      factConflicts.push(fact.durableSequence);
    }
    previousLiveSequence = fact.durableSequence;

    const existing = snapshot[fact.durableSequence];
    if (existing !== undefined) {
      if (
        existing.durableEventRef !== fact.durableEventRef
        || existing.eventDigest !== fact.eventDigest
      ) {
        factConflicts.push(fact.durableSequence);
      }
      continue;
    }

    if (fact.durableSequence > next) {
      gaps.push(next);
      continue;
    }
    if (fact.durableSequence < next) {
      factConflicts.push(fact.durableSequence);
      continue;
    }
    snapshot.push(fact);
    next += 1;
  }

  if (factConflicts.length > 0) {
    return conflict(sessionRef, "DURABLE_FACT_CONFLICT", Math.min(...factConflicts));
  }
  if (gaps.length > 0) {
    return conflict(sessionRef, "DURABLE_SEQUENCE_GAP", Math.min(...gaps));
  }

  const orphanSequences: number[] = [];
  const uniqueEvidence = new Map<string, AdapterDshReplaySidecarEvidence>();
  const evidenceConflicts: Array<{ sequence: number; evidenceRef: string }> = [];

  for (const evidence of stimulus.source.sidecar) {
    const anchor = snapshot[evidence.durableSequence];
    if (anchor === undefined || anchor.durableEventRef !== evidence.durableEventRef) {
      orphanSequences.push(evidence.durableSequence);
    }

    const existing = uniqueEvidence.get(evidence.evidenceRef);
    if (existing === undefined) {
      uniqueEvidence.set(evidence.evidenceRef, evidence);
    } else if (!sidecarEqual(existing, evidence)) {
      evidenceConflicts.push({
        sequence: Math.min(existing.durableSequence, evidence.durableSequence),
        evidenceRef: evidence.evidenceRef,
      });
    }
  }

  if (orphanSequences.length > 0) {
    return conflict(sessionRef, "SIDECAR_ORPHAN", Math.min(...orphanSequences));
  }
  if (evidenceConflicts.length > 0) {
    evidenceConflicts.sort((left, right) =>
      left.sequence - right.sequence || utf8ByteCompare(left.evidenceRef, right.evidenceRef));
    return conflict(
      sessionRef,
      "EVIDENCE_CONFLICT",
      evidenceConflicts[0]?.sequence ?? 0,
    );
  }

  const evidence = [...uniqueEvidence.values()].sort((left, right) =>
    left.durableSequence - right.durableSequence
      || utf8ByteCompare(left.evidenceRef, right.evidenceRef));
  return {
    kind: "REPLAY_RECONCILED",
    sessionRef,
    nextDurableSequence: snapshot.length,
    durableFacts: snapshot,
    evidence,
  };
}

function cloneFact(
  fact: AdapterDshReplayDurableFact,
  eventDigest = fact.eventDigest,
): AdapterDshReplayDurableFact {
  return { ...fact, eventDigest };
}

describe("M3-017 Adapter DSH replay reconciliation portable profile", () => {
  it("passes all eight required replay reconciliation cases", async () => {
    for (const name of fixtureNames) {
      const fixture = await load(name);
      await expect(runAdapterDshReplayReconciliationFixture(fixture, projectFromSource))
        .resolves.toEqual({ status: "PASS" });
    }
  });

  it("requires snapshot history to be a complete contiguous prefix from zero", async () => {
    const raw = await loadRaw(fixtureNames[0]);
    record(snapshotFacts(raw)[1], "snapshot[1]").durableSequence = 2;
    record(snapshotFacts(raw)[1], "snapshot[1]").durableEventRef = "session:replay-clean/seq:2";
    const project = vi.fn(projectFromSource);
    expect(() => parseAdapterDshReplayReconciliationFixture(raw))
      .toThrow(AdapterDshReplayReconciliationFixtureError);
    expect(project).not.toHaveBeenCalled();
  });

  it("rejects wrong-session durable facts and sidecar records before implementation invocation", async () => {
    const factRaw = await loadRaw(fixtureNames[0]);
    record(snapshotFacts(factRaw)[0], "snapshot[0]").sessionRef = "session:other";
    expect(() => parseAdapterDshReplayReconciliationFixture(factRaw))
      .toThrow(AdapterDshReplayReconciliationFixtureError);

    const sidecarRaw = await loadRaw(fixtureNames[2]);
    record(sidecar(sidecarRaw)[0], "sidecar[0]").sessionRef = "session:other";
    expect(() => parseAdapterDshReplayReconciliationFixture(sidecarRaw))
      .toThrow(AdapterDshReplayReconciliationFixtureError);
  });

  it("requires canonical durable event references for facts and sidecar anchors", async () => {
    const factRaw = await loadRaw(fixtureNames[0]);
    record(snapshotFacts(factRaw)[0], "snapshot[0]").durableEventRef = "opaque:wrong";
    expect(() => parseAdapterDshReplayReconciliationFixture(factRaw))
      .toThrow(AdapterDshReplayReconciliationFixtureError);

    const sidecarRaw = await loadRaw(fixtureNames[2]);
    record(sidecar(sidecarRaw)[0], "sidecar[0]").durableEventRef = "opaque:wrong";
    expect(() => parseAdapterDshReplayReconciliationFixture(sidecarRaw))
      .toThrow(AdapterDshReplayReconciliationFixtureError);
  });

  it("treats live regression or duplicate sequence as semantic DURABLE_FACT_CONFLICT", async () => {
    const raw = await loadRaw(fixtureNames[1]);
    liveFacts(raw).push({ ...record(liveFacts(raw)[0], "live[0]") });
    const expectation = record(raw.expect, "expect");
    expectation.kind = "REPLAY_CONFLICT";
    expectation.code = "DURABLE_FACT_CONFLICT";
    expectation.durableSequence = 1;
    delete expectation.nextDurableSequence;
    delete expectation.durableFacts;
    delete expectation.evidence;

    const fixture = parseAdapterDshReplayReconciliationFixture(raw);
    await expect(runAdapterDshReplayReconciliationFixture(fixture, projectFromSource))
      .resolves.toEqual({ status: "PASS" });
  });

  it("rejects unknown conflict codes at the fixture boundary", async () => {
    const raw = await loadRaw(fixtureNames[4]);
    record(raw.expect, "expect").code = "LATEST_WRITE_WINS";
    expect(() => parseAdapterDshReplayReconciliationFixture(raw))
      .toThrow(AdapterDshReplayReconciliationFixtureError);
  });

  it("preserves optional sidecar correlation fields without parsing their string grammar", async () => {
    const raw = await loadRaw(fixtureNames[2]);
    const sourceEvidence = record(sidecar(raw)[0], "source evidence");
    const expectedEvidence = record(array(record(raw.expect, "expect").evidence, "expect evidence")[0], "expected evidence");
    sourceEvidence.turnRef = "opaque-turn-correlation";
    sourceEvidence.stepRef = "opaque-step-correlation";
    sourceEvidence.callRef = "opaque-call-correlation";
    expectedEvidence.turnRef = sourceEvidence.turnRef;
    expectedEvidence.stepRef = sourceEvidence.stepRef;
    expectedEvidence.callRef = sourceEvidence.callRef;

    const fixture = parseAdapterDshReplayReconciliationFixture(raw);
    await expect(runAdapterDshReplayReconciliationFixture(fixture, projectFromSource))
      .resolves.toEqual({ status: "PASS" });
  });

  it("orders same-sequence evidence by UTF-8 byte order rather than UTF-16 code units or locale", async () => {
    const raw = await loadRaw(fixtureNames[0]);
    const sourceValue = source(raw);
    sourceValue.sidecar = [
      {
        durableEventRef: "session:replay-clean/seq:0",
        durableSequence: 0,
        sessionRef: "session:replay-clean",
        evidenceRef: "😀",
        evidenceDigest: "digest:astral",
      },
      {
        durableEventRef: "session:replay-clean/seq:0",
        durableSequence: 0,
        sessionRef: "session:replay-clean",
        evidenceRef: "\uE000",
        evidenceDigest: "digest:bmp-private-use",
      },
    ];
    record(raw.expect, "expect").evidence = [
      {
        durableEventRef: "session:replay-clean/seq:0",
        durableSequence: 0,
        sessionRef: "session:replay-clean",
        evidenceRef: "\uE000",
        evidenceDigest: "digest:bmp-private-use",
      },
      {
        durableEventRef: "session:replay-clean/seq:0",
        durableSequence: 0,
        sessionRef: "session:replay-clean",
        evidenceRef: "😀",
        evidenceDigest: "digest:astral",
      },
    ];

    const fixture = parseAdapterDshReplayReconciliationFixture(raw);
    await expect(runAdapterDshReplayReconciliationFixture(fixture, projectFromSource))
      .resolves.toEqual({ status: "PASS" });
  });

  it("rejects evidence refs containing lone UTF-16 surrogates before byte ordering", async () => {
    const raw = await loadRaw(fixtureNames[2]);
    record(sidecar(raw)[0], "sidecar[0]").evidenceRef = "\ud800";
    const project = vi.fn(projectFromSource);
    expect(() => parseAdapterDshReplayReconciliationFixture(raw))
      .toThrow(AdapterDshReplayReconciliationFixtureError);
    expect(project).not.toHaveBeenCalled();
  });

  it("passes only stimulus to the implementation callback and keeps expectation comparison-only", async () => {
    const fixture = await load(fixtureNames[1]);
    const project = vi.fn((stimulus: AdapterDshReplayReconciliationStimulus) => projectFromSource(stimulus));
    await runAdapterDshReplayReconciliationFixture(fixture, project);
    expect(project).toHaveBeenCalledTimes(1);
    expect(project).toHaveBeenCalledWith(fixture.stimulus);
  });

  it("cannot manufacture sidecar evidence from expectation data", async () => {
    const raw = await loadRaw(fixtureNames[0]);
    record(raw.expect, "expect").evidence = [{
      durableEventRef: "session:replay-clean/seq:0",
      durableSequence: 0,
      sessionRef: "session:replay-clean",
      evidenceRef: "evidence:expectation-only",
      evidenceDigest: "digest:expectation-only",
    }];
    const fixture = parseAdapterDshReplayReconciliationFixture(raw);
    await expect(runAdapterDshReplayReconciliationFixture(fixture, projectFromSource))
      .resolves.toEqual({
        status: "FAIL",
        code: "ADAPTER_DSH_REPLAY_RECONCILIATION_MISMATCH",
      });
  });

  it("reports a structurally valid durable-fact mismatch as FAIL", async () => {
    const fixture = await load(fixtureNames[0]);
    await expect(runAdapterDshReplayReconciliationFixture(fixture, stimulus => ({
      kind: "REPLAY_RECONCILED",
      sessionRef: stimulus.request.sessionRef,
      nextDurableSequence: 2,
      durableFacts: [
        cloneFact(stimulus.source.snapshot.facts[0] as AdapterDshReplayDurableFact, "digest:wrong:0"),
        stimulus.source.snapshot.facts[1] as AdapterDshReplayDurableFact,
      ],
      evidence: [],
    }))).resolves.toEqual({
      status: "FAIL",
      code: "ADAPTER_DSH_REPLAY_RECONCILIATION_MISMATCH",
    });
  });

  it("reports a structurally valid wrong conflict as FAIL", async () => {
    const fixture = await load(fixtureNames[4]);
    await expect(runAdapterDshReplayReconciliationFixture(fixture, stimulus => ({
      kind: "REPLAY_CONFLICT",
      sessionRef: stimulus.request.sessionRef,
      code: "SIDECAR_ORPHAN",
      durableSequence: 0,
    }))).resolves.toEqual({
      status: "FAIL",
      code: "ADAPTER_DSH_REPLAY_RECONCILIATION_MISMATCH",
    });
  });

  it("maps implementation exceptions and malformed projections to ERROR", async () => {
    const fixture = await load(fixtureNames[0]);
    await expect(runAdapterDshReplayReconciliationFixture(fixture, () => {
      throw new Error("implementation failure");
    })).resolves.toEqual({
      status: "ERROR",
      code: "ADAPTER_DSH_REPLAY_RECONCILIATION_IMPLEMENTATION_ERROR",
    });

    await expect(runAdapterDshReplayReconciliationFixture(
      fixture,
      () => ({ kind: "REPLAY_RECONCILED" }) as unknown as AdapterDshReplayReconciliationObservable,
    )).resolves.toEqual({
      status: "ERROR",
      code: "ADAPTER_DSH_REPLAY_RECONCILIATION_IMPLEMENTATION_ERROR",
    });
  });

  it("rejects profile-owned unknown fields instead of silently ignoring them", async () => {
    const raw = await loadRaw(fixtureNames[0]);
    source(raw).latestTimestampWins = true;
    expect(() => parseAdapterDshReplayReconciliationFixture(raw))
      .toThrow(AdapterDshReplayReconciliationFixtureError);
  });

  it("rejects cyclic, exotic, sparse, decorated, and non-finite direct-call input", async () => {
    const cyclic = await loadRaw(fixtureNames[0]);
    cyclic.self = cyclic;
    expect(() => parseAdapterDshReplayReconciliationFixture(cyclic))
      .toThrow(AdapterDshReplayReconciliationFixtureError);

    const exotic = await loadRaw(fixtureNames[0]);
    Object.setPrototypeOf(record(exotic.stimulus, "stimulus"), new Date());
    expect(() => parseAdapterDshReplayReconciliationFixture(exotic))
      .toThrow(AdapterDshReplayReconciliationFixtureError);

    const sparse = await loadRaw(fixtureNames[0]);
    const sparseFacts = snapshotFacts(sparse);
    delete sparseFacts[0];
    expect(() => parseAdapterDshReplayReconciliationFixture(sparse))
      .toThrow(AdapterDshReplayReconciliationFixtureError);

    const decorated = await loadRaw(fixtureNames[0]);
    const decoratedFacts = snapshotFacts(decorated);
    (decoratedFacts as unknown as Record<string, unknown>).extra = true;
    expect(() => parseAdapterDshReplayReconciliationFixture(decorated))
      .toThrow(AdapterDshReplayReconciliationFixtureError);

    const nonFinite = await loadRaw(fixtureNames[0]);
    record(snapshotFacts(nonFinite)[0], "snapshot[0]").durableSequence = Number.POSITIVE_INFINITY;
    expect(() => parseAdapterDshReplayReconciliationFixture(nonFinite))
      .toThrow(AdapterDshReplayReconciliationFixtureError);
  });

  it("keeps portable M3-017 artifacts free of Harness package imports", async () => {
    const texts = [
      await readFile(specPath, "utf8"),
      await readFile(runnerPath, "utf8"),
      ...await Promise.all(fixtureNames.map(name => readFile(resolve(fixtureRoot, name), "utf8"))),
    ];
    for (const text of texts) {
      expect(text).not.toContain("@deepseek-ai/");
    }
  });
});
