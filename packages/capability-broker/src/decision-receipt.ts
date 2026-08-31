import type { GuaranteeLevel } from "@dsh-safe/protocol";

import type {
  ApprovalOutcome,
  ApprovalRoutingFailureReason,
  ApprovalRoutingStage,
} from "./approval-routing-types.js";
import type {
  ConstructedCapabilityDecision,
  ConstructedCapabilityReceipt,
  DecisionReceiptConstructionResult,
  DecisionReceiptDecisionReasonCode,
  DecisionReceiptFailure,
  DecisionReceiptFailureReason,
  DecisionReceiptStage,
} from "./decision-receipt-types.js";

const REF_CODE_POINT_LIMIT = 512;

const INPUT_KEYS = new Set(["routing", "issuance"]);
const POLICY_ROUTE_KEYS = new Set(["status", "effect", "routeSource", "reasonCode"]);
const APPROVAL_ROUTE_KEYS = new Set([
  "status",
  "effect",
  "routeSource",
  "reasonCode",
  "approvalOutcome",
]);
const ROUTING_FAILURE_KEYS = new Set(["status", "effect", "stage", "reasonCode"]);
const ISSUANCE_KEYS = new Set([
  "requestRef",
  "decisionRef",
  "receiptRef",
  "guaranteeLevel",
  "decidedAt",
  "observedAt",
]);

const GUARANTEE_LEVELS = new Set<GuaranteeLevel>([
  "advisory",
  "tool-enforced",
  "provider-enforced",
  "process-isolated",
]);
const APPROVAL_OUTCOMES = new Set<ApprovalOutcome>([
  "ALLOWED_ONCE",
  "REJECTED",
  "CANCELLED",
  "UNAVAILABLE",
]);
const ROUTING_FAILURE_STAGES = new Set<ApprovalRoutingStage>([
  "INPUT",
  "POLICY",
  "LEASE_LOOKUP",
  "APPROVAL_REQUEST",
  "APPROVAL_SERVICE",
]);
const ROUTING_FAILURE_REASONS = new Set<ApprovalRoutingFailureReason>([
  "APPROVAL_ROUTING_INPUT_INVALID",
  "APPROVAL_ROUTING_POLICY_RESULT_INVALID",
  "APPROVAL_ROUTING_LEASE_LOOKUP_RESULT_INVALID",
  "APPROVAL_ROUTING_REQUEST_INVALID",
  "APPROVAL_ROUTING_SERVICE_ERROR",
  "APPROVAL_ROUTING_OUTCOME_INVALID",
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
  "LEASE_LOOKUP_INPUT_INVALID",
  "LEASE_LOOKUP_SUBJECT_INVALID",
  "LEASE_LOOKUP_SNAPSHOT_INVALID",
  "LEASE_LOOKUP_LEASE_REF_INVALID",
  "LEASE_LOOKUP_SUBJECT_REF_INVALID",
  "LEASE_LOOKUP_CAPABILITY_INVALID",
  "LEASE_LOOKUP_DUPLICATE_LEASE_REF",
  "LEASE_CONSTRAINT_PROFILE_UNSUPPORTED",
]);

type DataRead =
  | { readonly status: "DATA"; readonly value: unknown }
  | { readonly status: "MISSING" | "ACCESSOR" | "UNREADABLE" };

type MaterializedRouting = {
  readonly decisionEffect: "allow" | "deny";
  readonly receiptEffect: "allowed" | "denied" | "error";
  readonly reasonCode: DecisionReceiptDecisionReasonCode;
};

type MaterializedIssuance = {
  readonly requestRef: string;
  readonly decisionRef: string;
  readonly receiptRef: string;
  readonly guaranteeLevel: GuaranteeLevel;
  readonly decidedAt: string;
  readonly observedAt: string;
};

