export const LEASE_REVOKE_PROFILE = "M4-033_LEASE_REVOKE_V1" as const;

export interface LeaseRevokeInput {
  readonly profile: typeof LEASE_REVOKE_PROFILE;
  readonly leaseRef: string;
}

/**
 * Minimal authoritative lifecycle projection interpreted by M4-033.
 * Revocation remains operational store state and is not added to the
 * CapabilityLease wire model.
 */
export interface LeaseRevocationState {
  readonly leaseRef: string;
  readonly revoked: boolean;
}

export type LeaseRevocationStoreOutcome =
  | {
      readonly status: "REVOKED";
      readonly stateBefore: LeaseRevocationState;
      readonly stateAfter: LeaseRevocationState;
    }
  | { readonly status: "ALREADY_REVOKED"; readonly state: LeaseRevocationState }
  | { readonly status: "NOT_FOUND" }
  | { readonly status: "UNAVAILABLE_NOT_APPLIED" }
  | { readonly status: "OUTCOME_UNKNOWN" };

/**
 * Trusted enforcement port. Implementations MUST make each `revokeOne` call
 * linearizable for a single leaseRef and MUST never transition revoked state
 * from true back to false.
 */
export interface LeaseRevocationStore {
  revokeOne(leaseRef: string): LeaseRevocationStoreOutcome | Promise<LeaseRevocationStoreOutcome>;
}

export interface LeaseRevoked {
  readonly status: "REVOKED";
  readonly reasonCode: "LEASE_REVOKED";
}

export interface LeaseAlreadyRevoked {
  readonly status: "ALREADY_REVOKED";
  readonly reasonCode: "LEASE_ALREADY_REVOKED";
}

export interface LeaseNotRevoked {
  readonly status: "NOT_REVOKED";
  readonly reasonCode: "LEASE_REVOKE_NOT_FOUND";
}

export type LeaseRevokeStage = "INPUT" | "STORE";

export type LeaseRevokeFailureReason =
  | "LEASE_REVOKE_INPUT_INVALID"
  | "LEASE_REVOKE_PROFILE_INVALID"
  | "LEASE_REVOKE_LEASE_REF_INVALID"
  | "LEASE_REVOKE_STORE_UNAVAILABLE"
  | "LEASE_REVOKE_OUTCOME_UNKNOWN"
  | "LEASE_REVOKE_STORE_RESULT_INVALID";

export interface LeaseRevokeFailure {
  readonly status: "FAIL_CLOSED";
  readonly stage: LeaseRevokeStage;
  readonly reasonCode: LeaseRevokeFailureReason;
}

export type LeaseRevokeResult = LeaseRevoked | LeaseAlreadyRevoked | LeaseNotRevoked | LeaseRevokeFailure;
