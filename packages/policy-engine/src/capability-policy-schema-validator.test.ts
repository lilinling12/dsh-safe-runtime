import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AnySchemaObject } from "ajv";
import { describe, expect, test } from "vitest";
import { loadPolicyDocument } from "./policy-document-loader.js";
import {
  compileCapabilityPolicySchemaValidator,
  createCapabilityPolicySchemaValidator,
  type CapabilityPolicySchemaValidator,
} from "./capability-policy-schema-validator.js";
import {
  PolicySchemaConfigurationError,
  type PolicySchemaValidationIssue,
  type ValidatedPolicyDocument,
} from "./policy-schema-types.js";
import {
  createTrustedCapabilityPolicySchemaGraph,
  type TrustedCapabilityPolicySchemaGraph,
} from "./trusted-policy-schema.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixtureRoot = resolve(root, "fixtures/policy-schema");
const schemaRoot = resolve(root, "schemas/v1alpha1");

interface SchemaFixtureExpectedIssue {
  readonly instancePath: string;
  readonly keyword: string;
}

interface SchemaFixtureCase {
  readonly id: string;
  readonly path: string;
  readonly expected:
    | { readonly valid: true }
    | {
        readonly valid: false;
        readonly reason: "POLICY_SCHEMA_INVALID";
        readonly issue: SchemaFixtureExpectedIssue;
      };
}

async function fixture(relativePath: string): Promise<string> {
  return readFile(resolve(fixtureRoot, relativePath), "utf8");
}

async function loadCases(): Promise<readonly SchemaFixtureCase[]> {
  const parsed = JSON.parse(await fixture("cases.json")) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed["cases"])) {
    throw new Error("policy-schema/cases.json must contain a cases array.");
  }
  return parsed["cases"].map(parseCase);
}

function parseCase(value: unknown): SchemaFixtureCase {
  if (!isRecord(value) || typeof value["id"] !== "string" || typeof value["path"] !== "string") {
    throw new Error("Each policy-schema case requires string id/path fields.");
  }
  const expected = value["expected"];
  if (!isRecord(expected) || typeof expected["valid"] !== "boolean") {
    throw new Error(`Case ${value["id"]} requires expected.valid.`);
  }
  if (expected["valid"] === true) {
    return { id: value["id"], path: value["path"], expected: { valid: true } };
  }

  const issue = expected["issue"];
  if (
    expected["reason"] !== "POLICY_SCHEMA_INVALID" ||
    !isRecord(issue) ||
    typeof issue["instancePath"] !== "string" ||
    typeof issue["keyword"] !== "string"
  ) {
    throw new Error(`Case ${value["id"]} has an invalid negative expectation.`);
  }
  return {
    id: value["id"],
    path: value["path"],
    expected: {
      valid: false,
      reason: "POLICY_SCHEMA_INVALID",
      issue: {
        instancePath: issue["instancePath"],
        keyword: issue["keyword"],
      },
    },
  };
}

async function loadJsonFixture(relativePath: string) {
  const loaded = loadPolicyDocument({
    format: "JSON",
    source: await fixture(relativePath),
  });
  if (!loaded.ok) {
    throw new Error(`M4-002 fixture ${relativePath} must first satisfy M4-001: ${loaded.reason}`);
  }
  return loaded.value;
}

let repositoryValidatorPromise: Promise<CapabilityPolicySchemaValidator> | undefined;
function repositoryValidator(): Promise<CapabilityPolicySchemaValidator> {
  repositoryValidatorPromise ??= Promise.all([
    readFile(resolve(schemaRoot, "capability-policy.schema.json"), "utf8"),
    readFile(resolve(schemaRoot, "defs.schema.json"), "utf8"),
  ]).then(([policySource, definitionsSource]) =>
    createCapabilityPolicySchemaValidator(
      createTrustedCapabilityPolicySchemaGraph(
        parseSchemaObject(policySource),
        parseSchemaObject(definitionsSource),
      ),
    ),
  );
  return repositoryValidatorPromise;
}

function parseSchemaObject(source: string): AnySchemaObject {
  const parsed = JSON.parse(source) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Trusted schema fixture must be a JSON object.");
  }
  return parsed;
}

