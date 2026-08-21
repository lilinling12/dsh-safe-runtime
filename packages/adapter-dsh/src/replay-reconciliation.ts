import { dshAdapterError } from "./errors.js";
import type { SidecarEvidenceRecord } from "./sidecar.js";

export const REPLAY_RECONCILIATION_CONFLICT_CODES = [
  "DURABLE_FACT_CONFLICT",
  "DURABLE_SEQUENCE_GAP",
  "SIDECAR_ORPHAN",
  "EVIDENCE_CONFLICT",
] as const;

export type ReplayReconciliationConflictCode =
  (typeof REPLAY_RECONCILIATION_CONFLICT_CODES)[number];

/**
 * Opaque durable identity used by replay reconciliation.
 *
 * The helper never interprets the event digest or imports a Harness event type;
 * callers project concrete durable events into this boundary first.
 */
export interface ReplayDurableFact {
  readonly sessionRef: string;
  readonly durableSequence: number;
  readonly durableEventRef: string;
  readonly eventDigest: string;
}

export interface ReplayReconciliationInput {
  readonly sessionRef: string;
  /** Complete durable prefix beginning at sequence zero. */
  readonly snapshot: readonly ReplayDurableFact[];
  /** Buffered/live post-commit durable feed, which may overlap the snapshot. */
  readonly live: readonly ReplayDurableFact[];
  /** Safe-runtime evidence records persisted outside the Harness session log. */
  readonly sidecar: readonly SidecarEvidenceRecord[];
}

export interface ReplayReconciliationSuccess {
  readonly kind: "REPLAY_RECONCILED";
  readonly sessionRef: string;
  readonly nextDurableSequence: number;
  readonly durableFacts: readonly ReplayDurableFact[];
  readonly evidence: readonly SidecarEvidenceRecord[];
}

export interface ReplayReconciliationConflict {
  readonly kind: "REPLAY_CONFLICT";
  readonly sessionRef: string;
  readonly code: ReplayReconciliationConflictCode;
  readonly durableSequence: number;
}

export type ReplayReconciliationResult =
  | ReplayReconciliationSuccess
  | ReplayReconciliationConflict;

const DURABLE_FACT_KEYS = [
  "sessionRef",
  "durableSequence",
  "durableEventRef",
  "eventDigest",
] as const;
const SIDECAR_REQUIRED_KEYS = [
  "durableEventRef",
  "durableSequence",
  "sessionRef",
  "evidenceRef",
  "evidenceDigest",
] as const;
const SIDECAR_OPTIONAL_KEYS = ["turnRef", "stepRef", "callRef"] as const;

function invalid(message: string): never {
  throw dshAdapterError("INVALID_REPLAY_RECONCILIATION_INPUT", message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null)
    && Object.getOwnPropertySymbols(value).length === 0;
}

function requireExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const allowed = new Set([...required, ...optional]);
  const keys = Object.keys(value);
  if (required.some(key => !Object.hasOwn(value, key)) || keys.some(key => !allowed.has(key))) {
    invalid(`${label} contains an unsupported or missing field`);
  }
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    invalid(`${label} must be a non-empty string`);
  }
  return value;
}

function requireSequence(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    invalid(`${label} must be a non-negative safe integer`);
  }
  return value;
}

/**
 * UTF-8 ordering is portable only for Unicode scalar sequences. Lone UTF-16
 * surrogates have runtime-specific replacement/rejection behavior, so stored
 * evidence references carrying them fail closed before ordering.
 */
function requireUnicodeScalarString(value: unknown, label: string): string {
  const text = requireNonEmptyString(value, label);
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        invalid(`${label} must contain only Unicode scalar values`);
      }
      index += 1;
      continue;
    }
    if (unit >= 0xdc00 && unit <= 0xdfff) {
      invalid(`${label} must contain only Unicode scalar values`);
    }
  }
  return text;
}

function canonicalEventRef(sessionRef: string, sequence: number): string {
  return `${sessionRef}/seq:${sequence}`;
}

function snapshotDurableFact(
  value: unknown,
  sessionRef: string,
  label: string,
): ReplayDurableFact {
  if (!isRecord(value)) invalid(`${label} must be an ordinary object`);
  requireExactKeys(value, DURABLE_FACT_KEYS, [], label);
  const factSessionRef = requireNonEmptyString(value.sessionRef, `${label}.sessionRef`);
  if (factSessionRef !== sessionRef) invalid(`${label} belongs to a different session`);
  const durableSequence = requireSequence(value.durableSequence, `${label}.durableSequence`);
  const durableEventRef = requireNonEmptyString(value.durableEventRef, `${label}.durableEventRef`);
  if (durableEventRef !== canonicalEventRef(sessionRef, durableSequence)) {
    invalid(`${label}.durableEventRef is not canonical for its session and sequence`);
  }
  return Object.freeze({
    sessionRef,
    durableSequence,
    durableEventRef,
    eventDigest: requireNonEmptyString(value.eventDigest, `${label}.eventDigest`),
  });
}

