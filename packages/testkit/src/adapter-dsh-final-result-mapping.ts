import type { TckFixtureV1Alpha1, TckJsonValue } from "./tck-contract.js";

export const ADAPTER_DSH_FINAL_RESULT_MAPPING_OPERATION = "final-result-mapping" as const;
export const ADAPTER_DSH_FINAL_RESULT_MAPPING_ERROR_CODES = [
  "INVALID_ADAPTER_DSH_FINAL_RESULT_MAPPING_FIXTURE",
] as const;

export type AdapterDshFinalResultMappingErrorCode =
  (typeof ADAPTER_DSH_FINAL_RESULT_MAPPING_ERROR_CODES)[number];

export type AdapterDshFinalResultOutcome = "success" | "error";

export interface AdapterDshFinalResultMappingStimulus {
  readonly operation: typeof ADAPTER_DSH_FINAL_RESULT_MAPPING_OPERATION;
  readonly sessionRef: string;
  readonly sourceObservation: {
    readonly source: "tools/result";
    readonly observedAt: string;
    readonly execution: {
      readonly callId: string;
      readonly name: string;
      readonly arguments: TckJsonValue;
    };
    readonly result: Readonly<Record<string, TckJsonValue>> & { readonly isError: boolean };
    readonly resultDigest: string;
  };
}

export interface AdapterDshFinalResultMappingObservable {
  readonly type: "tool.completed";
  readonly callRef: string;
  readonly toolName: string;
  readonly outcome: AdapterDshFinalResultOutcome;
  readonly resultDigest: string;
  readonly errorCode?: string;
}

export interface AdapterDshFinalResultMappingFixture {
  readonly envelope: TckFixtureV1Alpha1;
  readonly stimulus: AdapterDshFinalResultMappingStimulus;
  readonly expect: {
    readonly kind: "EVENT";
    readonly event: AdapterDshFinalResultMappingObservable;
  };
}

export type AdapterDshFinalResultMappingCaseResult =
  | { readonly status: "PASS" }
  | { readonly status: "FAIL"; readonly code: string }
  | { readonly status: "ERROR"; readonly code: string };

export class AdapterDshFinalResultMappingFixtureError extends Error {
  readonly code: AdapterDshFinalResultMappingErrorCode;

  constructor(message: string) {
    super(message);
    this.name = "AdapterDshFinalResultMappingFixtureError";
    this.code = "INVALID_ADAPTER_DSH_FINAL_RESULT_MAPPING_FIXTURE";
  }
}

const CANCELLATION_CODES = new Set(["ABORTED", "ABORTED_BEFORE_DISPATCH"]);

