import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { resolveApplicableRuleEffects } from "./effect-resolution.js";
import type { EffectResolutionResult } from "./effect-resolution-types.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/effect-resolution/cases.json");

interface EffectFixture {
  readonly id: string;
  readonly bands: unknown;
  readonly effects: readonly unknown[];
  readonly effectPermutations?: readonly (readonly string[])[];
  readonly expected: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFixtures(): readonly EffectFixture[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed["cases"])) {
    throw new Error("effect-resolution/cases.json must contain a cases array");
  }

  const seen = new Set<string>();
  return parsed["cases"].map((item): EffectFixture => {
    if (
      !isRecord(item) ||
      typeof item["id"] !== "string" ||
      !Array.isArray(item["effects"]) ||
      !Object.hasOwn(item, "bands") ||
      !Object.hasOwn(item, "expect")
    ) {
      throw new Error("Every effect-resolution fixture requires id/bands/effects/expect");
    }
    if (seen.has(item["id"])) {
      throw new Error(`Duplicate effect-resolution fixture id: ${item["id"]}`);
    }
    seen.add(item["id"]);

    const permutations = item["effectPermutations"];
    return {
      id: item["id"],
      bands: item["bands"],
      effects: item["effects"],
      ...(Array.isArray(permutations)
        ? { effectPermutations: permutations as readonly string[][] }
        : {}),
      expected: item["expect"],
    };
  });
}

function toPortable(result: EffectResolutionResult): unknown {
  if (!result.ok) {
    return { status: "ERROR", reason: result.reason };
  }
  if (result.status === "NO_APPLICABLE_RULES") {
    return { status: "NO_APPLICABLE_RULES" };
  }
  return { status: "RESOLVED", effect: result.effect };
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

describe("M4-005 portable effect resolution", () => {
  test("fixture corpus has the expected breadth", () => {
    expect(fixtures).toHaveLength(23);
  });

  for (const fixture of fixtures) {
    test(fixture.id, () => {
      expect(
        toPortable(resolveApplicableRuleEffects(fixture.bands, fixture.effects)),
      ).toEqual(fixture.expected);

      for (const permutation of fixture.effectPermutations ?? []) {
        expect(
          toPortable(
            resolveApplicableRuleEffects(
              fixture.bands,
              permuteEffects(fixture.effects, permutation),
            ),
          ),
        ).toEqual(fixture.expected);
      }
    });
  }

  test("resolver does not mutate caller bands or effect bindings", () => {
    const bands = [
      {
        specificity: { literalCodePoints: 5, globstarCount: 0, starCount: 1 },
        effectivePriority: 0,
        ruleIds: ["ask-rule"],
      },
    ];
    const effects = [{ ruleId: "ask-rule", effect: "ask" }];
    const beforeBands = structuredClone(bands);
    const beforeEffects = structuredClone(effects);

    expect(resolveApplicableRuleEffects(bands, effects)).toEqual({
      ok: true,
      status: "RESOLVED",
      effect: "ask",
    });
    expect(bands).toEqual(beforeBands);
    expect(effects).toEqual(beforeEffects);
  });

  test("required effect fields must be own properties", () => {
    const inherited = Object.create({ ruleId: "rule", effect: "allow" }) as object;
    expect(
      resolveApplicableRuleEffects(
        [
          {
            specificity: { literalCodePoints: 1, globstarCount: 0, starCount: 0 },
            effectivePriority: 0,
            ruleIds: ["rule"],
          },
        ],
        [inherited],
      ),
    ).toEqual({ ok: false, reason: "EFFECT_RESOLUTION_INPUT_INVALID" });
  });

  test("unexpected band fields fail closed", () => {
    expect(
      resolveApplicableRuleEffects(
        [
          {
            specificity: { literalCodePoints: 1, globstarCount: 0, starCount: 0 },
            effectivePriority: 0,
            ruleIds: ["rule"],
            winner: "rule",
          },
        ],
        [{ ruleId: "rule", effect: "allow" }],
      ),
    ).toEqual({ ok: false, reason: "EFFECT_RESOLUTION_INPUT_INVALID" });
  });

  test("success and failure outputs are frozen primitives", () => {
    const success = resolveApplicableRuleEffects(
      [
        {
          specificity: { literalCodePoints: 1, globstarCount: 0, starCount: 0 },
          effectivePriority: 0,
          ruleIds: ["rule"],
        },
      ],
      [{ ruleId: "rule", effect: "allow" }],
    );
    const failure = resolveApplicableRuleEffects([], [{ ruleId: "extra", effect: "allow" }]);

    expect(Object.isFrozen(success)).toBe(true);
    expect(Object.isFrozen(failure)).toBe(true);
  });
});
