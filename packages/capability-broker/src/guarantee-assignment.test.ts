import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { assignGuaranteeLevel } from "./guarantee-assignment.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/guarantee-assignment/cases.json");

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
    || parsed["profile"] !== "M4-025_GUARANTEE_ASSIGNMENT_V1"
    || !Array.isArray(parsed["cases"])
  ) {
    throw new Error("guarantee-assignment fixture must contain the reviewed profile and cases array");
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
      throw new Error("malformed guarantee-assignment portable fixture");
    }

    const expectedId = `GA-${String(index + 1).padStart(3, "0")}`;
    if (raw["id"] !== expectedId) {
      throw new Error(`non-canonical guarantee-assignment fixture id: expected ${expectedId}, got ${raw["id"]}`);
    }
    if (seen.has(raw["id"])) throw new Error(`duplicate guarantee-assignment fixture id: ${raw["id"]}`);
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

describe("M4-025 portable guarantee-assignment corpus", () => {
  test("fixture corpus has the reviewed breadth and canonical IDs", () => {
    expect(cases).toHaveLength(30);
    expect(cases.at(0)?.id).toBe("GA-001");
    expect(cases.at(-1)?.id).toBe("GA-030");
  });

  for (const fixture of cases) {
    test(`${fixture.id}: ${fixture.description}`, () => {
      expect(assignGuaranteeLevel(fixture.input)).toEqual(fixture.expected);
    });
  }
});

describe("M4-025 deterministic boundary precedence", () => {
  test("a valid weak stronger boundary falls through but a malformed one does not", () => {
    const tool = {
      state: "ENFORCING",
      authorizationBinding: "EXACT_ACTION",
      dispatchControl: "MANDATORY",
    };

    expect(assignGuaranteeLevel({
      profile: "M4-025_GUARANTEE_ASSIGNMENT_V1",
      evidence: {
        isolation: {
          state: "ENFORCING",
          boundary: "CONTAINER",
          authorizationBinding: "EXACT_CAPABILITY_RESOURCE",
          coverage: "PARTIAL",
          directHostBypass: "BLOCKED",
          deploymentEvidence: "VERIFIED",
        },
        provider: { state: "NONE" },
        tool,
      },
    })).toEqual({
      status: "ASSIGNED",
      guaranteeLevel: "tool-enforced",
      reasonCode: "GUARANTEE_ASSIGNED_TOOL_ENFORCED",
    });

    expect(assignGuaranteeLevel({
      profile: "M4-025_GUARANTEE_ASSIGNMENT_V1",
      evidence: {
        isolation: {
          state: "ENFORCING",
          boundary: "CONTAINER",
          authorizationBinding: "EXACT_CAPABILITY_RESOURCE",
          coverage: "COMPLETE",
          deploymentEvidence: "VERIFIED",
        },
        provider: { state: "NONE" },
        tool,
      },
    })).toEqual({
      status: "FAIL_CLOSED",
      stage: "ISOLATION",
      reasonCode: "GUARANTEE_ASSIGNMENT_ISOLATION_EVIDENCE_INVALID",
    });
  });
});