function invalid(message: string): never {
  throw new AdapterDshFinalResultMappingFixtureError(message);
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

function parseSourceResult(
  value: unknown,
): Readonly<Record<string, TckJsonValue>> & { readonly isError: boolean } {
  const json = portableJson(value, "fixture.stimulus.sourceObservation.result");
  if (!isRecord(json)) invalid("fixture.stimulus.sourceObservation.result must be an object");
  if (typeof json.isError !== "boolean") {
    invalid("fixture.stimulus.sourceObservation.result.isError must be boolean");
  }

  if (json.isError === false) {
    if (Object.prototype.hasOwnProperty.call(json, "error")) {
      invalid("successful final result must not contain error");
    }
    return json as Readonly<Record<string, TckJsonValue>> & { readonly isError: false };
  }

  if (Object.prototype.hasOwnProperty.call(json, "error")) {
    if (!isRecord(json.error)) invalid("final result.error must be an object when present");
    if (Object.prototype.hasOwnProperty.call(json.error, "info")) {
      if (!isRecord(json.error.info)) invalid("final result.error.info must be an object when present");
      if (Object.prototype.hasOwnProperty.call(json.error.info, "code")) {
        const code = nonEmptyString(
          json.error.info.code,
          "fixture.stimulus.sourceObservation.result.error.info.code",
        );
        if (CANCELLATION_CODES.has(code)) {
          invalid(`final result error code ${code} belongs to M3-015 cancellation semantics`);
        }
      }
    }
  }
  return json as Readonly<Record<string, TckJsonValue>> & { readonly isError: true };
}

function sourceErrorCode(
  result: Readonly<Record<string, TckJsonValue>> & { readonly isError: boolean },
): string | undefined {
  if (result.isError !== true || !isRecord(result.error) || !isRecord(result.error.info)) {
    return undefined;
  }
  return typeof result.error.info.code === "string" ? result.error.info.code : undefined;
}

function parseStimulus(value: unknown): AdapterDshFinalResultMappingStimulus {
  if (!isRecord(value)) invalid("fixture.stimulus must be an object");
  exactKeys(value, ["operation", "sessionRef", "sourceObservation"], "fixture.stimulus");
  if (value.operation !== ADAPTER_DSH_FINAL_RESULT_MAPPING_OPERATION) {
    invalid("fixture.stimulus.operation is not M3-013 final-result-mapping");
  }
  const sessionRef = nonEmptyString(value.sessionRef, "fixture.stimulus.sessionRef");
  if (!isRecord(value.sourceObservation)) {
    invalid("fixture.stimulus.sourceObservation must be an object");
  }
  exactKeys(
    value.sourceObservation,
    ["source", "observedAt", "execution", "result", "resultDigest"],
    "fixture.stimulus.sourceObservation",
  );
  if (value.sourceObservation.source !== "tools/result") {
    invalid("fixture.stimulus.sourceObservation.source must be tools/result");
  }
  const observedAt = nonEmptyString(
    value.sourceObservation.observedAt,
    "fixture.stimulus.sourceObservation.observedAt",
  );
  const resultDigest = nonEmptyString(
    value.sourceObservation.resultDigest,
    "fixture.stimulus.sourceObservation.resultDigest",
  );
  if (!isRecord(value.sourceObservation.execution)) {
    invalid("fixture.stimulus.sourceObservation.execution must be an object");
  }
  exactKeys(
    value.sourceObservation.execution,
    ["callId", "name", "arguments"],
    "fixture.stimulus.sourceObservation.execution",
  );
  const execution = {
    callId: nonEmptyString(
      value.sourceObservation.execution.callId,
      "fixture.stimulus.sourceObservation.execution.callId",
    ),
    name: nonEmptyString(
      value.sourceObservation.execution.name,
      "fixture.stimulus.sourceObservation.execution.name",
    ),
    arguments: portableJson(
      value.sourceObservation.execution.arguments,
      "fixture.stimulus.sourceObservation.execution.arguments",
    ),
  };
  const result = parseSourceResult(value.sourceObservation.result);

  return {
    operation: ADAPTER_DSH_FINAL_RESULT_MAPPING_OPERATION,
    sessionRef,
    sourceObservation: {
      source: "tools/result",
      observedAt,
      execution,
      result,
      resultDigest,
    },
  };
}

function parseObservable(value: unknown, label: string): AdapterDshFinalResultMappingObservable {
  if (!isRecord(value)) invalid(`${label} must be an object`);
  const hasErrorCode = Object.prototype.hasOwnProperty.call(value, "errorCode");
  exactKeys(
    value,
    hasErrorCode
      ? ["type", "callRef", "toolName", "outcome", "resultDigest", "errorCode"]
      : ["type", "callRef", "toolName", "outcome", "resultDigest"],
    label,
  );
  if (value.type !== "tool.completed") invalid(`${label}.type must be tool.completed`);
  if (value.outcome !== "success" && value.outcome !== "error") {
    invalid(`${label}.outcome must be success or error`);
  }
  if (value.outcome === "success" && hasErrorCode) {
    invalid(`${label}.errorCode must be absent for success`);
  }
  const errorCode = hasErrorCode
    ? nonEmptyString(value.errorCode, `${label}.errorCode`)
    : undefined;
  if (errorCode !== undefined && CANCELLATION_CODES.has(errorCode)) {
    invalid(`${label}.errorCode belongs to M3-015 cancellation semantics`);
  }
  return {
    type: "tool.completed",
    callRef: nonEmptyString(value.callRef, `${label}.callRef`),
    toolName: nonEmptyString(value.toolName, `${label}.toolName`),
    outcome: value.outcome,
    resultDigest: nonEmptyString(value.resultDigest, `${label}.resultDigest`),
    ...(errorCode === undefined ? {} : { errorCode }),
  };
}

function parseExpectation(value: unknown): AdapterDshFinalResultMappingFixture["expect"] {
  if (!isRecord(value)) invalid("fixture.expect must be an object");
  exactKeys(value, ["kind", "event"], "fixture.expect");
  if (value.kind !== "EVENT") invalid("fixture.expect.kind must be EVENT");
  return { kind: "EVENT", event: parseObservable(value.event, "fixture.expect.event") };
}

export function parseAdapterDshFinalResultMappingFixture(
  value: unknown,
): AdapterDshFinalResultMappingFixture {
  const envelope = parseEnvelope(value);
  const stimulus = parseStimulus(envelope.stimulus);
  const expect = parseExpectation(envelope.expect);
  const source = stimulus.sourceObservation;
  const expectedOutcome: AdapterDshFinalResultOutcome = source.result.isError ? "error" : "success";
  const expectedErrorCode = sourceErrorCode(source.result);

  if (
    expect.event.callRef !== source.execution.callId
    || expect.event.toolName !== source.execution.name
  ) {
    invalid("fixture expectation must correlate to source execution callId and name");
  }
  if (expect.event.outcome !== expectedOutcome) {
    invalid("fixture expectation outcome must match the source final-result class");
  }
  if (expect.event.resultDigest !== source.resultDigest) {
    invalid("fixture expectation resultDigest must match authoritative source resultDigest");
  }
  if (expect.event.errorCode !== expectedErrorCode) {
    invalid("fixture expectation errorCode must match authoritative source error code presence/value");
  }

  return { envelope, stimulus, expect };
}

function isProjection(value: unknown): value is AdapterDshFinalResultMappingObservable {
  if (!isRecord(value)) return false;
  const hasErrorCode = Object.prototype.hasOwnProperty.call(value, "errorCode");
  const keys = Object.keys(value).sort();
  const wanted = (hasErrorCode
    ? ["callRef", "errorCode", "outcome", "resultDigest", "toolName", "type"]
    : ["callRef", "outcome", "resultDigest", "toolName", "type"]
  ).sort();
  if (keys.length !== wanted.length || keys.some((key, index) => key !== wanted[index])) return false;
  if (
    value.type !== "tool.completed"
    || typeof value.callRef !== "string"
    || value.callRef.length === 0
    || typeof value.toolName !== "string"
    || value.toolName.length === 0
    || (value.outcome !== "success" && value.outcome !== "error")
    || typeof value.resultDigest !== "string"
    || value.resultDigest.length === 0
  ) {
    return false;
  }
  if (value.outcome === "success" && hasErrorCode) return false;
  if (hasErrorCode) {
    if (typeof value.errorCode !== "string" || value.errorCode.length === 0) return false;
    if (CANCELLATION_CODES.has(value.errorCode)) return false;
  }
  return true;
}

function sameObservable(
  observed: AdapterDshFinalResultMappingObservable,
  expected: AdapterDshFinalResultMappingObservable,
): boolean {
  return observed.type === expected.type
    && observed.callRef === expected.callRef
    && observed.toolName === expected.toolName
    && observed.outcome === expected.outcome
    && observed.resultDigest === expected.resultDigest
    && observed.errorCode === expected.errorCode;
}

/**
 * The implementation callback receives only authoritative source stimulus.
 * Expectation data is never passed to the projector, preventing the comparison
 * oracle from manufacturing the final-result mapping it later verifies.
 */
export async function runAdapterDshFinalResultMappingFixture(
  fixture: AdapterDshFinalResultMappingFixture,
  project: (
    stimulus: AdapterDshFinalResultMappingStimulus,
  ) => AdapterDshFinalResultMappingObservable | Promise<AdapterDshFinalResultMappingObservable>,
): Promise<AdapterDshFinalResultMappingCaseResult> {
  let observed: unknown;
  try {
    observed = await project(fixture.stimulus);
  } catch {
    return { status: "ERROR", code: "ADAPTER_DSH_FINAL_RESULT_MAPPING_IMPLEMENTATION_ERROR" };
  }
  if (!isProjection(observed)) {
    return { status: "ERROR", code: "ADAPTER_DSH_FINAL_RESULT_MAPPING_IMPLEMENTATION_ERROR" };
  }
  return sameObservable(observed, fixture.expect.event)
    ? { status: "PASS" }
    : { status: "FAIL", code: "ADAPTER_DSH_FINAL_RESULT_MAPPING_MISMATCH" };
}
