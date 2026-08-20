import type { TckFixtureV1Alpha1, TckJsonValue } from "./tck-contract.js";

export const ADAPTER_DSH_DISPOSAL_OPERATION = "disposal" as const;
export const ADAPTER_DSH_DISPOSAL_ERROR_CODES = [
  "INVALID_ADAPTER_DSH_DISPOSAL_FIXTURE",
] as const;

export type AdapterDshDisposalErrorCode =
  (typeof ADAPTER_DSH_DISPOSAL_ERROR_CODES)[number];

export type AdapterDshDisposalResourceKind =
  | "OBSERVATION_SUBSCRIPTION"
  | "TOOL_POLICY_REGISTRATION"
  | "MONOTONIC_TOOL_GUARD_REGISTRATION"
  | "TURN_STOPPING_REGISTRATION";

export interface AdapterDshDisposalRequest {
  readonly sessionRef: string;
  readonly resourceRef: string;
}

export type AdapterDshDisposalSourceFact =
  | {
      readonly kind: "OBSERVATION_SUBSCRIPTION";
      readonly acceptedBeforeDispose: readonly string[];
      readonly disposeCompleted: true;
      readonly probedAfterDispose: readonly string[];
      readonly repeatDispose: true;
    }
  | {
      readonly kind: "TOOL_POLICY_REGISTRATION";
      readonly effectBeforeDispose: "DENY";
      readonly disposeCompleted: true;
      readonly probeAfterDispose: "EXECUTE";
    }
  | {
      readonly kind: "MONOTONIC_TOOL_GUARD_REGISTRATION";
      readonly effectBeforeDispose: "DENY";
      readonly disposeCompleted: true;
      readonly probeAfterDispose: "EXECUTE";
    }
  | {
      readonly kind: "TURN_STOPPING_REGISTRATION";
      readonly effectBeforeDispose: "HANDLER_INVOKED";
      readonly disposeCompleted: true;
      readonly probeAfterDispose: "TURN_STOPPING";
    };

export interface AdapterDshDisposalStimulus {
  readonly operation: typeof ADAPTER_DSH_DISPOSAL_OPERATION;
  readonly request: AdapterDshDisposalRequest;
  readonly sourceFact: AdapterDshDisposalSourceFact;
}

export type AdapterDshDisposalObservable =
  | {
      readonly kind: "DISPOSAL_COMPLETED";
      readonly resourceKind: "OBSERVATION_SUBSCRIPTION";
      readonly acceptedBeforeDisposeSettled: readonly string[];
      readonly effectsAfterDispose: readonly string[];
      readonly repeatDispose: "IDEMPOTENT";
      readonly externalRuntime: "REMAINS_LIVE";
    }
  | {
      readonly kind: "DISPOSAL_COMPLETED";
      readonly resourceKind:
        | "TOOL_POLICY_REGISTRATION"
        | "MONOTONIC_TOOL_GUARD_REGISTRATION"
        | "TURN_STOPPING_REGISTRATION";
      readonly effectBeforeDispose: "OBSERVED";
      readonly effectAfterDispose: "ABSENT";
      readonly externalRuntime: "REMAINS_LIVE";
    };

export interface AdapterDshDisposalFixture {
  readonly envelope: TckFixtureV1Alpha1;
  readonly stimulus: AdapterDshDisposalStimulus;
  readonly expect: AdapterDshDisposalObservable;
}

export type AdapterDshDisposalCaseResult =
  | { readonly status: "PASS" }
  | { readonly status: "FAIL"; readonly code: string }
  | { readonly status: "ERROR"; readonly code: string };

export class AdapterDshDisposalFixtureError extends Error {
  readonly code: AdapterDshDisposalErrorCode;

  constructor(message: string) {
    super(message);
    this.name = "AdapterDshDisposalFixtureError";
    this.code = "INVALID_ADAPTER_DSH_DISPOSAL_FIXTURE";
  }
}

function invalid(message: string): never {
  throw new AdapterDshDisposalFixtureError(message);
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

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) invalid(`${label} must be a non-empty string`);
  return value;
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
 * non-finite numbers before any disposal semantics are considered.
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

function parseRequest(value: unknown): AdapterDshDisposalRequest {
  if (!isRecord(value)) invalid("fixture.stimulus.request must be an object");
  exactKeys(value, ["sessionRef", "resourceRef"], "fixture.stimulus.request");
  return {
    sessionRef: nonEmptyString(value.sessionRef, "fixture.stimulus.request.sessionRef"),
    resourceRef: nonEmptyString(value.resourceRef, "fixture.stimulus.request.resourceRef"),
  };
}

function nonEmptyStringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) invalid(`${label} must be a non-empty array`);
  return value.map((entry, index) => nonEmptyString(entry, `${label}[${index}]`));
}

function stringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || entry.length === 0) return undefined;
    result.push(entry);
  }
  return result;
}

function requireDisposeCompleted(value: unknown): true {
  if (value !== true) {
    invalid("M3-016 source fact must carry explicit disposeCompleted true");
  }
  return true;
}

function parseObservationSource(
  value: Record<string, unknown>,
): Extract<AdapterDshDisposalSourceFact, { readonly kind: "OBSERVATION_SUBSCRIPTION" }> {
  exactKeys(
    value,
    ["kind", "acceptedBeforeDispose", "disposeCompleted", "probedAfterDispose", "repeatDispose"],
    "fixture.stimulus.sourceFact",
  );
  if (value.repeatDispose !== true) {
    invalid("M3-016 observation disposal must explicitly request repeatDispose true");
  }
  return {
    kind: "OBSERVATION_SUBSCRIPTION",
    acceptedBeforeDispose: nonEmptyStringArray(
      value.acceptedBeforeDispose,
      "fixture.stimulus.sourceFact.acceptedBeforeDispose",
    ),
    disposeCompleted: requireDisposeCompleted(value.disposeCompleted),
    probedAfterDispose: nonEmptyStringArray(
      value.probedAfterDispose,
      "fixture.stimulus.sourceFact.probedAfterDispose",
    ),
    repeatDispose: true,
  };
}

function parseRegistrationSource(
  value: Record<string, unknown>,
  kind: Exclude<AdapterDshDisposalResourceKind, "OBSERVATION_SUBSCRIPTION">,
): Exclude<AdapterDshDisposalSourceFact, { readonly kind: "OBSERVATION_SUBSCRIPTION" }> {
  exactKeys(
    value,
    ["kind", "effectBeforeDispose", "disposeCompleted", "probeAfterDispose"],
    "fixture.stimulus.sourceFact",
  );
  const disposeCompleted = requireDisposeCompleted(value.disposeCompleted);
  if (kind === "TURN_STOPPING_REGISTRATION") {
    if (value.effectBeforeDispose !== "HANDLER_INVOKED") {
      invalid("M3-016 turn-stopping positive control must be HANDLER_INVOKED");
    }
    if (value.probeAfterDispose !== "TURN_STOPPING") {
      invalid("M3-016 turn-stopping post-disposal probe must be TURN_STOPPING");
    }
    return {
      kind,
      effectBeforeDispose: "HANDLER_INVOKED",
      disposeCompleted,
      probeAfterDispose: "TURN_STOPPING",
    };
  }
  if (value.effectBeforeDispose !== "DENY") {
    invalid(`M3-016 ${kind} positive control must be DENY`);
  }
  if (value.probeAfterDispose !== "EXECUTE") {
    invalid(`M3-016 ${kind} post-disposal probe must be EXECUTE`);
  }
  return {
    kind,
    effectBeforeDispose: "DENY",
    disposeCompleted,
    probeAfterDispose: "EXECUTE",
  };
}

function parseSourceFact(value: unknown): AdapterDshDisposalSourceFact {
  if (!isRecord(value)) invalid("fixture.stimulus.sourceFact must be an object");
  switch (value.kind) {
    case "OBSERVATION_SUBSCRIPTION":
      return parseObservationSource(value);
    case "TOOL_POLICY_REGISTRATION":
    case "MONOTONIC_TOOL_GUARD_REGISTRATION":
    case "TURN_STOPPING_REGISTRATION":
      return parseRegistrationSource(value, value.kind);
    default:
      invalid("fixture.stimulus.sourceFact.kind is unsupported");
  }
}

function parseStimulus(value: unknown): AdapterDshDisposalStimulus {
  if (!isRecord(value)) invalid("fixture.stimulus must be an object");
  exactKeys(value, ["operation", "request", "sourceFact"], "fixture.stimulus");
  if (value.operation !== ADAPTER_DSH_DISPOSAL_OPERATION) {
    invalid("fixture.stimulus.operation is not M3-016 disposal");
  }
  return {
    operation: ADAPTER_DSH_DISPOSAL_OPERATION,
    request: parseRequest(value.request),
    sourceFact: parseSourceFact(value.sourceFact),
  };
}

