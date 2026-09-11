import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { explainPolicyEffect } from "./policy-effect-explanation.js";
import type { PolicyEffectExplanationResult } from "./policy-effect-explanation-types.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/policy-explanation/cases.json");

interface ExplanationFixture {
  readonly id: string;
  readonly bands: unknown;
  readonly effects: readonly unknown[];
  readonly policySpec: unknown;
  readonly effectPermutations?: readonly (readonly string[])[];
  readonly expected: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEffectPermutations(
  value: unknown,
): readonly (readonly string[])[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error("effectPermutations must be an array when present");
  }
  return value.map((permutation): readonly string[] => {
    if (!Array.isArray(permutation) || !permutation.every((item) => typeof item === "string")) {
      throw new Error("Every effect permutation must contain only string rule IDs");
    }
    return permutation;
  });
}

function parseFixtures(): readonly ExplanationFixture[] {
  const parsed: unknown = JSON.parse(readFileSync(fixturePath, "utf8"));
  if (!isRecord(parsed) || !Array.isArray(parsed["cases"])) {
    throw new Error("policy-explanation/cases.json must contain a cases array");
  }

  const seen = new Set<string>();
  return parsed["cases"].map((item): ExplanationFixture => {
    if (
      !isRecord(item) ||
      typeof item["id"] !== "string" ||
      !Array.isArray(item["effects"]) ||
      !Object.hasOwn(item, "bands") ||
      !Object.hasOwn(item, "policySpec") ||
      !Object.hasOwn(item, "expect")
    ) {
      throw new Error(
        "Every policy-explanation fixture requires id/bands/effects/policySpec/expect",
      );
    }
    if (seen.has(item["id"])) {
      throw new Error(`Duplicate policy-explanation fixture id: ${item["id"]}`);
    }
    seen.add(item["id"]);

    const permutations = parseEffectPermutations(item["effectPermutations"]);
    return {
      id: item["id"],
      bands: item["bands"],
      effects: item["effects"],
      policySpec: item["policySpec"],
      ...(permutations === undefined ? {} : { effectPermutations: permutations }),
      expected: item["expect"],
    };
  });
}

function toPortable(result: PolicyEffectExplanationResult): unknown {
  if (!result.ok) {
    return { status: result.status, reasonCode: result.reasonCode };
  }
  return {
    status: result.status,
    effect: result.effect,
    basis: result.basis,
    reasonCode: result.reasonCode,
    contributingRuleIds: result.contributingRuleIds,
  };
}

function bindingRuleId(binding: unknown): string {
  if (!isRecord(binding) || typeof binding["ruleId"] !== "string") {
    throw new Error("effect permutations require bindings with string ruleId");
  }
  return binding["ruleId"];
}

function permuteEffects(
  effects: readonly unknown[],
  order: readonly string[],
): readonly unknown[] {
  const byId = new Map(effects.map((binding) => [bindingRuleId(binding), binding]));
  return order.map((ruleId) => {
    const binding = byId.get(ruleId);
    if (binding === undefined) {
      throw new Error(`Unknown effect permutation rule id: ${ruleId}`);
    }
    return binding;
  });
}

const fixtures = parseFixtures();