/**
 * Construct the immutable M4-024 CapabilityDecision / broker decision-Receipt
 * pair from an already-final M4-023 routing fact.
 *
 * This function is intentionally synchronous and side-effect free: identifiers,
 * timestamps and guarantee level are explicit inputs. It does not call approval,
 * read host time/randomness, inspect Lease state, execute an action or persist
 * records.
 */
export function constructCapabilityDecisionReceipt(
  input: unknown,
): DecisionReceiptConstructionResult {
  if (!isRecord(input)) return fail("INPUT", "DECISION_RECEIPT_INPUT_INVALID");

  const inputKeys = ownKeys(input);
  if (inputKeys === undefined || !hasExactRequiredKeys(inputKeys, INPUT_KEYS)) {
    return fail("INPUT", "DECISION_RECEIPT_INPUT_INVALID");
  }

  const routingRead = readData(input, "routing");
  if (routingRead.status !== "DATA") {
    return fail("ROUTING", "DECISION_RECEIPT_ROUTING_INVALID");
  }
  const routing = materializeRouting(routingRead.value);
  if (routing === undefined) {
    return fail("ROUTING", "DECISION_RECEIPT_ROUTING_INVALID");
  }

  const issuanceRead = readData(input, "issuance");
  if (issuanceRead.status !== "DATA") {
    return fail("ISSUANCE", "DECISION_RECEIPT_ISSUANCE_INVALID");
  }
  const issuance = materializeIssuance(issuanceRead.value);
  if ("reasonCode" in issuance) return issuance;

  const decision: ConstructedCapabilityDecision = Object.freeze({
    apiVersion: "safe-runtime.dev/v1alpha1",
    kind: "CapabilityDecision",
    decisionId: issuance.decisionRef,
    requestId: issuance.requestRef,
    effect: routing.decisionEffect,
    guaranteeLevel: issuance.guaranteeLevel,
    reasonCode: routing.reasonCode,
    decidedAt: issuance.decidedAt,
  });
  const receipt: ConstructedCapabilityReceipt = Object.freeze({
    apiVersion: "safe-runtime.dev/v1alpha1",
    kind: "CapabilityReceipt",
    receiptRef: issuance.receiptRef,
    requestRef: issuance.requestRef,
    decisionRef: issuance.decisionRef,
    effect: routing.receiptEffect,
    guaranteeLevel: issuance.guaranteeLevel,
    observedAt: issuance.observedAt,
  });

  return Object.freeze({
    status: "CONSTRUCTED",
    decision,
    receipt,
  });
}

function materializeRouting(value: unknown): MaterializedRouting | undefined {
  if (!isRecord(value)) return undefined;
  const keys = ownKeys(value);
  if (keys === undefined) return undefined;

  const status = readData(value, "status");
  if (status.status !== "DATA") return undefined;

  if (status.value === "FAIL_CLOSED") {
    if (!hasExactRequiredKeys(keys, ROUTING_FAILURE_KEYS)) return undefined;

    const effect = readData(value, "effect");
    const stage = readData(value, "stage");
    const reason = readData(value, "reasonCode");
    if (
      effect.status !== "DATA"
      || effect.value !== "deny"
      || stage.status !== "DATA"
      || typeof stage.value !== "string"
      || !ROUTING_FAILURE_STAGES.has(stage.value as ApprovalRoutingStage)
      || reason.status !== "DATA"
      || typeof reason.value !== "string"
      || !ROUTING_FAILURE_REASONS.has(reason.value as ApprovalRoutingFailureReason)
    ) {
      return undefined;
    }

    return Object.freeze({
      decisionEffect: "deny",
      receiptEffect: "error",
      reasonCode: reason.value as ApprovalRoutingFailureReason,
    });
  }

  if (status.value !== "ROUTED") return undefined;

  const source = readData(value, "routeSource");
  if (source.status !== "DATA") return undefined;

  if (source.value === "POLICY") {
    if (!hasExactRequiredKeys(keys, POLICY_ROUTE_KEYS)) return undefined;
    return materializePolicyRoute(value);
  }
  if (source.value === "APPROVAL") {
    if (!hasExactRequiredKeys(keys, APPROVAL_ROUTE_KEYS)) return undefined;
    return materializeApprovalRoute(value);
  }
  return undefined;
}

