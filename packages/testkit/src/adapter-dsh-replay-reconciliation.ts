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

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    invalid(`${label} must contain exactly: ${wanted.join(", ")}`);
  }
}

function onlyKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const allowed = new Set([...required, ...optional]);
  const actual = Object.keys(value);
  if (required.some(key => !Object.hasOwn(value, key)) || actual.some(key => !allowed.has(key))) {
    invalid(
      `${label} must contain required fields ${required.join(", ")} and only optional fields ${optional.join(", ")}`,
    );
  }
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    invalid(`${label} must be a non-empty string`);
  }
  return value;
}

function safeInteger(value: unknown, label: string, positive = false): number {
  if (
    typeof value !== "number"
    || !Number.isSafeInteger(value)
    || value < 0
    || (positive && value === 0)
  ) {
    invalid(`${label} must be a ${positive ? "positive" : "non-negative"} safe integer`);
  }
  return value;
}

/**
 * Reject JavaScript strings that cannot denote one Unicode scalar sequence.
 * M3-017 orders evidence refs by UTF-8 bytes; accepting lone surrogates would
 * make that ordering depend on a language/runtime's replacement policy.
 */
function unicodeScalarString(value: unknown, label: string): string {
  const text = nonEmptyString(value, label);
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

/**
 * Materialize only portable JSON before profile parsing. The TCK must reject
 * runtime-specific identity, cycles, sparse/decorated arrays, and non-finite
 * numbers before reconciliation semantics are evaluated.
 */
function portableJson(
  value: unknown,
  label: string,
  seen = new Set<object>(),
): TckJsonValue {
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

function parseRequest(value: unknown): AdapterDshReplayReconciliationRequest {
  if (!isRecord(value)) invalid("fixture.stimulus.request must be an object");
  exactKeys(value, ["sessionRef"], "fixture.stimulus.request");
  return {
    sessionRef: nonEmptyString(value.sessionRef, "fixture.stimulus.request.sessionRef"),
  };
}

function canonicalEventRef(sessionRef: string, durableSequence: number): string {
  return `${sessionRef}/seq:${durableSequence}`;
}

function parseDurableFact(
  value: unknown,
  expectedSessionRef: string,
  label: string,
): AdapterDshReplayDurableFact {
  if (!isRecord(value)) invalid(`${label} must be an object`);
  exactKeys(
    value,
    ["sessionRef", "durableSequence", "durableEventRef", "eventDigest"],
    label,
  );
  const sessionRef = nonEmptyString(value.sessionRef, `${label}.sessionRef`);
  if (sessionRef !== expectedSessionRef) invalid(`${label}.sessionRef must match the replay request`);
  const durableSequence = safeInteger(value.durableSequence, `${label}.durableSequence`);
  const durableEventRef = nonEmptyString(value.durableEventRef, `${label}.durableEventRef`);
  const expectedEventRef = canonicalEventRef(sessionRef, durableSequence);
  if (durableEventRef !== expectedEventRef) {
    invalid(`${label}.durableEventRef must equal ${expectedEventRef}`);
  }
  return {
    sessionRef,
    durableSequence,
    durableEventRef,
    eventDigest: nonEmptyString(value.eventDigest, `${label}.eventDigest`),
  };
}

function parseFactArray(
  value: unknown,
  sessionRef: string,
  label: string,
): readonly AdapterDshReplayDurableFact[] {
  if (!Array.isArray(value)) invalid(`${label} must be an array`);
  return value.map((entry, index) => parseDurableFact(entry, sessionRef, `${label}[${index}]`));
}

function parseSnapshot(
  value: unknown,
  sessionRef: string,
): AdapterDshReplayReconciliationSource["snapshot"] {
  if (!isRecord(value)) invalid("fixture.stimulus.source.snapshot must be an object");
  exactKeys(value, ["facts"], "fixture.stimulus.source.snapshot");
  const facts = parseFactArray(value.facts, sessionRef, "fixture.stimulus.source.snapshot.facts");
  for (let index = 0; index < facts.length; index += 1) {
    if (facts[index]?.durableSequence !== index) {
      invalid("fixture.stimulus.source.snapshot must be a complete contiguous prefix from sequence 0");
    }
  }
  return { facts };
}

function parseLive(
  value: unknown,
  sessionRef: string,
): AdapterDshReplayReconciliationSource["live"] {
  if (!isRecord(value)) invalid("fixture.stimulus.source.live must be an object");
  exactKeys(value, ["facts"], "fixture.stimulus.source.live");
  return {
    // Ordering/gap/overlap is reconciliation semantics, not parser authority.
    facts: parseFactArray(value.facts, sessionRef, "fixture.stimulus.source.live.facts"),
  };
}

function parseOptionalRef(
  value: Record<string, unknown>,
  key: "turnRef" | "stepRef" | "callRef",
  label: string,
): string | undefined {
  if (!Object.hasOwn(value, key)) return undefined;
  return nonEmptyString(value[key], `${label}.${key}`);
}

function parseSidecarEvidence(
  value: unknown,
  expectedSessionRef: string,
  label: string,
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
  onlyKeys(value, required, optional, label);
  const sessionRef = nonEmptyString(value.sessionRef, `${label}.sessionRef`);
  if (sessionRef !== expectedSessionRef) invalid(`${label}.sessionRef must match the replay request`);
  const durableSequence = safeInteger(value.durableSequence, `${label}.durableSequence`);
  const durableEventRef = nonEmptyString(value.durableEventRef, `${label}.durableEventRef`);
  const expectedEventRef = canonicalEventRef(sessionRef, durableSequence);
  if (durableEventRef !== expectedEventRef) {
    invalid(`${label}.durableEventRef must equal ${expectedEventRef}`);
  }
  const turnRef = parseOptionalRef(value, "turnRef", label);
  const stepRef = parseOptionalRef(value, "stepRef", label);
  const callRef = parseOptionalRef(value, "callRef", label);
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

function parseSource(
  value: unknown,
  sessionRef: string,
): AdapterDshReplayReconciliationSource {
  if (!isRecord(value)) invalid("fixture.stimulus.source must be an object");
  exactKeys(value, ["snapshot", "live", "sidecar"], "fixture.stimulus.source");
  if (!Array.isArray(value.sidecar)) invalid("fixture.stimulus.source.sidecar must be an array");
  return {
    snapshot: parseSnapshot(value.snapshot, sessionRef),
    live: parseLive(value.live, sessionRef),
    sidecar: value.sidecar.map((entry, index) => parseSidecarEvidence(
      entry,
      sessionRef,
      `fixture.stimulus.source.sidecar[${index}]`,
    )),
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

function isConflictCode(value: unknown): value is AdapterDshReplayConflictCode {
  return typeof value === "string"
    && (ADAPTER_DSH_REPLAY_CONFLICT_CODES as readonly string[]).includes(value);
}

function parseReconciledExpectation(
  value: Record<string, unknown>,
  requestSessionRef: string,
): Extract<AdapterDshReplayReconciliationObservable, { readonly kind: "REPLAY_RECONCILED" }> {
  exactKeys(
    value,
    ["kind", "sessionRef", "nextDurableSequence", "durableFacts", "evidence"],
    "fixture.expect",
  );
  const sessionRef = nonEmptyString(value.sessionRef, "fixture.expect.sessionRef");
  if (sessionRef !== requestSessionRef) invalid("fixture.expect.sessionRef must match the replay request");
  const durableFacts = parseFactArray(value.durableFacts, sessionRef, "fixture.expect.durableFacts");
  for (let index = 0; index < durableFacts.length; index += 1) {
    if (durableFacts[index]?.durableSequence !== index) {
      invalid("fixture.expect.durableFacts must be a complete contiguous prefix from sequence 0");
    }
  }
  const nextDurableSequence = safeInteger(
    value.nextDurableSequence,
    "fixture.expect.nextDurableSequence",
  );
  if (nextDurableSequence !== durableFacts.length) {
    invalid("fixture.expect.nextDurableSequence must equal the reconciled durable prefix length");
  }
  if (!Array.isArray(value.evidence)) invalid("fixture.expect.evidence must be an array");
  const evidence = value.evidence.map((entry, index) => parseSidecarEvidence(
    entry,
    sessionRef,
    `fixture.expect.evidence[${index}]`,
  ));
  const durableRefs = new Set(durableFacts.map(fact => fact.durableEventRef));
  if (evidence.some(record => !durableRefs.has(record.durableEventRef))) {
    invalid("fixture.expect.evidence must anchor only to fixture.expect.durableFacts");
  }
  return {
    kind: "REPLAY_RECONCILED",
    sessionRef,
    nextDurableSequence,
    durableFacts,
    evidence,
  };
}

function parseConflictExpectation(
  value: Record<string, unknown>,
  requestSessionRef: string,
): Extract<AdapterDshReplayReconciliationObservable, { readonly kind: "REPLAY_CONFLICT" }> {
  exactKeys(
    value,
    ["kind", "sessionRef", "code", "durableSequence"],
    "fixture.expect",
  );
  const sessionRef = nonEmptyString(value.sessionRef, "fixture.expect.sessionRef");
  if (sessionRef !== requestSessionRef) invalid("fixture.expect.sessionRef must match the replay request");
  if (!isConflictCode(value.code)) invalid("fixture.expect.code is not a M3-017 conflict code");
  return {
    kind: "REPLAY_CONFLICT",
    sessionRef,
    code: value.code,
    durableSequence: safeInteger(value.durableSequence, "fixture.expect.durableSequence"),
  };
}

function parseExpectation(
  value: unknown,
  requestSessionRef: string,
): AdapterDshReplayReconciliationObservable {
  if (!isRecord(value)) invalid("fixture.expect must be an object");
  switch (value.kind) {
    case "REPLAY_RECONCILED":
      return parseReconciledExpectation(value, requestSessionRef);
    case "REPLAY_CONFLICT":
      return parseConflictExpectation(value, requestSessionRef);
    default:
      invalid("fixture.expect.kind is not a M3-017 replay observable");
  }
}

export function parseAdapterDshReplayReconciliationFixture(
  value: unknown,
): AdapterDshReplayReconciliationFixture {
  const envelope = parseEnvelope(value);
  const stimulus = parseStimulus(envelope.stimulus);
  const expect = parseExpectation(envelope.expect, stimulus.request.sessionRef);
  return { envelope, stimulus, expect };
}

function isPlainDenseArray(value: unknown): value is readonly unknown[] {
  if (!Array.isArray(value) || Object.getOwnPropertySymbols(value).length !== 0) return false;
  const keys = Object.keys(value);
  return keys.length === value.length
    && keys.every(key => /^(0|[1-9]\d*)$/.test(key) && Number(key) < value.length);
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
  if (value.sessionRef !== expectedSessionRef) return undefined;
  if (
    typeof value.durableSequence !== "number"
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
  const optionalValues: Partial<Record<(typeof optional)[number], string>> = {};
  for (const key of optional) {
    if (!Object.hasOwn(value, key)) continue;
    const candidate = value[key];
    if (typeof candidate !== "string" || candidate.length === 0) return undefined;
    optionalValues[key] = candidate;
  }
  return {
    durableEventRef: value.durableEventRef,
    durableSequence: value.durableSequence,
    sessionRef: expectedSessionRef,
    ...(optionalValues.turnRef === undefined ? {} : { turnRef: optionalValues.turnRef }),
    ...(optionalValues.stepRef === undefined ? {} : { stepRef: optionalValues.stepRef }),
    ...(optionalValues.callRef === undefined ? {} : { callRef: optionalValues.callRef }),
    evidenceRef: value.evidenceRef,
    evidenceDigest: value.evidenceDigest,
  };
}

function isObservable(
  value: unknown,
): value is AdapterDshReplayReconciliationObservable {
  if (!isRecord(value) || typeof value.sessionRef !== "string" || value.sessionRef.length === 0) {
    return false;
  }
  if (value.kind === "REPLAY_CONFLICT") {
    const keys = Object.keys(value).sort();
    return keys.length === 4
      && keys[0] === "code"
      && keys[1] === "durableSequence"
      && keys[2] === "kind"
      && keys[3] === "sessionRef"
      && isConflictCode(value.code)
      && typeof value.durableSequence === "number"
      && Number.isSafeInteger(value.durableSequence)
      && value.durableSequence >= 0;
  }
  if (value.kind !== "REPLAY_RECONCILED") return false;
  const keys = Object.keys(value).sort();
  if (
    keys.length !== 5
    || keys[0] !== "durableFacts"
    || keys[1] !== "evidence"
    || keys[2] !== "kind"
    || keys[3] !== "nextDurableSequence"
    || keys[4] !== "sessionRef"
    || !isPlainDenseArray(value.durableFacts)
    || !isPlainDenseArray(value.evidence)
  ) return false;
  const durableFacts: AdapterDshReplayDurableFact[] = [];
  for (const entry of value.durableFacts) {
    const fact = observableDurableFact(entry, value.sessionRef);
    if (fact === undefined) return false;
    durableFacts.push(fact);
  }
  if (durableFacts.some((fact, index) => fact.durableSequence !== index)) return false;
  if (
    typeof value.nextDurableSequence !== "number"
    || !Number.isSafeInteger(value.nextDurableSequence)
    || value.nextDurableSequence !== durableFacts.length
  ) return false;
  const durableRefs = new Set(durableFacts.map(fact => fact.durableEventRef));
  for (const entry of value.evidence) {
    const record = observableSidecarEvidence(entry, value.sessionRef);
    if (record === undefined || !durableRefs.has(record.durableEventRef)) return false;
  }
  return true;
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

function sidecarEvidenceEqual(
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

function observableEqual(
  observed: AdapterDshReplayReconciliationObservable,
  expected: AdapterDshReplayReconciliationObservable,
): boolean {
  if (observed.kind !== expected.kind || observed.sessionRef !== expected.sessionRef) return false;
  if (observed.kind === "REPLAY_CONFLICT" && expected.kind === "REPLAY_CONFLICT") {
    return observed.code === expected.code
      && observed.durableSequence === expected.durableSequence;
  }
  if (observed.kind !== "REPLAY_RECONCILED" || expected.kind !== "REPLAY_RECONCILED") {
    return false;
  }
  return observed.nextDurableSequence === expected.nextDurableSequence
    && observed.durableFacts.length === expected.durableFacts.length
    && observed.durableFacts.every((fact, index) => {
      const expectedFact = expected.durableFacts[index];
      return expectedFact !== undefined && durableFactEqual(fact, expectedFact);
    })
    && observed.evidence.length === expected.evidence.length
    && observed.evidence.every((record, index) => {
      const expectedRecord = expected.evidence[index];
      return expectedRecord !== undefined && sidecarEvidenceEqual(record, expectedRecord);
    });
}

/**
 * Run one validated M3-017 case. The project receives source stimulus only;
 * expectation data is comparison-only and cannot manufacture durable facts,
 * evidence anchors, or reconciliation conflicts.
 */
export async function runAdapterDshReplayReconciliationFixture(
  fixture: AdapterDshReplayReconciliationFixture,
  project: (
    stimulus: AdapterDshReplayReconciliationStimulus,
  ) => AdapterDshReplayReconciliationObservable
    | Promise<AdapterDshReplayReconciliationObservable>,
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
  if (!isObservable(observed)) {
    return {
      status: "ERROR",
      code: "ADAPTER_DSH_REPLAY_RECONCILIATION_IMPLEMENTATION_ERROR",
    };
  }
  return observableEqual(observed, fixture.expect)
    ? { status: "PASS" }
    : { status: "FAIL", code: "ADAPTER_DSH_REPLAY_RECONCILIATION_MISMATCH" };
}
