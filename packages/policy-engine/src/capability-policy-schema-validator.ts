import Ajv2020, {
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { PolicyDocumentJsonValue } from "./policy-document-types.js";
import {
  PolicySchemaConfigurationError,
  cloneValidatedPolicyDocument,
  policySchemaFailure,
  type PolicySchemaValidationIssue,
  type PolicySchemaValidationResult,
} from "./policy-schema-types.js";
import {
  loadRepositoryCapabilityPolicySchemaGraph,
  type TrustedCapabilityPolicySchemaGraph,
} from "./trusted-policy-schema.js";

const CAPABILITY_POLICY_SCHEMA_ID =
  "https://safe-runtime.dev/schema/v1alpha1/capability-policy.schema.json";

const validateSchema = compileCapabilityPolicySchemaValidator(
  loadRepositoryCapabilityPolicySchemaGraph(),
);

/**
 * Validates an already-loaded M4-001 JSON value without coercion or defaults.
 * A successful result contains a detached recursively frozen snapshot so the
 * validated policy cannot be changed by mutating the original loader value.
 */
export function validateCapabilityPolicyDocument(
  value: PolicyDocumentJsonValue,
): PolicySchemaValidationResult {
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
}

/**
 * Package-private construction seam used by conformance tests to prove trusted
 * schema initialization fails closed. Production callers use the module-level
 * validator compiled from repository-controlled resources.
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
    addFormats(ajv);
    ajv.addSchema(graph.definitions);
    const validator = ajv.compile<PolicyDocumentJsonValue>(graph.capabilityPolicy);

    if (validator.schema["$id"] !== CAPABILITY_POLICY_SCHEMA_ID) {
      throw new PolicySchemaConfigurationError(
        `CapabilityPolicy schema $id must be ${CAPABILITY_POLICY_SCHEMA_ID}.`,
      );
    }
    return validator;
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
  const issues = errors.map(error => {
    const instancePath = normalizeInstancePath(error);
    return Object.freeze({
      instancePath,
      keyword: error.keyword,
      schemaPath: error.schemaPath,
    });
  });

  issues.sort(compareIssues);
  return Object.freeze(issues);
}

function normalizeInstancePath(error: ErrorObject): string {
  if (error.keyword === "required") {
    const missingProperty = getErrorParam(error.params, "missingProperty");
    return appendJsonPointerSegment(error.instancePath, missingProperty);
  }
  if (error.keyword === "additionalProperties") {
    const additionalProperty = getErrorParam(error.params, "additionalProperty");
    return appendJsonPointerSegment(error.instancePath, additionalProperty);
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
