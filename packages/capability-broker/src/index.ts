/**
 * Capability Broker public package surface.
 *
 * M4-010 through M4-014 classifier/fallback stages and M4-020 through M4-025
 * PDP / Decision-Receipt / GuaranteeLevel prerequisites are governance-closed.
 * M4-030 CapabilityLease TTL evaluation is the current gate-scoped production
 * implementation candidate; PACKAGE_STAGE remains the last accepted package
 * stage until M4-030 passes acceptance.
 *
 * M4-030 evaluates only an explicit logical observation time against the
 * existing Lease `[issuedAt, expiresAt)` interval. It does not consume usage,
 * check revocation/delegation, bypass approval, execute actions, or wire a PEP.
 *
 * Protocol capability/Decision/Receipt/Lease types remain owned by
 * `@dsh-safe/protocol`; this package has no concrete DeepSeek Harness runtime
 * dependency.
 */
export const PACKAGE_STAGE = "M4-025-GUARANTEE-ASSIGNMENT-ACCEPTED" as const;

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
