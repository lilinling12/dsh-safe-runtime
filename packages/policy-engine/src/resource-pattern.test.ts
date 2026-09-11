import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { matchPolicyResourceSelector } from "./resource-pattern.js";
import type { ResourcePatternMatchResult } from "./rule-ordering-types.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/rule-ordering/pattern-cases.json");

interface PatternFixture {
  readonly id: string;
  readonly selector: unknown;
  readonly resource: unknown;
  readonly expected: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFixtures(): readonly PatternFixture[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed["cases"])) {
    throw new Error("rule-ordering/pattern-cases.json must contain a cases array");
  }

  const seen = new Set<string>();
  return parsed["cases"].map((item): PatternFixture => {
    if (!isRecord(item) || typeof item["id"] !== "string" || !Object.hasOwn(item, "expect")) {
      throw new Error("Every pattern fixture requires id and expect");
    }
    if (seen.has(item["id"])) {
      throw new Error(`Duplicate pattern fixture id: ${item["id"]}`);
    }
    seen.add(item["id"]);
    return {
      id: item["id"],
      selector: item["selector"],
      resource: item["resource"],
      expected: item["expect"],
    };
  });
}

function toPortable(result: ResourcePatternMatchResult): unknown {
  if (!result.ok) {
    return { status: "ERROR", reason: result.reason };
  }
  if (!result.matched) {
    return { status: "NO_MATCH" };
  }
  return { status: "MATCH", specificity: result.specificity };
}

const fixtures = parseFixtures();

describe("M4-004 portable resource pattern profile", () => {
  test("fixture corpus has the expected breadth", () => {
    expect(fixtures).toHaveLength(22);
  });

  for (const fixture of fixtures) {
    test(fixture.id, () => {
      expect(
        toPortable(matchPolicyResourceSelector(fixture.selector, fixture.resource)),
      ).toEqual(fixture.expected);
    });
  }

  test("opaque provider identity cannot change lexical match or specificity", () => {
    const selector = "workspace://src/*.ts";
    const first = matchPolicyResourceSelector(selector, {
      scheme: "workspace",
      locator: "src/a.ts",
      providerIdentity: "provider-token-A",
    });
    const second = matchPolicyResourceSelector(selector, {
      scheme: "workspace",
      locator: "src/a.ts",
      providerIdentity: "totally-different-token",
    });

    expect(first).toEqual(second);
  });
});
