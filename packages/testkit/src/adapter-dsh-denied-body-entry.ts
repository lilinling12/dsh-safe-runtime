import type { TckFixtureV1Alpha1, TckJsonValue } from "./tck-contract.js";

export const ADAPTER_DSH_DENIED_BODY_ENTRY_OPERATION = "denied-body-entry" as const;
export const ADAPTER_DSH_DENIED_BODY_ENTRY_ERROR_CODES = [
  "INVALID_ADAPTER_DSH_DENIED_BODY_ENTRY_FIXTURE",
] as const;

export type AdapterDshDeniedBodyEntryErrorCode =
  (typeof ADAPTER_DSH_DENIED_BODY_ENTRY_ERROR_CODES)[number];

export interface AdapterDshDeniedBodyEntryStimulus {
  readonly operation: typeof ADAPTER_DSH_DENIED_BODY_ENTRY_OPERATION;
  readonly call: {
    readonly callRef: string;
    readonly toolName: string;
    readonly arguments: TckJsonValue;
  };
  readonly policy: {
    readonly decision: "DENY";
  };
}

export interface AdapterDshDeniedBodyEntryObservable {
  readonly kind: "DENIAL_BODY_ENTRY";
  readonly callRef: string;
  readonly toolName: string;
  readonly decision: "DENIED";
  readonly bodyEntered: boolean;
}

export interface AdapterDshDeniedBodyEntryFixture {
  readonly envelope: TckFixtureV1Alpha1;
  readonly stimulus: AdapterDshDeniedBodyEntryStimulus;
  readonly expect: AdapterDshDeniedBodyEntryObservable & { readonly bodyEntered: false };
}

export type AdapterDshDeniedBodyEntryCaseResult =
  | { readonly status: "PASS" }
  | { readonly status: "FAIL"; readonly code: string }
  | { readonly status: "ERROR"; readonly code: string };

export class AdapterDshDeniedBodyEntryFixtureError extends Error {
  readonly code: AdapterDshDeniedBodyEntryErrorCode;

  constructor(message: string) {
    super(message);
    this.name = "AdapterDshDeniedBodyEntryFixtureError";
    this.code = "INVALID_ADAPTER_DSH_DENIED_BODY_ENTRY_FIXTURE";
  }
}

function invalid(message: string): never {
  throw new AdapterDshDeniedBodyEntryFixtureError(message);
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

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    invalid(`${label} must be a non-empty string`);
  }
  return value;
}

function nonNegativeSafeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    invalid(`${label} must be a non-negative safe integer`);
  }
  return value;
}

function positiveSafeInteger(value: unknown, label: string): number {
  const number = nonNegativeSafeInteger(value, label);
  if (number === 0) invalid(`${label} must be positive`);
  return number;
}

function portableJson(value: unknown, label: string, seen = new Set<object>()): TckJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) invalid(`${label} must contain only finite JSON numbers`);
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) invalid(`${label} must not contain cyclic values`);
    seen.add(value);
    const keys = Object.keys(value);
    if (
      Object.getOwnPropertySymbols(value).length !== 0
      || keys.length !== value.length
      || keys.some((key) => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)
    ) {
      invalid(`${label} must contain dense JSON arrays without named or symbol properties`);
    }
    const result = value.map((entry, index) => portableJson(entry, `${label}[${index}]`, seen));
    seen.delete(value);
    return result;
  }
  if (!isRecord(value)) invalid(`${label} must contain only ordinary JSON objects`);
  if (seen.has(value)) invalid(`${label} must not contain cyclic values`);
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
  if (typeof json.description !== "string") invalid("fixture.description must be a string");
  if (!isRecord(json.determinism)) invalid("fixture.determinism must be an object");
  exactKeys(json.determinism, ["seed", "clock"], "fixture.determinism");
  const seed = nonNegativeSafeInteger(json.determinism.seed, "fixture.determinism.seed");
  if (seed > 4_294_967_295) invalid("fixture.determinism.seed exceeds uint32 range");
  if (!isRecord(json.determinism.clock)) invalid("fixture.determinism.clock must be an object");
  exactKeys(json.determinism.clock, ["startUnixMs", "tickMs"], "fixture.determinism.clock");
  nonNegativeSafeInteger(json.determinism.clock.startUnixMs, "fixture.determinism.clock.startUnixMs");
  positiveSafeInteger(json.determinism.clock.tickMs, "fixture.determinism.clock.tickMs");
  return json as unknown as TckFixtureV1Alpha1;
}

