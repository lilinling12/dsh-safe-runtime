import type { CanonicalResource } from "./resource-normalization-types.js";
import type { ResolvedSubject } from "./subject-resolution-types.js";

export type PolicyEvaluationEffect = "deny" | "ask" | "allow";

export type PolicyEvaluationBasis =
  | "EXPLICIT_DENY"
  | "HIGHEST_BAND_ASK"
  | "HIGHEST_BAND_ALLOW"
  | "DEFAULT_DENY";

export type PolicyEvaluationReasonCode =
  | "POLICY_EXPLICIT_DENY"
  | "POLICY_HIGHEST_BAND_ASK"
  | "POLICY_HIGHEST_BAND_ALLOW"
  | "POLICY_DEFAULT_DENY";

export type PolicyEvaluationStage =
  | "INPUT"
  | "SUBJECT_SELECTOR"
  | "RESOURCE"
  | "CONSTRAINT"
  | "EFFECT"
  | "DEFAULT_DENY"
  | "EXPLAIN";

export type PolicyEvaluationFailureReason =
  | "POLICY_EVALUATION_INPUT_INVALID"
  | "POLICY_SUBJECT_SELECTOR_INVALID"
  | "POLICY_CONSTRAINT_PROFILE_UNSUPPORTED"
  | "RULE_ORDERING_DUPLICATE_RULE_ID"
  | "RULE_ORDERING_INPUT_INVALID"
  | "RESOURCE_PATTERN_SYNTAX_INVALID"
  | "RESOURCE_INPUT_INVALID"
  | "RESOURCE_SCHEME_INVALID"
  | "RESOURCE_LOCATOR_INVALID"
  | "RESOURCE_PROVIDER_IDENTITY_INVALID"
  | "RESOURCE_LIMIT_EXCEEDED"
  | "EFFECT_RESOLUTION_INPUT_INVALID"
  | "EFFECT_RESOLUTION_EFFECT_INVALID"
  | "EFFECT_RESOLUTION_RULE_SET_MISMATCH"
  | "EFFECT_RESOLUTION_BANDS_NONCANONICAL"
  | "DEFAULT_EFFECT_CONFIG_INVALID"
  | "DEFAULT_DENY_INPUT_INVALID"
  | "POLICY_EXPLAIN_INPUT_INVALID";

/**
 * Runtime projection accepted by M4-021.
 *
 * `policy` is intentionally typed as unknown at the public boundary because a
 * static TypeScript type is not an authorization boundary. Callers are expected
 * to pass the immutable snapshot already accepted by M4-002/M4-009; the
 * evaluator still materializes the policy-relevant subset defensively.
 */
export interface PolicyEvaluationInput {
  readonly policy: unknown;
  readonly subject: ResolvedSubject;
  readonly capability: string;
  readonly resource: CanonicalResource;
  readonly requestConstraints?: unknown;
}

export interface PolicyEvaluationSuccess {
  readonly ok: true;
  readonly status: "EVALUATED";
  readonly effect: PolicyEvaluationEffect;
  readonly basis: PolicyEvaluationBasis;
  readonly reasonCode: PolicyEvaluationReasonCode;
  readonly fullyApplicableRuleIds: readonly string[];
  readonly contributingRuleIds: readonly string[];
}

export interface PolicyEvaluationFailure {
  readonly ok: false;
  readonly status: "FAIL_CLOSED";
  readonly effect: "deny";
  readonly stage: PolicyEvaluationStage;
  readonly reasonCode: PolicyEvaluationFailureReason;
}

export type PolicyEvaluationResult = PolicyEvaluationSuccess | PolicyEvaluationFailure;
