export const LEASE_TTL_PROFILE = "M4-030_LEASE_TTL_V1" as const;

/**
 * Runtime-independent projection of the CapabilityLease time window plus the
 * caller-supplied logical observation time. The public implementation still
 * accepts `unknown` so bypasses of static typing are handled fail-closed.
 */
export interface LeaseTtlEvaluationInput {
  readonly profile: typeof LEASE_TTL_PROFILE;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly observedAt: string;
}

export interface LeaseTtlEligible {
  readonly status: "TIME_ELIGIBLE";
  readonly reasonCode: "LEASE_TTL_ACTIVE";
}

export type LeaseTtlIneligibleReasonCode =
  | "LEASE_TTL_NOT_YET_ACTIVE"
  | "LEASE_TTL_EXPIRED";

export interface LeaseTtlIneligible {
  readonly status: "TIME_INELIGIBLE";
  readonly reasonCode: LeaseTtlIneligibleReasonCode;
}

export type LeaseTtlStage = "INPUT" | "TIME";

export type LeaseTtlFailureReason =
  | "LEASE_TTL_INPUT_INVALID"
  | "LEASE_TTL_PROFILE_INVALID"
  | "LEASE_TTL_ISSUED_AT_INVALID"
  | "LEASE_TTL_EXPIRES_AT_INVALID"
  | "LEASE_TTL_OBSERVED_AT_INVALID"
  | "LEASE_TTL_WINDOW_INVALID";

export interface LeaseTtlFailure {
  readonly status: "FAIL_CLOSED";
  readonly stage: LeaseTtlStage;
  readonly reasonCode: LeaseTtlFailureReason;
}

export type LeaseTtlEvaluationResult =
  | LeaseTtlEligible
  | LeaseTtlIneligible
  | LeaseTtlFailure;
