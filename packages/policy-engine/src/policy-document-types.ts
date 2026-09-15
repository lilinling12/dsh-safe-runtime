export type PolicyDocumentJsonValue =
  | null
  | boolean
  | number
  | string
  | PolicyDocumentJsonValue[]
  | { [key: string]: PolicyDocumentJsonValue };

export type PolicyDocumentLoadFailureReason =
  | "POLICY_DOCUMENT_FORMAT_UNSUPPORTED"
  | "POLICY_DOCUMENT_SYNTAX_INVALID"
  | "POLICY_DOCUMENT_DUPLICATE_KEY"
  | "POLICY_DOCUMENT_MULTIPLE_DOCUMENTS"
  | "POLICY_DOCUMENT_YAML_ALIAS_FORBIDDEN"
  | "POLICY_DOCUMENT_YAML_TAG_FORBIDDEN"
  | "POLICY_DOCUMENT_YAML_MERGE_FORBIDDEN"
  | "POLICY_DOCUMENT_NON_STRING_KEY"
  | "POLICY_DOCUMENT_NON_JSON_VALUE"
  | "POLICY_DOCUMENT_LIMIT_EXCEEDED";

export interface PolicyDocumentLoaderLimits {
  readonly maxSourceBytes: number;
  readonly maxDepth: number;
  readonly maxContainerEntries: number;
}

export const DEFAULT_POLICY_DOCUMENT_LOADER_LIMITS: PolicyDocumentLoaderLimits =
  Object.freeze({
    maxSourceBytes: 1_048_576,
    maxDepth: 64,
    maxContainerEntries: 100_000,
  });

export interface PolicyDocumentLoadSuccess {
  readonly ok: true;
  readonly value: PolicyDocumentJsonValue;
}

export interface PolicyDocumentLoadFailure {
  readonly ok: false;
  readonly reason: PolicyDocumentLoadFailureReason;
  readonly detail?: string;
}

export type PolicyDocumentLoadResult =
  | PolicyDocumentLoadSuccess
  | PolicyDocumentLoadFailure;

export function loaderFailure(
  reason: PolicyDocumentLoadFailureReason,
  detail?: string,
): PolicyDocumentLoadFailure {
  return detail === undefined
    ? Object.freeze({ ok: false, reason })
    : Object.freeze({ ok: false, reason, detail });
}
