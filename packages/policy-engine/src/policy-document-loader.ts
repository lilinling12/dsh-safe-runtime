import { parseJsonPolicyDocument } from "./json-document-parser.js";
import {
  DEFAULT_POLICY_DOCUMENT_LOADER_LIMITS,
  loaderFailure,
  type PolicyDocumentLoaderLimits,
  type PolicyDocumentLoadResult,
} from "./policy-document-types.js";
import { parseYamlPolicyDocument } from "./yaml-document-parser.js";

export type PolicyDocumentFormat = "JSON" | "YAML";

export interface PolicyDocumentLoadRequest {
  readonly format: string;
  readonly source: string;
  readonly sourceRef?: string;
  readonly limits?: Partial<PolicyDocumentLoaderLimits>;
}

export function loadPolicyDocument(
  request: PolicyDocumentLoadRequest,
): PolicyDocumentLoadResult {
  const limits = resolveLimits(request.limits);

  switch (request.format) {
    case "JSON":
      return parseJsonPolicyDocument(request.source, limits);
    case "YAML":
      return parseYamlPolicyDocument(request.source, limits);
    default:
      return loaderFailure(
        "POLICY_DOCUMENT_FORMAT_UNSUPPORTED",
        `Unsupported policy document format ${JSON.stringify(request.format)}.`,
      );
  }
}

function resolveLimits(
  override: Partial<PolicyDocumentLoaderLimits> | undefined,
): PolicyDocumentLoaderLimits {
  const resolved: PolicyDocumentLoaderLimits = {
    maxSourceBytes:
      override?.maxSourceBytes ??
      DEFAULT_POLICY_DOCUMENT_LOADER_LIMITS.maxSourceBytes,
    maxDepth:
      override?.maxDepth ?? DEFAULT_POLICY_DOCUMENT_LOADER_LIMITS.maxDepth,
    maxContainerEntries:
      override?.maxContainerEntries ??
      DEFAULT_POLICY_DOCUMENT_LOADER_LIMITS.maxContainerEntries,
  };

  for (const [name, value] of Object.entries(resolved)) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RangeError(`${name} must be a positive safe integer.`);
    }
  }
  return Object.freeze(resolved);
}
