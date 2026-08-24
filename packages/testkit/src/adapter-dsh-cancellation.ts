import type { TckFixtureV1Alpha1, TckJsonValue } from "./tck-contract.js";

export const ADAPTER_DSH_CANCELLATION_OPERATION = "cancellation" as const;
export const ADAPTER_DSH_CANCELLATION_ERROR_CODES = [
  "INVALID_ADAPTER_DSH_CANCELLATION_FIXTURE",
] as const;

export type AdapterDshCancellationErrorCode =
  (typeof ADAPTER_DSH_CANCELLATION_ERROR_CODES)[number];

export type AdapterDshCancellationToolCode = "ABORTED" | "ABORTED_BEFORE_DISPATCH";

export interface AdapterDshCancellationRequest {
  readonly sessionRef: string;
  readonly toolName: string;
  readonly callRef?: string;
  readonly reason?: string;
}

export type AdapterDshCancellationSourceFact =
  | {
      readonly kind: "APPROVAL_DECISION";
      readonly decision: "CANCELLED";
      readonly audit: "DURABLE_PAIR";
    }
  | {
      readonly kind: "FINAL_TOOL_RESULT";
      readonly source: "tools/result";
      readonly observedAt: string;
      readonly execution: {
        readonly callId: string;
        readonly name: string;
        readonly arguments: TckJsonValue;
      };
      readonly result: {
        readonly isError: true;
        readonly error: {
          readonly info: {
            readonly code: AdapterDshCancellationToolCode;
          };
        };
      };
      readonly resultDigest: string;
    };

export interface AdapterDshCancellationStimulus {
  readonly operation: typeof ADAPTER_DSH_CANCELLATION_OPERATION;
  readonly request: AdapterDshCancellationRequest;
  readonly sourceFact: AdapterDshCancellationSourceFact;
}

export type AdapterDshCancellationObservable =
  | {
      readonly kind: "APPROVAL_CANCELLATION";
      readonly decision: "CANCELLED";
      readonly audit: "DURABLE_PAIR";
    }
  | {
      readonly kind: "TOOL_CANCELLATION";
      readonly callRef: string;
      readonly toolName: string;
      readonly outcome: "cancelled";
      readonly resultDigest: string;
      readonly errorCode: AdapterDshCancellationToolCode;
    };

export interface AdapterDshCancellationFixture {
  readonly envelope: TckFixtureV1Alpha1;
  readonly stimulus: AdapterDshCancellationStimulus;
  readonly expect: AdapterDshCancellationObservable;
}

export type AdapterDshCancellationCaseResult =
  | { readonly status: "PASS" }
  | { readonly status: "FAIL"; readonly code: string }
  | { readonly status: "ERROR"; readonly code: string };

export class AdapterDshCancellationFixtureError extends Error {
  readonly code: AdapterDshCancellationErrorCode;

  constructor(message: string) {
    super(message);
    this.name = "AdapterDshCancellationFixtureError";
    this.code = "INVALID_ADAPTER_DSH_CANCELLATION_FIXTURE";
  }
}

function invalid(message: string): never {
  throw new AdapterDshCancellationFixtureError(message);
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
  const allowed = new Set([...required, ...optional]);
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) invalid(`${label} is missing ${key}`);
  }
  const unknown = Object.keys(value).find(key => !allowed.has(key));
  if (unknown !== undefined) invalid(`${label} contains unknown field ${unknown}`);
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
    ) invalid(`${label} must contain dense undecorated JSON arrays`);
    const result = value.map((entry, index) => portableJson(entry, `${label}[${index}]`, seen));
    seen.delete(value);
    return result;
  }
  if (!isRecord(value)) invalid(`${label} must contain only ordinary JSON objects`);
  if (seen.has(value)) invalid(`${label} must not contain cycles`);
  seen.add(value);
  const result: Record<string, TckJsonValue> = {};
  for (const [key, entry] of Object.entries(value)) result[key] = portableJson(entry, `${label}.${key}`, seen);
  seen.delete(value);
  return result;
}