describe("M4-002 CapabilityPolicy schema validation", () => {
  test("matches every language-independent policy-schema fixture", async () => {
    const validate = await repositoryValidator();
    for (const fixtureCase of await loadCases()) {
      const value = await loadJsonFixture(fixtureCase.path);
      const result = validate(value);

      if (fixtureCase.expected.valid) {
        expect(result, fixtureCase.id).toMatchObject({ ok: true });
        continue;
      }

      expect(result, fixtureCase.id).toMatchObject({
        ok: false,
        reason: fixtureCase.expected.reason,
      });
      if (result.ok) {
        throw new Error(`Expected ${fixtureCase.id} to fail schema validation.`);
      }
      expect(result.issues, fixtureCase.id).toContainEqual(
        expect.objectContaining(fixtureCase.expected.issue),
      );
      expect(result.issues.every(issue => issue.schemaPath.length > 0)).toBe(true);
    }
  });

  test("does not synthesize missing defaultEffect", async () => {
    const validate = await repositoryValidator();
    const input = await loadJsonFixture("invalid/missing-default-effect.json");
    const before = JSON.stringify(input);
    const result = validate(input);

    expect(result).toMatchObject({
      ok: false,
      reason: "POLICY_SCHEMA_INVALID",
      issues: [
        expect.objectContaining({
          instancePath: "/spec/defaultEffect",
          keyword: "required",
        }),
      ],
    });
    expect(JSON.stringify(input)).toBe(before);
  });

  test("returns a detached recursively frozen snapshot without mutating input", async () => {
    const validate = await repositoryValidator();
    const input = await loadJsonFixture("valid/lease.json");
    const before = JSON.stringify(input);
    const result = validate(input);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected the lease fixture to validate.");
    }
    expect(JSON.stringify(input)).toBe(before);
    expect(result.value).toEqual(input);
    expect(result.value).not.toBe(input);
    expectRecursivelyFrozen(result.value);

    if (!isRecord(input) || !isRecord(input["metadata"])) {
      throw new Error("Expected mutable object input from M4-001.");
    }
    input["metadata"]["name"] = "mutated-after-validation";
    expect(result.value).toMatchObject({ metadata: { name: "lease" } });
  });

  test("preserves __proto__ as ordinary data inside schema-open constraints", async () => {
    const validate = await repositoryValidator();
    const loaded = loadPolicyDocument({
      format: "JSON",
      source:
        '{"apiVersion":"safe-runtime.dev/v1alpha1","kind":"CapabilityPolicy","metadata":{"name":"proto"},"spec":{"defaultEffect":"deny","rules":[{"id":"read","effect":"allow","capabilities":["fs.read"],"resources":["workspace://**"],"constraints":{"__proto__":{"polluted":true}}}]}}',
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      throw new Error("Expected JSON loader success.");
    }

    const result = validate(loaded.value);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected schema validation success.");
    }

    const constraints = readValidatedObjectPath(result.value, ["spec", "rules", "0", "constraints"]);
    expect(Object.getPrototypeOf(constraints)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(constraints, "__proto__")).toBe(true);
    expect(constraints["__proto__"]).toEqual({ polluted: true });
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  test("sorts normalized issues deterministically", async () => {
    const validate = await repositoryValidator();
    const loaded = loadPolicyDocument({
      format: "JSON",
      source:
        '{"apiVersion":"wrong","kind":"CapabilityPolicy","metadata":{},"spec":{"rules":[],"unexpected":true},"unexpected":true}',
    });
    if (!loaded.ok) {
      throw new Error("Expected M4-001 loader success.");
    }

    const first = validate(loaded.value);
    const second = validate(loaded.value);
    expect(first).toEqual(second);
    if (first.ok) {
      throw new Error("Expected deliberately invalid policy.");
    }

    const ordered = [...first.issues].sort(compareIssues);
    expect(first.issues).toEqual(ordered);
    expect(first.issues.map(issue => issue.instancePath)).toEqual([
      "/apiVersion",
      "/metadata/name",
      "/spec/defaultEffect",
      "/spec/unexpected",
      "/unexpected",
    ]);
  });

  test("distinguishes trusted schema compilation failure from policy invalidity", () => {
    const brokenGraph: TrustedCapabilityPolicySchemaGraph =
      createTrustedCapabilityPolicySchemaGraph(
        {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          $id: "https://safe-runtime.dev/schema/v1alpha1/capability-policy.schema.json",
          $ref: "https://safe-runtime.dev/schema/v1alpha1/missing.schema.json",
        },
        {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          $id: "https://safe-runtime.dev/schema/v1alpha1/defs.schema.json",
          $defs: {},
        },
      );

    expect(() => compileCapabilityPolicySchemaValidator(brokenGraph)).toThrow(
      PolicySchemaConfigurationError,
    );
  });
});

function expectRecursivelyFrozen(value: ValidatedPolicyDocument): void {
  if (value === null || typeof value !== "object") {
    return;
  }
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    expectRecursivelyFrozen(child);
  }
}

function readValidatedObjectPath(
  value: ValidatedPolicyDocument,
  path: readonly string[],
): { readonly [key: string]: ValidatedPolicyDocument } {
  let current: ValidatedPolicyDocument = value;
  for (const segment of path) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      current = current[index] ?? null;
      continue;
    }
    if (!isValidatedRecord(current)) {
      throw new Error(`Expected object while reading ${path.join("/")}.`);
    }
    current = current[segment] ?? null;
  }
  if (!isValidatedRecord(current)) {
    throw new Error(`Expected object at ${path.join("/")}.`);
  }
  return current;
}

function isValidatedRecord(
  value: ValidatedPolicyDocument,
): value is { readonly [key: string]: ValidatedPolicyDocument } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
