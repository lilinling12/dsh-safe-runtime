import type { PolicyDocumentJsonValue } from "./policy-document-types.js";

/**
 * Recursively immutable representation of a loader-compatible JSON value.
 *
 * M4-002 returns this shape only after the complete CapabilityPolicy schema
 * graph accepts the input. It intentionally does not encode M4-003+ policy
 * semantics in TypeScript types.
 */
export type ValidatedPolicyDocument =
  | null
  | boolean
  | number
  | string
  | readonly ValidatedPolicyDocument[]
  | { readonly [key: string]: ValidatedPolicyDocument };

export interface PolicySchemaValidationIssue {
  readonly instancePath: string;
  readonly keyword: string;
  readonly schemaPath: string;
}

export interface PolicySchemaValidationSuccess {
  readonly ok: true;
  readonly value: ValidatedPolicyDocument;
}

export interface PolicySchemaValidationFailure {
  readonly ok: false;
  readonly reason: "POLICY_SCHEMA_INVALID";
  readonly issues: readonly PolicySchemaValidationIssue[];
}

export type PolicySchemaValidationResult =
  | PolicySchemaValidationSuccess
  | PolicySchemaValidationFailure;

/**
 * Signals trusted schema-graph/configuration failure, never untrusted policy
 * invalidity. Callers must fail closed rather than translating this into valid.
 */
export class PolicySchemaConfigurationError extends Error {
  public readonly code = "POLICY_SCHEMA_CONFIGURATION_ERROR" as const;

  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PolicySchemaConfigurationError";
  }
}

export function policySchemaFailure(
  issues: readonly PolicySchemaValidationIssue[],
): PolicySchemaValidationFailure {
  if (issues.length === 0) {
    throw new PolicySchemaConfigurationError(
      "Schema validation failed without a portable validation issue.",
    );
  }
  return Object.freeze({
    ok: false as const,
    reason: "POLICY_SCHEMA_INVALID" as const,
    issues: Object.freeze([...issues]),
  });
}

export function cloneValidatedPolicyDocument(
  value: PolicyDocumentJsonValue,
): ValidatedPolicyDocument {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return Object.freeze(value.map(item => cloneValidatedPolicyDocument(item)));
  }

  const entries = Object.entries(value).map(
    ([key, item]) => [key, cloneValidatedPolicyDocument(item)] as const,
  );
  return Object.freeze(
    Object.fromEntries(entries) as {
      readonly [key: string]: ValidatedPolicyDocument;
    },
  );
}