describe("M4-007 portable policy effect explanation", () => {
  test("fixture corpus has the expected breadth", () => {
    expect(fixtures).toHaveLength(18);
  });

  for (const fixture of fixtures) {
    test(fixture.id, () => {
      expect(
        toPortable(
          explainPolicyEffect(fixture.bands, fixture.effects, fixture.policySpec),
        ),
      ).toEqual(fixture.expected);

      for (const permutation of fixture.effectPermutations ?? []) {
        expect(
          toPortable(
            explainPolicyEffect(
              fixture.bands,
              permuteEffects(fixture.effects, permutation),
              fixture.policySpec,
            ),
          ),
        ).toEqual(fixture.expected);
      }
    });
  }

  test("accessor-backed band fields are rejected without invoking getters", () => {
    let calls = 0;
    const band = {
      get specificity(): unknown {
        calls += 1;
        return { literalCodePoints: 1, globstarCount: 0, starCount: 0 };
      },
      effectivePriority: 0,
      ruleIds: ["rule"],
    };

    expect(
      explainPolicyEffect(
        [band],
        [{ ruleId: "rule", effect: "allow" }],
        { defaultEffect: "deny" },
      ),
    ).toEqual({
      ok: false,
      status: "EXPLAIN_FAILED",
      reasonCode: "POLICY_EXPLAIN_INPUT_INVALID",
    });
    expect(calls).toBe(0);
  });

  test("accessor-backed array elements are rejected without invoking getters", () => {
    let calls = 0;
    const bands: unknown[] = [];
    bands.length = 1;
    Object.defineProperty(bands, "0", {
      get(): unknown {
        calls += 1;
        return {
          specificity: { literalCodePoints: 1, globstarCount: 0, starCount: 0 },
          effectivePriority: 0,
          ruleIds: ["rule"],
        };
      },
      enumerable: true,
      configurable: true,
    });

    expect(
      explainPolicyEffect(
        bands,
        [{ ruleId: "rule", effect: "allow" }],
        { defaultEffect: "deny" },
      ),
    ).toEqual({
      ok: false,
      status: "EXPLAIN_FAILED",
      reasonCode: "POLICY_EXPLAIN_INPUT_INVALID",
    });
    expect(calls).toBe(0);
  });

  test("sparse arrays fail at the language data boundary", () => {
    const bands: unknown[] = [];
    bands.length = 2;
    bands[0] = {
      specificity: { literalCodePoints: 1, globstarCount: 0, starCount: 0 },
      effectivePriority: 0,
      ruleIds: ["rule"],
    };

    expect(
      explainPolicyEffect(
        bands,
        [{ ruleId: "rule", effect: "allow" }],
        { defaultEffect: "deny" },
      ),
    ).toEqual({
      ok: false,
      status: "EXPLAIN_FAILED",
      reasonCode: "POLICY_EXPLAIN_INPUT_INVALID",
    });
  });

  test("named and symbol array properties fail at the language data boundary", () => {
    const named: unknown[] = [];
    Object.defineProperty(named, "metadata", { value: true, enumerable: true });

    const symbolized: unknown[] = [];
    Object.defineProperty(symbolized, Symbol("metadata"), {
      value: true,
      enumerable: true,
    });

    for (const effects of [named, symbolized]) {
      expect(explainPolicyEffect([], effects, { defaultEffect: "deny" })).toEqual({
        ok: false,
        status: "EXPLAIN_FAILED",
        reasonCode: "POLICY_EXPLAIN_INPUT_INVALID",
      });
    }
  });

  test("revoked proxies fail rather than escaping into M4-005", () => {
    const revocable = Proxy.revocable({}, {});
    revocable.revoke();

    expect(
      explainPolicyEffect(
        [revocable.proxy],
        [{ ruleId: "rule", effect: "allow" }],
        { defaultEffect: "deny" },
      ),
    ).toEqual({
      ok: false,
      status: "EXPLAIN_FAILED",
      reasonCode: "POLICY_EXPLAIN_INPUT_INVALID",
    });
  });

  test("inherited rule fields remain an M4-005 input failure", () => {
    const inherited: object = Object.create({
      ruleId: "rule",
      effect: "allow",
    });

    expect(
      explainPolicyEffect(
        [
          {
            specificity: { literalCodePoints: 1, globstarCount: 0, starCount: 0 },
            effectivePriority: 0,
            ruleIds: ["rule"],
          },
        ],
        [inherited],
        { defaultEffect: "deny" },
      ),
    ).toEqual({
      ok: false,
      status: "EXPLAIN_FAILED",
      reasonCode: "EFFECT_RESOLUTION_INPUT_INVALID",
    });
  });

  test("defaultEffect accessors fail closed without being invoked", () => {
    let calls = 0;
    const policySpec = {
      get defaultEffect(): string {
        calls += 1;
        return "deny";
      },
    };

    expect(explainPolicyEffect([], [], policySpec)).toEqual({
      ok: true,
      status: "EXPLAINED",
      effect: "deny",
      basis: "FAIL_CLOSED",
      reasonCode: "DEFAULT_EFFECT_CONFIG_INVALID",
      contributingRuleIds: [],
    });
    expect(calls).toBe(0);
  });

  test("nested specificity accessors are rejected without invoking getters", () => {
    let calls = 0;
    const specificity = {
      get literalCodePoints(): number {
        calls += 1;
        return 1;
      },
      globstarCount: 0,
      starCount: 0,
    };

    expect(
      explainPolicyEffect(
        [{ specificity, effectivePriority: 0, ruleIds: ["rule"] }],
        [{ ruleId: "rule", effect: "allow" }],
        { defaultEffect: "deny" },
      ),
    ).toEqual({
      ok: false,
      status: "EXPLAIN_FAILED",
      reasonCode: "POLICY_EXPLAIN_INPUT_INVALID",
    });
    expect(calls).toBe(0);
  });

  test("effect-binding accessors are rejected without invoking getters", () => {
    let calls = 0;
    const effectBinding = {
      ruleId: "rule",
      get effect(): string {
        calls += 1;
        return "allow";
      },
    };

    expect(
      explainPolicyEffect(
        [
          {
            specificity: { literalCodePoints: 1, globstarCount: 0, starCount: 0 },
            effectivePriority: 0,
            ruleIds: ["rule"],
          },
        ],
        [effectBinding],
        { defaultEffect: "deny" },
      ),
    ).toEqual({
      ok: false,
      status: "EXPLAIN_FAILED",
      reasonCode: "POLICY_EXPLAIN_INPUT_INVALID",
    });
    expect(calls).toBe(0);
  });

  test("rule-id array accessors are rejected without invoking getters", () => {
    let calls = 0;
    const ruleIds: unknown[] = [];
    ruleIds.length = 1;
    Object.defineProperty(ruleIds, "0", {
      get(): string {
        calls += 1;
        return "rule";
      },
      enumerable: true,
      configurable: true,
    });

    expect(
      explainPolicyEffect(
        [
          {
            specificity: { literalCodePoints: 1, globstarCount: 0, starCount: 0 },
            effectivePriority: 0,
            ruleIds,
          },
        ],
        [{ ruleId: "rule", effect: "allow" }],
        { defaultEffect: "deny" },
      ),
    ).toEqual({
      ok: false,
      status: "EXPLAIN_FAILED",
      reasonCode: "POLICY_EXPLAIN_INPUT_INVALID",
    });
    expect(calls).toBe(0);
  });

  test("revoked policy specs preserve M4-006 fail-closed behavior", () => {
    const revocable = Proxy.revocable({}, {});
    revocable.revoke();

    expect(explainPolicyEffect([], [], revocable.proxy)).toEqual({
      ok: true,
      status: "EXPLAINED",
      effect: "deny",
      basis: "FAIL_CLOSED",
      reasonCode: "DEFAULT_EFFECT_CONFIG_INVALID",
      contributingRuleIds: [],
    });
  });

  test("explanation failures are frozen", () => {
    const result = explainPolicyEffect(
      [
        {
          specificity: { literalCodePoints: 1, globstarCount: 0, starCount: 0 },
          effectivePriority: 0,
          ruleIds: ["rule"],
        },
      ],
      [{ ruleId: "rule", effect: "invalid" }],
      { defaultEffect: "deny" },
    );

    expect(result).toEqual({
      ok: false,
      status: "EXPLAIN_FAILED",
      reasonCode: "EFFECT_RESOLUTION_EFFECT_INVALID",
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  test("caller data is not mutated and explanation output is detached and frozen", () => {
    const bands = [
      {
        specificity: { literalCodePoints: 2, globstarCount: 0, starCount: 0 },
        effectivePriority: 0,
        ruleIds: ["ask-a", "ask-z"],
      },
    ];
    const effects = [
      { ruleId: "ask-z", effect: "ask" },
      { ruleId: "ask-a", effect: "ask" },
    ];
    const policySpec = { defaultEffect: "deny", rules: [] };
    const beforeBands = structuredClone(bands);
    const beforeEffects = structuredClone(effects);
    const beforePolicySpec = structuredClone(policySpec);

    const result = explainPolicyEffect(bands, effects, policySpec);
    expect(result).toEqual({
      ok: true,
      status: "EXPLAINED",
      effect: "ask",
      basis: "HIGHEST_BAND_ASK",
      reasonCode: "POLICY_HIGHEST_BAND_ASK",
      contributingRuleIds: ["ask-a", "ask-z"],
    });
    expect(bands).toEqual(beforeBands);
    expect(effects).toEqual(beforeEffects);
    expect(policySpec).toEqual(beforePolicySpec);
    expect(Object.isFrozen(result)).toBe(true);

    if (result.ok) {
      expect(Object.isFrozen(result.contributingRuleIds)).toBe(true);
      expect(result.contributingRuleIds).not.toBe(bands[0]?.ruleIds);
    }
  });

  test("explanation output never invents protocol decision/provenance fields", () => {
    const result = explainPolicyEffect(
      [
        {
          specificity: { literalCodePoints: 1, globstarCount: 0, starCount: 0 },
          effectivePriority: 0,
          ruleIds: ["rule"],
        },
      ],
      [{ ruleId: "rule", effect: "deny" }],
      { defaultEffect: "deny" },
    );

    expect(result).toEqual({
      ok: true,
      status: "EXPLAINED",
      effect: "deny",
      basis: "EXPLICIT_DENY",
      reasonCode: "POLICY_EXPLICIT_DENY",
      contributingRuleIds: ["rule"],
    });
    expect(Object.hasOwn(result, "matchedRuleRefs")).toBe(false);
    expect(Object.hasOwn(result, "policyRef")).toBe(false);
    expect(Object.hasOwn(result, "decisionId")).toBe(false);
    expect(Object.hasOwn(result, "guaranteeLevel")).toBe(false);
    expect(Object.hasOwn(result, "reason")).toBe(false);
  });
});
