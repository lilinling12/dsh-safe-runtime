import type { TckFixtureV1Alpha1, TckJsonValue } from "./tck-contract.js";

export const ADAPTER_DSH_REPLAY_RECONCILIATION_OPERATION = "replay-reconciliation" as const;
export const ADAPTER_DSH_REPLAY_RECONCILIATION_ERROR_CODES = [
  "INVALID_ADAPTER_DSH_REPLAY_RECONCILIATION_FIXTURE",
] as const;
export const ADAPTER_DSH_REPLAY_CONFLICT_CODES = [
  "DURABLE_FACT_CONFLICT",
  "DURABLE_SEQUENCE_GAP",
  "SIDECAR_ORPHAN",
  "EVIDENCE_CONFLICT",
] as const;

export type AdapterDshReplayReconciliationErrorCode =
  (typeof ADAPTER_DSH_REPLAY_RECONCILIATION_ERROR_CODES)[number];
export type AdapterDshReplayConflictCode =
  (typeof ADAPTER_DSH_REPLAY_CONFLICT_CODES)[number];

export interface AdapterDshReplayDurableFact {
  readonly sessionRef: string;
  readonly durableSequence: number;
  readonly durableEventRef: string;
  readonly eventDigest: string;
}

export interface AdapterDshReplaySidecarEvidence {
  readonly durableEventRef: string;
  readonly durableSequence: number;
  readonly sessionRef: string;
  readonly turnRef?: string;
  readonly stepRef?: string;
  readonly callRef?: string;
  readonly evidenceRef: string;
  readonly evidenceDigest: string;
}

export interface AdapterDshReplayReconciliationRequest {
  readonly sessionRef: string;
}

export interface AdapterDshReplayReconciliationSource {
  readonly snapshot: {
    readonly facts: readonly AdapterDshReplayDurableFact[];
  };
  readonly live: {
    readonly facts: readonly AdapterDshReplayDurableFact[];
  };
  readonly sidecar: readonly AdapterDshReplaySidecarEvidence[];
}

export interface AdapterDshReplayReconciliationStimulus {
  readonly operation: typeof ADAPTER_DSH_REPLAY_RECONCILIATION_OPERATION;
  readonly request: AdapterDshReplayReconciliationRequest;
  readonly source: AdapterDshReplayReconciliationSource;
}

export type AdapterDshReplayReconciliationObservable =
  | {
      readonly kind: "REPLAY_RECONCILED";
      readonly sessionRef: string;
      readonly nextDurableSequence: number;
      readonly durableFacts: readonly AdapterDshReplayDurableFact[];
      readonly evidence: readonly AdapterDshReplaySidecarEvidence[];
    }
  | {
      readonly kind: "REPLAY_CONFLICT";
      readonly sessionRef: string;
      readonly code: AdapterDshReplayConflictCode;
      readonly durableSequence: number;
    };

export interface AdapterDshReplayReconciliationFixture {
  readonly envelope: TckFixtureV1Alpha1;
  readonly stimulus: AdapterDshReplayReconciliationStimulus;
  readonly expect: AdapterDshReplayReconciliationObservable;
}

export type AdapterDshReplayReconciliationCaseResult =
  | { readonly status: "PASS" }
  | { readonly status: "FAIL"; readonly code: string }
  | { readonly status: "ERROR"; readonly code: string };

export class AdapterDshReplayReconciliationFixtureError extends Error {
  readonly code: AdapterDshReplayReconciliationErrorCode;

  constructor(message: string) {
    super(message);
    this.name = "AdapterDshReplayReconciliationFixtureError";
    this.code = "INVALID_ADAPTER_DSH_REPLAY_RECONCILIATION_FIXTURE";
  }
}

function invalid(message: string): never {
  throw new AdapterDshReplayReconciliationFixtureError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null)
    && Object.getOwnPropertySymbols(value).length === 0;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    invalid(`${label} must contain exactly: ${wanted.join(", ")}`);
  }
}

function allowedKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const allowed = new Set<string>([...required, ...optional]);
  const actual = Object.keys(value);
  for (const key of required) {
    if (!Object.hasOwn(value, key)) invalid(`${label} is missing required field ${key}`);
  }
  for (const key of actual) {
    if (!allowed.has(key)) invalid(`${label} contains unsupported field ${key}`);
  }
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) invalid(`${label} must be a non-empty string`);
  return value;
}

