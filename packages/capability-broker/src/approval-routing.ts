import type {
  PolicyEvaluationBasis,
  PolicyEvaluationFailureReason,
  PolicyEvaluationReasonCode,
  PolicyEvaluationStage,
} from "@dsh-safe/policy-engine";

import type {
  LeaseLookupFailureReason,
  LeaseLookupStage,
} from "./lease-lookup-types.js";
import type {
  ApprovalInvocationPort,
  ApprovalOutcome,
  ApprovalRoutingFailure,
  ApprovalRoutingFailureReason,
  ApprovalRoutingRequest,
  ApprovalRoutingResult,
  ApprovalRoutingStage,
} from "./approval-routing-types.js";

const REF_CODE_POINT_LIMIT = 512;
const REASON_CODE_POINT_LIMIT = 4096;

const INPUT_KEYS = new Set(["policyEvaluation", "leaseLookup", "approvalRequest"]);
const POLICY_SUCCESS_KEYS = new Set([
  "status",
  "effect",
  "basis",
  "reasonCode",
  "fullyApplicableRuleIds",
  "contributingRuleIds",
]);
const POLICY_FAILURE_KEYS = new Set(["status", "effect", "stage", "reasonCode"]);
const LEASE_SUCCESS_KEYS = new Set(["status", "candidateLeaseRefs"]);
const LEASE_FAILURE_KEYS = new Set(["status", "stage", "reasonCode"]);
const APPROVAL_REQUEST_KEYS = new Set(["requestRef", "actionRef", "reason"]);

const POLICY_STAGES = new Set<PolicyEvaluationStage>([
  "INPUT",
  "SUBJECT_SELECTOR",
  "RESOURCE",
  "CONSTRAINT",
  "EFFECT",
  "DEFAULT_DENY",
  "EXPLAIN",
]);
const POLICY_FAILURE_REASONS = new Set<PolicyEvaluationFailureReason>([
  "POLICY_EVALUATION_INPUT_INVALID",
  "POLICY_SUBJECT_SELECTOR_INVALID",
  "POLICY_CONSTRAINT_PROFILE_UNSUPPORTED",
  "RULE_ORDERING_INPUT_INVALID",
  "RULE_ORDERING_DUPLICATE_RULE_ID",
  "RESOURCE_PATTERN_SYNTAX_INVALID",
  "RESOURCE_INPUT_INVALID",
  "RESOURCE_SCHEME_UNSUPPORTED",
  "RESOURCE_LOCATOR_INVALID",
  "RESOURCE_PROVIDER_IDENTITY_INVALID",
  "RESOURCE_SELECTOR_SYNTAX_INVALID",
  "RESOURCE_LIMIT_EXCEEDED",
  "EFFECT_RESOLUTION_INPUT_INVALID",
  "EFFECT_RESOLUTION_EFFECT_INVALID",
  "EFFECT_RESOLUTION_RULE_SET_MISMATCH",
  "EFFECT_RESOLUTION_BANDS_NONCANONICAL",
  "DEFAULT_EFFECT_CONFIG_INVALID",
  "DEFAULT_DENY_INPUT_INVALID",
  "POLICY_EXPLAIN_INPUT_INVALID",
]);
const LEASE_STAGES = new Set<LeaseLookupStage>([
  "INPUT",
  "SUBJECT",
  "RESOURCE",
  "LEASE_SNAPSHOT",
  "CONSTRAINT",
]);
const LEASE_FAILURE_REASONS = new Set<LeaseLookupFailureReason>([
  "LEASE_LOOKUP_INPUT_INVALID",
  "LEASE_LOOKUP_SUBJECT_INVALID",
  "LEASE_LOOKUP_SNAPSHOT_INVALID",
  "LEASE_LOOKUP_LEASE_REF_INVALID",
  "LEASE_LOOKUP_SUBJECT_REF_INVALID",
  "LEASE_LOOKUP_CAPABILITY_INVALID",
  "LEASE_LOOKUP_DUPLICATE_LEASE_REF",
  "LEASE_CONSTRAINT_PROFILE_UNSUPPORTED",
  "RESOURCE_INPUT_INVALID",
  "RESOURCE_SCHEME_UNSUPPORTED",
  "RESOURCE_LOCATOR_INVALID",
  "RESOURCE_PROVIDER_IDENTITY_INVALID",
  "RESOURCE_SELECTOR_SYNTAX_INVALID",
  "RESOURCE_LIMIT_EXCEEDED",
]);
const APPROVAL_OUTCOMES = new Set<ApprovalOutcome>([
  "ALLOWED_ONCE",
  "REJECTED",
  "CANCELLED",
  "UNAVAILABLE",
]);

