import { computeAuditDigest } from "./audit-digest.js";
import {
  DSH_AUDIT_PROFILE,
  type AuditDiagnosticCode,
  type AuditProjectionResult,
  type DshAuditEvent,
} from "./audit-events.js";

export interface AuditFinalToolClassification {
  readonly policyDenied?: true;
  readonly policyCancelled?: true;
}

type ProjectionCode = Exclude<AuditDiagnosticCode, "AUDIT_SINK_FAILED">;

const FAILURES: Readonly<Record<ProjectionCode, object>> = Object.freeze({
  AUDIT_INPUT_INVALID: Object.freeze({}),
  AUDIT_INPUT_UNSUPPORTED: Object.freeze({}),
  AUDIT_LIMIT_EXCEEDED: Object.freeze({}),
  AUDIT_DIGEST_FAILED: Object.freeze({}),
});

function fail(code: ProjectionCode): never {
  throw FAILURES[code];
}

function rejection(error: unknown): AuditProjectionResult {
  for (const code of Object.keys(FAILURES) as ProjectionCode[]) {
    if (error === FAILURES[code]) return Object.freeze({ kind: "rejected", code });
  }
  return Object.freeze({ kind: "rejected", code: "AUDIT_INPUT_UNSUPPORTED" });
}

function digest(domain: string, value: unknown): string {
  const result = computeAuditDigest(domain, value);
  if (result.kind === "rejected") fail(result.code);
  return result.value;
}

function dataObject(value: unknown): object {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail("AUDIT_INPUT_INVALID");
  }
  let prototype: unknown;
  try {
    prototype = Object.getPrototypeOf(value);
  } catch {
    return fail("AUDIT_INPUT_UNSUPPORTED");
  }
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("AUDIT_INPUT_UNSUPPORTED");
  }
  return value;
}

function ownData(object: object, key: string): unknown {
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(object, key);
  } catch {
    return fail("AUDIT_INPUT_UNSUPPORTED");
  }
  if (descriptor === undefined) return undefined;
  if (!("value" in descriptor) || !descriptor.enumerable) {
    return fail("AUDIT_INPUT_UNSUPPORTED");
  }
  return descriptor.value;
}

function requiredData(object: object, key: string): unknown {
  const value = ownData(object, key);
  if (value === undefined) return fail("AUDIT_INPUT_INVALID");
  return value;
}

function stringValue(value: unknown): string {
  if (typeof value !== "string") return fail("AUDIT_INPUT_INVALID");
  return value;
}

function requiredRef(value: unknown): string {
  const ref = stringValue(value);
  if (ref.length === 0) return fail("AUDIT_INPUT_INVALID");
  return ref;
}

function optionalRef(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return requiredRef(value);
}

function nonNegativeInteger(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) return fail("AUDIT_INPUT_INVALID");
  return value as number;
}

function observedAtFromEpoch(value: unknown): string {
  if (!Number.isSafeInteger(value)) return fail("AUDIT_INPUT_INVALID");
  const date = new Date(value as number);
  if (Number.isNaN(date.getTime())) return fail("AUDIT_INPUT_INVALID");
  return date.toISOString();
}

function observedAtFromClock(value: unknown): string {
  if (typeof value !== "string") return fail("AUDIT_INPUT_INVALID");
  const epoch = Date.parse(value);
  if (!Number.isFinite(epoch)) return fail("AUDIT_INPUT_INVALID");
  return new Date(epoch).toISOString();
}

function identity(domain: "event" | "session" | "turn" | "step" | "call" | "approval", sessionRef: string, ref?: string): string {
  return domain === "session"
    ? digest("identity/session", sessionRef)
    : digest(`identity/${domain}`, [sessionRef, requiredRef(ref)]);
}

function base(sessionRefValue: unknown, eventRefValue: unknown, observedAt: string) {
  const sessionRef = requiredRef(sessionRefValue);
  const eventRef = requiredRef(eventRefValue);
  return {
    sessionRef,
    common: {
      profile: DSH_AUDIT_PROFILE,
      eventKey: identity("event", sessionRef, eventRef),
      sessionKey: identity("session", sessionRef),
      observedAt,
    },
  } as const;
}

function freezeEvent(event: DshAuditEvent): AuditProjectionResult {
  return Object.freeze({ kind: "event", event: Object.freeze(event) });
}

function turnRef(sessionRef: string, turn: number): string {
  return `${sessionRef}/turn:${turn}`;
}

function stepRef(sessionRef: string, turn: number, step: number): string {
  return `${sessionRef}/turn:${turn}/step:${step}`;
}

