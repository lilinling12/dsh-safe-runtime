import type { ResourceNormalizationFailureReason } from "@dsh-safe/policy-engine";
import type { AuthorizationRef, CapabilityResource } from "@dsh-safe/protocol";

import type {
  LeaseTtlEligible,
  LeaseTtlFailureReason,
  LeaseTtlIneligible,
} from "./lease-ttl-types.js";
import type {
  LeaseUsageEligible,
  LeaseUsageFailureReason,
  LeaseUsageIneligible,
} from "./lease-usage-types.js";

export const LEASE_LISTING_PROFILE = "M4-035_LEASE_LISTING_V1" as const;
export const MAX_LEASE_LIST_ENTRIES = 1024 as const;

export interface LeaseListingInput {
  readonly profile: typeof LEASE_LISTING_PROFILE;
  readonly observedAt: string;
}

/**
 * Authoritative read-only operational projection used by M4-035.
 *
 * This is not a second CapabilityLease wire model. `revoked` remains the
 * M4-033 operational lifecycle fact keyed by the existing stable `leaseRef`.
 */
export interface LeaseInventoryState {
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

export type LeaseInventoryStoreOutcome =
  | { readonly status: "SNAPSHOT"; readonly states: readonly LeaseInventoryState[] }
  | { readonly status: "LIMIT_EXCEEDED" }
  | { readonly status: "UNAVAILABLE" };

/**
 * Trusted read-only inventory port.
 *
 * A successful call returns one coherent logical snapshot for the store's
 * configured operator scope. The Broker passes the portable hard bound and
 * invokes this port at most once per listing request.
 */
export interface LeaseInventoryStore {
  listSnapshot(
    maxEntries: typeof MAX_LEASE_LIST_ENTRIES,
  ): LeaseInventoryStoreOutcome | Promise<LeaseInventoryStoreOutcome>;
}

export type LeaseListingConstraintsState = "NONE" | "NON_EMPTY";
export type LeaseListingTtl = LeaseTtlEligible | LeaseTtlIneligible;
export type LeaseListingUsage = LeaseUsageEligible | LeaseUsageIneligible;

export interface LeaseListingEntry {
  readonly leaseRef: string;
  readonly subjectRef: string;
  readonly parentLeaseRef?: string;
  readonly capability: string;
  readonly resource: CapabilityResource;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly maxUses: number;
  readonly remainingUses: number;
  readonly authorization: AuthorizationRef;
  readonly revoked: boolean;
  readonly constraintsState: LeaseListingConstraintsState;
  readonly ttl: LeaseListingTtl;
  readonly usage: LeaseListingUsage;
}

export interface LeaseListed {
  readonly status: "LISTED";
  readonly profile: typeof LEASE_LISTING_PROFILE;
  readonly observedAt: string;
  readonly entries: readonly LeaseListingEntry[];
}

export type LeaseListingStage = "INPUT" | "STORE" | "SNAPSHOT" | "RESOURCE" | "TIME" | "USAGE";

export type LeaseListingOwnedFailureReason =
  | "LEASE_LIST_INPUT_INVALID"
  | "LEASE_LIST_PROFILE_INVALID"
  | "LEASE_LIST_OBSERVED_AT_INVALID"
  | "LEASE_LIST_STORE_UNAVAILABLE"
  | "LEASE_LIST_STORE_RESULT_INVALID"
  | "LEASE_LIST_SNAPSHOT_LIMIT_EXCEEDED"
  | "LEASE_LIST_SNAPSHOT_INVALID"
  | "LEASE_LIST_LEASE_REF_INVALID"
  | "LEASE_LIST_SUBJECT_REF_INVALID"
  | "LEASE_LIST_PARENT_LEASE_REF_INVALID"
  | "LEASE_LIST_CAPABILITY_INVALID"
  | "LEASE_LIST_CONSTRAINTS_INVALID"
  | "LEASE_LIST_AUTHORIZATION_INVALID"
  | "LEASE_LIST_REVOKED_STATE_INVALID"
  | "LEASE_LIST_DUPLICATE_LEASE_REF";

export type LeaseListingTimeFailureReason = Exclude<
  LeaseTtlFailureReason,
  "LEASE_TTL_INPUT_INVALID" | "LEASE_TTL_PROFILE_INVALID" | "LEASE_TTL_OBSERVED_AT_INVALID"
>;

export type LeaseListingUsageFailureReason = Exclude<
  LeaseUsageFailureReason,
  "LEASE_USAGE_INPUT_INVALID" | "LEASE_USAGE_PROFILE_INVALID"
>;

export type LeaseListingFailureReason =
  | LeaseListingOwnedFailureReason
  | ResourceNormalizationFailureReason
  | LeaseListingTimeFailureReason
  | LeaseListingUsageFailureReason;

export interface LeaseListingFailure {
  readonly status: "FAIL_CLOSED";
  readonly stage: LeaseListingStage;
  readonly reasonCode: LeaseListingFailureReason;
}

export type LeaseListingResult = LeaseListed | LeaseListingFailure;
