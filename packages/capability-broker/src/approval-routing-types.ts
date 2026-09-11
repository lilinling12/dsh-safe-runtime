import type { LeaseLookupFailureReason } from "./lease-lookup-types.js";
import type { PolicyEvaluationFailureReason } from "@dsh-safe/policy-engine";

export type ApprovalOutcome =
  | "ALLOWED_ONCE"
  | "REJECTED"
  | "CANCELLED"
  | "UNAVAILABLE";

export type ApprovalRoutingStage =
  | "INPUT"
  | "POLICY"
  | "LEASE_LOOKUP"
  | "APPROVAL_REQUEST"
  | "APPROVAL_SERVICE";

export type ApprovalRoutingOwnedFailureReason =
  | "APPROVAL_ROUTING_INPUT_INVALID"
  | "APPROVAL_ROUTING_POLICY_RESULT_INVALID"
  | "APPROVAL_ROUTING_LEASE_LOOKUP_RESULT_INVALID"
  | "APPROVAL_ROUTING_REQUEST_INVALID"
  | "APPROVAL_ROUTING_SERVICE_ERROR"
  | "APPROVAL_ROUTING_OUTCOME_INVALID";

export type ApprovalRoutingFailureReason =
  | ApprovalRoutingOwnedFailureReason
  | PolicyEvaluationFailureReason
  | LeaseLookupFailureReason;

export interface ApprovalRoutingRequest {
  readonly requestRef: string;
  readonly actionRef: string;
  readonly reason?: string;
}

/**
 * Runtime-independent approval authority seam owned by Capability Broker.
 *
 * Adapter/host composition may implement this structurally. Concrete Harness or
 * Adapter types intentionally do not cross into this package boundary.
 */
export interface ApprovalInvocationPort {
  request(request: Readonly<ApprovalRoutingRequest>): unknown | Promise<unknown>;
}

export interface ApprovalRoutingInput {
  readonly policyEvaluation: unknown;
  readonly leaseLookup: unknown;
  readonly approvalRequest: unknown;
}

export type ApprovalRoutingReasonCode =
  | "APPROVAL_NOT_REQUIRED_POLICY_ALLOW"
  | "APPROVAL_NOT_REQUIRED_POLICY_DENY"
  | "APPROVAL_ALLOWED_ONCE"
  | "APPROVAL_REJECTED"
  | "APPROVAL_CANCELLED"
  | "APPROVAL_UNAVAILABLE";

export interface PolicyApprovalRoute {
  readonly status: "ROUTED";
  readonly effect: "allow" | "deny";
  readonly routeSource: "POLICY";
  readonly reasonCode:
    | "APPROVAL_NOT_REQUIRED_POLICY_ALLOW"
    | "APPROVAL_NOT_REQUIRED_POLICY_DENY";
}

export interface AuthorityApprovalRoute {
  readonly status: "ROUTED";
  readonly effect: "allow" | "deny";
  readonly routeSource: "APPROVAL";
  readonly reasonCode:
    | "APPROVAL_ALLOWED_ONCE"
    | "APPROVAL_REJECTED"
    | "APPROVAL_CANCELLED"
    | "APPROVAL_UNAVAILABLE";
  readonly approvalOutcome: ApprovalOutcome;
}

export interface ApprovalRoutingFailure {
  readonly status: "FAIL_CLOSED";
  readonly effect: "deny";
  readonly stage: ApprovalRoutingStage;
  readonly reasonCode: ApprovalRoutingFailureReason;
}

export type ApprovalRoutingResult =
  | PolicyApprovalRoute
  | AuthorityApprovalRoute
  | ApprovalRoutingFailure;