function unicodeScalarString(value: unknown, label: string): string {
  const text = nonEmptyString(value, label);
  for (let index = 0; index < text.length; index += 1) {
    const codeUnit = text.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        invalid(`${label} must contain only Unicode scalar values`);
      }
      index += 1;
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      invalid(`${label} must contain only Unicode scalar values`);
    }
  }
  return text;
}

function safeInteger(value: unknown, label: string, positive = false): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || (positive && value === 0)) {
    invalid(`${label} must be a ${positive ? "positive" : "non-negative"} safe integer`);
  }
  return value;
}

/**
 * Materialize only portable JSON values before profile parsing. This rejects
 * runtime-specific objects, symbols, cycles, sparse/decorated arrays, and
 * non-finite numbers before replay semantics are considered.
 */
function portableJson(value: unknown, label: string, seen = new Set<object>()): TckJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) invalid(`${label} must contain only finite JSON numbers`);
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) invalid(`${label} must not contain cycles`);
    seen.add(value);
    const keys = Object.keys(value);
    if (
      Object.getOwnPropertySymbols(value).length !== 0
      || keys.length !== value.length
      || keys.some(key => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)
    ) {
      invalid(`${label} must contain dense undecorated JSON arrays`);
    }
    const result = value.map((entry, index) => portableJson(entry, `${label}[${index}]`, seen));
    seen.delete(value);
    return result;
  }
  if (!isRecord(value)) invalid(`${label} must contain only ordinary JSON objects`);
  if (seen.has(value)) invalid(`${label} must not contain cycles`);
  seen.add(value);
  const result: Record<string, TckJsonValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = portableJson(entry, `${label}.${key}`, seen);
  }
  seen.delete(value);
  return result;
}

function parseEnvelope(value: unknown): TckFixtureV1Alpha1 {
  const json = portableJson(value, "fixture");
  if (!isRecord(json)) invalid("fixture must be an object");
  exactKeys(
    json,
    ["apiVersion", "id", "profile", "description", "determinism", "stimulus", "expect"],
    "fixture",
  );
  if (json.apiVersion !== "safe-runtime.dev/tck-fixture/v1alpha1") {
    invalid("fixture apiVersion is unsupported");
  }
  nonEmptyString(json.id, "fixture.id");
  if (json.profile !== "ADAPTER_DSH") invalid("fixture.profile must be ADAPTER_DSH");
  nonEmptyString(json.description, "fixture.description");
  if (!isRecord(json.determinism)) invalid("fixture.determinism must be an object");
  exactKeys(json.determinism, ["seed", "clock"], "fixture.determinism");
  if (safeInteger(json.determinism.seed, "fixture.determinism.seed") > 4_294_967_295) {
    invalid("fixture.determinism.seed exceeds uint32 range");
  }
  if (!isRecord(json.determinism.clock)) invalid("fixture.determinism.clock must be an object");
  exactKeys(json.determinism.clock, ["startUnixMs", "tickMs"], "fixture.determinism.clock");
  safeInteger(json.determinism.clock.startUnixMs, "fixture.determinism.clock.startUnixMs");
  safeInteger(json.determinism.clock.tickMs, "fixture.determinism.clock.tickMs", true);
  return json as unknown as TckFixtureV1Alpha1;
}

function canonicalEventRef(sessionRef: string, sequence: number): string {
  return `${sessionRef}/seq:${sequence}`;
}

function parseDurableFact(
  value: unknown,
  label: string,
  expectedSessionRef: string,
): AdapterDshReplayDurableFact {
  if (!isRecord(value)) invalid(`${label} must be an object`);
  exactKeys(value, ["sessionRef", "durableSequence", "durableEventRef", "eventDigest"], label);
  const sessionRef = nonEmptyString(value.sessionRef, `${label}.sessionRef`);
  if (sessionRef !== expectedSessionRef) invalid(`${label}.sessionRef must match request.sessionRef`);
  const durableSequence = safeInteger(value.durableSequence, `${label}.durableSequence`);
  const durableEventRef = nonEmptyString(value.durableEventRef, `${label}.durableEventRef`);
  if (durableEventRef !== canonicalEventRef(sessionRef, durableSequence)) {
    invalid(`${label}.durableEventRef is not canonical for its session/sequence`);
  }
  return {
    sessionRef,
    durableSequence,
    durableEventRef,
    eventDigest: nonEmptyString(value.eventDigest, `${label}.eventDigest`),
  };
}

