import type { AdapterFeatureMatrix } from "./feature-matrix.js";
import type { RuntimeEventSink } from "./runtime-events.js";

export interface Disposable {
  dispose(): void | Promise<void>;
}

export interface ObservationSubscription extends Disposable {
  /** Wait until every event accepted before this call has settled. */
  drain(): Promise<void>;
}

export type ToolPolicyDecision =
  | { readonly kind: "ALLOW" }
  | { readonly kind: "DENY"; readonly reason: string }
  | { readonly kind: "ASK"; readonly reason?: string };

export type ToolGuardDecision =
  | { readonly kind: "ALLOW" }
  | { readonly kind: "DENY"; readonly reason: string };

export type ToolExecutionScope =
  | {
      readonly kind: "agent";
      readonly sessionRef: string;
      readonly agentRef: string;
    }
  | { readonly kind: "host" };

export interface ToolPolicyRequest {
  readonly callRef: string;
  readonly rootCallRef: string;
  readonly toolName: string;
  readonly arguments: unknown;
  readonly scope: ToolExecutionScope;
}

export type ToolPolicyHandler = (
  request: Readonly<ToolPolicyRequest>,
) => ToolPolicyDecision | Promise<ToolPolicyDecision>;

/** Harness monotonic guards are synchronous and cannot ask or force allow. */
export type ToolGuardHandler = (
  request: Readonly<ToolPolicyRequest>,
) => ToolGuardDecision;

export interface ApprovalRequest {
  readonly sessionRef: string;
  readonly callRef?: string;
  readonly toolName: string;
  readonly reason?: string;
  readonly signal?: AbortSignal;
}

export type ApprovalDecision =
  | "ALLOWED_ONCE"
  | "REJECTED"
  | "CANCELLED"
  | "UNAVAILABLE";

export interface CompletionBoundaryRequest {
  readonly sessionRef: string;
  readonly turnRef: string;
  readonly signal: AbortSignal;
}

export type TurnStoppingHandler = (
  request: Readonly<CompletionBoundaryRequest>,
) => void | Promise<void>;

export interface CompletionSteerRequest {
  readonly sessionRef: string;
  readonly turnRef: string;
  readonly reason: string;
  readonly retryOrdinal: number;
}

export interface FilesystemPort {
  readonly guarantee: "provider-enforced" | "process-isolated";
}

export interface SubprocessPort {
  readonly guarantee: "provider-enforced" | "process-isolated";
}

export interface HarnessRuntimeAdapter {
  readonly adapterName: "deepseek-harness";
  readonly adapterVersion: string;
  readonly harnessVersion: string;
  readonly harnessCommit?: string;
  readonly features: AdapterFeatureMatrix;

  observe(sink: RuntimeEventSink): ObservationSubscription;

  registerToolPolicy(handler: ToolPolicyHandler): Disposable;

  registerMonotonicToolGuard?(handler: ToolGuardHandler): Disposable;

  /** Register work that must complete inside Harness's awaited turn-stopping boundary. */
  registerTurnStopping(handler: TurnStoppingHandler): Disposable;

  requestApproval(request: ApprovalRequest): Promise<ApprovalDecision>;

  steerCompletion(request: CompletionSteerRequest): Promise<void>;

  readonly filesystem?: FilesystemPort;
  readonly subprocess?: SubprocessPort;
}