type DataRead =
  | { readonly status: "DATA"; readonly value: unknown }
  | { readonly status: "MISSING" | "ACCESSOR" | "UNREADABLE" };

type PolicyRoutingFact =
  | { readonly status: "ALLOW" | "DENY" | "ASK" }
  | { readonly status: "FAILURE"; readonly failure: ApprovalRoutingFailure };

type LeaseRoutingFact =
  | { readonly status: "SUCCESS" }
  | { readonly status: "FAILURE"; readonly failure: ApprovalRoutingFailure };

/**
 * Resolve the M4-023 approval-routing fact without constructing durable
 * authorization state.
 *
 * Only an accepted M4-021 `ask` reaches the approval authority. Policy allow,
 * policy deny, upstream failure and Lease-lookup failure stop before later
 * hostile values or provider callbacks are inspected.
 */
export async function routeCapabilityApproval(
  input: unknown,
  approvalPort: ApprovalInvocationPort,
): Promise<ApprovalRoutingResult> {
  if (!isRecord(input)) return fail("INPUT", "APPROVAL_ROUTING_INPUT_INVALID");
  const inputKeys = ownKeys(input);
  if (
    inputKeys === undefined
    || !hasExactRequiredKeys(inputKeys, INPUT_KEYS)
  ) {
    return fail("INPUT", "APPROVAL_ROUTING_INPUT_INVALID");
  }

  const policyRead = readData(input, "policyEvaluation");
  if (policyRead.status !== "DATA") {
    return fail("POLICY", "APPROVAL_ROUTING_POLICY_RESULT_INVALID");
  }
  const policy = materializePolicyFact(policyRead.value);
  if (policy.status === "FAILURE") return policy.failure;
  if (policy.status === "ALLOW") {
    return Object.freeze({
      status: "ROUTED",
      effect: "allow",
      routeSource: "POLICY",
      reasonCode: "APPROVAL_NOT_REQUIRED_POLICY_ALLOW",
    });
  }
  if (policy.status === "DENY") {
    return Object.freeze({
      status: "ROUTED",
      effect: "deny",
      routeSource: "POLICY",
      reasonCode: "APPROVAL_NOT_REQUIRED_POLICY_DENY",
    });
  }

  const leaseRead = readData(input, "leaseLookup");
  if (leaseRead.status !== "DATA") {
    return fail("LEASE_LOOKUP", "APPROVAL_ROUTING_LEASE_LOOKUP_RESULT_INVALID");
  }
  const lease = materializeLeaseFact(leaseRead.value);
  if (lease.status === "FAILURE") return lease.failure;

  const requestRead = readData(input, "approvalRequest");
  if (requestRead.status !== "DATA") {
    return fail("APPROVAL_REQUEST", "APPROVAL_ROUTING_REQUEST_INVALID");
  }
  const request = materializeApprovalRequest(requestRead.value);
  if (request === undefined) {
    return fail("APPROVAL_REQUEST", "APPROVAL_ROUTING_REQUEST_INVALID");
  }

  let outcomeValue: unknown;
  try {
    outcomeValue = await approvalPort.request(request);
  } catch {
    return fail("APPROVAL_SERVICE", "APPROVAL_ROUTING_SERVICE_ERROR");
  }

  if (typeof outcomeValue !== "string" || !APPROVAL_OUTCOMES.has(outcomeValue as ApprovalOutcome)) {
    return fail("APPROVAL_SERVICE", "APPROVAL_ROUTING_OUTCOME_INVALID");
  }

  const outcome = outcomeValue as ApprovalOutcome;
  switch (outcome) {
    case "ALLOWED_ONCE":
      return approvalRoute("allow", outcome, "APPROVAL_ALLOWED_ONCE");
    case "REJECTED":
      return approvalRoute("deny", outcome, "APPROVAL_REJECTED");
    case "CANCELLED":
      return approvalRoute("deny", outcome, "APPROVAL_CANCELLED");
    case "UNAVAILABLE":
      return approvalRoute("deny", outcome, "APPROVAL_UNAVAILABLE");
  }
}

