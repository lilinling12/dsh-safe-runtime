/**
 * Capability Broker public package surface.
 *
 * M4-010 through M4-014 classifier/fallback stages and M4-020 through M4-025
 * PDP / Decision-Receipt / GuaranteeLevel prerequisites are governance-closed.
 * M4-030 deterministic CapabilityLease TTL validity is governance-closed.
 * M4-031 deterministic CapabilityLease usage validity is governance-closed.
 * M4-032 atomic one-use consumption is governance-closed.
 * M4-033 authoritative CapabilityLease revocation is implemented and awaiting
 * exact-head implementation acceptance.
 *
 * M4-033 revokes only one exact leaseRef through a trusted atomic store port.
 * It does not mutate TTL/usage, cascade through parent/child leases, compose
 * revocation with consume/execution, or wire a PEP. M4-034+ remain separate
 * Gates.
 *
 * Protocol capability/Decision/Receipt/Lease types remain owned by
 * `@dsh-safe/protocol`; this package has no concrete DeepSeek Harness runtime
 * dependency.
 */
export const PACKAGE_STAGE = "M4-033-LEASE-REVOCATION-IMPLEMENTED" as const;

export * from "./builtin-filesystem-tool-classifier.js";
export * from "./tool-classifier/builtin-shell.js";
export * from "./tool-classifier/mcp-metadata.js";
export * from "./tool-classifier/unknown-tool-fallback.js";
export * from "./tool-classifier/plugin-classifier-registry.js";
export { lookupCapabilityLeases } from "./lease-lookup.js";
export {
  type LeaseLookupCandidatesFound,
  type LeaseLookupFailure,
  type LeaseLookupFailureReason,
  type LeaseLookupInput,
  type LeaseLookupNoCandidate,
  type LeaseLookupOwnedFailureReason,
  type LeaseLookupResult,
  type LeaseLookupStage,
} from "./lease-lookup-types.js";
export { routeCapabilityApproval } from "./approval-routing.js";
export {
  type ApprovalInvocationPort,
  type ApprovalOutcome,
  type ApprovalRoutingFailure,
  type ApprovalRoutingFailureReason,
  type ApprovalRoutingInput,
  type ApprovalRoutingOwnedFailureReason,
  type ApprovalRoutingReasonCode,
  type ApprovalRoutingRequest,
  type ApprovalRoutingResult,
  type ApprovalRoutingStage,
  type AuthorityApprovalRoute,
  type PolicyApprovalRoute,
} from "./approval-routing-types.js";
export { constructCapabilityDecisionReceipt } from "./decision-receipt.js";
export {
  type ConstructedCapabilityDecision,
  type ConstructedCapabilityReceipt,
  type DecisionReceiptConstructed,
  type DecisionReceiptConstructionInput,
  type DecisionReceiptConstructionResult,
  type DecisionReceiptDecisionReasonCode,
  type DecisionReceiptFailure,
  type DecisionReceiptFailureReason,
  type DecisionReceiptIssuanceContext,
  type DecisionReceiptStage,
} from "./decision-receipt-types.js";
export { assignGuaranteeLevel } from "./guarantee-assignment.js";
export {
  GUARANTEE_ASSIGNMENT_PROFILE,
  type GuaranteeAssigned,
  type GuaranteeAssignmentFailure,
  type GuaranteeAssignmentFailureReason,
  type GuaranteeAssignmentInput,
  type GuaranteeAssignmentReasonCode,
  type GuaranteeAssignmentResult,
  type GuaranteeAssignmentStage,
  type GuaranteeEvidenceProjection,
  type NonSecurityProcessMechanism,
  type ProcessIsolationBoundary,
  type ProcessIsolationEvidence,
  type ProviderEnforcementEvidence,
  type ToolEnforcementEvidence,
} from "./guarantee-assignment-types.js";
export { evaluateCapabilityLeaseTtl } from "./lease-ttl.js";
export {
  LEASE_TTL_PROFILE,
  type LeaseTtlEligible,
  type LeaseTtlEvaluationInput,
  type LeaseTtlEvaluationResult,
  type LeaseTtlFailure,
  type LeaseTtlFailureReason,
  type LeaseTtlIneligible,
  type LeaseTtlIneligibleReasonCode,
  type LeaseTtlStage,
} from "./lease-ttl-types.js";
export { evaluateCapabilityLeaseUsage } from "./lease-usage.js";
export {
  LEASE_USAGE_PROFILE,
  type LeaseUsageEligible,
  type LeaseUsageEvaluationInput,
  type LeaseUsageEvaluationResult,
  type LeaseUsageFailure,
  type LeaseUsageFailureReason,
  type LeaseUsageIneligible,
  type LeaseUsageStage,
} from "./lease-usage-types.js";
export { consumeCapabilityLeaseUse } from "./lease-consume.js";
export { InMemoryLeaseUseStore } from "./lease-consume-memory-store.js";
export {
  LEASE_CONSUME_PROFILE,
  type LeaseConsumed,
  type LeaseConsumeFailure,
  type LeaseConsumeFailureReason,
  type LeaseConsumeInput,
  type LeaseConsumeResult,
  type LeaseConsumeStage,
  type LeaseNotConsumed,
  type LeaseUseState,
  type LeaseUseStore,
  type LeaseUseStoreOutcome,
} from "./lease-consume-types.js";
export { revokeCapabilityLease } from "./lease-revoke.js";
export { InMemoryLeaseRevocationStore } from "./lease-revoke-memory-store.js";
export {
  LEASE_REVOKE_PROFILE,
  type LeaseAlreadyRevoked,
  type LeaseNotRevoked,
  type LeaseRevocationState,
  type LeaseRevocationStore,
  type LeaseRevocationStoreOutcome,
  type LeaseRevokeFailure,
  type LeaseRevokeFailureReason,
  type LeaseRevokeInput,
  type LeaseRevokeResult,
  type LeaseRevokeStage,
  type LeaseRevoked,
} from "./lease-revoke-types.js";
