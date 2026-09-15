export const LEASE_USAGE_PROFILE = "M4-031_LEASE_USAGE_V1" as const;

/**
 * Runtime-independent projection of one CapabilityLease usage snapshot.
 * The public evaluator accepts `unknown` so callers that bypass static typing
 * are still handled fail-closed at the runtime boundary.
 */
export interface LeaseUsageEvaluationInput {
  readonly profile: typeof LEASE_USAGE_PROFILE;
  readonly maxUses: number;
  readonly remainingUses: number;
}

export interface LeaseUsageEligible {
  readonly status: "USAGE_ELIGIBLE";
  readonly reasonCode: "LEASE_USAGE_AVAILABLE";
}

export interface LeaseUsageIneligible {
  readonly status: "USAGE_INELIGIBLE";
  readonly reasonCode: "LEASE_USAGE_EXHAUSTED";
}

export type LeaseUsageStage = "INPUT" | "USAGE";

export type LeaseUsageFailureReason =
  | "LEASE_USAGE_INPUT_INVALID"
  | "LEASE_USAGE_PROFILE_INVALID"
  | "LEASE_USAGE_MAX_USES_INVALID"
  | "LEASE_USAGE_REMAINING_USES_INVALID"
  | "LEASE_USAGE_STATE_INVALID";

export interface LeaseUsageFailure {
  readonly status: "FAIL_CLOSED";
  readonly stage: LeaseUsageStage;
  readonly reasonCode: LeaseUsageFailureReason;
}

export type LeaseUsageEvaluationResult =
  | LeaseUsageEligible
  | LeaseUsageIneligible
  | LeaseUsageFailure;