function parseFactList(
  value: unknown,
  label: string,
  expectedSessionRef: string,
): readonly AdapterDshReplayDurableFact[] {
  if (!Array.isArray(value)) invalid(`${label} must be an array`);
  return value.map((entry, index) => parseDurableFact(entry, `${label}[${index}]`, expectedSessionRef));
}

function parseSnapshot(
  value: unknown,
  expectedSessionRef: string,
): { readonly facts: readonly AdapterDshReplayDurableFact[] } {
  if (!isRecord(value)) invalid("fixture.stimulus.source.snapshot must be an object");
  exactKeys(value, ["facts"], "fixture.stimulus.source.snapshot");
  const facts = parseFactList(
    value.facts,
    "fixture.stimulus.source.snapshot.facts",
    expectedSessionRef,
  );
  for (const [index, fact] of facts.entries()) {
    if (fact.durableSequence !== index) {
      invalid("M3-017 snapshot must be a complete contiguous prefix starting at sequence 0");
    }
  }
  return { facts };
}

function parseLive(
  value: unknown,
  expectedSessionRef: string,
): { readonly facts: readonly AdapterDshReplayDurableFact[] } {
  if (!isRecord(value)) invalid("fixture.stimulus.source.live must be an object");
  exactKeys(value, ["facts"], "fixture.stimulus.source.live");
  const facts = parseFactList(value.facts, "fixture.stimulus.source.live.facts", expectedSessionRef);
  return { facts };
}

function parseSidecarEvidence(
  value: unknown,
  label: string,
  expectedSessionRef: string,
): AdapterDshReplaySidecarEvidence {
  if (!isRecord(value)) invalid(`${label} must be an object`);
  const required = [
    "durableEventRef",
    "durableSequence",
    "sessionRef",
    "evidenceRef",
    "evidenceDigest",
  ] as const;
  const optional = ["turnRef", "stepRef", "callRef"] as const;
  allowedKeys(value, required, optional, label);
  const sessionRef = nonEmptyString(value.sessionRef, `${label}.sessionRef`);
  if (sessionRef !== expectedSessionRef) invalid(`${label}.sessionRef must match request.sessionRef`);
  const durableSequence = safeInteger(value.durableSequence, `${label}.durableSequence`);
  const durableEventRef = nonEmptyString(value.durableEventRef, `${label}.durableEventRef`);
  if (durableEventRef !== canonicalEventRef(sessionRef, durableSequence)) {
    invalid(`${label}.durableEventRef is not canonical for its session/sequence`);
  }
  const turnRef = value.turnRef === undefined ? undefined : nonEmptyString(value.turnRef, `${label}.turnRef`);
  const stepRef = value.stepRef === undefined ? undefined : nonEmptyString(value.stepRef, `${label}.stepRef`);
  const callRef = value.callRef === undefined ? undefined : nonEmptyString(value.callRef, `${label}.callRef`);
  return {
    durableEventRef,
    durableSequence,
    sessionRef,
    ...(turnRef === undefined ? {} : { turnRef }),
    ...(stepRef === undefined ? {} : { stepRef }),
    ...(callRef === undefined ? {} : { callRef }),
    evidenceRef: unicodeScalarString(value.evidenceRef, `${label}.evidenceRef`),
    evidenceDigest: nonEmptyString(value.evidenceDigest, `${label}.evidenceDigest`),
  };
}

function parseSidecarList(
  value: unknown,
  expectedSessionRef: string,
): readonly AdapterDshReplaySidecarEvidence[] {
  if (!Array.isArray(value)) invalid("fixture.stimulus.source.sidecar must be an array");
  return value.map((entry, index) => parseSidecarEvidence(
    entry,
    `fixture.stimulus.source.sidecar[${index}]`,
    expectedSessionRef,
  ));
}

