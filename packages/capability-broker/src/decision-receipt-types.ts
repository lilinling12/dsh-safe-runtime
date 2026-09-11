import type {
  CapabilityDecision,
  CapabilityReceipt,
  GuaranteeLevel,
} from "@dsh-safe/protocol";

import type {
  ApprovalRoutingFailureReason,
  ApprovalRoutingReasonCode,
  ApprovalRoutingResult,
} from "./approval-routing-types.js";

/**
 * Caller-supplied record identity/time context for M4-024.
 *
 * M4-024 validates and copies these values. It does not generate identifiers,
 * read host time, or determine why a guarantee level is justified.
 */
export interface DecisionReceiptIssuanceContext {
  readonly requestRef: string;
  readonly decisionRef: string;
  readonly receiptRef: string;
  readonly guaranteeLevel: GuaranteeLevel;
  readonly decidedAt: string;
  readonly observedAt: string;
}

/**
 * Statically convenient input shape for trusted TypeScript callers.
 *
 * The runtime constructor still accepts `unknown` so every security-relevant
 * field is validated at the package boundary when static typing is bypassed.
 */
export interface DecisionReceiptConstructionInput {
  readonly routing: ApprovalRoutingResult;
  readonly issuance: DecisionReceiptIssuanceContext;
}

export type DecisionReceiptStage = "INPUT" | "ROUTING" | "ISSUANCE";

export type DecisionReceiptFailureReason =
  | "DECISION_RECEIPT_INPUT_INVALID"
  | "DECISION_RECEIPT_ROUTING_INVALID"
  | "DECISION_RECEIPT_ISSUANCE_INVALID"
  | "DECISION_RECEIPT_REQUEST_REF_INVALID"
  | "DECISION_RECEIPT_DECISION_REF_INVALID"
  | "DECISION_RECEIPT_RECEIPT_REF_INVALID"
  | "DECISION_RECEIPT_GUARANTEE_INVALID"
  | "DECISION_RECEIPT_DECIDED_AT_INVALID"
  | "DECISION_RECEIPT_OBSERVED_AT_INVALID";

export type DecisionReceiptDecisionReasonCode =
  | ApprovalRoutingReasonCode
  | ApprovalRoutingFailureReason;

/**
 * Exact M4-024 Decision projection.
 *
 * Optional generic protocol fields such as policyRef, matchedRuleRefs and
 * free-text reason are intentionally absent because M4-024 cannot establish
 * their authoritative provenance.
 */
export interface ConstructedCapabilityDecision {
  readonly apiVersion: CapabilityDecision["apiVersion"];
  readonly kind: CapabilityDecision["kind"];
  readonly decisionId: string;
  readonly requestId: string;
  readonly effect: "allow" | "deny";
  readonly guaranteeLevel: GuaranteeLevel;
  readonly reasonCode: DecisionReceiptDecisionReasonCode;
  readonly decidedAt: string;
}

/**
 * Exact broker decision-Receipt projection for M4-024.
 *
 * Lease and digest fields remain absent until their later authoritative Gates.
 */
export interface ConstructedCapabilityReceipt {
  readonly apiVersion: CapabilityReceipt["apiVersion"];
  readonly kind: CapabilityReceipt["kind"];
  readonly receiptRef: string;
  readonly requestRef: string;
  readonly decisionRef: string;
  readonly effect: "allowed" | "denied" | "error";
  readonly guaranteeLevel: GuaranteeLevel;
  readonly observedAt: string;
}

export interface DecisionReceiptConstructed {
  readonly status: "CONSTRUCTED";
  readonly decision: ConstructedCapabilityDecision;
  readonly receipt: ConstructedCapabilityReceipt;
}

export interface DecisionReceiptFailure {
  readonly status: "FAIL_CLOSED";
  readonly stage: DecisionReceiptStage;
  readonly reasonCode: DecisionReceiptFailureReason;
}

export type DecisionReceiptConstructionResult =
  | DecisionReceiptConstructed
  | DecisionReceiptFailure;
