import type { ResourceNormalizationFailureReason } from "@dsh-safe/policy-engine";

export type LeaseLookupStage =
  | "INPUT"
  | "SUBJECT"
  | "RESOURCE"
  | "LEASE_SNAPSHOT"
  | "CONSTRAINT";

export type LeaseLookupOwnedFailureReason =
  | "LEASE_LOOKUP_INPUT_INVALID"
  | "LEASE_LOOKUP_SUBJECT_INVALID"
  | "LEASE_LOOKUP_SNAPSHOT_INVALID"
  | "LEASE_LOOKUP_LEASE_REF_INVALID"
  | "LEASE_LOOKUP_SUBJECT_REF_INVALID"
  | "LEASE_LOOKUP_CAPABILITY_INVALID"
  | "LEASE_LOOKUP_DUPLICATE_LEASE_REF"
  | "LEASE_CONSTRAINT_PROFILE_UNSUPPORTED";

export type LeaseLookupFailureReason =
  | LeaseLookupOwnedFailureReason
  | ResourceNormalizationFailureReason;

/**
 * Logical M4-022 input. Runtime entry remains `unknown` so callers that bypass
 * schema/type boundaries are still handled fail-closed.
 */
export interface LeaseLookupInput {
  readonly subject: unknown;
  readonly capability: string;
  readonly resource: unknown;
  readonly leases: readonly unknown[];
}

export interface LeaseLookupCandidatesFound {
  readonly status: "CANDIDATES_FOUND";
  readonly candidateLeaseRefs: readonly string[];
}

export interface LeaseLookupNoCandidate {
  readonly status: "NO_CANDIDATE";
  readonly candidateLeaseRefs: readonly string[];
}

export interface LeaseLookupFailure {
  readonly status: "FAIL_CLOSED";
  readonly stage: LeaseLookupStage;
  readonly reasonCode: LeaseLookupFailureReason;
}

export type LeaseLookupResult =
  | LeaseLookupCandidatesFound
  | LeaseLookupNoCandidate
  | LeaseLookupFailure;
