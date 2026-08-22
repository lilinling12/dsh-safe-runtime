import {
  Ajv2020,
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020.js";
import type { PolicyDocumentJsonValue } from "./policy-document-types.js";
import {
  PolicySchemaConfigurationError,
  cloneValidatedPolicyDocument,
  policySchemaFailure,
  type PolicySchemaValidationIssue,
  type PolicySchemaValidationResult,
} from "./policy-schema-types.js";
import type { TrustedCapabilityPolicySchemaGraph } from "./trusted-policy-schema.js";

export type CapabilityPolicySchemaValidator = (
  value: PolicyDocumentJsonValue,
) => PolicySchemaValidationResult;

/**
 * Compiles trusted repository-controlled schemas once and returns a pure
 * validation boundary for M4-001 values. The returned function performs no I/O,
 * schema fetching, coercion, default insertion, or normalization.
 */
export function createCapabilityPolicySchemaValidator(
  graph: TrustedCapabilityPolicySchemaGraph,
): CapabilityPolicySchemaValidator {
  const validateSchema = compileCapabilityPolicySchemaValidator(graph);

  return (value: PolicyDocumentJsonValue): PolicySchemaValidationResult => {
    const valid = validateSchema(value);
    if (valid) {
      return Object.freeze({
        ok: true as const,
        value: cloneValidatedPolicyDocument(value),
      });
    }

    const errors = validateSchema.errors;
    if (errors === null || errors === undefined || errors.length === 0) {
      throw new PolicySchemaConfigurationError(
        "CapabilityPolicy schema rejected a document without validation errors.",
      );
    }

    return policySchemaFailure(normalizeValidationIssues(errors));
  };
}

/**
 * Lower-level compile seam retained for configuration-failure conformance tests.
 * Production code should normally use createCapabilityPolicySchemaValidator().
 */
export function compileCapabilityPolicySchemaValidator(
  graph: TrustedCapabilityPolicySchemaGraph,
): ValidateFunction<PolicyDocumentJsonValue> {
  try {
    const ajv = new Ajv2020({
      allErrors: true,
      coerceTypes: false,
      removeAdditional: false,
      strict: true,
      useDefaults: false,
      validateSchema: true,
    });
    ajv.addSchema(graph.definitions);
    return ajv.compile<PolicyDocumentJsonValue>(graph.capabilityPolicy);
  } catch (error: unknown) {
    if (error instanceof PolicySchemaConfigurationError) {
      throw error;
    }
    throw new PolicySchemaConfigurationError(
      "Unable to initialize the trusted CapabilityPolicy Draft 2020-12 schema graph.",
      { cause: error },
    );
  }
}

function normalizeValidationIssues(
  errors: readonly ErrorObject[],
): readonly PolicySchemaValidationIssue[] {
  const issues = errors.map(error =>
    Object.freeze({
      instancePath: normalizeInstancePath(error),
      keyword: error.keyword,
      schemaPath: error.schemaPath,
    }),
  );

  issues.sort(compareIssues);
  return Object.freeze(issues);
}

function normalizeInstancePath(error: ErrorObject): string {
  if (error.keyword === "required") {
    return appendJsonPointerSegment(
      error.instancePath,
      getErrorParam(error.params, "missingProperty"),
    );
  }
  if (error.keyword === "additionalProperties") {
    return appendJsonPointerSegment(
      error.instancePath,
      getErrorParam(error.params, "additionalProperty"),
    );
  }
  return error.instancePath;
}

function getErrorParam(params: unknown, name: string): string {
  if (!isRecord(params) || typeof params[name] !== "string") {
    throw new PolicySchemaConfigurationError(
      `JSON Schema validator did not provide required ${name} diagnostic metadata.`,
    );
  }
  return params[name];
}

function appendJsonPointerSegment(base: string, segment: string): string {
  const escaped = segment.replaceAll("~", "~0").replaceAll("/", "~1");
  return `${base}/${escaped}`;
}

function compareIssues(
  left: PolicySchemaValidationIssue,
  right: PolicySchemaValidationIssue,
): number {
  return (
    compareText(left.instancePath, right.instancePath) ||
    compareText(left.keyword, right.keyword) ||
    compareText(left.schemaPath, right.schemaPath)
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
