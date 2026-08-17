import type { AdapterFeatureMatrix } from "./feature-matrix.js";
import type { RuntimeEventSink } from "./runtime-events.js";

export interface Disposable {
  dispose(): void | Promise<void>;
}

export type ToolPolicyDecision =
  | { readonly kind: "ALLOW" }
  | { readonly kind: "DENY"; readonly reason: string }
  | { readonly kind: "ASK"; readonly reason?: string };

export interface ToolPolicyRequest {
  readonly callRef: string;
  readonly toolName: string;
  readonly arguments: unknown;
  readonly sessionRef: string;
  readonly agentRef?: string;
}

export type ToolPolicyHandler = (
  request: Readonly<ToolPolicyRequest>,
) => ToolPolicyDecision | Promise<ToolPolicyDecision>;

export interface ApprovalRequest {
  readonly approvalRef: string;
  readonly sessionRef: string;
  readonly callRef?: string;
  readonly toolName?: string;
  readonly reason: string;
}

export type ApprovalDecision =
  | "ALLOWED_ONCE"
  | "REJECTED"
  | "CANCELLED"
  | "UNAVAILABLE";

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

  observe(sink: RuntimeEventSink): Disposable;

  registerToolPolicy(handler: ToolPolicyHandler): Disposable;

  registerMonotonicToolGuard?(handler: ToolPolicyHandler): Disposable;

  requestApproval(request: ApprovalRequest): Promise<ApprovalDecision>;

  steerCompletion(request: CompletionSteerRequest): Promise<void>;

  readonly filesystem?: FilesystemPort;
  readonly subprocess?: SubprocessPort;
}
