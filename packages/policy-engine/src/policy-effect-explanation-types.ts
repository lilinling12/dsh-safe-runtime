import type { DefaultDenyFailureReason } from "./default-deny-types.js";
import type {
  EffectResolutionFailureReason,
  PolicyRuleEffect,
} from "./effect-resolution-types.js";

export type PolicyEffectExplanationBasis =
  | "EXPLICIT_DENY"
  | "HIGHEST_BAND_ASK"
  | "HIGHEST_BAND_ALLOW"
  | "DEFAULT_DENY"
  | "FAIL_CLOSED";

export type PolicyEffectExplanationReasonCode =
  | "POLICY_EXPLICIT_DENY"
  | "POLICY_HIGHEST_BAND_ASK"
  | "POLICY_HIGHEST_BAND_ALLOW"
  | "POLICY_DEFAULT_DENY"
  | DefaultDenyFailureReason;

export type PolicyEffectExplainFailureReason =
  | "POLICY_EXPLAIN_INPUT_INVALID"
  | EffectResolutionFailureReason;

export interface PolicyEffectExplanation {
  readonly ok: true;
  readonly status: "EXPLAINED";
  readonly effect: PolicyRuleEffect;
  readonly basis: PolicyEffectExplanationBasis;
  readonly reasonCode: PolicyEffectExplanationReasonCode;
  readonly contributingRuleIds: readonly string[];
}

export interface PolicyEffectExplanationFailure {
  readonly ok: false;
  readonly status: "EXPLAIN_FAILED";
  readonly reasonCode: PolicyEffectExplainFailureReason;
}

export type PolicyEffectExplanationResult =
  | PolicyEffectExplanation
  | PolicyEffectExplanationFailure;
