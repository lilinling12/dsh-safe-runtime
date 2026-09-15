import type { ResourceNormalizationFailureReason } from "./resource-normalization-types.js";

export interface ResourceSpecificity {
  readonly literalCodePoints: number;
  readonly globstarCount: number;
  readonly starCount: number;
}

export type RuleOrderingFailureReason =
  | ResourceNormalizationFailureReason
  | "RULE_ORDERING_INPUT_INVALID"
  | "RULE_ORDERING_DUPLICATE_RULE_ID"
  | "RESOURCE_PATTERN_SYNTAX_INVALID";

export interface RuleOrderingFailure {
  readonly ok: false;
  readonly reason: RuleOrderingFailureReason;
}

export interface ResourcePatternMatchSuccess {
  readonly ok: true;
  readonly matched: boolean;
  readonly specificity: ResourceSpecificity;
}

export type ResourcePatternMatchResult = ResourcePatternMatchSuccess | RuleOrderingFailure;

/**
 * Minimal structural projection used by M4-004. Effect/capability/subject data is
 * intentionally absent so ordering cannot accidentally become authorization.
 */
export interface RuleOrderingCandidate {
  readonly id: string;
  readonly resources: readonly string[];
  readonly priority?: number;
}

export interface RulePrecedenceBand {
  readonly specificity: ResourceSpecificity;
  readonly effectivePriority: number;
  readonly ruleIds: readonly string[];
}

export interface RuleOrderingSuccess {
  readonly ok: true;
  readonly bands: readonly RulePrecedenceBand[];
}

export type RuleOrderingResult = RuleOrderingSuccess | RuleOrderingFailure;
