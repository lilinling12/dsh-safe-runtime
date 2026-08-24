import type { TckFixtureV1Alpha1, TckJsonValue } from "./tck-contract.js";

export const ADAPTER_DSH_APPROVAL_UNAVAILABLE_OPERATION = "approval-unavailable" as const;
export const ADAPTER_DSH_APPROVAL_UNAVAILABLE_ERROR_CODES = [
  "INVALID_ADAPTER_DSH_APPROVAL_UNAVAILABLE_FIXTURE",
] as const;

export type AdapterDshApprovalUnavailableErrorCode =
  (typeof ADAPTER_DSH_APPROVAL_UNAVAILABLE_ERROR_CODES)[number];

export interface AdapterDshApprovalUnavailableRequest {
  readonly sessionRef: string;
  readonly callRef?: string;
  readonly toolName: string;
  readonly reason?: string;
}

export type AdapterDshApprovalUnavailableSourceFact =
  | { readonly kind: "SERVICE_ABSENT" }
  | { readonly kind: "SERVICE_DECISION"; readonly decision: "UNAVAILABLE"; readonly audit: "DURABLE_PAIR" };

export interface AdapterDshApprovalUnavailableStimulus {
  readonly operation: typeof ADAPTER_DSH_APPROVAL_UNAVAILABLE_OPERATION;
  readonly request: AdapterDshApprovalUnavailableRequest;
  readonly sourceFact: AdapterDshApprovalUnavailableSourceFact;
}

export interface AdapterDshApprovalUnavailableObservable {
  readonly kind: "APPROVAL_UNAVAILABLE";
  readonly decision: "UNAVAILABLE";
  readonly audit: "NONE" | "DURABLE_PAIR";
}

export interface AdapterDshApprovalUnavailableFixture {
  readonly envelope: TckFixtureV1Alpha1;
  readonly stimulus: AdapterDshApprovalUnavailableStimulus;
  readonly expect: AdapterDshApprovalUnavailableObservable;
}

export type AdapterDshApprovalUnavailableCaseResult =
  | { readonly status: "PASS" }
  | { readonly status: "FAIL"; readonly code: string }
  | { readonly status: "ERROR"; readonly code: string };

export class AdapterDshApprovalUnavailableFixtureError extends Error {
  readonly code: AdapterDshApprovalUnavailableErrorCode;

  constructor(message: string) {
    super(message);
    this.name = "AdapterDshApprovalUnavailableFixtureError";
    this.code = "INVALID_ADAPTER_DSH_APPROVAL_UNAVAILABLE_FIXTURE";
  }
}

