/**
 * @dsh-safe/policy-engine public boundary.
 *
 * M4-001 through M4-008 are acceptance-audited and governance-closed. M4-009
 * atomic policy hot reload is in implementation conformance; full PDP evaluation,
 * tool classification, durable provenance and later gates remain unauthorized.
 */
export const PACKAGE_STAGE = "M4-009-HOT-RELOAD-IN-PROGRESS" as const;

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
export { explainPolicyEffect } from "./policy-effect-explanation.js";
export {
  type PolicyEffectExplainFailureReason,
  type PolicyEffectExplanation,
  type PolicyEffectExplanationBasis,
  type PolicyEffectExplanationFailure,
  type PolicyEffectExplanationReasonCode,
  type PolicyEffectExplanationResult,
} from "./policy-effect-explanation-types.js";
export { diagnoseCapabilityPolicy } from "./policy-diagnostics.js";
export {
  POLICY_DIAGNOSTICS_LIMIT,
  type PolicyDiagnostic,
  type PolicyDiagnosticCode,
  type PolicyDiagnosticSeverity,
  type PolicyDiagnosticsFailure,
  type PolicyDiagnosticsResult,
  type PolicyDiagnosticsSuccess,
} from "./policy-diagnostics-types.js";
export { createCapabilityPolicyHotReloadStore } from "./policy-hot-reload.js";
export {
  POLICY_RELOAD_MAX_EPOCH,
  type CapabilityPolicyHotReloadStore,
  type PolicyHotReloadActiveState,
  type PolicyHotReloadEmptyState,
  type PolicyHotReloadState,
  type PolicyReloadFailure,
  type PolicyReloadFailureReason,
  type PolicyReloadFailureStage,
  type PolicyReloadRequest,
  type PolicyReloadResourceFailureReason,
  type PolicyReloadResult,
  type PolicyReloadSuccess,
} from "./policy-hot-reload-types.js";
