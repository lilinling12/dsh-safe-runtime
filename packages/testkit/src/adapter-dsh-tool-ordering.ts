import type { TckFixtureV1Alpha1, TckJsonValue } from "./tck-contract.js";

export const ADAPTER_DSH_TOOL_ORDERING_OPERATION = "tool-ordering" as const;
export const ADAPTER_DSH_TOOL_ORDERING_ERROR_CODES = [
  "INVALID_ADAPTER_DSH_TOOL_ORDERING_FIXTURE",
] as const;

export type AdapterDshToolOrderingErrorCode =
  (typeof ADAPTER_DSH_TOOL_ORDERING_ERROR_CODES)[number];

export interface AdapterDshToolOrderingRequestObservation {
  readonly source: "session/event";
  readonly type: "tool/call";
  readonly seq: number;
  readonly time: number;
  readonly data: {
    readonly turn: number;
    readonly step: number;
    readonly callId: string;
    readonly name: string;
    readonly arguments: string;
  };
}

export interface AdapterDshToolOrderingResultObservation {
  readonly source: "tools/result";
  readonly observedAt: string;
  readonly execution: {
    readonly callId: string;
    readonly name: string;
    readonly arguments: TckJsonValue;
  };
  readonly result: {
    readonly isError: false;
  };
  readonly resultDigest: string;
}

export type AdapterDshToolOrderingSourceObservation =
  | AdapterDshToolOrderingRequestObservation
  | AdapterDshToolOrderingResultObservation;

export type AdapterDshToolOrderingObservable =
  | {
      readonly type: "tool.requested";
      readonly callRef: string;
      readonly toolName: string;
    }
  | {
      readonly type: "tool.completed";
      readonly callRef: string;
      readonly toolName: string;
    };

export interface AdapterDshToolOrderingProjection {
  readonly kind: "EVENT";
  readonly event: AdapterDshToolOrderingObservable;
}

export interface AdapterDshToolOrderingStimulus {
  readonly operation: typeof ADAPTER_DSH_TOOL_ORDERING_OPERATION;
  readonly sessionRef: string;
  readonly sourceObservations: readonly AdapterDshToolOrderingSourceObservation[];
}

export interface AdapterDshToolOrderingExpectation {
  readonly kind: "EVENTS";
  readonly events: readonly AdapterDshToolOrderingObservable[];
}

export interface AdapterDshToolOrderingFixture {
  readonly envelope: TckFixtureV1Alpha1;
  readonly stimulus: AdapterDshToolOrderingStimulus;
  readonly expect: AdapterDshToolOrderingExpectation;
}

export type AdapterDshToolOrderingCaseResult =
  | { readonly status: "PASS" }
  | { readonly status: "FAIL"; readonly code: string }
  | { readonly status: "ERROR"; readonly code: string };

export class AdapterDshToolOrderingFixtureError extends Error {
  readonly code: AdapterDshToolOrderingErrorCode;

  constructor(message: string) {
    super(message);
    this.name = "AdapterDshToolOrderingFixtureError";
    this.code = "INVALID_ADAPTER_DSH_TOOL_ORDERING_FIXTURE";
  }
}

function invalid(message: string): never {
  throw new AdapterDshToolOrderingFixtureError(message);
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

function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string") invalid(`${label} must be a string`);
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

/**
 * JSON files cannot contain cycles, holes, exotic objects, symbol properties,
 * undefined, or non-finite numbers. Direct TypeScript callers can, so this
 * boundary rejects those values before profile semantics are interpreted. That
 * prevents the reference implementation from accepting inputs a non-TypeScript
 * Shared TCK runner could never represent.
 */
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
  nonNegativeSafeInteger(
    json.determinism.clock.startUnixMs,
    "fixture.determinism.clock.startUnixMs",
  );
  positiveSafeInteger(json.determinism.clock.tickMs, "fixture.determinism.clock.tickMs");
  return json as unknown as TckFixtureV1Alpha1;
}