function parseRequest(value: unknown): AdapterDshReplayReconciliationRequest {
  if (!isRecord(value)) invalid("fixture.stimulus.request must be an object");
  exactKeys(value, ["sessionRef"], "fixture.stimulus.request");
  return { sessionRef: nonEmptyString(value.sessionRef, "fixture.stimulus.request.sessionRef") };
}

function parseSource(
  value: unknown,
  expectedSessionRef: string,
): AdapterDshReplayReconciliationSource {
  if (!isRecord(value)) invalid("fixture.stimulus.source must be an object");
  exactKeys(value, ["snapshot", "live", "sidecar"], "fixture.stimulus.source");
  return {
    snapshot: parseSnapshot(value.snapshot, expectedSessionRef),
    live: parseLive(value.live, expectedSessionRef),
    sidecar: parseSidecarList(value.sidecar, expectedSessionRef),
  };
}

function parseStimulus(value: unknown): AdapterDshReplayReconciliationStimulus {
  if (!isRecord(value)) invalid("fixture.stimulus must be an object");
  exactKeys(value, ["operation", "request", "source"], "fixture.stimulus");
  if (value.operation !== ADAPTER_DSH_REPLAY_RECONCILIATION_OPERATION) {
    invalid("fixture.stimulus.operation is not M3-017 replay-reconciliation");
  }
  const request = parseRequest(value.request);
  return {
    operation: ADAPTER_DSH_REPLAY_RECONCILIATION_OPERATION,
    request,
    source: parseSource(value.source, request.sessionRef),
  };
}

function parseReconciledExpectation(
  value: Record<string, unknown>,
  expectedSessionRef: string,
): Extract<AdapterDshReplayReconciliationObservable, { readonly kind: "REPLAY_RECONCILED" }> {
  exactKeys(
    value,
    ["kind", "sessionRef", "nextDurableSequence", "durableFacts", "evidence"],
    "fixture.expect",
  );
  if (value.kind !== "REPLAY_RECONCILED") invalid("fixture.expect.kind must be REPLAY_RECONCILED");
  if (value.sessionRef !== expectedSessionRef) invalid("fixture.expect.sessionRef must match request.sessionRef");
  return {
    kind: "REPLAY_RECONCILED",
    sessionRef: expectedSessionRef,
    nextDurableSequence: safeInteger(value.nextDurableSequence, "fixture.expect.nextDurableSequence"),
    durableFacts: parseFactList(value.durableFacts, "fixture.expect.durableFacts", expectedSessionRef),
    evidence: parseSidecarList(value.evidence, expectedSessionRef),
  };
}

function parseConflictExpectation(
  value: Record<string, unknown>,
  expectedSessionRef: string,
): Extract<AdapterDshReplayReconciliationObservable, { readonly kind: "REPLAY_CONFLICT" }> {
  exactKeys(value, ["kind", "sessionRef", "code", "durableSequence"], "fixture.expect");
  if (value.kind !== "REPLAY_CONFLICT") invalid("fixture.expect.kind must be REPLAY_CONFLICT");
  if (value.sessionRef !== expectedSessionRef) invalid("fixture.expect.sessionRef must match request.sessionRef");
  if (!ADAPTER_DSH_REPLAY_CONFLICT_CODES.includes(value.code as AdapterDshReplayConflictCode)) {
    invalid("fixture.expect.code is not a recognized M3-017 replay conflict");
  }
  return {
    kind: "REPLAY_CONFLICT",
    sessionRef: expectedSessionRef,
    code: value.code as AdapterDshReplayConflictCode,
    durableSequence: safeInteger(value.durableSequence, "fixture.expect.durableSequence"),
  };
}

function parseExpectation(
  value: unknown,
  expectedSessionRef: string,
): AdapterDshReplayReconciliationObservable {
  if (!isRecord(value)) invalid("fixture.expect must be an object");
  switch (value.kind) {
    case "REPLAY_RECONCILED":
      return parseReconciledExpectation(value, expectedSessionRef);
    case "REPLAY_CONFLICT":
      return parseConflictExpectation(value, expectedSessionRef);
    default:
      invalid("fixture.expect.kind is not a recognized M3-017 observable");
  }
}

