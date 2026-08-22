import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  normalizeCapabilityResource,
  normalizePolicyResourceSelector,
} from "./resource-normalizer.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/resource-normalization/cases.json");

type FixtureOperation = "EXACT_RESOURCE" | "POLICY_SELECTOR";

interface FixtureCase {
  readonly id: string;
  readonly operation: FixtureOperation;
  readonly input: unknown;
  readonly expected: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function materialize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(materialize);
  }
  if (!isRecord(value)) {
    return value;
  }

  const keys = Object.keys(value);
  if (keys.length === 1 && keys[0] === "$repeatCodePoint") {
    const descriptor = value["$repeatCodePoint"];
    if (
      !isRecord(descriptor) ||
      typeof descriptor["value"] !== "string" ||
      Array.from(descriptor["value"]).length !== 1 ||
      !Number.isInteger(descriptor["count"]) ||
      typeof descriptor["count"] !== "number" ||
      descriptor["count"] <= 0
    ) {
      throw new Error("Invalid $repeatCodePoint fixture descriptor.");
    }
    return descriptor["value"].repeat(descriptor["count"]);
  }

  if (keys.length === 1 && keys[0] === "$concat") {
    const parts = value["$concat"];
    if (!Array.isArray(parts)) {
      throw new Error("Invalid $concat fixture descriptor.");
    }
    let result = "";
    for (const part of parts) {
      const materialized = materialize(part);
      if (typeof materialized !== "string") {
        throw new Error("Every materialized $concat element must be a string.");
      }
      result += materialized;
    }
    return result;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, materialize(item)]),
  );
}

function parseCases(): readonly FixtureCase[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed["cases"])) {
    throw new Error("resource-normalization/cases.json must contain a cases array.");
  }

  const seen = new Set<string>();
  return parsed["cases"].map((value): FixtureCase => {
    if (
      !isRecord(value) ||
      typeof value["id"] !== "string" ||
      (value["operation"] !== "EXACT_RESOURCE" && value["operation"] !== "POLICY_SELECTOR")
    ) {
      throw new Error("Every resource-normalization case requires id and operation.");
    }
    if (seen.has(value["id"])) {
      throw new Error(`Duplicate resource-normalization case id: ${value["id"]}`);
    }
    seen.add(value["id"]);

    const hasInput = Object.hasOwn(value, "input");
    const hasInputTemplate = Object.hasOwn(value, "inputTemplate");
    const hasExpected = Object.hasOwn(value, "expect");
    const hasExpectedTemplate = Object.hasOwn(value, "expectTemplate");
    if (hasInput === hasInputTemplate || hasExpected === hasExpectedTemplate) {
      throw new Error(`Case ${value["id"]} must choose one input and one expectation form.`);
    }

    return {
      id: value["id"],
      operation: value["operation"],
      input: materialize(hasInput ? value["input"] : value["inputTemplate"]),
      expected: materialize(hasExpected ? value["expect"] : value["expectTemplate"]),
    };
  });
}

const cases = parseCases();

describe("M4-003 portable resource normalization", () => {
  test("fixture corpus has the expected breadth", () => {
    expect(cases).toHaveLength(32);
  });

  for (const fixture of cases) {
    test(fixture.id, () => {
      const result =
        fixture.operation === "EXACT_RESOURCE"
          ? normalizeCapabilityResource(fixture.input)
          : normalizePolicyResourceSelector(fixture.input);
      expect(result).toEqual(fixture.expected);

      if (result.ok && fixture.operation === "EXACT_RESOURCE") {
        expect(normalizeCapabilityResource(result.resource)).toEqual(result);
      }
      if (result.ok && fixture.operation === "POLICY_SELECTOR") {
        const serialized = `${result.selector.scheme}://${result.selector.locatorPattern}`;
        expect(normalizePolicyResourceSelector(serialized)).toEqual(result);
      }
    });
  }

  test("success is detached and frozen without rewriting caller data", () => {
    const input: { scheme: string; locator: string; providerIdentity: string } = {
      scheme: "workspace",
      locator: " /src/../auth.ts ",
      providerIdentity: "opaque:Target/CaseSensitive",
    };

    const result = normalizeCapabilityResource(input);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected exact resource normalization to succeed");
    }

    expect(result.resource).not.toBe(input);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.resource)).toBe(true);
    expect(result.resource.locator).toBe(" /src/../auth.ts ");
    expect(result.resource.providerIdentity).toBe("opaque:Target/CaseSensitive");

    input.locator = "/mutated";
    input.providerIdentity = "mutated";
    expect(result.resource.locator).toBe(" /src/../auth.ts ");
    expect(result.resource.providerIdentity).toBe("opaque:Target/CaseSensitive");
  });

  test("unexpected exact-resource properties fail closed", () => {
    expect(
      normalizeCapabilityResource({
        scheme: "workspace",
        locator: "/src/auth.ts",
        displayPath: "/host/repo/src/auth.ts",
      }),
    ).toEqual({ ok: false, reason: "RESOURCE_INPUT_INVALID", field: "resource" });
  });
});