function parseRequestObservation(
  value: Record<string, unknown>,
  index: number,
): AdapterDshToolOrderingRequestObservation {
  const label = `sourceObservations[${index}]`;
  exactKeys(value, ["source", "type", "seq", "time", "data"], label);
  if (value.type !== "tool/call") invalid(`${label}.type must be tool/call`);
  if (!isRecord(value.data)) invalid(`${label}.data must be an object`);
  exactKeys(value.data, ["turn", "step", "callId", "name", "arguments"], `${label}.data`);
  return {
    source: "session/event",
    type: "tool/call",
    seq: nonNegativeSafeInteger(value.seq, `${label}.seq`),
    time: nonNegativeSafeInteger(value.time, `${label}.time`),
    data: {
      turn: nonNegativeSafeInteger(value.data.turn, `${label}.data.turn`),
      step: nonNegativeSafeInteger(value.data.step, `${label}.data.step`),
      callId: nonEmptyString(value.data.callId, `${label}.data.callId`),
      name: nonEmptyString(value.data.name, `${label}.data.name`),
      arguments: stringValue(value.data.arguments, `${label}.data.arguments`),
    },
  };
}

function parseResultObservation(
  value: Record<string, unknown>,
  index: number,
): AdapterDshToolOrderingResultObservation {
  const label = `sourceObservations[${index}]`;
  exactKeys(
    value,
    ["source", "observedAt", "execution", "result", "resultDigest"],
    label,
  );
  if (!isRecord(value.execution)) invalid(`${label}.execution must be an object`);
  exactKeys(value.execution, ["callId", "name", "arguments"], `${label}.execution`);
  if (!isRecord(value.result)) invalid(`${label}.result must be an object`);
  exactKeys(value.result, ["isError"], `${label}.result`);
  if (value.result.isError !== false) {
    invalid(`${label}.result.isError must be false for M3-011 ordering fixtures`);
  }
  return {
    source: "tools/result",
    observedAt: nonEmptyString(value.observedAt, `${label}.observedAt`),
    execution: {
      callId: nonEmptyString(value.execution.callId, `${label}.execution.callId`),
      name: nonEmptyString(value.execution.name, `${label}.execution.name`),
      arguments: portableJson(value.execution.arguments, `${label}.execution.arguments`),
    },
    result: { isError: false },
    resultDigest: nonEmptyString(value.resultDigest, `${label}.resultDigest`),
  };
}

function parseSourceObservation(
  value: unknown,
  index: number,
): AdapterDshToolOrderingSourceObservation {
  if (!isRecord(value)) invalid(`sourceObservations[${index}] must be an object`);
  if (value.source === "session/event") return parseRequestObservation(value, index);
  if (value.source === "tools/result") return parseResultObservation(value, index);
  return invalid(`sourceObservations[${index}].source is not supported by M3-011`);
}

/**
 * Validate the evidence stream independently from expected output. In
 * particular, the validator never sorts by timestamp or derives the oracle from
 * the stimulus. It only enforces source facts that make one completed rc5 tool
 * batch unambiguous: unique requests, FIFO/model-order completion, exact
 * call/name correlation, one turn/step, and no missing completion.
 */
function validateOrderingGrammar(
  observations: readonly AdapterDshToolOrderingSourceObservation[],
): void {
  if (observations.length < 2) invalid("tool ordering requires at least one request/result pair");

  const requested = new Map<string, AdapterDshToolOrderingRequestObservation>();
  const completed = new Set<string>();
  const outstanding: AdapterDshToolOrderingRequestObservation[] = [];
  let batchTurn: number | undefined;
  let batchStep: number | undefined;
  let previousDurableSeq = -1;

  for (let index = 0; index < observations.length; index += 1) {
    const observation = observations[index]!;
    if (observation.source === "session/event") {
      if (observation.seq <= previousDurableSeq) {
        invalid("durable tool/call seq values must be strictly increasing in source order");
      }
      previousDurableSeq = observation.seq;

      if (batchTurn === undefined) {
        batchTurn = observation.data.turn;
        batchStep = observation.data.step;
      } else if (observation.data.turn !== batchTurn || observation.data.step !== batchStep) {
        invalid("all M3-011 tool/call observations must reference the same turn and step");
      }

      if (requested.has(observation.data.callId)) {
        invalid(`duplicate tool/call request for ${observation.data.callId}`);
      }
      requested.set(observation.data.callId, observation);
      outstanding.push(observation);
      continue;
    }

    const callRef = observation.execution.callId;
    if (completed.has(callRef)) invalid(`duplicate tools/result for ${callRef}`);
    const request = requested.get(callRef);
    if (request === undefined) invalid(`tools/result ${callRef} has no earlier tool/call request`);
    if (request.data.name !== observation.execution.name) {
      invalid(`tools/result ${callRef} tool name does not match its request`);
    }

    const expected = outstanding[0];
    if (expected === undefined) invalid(`tools/result ${callRef} has no outstanding request`);
    if (expected.data.callId !== callRef) {
      invalid(
        `tools/result ${callRef} is reordered; expected completion for ${expected.data.callId}`,
      );
    }
    outstanding.shift();
    completed.add(callRef);
  }

  if (requested.size === 0) invalid("tool ordering requires at least one tool/call request");
  if (outstanding.length !== 0) {
    invalid(`tool ordering is incomplete; missing result for ${outstanding[0]!.data.callId}`);
  }
}