export function parseAdapterDshReplayReconciliationFixture(
  value: unknown,
): AdapterDshReplayReconciliationFixture {
  const envelope = parseEnvelope(value);
  const stimulus = parseStimulus(envelope.stimulus);
  return {
    envelope,
    stimulus,
    expect: parseExpectation(envelope.expect, stimulus.request.sessionRef),
  };
}

function observableDurableFact(
  value: unknown,
  expectedSessionRef: string,
): AdapterDshReplayDurableFact | undefined {
  if (!isRecord(value)) return undefined;
  const keys = Object.keys(value).sort();
  if (
    keys.length !== 4
    || keys[0] !== "durableEventRef"
    || keys[1] !== "durableSequence"
    || keys[2] !== "eventDigest"
    || keys[3] !== "sessionRef"
  ) return undefined;
  if (
    value.sessionRef !== expectedSessionRef
    || typeof value.durableSequence !== "number"
    || !Number.isSafeInteger(value.durableSequence)
    || value.durableSequence < 0
    || typeof value.durableEventRef !== "string"
    || value.durableEventRef.length === 0
    || value.durableEventRef !== canonicalEventRef(expectedSessionRef, value.durableSequence)
    || typeof value.eventDigest !== "string"
    || value.eventDigest.length === 0
  ) return undefined;
  return {
    sessionRef: expectedSessionRef,
    durableSequence: value.durableSequence,
    durableEventRef: value.durableEventRef,
    eventDigest: value.eventDigest,
  };
}

function observableSidecarEvidence(
  value: unknown,
  expectedSessionRef: string,
): AdapterDshReplaySidecarEvidence | undefined {
  if (!isRecord(value)) return undefined;
  const required = [
    "durableEventRef",
    "durableSequence",
    "sessionRef",
    "evidenceRef",
    "evidenceDigest",
  ] as const;
  const optional = ["turnRef", "stepRef", "callRef"] as const;
  const allowed: ReadonlySet<string> = new Set([...required, ...optional]);
  const keys = Object.keys(value);
  if (required.some(key => !Object.hasOwn(value, key)) || keys.some(key => !allowed.has(key))) {
    return undefined;
  }
  if (
    value.sessionRef !== expectedSessionRef
    || typeof value.durableSequence !== "number"
    || !Number.isSafeInteger(value.durableSequence)
    || value.durableSequence < 0
    || typeof value.durableEventRef !== "string"
    || value.durableEventRef !== canonicalEventRef(expectedSessionRef, value.durableSequence)
    || typeof value.evidenceRef !== "string"
    || value.evidenceRef.length === 0
    || typeof value.evidenceDigest !== "string"
    || value.evidenceDigest.length === 0
  ) return undefined;
  try {
    unicodeScalarString(value.evidenceRef, "observable.evidenceRef");
  } catch {
    return undefined;
  }
  for (const key of optional) {
    const entry = value[key];
    if (entry !== undefined && (typeof entry !== "string" || entry.length === 0)) return undefined;
  }
  return {
    durableEventRef: value.durableEventRef,
    durableSequence: value.durableSequence,
    sessionRef: expectedSessionRef,
    ...(typeof value.turnRef === "string" ? { turnRef: value.turnRef } : {}),
    ...(typeof value.stepRef === "string" ? { stepRef: value.stepRef } : {}),
    ...(typeof value.callRef === "string" ? { callRef: value.callRef } : {}),
    evidenceRef: value.evidenceRef,
    evidenceDigest: value.evidenceDigest,
  };
}

function observableFactList(
  value: unknown,
  expectedSessionRef: string,
): readonly AdapterDshReplayDurableFact[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result: AdapterDshReplayDurableFact[] = [];
  for (const entry of value) {
    const fact = observableDurableFact(entry, expectedSessionRef);
    if (fact === undefined) return undefined;
    result.push(fact);
  }
  return result;
}

function observableEvidenceList(
  value: unknown,
  expectedSessionRef: string,
): readonly AdapterDshReplaySidecarEvidence[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result: AdapterDshReplaySidecarEvidence[] = [];
  for (const entry of value) {
    const evidence = observableSidecarEvidence(entry, expectedSessionRef);
    if (evidence === undefined) return undefined;
    result.push(evidence);
  }
  return result;
}

