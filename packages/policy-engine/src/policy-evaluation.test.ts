import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { evaluateCapabilityPolicy } from "./policy-evaluation.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/policy-evaluation/cases.json");

interface FixtureCase {
  readonly id: string;
  readonly description: string;
  readonly subject: unknown;
  readonly capability: unknown;
  readonly resource: unknown;
  readonly requestConstraints?: unknown;
  readonly policySpec: unknown;
  readonly equivalentPolicySpec?: unknown;
  readonly expected: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fixtureCases(): readonly FixtureCase[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed["cases"])) {
    throw new Error("policy-evaluation fixture must contain a cases array");
  }

  const seen = new Set<string>();
  return parsed["cases"].map(raw => {
    if (
      !isRecord(raw)
      || typeof raw["id"] !== "string"
      || typeof raw["description"] !== "string"
      || !Object.hasOwn(raw, "subject")
      || !Object.hasOwn(raw, "capability")
      || !Object.hasOwn(raw, "resource")
      || !Object.hasOwn(raw, "policySpec")
      || !Object.hasOwn(raw, "expected")
    ) {
      throw new Error("malformed policy-evaluation portable fixture");
    }
    if (seen.has(raw["id"])) throw new Error(`duplicate policy-evaluation fixture id: ${raw["id"]}`);
    seen.add(raw["id"]);

    return {
      id: raw["id"],
      description: raw["description"],
      subject: raw["subject"],
      capability: raw["capability"],
      resource: raw["resource"],
      ...(Object.hasOwn(raw, "requestConstraints") ? { requestConstraints: raw["requestConstraints"] } : {}),
      policySpec: raw["policySpec"],
      ...(Object.hasOwn(raw, "equivalentPolicySpec") ? { equivalentPolicySpec: raw["equivalentPolicySpec"] } : {}),
      expected: raw["expected"],
    };
  });
}

function policy(spec: unknown): unknown {
  return {
    apiVersion: "safe-runtime.dev/v1alpha1",
    kind: "CapabilityPolicy",
    metadata: { name: "m4-021-fixture" },
    spec,
  };
}

function evaluateFixture(fixture: FixtureCase, spec: unknown = fixture.policySpec): unknown {
  return evaluateCapabilityPolicy({
    policy: policy(spec),
    subject: fixture.subject,
    capability: fixture.capability,
    resource: fixture.resource,
    ...(Object.hasOwn(fixture, "requestConstraints")
      ? { requestConstraints: fixture.requestConstraints }
      : {}),
  });
}

const cases = fixtureCases();

describe("M4-021 portable policy-evaluation corpus", () => {
  test("fixture corpus has the reviewed breadth", () => {
    expect(cases).toHaveLength(31);
  });

  for (const fixture of cases) {
    test(`${fixture.id}: ${fixture.description}`, () => {
      const result = evaluateFixture(fixture);
      expect(result).toEqual(fixture.expected);
      if (fixture.equivalentPolicySpec !== undefined) {
        expect(evaluateFixture(fixture, fixture.equivalentPolicySpec)).toEqual(fixture.expected);
      }
    });
  }
});

