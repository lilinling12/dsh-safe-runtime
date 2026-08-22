import type { AnySchemaObject } from "ajv";
import { PolicySchemaConfigurationError } from "./policy-schema-types.js";

const JSON_SCHEMA_2020_12 = "https://json-schema.org/draft/2020-12/schema";
const CAPABILITY_POLICY_SCHEMA_ID =
  "https://safe-runtime.dev/schema/v1alpha1/capability-policy.schema.json";
const DEFINITIONS_SCHEMA_ID =
  "https://safe-runtime.dev/schema/v1alpha1/defs.schema.json";

export interface TrustedCapabilityPolicySchemaGraph {
  readonly capabilityPolicy: AnySchemaObject;
  readonly definitions: AnySchemaObject;
}

/**
 * Establishes the trusted configuration boundary without performing filesystem
 * or network I/O. The caller is responsible for supplying repository-controlled
 * schema resources; untrusted policy input never reaches this seam.
 */
export function createTrustedCapabilityPolicySchemaGraph(
  capabilityPolicy: AnySchemaObject,
  definitions: AnySchemaObject,
): TrustedCapabilityPolicySchemaGraph {
  assertSchemaIdentity(
    capabilityPolicy,
    CAPABILITY_POLICY_SCHEMA_ID,
    "CapabilityPolicy",
  );
  assertSchemaIdentity(definitions, DEFINITIONS_SCHEMA_ID, "definitions");
  return Object.freeze({ capabilityPolicy, definitions });
}

function assertSchemaIdentity(
  schema: AnySchemaObject,
  expectedId: string,
  label: string,
): void {
  if (schema["$schema"] !== JSON_SCHEMA_2020_12) {
    throw new PolicySchemaConfigurationError(
      `Trusted ${label} schema must declare JSON Schema Draft 2020-12.`,
    );
  }
  if (schema["$id"] !== expectedId) {
    throw new PolicySchemaConfigurationError(
      `Trusted ${label} schema $id must be ${expectedId}.`,
    );
  }
}
