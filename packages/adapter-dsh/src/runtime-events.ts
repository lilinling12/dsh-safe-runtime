export type RuntimeEvent =
  | SessionStartedEvent
  | TurnStartedEvent
  | StepStartedEvent
  | ToolRequestedEvent
  | ToolCompletedEvent
  | ApprovalDecidedEvent
  | ModelRequestFailedEvent
  | TurnCompletionRequestedEvent
  | TurnEndedEvent;

export interface RuntimeEventBase {
  readonly eventRef: string;
  readonly sessionRef: string;
  readonly observedAt: string;
}

export interface SessionStartedEvent extends RuntimeEventBase {
  readonly type: "session.started";
  readonly source: "startup" | "resume";
}

export interface TurnStartedEvent extends RuntimeEventBase {
  readonly type: "turn.started";
  readonly turnRef: string;
}

export interface StepStartedEvent extends RuntimeEventBase {
  readonly type: "step.started";
  readonly turnRef: string;
  readonly stepRef: string;
}

export interface ToolRequestedEvent extends RuntimeEventBase {
  readonly type: "tool.requested";
  readonly turnRef?: string;
  readonly stepRef?: string;
  readonly callRef: string;
  readonly toolName: string;
  readonly argumentsDigest: string;
  readonly rootCallRef?: string;
}

export type ToolOutcome = "success" | "error" | "denied" | "cancelled";

export interface ToolCompletedEvent extends RuntimeEventBase {
  readonly type: "tool.completed";
  readonly callRef: string;
  readonly toolName: string;
  readonly outcome: ToolOutcome;
  readonly resultDigest: string;
  readonly errorCode?: string;
}

export type NormalizedApprovalOutcome =
  | "ALLOWED_ONCE"
  | "REJECTED"
  | "CANCELLED"
  | "UNAVAILABLE";

export interface ApprovalDecidedEvent extends RuntimeEventBase {
  readonly type: "approval.decided";
  readonly approvalRef: string;
  readonly callRef?: string;
  readonly outcome: NormalizedApprovalOutcome;
}

export interface ModelRequestFailedEvent extends RuntimeEventBase {
  readonly type: "model.request.failed";
  readonly turnRef: string;
  readonly stepRef: string;
  readonly failureClass: string;
  readonly failureDigest: string;
}

export interface TurnCompletionRequestedEvent extends RuntimeEventBase {
  readonly type: "turn.completion_requested";
  readonly turnRef: string;
}

export interface TurnEndedEvent extends RuntimeEventBase {
  readonly type: "turn.ended";
  readonly turnRef: string;
  readonly status: "completed" | "failed" | "blocked" | "cancelled";
}

export interface RuntimeEventSink {
  accept(event: RuntimeEvent): void | Promise<void>;
}