function materializePolicyRoute(value: object): MaterializedRouting | undefined {
  const effect = readData(value, "effect");
  const reason = readData(value, "reasonCode");
  if (effect.status !== "DATA" || reason.status !== "DATA") return undefined;

  if (
    effect.value === "allow"
    && reason.value === "APPROVAL_NOT_REQUIRED_POLICY_ALLOW"
  ) {
    return Object.freeze({
      decisionEffect: "allow",
      receiptEffect: "allowed",
      reasonCode: "APPROVAL_NOT_REQUIRED_POLICY_ALLOW",
    });
  }
  if (
    effect.value === "deny"
    && reason.value === "APPROVAL_NOT_REQUIRED_POLICY_DENY"
  ) {
    return Object.freeze({
      decisionEffect: "deny",
      receiptEffect: "denied",
      reasonCode: "APPROVAL_NOT_REQUIRED_POLICY_DENY",
    });
  }
  return undefined;
}

function materializeApprovalRoute(value: object): MaterializedRouting | undefined {
  const effect = readData(value, "effect");
  const reason = readData(value, "reasonCode");
  const outcome = readData(value, "approvalOutcome");
  if (
    effect.status !== "DATA"
    || reason.status !== "DATA"
    || outcome.status !== "DATA"
    || typeof outcome.value !== "string"
    || !APPROVAL_OUTCOMES.has(outcome.value as ApprovalOutcome)
  ) {
    return undefined;
  }

  if (
    effect.value === "allow"
    && reason.value === "APPROVAL_ALLOWED_ONCE"
    && outcome.value === "ALLOWED_ONCE"
  ) {
    return Object.freeze({
      decisionEffect: "allow",
      receiptEffect: "allowed",
      reasonCode: "APPROVAL_ALLOWED_ONCE",
    });
  }
  if (
    effect.value === "deny"
    && reason.value === "APPROVAL_REJECTED"
    && outcome.value === "REJECTED"
  ) {
    return approvalDeny("APPROVAL_REJECTED");
  }
  if (
    effect.value === "deny"
    && reason.value === "APPROVAL_CANCELLED"
    && outcome.value === "CANCELLED"
  ) {
    return approvalDeny("APPROVAL_CANCELLED");
  }
  if (
    effect.value === "deny"
    && reason.value === "APPROVAL_UNAVAILABLE"
    && outcome.value === "UNAVAILABLE"
  ) {
    return approvalDeny("APPROVAL_UNAVAILABLE");
  }
  return undefined;
}

function approvalDeny(
  reasonCode: "APPROVAL_REJECTED" | "APPROVAL_CANCELLED" | "APPROVAL_UNAVAILABLE",
): MaterializedRouting {
  return Object.freeze({
    decisionEffect: "deny",
    receiptEffect: "denied",
    reasonCode,
  });
}