function optionalCorrelation(
  value: Record<string, unknown>,
  key: (typeof SIDECAR_OPTIONAL_KEYS)[number],
  label: string,
): string | undefined {
  if (!Object.hasOwn(value, key)) return undefined;
  return requireNonEmptyString(value[key], `${label}.${key}`);
}

function snapshotSidecarEvidence(
  value: unknown,
  sessionRef: string,
  label: string,
): SidecarEvidenceRecord {
  if (!isRecord(value)) invalid(`${label} must be an ordinary object`);
  requireExactKeys(value, SIDECAR_REQUIRED_KEYS, SIDECAR_OPTIONAL_KEYS, label);
  const recordSessionRef = requireNonEmptyString(value.sessionRef, `${label}.sessionRef`);
  if (recordSessionRef !== sessionRef) invalid(`${label} belongs to a different session`);
  const durableSequence = requireSequence(value.durableSequence, `${label}.durableSequence`);
  const durableEventRef = requireNonEmptyString(value.durableEventRef, `${label}.durableEventRef`);
  if (durableEventRef !== canonicalEventRef(sessionRef, durableSequence)) {
    invalid(`${label}.durableEventRef is not canonical for its session and sequence`);
  }
  const turnRef = optionalCorrelation(value, "turnRef", label);
  const stepRef = optionalCorrelation(value, "stepRef", label);
  const callRef = optionalCorrelation(value, "callRef", label);
  return Object.freeze({
    durableEventRef,
    durableSequence,
    sessionRef,
    ...(turnRef === undefined ? {} : { turnRef }),
    ...(stepRef === undefined ? {} : { stepRef }),
    ...(callRef === undefined ? {} : { callRef }),
    evidenceRef: requireUnicodeScalarString(value.evidenceRef, `${label}.evidenceRef`),
    evidenceDigest: requireNonEmptyString(value.evidenceDigest, `${label}.evidenceDigest`),
  });
}

function snapshotArray<T>(
  value: unknown,
  label: string,
  snapshot: (entry: unknown, index: number) => T,
): readonly T[] {
  if (!Array.isArray(value)) invalid(`${label} must be an array`);
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    invalid(`${label} must not carry symbol properties`);
  }
  const keys = Object.keys(value);
  if (
    keys.length !== value.length
    || keys.some(key => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)
  ) {
    invalid(`${label} must be a dense undecorated array`);
  }
  return Object.freeze(value.map((entry, index) => snapshot(entry, index)));
}

