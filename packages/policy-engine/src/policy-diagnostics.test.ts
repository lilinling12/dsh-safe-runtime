import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AnySchemaObject } from "ajv";
import { describe, expect, test } from "vitest";
import { createCapabilityPolicySchemaValidator } from "./capability-policy-schema-validator.js";
import { diagnoseCapabilityPolicy } from "./policy-diagnostics.js";
import type { PolicyDiagnosticsResult } from "./policy-diagnostics-types.js";
import type { PolicyDocumentJsonValue } from "./policy-document-types.js";
import { createTrustedCapabilityPolicySchemaGraph } from "./trusted-policy-schema.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/policy-diagnostics/cases.json");
const policySchemaPath = resolve(root, "schemas/v1alpha1/capability-policy.schema.json");
const definitionsSchemaPath = resolve(root, "schemas/v1alpha1/defs.schema.json");

interface DiagnosticsFixture {
  readonly id: string;
  readonly policy: unknown;
  readonly expected: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function parseFixtures(): readonly DiagnosticsFixture[] {
  const parsed = parseJsonFile(fixturePath);
  if (!isRecord(parsed) || !Array.isArray(parsed["cases"])) {
    throw new Error("policy-diagnostics/cases.json must contain a cases array");
  }

  const seen = new Set<string>();
  return parsed["cases"].map((item): DiagnosticsFixture => {
    if (
      !isRecord(item) ||
      typeof item["id"] !== "string" ||
      !Object.hasOwn(item, "policy") ||
      !Object.hasOwn(item, "expect")
    ) {
      throw new Error("Every policy-diagnostics fixture requires id/policy/expect");
    }
    if (seen.has(item["id"])) {
      throw new Error(`Duplicate policy-diagnostics fixture id: ${item["id"]}`);
    }
    seen.add(item["id"]);
    return { id: item["id"], policy: item["policy"], expected: item["expect"] };
  });
}

function toPortable(result: PolicyDiagnosticsResult): unknown {
  if (!result.ok) {
    return { status: result.status, reason: result.reason };
  }
  return {
    status: result.status,
    diagnostics: result.diagnostics,
    truncated: result.truncated,
  };
}

const fixtures = parseFixtures();
const schemaValidator = createCapabilityPolicySchemaValidator(
  createTrustedCapabilityPolicySchemaGraph(
    parseJsonFile(policySchemaPath) as AnySchemaObject,
    parseJsonFile(definitionsSchemaPath) as AnySchemaObject,
  ),
);

describe("M4-008 portable CapabilityPolicy diagnostics", () => {
  test("fixture corpus has the expected breadth", () => {
    expect(fixtures).toHaveLength(21);
  });

  for (const fixture of fixtures) {
    test(fixture.id, () => {
      const schemaResult = schemaValidator(fixture.policy as PolicyDocumentJsonValue);
      expect(schemaResult.ok).toBe(true);
      expect(toPortable(diagnoseCapabilityPolicy(fixture.policy))).toEqual(fixture.expected);
    });
  }
});

describe("M4-008 JavaScript runtime boundary", () => {
  test("top-level spec accessors are rejected without invoking getters", () => {
    let calls = 0;
    const policy = {
      get spec(): unknown {
        calls += 1;
        return { rules: [] };
      },
    };

    const result = diagnoseCapabilityPolicy(policy);
    expect(result).toEqual({
      ok: false,
      status: "DIAGNOSTICS_FAILED",
      reason: "POLICY_DIAGNOSTICS_INPUT_INVALID",
    });
    expect(calls).toBe(0);
  });

  test("rules accessors are rejected without invoking getters", () => {
    let calls = 0;
    const policy = {
      spec: {
        get rules(): unknown {
          calls += 1;
          return [];
        },
      },
    };

    expect(diagnoseCapabilityPolicy(policy)).toEqual({
      ok: false,
      status: "DIAGNOSTICS_FAILED",
      reason: "POLICY_DIAGNOSTICS_INPUT_INVALID",
    });
    expect(calls).toBe(0);
  });

  test("inspected rule-field accessors are rejected without invoking getters", () => {
    for (const field of ["id", "effect", "resources", "priority"] as const) {
      let calls = 0;
      const rule: Record<string, unknown> = {
        id: "rule",
        effect: "allow",
        resources: ["workspace://src/**"],
      };
      Object.defineProperty(rule, field, {
        get(): unknown {
          calls += 1;
          return field === "priority" ? 0 : rule[field];
        },
        enumerable: true,
        configurable: true,
      });

      expect(diagnoseCapabilityPolicy({ spec: { rules: [rule] } })).toEqual({
        ok: false,
        status: "DIAGNOSTICS_FAILED",
        reason: "POLICY_DIAGNOSTICS_INPUT_INVALID",
      });
      expect(calls).toBe(0);
    }
  });

  test("accessor-backed rules and resources array elements are rejected", () => {
    let ruleCalls = 0;
    const rules: unknown[] = [];
    rules.length = 1;
    Object.defineProperty(rules, "0", {
      get(): unknown {
        ruleCalls += 1;
        return { id: "rule", effect: "allow", resources: ["workspace://a"] };
      },
      enumerable: true,
      configurable: true,
    });

    expect(diagnoseCapabilityPolicy({ spec: { rules } })).toEqual({
      ok: false,
      status: "DIAGNOSTICS_FAILED",
      reason: "POLICY_DIAGNOSTICS_INPUT_INVALID",
    });
    expect(ruleCalls).toBe(0);

    let resourceCalls = 0;
    const resources: unknown[] = [];
    resources.length = 1;
    Object.defineProperty(resources, "0", {
      get(): unknown {
        resourceCalls += 1;
        return "workspace://a";
      },
      enumerable: true,
      configurable: true,
    });

    expect(
      diagnoseCapabilityPolicy({
        spec: { rules: [{ id: "rule", effect: "allow", resources }] },
      }),
    ).toEqual({
      ok: false,
      status: "DIAGNOSTICS_FAILED",
      reason: "POLICY_DIAGNOSTICS_INPUT_INVALID",
    });
    expect(resourceCalls).toBe(0);
  });

  test("sparse, named, and symbol array properties are rejected", () => {
    const sparse: unknown[] = [];
    sparse.length = 2;
    sparse[0] = { id: "rule", effect: "allow", resources: ["workspace://a"] };

    const named: unknown[] = [];
    Object.defineProperty(named, "metadata", { value: true, enumerable: true });

    const symbolized: unknown[] = [];
    Object.defineProperty(symbolized, Symbol("metadata"), {
      value: true,
      enumerable: true,
    });

    for (const rules of [sparse, named, symbolized]) {
      expect(diagnoseCapabilityPolicy({ spec: { rules } })).toEqual({
        ok: false,
        status: "DIAGNOSTICS_FAILED",
        reason: "POLICY_DIAGNOSTICS_INPUT_INVALID",
      });
    }
  });

  test("revoked proxies fail explicitly", () => {
    const revocable = Proxy.revocable({}, {});
    revocable.revoke();

    expect(diagnoseCapabilityPolicy(revocable.proxy)).toEqual({
      ok: false,
      status: "DIAGNOSTICS_FAILED",
      reason: "POLICY_DIAGNOSTICS_INPUT_INVALID",
    });
  });

  test("deferred capability, subject, constraint, and lease getters are never read", () => {
    let calls = 0;
    const rule = {
      id: "rule",
      effect: "allow",
      resources: ["workspace://src/**"],
      get capabilities(): unknown {
        calls += 1;
        return ["fs.read"];
      },
      get subjects(): unknown {
        calls += 1;
        return ["subject:future"];
      },
      get constraints(): unknown {
        calls += 1;
        return { future: true };
      },
      get lease(): unknown {
        calls += 1;
        return { ttlMs: 60_000 };
      },
    };

    expect(diagnoseCapabilityPolicy({ spec: { rules: [rule] } })).toEqual({
      ok: true,
      status: "DIAGNOSED",
      diagnostics: [],
      truncated: false,
    });
    expect(calls).toBe(0);
  });

  test("diagnostic output is capped at 256 and marks proven truncation", () => {
    const rules = Array.from({ length: 257 }, (_, index) => ({
      id: `deny-${index}`,
      effect: "deny",
      resources: ["workspace://**"],
      priority: index,
    }));

    const result = diagnoseCapabilityPolicy({ spec: { rules } });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected diagnostics success");
    }
    expect(result.diagnostics).toHaveLength(256);
    expect(result.truncated).toBe(true);
    expect(result.diagnostics[0]).toEqual({
      severity: "WARNING",
      code: "POLICY_DIAGNOSTIC_REDUNDANT_DENY_PRIORITY",
      instancePath: "/spec/rules/0/priority",
    });
    expect(result.diagnostics[255]).toEqual({
      severity: "WARNING",
      code: "POLICY_DIAGNOSTIC_REDUNDANT_DENY_PRIORITY",
      instancePath: "/spec/rules/255/priority",
    });
  });

  test("caller input is not mutated and nested diagnostic outputs are detached and frozen", () => {
    const policy = {
      spec: {
        rules: [
          { id: "same", effect: "allow", resources: ["workspace://a"] },
          { id: "same", effect: "allow", resources: ["workspace://b"] },
        ],
      },
    };
    const before = structuredClone(policy);

    const result = diagnoseCapabilityPolicy(policy);
    expect(policy).toEqual(before);
    expect(result.ok).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    if (!result.ok) {
      throw new Error("Expected diagnostics success");
    }
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
    const diagnostic = result.diagnostics[0];
    expect(diagnostic).toBeDefined();
    expect(Object.isFrozen(diagnostic)).toBe(true);
    expect(diagnostic?.relatedPaths).toBeDefined();
    expect(Object.isFrozen(diagnostic?.relatedPaths)).toBe(true);
    expect(diagnostic?.relatedPaths).not.toBe(before.spec.rules);
  });

  test("failure outputs are frozen", () => {
    const result = diagnoseCapabilityPolicy(null);
    expect(result.ok).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
  });
});
