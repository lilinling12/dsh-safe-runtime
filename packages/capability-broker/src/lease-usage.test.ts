import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { evaluateCapabilityLeaseUsage } from "./lease-usage.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/lease-usage/cases.json");

interface FixtureCase {
  readonly id: string;
  readonly description: string;
  readonly input: unknown;
  readonly expected: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fixtureCases(): readonly FixtureCase[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (
    !isRecord(parsed)
    || parsed["profile"] !== "M4-031_LEASE_USAGE_V1"
    || !Array.isArray(parsed["cases"])
  ) {
    throw new Error("lease-usage fixture must contain the reviewed profile and cases array");
  }

  const seen = new Set<string>();
  return parsed["cases"].map((raw, index) => {
    if (
      !isRecord(raw)
      || typeof raw["id"] !== "string"
      || typeof raw["description"] !== "string"
      || !Object.hasOwn(raw, "input")
      || !Object.hasOwn(raw, "expected")
    ) {
      throw new Error("malformed lease-usage portable fixture");
    }

    const expectedId = `LUSE-${String(index + 1).padStart(3, "0")}`;
    if (raw["id"] !== expectedId) {
      throw new Error(`non-canonical lease-usage fixture id: expected ${expectedId}, got ${raw["id"]}`);
    }
    if (seen.has(raw["id"])) throw new Error(`duplicate lease-usage fixture id: ${raw["id"]}`);
    seen.add(raw["id"]);

    return {
      id: raw["id"],
      description: raw["description"],
      input: raw["input"],
      expected: raw["expected"],
    };
  });
}

const cases = fixtureCases();

describe("M4-031 portable CapabilityLease usage corpus", () => {
  test("fixture corpus has the reviewed breadth and canonical IDs", () => {
    expect(cases).toHaveLength(32);
    expect(cases.at(0)?.id).toBe("LUSE-001");
    expect(cases.at(-1)?.id).toBe("LUSE-032");
  });

  for (const fixture of cases) {
    test(`${fixture.id}: ${fixture.description}`, () => {
      expect(evaluateCapabilityLeaseUsage(fixture.input)).toEqual(fixture.expected);
    });
  }
});

describe("M4-031 usage-boundary semantics", () => {
  test("does not import the leaseRequest 100000 maximum into existing leases", () => {
    expect(evaluateCapabilityLeaseUsage({
      profile: "M4-031_LEASE_USAGE_V1",
      maxUses: 100_001,
      remainingUses: 100_001,
    })).toEqual({ status: "USAGE_ELIGIBLE", reasonCode: "LEASE_USAGE_AVAILABLE" });
  });

  test("treats the final available use as eligible but does not mutate the snapshot", () => {
    const input = {
      profile: "M4-031_LEASE_USAGE_V1",
      maxUses: 5,
      remainingUses: 1,
    };

    expect(evaluateCapabilityLeaseUsage(input)).toEqual({
      status: "USAGE_ELIGIBLE",
      reasonCode: "LEASE_USAGE_AVAILABLE",
    });
    expect(input.remainingUses).toBe(1);
  });
});