function materializePolicyFact(value: unknown): PolicyRoutingFact {
  if (!isRecord(value)) return policyInvalid();
  const keys = ownKeys(value);
  if (keys === undefined) return policyInvalid();

  const status = readData(value, "status");
  if (status.status !== "DATA") return policyInvalid();

  if (status.value === "FAIL_CLOSED") {
    if (!hasExactRequiredKeys(keys, POLICY_FAILURE_KEYS)) return policyInvalid();
    const effect = readData(value, "effect");
    const stage = readData(value, "stage");
    const reason = readData(value, "reasonCode");
    if (
      effect.status !== "DATA"
      || effect.value !== "deny"
      || stage.status !== "DATA"
      || typeof stage.value !== "string"
      || !POLICY_STAGES.has(stage.value as PolicyEvaluationStage)
      || reason.status !== "DATA"
      || typeof reason.value !== "string"
      || !POLICY_FAILURE_REASONS.has(reason.value as PolicyEvaluationFailureReason)
    ) {
      return policyInvalid();
    }
    return Object.freeze({
      status: "FAILURE",
      failure: fail("POLICY", reason.value as PolicyEvaluationFailureReason),
    });
  }

  if (status.value !== "EVALUATED" || !hasExactRequiredKeys(keys, POLICY_SUCCESS_KEYS)) {
    return policyInvalid();
  }

  const effect = readData(value, "effect");
  const basis = readData(value, "basis");
  const reason = readData(value, "reasonCode");
  if (
    effect.status !== "DATA"
    || basis.status !== "DATA"
    || reason.status !== "DATA"
    || typeof basis.value !== "string"
    || typeof reason.value !== "string"
    || !isCoherentPolicySuccess(effect.value, basis.value, reason.value)
  ) {
    return policyInvalid();
  }

  if (effect.value === "allow") return Object.freeze({ status: "ALLOW" });
  if (effect.value === "deny") return Object.freeze({ status: "DENY" });
  return Object.freeze({ status: "ASK" });
}

function isCoherentPolicySuccess(
  effect: unknown,
  basis: string,
  reasonCode: string,
): basis is PolicyEvaluationBasis {
  const pair = `${String(effect)}\u0000${basis}\u0000${reasonCode}`;
  return pair === "deny\u0000EXPLICIT_DENY\u0000POLICY_EXPLICIT_DENY"
    || pair === "deny\u0000DEFAULT_DENY\u0000POLICY_DEFAULT_DENY"
    || pair === "ask\u0000HIGHEST_BAND_ASK\u0000POLICY_HIGHEST_BAND_ASK"
    || pair === "allow\u0000HIGHEST_BAND_ALLOW\u0000POLICY_HIGHEST_BAND_ALLOW";
}

function materializeLeaseFact(value: unknown): LeaseRoutingFact {
  if (!isRecord(value)) return leaseInvalid();
  const keys = ownKeys(value);
  if (keys === undefined) return leaseInvalid();

  const status = readData(value, "status");
  if (status.status !== "DATA") return leaseInvalid();

  if (status.value === "FAIL_CLOSED") {
    if (!hasExactRequiredKeys(keys, LEASE_FAILURE_KEYS)) return leaseInvalid();
    const stage = readData(value, "stage");
    const reason = readData(value, "reasonCode");
    if (
      stage.status !== "DATA"
      || typeof stage.value !== "string"
      || !LEASE_STAGES.has(stage.value as LeaseLookupStage)
      || reason.status !== "DATA"
      || typeof reason.value !== "string"
      || !LEASE_FAILURE_REASONS.has(reason.value as LeaseLookupFailureReason)
    ) {
      return leaseInvalid();
    }
    return Object.freeze({
      status: "FAILURE",
      failure: fail("LEASE_LOOKUP", reason.value as LeaseLookupFailureReason),
    });
  }

  if (
    (status.value === "NO_CANDIDATE" || status.value === "CANDIDATES_FOUND")
    && hasExactRequiredKeys(keys, LEASE_SUCCESS_KEYS)
  ) {
    // Candidate refs are deliberately not read here. M4-022 owns candidate
    // identity validation; M4-023 only needs the successful lookup discriminant.
    return Object.freeze({ status: "SUCCESS" });
  }
  return leaseInvalid();
}

