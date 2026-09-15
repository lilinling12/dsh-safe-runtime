import type { ResourceNormalizationFailureReason } from "./resource-normalization-types.js";

export const POLICY_DIAGNOSTICS_LIMIT = 256 as const;

export type PolicyDiagnosticSeverity = "ERROR" | "WARNING" | "INFO";

export type PolicyDiagnosticCode =
  | Exclude<
      ResourceNormalizationFailureReason,
      "RESOURCE_INPUT_INVALID" | "RESOURCE_PROVIDER_IDENTITY_INVALID"
    >
  | "RESOURCE_PATTERN_SYNTAX_INVALID"
  | "POLICY_DIAGNOSTIC_DUPLICATE_RULE_ID"
  | "POLICY_DIAGNOSTIC_REDUNDANT_DENY_PRIORITY"
  | "POLICY_DIAGNOSTIC_REDUNDANT_ZERO_PRIORITY"
  | "POLICY_DIAGNOSTIC_EMPTY_RULE_SET";

export interface PolicyDiagnostic {
  readonly severity: PolicyDiagnosticSeverity;
  readonly code: PolicyDiagnosticCode;
  readonly instancePath: string;
  readonly relatedPaths?: readonly string[];
}

export interface PolicyDiagnosticsSuccess {
  readonly ok: true;
  readonly status: "DIAGNOSED";
  readonly diagnostics: readonly PolicyDiagnostic[];
  readonly truncated: boolean;
}

export interface PolicyDiagnosticsFailure {
  readonly ok: false;
  readonly status: "DIAGNOSTICS_FAILED";
  readonly reason: "POLICY_DIAGNOSTICS_INPUT_INVALID";
}

export type PolicyDiagnosticsResult =
  | PolicyDiagnosticsSuccess
  | PolicyDiagnosticsFailure;