function parseObservationExpectation(
  value: Record<string, unknown>,
): Extract<AdapterDshDisposalObservable, { readonly resourceKind: "OBSERVATION_SUBSCRIPTION" }> {
  exactKeys(
    value,
    [
      "kind",
      "resourceKind",
      "acceptedBeforeDisposeSettled",
      "effectsAfterDispose",
      "repeatDispose",
      "externalRuntime",
    ],
    "fixture.expect",
  );
  if (value.kind !== "DISPOSAL_COMPLETED") invalid("fixture.expect.kind must be DISPOSAL_COMPLETED");
  if (value.repeatDispose !== "IDEMPOTENT") {
    invalid("M3-016 observation expectation must claim IDEMPOTENT repeat disposal");
  }
  if (value.externalRuntime !== "REMAINS_LIVE") {
    invalid("M3-016 disposal expectation must preserve a live external runtime");
  }
  const settled = stringArray(value.acceptedBeforeDisposeSettled);
  if (settled === undefined) invalid("fixture.expect.acceptedBeforeDisposeSettled must be a string array");
  const after = stringArray(value.effectsAfterDispose);
  if (after === undefined) invalid("fixture.expect.effectsAfterDispose must be a string array");
  if (after.length !== 0) invalid("M3-016 expected post-disposal observation effects must be empty");
  return {
    kind: "DISPOSAL_COMPLETED",
    resourceKind: "OBSERVATION_SUBSCRIPTION",
    acceptedBeforeDisposeSettled: settled,
    effectsAfterDispose: after,
    repeatDispose: "IDEMPOTENT",
    externalRuntime: "REMAINS_LIVE",
  };
}

function parseRegistrationExpectation(
  value: Record<string, unknown>,
): Extract<AdapterDshDisposalObservable, { readonly effectBeforeDispose: "OBSERVED" }> {
  exactKeys(
    value,
    ["kind", "resourceKind", "effectBeforeDispose", "effectAfterDispose", "externalRuntime"],
    "fixture.expect",
  );
  if (value.kind !== "DISPOSAL_COMPLETED") invalid("fixture.expect.kind must be DISPOSAL_COMPLETED");
  if (
    value.resourceKind !== "TOOL_POLICY_REGISTRATION"
    && value.resourceKind !== "MONOTONIC_TOOL_GUARD_REGISTRATION"
    && value.resourceKind !== "TURN_STOPPING_REGISTRATION"
  ) {
    invalid("fixture.expect.resourceKind is not a M3-016 registration resource");
  }
  if (value.effectBeforeDispose !== "OBSERVED") {
    invalid("M3-016 registration expectation must preserve the positive-control effect");
  }
  if (value.effectAfterDispose !== "ABSENT") {
    invalid("M3-016 registration expectation must require the disposed effect to be absent");
  }
  if (value.externalRuntime !== "REMAINS_LIVE") {
    invalid("M3-016 disposal expectation must preserve a live external runtime");
  }
  return {
    kind: "DISPOSAL_COMPLETED",
    resourceKind: value.resourceKind,
    effectBeforeDispose: "OBSERVED",
    effectAfterDispose: "ABSENT",
    externalRuntime: "REMAINS_LIVE",
  };
}

function parseExpectation(value: unknown): AdapterDshDisposalObservable {
  if (!isRecord(value)) invalid("fixture.expect must be an object");
  if (value.resourceKind === "OBSERVATION_SUBSCRIPTION") return parseObservationExpectation(value);
  return parseRegistrationExpectation(value);
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

export function parseAdapterDshDisposalFixture(value: unknown): AdapterDshDisposalFixture {
  const envelope = parseEnvelope(value);
  const stimulus = parseStimulus(envelope.stimulus);
  const expect = parseExpectation(envelope.expect);

  if (stimulus.sourceFact.kind === "OBSERVATION_SUBSCRIPTION") {
    if (expect.resourceKind !== "OBSERVATION_SUBSCRIPTION") {
      invalid("M3-016 observation source requires an observation disposal expectation");
    }
    if (!arraysEqual(expect.acceptedBeforeDisposeSettled, stimulus.sourceFact.acceptedBeforeDispose)) {
      invalid("M3-016 observation expectation must preserve all accepted-before-dispose probe refs");
    }
    return { envelope, stimulus, expect };
  }

  if (expect.resourceKind !== stimulus.sourceFact.kind) {
    invalid("M3-016 registration expectation resourceKind must match the source resource kind");
  }
  return { envelope, stimulus, expect };
}

function observableStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  if (Object.getOwnPropertySymbols(value).length !== 0) return undefined;
  const keys = Object.keys(value);
  if (
    keys.length !== value.length
    || keys.some(key => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)
  ) {
    return undefined;
  }
  return stringArray(value);
}