function materializeIssuance(
  value: unknown,
): MaterializedIssuance | DecisionReceiptFailure {
  if (!isRecord(value)) return fail("ISSUANCE", "DECISION_RECEIPT_ISSUANCE_INVALID");

  const keys = ownKeys(value);
  if (keys === undefined || !hasExactRequiredKeys(keys, ISSUANCE_KEYS)) {
    return fail("ISSUANCE", "DECISION_RECEIPT_ISSUANCE_INVALID");
  }

  const requestRef = readData(value, "requestRef");
  if (
    requestRef.status !== "DATA"
    || !isBoundedString(requestRef.value, 1, REF_CODE_POINT_LIMIT)
  ) {
    return fail("ISSUANCE", "DECISION_RECEIPT_REQUEST_REF_INVALID");
  }

  const decisionRef = readData(value, "decisionRef");
  if (
    decisionRef.status !== "DATA"
    || !isBoundedString(decisionRef.value, 1, REF_CODE_POINT_LIMIT)
  ) {
    return fail("ISSUANCE", "DECISION_RECEIPT_DECISION_REF_INVALID");
  }

  const receiptRef = readData(value, "receiptRef");
  if (
    receiptRef.status !== "DATA"
    || !isBoundedString(receiptRef.value, 1, REF_CODE_POINT_LIMIT)
  ) {
    return fail("ISSUANCE", "DECISION_RECEIPT_RECEIPT_REF_INVALID");
  }

  const guarantee = readData(value, "guaranteeLevel");
  if (
    guarantee.status !== "DATA"
    || typeof guarantee.value !== "string"
    || !GUARANTEE_LEVELS.has(guarantee.value as GuaranteeLevel)
  ) {
    return fail("ISSUANCE", "DECISION_RECEIPT_GUARANTEE_INVALID");
  }

  const decidedAt = readData(value, "decidedAt");
  if (
    decidedAt.status !== "DATA"
    || typeof decidedAt.value !== "string"
    || !isRfc3339DateTime(decidedAt.value)
  ) {
    return fail("ISSUANCE", "DECISION_RECEIPT_DECIDED_AT_INVALID");
  }

  const observedAt = readData(value, "observedAt");
  if (
    observedAt.status !== "DATA"
    || typeof observedAt.value !== "string"
    || !isRfc3339DateTime(observedAt.value)
  ) {
    return fail("ISSUANCE", "DECISION_RECEIPT_OBSERVED_AT_INVALID");
  }

  return Object.freeze({
    requestRef: requestRef.value,
    decisionRef: decisionRef.value,
    receiptRef: receiptRef.value,
    guaranteeLevel: guarantee.value as GuaranteeLevel,
    decidedAt: decidedAt.value,
    observedAt: observedAt.value,
  });
}

/**
 * Deterministic RFC 3339 date-time validation for the protocol timestamp shape.
 *
 * This deliberately avoids `Date.parse()` and locale APIs. Calendar validity is
 * checked explicitly; UTC offsets are syntax/range checked but timestamps are
 * preserved byte-for-byte rather than normalized to a host timezone.
 */
function isRfc3339DateTime(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (match === null) return false;

  const year = decimal(match[1]);
  const month = decimal(match[2]);
  const day = decimal(match[3]);
  const hour = decimal(match[4]);
  const minute = decimal(match[5]);
  const second = decimal(match[6]);
  if (
    year === undefined
    || month === undefined
    || day === undefined
    || hour === undefined
    || minute === undefined
    || second === undefined
    || month < 1
    || month > 12
    || day < 1
    || day > daysInMonth(year, month)
    || hour > 23
    || minute > 59
    || second > 60
  ) {
    return false;
  }

  if (match[8] === undefined) return true;
  const offsetHour = decimal(match[9]);
  const offsetMinute = decimal(match[10]);
  return (
    offsetHour !== undefined
    && offsetMinute !== undefined
    && offsetHour <= 23
    && offsetMinute <= 59
  );
}

function decimal(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  let result = 0;
  for (const codeUnit of value) {
    const digit = codeUnit.charCodeAt(0) - 48;
    if (digit < 0 || digit > 9) return undefined;
    result = (result * 10) + digit;
  }
  return result;
}

function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function fail(
  stage: DecisionReceiptStage,
  reasonCode: DecisionReceiptFailureReason,
): DecisionReceiptFailure {
  return Object.freeze({ status: "FAIL_CLOSED", stage, reasonCode });
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

function hasExactRequiredKeys(
  keys: readonly PropertyKey[],
  expected: ReadonlySet<string>,
): boolean {
  return keys.length === expected.size && keys.every(
    key => typeof key === "string" && expected.has(key),
  );
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
