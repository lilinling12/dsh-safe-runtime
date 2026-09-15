import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { finalizeDefaultDeny } from "./default-deny.js";
import type { DefaultDenyResult } from "./default-deny-types.js";
import { resolveApplicableRuleEffects } from "./effect-resolution.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/default-deny/cases.json");

interface DefaultDenyFixture {
  readonly id: string;
  readonly effectResolution: unknown;
  readonly policySpec: unknown;
  readonly expected: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFixtures(): readonly DefaultDenyFixture[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed["cases"])) {
    throw new Error("default-deny/cases.json must contain a cases array");
  }

  const seen = new Set<string>();
  return parsed["cases"].map((item): DefaultDenyFixture => {
    if (
      !isRecord(item) ||
      typeof item["id"] !== "string" ||
      !Object.hasOwn(item, "effectResolution") ||
      !Object.hasOwn(item, "policySpec") ||
      !Object.hasOwn(item, "expect")
    ) {
      throw new Error("Every default-deny fixture requires id/effectResolution/policySpec/expect");
    }
    if (seen.has(item["id"])) {
      throw new Error(`Duplicate default-deny fixture id: ${item["id"]}`);
    }
    seen.add(item["id"]);

    return {
      id: item["id"],
      effectResolution: item["effectResolution"],
      policySpec: item["policySpec"],
      expected: item["expect"],
    };
  });
}

/**
 * Portable fixtures intentionally omit TypeScript's `ok` discriminant. Add only
 * that language-projection field here so fixture semantics stay cross-language.
 */
function toReferenceEffectResolution(input: unknown): unknown {
  if (!isRecord(input)) {
    return input;
  }
  return { ...input, ok: true };
}

function toPortable(result: DefaultDenyResult): unknown {
  if (result.ok) {
    return { status: result.status, effect: result.effect };
  }
  return { status: result.status, effect: result.effect, reason: result.reason };
}

const fixtures = parseFixtures();

