import type { AuthorizationRef, CapabilityResource } from "@dsh-safe/protocol";

export const LEASE_ATTENUATION_PROFILE = "M4-034_LEASE_ATTENUATION_V1" as const;

export interface LeaseAttenuationConsumeInput {
  readonly profile: typeof LEASE_ATTENUATION_PROFILE;
  readonly leaseRef: string;
}

/**
 * Authoritative semantic projection consumed by M4-034.
 *
 * This is operational store state, not a second public CapabilityLease wire
 * model. `revoked` remains the M4-033 lifecycle fact keyed by `leaseRef`.
 */
export interface LeaseAttenuationState {
  readonly leaseRef: string;
  readonly subjectRef: string;
  readonly parentLeaseRef?: string;
  readonly capability: string;
  readonly resource: CapabilityResource;
  readonly constraints?: Readonly<Record<string, unknown>>;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly maxUses: number;
  readonly remainingUses: number;
  readonly authorization: AuthorizationRef;
  readonly revoked: boolean;
}

export type LeaseAttenuationNotConsumedReason =
  | "LEASE_ATTENUATION_NOT_FOUND"
  | "LEASE_ATTENUATION_TARGET_REVOKED"
  | "LEASE_ATTENUATION_ANCESTOR_REVOKED"
  | "LEASE_USAGE_EXHAUSTED"
  | "LEASE_ATTENUATION_ANCESTOR_EXHAUSTED";

export type LeaseAttenuationStage = "INPUT" | "CHAIN" | "ATTENUATION" | "USAGE" | "STORE";

export type LeaseAttenuationFailureReason =
  | "LEASE_ATTENUATION_INPUT_INVALID"
  | "LEASE_ATTENUATION_PROFILE_INVALID"
  | "LEASE_ATTENUATION_LEASE_REF_INVALID"
  | "LEASE_ATTENUATION_PARENT_NOT_FOUND"
  | "LEASE_ATTENUATION_CYCLE"
  | "LEASE_ATTENUATION_DEPTH_EXCEEDED"
  | "LEASE_ATTENUATION_STATE_INVALID"
  | "LEASE_ATTENUATION_AUTHORIZATION_INVALID"
  | "LEASE_ATTENUATION_CAPABILITY_UNPROVABLE"
  | "LEASE_ATTENUATION_RESOURCE_UNPROVABLE"
  | "LEASE_ATTENUATION_CONSTRAINT_PROFILE_UNSUPPORTED"
  | "LEASE_ATTENUATION_TIME_INVALID"
  | "LEASE_ATTENUATION_TIME_BROADENING"
  | "LEASE_ATTENUATION_MAX_USES_BROADENING"
  | "LEASE_ATTENUATION_STORE_UNAVAILABLE"
  | "LEASE_ATTENUATION_OUTCOME_UNKNOWN"
  | "LEASE_ATTENUATION_STORE_RESULT_INVALID"
  | "LEASE_USAGE_MAX_USES_INVALID"
  | "LEASE_USAGE_REMAINING_USES_INVALID"
  | "LEASE_USAGE_STATE_INVALID";

export interface LeaseAttenuationConsumed {
  readonly status: "CONSUMED";
  readonly reasonCode: "LEASE_ATTENUATED_USE_CONSUMED";
  readonly remainingUsesBefore: number;
  readonly remainingUsesAfter: number;
}

export interface LeaseAttenuationNotConsumed {
  readonly status: "NOT_CONSUMED";
  readonly reasonCode: LeaseAttenuationNotConsumedReason;
}

export interface LeaseAttenuationFailure {
  readonly status: "FAIL_CLOSED";
  readonly stage: LeaseAttenuationStage;
  readonly reasonCode: LeaseAttenuationFailureReason;
}

export type LeaseAttenuationResult =
  | LeaseAttenuationConsumed
  | LeaseAttenuationNotConsumed
  | LeaseAttenuationFailure;

export type LeaseAttenuationStoreSemanticStage = "CHAIN" | "ATTENUATION" | "USAGE";

export type LeaseAttenuationStoreSemanticFailureReason = Exclude<
  LeaseAttenuationFailureReason,
  | "LEASE_ATTENUATION_INPUT_INVALID"
  | "LEASE_ATTENUATION_PROFILE_INVALID"
  | "LEASE_ATTENUATION_LEASE_REF_INVALID"
  | "LEASE_ATTENUATION_STORE_UNAVAILABLE"
  | "LEASE_ATTENUATION_OUTCOME_UNKNOWN"
  | "LEASE_ATTENUATION_STORE_RESULT_INVALID"
>;

export type LeaseAttenuationStoreOutcome =
  | {
      readonly status: "CONSUMED";
      readonly chainBefore: readonly LeaseAttenuationState[];
      readonly chainAfter: readonly LeaseAttenuationState[];
    }
  | {
      readonly status: "NOT_CONSUMED";
      readonly reasonCode: LeaseAttenuationNotConsumedReason;
      readonly chain: readonly LeaseAttenuationState[];
    }
  | {
      readonly status: "FAIL_CLOSED";
      readonly stage: LeaseAttenuationStoreSemanticStage;
      readonly reasonCode: LeaseAttenuationStoreSemanticFailureReason;
    }
  | { readonly status: "NOT_FOUND" }
  | { readonly status: "UNAVAILABLE_NOT_APPLIED" }
  | { readonly status: "OUTCOME_UNKNOWN" };

/**
 * Trusted enforcement port for one hierarchy-aware use attempt.
 *
 * A conforming backend makes chain resolution, lifecycle observation and the
 * all-chain decrement one authoritative linearizable operation for overlapping
 * Lease identities. The public broker never emulates that guarantee with split
 * reads and writes.
 */
export interface LeaseAttenuationStore {
  consumeHierarchy(
    leaseRef: string,
  ): LeaseAttenuationStoreOutcome | Promise<LeaseAttenuationStoreOutcome>;
}