function invalid(message: string): never {
  throw new AdapterDshApprovalUnavailableFixtureError(message);
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

function parseRequest(value: unknown): AdapterDshApprovalUnavailableRequest {
  if (!isRecord(value)) invalid("fixture.stimulus.request must be an object");
  allowedKeys(value, ["sessionRef", "toolName"], ["callRef", "reason"], "fixture.stimulus.request");
  const reason = value.reason;
  if (reason !== undefined && typeof reason !== "string") invalid("fixture.stimulus.request.reason must be a string");
  return {
    sessionRef: nonEmptyString(value.sessionRef, "fixture.stimulus.request.sessionRef"),
    toolName: nonEmptyString(value.toolName, "fixture.stimulus.request.toolName"),
    ...(value.callRef === undefined ? {} : { callRef: nonEmptyString(value.callRef, "fixture.stimulus.request.callRef") }),
    ...(reason === undefined ? {} : { reason }),
  };
}

function parseSourceFact(value: unknown): AdapterDshApprovalUnavailableSourceFact {
  if (!isRecord(value)) invalid("fixture.stimulus.sourceFact must be an object");
  if (value.kind === "SERVICE_ABSENT") {
    exactKeys(value, ["kind"], "fixture.stimulus.sourceFact");
    return { kind: "SERVICE_ABSENT" };
  }
  if (value.kind === "SERVICE_DECISION") {
    exactKeys(value, ["kind", "decision", "audit"], "fixture.stimulus.sourceFact");
    if (value.decision !== "UNAVAILABLE") invalid("M3-014 SERVICE_DECISION must be UNAVAILABLE");
    if (value.audit !== "DURABLE_PAIR") invalid("M3-014 SERVICE_DECISION must carry DURABLE_PAIR audit");
    return { kind: "SERVICE_DECISION", decision: "UNAVAILABLE", audit: "DURABLE_PAIR" };
  }
  invalid("fixture.stimulus.sourceFact.kind is unsupported");
}

function parseStimulus(value: unknown): AdapterDshApprovalUnavailableStimulus {
  if (!isRecord(value)) invalid("fixture.stimulus must be an object");
  exactKeys(value, ["operation", "request", "sourceFact"], "fixture.stimulus");
  if (value.operation !== ADAPTER_DSH_APPROVAL_UNAVAILABLE_OPERATION) {
    invalid("fixture.stimulus.operation is not M3-014 approval-unavailable");
  }
  return {
    operation: ADAPTER_DSH_APPROVAL_UNAVAILABLE_OPERATION,
    request: parseRequest(value.request),
    sourceFact: parseSourceFact(value.sourceFact),
  };
}

function parseExpectation(value: unknown): AdapterDshApprovalUnavailableObservable {
  if (!isRecord(value)) invalid("fixture.expect must be an object");
  exactKeys(value, ["kind", "decision", "audit"], "fixture.expect");
  if (value.kind !== "APPROVAL_UNAVAILABLE" || value.decision !== "UNAVAILABLE") {
    invalid("fixture.expect must describe APPROVAL_UNAVAILABLE / UNAVAILABLE");
  }
  if (value.audit !== "NONE" && value.audit !== "DURABLE_PAIR") invalid("fixture.expect.audit is unsupported");
  return { kind: "APPROVAL_UNAVAILABLE", decision: "UNAVAILABLE", audit: value.audit };
}

export function parseAdapterDshApprovalUnavailableFixture(value: unknown): AdapterDshApprovalUnavailableFixture {
  const envelope = parseEnvelope(value);
  const stimulus = parseStimulus(envelope.stimulus);
  const expect = parseExpectation(envelope.expect);
  const audit = stimulus.sourceFact.kind === "SERVICE_ABSENT" ? "NONE" : "DURABLE_PAIR";
  if (expect.audit !== audit) invalid(`fixture.expect.audit must be ${audit} for ${stimulus.sourceFact.kind}`);
  return { envelope, stimulus, expect };
}

function isProjection(value: unknown): value is AdapterDshApprovalUnavailableObservable {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  return keys.length === 3
    && keys[0] === "audit"
    && keys[1] === "decision"
    && keys[2] === "kind"
    && value.kind === "APPROVAL_UNAVAILABLE"
    && value.decision === "UNAVAILABLE"
    && (value.audit === "NONE" || value.audit === "DURABLE_PAIR");
}

/**
 * Run one validated M3-014 case. Expected output is comparison-only and never
 * participates in unavailable source classification.
 */
export async function runAdapterDshApprovalUnavailableFixture(
  fixture: AdapterDshApprovalUnavailableFixture,
  project: (
    stimulus: AdapterDshApprovalUnavailableStimulus,
  ) => AdapterDshApprovalUnavailableObservable | Promise<AdapterDshApprovalUnavailableObservable>,
): Promise<AdapterDshApprovalUnavailableCaseResult> {
  let observed: unknown;
  try {
    observed = await project(fixture.stimulus);
  } catch {
    return { status: "ERROR", code: "ADAPTER_DSH_APPROVAL_UNAVAILABLE_IMPLEMENTATION_ERROR" };
  }
  if (!isProjection(observed)) {
    return { status: "ERROR", code: "ADAPTER_DSH_APPROVAL_UNAVAILABLE_IMPLEMENTATION_ERROR" };
  }
  return observed.decision === fixture.expect.decision && observed.audit === fixture.expect.audit
    ? { status: "PASS" }
    : { status: "FAIL", code: "ADAPTER_DSH_APPROVAL_UNAVAILABLE_MISMATCH" };
}
