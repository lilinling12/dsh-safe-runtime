import type { TckFixtureV1Alpha1, TckJsonValue } from "./tck-contract.js";

export const ADAPTER_DSH_TURN_LIFECYCLE_OPERATION = "turn-lifecycle" as const;
export const ADAPTER_DSH_TURN_LIFECYCLE_ERROR_CODES = [
  "INVALID_ADAPTER_DSH_TURN_LIFECYCLE_FIXTURE",
] as const;

export type AdapterDshTurnLifecycleErrorCode =
  (typeof ADAPTER_DSH_TURN_LIFECYCLE_ERROR_CODES)[number];

export type AdapterDshTurnLifecycleSourceEvent =
  | {
      readonly type: "turn/start";
      readonly seq: number;
      readonly time: number;
      readonly data: { readonly turn: number };
    }
  | {
      readonly type: "step/start" | "step/end";
      readonly seq: number;
      readonly time: number;
      readonly data: { readonly turn: number; readonly step: number };
    }
  | {
      readonly type: "turn/end";
      readonly seq: number;
      readonly time: number;
      readonly data: {
        readonly turn: number;
        readonly reason: Readonly<Record<string, TckJsonValue>> & { readonly kind: string };
      };
    };

export type AdapterDshTurnLifecycleObservable =
  | { readonly type: "turn.started"; readonly turnRef: string }
  | {
      readonly type: "step.started";
      readonly turnRef: string;
      readonly stepRef: string;
    }
  | {
      readonly type: "turn.ended";
      readonly turnRef: string;
      readonly status: "completed" | "failed" | "blocked" | "cancelled";
    };

export type AdapterDshTurnLifecycleProjection =
  | { readonly kind: "EVENT"; readonly event: AdapterDshTurnLifecycleObservable }
  | { readonly kind: "NO_EVENT" }
  | { readonly kind: "ERROR"; readonly code: string };

export interface AdapterDshTurnLifecycleStimulus {
  readonly operation: typeof ADAPTER_DSH_TURN_LIFECYCLE_OPERATION;
  readonly sessionRef: string;
  readonly sourceEvents: readonly AdapterDshTurnLifecycleSourceEvent[];
}

export type AdapterDshTurnLifecycleExpectation =
  | {
      readonly kind: "EVENTS";
      readonly events: readonly AdapterDshTurnLifecycleObservable[];
    }
  | {
      readonly kind: "ERROR";
      readonly code: "UNSUPPORTED_HARNESS_TURN_END_REASON";
      readonly atOrdinal: number;
    };

export interface AdapterDshTurnLifecycleFixture {
  readonly envelope: TckFixtureV1Alpha1;
  readonly stimulus: AdapterDshTurnLifecycleStimulus;
  readonly expect: AdapterDshTurnLifecycleExpectation;
}

export type AdapterDshTurnLifecycleCaseResult =
  | { readonly status: "PASS" }
  | { readonly status: "FAIL"; readonly code: string }
  | { readonly status: "ERROR"; readonly code: string };

export class AdapterDshTurnLifecycleFixtureError extends Error {
  readonly code: AdapterDshTurnLifecycleErrorCode;

  constructor(message: string) {
    super(message);
    this.name = "AdapterDshTurnLifecycleFixtureError";
    this.code = "INVALID_ADAPTER_DSH_TURN_LIFECYCLE_FIXTURE";
  }
}