describe("M4-021 hostile runtime boundary", () => {
  const allowPolicy = () => policy({
    defaultEffect: "deny",
    rules: [{
      id: "read",
      effect: "allow",
      capabilities: ["fs.read"],
      resources: ["workspace://src/**"],
      subjects: ["agent://agent/root"],
    }],
  });

  const baseInput = () => ({
    policy: allowPolicy(),
    subject: { kind: "agent", id: "agent/root", sessionRef: "session:1" },
    capability: "fs.read",
    resource: { scheme: "workspace", locator: "src/a.ts" },
  });

  test("top-level accessors never execute", () => {
    for (const field of ["policy", "subject", "capability", "resource", "requestConstraints"] as const) {
      let getterCalls = 0;
      const input: Record<string, unknown> = baseInput();
      if (field === "requestConstraints") input[field] = {};
      Object.defineProperty(input, field, {
        configurable: true,
        enumerable: true,
        get() {
          getterCalls += 1;
          return field === "capability" ? "fs.read" : {};
        },
      });
      expect(evaluateCapabilityPolicy(input)).toEqual({
        status: "FAIL_CLOSED",
        effect: "deny",
        stage: "INPUT",
        reasonCode: "POLICY_EVALUATION_INPUT_INVALID",
      });
      expect(getterCalls).toBe(0);
    }
  });

  test("Subject accessors cannot manufacture matching identity", () => {
    let getterCalls = 0;
    const subject = { kind: "agent", id: "agent/root", sessionRef: "session:1" };
    Object.defineProperty(subject, "id", {
      enumerable: true,
      configurable: true,
      get() { getterCalls += 1; return "agent/root"; },
    });
    expect(evaluateCapabilityPolicy({ ...baseInput(), subject })).toMatchObject({
      status: "FAIL_CLOSED",
      effect: "deny",
      stage: "INPUT",
      reasonCode: "POLICY_EVALUATION_INPUT_INVALID",
    });
    expect(getterCalls).toBe(0);
  });

  test("policy rule accessors are rejected without getter execution", () => {
    for (const field of ["id", "effect", "capabilities", "resources", "subjects", "constraints", "lease", "priority"] as const) {
      let getterCalls = 0;
      const rule: Record<string, unknown> = {
        id: "read",
        effect: "allow",
        capabilities: ["fs.read"],
        resources: ["workspace://src/**"],
        subjects: ["agent://agent/root"],
        constraints: {},
        lease: { ttlMs: 1 },
        priority: 0,
      };
      Object.defineProperty(rule, field, {
        enumerable: true,
        configurable: true,
        get() { getterCalls += 1; return undefined; },
      });
      const candidate = policy({ defaultEffect: "deny", rules: [rule] });
      expect(evaluateCapabilityPolicy({ ...baseInput(), policy: candidate })).toMatchObject({
        status: "FAIL_CLOSED",
        effect: "deny",
      });
      expect(getterCalls).toBe(0);
    }
  });

  test("sparse and named selector arrays fail closed", () => {
    const sparse = new Array<string>(1);
    const sparsePolicy = policy({
      defaultEffect: "deny",
      rules: [{ id: "read", effect: "allow", capabilities: sparse, resources: ["workspace://src/**"] }],
    });
    expect(evaluateCapabilityPolicy({ ...baseInput(), policy: sparsePolicy })).toMatchObject({
      status: "FAIL_CLOSED",
      effect: "deny",
      stage: "INPUT",
    });

    const named = ["agent://agent/root"] as string[] & { authority?: string };
    named.authority = "admin";
    const namedPolicy = policy({
      defaultEffect: "deny",
      rules: [{ id: "read", effect: "allow", capabilities: ["fs.read"], resources: ["workspace://src/**"], subjects: named }],
    });
    expect(evaluateCapabilityPolicy({ ...baseInput(), policy: namedPolicy })).toMatchObject({
      status: "FAIL_CLOSED",
      effect: "deny",
      stage: "SUBJECT_SELECTOR",
    });
  });

  test("symbol fields on input or policy rules fail closed", () => {
    const symbol = Symbol("authority");
    const input: Record<PropertyKey, unknown> = baseInput();
    input[symbol] = "allow";
    expect(evaluateCapabilityPolicy(input)).toMatchObject({ status: "FAIL_CLOSED", effect: "deny", stage: "INPUT" });

    const rule: Record<PropertyKey, unknown> = {
      id: "read",
      effect: "allow",
      capabilities: ["fs.read"],
      resources: ["workspace://src/**"],
    };
    rule[symbol] = "allow";
    const candidate = policy({ defaultEffect: "deny", rules: [rule] });
    expect(evaluateCapabilityPolicy({ ...baseInput(), policy: candidate })).toMatchObject({ status: "FAIL_CLOSED", effect: "deny", stage: "INPUT" });
  });

  test("revoked proxies fail closed without escaping host exceptions", () => {
    for (const target of ["input", "subject", "policy", "rules", "constraints"] as const) {
      const revocable = Proxy.revocable({}, {});
      revocable.revoke();

      if (target === "input") {
        expect(evaluateCapabilityPolicy(revocable.proxy)).toMatchObject({ status: "FAIL_CLOSED", effect: "deny" });
        continue;
      }
      if (target === "subject") {
        expect(evaluateCapabilityPolicy({ ...baseInput(), subject: revocable.proxy })).toMatchObject({ status: "FAIL_CLOSED", effect: "deny" });
        continue;
      }
      if (target === "policy") {
        expect(evaluateCapabilityPolicy({ ...baseInput(), policy: revocable.proxy })).toMatchObject({ status: "FAIL_CLOSED", effect: "deny" });
        continue;
      }
      if (target === "rules") {
        const candidate = policy({ defaultEffect: "deny", rules: revocable.proxy });
        expect(evaluateCapabilityPolicy({ ...baseInput(), policy: candidate })).toMatchObject({ status: "FAIL_CLOSED", effect: "deny" });
        continue;
      }
      const candidate = policy({
        defaultEffect: "deny",
        rules: [{ id: "read", effect: "allow", capabilities: ["fs.read"], resources: ["workspace://src/**"], constraints: revocable.proxy }],
      });
      expect(evaluateCapabilityPolicy({ ...baseInput(), policy: candidate })).toEqual({
        status: "FAIL_CLOSED",
        effect: "deny",
        stage: "CONSTRAINT",
        reasonCode: "POLICY_EVALUATION_INPUT_INVALID",
      });
    }
  });

  test("unmatched constrained rule never traverses hostile constraint body", () => {
    let trapCalls = 0;
    const constraints = new Proxy({}, {
      ownKeys() { trapCalls += 1; throw new Error("must remain irrelevant"); },
      getOwnPropertyDescriptor() { trapCalls += 1; throw new Error("must remain irrelevant"); },
    });
    const candidate = policy({
      defaultEffect: "deny",
      rules: [{
        id: "service-only",
        effect: "allow",
        capabilities: ["fs.read"],
        resources: ["workspace://src/**"],
        subjects: ["service://service:ci"],
        constraints,
      }],
    });
    expect(evaluateCapabilityPolicy({ ...baseInput(), policy: candidate })).toEqual({
      status: "EVALUATED",
      effect: "deny",
      basis: "DEFAULT_DENY",
      reasonCode: "POLICY_DEFAULT_DENY",
      fullyApplicableRuleIds: [],
      contributingRuleIds: [],
    });
    expect(trapCalls).toBe(0);
  });

  test("Subject selector parser does not assign wildcard meaning to star IDs", () => {
    const candidate = policy({
      defaultEffect: "deny",
      rules: [{
        id: "literal",
        effect: "allow",
        capabilities: ["fs.read"],
        resources: ["workspace://src/**"],
        subjects: ["agent://*"],
      }],
    });
    expect(evaluateCapabilityPolicy({ ...baseInput(), policy: candidate })).toMatchObject({
      status: "EVALUATED",
      effect: "deny",
      basis: "DEFAULT_DENY",
    });
    expect(evaluateCapabilityPolicy({
      ...baseInput(),
      policy: candidate,
      subject: { kind: "agent", id: "*", sessionRef: "session:1" },
    })).toMatchObject({ status: "EVALUATED", effect: "allow" });
  });

  test("successful results are detached and recursively immutable", () => {
    const input = baseInput();
    const result = evaluateCapabilityPolicy(input);
    expect(result).toMatchObject({ status: "EVALUATED", effect: "allow" });
    expect(Object.isFrozen(result)).toBe(true);
    if (result.status === "EVALUATED") {
      expect(Object.isFrozen(result.fullyApplicableRuleIds)).toBe(true);
      expect(Object.isFrozen(result.contributingRuleIds)).toBe(true);
    }

    (input.subject as { id: string }).id = "mutated";
    expect(result).toMatchObject({ effect: "allow", fullyApplicableRuleIds: ["read"] });
  });

  test("failure output never echoes attacker-controlled policy values", () => {
    const secret = "do-not-leak-this-policy-value";
    const candidate = policy({
      defaultEffect: "deny",
      rules: [{ id: secret, effect: "allow", capabilities: ["fs.read"], resources: ["workspace://src/**"], subjects: ["not-a-selector"] }],
    });
    const result = evaluateCapabilityPolicy({ ...baseInput(), policy: candidate });
    expect(result).toEqual({
      status: "FAIL_CLOSED",
      effect: "deny",
      stage: "SUBJECT_SELECTOR",
      reasonCode: "POLICY_SUBJECT_SELECTOR_INVALID",
    });
    expect(JSON.stringify(result)).not.toContain(secret);
  });
});