function parseStimulus(value: unknown): AdapterDshToolOrderingStimulus {
  if (!isRecord(value)) invalid("fixture.stimulus must be an object");
  exactKeys(value, ["operation", "sessionRef", "sourceObservations"], "fixture.stimulus");
  if (value.operation !== ADAPTER_DSH_TOOL_ORDERING_OPERATION) {
    invalid("fixture.stimulus.operation is not M3-011 tool-ordering");
  }
  const sessionRef = nonEmptyString(value.sessionRef, "fixture.stimulus.sessionRef");
  if (!Array.isArray(value.sourceObservations)) {
    invalid("fixture.stimulus.sourceObservations must be an array");
  }
  const sourceObservations = value.sourceObservations.map(parseSourceObservation);
  validateOrderingGrammar(sourceObservations);
  return { operation: ADAPTER_DSH_TOOL_ORDERING_OPERATION, sessionRef, sourceObservations };
}

function parseObservable(value: unknown, index: number): AdapterDshToolOrderingObservable {
  if (!isRecord(value)) invalid(`expect.events[${index}] must be an object`);
  exactKeys(value, ["type", "callRef", "toolName"], `expect.events[${index}]`);
  const type = value.type;
  if (type !== "tool.requested" && type !== "tool.completed") {
    invalid(`expect.events[${index}].type is not an M3-011 observable`);
  }
  return {
    type,
    callRef: nonEmptyString(value.callRef, `expect.events[${index}].callRef`),
    toolName: nonEmptyString(value.toolName, `expect.events[${index}].toolName`),
  };
}

function parseExpectation(
  value: unknown,
  sourceCount: number,
): AdapterDshToolOrderingExpectation {
  if (!isRecord(value)) invalid("fixture.expect must be an object");
  exactKeys(value, ["kind", "events"], "fixture.expect");
  if (value.kind !== "EVENTS") invalid("fixture.expect.kind must be EVENTS");
  if (!Array.isArray(value.events)) invalid("fixture.expect.events must be an array");
  if (value.events.length !== sourceCount) {
    invalid("M3-011 expects exactly one portable ordering event per source observation");
  }
  return { kind: "EVENTS", events: value.events.map(parseObservable) };
}

export function parseAdapterDshToolOrderingFixture(value: unknown): AdapterDshToolOrderingFixture {
  const envelope = parseEnvelope(value);
  const stimulus = parseStimulus(envelope.stimulus);
  const expect = parseExpectation(envelope.expect, stimulus.sourceObservations.length);
  return { envelope, stimulus, expect };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Execute the already-validated source sequence without adding scheduler or
 * timestamp semantics. Every source fact has one explicit portable projection;
 * an implementation exception is infrastructure ERROR, while any missing,
 * extra, reordered, or differently correlated observable is an ordinary TCK
 * FAIL against the independent fixture oracle.
 */
export async function runAdapterDshToolOrderingFixture(
  fixture: AdapterDshToolOrderingFixture,
  project: (
    sessionRef: string,
    observation: AdapterDshToolOrderingSourceObservation,
  ) => AdapterDshToolOrderingProjection | Promise<AdapterDshToolOrderingProjection>,
): Promise<AdapterDshToolOrderingCaseResult> {
  const observed: AdapterDshToolOrderingObservable[] = [];
  for (const observation of fixture.stimulus.sourceObservations) {
    let projection: AdapterDshToolOrderingProjection;
    try {
      projection = await project(fixture.stimulus.sessionRef, observation);
    } catch {
      return { status: "ERROR", code: "ADAPTER_DSH_TOOL_ORDERING_IMPLEMENTATION_ERROR" };
    }
    if (projection.kind !== "EVENT") {
      return { status: "ERROR", code: "ADAPTER_DSH_TOOL_ORDERING_IMPLEMENTATION_ERROR" };
    }
    observed.push(projection.event);
  }

  return stableJson(observed) === stableJson(fixture.expect.events)
    ? { status: "PASS" }
    : { status: "FAIL", code: "ADAPTER_DSH_TOOL_ORDERING_EVENTS_MISMATCH" };
}