function invalid(message: string): never {
  throw new AdapterDshTurnLifecycleFixtureError(message);
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
 * Direct TypeScript callers can bypass JSON.parse, so profile validation must
 * reject values that cannot exist in the language-independent fixture format.
 * This keeps the TypeScript projection from gaining aliases or host-object
 * semantics that another TCK implementation could never reproduce.
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
    if (Object.keys(value).some((key) => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) {
      invalid(`${label} must contain dense JSON arrays without named properties`);
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
  exactKeys(json, ["apiVersion", "id", "profile", "description", "determinism", "stimulus", "expect"], "fixture");
  if (json.apiVersion !== "safe-runtime.dev/tck-fixture/v1alpha1") invalid("fixture apiVersion is unsupported");
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

function parseReason(value: unknown): Readonly<Record<string, TckJsonValue>> & { readonly kind: string } {
  const json = portableJson(value, "turn/end.data.reason");
  if (!isRecord(json)) invalid("turn/end.data.reason must be an object");
  nonEmptyString(json.kind, "turn/end.data.reason.kind");
  return json as Readonly<Record<string, TckJsonValue>> & { readonly kind: string };
}

function parseSourceEvent(value: unknown, index: number): AdapterDshTurnLifecycleSourceEvent {
  if (!isRecord(value)) invalid(`sourceEvents[${index}] must be an object`);
  exactKeys(value, ["type", "seq", "time", "data"], `sourceEvents[${index}]`);
  const type = nonEmptyString(value.type, `sourceEvents[${index}].type`);
  const seq = nonNegativeSafeInteger(value.seq, `sourceEvents[${index}].seq`);
  const time = nonNegativeSafeInteger(value.time, `sourceEvents[${index}].time`);
  if (!isRecord(value.data)) invalid(`sourceEvents[${index}].data must be an object`);

  switch (type) {
    case "turn/start": {
      exactKeys(value.data, ["turn"], `sourceEvents[${index}].data`);
      return { type, seq, time, data: { turn: nonNegativeSafeInteger(value.data.turn, `sourceEvents[${index}].data.turn`) } };
    }
    case "step/start":
    case "step/end": {
      exactKeys(value.data, ["turn", "step"], `sourceEvents[${index}].data`);
      return {
        type,
        seq,
        time,
        data: {
          turn: nonNegativeSafeInteger(value.data.turn, `sourceEvents[${index}].data.turn`),
          step: nonNegativeSafeInteger(value.data.step, `sourceEvents[${index}].data.step`),
        },
      };
    }
    case "turn/end": {
      exactKeys(value.data, ["turn", "reason"], `sourceEvents[${index}].data`);
      return {
        type,
        seq,
        time,
        data: {
          turn: nonNegativeSafeInteger(value.data.turn, `sourceEvents[${index}].data.turn`),
          reason: parseReason(value.data.reason),
        },
      };
    }
    default:
      return invalid(`sourceEvents[${index}].type is not supported by M3-010`);
  }
}

function validateLifecycleGrammar(events: readonly AdapterDshTurnLifecycleSourceEvent[]): void {
  if (events.length < 2) invalid("turn lifecycle requires turn/start and turn/end");
  const first = events[0];
  const last = events[events.length - 1];
  if (first?.type !== "turn/start") invalid("first source event must be turn/start");
  if (last?.type !== "turn/end") invalid("last source event must be turn/end");
  const turn = first.data.turn;
  let previousSeq = -1;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    if (event.seq <= previousSeq) invalid("source event seq values must be strictly increasing");
    previousSeq = event.seq;
    if (event.data.turn !== turn) invalid("all source events in M3-010 must reference the same turn");
    if (index > 0 && index < events.length - 1) {
      if (event.type !== "step/start") invalid("interior lifecycle evidence must begin with step/start");
      const end = events[index + 1];
      if (end?.type !== "step/end" || end.data.step !== event.data.step || end.data.turn !== event.data.turn) {
        invalid("each step/start must be immediately paired with a matching step/end");
      }
      index += 1;
      previousSeq = end.seq;
      if (index < events.length - 1 && end.seq <= event.seq) invalid("source event seq values must be strictly increasing");
    }
  }
}

function parseStimulus(value: unknown): AdapterDshTurnLifecycleStimulus {
  if (!isRecord(value)) invalid("fixture.stimulus must be an object");
  exactKeys(value, ["operation", "sessionRef", "sourceEvents"], "fixture.stimulus");
  if (value.operation !== ADAPTER_DSH_TURN_LIFECYCLE_OPERATION) invalid("fixture.stimulus.operation is not M3-010 turn-lifecycle");
  const sessionRef = nonEmptyString(value.sessionRef, "fixture.stimulus.sessionRef");
  if (!Array.isArray(value.sourceEvents)) invalid("fixture.stimulus.sourceEvents must be an array");
  const sourceEvents = value.sourceEvents.map(parseSourceEvent);
  validateLifecycleGrammar(sourceEvents);
  return { operation: ADAPTER_DSH_TURN_LIFECYCLE_OPERATION, sessionRef, sourceEvents };
}

function parseObservable(value: unknown, index: number): AdapterDshTurnLifecycleObservable {
  if (!isRecord(value)) invalid(`expect.events[${index}] must be an object`);
  const type = nonEmptyString(value.type, `expect.events[${index}].type`);
  switch (type) {
    case "turn.started":
      exactKeys(value, ["type", "turnRef"], `expect.events[${index}]`);
      return { type, turnRef: nonEmptyString(value.turnRef, `expect.events[${index}].turnRef`) };
    case "step.started":
      exactKeys(value, ["type", "turnRef", "stepRef"], `expect.events[${index}]`);
      return {
        type,
        turnRef: nonEmptyString(value.turnRef, `expect.events[${index}].turnRef`),
        stepRef: nonEmptyString(value.stepRef, `expect.events[${index}].stepRef`),
      };
    case "turn.ended": {
      exactKeys(value, ["type", "turnRef", "status"], `expect.events[${index}]`);
      const status = value.status;
      if (status !== "completed" && status !== "failed" && status !== "blocked" && status !== "cancelled") {
        invalid(`expect.events[${index}].status is unsupported`);
      }
      return { type, turnRef: nonEmptyString(value.turnRef, `expect.events[${index}].turnRef`), status };
    }
    default:
      return invalid(`expect.events[${index}].type is not an M3-010 observable`);
  }
}

function parseExpectation(value: unknown, sourceCount: number): AdapterDshTurnLifecycleExpectation {
  if (!isRecord(value)) invalid("fixture.expect must be an object");
  if (value.kind === "EVENTS") {
    exactKeys(value, ["kind", "events"], "fixture.expect");
    if (!Array.isArray(value.events)) invalid("fixture.expect.events must be an array");
    return { kind: "EVENTS", events: value.events.map(parseObservable) };
  }
  if (value.kind === "ERROR") {
    exactKeys(value, ["kind", "code", "atOrdinal"], "fixture.expect");
    if (value.code !== "UNSUPPORTED_HARNESS_TURN_END_REASON") {
      invalid("M3-010 ERROR expectation supports only UNSUPPORTED_HARNESS_TURN_END_REASON");
    }
    const atOrdinal = positiveSafeInteger(value.atOrdinal, "fixture.expect.atOrdinal");
    if (atOrdinal !== sourceCount) invalid("M3-010 expected adapter error must occur at the final turn/end source event");
    return { kind: "ERROR", code: value.code, atOrdinal };
  }
  return invalid("fixture.expect.kind must be EVENTS or ERROR");
}

export function parseAdapterDshTurnLifecycleFixture(value: unknown): AdapterDshTurnLifecycleFixture {
  const envelope = parseEnvelope(value);
  const stimulus = parseStimulus(envelope.stimulus);
  const expect = parseExpectation(envelope.expect, stimulus.sourceEvents.length);
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
 * The profile evaluator asks an implementation to project each source fact one
 * at a time. `NO_EVENT` is explicit so a runner cannot accidentally treat an
 * omitted callback result as permission to synthesize or ignore lifecycle
 * evidence. Adapter exceptions are infrastructure errors unless deliberately
 * translated to the stable profile ERROR result.
 */
export async function runAdapterDshTurnLifecycleFixture(
  fixture: AdapterDshTurnLifecycleFixture,
  project: (
    sessionRef: string,
    event: AdapterDshTurnLifecycleSourceEvent,
  ) => AdapterDshTurnLifecycleProjection | Promise<AdapterDshTurnLifecycleProjection>,
): Promise<AdapterDshTurnLifecycleCaseResult> {
  const observed: AdapterDshTurnLifecycleObservable[] = [];
  for (let index = 0; index < fixture.stimulus.sourceEvents.length; index += 1) {
    const event = fixture.stimulus.sourceEvents[index]!;
    let projection: AdapterDshTurnLifecycleProjection;
    try {
      projection = await project(fixture.stimulus.sessionRef, event);
    } catch {
      return { status: "ERROR", code: "ADAPTER_DSH_TURN_LIFECYCLE_IMPLEMENTATION_ERROR" };
    }

    if (projection.kind === "EVENT") {
      if (fixture.expect.kind === "ERROR") {
        continue;
      }
      observed.push(projection.event);
      continue;
    }
    if (projection.kind === "NO_EVENT") continue;

    const ordinal = index + 1;
    if (fixture.expect.kind === "ERROR"
      && projection.code === fixture.expect.code
      && ordinal === fixture.expect.atOrdinal) {
      return { status: "PASS" };
    }
    return { status: "FAIL", code: "UNEXPECTED_ADAPTER_DSH_TURN_LIFECYCLE_ERROR" };
  }

  if (fixture.expect.kind === "ERROR") {
    return { status: "FAIL", code: "EXPECTED_ADAPTER_DSH_TURN_LIFECYCLE_ERROR_NOT_OBSERVED" };
  }
  return stableJson(observed) === stableJson(fixture.expect.events)
    ? { status: "PASS" }
    : { status: "FAIL", code: "ADAPTER_DSH_TURN_LIFECYCLE_EVENTS_MISMATCH" };
}
