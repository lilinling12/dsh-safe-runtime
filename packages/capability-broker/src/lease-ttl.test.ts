import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { evaluateCapabilityLeaseTtl } from "./lease-ttl.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/lease-ttl/cases.json");

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
    || parsed["profile"] !== "M4-030_LEASE_TTL_V1"
    || !Array.isArray(parsed["cases"])
  ) {
    throw new Error("lease-ttl fixture must contain the reviewed profile and cases array");
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
      throw new Error("malformed lease-ttl portable fixture");
    }

    const expectedId = `LTTL-${String(index + 1).padStart(3, "0")}`;
    if (raw["id"] !== expectedId) {
      throw new Error(`non-canonical lease-ttl fixture id: expected ${expectedId}, got ${raw["id"]}`);
    }
    if (seen.has(raw["id"])) throw new Error(`duplicate lease-ttl fixture id: ${raw["id"]}`);
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

describe("M4-030 portable CapabilityLease TTL corpus", () => {
  test("fixture corpus has the reviewed breadth and canonical IDs", () => {
    expect(cases).toHaveLength(32);
    expect(cases.at(0)?.id).toBe("LTTL-001");
    expect(cases.at(-1)?.id).toBe("LTTL-032");
  });

  for (const fixture of cases) {
    test(`${fixture.id}: ${fixture.description}`, () => {
      expect(evaluateCapabilityLeaseTtl(fixture.input)).toEqual(fixture.expected);
    });
  }
});

describe("M4-030 deterministic instant precision", () => {
  test("preserves fractional precision far beyond host millisecond precision", () => {
    const prefix = "0".repeat(1024);
    expect(evaluateCapabilityLeaseTtl({
      profile: "M4-030_LEASE_TTL_V1",
      issuedAt: `2026-09-02T00:00:00.${prefix}1Z`,
      observedAt: `2026-09-02T00:00:00.${prefix}2Z`,
      expiresAt: `2026-09-02T00:00:00.${prefix}3Z`,
    })).toEqual({ status: "TIME_ELIGIBLE", reasonCode: "LEASE_TTL_ACTIVE" });
  });

  test("compares offset-equivalent instants without rewriting caller timestamps", () => {
    expect(evaluateCapabilityLeaseTtl({
      profile: "M4-030_LEASE_TTL_V1",
      issuedAt: "2026-09-02T08:00:00+08:00",
      observedAt: "2026-09-01T20:00:30-04:00",
      expiresAt: "2026-09-02T09:00:00+08:00",
    })).toEqual({ status: "TIME_ELIGIBLE", reasonCode: "LEASE_TTL_ACTIVE" });
  });
});

describe("M4-030 Gregorian calendar boundaries", () => {
  test("applies the Gregorian century leap-year rule exactly", () => {
    for (const year of ["2000", "2400"] as const) {
      expect(evaluateCapabilityLeaseTtl({
        profile: "M4-030_LEASE_TTL_V1",
        issuedAt: `${year}-02-29T23:59:59Z`,
        observedAt: `${year}-03-01T00:00:00Z`,
        expiresAt: `${year}-03-01T00:00:01Z`,
      })).toEqual({ status: "TIME_ELIGIBLE", reasonCode: "LEASE_TTL_ACTIVE" });
    }

    for (const year of ["1900", "2100"] as const) {
      expect(evaluateCapabilityLeaseTtl({
        profile: "M4-030_LEASE_TTL_V1",
        issuedAt: `${year}-02-29T00:00:00Z`,
        observedAt: `${year}-03-01T00:00:00Z`,
        expiresAt: `${year}-03-01T00:00:01Z`,
      })).toEqual({
        status: "FAIL_CLOSED",
        stage: "TIME",
        reasonCode: "LEASE_TTL_ISSUED_AT_INVALID",
      });
    }
  });
});