function turnEndStatus(reasonValue: unknown): "completed" | "failed" | "blocked" | "cancelled" {
  const reason = dataObject(reasonValue);
  const kind = requiredData(reason, "kind");
  switch (kind) {
    case "completed": return "completed";
    case "aborted": return "cancelled";
    case "blocked": return "blocked";
    case "error":
    case "max-tokens":
    case "interrupted": return "failed";
    default: return fail("AUDIT_INPUT_INVALID");
  }
}

function approvalOutcome(value: unknown): "ALLOWED_ONCE" | "REJECTED" | "CANCELLED" | "UNAVAILABLE" {
  switch (value) {
    case "allowed-once": return "ALLOWED_ONCE";
    case "rejected": return "REJECTED";
    case "cancelled": return "CANCELLED";
    case "unavailable": return "UNAVAILABLE";
    default: return fail("AUDIT_INPUT_INVALID");
  }
}

function finalOutcome(
  isError: boolean,
  errorCode: string | undefined,
  classification: AuditFinalToolClassification,
): "success" | "error" | "denied" | "cancelled" {
  if (classification.policyDenied === true && classification.policyCancelled === true) {
    return fail("AUDIT_INPUT_INVALID");
  }
  if (!isError) {
    if (classification.policyDenied === true || classification.policyCancelled === true) {
      return fail("AUDIT_INPUT_INVALID");
    }
    return "success";
  }
  if (classification.policyCancelled === true) return "cancelled";
  if (classification.policyDenied === true) return "denied";
  return errorCode === "ABORTED" || errorCode === "ABORTED_BEFORE_DISPATCH"
    ? "cancelled"
    : "error";
}

function optionalErrorCode(result: object, isError: boolean): string | undefined {
  if (!isError) return undefined;
  const errorValue = ownData(result, "error");
  if (errorValue === undefined) return undefined;
  const error = dataObject(errorValue);
  const infoValue = ownData(error, "info");
  if (infoValue === undefined) return undefined;
  const info = dataObject(infoValue);
  const code = ownData(info, "code");
  if (code === undefined) return undefined;
  return stringValue(code);
}

export function projectAuditSessionStarted(
  sessionRef: unknown,
  eventRef: unknown,
  observedAtValue: unknown,
  source: unknown,
): AuditProjectionResult {
  try {
    if (source !== "startup" && source !== "resume" && source !== "clear" && source !== "compact") {
      return fail("AUDIT_INPUT_INVALID");
    }
    const { common } = base(sessionRef, eventRef, observedAtFromClock(observedAtValue));
    return freezeEvent({ ...common, type: "session.started", source });
  } catch (error: unknown) {
    return rejection(error);
  }
}

export function projectAuditDurableEvent(
  sessionRefValue: unknown,
  eventValue: unknown,
): AuditProjectionResult {
  try {
    const sessionRef = requiredRef(sessionRefValue);
    const event = dataObject(eventValue);
    const type = requiredData(event, "type");
    const seq = nonNegativeInteger(requiredData(event, "seq"));
    const eventRef = `${sessionRef}/seq:${seq}`;
    const { common } = base(
      sessionRef,
      eventRef,
      observedAtFromEpoch(requiredData(event, "time")),
    );
    const data = dataObject(requiredData(event, "data"));
    switch (type) {
      case "turn/start": {
        const turn = nonNegativeInteger(requiredData(data, "turn"));
        return freezeEvent({
          ...common,
          type: "turn.started",
          turnKey: identity("turn", sessionRef, turnRef(sessionRef, turn)),
        });
      }
      case "step/start": {
        const turn = nonNegativeInteger(requiredData(data, "turn"));
        const step = nonNegativeInteger(requiredData(data, "step"));
        return freezeEvent({
          ...common,
          type: "step.started",
          turnKey: identity("turn", sessionRef, turnRef(sessionRef, turn)),
          stepKey: identity("step", sessionRef, stepRef(sessionRef, turn, step)),
        });
      }
      case "tool/call": {
        const turn = nonNegativeInteger(requiredData(data, "turn"));
        const step = nonNegativeInteger(requiredData(data, "step"));
        const callRef = requiredRef(requiredData(data, "callId"));
        const toolName = stringValue(requiredData(data, "name"));
        const rawArguments = stringValue(requiredData(data, "arguments"));
        const rootCallRef = optionalRef(ownData(data, "rootCallId"));
        return freezeEvent({
          ...common,
          type: "tool.requested",
          turnKey: identity("turn", sessionRef, turnRef(sessionRef, turn)),
          stepKey: identity("step", sessionRef, stepRef(sessionRef, turn, step)),
          callKey: identity("call", sessionRef, callRef),
          toolNameDigest: digest("metadata/tool-name", toolName),
          argumentsDigest: digest("arguments/raw-string", rawArguments),
          ...(rootCallRef === undefined
            ? {}
            : { rootCallKey: identity("call", sessionRef, rootCallRef) }),
        });
      }
      case "turn/end": {
        const turn = nonNegativeInteger(requiredData(data, "turn"));
        return freezeEvent({
          ...common,
          type: "turn.ended",
          turnKey: identity("turn", sessionRef, turnRef(sessionRef, turn)),
          status: turnEndStatus(requiredData(data, "reason")),
        });
      }
      default:
        return fail("AUDIT_INPUT_INVALID");
    }
  } catch (error: unknown) {
    return rejection(error);
  }
}