describe("M4-006 portable defensive default deny", () => {
  test("fixture corpus has the expected breadth", () => {
    expect(fixtures).toHaveLength(20);
  });

  for (const fixture of fixtures) {
    test(fixture.id, () => {
      const result = finalizeDefaultDeny(
        toReferenceEffectResolution(fixture.effectResolution),
        fixture.policySpec,
      );
      expect(toPortable(result)).toEqual(fixture.expected);
    });
  }

  test("directly composes with native M4-005 resolved output", () => {
    const resolved = resolveApplicableRuleEffects(
      [
        {
          specificity: { literalCodePoints: 1, globstarCount: 0, starCount: 0 },
          effectivePriority: 0,
          ruleIds: ["allow-rule"],
        },
      ],
      [{ ruleId: "allow-rule", effect: "allow" }],
    );

    expect(finalizeDefaultDeny(resolved, { defaultEffect: "deny" })).toEqual({
      ok: true,
      status: "FINALIZED",
      effect: "allow",
    });
  });

  test("directly composes with native M4-005 no-applicable output", () => {
    const noApplicable = resolveApplicableRuleEffects([], []);
    expect(finalizeDefaultDeny(noApplicable, { defaultEffect: "deny" })).toEqual({
      ok: true,
      status: "FINALIZED",
      effect: "deny",
    });
  });

  test("M4-006 inspects only the default-effect invariant on a real policy spec", () => {
    const policySpec = {
      defaultEffect: "deny",
      rules: [],
      delegation: { mode: "attenuating", inheritByDefault: false },
    };
    const noApplicable = resolveApplicableRuleEffects([], []);

    expect(finalizeDefaultDeny(noApplicable, policySpec)).toEqual({
      ok: true,
      status: "FINALIZED",
      effect: "deny",
    });
  });

  test("prototype-only defaultEffect cannot disguise a missing field", () => {
    const policySpec = Object.create({ defaultEffect: "deny" }) as object;
    const resolvedAllow = resolveApplicableRuleEffects(
      [
        {
          specificity: { literalCodePoints: 1, globstarCount: 0, starCount: 0 },
          effectivePriority: 0,
          ruleIds: ["allow-rule"],
        },
      ],
      [{ ruleId: "allow-rule", effect: "allow" }],
    );

    expect(finalizeDefaultDeny(resolvedAllow, policySpec)).toEqual({
      ok: false,
      status: "FAIL_CLOSED",
      effect: "deny",
      reason: "DEFAULT_EFFECT_CONFIG_INVALID",
    });
  });

  test("own undefined defaultEffect fails closed", () => {
    expect(
      finalizeDefaultDeny(
        resolveApplicableRuleEffects([], []),
        { defaultEffect: undefined },
      ),
    ).toEqual({
      ok: false,
      status: "FAIL_CLOSED",
      effect: "deny",
      reason: "DEFAULT_EFFECT_CONFIG_INVALID",
    });
  });

  test("accessor-backed defaultEffect is rejected without invoking the getter", () => {
    let getterCalls = 0;
    const policySpec: Record<string, unknown> = {};
    Object.defineProperty(policySpec, "defaultEffect", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "deny";
      },
    });

    expect(
      finalizeDefaultDeny(resolveApplicableRuleEffects([], []), policySpec),
    ).toEqual({
      ok: false,
      status: "FAIL_CLOSED",
      effect: "deny",
      reason: "DEFAULT_EFFECT_CONFIG_INVALID",
    });
    expect(getterCalls).toBe(0);
  });

  test("M4-005 failures remain invalid upstream state", () => {
    const failure = resolveApplicableRuleEffects("invalid", []);
    expect(finalizeDefaultDeny(failure, { defaultEffect: "deny" })).toEqual({
      ok: false,
      status: "FAIL_CLOSED",
      effect: "deny",
      reason: "DEFAULT_DENY_INPUT_INVALID",
    });
  });

  test("invalid default configuration dominates malformed upstream input", () => {
    expect(finalizeDefaultDeny("invalid", {})).toEqual({
      ok: false,
      status: "FAIL_CLOSED",
      effect: "deny",
      reason: "DEFAULT_EFFECT_CONFIG_INVALID",
    });
  });

  test("required M4-005 status must be an own property", () => {
    const inherited = Object.create({ ok: true, status: "RESOLVED", effect: "allow" }) as object;
    expect(finalizeDefaultDeny(inherited, { defaultEffect: "deny" })).toEqual({
      ok: false,
      status: "FAIL_CLOSED",
      effect: "deny",
      reason: "DEFAULT_DENY_INPUT_INVALID",
    });
  });

  test("required resolved effect must be an own property", () => {
    const inherited = Object.create({ effect: "allow" }) as Record<string, unknown>;
    inherited["ok"] = true;
    inherited["status"] = "RESOLVED";

    expect(finalizeDefaultDeny(inherited, { defaultEffect: "deny" })).toEqual({
      ok: false,
      status: "FAIL_CLOSED",
      effect: "deny",
      reason: "DEFAULT_DENY_INPUT_INVALID",
    });
  });

  test("accessor-backed resolved effect is rejected without invoking the getter", () => {
    let getterCalls = 0;
    const effectResolution: Record<string, unknown> = {
      ok: true,
      status: "RESOLVED",
    };
    Object.defineProperty(effectResolution, "effect", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "allow";
      },
    });

    expect(
      finalizeDefaultDeny(effectResolution, { defaultEffect: "deny" }),
    ).toEqual({
      ok: false,
      status: "FAIL_CLOSED",
      effect: "deny",
      reason: "DEFAULT_DENY_INPUT_INVALID",
    });
    expect(getterCalls).toBe(0);
  });

  test("accessor-backed status is rejected without invoking the getter", () => {
    let getterCalls = 0;
    const effectResolution: Record<string, unknown> = { ok: true, effect: "allow" };
    Object.defineProperty(effectResolution, "status", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "RESOLVED";
      },
    });

    expect(
      finalizeDefaultDeny(effectResolution, { defaultEffect: "deny" }),
    ).toEqual({
      ok: false,
      status: "FAIL_CLOSED",
      effect: "deny",
      reason: "DEFAULT_DENY_INPUT_INVALID",
    });
    expect(getterCalls).toBe(0);
  });

  test("unexpected symbol fields on M4-005 projection fail closed", () => {
    const symbol = Symbol("hidden");
    const input: Record<PropertyKey, unknown> = {
      ok: true,
      status: "RESOLVED",
      effect: "allow",
      [symbol]: "shadow-policy-data",
    };

    expect(finalizeDefaultDeny(input, { defaultEffect: "deny" })).toEqual({
      ok: false,
      status: "FAIL_CLOSED",
      effect: "deny",
      reason: "DEFAULT_DENY_INPUT_INVALID",
    });
  });

  test("caller inputs are not mutated and results are frozen", () => {
    const effectInput = { ok: true, status: "RESOLVED", effect: "ask" };
    const policySpec = { defaultEffect: "deny", rules: [] };
    const beforeEffectInput = structuredClone(effectInput);
    const beforePolicySpec = structuredClone(policySpec);
    const success = finalizeDefaultDeny(effectInput, policySpec);
    const failure = finalizeDefaultDeny(effectInput, {});

    expect(effectInput).toEqual(beforeEffectInput);
    expect(policySpec).toEqual(beforePolicySpec);
    expect(Object.isFrozen(success)).toBe(true);
    expect(Object.isFrozen(failure)).toBe(true);
  });
});
