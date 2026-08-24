import type { TckJsonValue } from "./tck-contract.js";

export const TCK_FAKE_TOOL_OUTCOME_KINDS = ["RESULT", "ERROR", "DENIED"] as const;

export type FakeToolOutcomeKind = (typeof TCK_FAKE_TOOL_OUTCOME_KINDS)[number];

export type FakeToolOutcome =
  | { readonly kind: "RESULT"; readonly result: TckJsonValue }
  | { readonly kind: "ERROR"; readonly errorCode: string }
  | { readonly kind: "DENIED"; readonly errorCode: string };

export interface FakeToolRequest {
  readonly callRef: string;
  readonly toolName: string;
  readonly arguments: TckJsonValue;
}

export type FakeToolTraceEntry =
  | {
      readonly sequence: number;
      readonly callOrdinal: number;
      readonly phase: "REQUESTED";
      readonly request: Readonly<FakeToolRequest>;
    }
  | {
      readonly sequence: number;
      readonly callOrdinal: number;
      readonly phase: "BODY_ENTERED";
      readonly callRef: string;
    }
  | {
      readonly sequence: number;
      readonly callOrdinal: number;
      readonly phase: "OUTCOME";
      readonly callRef: string;
      readonly outcome: FakeToolOutcome;
    };

export const FAKE_TOOL_ERROR_CODES = [
  "FAKE_TOOL_INVALID_SCRIPT",
  "FAKE_TOOL_INVALID_REQUEST",
  "FAKE_TOOL_SCRIPT_EXHAUSTED",
] as const;

export type FakeToolErrorCode = (typeof FAKE_TOOL_ERROR_CODES)[number];

export class FakeToolRuntimeError extends Error {
  readonly code: FakeToolErrorCode;

  constructor(code: FakeToolErrorCode, message: string) {
    super(message);
    this.name = "FakeToolRuntimeError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is TckJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  if (isRecord(value)) {
    return Object.values(value).every(isJsonValue);
  }
  return false;
}

function cloneJson(value: TckJsonValue): TckJsonValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(cloneJson));
  }
  if (value !== null && typeof value === "object") {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneJson(entry)]),
    ));
  }
  return value;
}

function requireNonEmptyString(value: unknown, label: string, code: FakeToolErrorCode): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FakeToolRuntimeError(code, `${label} must be a non-empty string`);
  }
  return value;
}

function validateExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
  code: FakeToolErrorCode,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new FakeToolRuntimeError(code, `${label} contains unsupported fields`);
  }
}

function parseOutcome(value: unknown, index: number): FakeToolOutcome {
  if (!isRecord(value)) {
    throw new FakeToolRuntimeError("FAKE_TOOL_INVALID_SCRIPT", `tool script entry ${index} must be an object`);
  }
  if (value.kind === "RESULT") {
    validateExactKeys(value, ["kind", "result"], `tool script entry ${index}`, "FAKE_TOOL_INVALID_SCRIPT");
    if (!isJsonValue(value.result)) {
      throw new FakeToolRuntimeError("FAKE_TOOL_INVALID_SCRIPT", `tool script entry ${index} result must be JSON`);
    }
    return Object.freeze({ kind: "RESULT", result: cloneJson(value.result) });
  }
  if (value.kind === "ERROR" || value.kind === "DENIED") {
    validateExactKeys(value, ["errorCode", "kind"], `tool script entry ${index}`, "FAKE_TOOL_INVALID_SCRIPT");
    return Object.freeze({
      kind: value.kind,
      errorCode: requireNonEmptyString(value.errorCode, `tool script entry ${index} errorCode`, "FAKE_TOOL_INVALID_SCRIPT"),
    });
  }
  throw new FakeToolRuntimeError("FAKE_TOOL_INVALID_SCRIPT", `tool script entry ${index} has unsupported kind`);
}

function parseRequest(value: unknown): Readonly<FakeToolRequest> {
  if (!isRecord(value)) {
    throw new FakeToolRuntimeError("FAKE_TOOL_INVALID_REQUEST", "tool request must be an object");
  }
  validateExactKeys(value, ["arguments", "callRef", "toolName"], "tool request", "FAKE_TOOL_INVALID_REQUEST");
  if (!isJsonValue(value.arguments)) {
    throw new FakeToolRuntimeError("FAKE_TOOL_INVALID_REQUEST", "tool request arguments must be JSON");
  }
  return Object.freeze({
    callRef: requireNonEmptyString(value.callRef, "callRef", "FAKE_TOOL_INVALID_REQUEST"),
    toolName: requireNonEmptyString(value.toolName, "toolName", "FAKE_TOOL_INVALID_REQUEST"),
    arguments: cloneJson(value.arguments),
  });
}

function cloneOutcome(outcome: FakeToolOutcome): FakeToolOutcome {
  if (outcome.kind === "RESULT") {
    return Object.freeze({ kind: "RESULT", result: cloneJson(outcome.result) });
  }
  return Object.freeze({ kind: outcome.kind, errorCode: outcome.errorCode });
}

function cloneRequest(request: Readonly<FakeToolRequest>): Readonly<FakeToolRequest> {
  return Object.freeze({
    callRef: request.callRef,
    toolName: request.toolName,
    arguments: cloneJson(request.arguments),
  });
}

/** TypeScript projection of Spec 0006. Deterministic test infrastructure only. */
export class FakeToolRuntime {
  readonly #script: readonly FakeToolOutcome[];
  readonly #trace: FakeToolTraceEntry[] = [];
  #cursor = 0;

  constructor(script: readonly unknown[]) {
    this.#script = Object.freeze(script.map(parseOutcome));
  }

  invoke(requestValue: unknown): FakeToolOutcome {
    const request = parseRequest(requestValue);
    const scripted = this.#script[this.#cursor];
    if (scripted === undefined) {
      throw new FakeToolRuntimeError("FAKE_TOOL_SCRIPT_EXHAUSTED", "tool script is exhausted");
    }

    const callOrdinal = this.#cursor + 1;
    this.#trace.push(Object.freeze({
      sequence: this.#trace.length + 1,
      callOrdinal,
      phase: "REQUESTED",
      request,
    }));

    if (scripted.kind !== "DENIED") {
      this.#trace.push(Object.freeze({
        sequence: this.#trace.length + 1,
        callOrdinal,
        phase: "BODY_ENTERED",
        callRef: request.callRef,
      }));
    }

    const outcome = cloneOutcome(scripted);
    this.#trace.push(Object.freeze({
      sequence: this.#trace.length + 1,
      callOrdinal,
      phase: "OUTCOME",
      callRef: request.callRef,
      outcome,
    }));
    this.#cursor += 1;
    return cloneOutcome(outcome);
  }

  trace(): readonly FakeToolTraceEntry[] {
    return this.#trace.map(entry => {
      if (entry.phase === "REQUESTED") {
        return Object.freeze({ ...entry, request: cloneRequest(entry.request) });
      }
      if (entry.phase === "OUTCOME") {
        return Object.freeze({ ...entry, outcome: cloneOutcome(entry.outcome) });
      }
      return Object.freeze({ ...entry });
    });
  }

  remaining(): number {
    return this.#script.length - this.#cursor;
  }
}
