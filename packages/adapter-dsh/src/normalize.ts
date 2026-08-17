import type {
  RuntimeEvent,
  ToolCompletedEvent,
  ToolOutcome,
} from "./runtime-events.js";

export interface HarnessDurableEventSnapshot {
  readonly type: "turn/start" | "turn/end" | "step/start" | "tool/call";
  readonly seq: number;
  readonly time: number;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface HarnessToolExecutionSnapshot {
  readonly callId: string;
  readonly name: string;
  readonly arguments: unknown;
}

export interface HarnessToolResultSnapshot {
  readonly isError: boolean;
  readonly error?: {
    readonly info?: {
      readonly code?: string;
    };
  };
}

export type Digest = (value: unknown) => string;

function eventRef(sessionRef: string, seq: number): string {
  return `${sessionRef}/seq:${seq}`;
}

function observedAt(time: number): string {
  return new Date(time).toISOString();
}

function requiredNumber(
  data: Readonly<Record<string, unknown>>,
  key: string,
): number {
  const value = data[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`INVALID_HARNESS_EVENT: ${key}`);
  }
  return value;
}

function requiredString(
  data: Readonly<Record<string, unknown>>,
  key: string,
): string {
  const value = data[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`INVALID_HARNESS_EVENT: ${key}`);
  }
  return value;
}

function normalizeTurnEndStatus(
  reason: unknown,
): "completed" | "failed" | "blocked" | "cancelled" {
  if (typeof reason !== "object" || reason === null || !("kind" in reason)) {
    throw new Error("INVALID_HARNESS_EVENT: reason");
  }
  const kind = (reason as { readonly kind?: unknown }).kind;
  switch (kind) {
    case "completed":
      return "completed";
    case "aborted":
      return "cancelled";
    case "blocked":
      return "blocked";
    case "error":
    case "max-tokens":
    case "interrupted":
      return "failed";
    default:
      throw new Error(`UNSUPPORTED_HARNESS_TURN_END_REASON: ${String(kind)}`);
  }
}

/**
 * Normalize only durable facts whose semantics are sufficient in isolation.
 * Durable `tool/result` is intentionally excluded here: the authoritative live
 * `tools/result` boundary owns final execution classification, while the
 * durable event is retained as a replay/evidence anchor.
 */
export function normalizeDurableEvent(
  sessionRef: string,
  event: HarnessDurableEventSnapshot,
  digest: Digest,
): RuntimeEvent {
  const base = {
    eventRef: eventRef(sessionRef, event.seq),
    sessionRef,
    observedAt: observedAt(event.time),
  } as const;

  switch (event.type) {
    case "turn/start": {
      const turn = requiredNumber(event.data, "turn");
      return {
        ...base,
        type: "turn.started",
        turnRef: `${sessionRef}/turn:${turn}`,
      };
    }
    case "step/start": {
      const turn = requiredNumber(event.data, "turn");
      const step = requiredNumber(event.data, "step");
      return {
        ...base,
        type: "step.started",
        turnRef: `${sessionRef}/turn:${turn}`,
        stepRef: `${sessionRef}/turn:${turn}/step:${step}`,
      };
    }
    case "tool/call": {
      const turn = requiredNumber(event.data, "turn");
      const step = requiredNumber(event.data, "step");
      const callId = requiredString(event.data, "callId");
      const name = requiredString(event.data, "name");
      const rawArguments = requiredString(event.data, "arguments");
      return {
        ...base,
        type: "tool.requested",
        turnRef: `${sessionRef}/turn:${turn}`,
        stepRef: `${sessionRef}/turn:${turn}/step:${step}`,
        callRef: callId,
        toolName: name,
        argumentsDigest: digest(rawArguments),
      };
    }
    case "turn/end": {
      const turn = requiredNumber(event.data, "turn");
      return {
        ...base,
        type: "turn.ended",
        turnRef: `${sessionRef}/turn:${turn}`,
        status: normalizeTurnEndStatus(event.data.reason),
      };
    }
  }
}

export function normalizeFinalToolResult(
  sessionRef: string,
  execution: HarnessToolExecutionSnapshot,
  result: HarnessToolResultSnapshot,
  resultDigest: string,
  nowIso: string,
): ToolCompletedEvent {
  let outcome: ToolOutcome = result.isError ? "error" : "success";
  const errorCode = result.error?.info?.code;

  if (result.isError && errorCode !== undefined) {
    if (errorCode.includes("DENIED") || errorCode.includes("REJECT")) {
      outcome = "denied";
    } else if (errorCode.includes("ABORT")) {
      outcome = "cancelled";
    }
  }

  return {
    type: "tool.completed",
    eventRef: `${sessionRef}/live-tool-result:${execution.callId}`,
    sessionRef,
    observedAt: nowIso,
    callRef: execution.callId,
    toolName: execution.name,
    outcome,
    resultDigest,
    ...(errorCode === undefined ? {} : { errorCode }),
  };
}
