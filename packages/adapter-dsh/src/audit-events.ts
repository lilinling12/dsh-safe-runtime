export const DSH_AUDIT_PROFILE = "M4-045_DSH_AUDIT_ADMISSION_V1" as const;

export const AUDIT_DIAGNOSTIC_CODES = [
  "AUDIT_INPUT_INVALID",
  "AUDIT_INPUT_UNSUPPORTED",
  "AUDIT_LIMIT_EXCEEDED",
  "AUDIT_DIGEST_FAILED",
  "AUDIT_SINK_FAILED",
] as const;

export type AuditDiagnosticCode = typeof AUDIT_DIAGNOSTIC_CODES[number];

export type DshAuditEventType =
  | "session.started"
  | "turn.started"
  | "step.started"
  | "tool.requested"
  | "tool.completed"
  | "approval.decided"
  | "model.request.failed"
  | "turn.completion_requested"
  | "turn.ended";

export interface DshAuditEventBase {
  readonly profile: typeof DSH_AUDIT_PROFILE;
  readonly type: DshAuditEventType;
  readonly eventKey: string;
  readonly sessionKey: string;
  readonly observedAt: string;
}

export interface DshAuditSessionStartedEvent extends DshAuditEventBase {
  readonly type: "session.started";
  readonly source: "startup" | "resume" | "clear" | "compact";
}

export interface DshAuditTurnStartedEvent extends DshAuditEventBase {
  readonly type: "turn.started";
  readonly turnKey: string;
}

export interface DshAuditStepStartedEvent extends DshAuditEventBase {
  readonly type: "step.started";
  readonly turnKey: string;
  readonly stepKey: string;
}

export interface DshAuditToolRequestedEvent extends DshAuditEventBase {
  readonly type: "tool.requested";
  readonly callKey: string;
  readonly toolNameDigest: string;
  readonly argumentsDigest: string;
  readonly turnKey?: string;
  readonly stepKey?: string;
  readonly rootCallKey?: string;
}

export interface DshAuditToolCompletedEvent extends DshAuditEventBase {
  readonly type: "tool.completed";
  readonly callKey: string;
  readonly toolNameDigest: string;
  readonly resultDigest: string;
  readonly outcome: "success" | "error" | "denied" | "cancelled";
  readonly errorCodeDigest?: string;
}

export interface DshAuditApprovalDecidedEvent extends DshAuditEventBase {
  readonly type: "approval.decided";
  readonly approvalKey: string;
  readonly outcome: "ALLOWED_ONCE" | "REJECTED" | "CANCELLED" | "UNAVAILABLE";
  readonly callKey?: string;
}

export interface DshAuditModelRequestFailedEvent extends DshAuditEventBase {
  readonly type: "model.request.failed";
  readonly turnKey: string;
  readonly stepKey: string;
  readonly failureClassDigest: string;
  readonly failureDigest: string;
}

export interface DshAuditTurnCompletionRequestedEvent extends DshAuditEventBase {
  readonly type: "turn.completion_requested";
  readonly turnKey: string;
}

export interface DshAuditTurnEndedEvent extends DshAuditEventBase {
  readonly type: "turn.ended";
  readonly turnKey: string;
  readonly status: "completed" | "failed" | "blocked" | "cancelled";
}

export type DshAuditEvent =
  | DshAuditSessionStartedEvent
  | DshAuditTurnStartedEvent
  | DshAuditStepStartedEvent
  | DshAuditToolRequestedEvent
  | DshAuditToolCompletedEvent
  | DshAuditApprovalDecidedEvent
  | DshAuditModelRequestFailedEvent
  | DshAuditTurnCompletionRequestedEvent
  | DshAuditTurnEndedEvent;

export interface DshAuditEventSink {
  accept(event: DshAuditEvent): void | Promise<void>;
}

export interface AuditDeliverySummary {
  readonly delivered: number;
  readonly projectionRejected: number;
  readonly deliveryFailed: number;
  readonly countsExact: boolean;
  readonly status: "COMPLETE" | "INCOMPLETE";
  readonly diagnostics: readonly AuditDiagnosticCode[];
}

export interface AuditObservationSubscription {
  drain(): Promise<AuditDeliverySummary>;
  dispose(): Promise<AuditDeliverySummary>;
}

export interface DshAuditObservationExtension {
  observeAudit(sink: DshAuditEventSink): AuditObservationSubscription;
}

export type AuditProjectionResult =
  | { readonly kind: "event"; readonly event: DshAuditEvent }
  | { readonly kind: "rejected"; readonly code: Exclude<AuditDiagnosticCode, "AUDIT_SINK_FAILED"> };