function materializeApprovalRequest(value: unknown): Readonly<ApprovalRoutingRequest> | undefined {
  if (!isRecord(value)) return undefined;
  const keys = ownKeys(value);
  if (
    keys === undefined
    || !hasOnlyAllowedStringKeys(keys, APPROVAL_REQUEST_KEYS)
    || !keys.includes("requestRef")
    || !keys.includes("actionRef")
  ) {
    return undefined;
  }

  const requestRef = readData(value, "requestRef");
  const actionRef = readData(value, "actionRef");
  if (
    requestRef.status !== "DATA"
    || !isBoundedString(requestRef.value, 1, REF_CODE_POINT_LIMIT)
    || actionRef.status !== "DATA"
    || !isBoundedString(actionRef.value, 1, REF_CODE_POINT_LIMIT)
  ) {
    return undefined;
  }

  if (!keys.includes("reason")) {
    return Object.freeze({
      requestRef: requestRef.value,
      actionRef: actionRef.value,
    });
  }

  const reason = readData(value, "reason");
  if (
    reason.status !== "DATA"
    || !isBoundedString(reason.value, 0, REASON_CODE_POINT_LIMIT)
  ) {
    return undefined;
  }
  return Object.freeze({
    requestRef: requestRef.value,
    actionRef: actionRef.value,
    reason: reason.value,
  });
}

function approvalRoute(
  effect: "allow" | "deny",
  approvalOutcome: ApprovalOutcome,
  reasonCode:
    | "APPROVAL_ALLOWED_ONCE"
    | "APPROVAL_REJECTED"
    | "APPROVAL_CANCELLED"
    | "APPROVAL_UNAVAILABLE",
): ApprovalRoutingResult {
  return Object.freeze({
    status: "ROUTED",
    effect,
    routeSource: "APPROVAL",
    reasonCode,
    approvalOutcome,
  });
}

function policyInvalid(): PolicyRoutingFact {
  return Object.freeze({
    status: "FAILURE",
    failure: fail("POLICY", "APPROVAL_ROUTING_POLICY_RESULT_INVALID"),
  });
}

function leaseInvalid(): LeaseRoutingFact {
  return Object.freeze({
    status: "FAILURE",
    failure: fail("LEASE_LOOKUP", "APPROVAL_ROUTING_LEASE_LOOKUP_RESULT_INVALID"),
  });
}

function fail(
  stage: ApprovalRoutingStage,
  reasonCode: ApprovalRoutingFailureReason,
): ApprovalRoutingFailure {
  return Object.freeze({ status: "FAIL_CLOSED", effect: "deny", stage, reasonCode });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null) return false;
  try {
    return !Array.isArray(value);
  } catch {
    return false;
  }
}

function ownKeys(value: object): readonly PropertyKey[] | undefined {
  try {
    return Reflect.ownKeys(value);
  } catch {
    return undefined;
  }
}

function hasExactRequiredKeys(keys: readonly PropertyKey[], expected: ReadonlySet<string>): boolean {
  return keys.length === expected.size && hasOnlyAllowedStringKeys(keys, expected);
}

function hasOnlyAllowedStringKeys(keys: readonly PropertyKey[], allowed: ReadonlySet<string>): boolean {
  return keys.every(key => typeof key === "string" && allowed.has(key));
}

function readData(value: object, key: PropertyKey): DataRead {
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(value, key);
  } catch {
    return { status: "UNREADABLE" };
  }
  if (descriptor === undefined) return { status: "MISSING" };
  if (!("value" in descriptor)) return { status: "ACCESSOR" };
  return { status: "DATA", value: descriptor.value };
}

function isBoundedString(
  value: unknown,
  minCodePoints: number,
  maxCodePoints: number,
): value is string {
  if (typeof value !== "string") return false;
  let count = 0;
  for (const _codePoint of value) {
    count += 1;
    if (count > maxCodePoints) return false;
  }
  return count >= minCodePoints;
}
