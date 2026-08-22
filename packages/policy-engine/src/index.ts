/**
 * @dsh-safe/policy-engine public boundary.
 *
 * The M4-001 document-loading surface is implemented and acceptance-audited.
 * Policy schema validation, normalization, ordering and evaluation remain later
 * explicit gates and are intentionally absent from this package surface.
 */
export const PACKAGE_STAGE = "M4-001-LOADER-CONFORMANCE" as const;

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