export function projectAuditApprovalDecided(
  sessionRefValue: unknown,
  eventSeq: unknown,
  observedAtEpoch: unknown,
  approvalRefValue: unknown,
  callRefValue: unknown,
  outcomeValue: unknown,
): AuditProjectionResult {
  try {
    const sessionRef = requiredRef(sessionRefValue);
    const seq = nonNegativeInteger(eventSeq);
    const approvalRef = requiredRef(approvalRefValue);
    const callRef = optionalRef(callRefValue);
    const { common } = base(
      sessionRef,
      `${sessionRef}/seq:${seq}`,
      observedAtFromEpoch(observedAtEpoch),
    );
    return freezeEvent({
      ...common,
      type: "approval.decided",
      approvalKey: identity("approval", sessionRef, approvalRef),
      outcome: approvalOutcome(outcomeValue),
      ...(callRef === undefined ? {} : { callKey: identity("call", sessionRef, callRef) }),
    });
  } catch (error: unknown) {
    return rejection(error);
  }
}

export function projectAuditFinalToolResult(
  sessionRefValue: unknown,
  eventRef: unknown,
  observedAtValue: unknown,
  callRefValue: unknown,
  toolNameValue: unknown,
  resultValue: unknown,
  classification: AuditFinalToolClassification = {},
): AuditProjectionResult {
  try {
    const sessionRef = requiredRef(sessionRefValue);
    const callRef = requiredRef(callRefValue);
    const toolName = stringValue(toolNameValue);
    const result = dataObject(resultValue);
    const isErrorValue = requiredData(result, "isError");
    if (typeof isErrorValue !== "boolean") return fail("AUDIT_INPUT_INVALID");
    const errorCode = optionalErrorCode(result, isErrorValue);
    const { common } = base(sessionRef, eventRef, observedAtFromClock(observedAtValue));
    return freezeEvent({
      ...common,
      type: "tool.completed",
      callKey: identity("call", sessionRef, callRef),
      toolNameDigest: digest("metadata/tool-name", toolName),
      resultDigest: digest("result/final-json", resultValue),
      outcome: finalOutcome(isErrorValue, errorCode, classification),
      ...(errorCode === undefined ? {} : { errorCodeDigest: digest("metadata/error-code", errorCode) }),
    });
  } catch (error: unknown) {
    return rejection(error);
  }
}

export function projectAuditModelRequestFailed(
  sessionRefValue: unknown,
  eventRef: unknown,
  observedAtValue: unknown,
  turnValue: unknown,
  stepValue: unknown,
  failureValue: unknown,
): AuditProjectionResult {
  try {
    const sessionRef = requiredRef(sessionRefValue);
    const turn = nonNegativeInteger(turnValue);
    const step = nonNegativeInteger(stepValue);
    const failure = dataObject(failureValue);
    const failureClass = stringValue(requiredData(failure, "code"));
    const { common } = base(sessionRef, eventRef, observedAtFromClock(observedAtValue));
    return freezeEvent({
      ...common,
      type: "model.request.failed",
      turnKey: identity("turn", sessionRef, turnRef(sessionRef, turn)),
      stepKey: identity("step", sessionRef, stepRef(sessionRef, turn, step)),
      failureClassDigest: digest("metadata/failure-class", failureClass),
      failureDigest: digest("failure/source-json", failureValue),
    });
  } catch (error: unknown) {
    return rejection(error);
  }
}

export function projectAuditTurnCompletionRequested(
  sessionRefValue: unknown,
  eventRef: unknown,
  observedAtValue: unknown,
  turnValue: unknown,
): AuditProjectionResult {
  try {
    const sessionRef = requiredRef(sessionRefValue);
    const turn = nonNegativeInteger(turnValue);
    const { common } = base(sessionRef, eventRef, observedAtFromClock(observedAtValue));
    return freezeEvent({
      ...common,
      type: "turn.completion_requested",
      turnKey: identity("turn", sessionRef, turnRef(sessionRef, turn)),
    });
  } catch (error: unknown) {
    return rejection(error);
  }
}