function parseStimulus(value: unknown): AdapterDshDeniedBodyEntryStimulus {
  if (!isRecord(value)) invalid("fixture.stimulus must be an object");
  exactKeys(value, ["operation", "call", "policy"], "fixture.stimulus");
  if (value.operation !== ADAPTER_DSH_DENIED_BODY_ENTRY_OPERATION) {
    invalid("fixture.stimulus.operation is not M3-012 denied-body-entry");
  }
  if (!isRecord(value.call)) invalid("fixture.stimulus.call must be an object");
  exactKeys(value.call, ["callRef", "toolName", "arguments"], "fixture.stimulus.call");
  if (!isRecord(value.policy)) invalid("fixture.stimulus.policy must be an object");
  exactKeys(value.policy, ["decision"], "fixture.stimulus.policy");
  if (value.policy.decision !== "DENY") invalid("fixture.stimulus.policy.decision must be DENY");

  return {
    operation: ADAPTER_DSH_DENIED_BODY_ENTRY_OPERATION,
    call: {
      callRef: nonEmptyString(value.call.callRef, "fixture.stimulus.call.callRef"),
      toolName: nonEmptyString(value.call.toolName, "fixture.stimulus.call.toolName"),
      arguments: portableJson(value.call.arguments, "fixture.stimulus.call.arguments"),
    },
    policy: { decision: "DENY" },
  };
}

function parseExpectation(value: unknown): AdapterDshDeniedBodyEntryFixture["expect"] {
  if (!isRecord(value)) invalid("fixture.expect must be an object");
  exactKeys(value, ["kind", "callRef", "toolName", "decision", "bodyEntered"], "fixture.expect");
  if (value.kind !== "DENIAL_BODY_ENTRY") invalid("fixture.expect.kind must be DENIAL_BODY_ENTRY");
  if (value.decision !== "DENIED") invalid("fixture.expect.decision must be DENIED");
  if (value.bodyEntered !== false) invalid("fixture.expect.bodyEntered must be false");
  return {
    kind: "DENIAL_BODY_ENTRY",
    callRef: nonEmptyString(value.callRef, "fixture.expect.callRef"),
    toolName: nonEmptyString(value.toolName, "fixture.expect.toolName"),
    decision: "DENIED",
    bodyEntered: false,
  };
}

export function parseAdapterDshDeniedBodyEntryFixture(value: unknown): AdapterDshDeniedBodyEntryFixture {
  const envelope = parseEnvelope(value);
  const stimulus = parseStimulus(envelope.stimulus);
  const expect = parseExpectation(envelope.expect);
  if (expect.callRef !== stimulus.call.callRef || expect.toolName !== stimulus.call.toolName) {
    invalid("fixture expectation must correlate to the same callRef and toolName as stimulus.call");
  }
  return { envelope, stimulus, expect };
}

function isProjection(value: unknown): value is AdapterDshDeniedBodyEntryObservable {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  if (
    keys.length !== 5
    || keys[0] !== "bodyEntered"
    || keys[1] !== "callRef"
    || keys[2] !== "decision"
    || keys[3] !== "kind"
    || keys[4] !== "toolName"
  ) {
    return false;
  }
  return value.kind === "DENIAL_BODY_ENTRY"
    && typeof value.callRef === "string"
    && value.callRef.length > 0
    && typeof value.toolName === "string"
    && value.toolName.length > 0
    && value.decision === "DENIED"
    && typeof value.bodyEntered === "boolean";
}

/**
 * The implementation callback must return explicit denial evidence together
 * with explicit body-entry instrumentation. A callback failure or malformed
 * projection is infrastructure ERROR; a valid projection that says the denied
 * call entered the body is a normative FAIL.
 */
export async function runAdapterDshDeniedBodyEntryFixture(
  fixture: AdapterDshDeniedBodyEntryFixture,
  project: (
    stimulus: AdapterDshDeniedBodyEntryStimulus,
  ) => AdapterDshDeniedBodyEntryObservable | Promise<AdapterDshDeniedBodyEntryObservable>,
): Promise<AdapterDshDeniedBodyEntryCaseResult> {
  let observed: unknown;
  try {
    observed = await project(fixture.stimulus);
  } catch {
    return { status: "ERROR", code: "ADAPTER_DSH_DENIED_BODY_ENTRY_IMPLEMENTATION_ERROR" };
  }
  if (!isProjection(observed)) {
    return { status: "ERROR", code: "ADAPTER_DSH_DENIED_BODY_ENTRY_IMPLEMENTATION_ERROR" };
  }
  return observed.kind === fixture.expect.kind
    && observed.callRef === fixture.expect.callRef
    && observed.toolName === fixture.expect.toolName
    && observed.decision === fixture.expect.decision
    && observed.bodyEntered === fixture.expect.bodyEntered
    ? { status: "PASS" }
    : { status: "FAIL", code: "ADAPTER_DSH_DENIED_BODY_ENTRY_MISMATCH" };
}