function parseEnvelope(value: unknown): TckFixtureV1Alpha1 {
  const json = portableJson(value, "fixture");
  if (!isRecord(json)) invalid("fixture must be an object");
  exactKeys(json, ["apiVersion", "id", "profile", "description", "determinism", "stimulus", "expect"], "fixture");
  if (json.apiVersion !== "safe-runtime.dev/tck-fixture/v1alpha1") invalid("fixture apiVersion is unsupported");
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

function parseRequest(value: unknown): AdapterDshCancellationRequest {
  if (!isRecord(value)) invalid("fixture.stimulus.request must be an object");
  allowedKeys(value, ["sessionRef", "toolName"], ["callRef", "reason"], "fixture.stimulus.request");
  const reason = value.reason;
  if (reason !== undefined && typeof reason !== "string") invalid("fixture.stimulus.request.reason must be a string");
  return {
    sessionRef: nonEmptyString(value.sessionRef, "fixture.stimulus.request.sessionRef"),
    toolName: nonEmptyString(value.toolName, "fixture.stimulus.request.toolName"),
    ...(value.callRef === undefined ? {} : {
      callRef: nonEmptyString(value.callRef, "fixture.stimulus.request.callRef"),
    }),
    ...(reason === undefined ? {} : { reason }),
  };
}

function cancellationCode(value: unknown, label: string): AdapterDshCancellationToolCode {
  if (value !== "ABORTED" && value !== "ABORTED_BEFORE_DISPATCH") {
    invalid(`${label} must be ABORTED or ABORTED_BEFORE_DISPATCH`);
  }
  return value;
}

function parseFinalToolResult(value: Record<string, unknown>): Extract<
  AdapterDshCancellationSourceFact,
  { readonly kind: "FINAL_TOOL_RESULT" }
> {
  exactKeys(
    value,
    ["kind", "source", "observedAt", "execution", "result", "resultDigest"],
    "fixture.stimulus.sourceFact",
  );
  if (value.source !== "tools/result") invalid("M3-015 final result source must be tools/result");
  const observedAt = nonEmptyString(value.observedAt, "fixture.stimulus.sourceFact.observedAt");
  const resultDigest = nonEmptyString(value.resultDigest, "fixture.stimulus.sourceFact.resultDigest");

  if (!isRecord(value.execution)) invalid("fixture.stimulus.sourceFact.execution must be an object");
  exactKeys(value.execution, ["callId", "name", "arguments"], "fixture.stimulus.sourceFact.execution");
  const execution = {
    callId: nonEmptyString(value.execution.callId, "fixture.stimulus.sourceFact.execution.callId"),
    name: nonEmptyString(value.execution.name, "fixture.stimulus.sourceFact.execution.name"),
    arguments: portableJson(value.execution.arguments, "fixture.stimulus.sourceFact.execution.arguments"),
  };

  if (!isRecord(value.result)) invalid("fixture.stimulus.sourceFact.result must be an object");
  exactKeys(value.result, ["isError", "error"], "fixture.stimulus.sourceFact.result");
  if (value.result.isError !== true) invalid("M3-015 final cancellation result must have isError true");
  if (!isRecord(value.result.error)) invalid("fixture.stimulus.sourceFact.result.error must be an object");
  exactKeys(value.result.error, ["info"], "fixture.stimulus.sourceFact.result.error");
  if (!isRecord(value.result.error.info)) invalid("fixture.stimulus.sourceFact.result.error.info must be an object");
  exactKeys(value.result.error.info, ["code"], "fixture.stimulus.sourceFact.result.error.info");
  const code = cancellationCode(value.result.error.info.code, "fixture.stimulus.sourceFact.result.error.info.code");

  return {
    kind: "FINAL_TOOL_RESULT",
    source: "tools/result",
    observedAt,
    execution,
    result: { isError: true, error: { info: { code } } },
    resultDigest,
  };
}

function parseSourceFact(value: unknown): AdapterDshCancellationSourceFact {
  if (!isRecord(value)) invalid("fixture.stimulus.sourceFact must be an object");
  if (value.kind === "APPROVAL_DECISION") {
    exactKeys(value, ["kind", "decision", "audit"], "fixture.stimulus.sourceFact");
    if (value.decision !== "CANCELLED") invalid("M3-015 approval decision must be CANCELLED");
    if (value.audit !== "DURABLE_PAIR") invalid("M3-015 approval cancellation must carry DURABLE_PAIR audit");
    return { kind: "APPROVAL_DECISION", decision: "CANCELLED", audit: "DURABLE_PAIR" };
  }
  if (value.kind === "FINAL_TOOL_RESULT") return parseFinalToolResult(value);
  invalid("fixture.stimulus.sourceFact.kind is unsupported");
}

function parseStimulus(value: unknown): AdapterDshCancellationStimulus {
  if (!isRecord(value)) invalid("fixture.stimulus must be an object");
  exactKeys(value, ["operation", "request", "sourceFact"], "fixture.stimulus");
  if (value.operation !== ADAPTER_DSH_CANCELLATION_OPERATION) {
    invalid("fixture.stimulus.operation is not M3-015 cancellation");
  }
  const request = parseRequest(value.request);
  const sourceFact = parseSourceFact(value.sourceFact);
  if (sourceFact.kind === "FINAL_TOOL_RESULT") {
    if (request.callRef === undefined) invalid("M3-015 final tool result requires fixture.stimulus.request.callRef");
    if (sourceFact.execution.callId !== request.callRef) {
      invalid("M3-015 final tool result callId must correlate with fixture request callRef");
    }
    if (sourceFact.execution.name !== request.toolName) {
      invalid("M3-015 final tool result name must correlate with fixture request toolName");
    }
  }
  return { operation: ADAPTER_DSH_CANCELLATION_OPERATION, request, sourceFact };
}

function parseExpectation(value: unknown): AdapterDshCancellationObservable {
  if (!isRecord(value)) invalid("fixture.expect must be an object");
  if (value.kind === "APPROVAL_CANCELLATION") {
    exactKeys(value, ["kind", "decision", "audit"], "fixture.expect");
    if (value.decision !== "CANCELLED" || value.audit !== "DURABLE_PAIR") {
      invalid("fixture.expect approval cancellation must be CANCELLED with DURABLE_PAIR audit");
    }
    return { kind: "APPROVAL_CANCELLATION", decision: "CANCELLED", audit: "DURABLE_PAIR" };
  }
  if (value.kind === "TOOL_CANCELLATION") {
    exactKeys(
      value,
      ["kind", "callRef", "toolName", "outcome", "resultDigest", "errorCode"],
      "fixture.expect",
    );
    if (value.outcome !== "cancelled") invalid("fixture.expect tool outcome must be cancelled");
    return {
      kind: "TOOL_CANCELLATION",
      callRef: nonEmptyString(value.callRef, "fixture.expect.callRef"),
      toolName: nonEmptyString(value.toolName, "fixture.expect.toolName"),
      outcome: "cancelled",
      resultDigest: nonEmptyString(value.resultDigest, "fixture.expect.resultDigest"),
      errorCode: cancellationCode(value.errorCode, "fixture.expect.errorCode"),
    };
  }
  invalid("fixture.expect.kind is unsupported");
}

export function parseAdapterDshCancellationFixture(value: unknown): AdapterDshCancellationFixture {
  const envelope = parseEnvelope(value);
  const stimulus = parseStimulus(envelope.stimulus);
  const expect = parseExpectation(envelope.expect);
  if (stimulus.sourceFact.kind === "APPROVAL_DECISION") {
    if (expect.kind !== "APPROVAL_CANCELLATION") {
      invalid("M3-015 approval source requires APPROVAL_CANCELLATION expectation");
    }
  } else {
    if (expect.kind !== "TOOL_CANCELLATION") {
      invalid("M3-015 final tool result requires TOOL_CANCELLATION expectation");
    }
    if (
      expect.callRef !== stimulus.sourceFact.execution.callId
      || expect.toolName !== stimulus.sourceFact.execution.name
      || expect.resultDigest !== stimulus.sourceFact.resultDigest
      || expect.errorCode !== stimulus.sourceFact.result.error.info.code
    ) {
      invalid("M3-015 tool cancellation expectation must preserve authoritative source correlation");
    }
  }
  return { envelope, stimulus, expect };
}

function isObservable(value: unknown): value is AdapterDshCancellationObservable {
  if (!isRecord(value)) return false;
  if (value.kind === "APPROVAL_CANCELLATION") {
    const keys = Object.keys(value).sort();
    return keys.length === 3
      && keys[0] === "audit"
      && keys[1] === "decision"
      && keys[2] === "kind"
      && value.decision === "CANCELLED"
      && value.audit === "DURABLE_PAIR";
  }
  if (value.kind === "TOOL_CANCELLATION") {
    const keys = Object.keys(value).sort();
    return keys.length === 6
      && keys[0] === "callRef"
      && keys[1] === "errorCode"
      && keys[2] === "kind"
      && keys[3] === "outcome"
      && keys[4] === "resultDigest"
      && keys[5] === "toolName"
      && typeof value.callRef === "string"
      && value.callRef.length > 0
      && typeof value.toolName === "string"
      && value.toolName.length > 0
      && value.outcome === "cancelled"
      && typeof value.resultDigest === "string"
      && value.resultDigest.length > 0
      && (value.errorCode === "ABORTED" || value.errorCode === "ABORTED_BEFORE_DISPATCH");
  }
  return false;
}

function observableEqual(
  observed: AdapterDshCancellationObservable,
  expected: AdapterDshCancellationObservable,
): boolean {
  if (observed.kind !== expected.kind) return false;
  if (observed.kind === "APPROVAL_CANCELLATION" && expected.kind === "APPROVAL_CANCELLATION") {
    return observed.decision === expected.decision && observed.audit === expected.audit;
  }
  if (observed.kind === "TOOL_CANCELLATION" && expected.kind === "TOOL_CANCELLATION") {
    return observed.callRef === expected.callRef
      && observed.toolName === expected.toolName
      && observed.outcome === expected.outcome
      && observed.resultDigest === expected.resultDigest
      && observed.errorCode === expected.errorCode;
  }
  return false;
}

/**
 * Run one validated M3-015 case. Expected data is comparison-only and never
 * participates in cancellation source classification.
 */
export async function runAdapterDshCancellationFixture(
  fixture: AdapterDshCancellationFixture,
  project: (
    stimulus: AdapterDshCancellationStimulus,
  ) => AdapterDshCancellationObservable | Promise<AdapterDshCancellationObservable>,
): Promise<AdapterDshCancellationCaseResult> {
  let observed: unknown;
  try {
    observed = await project(fixture.stimulus);
  } catch {
    return { status: "ERROR", code: "ADAPTER_DSH_CANCELLATION_IMPLEMENTATION_ERROR" };
  }
  if (!isObservable(observed)) {
    return { status: "ERROR", code: "ADAPTER_DSH_CANCELLATION_IMPLEMENTATION_ERROR" };
  }
  return observableEqual(observed, fixture.expect)
    ? { status: "PASS" }
    : { status: "FAIL", code: "ADAPTER_DSH_CANCELLATION_MISMATCH" };
}
