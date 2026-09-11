import type { GuaranteeLevel } from "@dsh-safe/protocol";

export const GUARANTEE_ASSIGNMENT_PROFILE = "M4-025_GUARANTEE_ASSIGNMENT_V1" as const;

export type ToolEnforcementEvidence =
  | { readonly state: "NONE" }
  | { readonly state: "AVAILABLE_ONLY" }
  | {
      readonly state: "ENFORCING";
      readonly authorizationBinding: "EXACT_ACTION";
      readonly dispatchControl: "MANDATORY";
    };

export type ProviderEnforcementEvidence =
  | { readonly state: "NONE" }
  | { readonly state: "MEDIATED_ONLY" }
  | {
      readonly state: "ENFORCING";
      readonly authorizationBinding: "EXACT_CAPABILITY_RESOURCE";
      readonly traversal: "MANDATORY" | "BYPASSABLE";
      readonly coverage: "COMPLETE" | "PARTIAL";
      readonly resourceIdentity: "PROVIDER_CANONICAL" | "NON_CANONICAL";
      readonly deploymentEvidence: "VERIFIED" | "UNVERIFIED";
    };

export type NonSecurityProcessMechanism =
  | "PLAIN_PROCESS"
  | "WORKER_THREAD"
  | "SAME_WORLD_SANDBOX";

export type ProcessIsolationBoundary =
  | "OS_PROCESS_SANDBOX"
  | "CONTAINER"
  | "VM"
  | "MICROVM"
  | "REMOTE_ISOLATED_RUNTIME";

export type ProcessIsolationEvidence =
  | { readonly state: "NONE" }
  | {
      readonly state: "NON_SECURITY_BOUNDARY";
      readonly mechanism: NonSecurityProcessMechanism;
    }
  | {
      readonly state: "ENFORCING";
      readonly boundary: ProcessIsolationBoundary;
      readonly authorizationBinding: "EXACT_CAPABILITY_RESOURCE";
      readonly coverage: "COMPLETE" | "PARTIAL";
      readonly directHostBypass: "BLOCKED" | "NOT_BLOCKED";
      readonly deploymentEvidence: "VERIFIED" | "UNVERIFIED";
    };

/**
 * Bounded, runtime-independent projection of already established enforcement
 * facts. Creating trustworthy evidence is an orchestration/deployment concern;
 * this type does not make arbitrary caller-supplied values authoritative.
 */
export interface GuaranteeEvidenceProjection {
  readonly isolation: ProcessIsolationEvidence;
  readonly provider: ProviderEnforcementEvidence;
  readonly tool: ToolEnforcementEvidence;
}

export interface GuaranteeAssignmentInput {
  readonly profile: typeof GUARANTEE_ASSIGNMENT_PROFILE;
  readonly evidence: GuaranteeEvidenceProjection;
}

export type GuaranteeAssignmentReasonCode =
  | "GUARANTEE_ASSIGNED_ADVISORY"
  | "GUARANTEE_ASSIGNED_TOOL_ENFORCED"
  | "GUARANTEE_ASSIGNED_PROVIDER_ENFORCED"
  | "GUARANTEE_ASSIGNED_PROCESS_ISOLATED";

export interface GuaranteeAssigned {
  readonly status: "ASSIGNED";
  readonly guaranteeLevel: GuaranteeLevel;
  readonly reasonCode: GuaranteeAssignmentReasonCode;
}

export type GuaranteeAssignmentStage =
  | "INPUT"
  | "EVIDENCE"
  | "ISOLATION"
  | "PROVIDER"
  | "TOOL";

export type GuaranteeAssignmentFailureReason =
  | "GUARANTEE_ASSIGNMENT_INPUT_INVALID"
  | "GUARANTEE_ASSIGNMENT_PROFILE_INVALID"
  | "GUARANTEE_ASSIGNMENT_EVIDENCE_INVALID"
  | "GUARANTEE_ASSIGNMENT_ISOLATION_EVIDENCE_INVALID"
  | "GUARANTEE_ASSIGNMENT_PROVIDER_EVIDENCE_INVALID"
  | "GUARANTEE_ASSIGNMENT_TOOL_EVIDENCE_INVALID";

export interface GuaranteeAssignmentFailure {
  readonly status: "FAIL_CLOSED";
  readonly stage: GuaranteeAssignmentStage;
  readonly reasonCode: GuaranteeAssignmentFailureReason;
}

export type GuaranteeAssignmentResult = GuaranteeAssigned | GuaranteeAssignmentFailure;
