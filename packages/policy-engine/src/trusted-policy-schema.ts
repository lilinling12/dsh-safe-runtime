import { readFileSync } from "node:fs";
import type { AnySchemaObject } from "ajv";
import { PolicySchemaConfigurationError } from "./policy-schema-types.js";

const SCHEMA_DIRECTORY = new URL("../../../schemas/v1alpha1/", import.meta.url);

export interface TrustedCapabilityPolicySchemaGraph {
  readonly capabilityPolicy: AnySchemaObject;
  readonly definitions: AnySchemaObject;
}

/**
 * Loads only repository-controlled schema resources. Policy documents cannot
 * alter these URLs, request remote schemas, or inject an alternate schema graph.
 */
export function loadRepositoryCapabilityPolicySchemaGraph(): TrustedCapabilityPolicySchemaGraph {
  return Object.freeze({
    capabilityPolicy: loadTrustedSchema("capability-policy.schema.json"),
    definitions: loadTrustedSchema("defs.schema.json"),
  });
}

function loadTrustedSchema(fileName: string): AnySchemaObject {
  let source: string;
  try {
    source = readFileSync(new URL(fileName, SCHEMA_DIRECTORY), "utf8");
  } catch (error: unknown) {
    throw new PolicySchemaConfigurationError(
      `Unable to read trusted policy schema resource ${fileName}.`,
      { cause: error },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source) as unknown;
  } catch (error: unknown) {
    throw new PolicySchemaConfigurationError(
      `Trusted policy schema resource ${fileName} is not valid JSON.`,
      { cause: error },
    );
  }

  if (!isRecord(parsed)) {
    throw new PolicySchemaConfigurationError(
      `Trusted policy schema resource ${fileName} must contain a JSON object.`,
    );
  }
  if (typeof parsed["$id"] !== "string" || parsed["$id"].length === 0) {
    throw new PolicySchemaConfigurationError(
      `Trusted policy schema resource ${fileName} is missing a non-empty $id.`,
    );
  }
  if (parsed["$schema"] !== "https://json-schema.org/draft/2020-12/schema") {
    throw new PolicySchemaConfigurationError(
      `Trusted policy schema resource ${fileName} must declare JSON Schema Draft 2020-12.`,
    );
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
