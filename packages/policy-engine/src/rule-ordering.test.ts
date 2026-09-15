import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { orderRuleCandidatesForResource } from "./rule-ordering.js";
import type { RuleOrderingResult } from "./rule-ordering-types.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/rule-ordering/ordering-cases.json");

interface OrderingFixture {
  readonly id: string;
  readonly resource: unknown;
  readonly candidates: readonly unknown[];
  readonly permutations?: readonly (readonly string[])[];
  readonly resourcePermutations?: readonly (readonly string[])[];
  readonly expected: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFixtures(): readonly OrderingFixture[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed["cases"])) {
    throw new Error("rule-ordering/ordering-cases.json must contain a cases array");
  }

  const seen = new Set<string>();
  return parsed["cases"].map((item): OrderingFixture => {
    if (
      !isRecord(item) ||
      typeof item["id"] !== "string" ||
      !Array.isArray(item["candidates"]) ||
      !Object.hasOwn(item, "expect")
    ) {
      throw new Error("Every ordering fixture requires id, candidates and expect");
    }
    if (seen.has(item["id"])) {
      throw new Error(`Duplicate ordering fixture id: ${item["id"]}`);
    }
    seen.add(item["id"]);

    const permutations = item["permutations"];
    const resourcePermutations = item["resourcePermutations"];
    return {
      id: item["id"],
      resource: item["resource"],
      candidates: item["candidates"],
      ...(Array.isArray(permutations) ? { permutations: permutations as readonly string[][] } : {}),
      ...(Array.isArray(resourcePermutations)
        ? { resourcePermutations: resourcePermutations as readonly string[][] }
        : {}),
      expected: item["expect"],
    };
  });
}

function toPortable(result: RuleOrderingResult): unknown {
  if (!result.ok) {
    return { status: "ERROR", reason: result.reason };
  }
  return { status: "PASS", bands: result.bands };
}

function candidateId(candidate: unknown): string {
  if (!isRecord(candidate) || typeof candidate["id"] !== "string") {
    throw new Error("Permutation fixtures require candidates with string ids");
  }
  return candidate["id"];
}

function permuteCandidates(
  candidates: readonly unknown[],
  order: readonly string[],
): readonly unknown[] {
  const byId = new Map(candidates.map((candidate) => [candidateId(candidate), candidate]));
  return order.map((id) => {
    const candidate = byId.get(id);
    if (candidate === undefined) {
      throw new Error(`Unknown permutation candidate id: ${id}`);
    }
    return candidate;
  });
}

function replaceSingleCandidateResources(
  candidates: readonly unknown[],
  resources: readonly string[],
): readonly unknown[] {
  if (candidates.length !== 1 || !isRecord(candidates[0])) {
    throw new Error("resourcePermutations requires exactly one object candidate");
  }
  return [{ ...candidates[0], resources: [...resources] }];
}

const fixtures = parseFixtures();

describe("M4-004 deterministic rule ordering", () => {
  test("fixture corpus has the expected breadth", () => {
    expect(fixtures).toHaveLength(15);
  });

  for (const fixture of fixtures) {
    test(fixture.id, () => {
      expect(
        toPortable(orderRuleCandidatesForResource(fixture.resource, fixture.candidates)),
      ).toEqual(fixture.expected);

      for (const permutation of fixture.permutations ?? []) {
        expect(
          toPortable(
            orderRuleCandidatesForResource(
              fixture.resource,
              permuteCandidates(fixture.candidates, permutation),
            ),
          ),
        ).toEqual(fixture.expected);
      }

      for (const resourcePermutation of fixture.resourcePermutations ?? []) {
        expect(
          toPortable(
            orderRuleCandidatesForResource(
              fixture.resource,
              replaceSingleCandidateResources(fixture.candidates, resourcePermutation),
            ),
          ),
        ).toEqual(fixture.expected);
      }
    });
  }

  test("effect-like runtime fields are ignored rather than becoming precedence", () => {
    const resource = { scheme: "workspace", locator: "src/a.ts" };
    const withoutEffects = [
      { id: "a", resources: ["workspace://src/*.ts"] },
      { id: "b", resources: ["workspace://src/*.ts"] },
    ];
    const withEffects = [
      { ...withoutEffects[0], effect: "allow" },
      { ...withoutEffects[1], effect: "deny" },
    ];

    expect(orderRuleCandidatesForResource(resource, withEffects)).toEqual(
      orderRuleCandidatesForResource(resource, withoutEffects),
    );
  });

  test("own undefined priority fails closed instead of becoming absent priority", () => {
    expect(
      orderRuleCandidatesForResource(
        { scheme: "workspace", locator: "src/a.ts" },
        [{ id: "rule", resources: ["workspace://src/*.ts"], priority: undefined }],
      ),
    ).toEqual({ ok: false, reason: "RULE_ORDERING_INPUT_INVALID" });
  });

  test("required candidate fields must be own properties", () => {
    const inherited = Object.create({
      id: "inherited",
      resources: ["workspace://src/*.ts"],
    }) as object;

    expect(
      orderRuleCandidatesForResource(
        { scheme: "workspace", locator: "src/a.ts" },
        [inherited],
      ),
    ).toEqual({ ok: false, reason: "RULE_ORDERING_INPUT_INVALID" });
  });
});
