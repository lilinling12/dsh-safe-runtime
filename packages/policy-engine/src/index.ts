/**
 * @dsh-safe/policy-engine package boundary.
 *
 * M4-001 is intentionally being implemented parser-first. Public policy
 * evaluation APIs remain deferred until their explicit roadmap gates.
 */
export const PACKAGE_STAGE = "M4-001-IN-PROGRESS" as const;

export {
  DEFAULT_POLICY_DOCUMENT_LOADER_LIMITS,
  type PolicyDocumentJsonValue,
  type PolicyDocumentLoaderLimits,
  type PolicyDocumentLoadFailure,
  type PolicyDocumentLoadFailureReason,
  type PolicyDocumentLoadResult,
  type PolicyDocumentLoadSuccess,
} from "./policy-document-types.js";
