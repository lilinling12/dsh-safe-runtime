export type PolicyRuleEffect = "deny" | "ask" | "allow";

export type EffectResolutionFailureReason =
  | "EFFECT_RESOLUTION_INPUT_INVALID"
  | "EFFECT_RESOLUTION_EFFECT_INVALID"
  | "EFFECT_RESOLUTION_RULE_SET_MISMATCH"
  | "EFFECT_RESOLUTION_BANDS_NONCANONICAL";

export interface ApplicableRuleEffect {
  readonly ruleId: string;
  readonly effect: PolicyRuleEffect;
}

export interface EffectResolutionFailure {
  readonly ok: false;
  readonly reason: EffectResolutionFailureReason;
}

export interface ResolvedEffectResult {
  readonly ok: true;
  readonly status: "RESOLVED";
  readonly effect: PolicyRuleEffect;
}

export interface NoApplicableRulesResult {
  readonly ok: true;
  readonly status: "NO_APPLICABLE_RULES";
}

export type EffectResolutionSuccess = ResolvedEffectResult | NoApplicableRulesResult;
export type EffectResolutionResult = EffectResolutionSuccess | EffectResolutionFailure;
