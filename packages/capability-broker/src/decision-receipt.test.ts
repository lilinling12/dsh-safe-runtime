import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { constructCapabilityDecisionReceipt } from "./decision-receipt.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/decision-receipt/cases.json");

interface FixtureCase {
  readonly id: string;
  readonly description: string;
  readonly input: unknown;
  readonly expected?: unknown;
  readonly expectedGuaranteeLevel?: unknown;
  readonly expectedTimestamps?: unknown;
  readonly expectedAbsentDecisionFields?: unknown;
  readonly expectedAbsentReceiptFields?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fixtureCases(): readonly FixtureCase[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (
    !isRecord(parsed)
    || parsed["profile"] !== "M4-024_DECISION_RECEIPT_V1"
    || !Array.isArray(parsed["cases"])
  ) {
    throw new Error("decision-receipt fixture must contain the reviewed profile and cases array");
  }

  const seen = new Set<string>();
  return parsed["cases"].map(raw => {
    if (
      !isRecord(raw)
      || typeof raw["id"] !== "string"
      || typeof raw["description"] !== "string"
      || !Object.hasOwn(raw, "input")
    ) {
      throw new Error("malformed decision-receipt portable fixture");
    }
    if (seen.has(raw["id"])) throw new Error(`duplicate decision-receipt fixture id: ${raw["id"]}`);
    seen.add(raw["id"]);
    return {
      id: raw["id"],
      description: raw["description"],
      input: raw["input"],
      expected: raw["expected"],
      expectedGuaranteeLevel: raw["expectedGuaranteeLevel"],
      expectedTimestamps: raw["expectedTimestamps"],
      expectedAbsentDecisionFields: raw["expectedAbsentDecisionFields"],
      expectedAbsentReceiptFields: raw["expectedAbsentReceiptFields"],
    };
  });
}

const cases = fixtureCases();

describe("M4-024 portable decision-receipt corpus", () => {
  test("fixture corpus has the reviewed breadth", () => {
    expect(cases).toHaveLength(27);
  });

  for (const fixture of cases) {
    test(`${fixture.id}: ${fixture.description}`, () => {
      const result = constructCapabilityDecisionReceipt(fixture.input);

      if (fixture.expected !== undefined) {
        expect(result).toEqual(fixture.expected);
        return;
      }
      expect(result.status).toBe("CONSTRUCTED");
      if (result.status !== "CONSTRUCTED") return;

      if (typeof fixture.expectedGuaranteeLevel === "string") {
        expect(result.decision.guaranteeLevel).toBe(fixture.expectedGuaranteeLevel);
        expect(result.receipt.guaranteeLevel).toBe(fixture.expectedGuaranteeLevel);
      }

      if (isRecord(fixture.expectedTimestamps)) {
        expect(result.decision.decidedAt).toBe(fixture.expectedTimestamps["decidedAt"]);
        expect(result.receipt.observedAt).toBe(fixture.expectedTimestamps["observedAt"]);
      }

      if (Array.isArray(fixture.expectedAbsentDecisionFields)) {
        for (const field of fixture.expectedAbsentDecisionFields) {
          if (typeof field !== "string") throw new Error(`malformed absent Decision field in ${fixture.id}`);
          expect(Object.hasOwn(result.decision, field)).toBe(false);
        }
      }

      if (Array.isArray(fixture.expectedAbsentReceiptFields)) {
        for (const field of fixture.expectedAbsentReceiptFields) {
          if (typeof field !== "string") throw new Error(`malformed absent Receipt field in ${fixture.id}`);
          expect(Object.hasOwn(result.receipt, field)).toBe(false);
        }
      }
    });
  }
});

describe("M4-024 protocol boundaries", () => {
  test("512 astral code points are accepted and 513 are rejected", () => {
    const accepted = "😀".repeat(512);
    const rejected = "😀".repeat(513);
    const base = {
      routing: {
        status: "ROUTED",
        effect: "allow",
        routeSource: "POLICY",
        reasonCode: "APPROVAL_NOT_REQUIRED_POLICY_ALLOW",
      },
      issuance: {
        requestRef: accepted,
        decisionRef: accepted,
        receiptRef: accepted,
        guaranteeLevel: "advisory",
        decidedAt: "2026-08-31T10:00:00Z",
        observedAt: "2026-08-31T10:00:00Z",
      },
    };
    expect(constructCapabilityDecisionReceipt(base)).toMatchObject({ status: "CONSTRUCTED" });
    expect(constructCapabilityDecisionReceipt({
      ...base,
      issuance: { ...base.issuance, decisionRef: rejected },
    })).toEqual({
      status: "FAIL_CLOSED",
      stage: "ISSUANCE",
      reasonCode: "DECISION_RECEIPT_DECISION_REF_INVALID",
    });
  });

  test("calendar validation handles leap years and offsets deterministically", () => {
    const base = {
      routing: {
        status: "ROUTED",
        effect: "deny",
        routeSource: "POLICY",
        reasonCode: "APPROVAL_NOT_REQUIRED_POLICY_DENY",
      },
      issuance: {
        requestRef: "req",
        decisionRef: "dec",
        receiptRef: "rec",
        guaranteeLevel: "advisory",
        decidedAt: "2024-02-29T23:59:60+23:59",
        observedAt: "2024-02-29t23:59:59.123z",
      },
    };
    expect(constructCapabilityDecisionReceipt(base)).toMatchObject({ status: "CONSTRUCTED" });
    expect(constructCapabilityDecisionReceipt({
      ...base,
      issuance: { ...base.issuance, decidedAt: "2100-02-29T00:00:00Z" },
    })).toEqual({
      status: "FAIL_CLOSED",
      stage: "ISSUANCE",
      reasonCode: "DECISION_RECEIPT_DECIDED_AT_INVALID",
    });
  });
});
