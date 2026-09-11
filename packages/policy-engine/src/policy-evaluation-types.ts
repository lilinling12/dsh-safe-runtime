import type { DefaultDenyFailureReason } from "./default-deny-types.js";
import type { EffectResolutionFailureReason } from "./effect-resolution-types.js";
import type { PolicyEffectExplainFailureReason } from "./policy-effect-explanation-types.js";
import type {
  CanonicalResource,
  ResourceNormalizationFailureReason,
} from "./resource-normalization-types.js";
import type { RuleOrderingFailureReason } from "./rule-ordering-types.js";
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
  | RuleOrderingFailureReason
  | ResourceNormalizationFailureReason
  | EffectResolutionFailureReason
  | DefaultDenyFailureReason
  | PolicyEffectExplainFailureReason;

/**
 * Runtime projection accepted by M4-021.
 *
 * `policy` remains unknown at the public boundary because a static TypeScript
 * annotation is not an authorization boundary. Callers are expected to provide
 * the immutable snapshot accepted by M4-002/M4-009; the evaluator still
 * materializes the policy-relevant subset defensively before composing it.
 */
export interface PolicyEvaluationInput {
  readonly policy: unknown;
  readonly subject: ResolvedSubject;
  readonly capability: string;
  readonly resource: CanonicalResource;
  readonly requestConstraints?: unknown;
}

/** Portable Spec 0032 success projection. `status` is the discriminant. */
export interface PolicyEvaluationSuccess {
  readonly status: "EVALUATED";
  readonly effect: PolicyEvaluationEffect;
  readonly basis: PolicyEvaluationBasis;
  readonly reasonCode: PolicyEvaluationReasonCode;
  readonly fullyApplicableRuleIds: readonly string[];
  readonly contributingRuleIds: readonly string[];
}

/** Portable Spec 0032 fail-closed projection. `status` is the discriminant. */
export interface PolicyEvaluationFailure {
  readonly status: "FAIL_CLOSED";
  readonly effect: "deny";
  readonly stage: PolicyEvaluationStage;
  readonly reasonCode: PolicyEvaluationFailureReason;
}

export type PolicyEvaluationResult = PolicyEvaluationSuccess | PolicyEvaluationFailure;
