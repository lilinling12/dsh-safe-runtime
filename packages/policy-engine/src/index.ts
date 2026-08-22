/**
 * @dsh-safe/policy-engine public boundary.
 *
 * M4-001 document loading and M4-002 schema validation are acceptance-audited.
 * Resource normalization, ordering and evaluation are intentionally absent until
 * their later governance gates are explicitly authorized.
 */
export const PACKAGE_STAGE = "M4-002-SCHEMA-VALIDATION-CONFORMANCE" as const;

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