function sidecarEqual(left: SidecarEvidenceRecord, right: SidecarEvidenceRecord): boolean {
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
 * For valid scalar strings, UTF-8 byte lexicographic order equals scalar-value
 * order. Comparing code points therefore avoids locale-sensitive collation and
 * Node-specific Buffer dependencies while preserving the portable ordering.
 */
function utf8ByteCompare(left: string, right: string): number {
  const leftIterator = left[Symbol.iterator]();
  const rightIterator = right[Symbol.iterator]();
  while (true) {
    const leftNext = leftIterator.next();
    const rightNext = rightIterator.next();
    if (leftNext.done || rightNext.done) {
      if (leftNext.done && rightNext.done) return 0;
      return leftNext.done ? -1 : 1;
    }
    const leftCodePoint = leftNext.value.codePointAt(0);
    const rightCodePoint = rightNext.value.codePointAt(0);
    if (leftCodePoint === undefined || rightCodePoint === undefined) {
      invalid("evidenceRef contains an invalid Unicode scalar value");
    }
    if (leftCodePoint !== rightCodePoint) return leftCodePoint - rightCodePoint;
  }
}

function conflict(
  sessionRef: string,
  code: ReplayReconciliationConflictCode,
  durableSequence: number,
): ReplayReconciliationConflict {
  return Object.freeze({
    kind: "REPLAY_CONFLICT",
    sessionRef,
    code,
    durableSequence,
  });
}

/**
 * Reconcile one complete durable snapshot with a buffered/live durable tail and
 * sidecar evidence.
 *
 * Structural corruption fails with an adapter-layer error. Structurally valid
 * but contradictory histories return a closed semantic conflict so callers can
 * distinguish invalid storage from an unsafe replay state. No Harness event
 * payload or live-only final-result authority is reconstructed here.
 */
export function reconcileReplayEvidence(
  input: Readonly<ReplayReconciliationInput>,
): ReplayReconciliationResult {
  if (!isRecord(input)) invalid("replay reconciliation input must be an ordinary object");
  requireExactKeys(input, ["sessionRef", "snapshot", "live", "sidecar"], [], "replay input");
  const sessionRef = requireNonEmptyString(input.sessionRef, "replay input.sessionRef");
  const snapshot = snapshotArray(
    input.snapshot,
    "replay input.snapshot",
    (entry, index) => snapshotDurableFact(entry, sessionRef, `replay input.snapshot[${index}]`),
  );
  const live = snapshotArray(
    input.live,
    "replay input.live",
    (entry, index) => snapshotDurableFact(entry, sessionRef, `replay input.live[${index}]`),
  );
  const sidecar = snapshotArray(
    input.sidecar,
    "replay input.sidecar",
    (entry, index) => snapshotSidecarEvidence(entry, sessionRef, `replay input.sidecar[${index}]`),
  );

  for (let index = 0; index < snapshot.length; index += 1) {
    if (snapshot[index]?.durableSequence !== index) {
      invalid("replay snapshot must be a complete contiguous durable prefix from sequence zero");
    }
  }

  // First collect every same-identity/order contradiction. This class outranks
  // gaps, so a later regression cannot be hidden by an earlier missing tail.
  const durableFactConflicts: number[] = [];
  let previousLiveSequence: number | undefined;
  for (const fact of live) {
    if (previousLiveSequence !== undefined && fact.durableSequence <= previousLiveSequence) {
      durableFactConflicts.push(fact.durableSequence);
    }
    previousLiveSequence = fact.durableSequence;
    const existing = snapshot[fact.durableSequence];
    if (existing !== undefined && existing.eventDigest !== fact.eventDigest) {
      durableFactConflicts.push(fact.durableSequence);
    }
  }
  if (durableFactConflicts.length > 0) {
    return conflict(
      sessionRef,
      "DURABLE_FACT_CONFLICT",
      Math.min(...durableFactConflicts),
    );
  }

  let nextDurableSequence = snapshot.length;
  const gaps: number[] = [];
  for (const fact of live) {
    if (fact.durableSequence < snapshot.length) continue;
    if (fact.durableSequence === nextDurableSequence) {
      nextDurableSequence += 1;
      continue;
    }
    if (fact.durableSequence > nextDurableSequence) gaps.push(nextDurableSequence);
  }
  if (gaps.length > 0) {
    return conflict(sessionRef, "DURABLE_SEQUENCE_GAP", Math.min(...gaps));
  }

  const durableFacts: ReplayDurableFact[] = [...snapshot];
  for (const fact of live) {
    if (fact.durableSequence >= snapshot.length) durableFacts.push(fact);
  }
  const frozenDurableFacts = Object.freeze(durableFacts);

  const orphanSequences: number[] = [];
  const evidenceByRef = new Map<string, SidecarEvidenceRecord>();
  const evidenceConflicts: Array<{ durableSequence: number; evidenceRef: string }> = [];
  for (const evidence of sidecar) {
    const anchor = frozenDurableFacts[evidence.durableSequence];
    if (anchor === undefined || anchor.durableEventRef !== evidence.durableEventRef) {
      orphanSequences.push(evidence.durableSequence);
    }
    const prior = evidenceByRef.get(evidence.evidenceRef);
    if (prior === undefined) {
      evidenceByRef.set(evidence.evidenceRef, evidence);
      continue;
    }
    if (!sidecarEqual(prior, evidence)) {
      evidenceConflicts.push({
        durableSequence: Math.min(prior.durableSequence, evidence.durableSequence),
        evidenceRef: evidence.evidenceRef,
      });
    }
  }

  if (orphanSequences.length > 0) {
    return conflict(sessionRef, "SIDECAR_ORPHAN", Math.min(...orphanSequences));
  }
  if (evidenceConflicts.length > 0) {
    evidenceConflicts.sort((left, right) =>
      left.durableSequence - right.durableSequence
        || utf8ByteCompare(left.evidenceRef, right.evidenceRef));
    const first = evidenceConflicts[0];
    if (first === undefined) invalid("replay evidence conflict ordering failed");
    return conflict(sessionRef, "EVIDENCE_CONFLICT", first.durableSequence);
  }

  const evidence = [...evidenceByRef.values()].sort((left, right) =>
    left.durableSequence - right.durableSequence
      || utf8ByteCompare(left.evidenceRef, right.evidenceRef));
  return Object.freeze({
    kind: "REPLAY_RECONCILED",
    sessionRef,
    nextDurableSequence: frozenDurableFacts.length,
    durableFacts: frozenDurableFacts,
    evidence: Object.freeze(evidence),
  });
}
