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
  readonly hasDefaultEffect: boolean;
  readonly defaultEffect?: unknown;
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
      !Object.hasOwn(item, "expect")
    ) {
      throw new Error("Every default-deny fixture requires id/effectResolution/expect");
    }
    if (seen.has(item["id"])) {
      throw new Error(`Duplicate default-deny fixture id: ${item["id"]}`);
    }
    seen.add(item["id"]);

    const hasDefaultEffect = Object.hasOwn(item, "defaultEffect");
    return {
      id: item["id"],
      effectResolution: item["effectResolution"],
      hasDefaultEffect,
      ...(hasDefaultEffect ? { defaultEffect: item["defaultEffect"] } : {}),
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
      const effectResolution = toReferenceEffectResolution(fixture.effectResolution);
      const result = fixture.hasDefaultEffect
        ? finalizeDefaultDeny(effectResolution, fixture.defaultEffect)
        : finalizeDefaultDeny(effectResolution);
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

    expect(finalizeDefaultDeny(resolved, "deny")).toEqual({
      ok: true,
      status: "FINALIZED",
      effect: "allow",
    });
  });

  test("directly composes with native M4-005 no-applicable output", () => {
    const noApplicable = resolveApplicableRuleEffects([], []);
    expect(finalizeDefaultDeny(noApplicable, "deny")).toEqual({
      ok: true,
      status: "FINALIZED",
      effect: "deny",
    });
  });

  test("M4-005 failures remain invalid upstream state", () => {
    const failure = resolveApplicableRuleEffects("invalid", []);
    expect(finalizeDefaultDeny(failure, "deny")).toEqual({
      ok: false,
      status: "FAIL_CLOSED",
      effect: "deny",
      reason: "DEFAULT_DENY_INPUT_INVALID",
    });
  });

  test("invalid default configuration dominates malformed upstream input", () => {
    expect(finalizeDefaultDeny("invalid", "allow")).toEqual({
      ok: false,
      status: "FAIL_CLOSED",
      effect: "deny",
      reason: "DEFAULT_EFFECT_CONFIG_INVALID",
    });
  });

  test("required status must be an own property", () => {
    const inherited = Object.create({ ok: true, status: "RESOLVED", effect: "allow" }) as object;
    expect(finalizeDefaultDeny(inherited, "deny")).toEqual({
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

    expect(finalizeDefaultDeny(inherited, "deny")).toEqual({
      ok: false,
      status: "FAIL_CLOSED",
      effect: "deny",
      reason: "DEFAULT_DENY_INPUT_INVALID",
    });
  });

  test("unexpected symbol fields fail closed", () => {
    const symbol = Symbol("hidden");
    const input: Record<PropertyKey, unknown> = {
      ok: true,
      status: "RESOLVED",
      effect: "allow",
      [symbol]: "shadow-policy-data",
    };

    expect(finalizeDefaultDeny(input, "deny")).toEqual({
      ok: false,
      status: "FAIL_CLOSED",
      effect: "deny",
      reason: "DEFAULT_DENY_INPUT_INVALID",
    });
  });

  test("caller input is not mutated and results are frozen", () => {
    const input = { ok: true, status: "RESOLVED", effect: "ask" };
    const before = structuredClone(input);
    const success = finalizeDefaultDeny(input, "deny");
    const failure = finalizeDefaultDeny(input, "allow");

    expect(input).toEqual(before);
    expect(Object.isFrozen(success)).toBe(true);
    expect(Object.isFrozen(failure)).toBe(true);
  });
});