function observableConflictCode(value: unknown): AdapterDshReplayConflictCode | undefined {
  return ADAPTER_DSH_REPLAY_CONFLICT_CODES.find(code => code === value);
}

function isObservable(
  value: unknown,
  expectedSessionRef: string,
): value is AdapterDshReplayReconciliationObservable {
  if (!isRecord(value) || value.sessionRef !== expectedSessionRef) return false;
  if (value.kind === "REPLAY_RECONCILED") {
    const keys = Object.keys(value).sort();
    if (
      keys.length !== 5
      || keys[0] !== "durableFacts"
      || keys[1] !== "evidence"
      || keys[2] !== "kind"
      || keys[3] !== "nextDurableSequence"
      || keys[4] !== "sessionRef"
      || typeof value.nextDurableSequence !== "number"
      || !Number.isSafeInteger(value.nextDurableSequence)
      || value.nextDurableSequence < 0
    ) return false;
    return observableFactList(value.durableFacts, expectedSessionRef) !== undefined
      && observableEvidenceList(value.evidence, expectedSessionRef) !== undefined;
  }
  if (value.kind === "REPLAY_CONFLICT") {
    const keys = Object.keys(value).sort();
    return keys.length === 4
      && keys[0] === "code"
      && keys[1] === "durableSequence"
      && keys[2] === "kind"
      && keys[3] === "sessionRef"
      && observableConflictCode(value.code) !== undefined
      && typeof value.durableSequence === "number"
      && Number.isSafeInteger(value.durableSequence)
      && value.durableSequence >= 0;
  }
  return false;
}

function durableFactEqual(
  left: AdapterDshReplayDurableFact,
  right: AdapterDshReplayDurableFact,
): boolean {
  return left.sessionRef === right.sessionRef
    && left.durableSequence === right.durableSequence
    && left.durableEventRef === right.durableEventRef
    && left.eventDigest === right.eventDigest;
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

function arrayEqual<T>(
  left: readonly T[],
  right: readonly T[],
  equal: (leftEntry: T, rightEntry: T) => boolean,
): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined && equal(entry, other);
  });
}

function observableEqual(
  observed: AdapterDshReplayReconciliationObservable,
  expected: AdapterDshReplayReconciliationObservable,
): boolean {
  if (observed.kind !== expected.kind || observed.sessionRef !== expected.sessionRef) return false;
  if (observed.kind === "REPLAY_CONFLICT" && expected.kind === "REPLAY_CONFLICT") {
    return observed.code === expected.code
      && observed.durableSequence === expected.durableSequence;
  }
  if (observed.kind === "REPLAY_RECONCILED" && expected.kind === "REPLAY_RECONCILED") {
    return observed.nextDurableSequence === expected.nextDurableSequence
      && arrayEqual(observed.durableFacts, expected.durableFacts, durableFactEqual)
      && arrayEqual(observed.evidence, expected.evidence, sidecarEqual);
  }
  return false;
}

/**
 * Run one validated M3-017 case. The implementation receives only parsed
 * request/source stimulus; expectation data stays comparison-only and cannot
 * manufacture durable history, sidecar anchors, or conflict authority.
 */
export async function runAdapterDshReplayReconciliationFixture(
  fixture: AdapterDshReplayReconciliationFixture,
  project: (
    stimulus: AdapterDshReplayReconciliationStimulus,
  ) => AdapterDshReplayReconciliationObservable | Promise<AdapterDshReplayReconciliationObservable>,
): Promise<AdapterDshReplayReconciliationCaseResult> {
  let observed: unknown;
  try {
    observed = await project(fixture.stimulus);
  } catch {
    return {
      status: "ERROR",
      code: "ADAPTER_DSH_REPLAY_RECONCILIATION_IMPLEMENTATION_ERROR",
    };
  }
  if (!isObservable(observed, fixture.stimulus.request.sessionRef)) {
    return {
      status: "ERROR",
      code: "ADAPTER_DSH_REPLAY_RECONCILIATION_IMPLEMENTATION_ERROR",
    };
  }
  return observableEqual(observed, fixture.expect)
    ? { status: "PASS" }
    : { status: "FAIL", code: "ADAPTER_DSH_REPLAY_RECONCILIATION_MISMATCH" };
}
