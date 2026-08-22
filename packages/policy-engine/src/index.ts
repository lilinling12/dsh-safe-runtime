/**
 * @dsh-safe/policy-engine public boundary.
 *
 * M4-001 document loading, M4-002 schema validation and M4-003 resource
 * normalization are acceptance-audited. Matching, ordering and policy
 * evaluation remain intentionally absent until their later governance gates.
 */
export const PACKAGE_STAGE = "M4-003-RESOURCE-NORMALIZATION-CONFORMANCE" as const;

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