function isObservable(value: unknown): value is AdapterDshDisposalObservable {
  if (!isRecord(value) || value.kind !== "DISPOSAL_COMPLETED") return false;
  if (value.resourceKind === "OBSERVATION_SUBSCRIPTION") {
    const keys = Object.keys(value).sort();
    const settled = observableStringArray(value.acceptedBeforeDisposeSettled);
    const after = observableStringArray(value.effectsAfterDispose);
    return keys.length === 6
      && keys[0] === "acceptedBeforeDisposeSettled"
      && keys[1] === "effectsAfterDispose"
      && keys[2] === "externalRuntime"
      && keys[3] === "kind"
      && keys[4] === "repeatDispose"
      && keys[5] === "resourceKind"
      && settled !== undefined
      && after !== undefined
      && value.repeatDispose === "IDEMPOTENT"
      && value.externalRuntime === "REMAINS_LIVE";
  }
  if (
    value.resourceKind !== "TOOL_POLICY_REGISTRATION"
    && value.resourceKind !== "MONOTONIC_TOOL_GUARD_REGISTRATION"
    && value.resourceKind !== "TURN_STOPPING_REGISTRATION"
  ) return false;
  const keys = Object.keys(value).sort();
  return keys.length === 5
    && keys[0] === "effectAfterDispose"
    && keys[1] === "effectBeforeDispose"
    && keys[2] === "externalRuntime"
    && keys[3] === "kind"
    && keys[4] === "resourceKind"
    && value.effectBeforeDispose === "OBSERVED"
    && value.effectAfterDispose === "ABSENT"
    && value.externalRuntime === "REMAINS_LIVE";
}

function observableEqual(
  observed: AdapterDshDisposalObservable,
  expected: AdapterDshDisposalObservable,
): boolean {
  if (observed.resourceKind !== expected.resourceKind) return false;
  if (
    observed.resourceKind === "OBSERVATION_SUBSCRIPTION"
    && expected.resourceKind === "OBSERVATION_SUBSCRIPTION"
  ) {
    return arraysEqual(observed.acceptedBeforeDisposeSettled, expected.acceptedBeforeDisposeSettled)
      && arraysEqual(observed.effectsAfterDispose, expected.effectsAfterDispose)
      && observed.repeatDispose === expected.repeatDispose
      && observed.externalRuntime === expected.externalRuntime;
  }
  if (
    observed.resourceKind !== "OBSERVATION_SUBSCRIPTION"
    && expected.resourceKind !== "OBSERVATION_SUBSCRIPTION"
  ) {
    return observed.effectBeforeDispose === expected.effectBeforeDispose
      && observed.effectAfterDispose === expected.effectAfterDispose
      && observed.externalRuntime === expected.externalRuntime;
  }
  return false;
}

/**
 * Run one validated M3-016 case. The project receives source stimulus only;
 * expectation data is comparison-only and cannot manufacture disposal proof.
 */
export async function runAdapterDshDisposalFixture(
  fixture: AdapterDshDisposalFixture,
  project: (
    stimulus: AdapterDshDisposalStimulus,
  ) => AdapterDshDisposalObservable | Promise<AdapterDshDisposalObservable>,
): Promise<AdapterDshDisposalCaseResult> {
  let observed: unknown;
  try {
    observed = await project(fixture.stimulus);
  } catch {
    return { status: "ERROR", code: "ADAPTER_DSH_DISPOSAL_IMPLEMENTATION_ERROR" };
  }
  if (!isObservable(observed)) {
    return { status: "ERROR", code: "ADAPTER_DSH_DISPOSAL_IMPLEMENTATION_ERROR" };
  }
  return observableEqual(observed, fixture.expect)
    ? { status: "PASS" }
    : { status: "FAIL", code: "ADAPTER_DSH_DISPOSAL_MISMATCH" };
}
