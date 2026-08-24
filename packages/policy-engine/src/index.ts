/**
 * @dsh-safe/policy-engine public boundary.
 *
 * M4-001 document loading, M4-002 schema validation, M4-003 resource
 * normalization, M4-004 deterministic rule ordering and M4-005 deterministic
 * effect resolution are acceptance-audited. M4-006 defensive default-deny
 * finalization is in progress; full PDP evaluation remains intentionally absent.
 */
export const PACKAGE_STAGE = "M4-006-DEFAULT-DENY-IN-PROGRESS" as const;

export {
  loadPolicyDocument,
  type PolicyDocumentFormat,
  type PolicyDocumentLoadRequest,
} from "./policy-document-loader.js";
export {
  DEFAULT_POLICY_DOCUMENT_LOADER_LIMITS,
  type PolicyDocumentJsonValue,
  type PolicyDocumentLoaderLimits,
  type PolicyDocumentLoadFailure,
  type PolicyDocumentLoadFailureReason,
  type PolicyDocumentLoadResult,
  type PolicyDocumentLoadSuccess,
} from "./policy-document-types.js";
export {
  createCapabilityPolicySchemaValidator,
  type CapabilityPolicySchemaValidator,
} from "./capability-policy-schema-validator.js";
export {
  PolicySchemaConfigurationError,
  type PolicySchemaValidationFailure,
  type PolicySchemaValidationIssue,
  type PolicySchemaValidationResult,
  type PolicySchemaValidationSuccess,
  type ValidatedPolicyDocument,
} from "./policy-schema-types.js";
export {
  createTrustedCapabilityPolicySchemaGraph,
  type TrustedCapabilityPolicySchemaGraph,
} from "./trusted-policy-schema.js";
export {
  normalizeCapabilityResource,
  normalizePolicyResourceSelector,
} from "./resource-normalizer.js";
export {
  RESOURCE_STRING_CODE_POINT_LIMIT,
  type CanonicalResource,
  type CanonicalResourceScheme,
  type CanonicalResourceSelector,
  type ExactResourceNormalizationResult,
  type ExactResourceNormalizationSuccess,
  type ResourceNormalizationFailure,
  type ResourceNormalizationFailureReason,
  type ResourceNormalizationField,
  type ResourceSelectorNormalizationResult,
  type ResourceSelectorNormalizationSuccess,
} from "./resource-normalization-types.js";
export {
  compareResourceSpecificity,
  matchPolicyResourceSelector,
} from "./resource-pattern.js";
export {
  compareUnicodeCodePointStrings,
  orderRuleCandidatesForResource,
} from "./rule-ordering.js";
export {
  type ResourcePatternMatchResult,
  type ResourcePatternMatchSuccess,
  type ResourceSpecificity,
  type RuleOrderingCandidate,
  type RuleOrderingFailure,
  type RuleOrderingFailureReason,
  type RuleOrderingResult,
  type RuleOrderingSuccess,
  type RulePrecedenceBand,
} from "./rule-ordering-types.js";
export { resolveApplicableRuleEffects } from "./effect-resolution.js";
export {
  type ApplicableRuleEffect,
  type EffectResolutionFailure,
  type EffectResolutionFailureReason,
  type EffectResolutionResult,
  type EffectResolutionSuccess,
  type NoApplicableRulesResult,
  type PolicyRuleEffect,
  type ResolvedEffectResult,
} from "./effect-resolution-types.js";
export { finalizeDefaultDeny } from "./default-deny.js";
export {
  type DefaultDenyFailClosed,
  type DefaultDenyFailureReason,
  type DefaultDenyFinalized,
  type DefaultDenyResult,
} from "./default-deny-types.js";
