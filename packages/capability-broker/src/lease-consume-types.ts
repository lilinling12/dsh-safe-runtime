export const LEASE_CONSUME_PROFILE = "M4-032_LEASE_CONSUME_V1" as const;

export interface LeaseConsumeInput {
  readonly profile: typeof LEASE_CONSUME_PROFILE;
  readonly leaseRef: string;
}

export interface LeaseUseState {
  readonly leaseRef: string;
  readonly maxUses: unknown;
  readonly remainingUses: unknown;
}

export type LeaseUseStoreOutcome =
  | { readonly status: "CONSUMED"; readonly stateBefore: LeaseUseState; readonly stateAfter: LeaseUseState }
  | { readonly status: "EXHAUSTED"; readonly state: LeaseUseState }
  | { readonly status: "NOT_FOUND" }
  | { readonly status: "UNAVAILABLE_NOT_APPLIED" }
  | { readonly status: "OUTCOME_UNKNOWN" };

/**
 * Trusted enforcement port. Implementations MUST make each `consumeOne` call
 * linearizable for a single leaseRef. The broker never emulates backend atomicity
 * with a read/check/write sequence.
 */
export interface LeaseUseStore {
  consumeOne(leaseRef: string): LeaseUseStoreOutcome | Promise<LeaseUseStoreOutcome>;
}

export interface LeaseConsumed {
  readonly status: "CONSUMED";
  readonly reasonCode: "LEASE_USE_CONSUMED";
  readonly remainingUsesBefore: number;
  readonly remainingUsesAfter: number;
}

export interface LeaseNotConsumed {
  readonly status: "NOT_CONSUMED";
  readonly reasonCode: "LEASE_CONSUME_NOT_FOUND" | "LEASE_USAGE_EXHAUSTED";
}

export type LeaseConsumeStage = "INPUT" | "USAGE" | "STORE";

export type LeaseConsumeFailureReason =
  | "LEASE_CONSUME_INPUT_INVALID"
  | "LEASE_CONSUME_PROFILE_INVALID"
  | "LEASE_CONSUME_LEASE_REF_INVALID"
  | "LEASE_CONSUME_STORE_UNAVAILABLE"
  | "LEASE_CONSUME_OUTCOME_UNKNOWN"
  | "LEASE_CONSUME_STORE_RESULT_INVALID"
  | "LEASE_USAGE_MAX_USES_INVALID"
  | "LEASE_USAGE_REMAINING_USES_INVALID"
  | "LEASE_USAGE_STATE_INVALID";

export interface LeaseConsumeFailure {
  readonly status: "FAIL_CLOSED";
  readonly stage: LeaseConsumeStage;
  readonly reasonCode: LeaseConsumeFailureReason;
}

export type LeaseConsumeResult = LeaseConsumed | LeaseNotConsumed | LeaseConsumeFailure;
