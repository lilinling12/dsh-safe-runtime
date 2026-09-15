import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CanonicalJsonError,
  canonicalizeJson,
  canonicalizeJsonText,
} from "../src/canonical-json.js";

interface CanonicalJsonCorpus {
  readonly profile: string;
  readonly cases: ReadonlyArray<{ readonly id: string }>;
}

const repositoryRoot = process.cwd();
const corpus = JSON.parse(
  readFileSync(resolve(repositoryRoot, "fixtures/canonical-json/cases.json"), "utf8"),
) as CanonicalJsonCorpus;

function expectCanonicalError(code: string, value: unknown): void {
  let captured: unknown;
  try {
    canonicalizeJsonText(value);
  } catch (error) {
    captured = error;
  }
  expect(captured).toBeInstanceOf(CanonicalJsonError);
  expect((captured as CanonicalJsonError).code).toBe(code);
}

const coverage: Readonly<Record<string, () => void>> = {
  "CJ-001": () => {
    expect(canonicalizeJsonText(null)).toBe("null");
    expect(Array.from(canonicalizeJson(null))).toEqual([0x6e, 0x75, 0x6c, 0x6c]);
  },
  "CJ-002": () => expect(canonicalizeJsonText(true)).toBe("true"),
  "CJ-003": () => expect(canonicalizeJsonText(false)).toBe("false"),
  "CJ-004": () => expect(canonicalizeJsonText("")).toBe("\"\""),
  "CJ-005": () => {
    expect(canonicalizeJsonText("\b\t\n\f\r")).toBe("\"\\b\\t\\n\\f\\r\"");
  },
  "CJ-006": () => {
    expect(canonicalizeJsonText("\u0000\u001f")).toBe("\"\\u0000\\u001f\"");
  },
  "CJ-007": () => {
    expect(canonicalizeJsonText("\"\\")).toBe("\"\\\"\\\\\"");
  },
  "CJ-008": () => expect(canonicalizeJsonText("/")).toBe("\"/\""),
  "CJ-009": () => expect(canonicalizeJsonText("é😀")).toBe("\"é😀\""),
  "CJ-010": () => {
    const composed = canonicalizeJsonText("é");
    const decomposed = canonicalizeJsonText("e\u0301");
    expect(composed).toBe("\"é\"");
    expect(decomposed).toBe("\"é\"");
    expect(composed).not.toBe(decomposed);
  },
  "CJ-011": () => expectCanonicalError("INVALID_UNICODE", "\ud800"),
  "CJ-012": () => expectCanonicalError("INVALID_UNICODE", "\udc00"),
  "CJ-013": () => expect(canonicalizeJsonText([])).toBe("[]"),
  "CJ-014": () => expect(canonicalizeJsonText([3, 1, 2])).toBe("[3,1,2]"),
  "CJ-015": () => {
    expect(canonicalizeJsonText([{ b: 1, a: 2 }, { d: 4, c: 3 }])).toBe(
      "[{\"a\":2,\"b\":1},{\"c\":3,\"d\":4}]",
    );
  },
  "CJ-016": () => expect(canonicalizeJsonText({})).toBe("{}"),
  "CJ-017": () => {
    expect(canonicalizeJsonText({ z: 1, a: 2, A: 3 })).toBe(
      "{\"A\":3,\"a\":2,\"z\":1}",
    );
  },
  "CJ-018": () => {
    expect(canonicalizeJsonText({ a: 2, "\n": 1 })).toBe("{\"\\n\":1,\"a\":2}");
  },
  "CJ-019": () => {
    const value = Object.fromEntries([
      ["€", "euro"],
      ["\r", "cr"],
      ["דּ", "hebrew"],
      ["1", "one"],
      ["😀", "emoji"],
      ["\u0080", "control"],
      ["ö", "latin"],
    ]);
    expect(canonicalizeJsonText(value)).toBe(
      "{\"\\r\":\"cr\",\"1\":\"one\",\"\":\"control\",\"ö\":\"latin\",\"€\":\"euro\",\"😀\":\"emoji\",\"דּ\":\"hebrew\"}",
    );
  },
  "CJ-020": () => {
    expect(canonicalizeJsonText({ z: { d: 4, c: 3 }, a: { b: 2, a: 1 } })).toBe(
      "{\"a\":{\"a\":1,\"b\":2},\"z\":{\"c\":3,\"d\":4}}",
    );
  },
  "CJ-021": () => {
    const text = canonicalizeJsonText({ b: [2, 1], a: true });
    expect(text).toBe("{\"a\":true,\"b\":[2,1]}");
    expect(text).not.toMatch(/[\n\r\t]/u);
  },
  "CJ-022": () => expect(canonicalizeJsonText(-0)).toBe("0"),
  "CJ-023": () => expect(canonicalizeJsonText(123456789)).toBe("123456789"),
  "CJ-024": () => expect(canonicalizeJsonText(1e30)).toBe("1e+30"),
  "CJ-025": () => expect(canonicalizeJsonText(0.002)).toBe("0.002"),
  "CJ-026": () => expect(canonicalizeJsonText(1e-27)).toBe("1e-27"),
  "CJ-027": () => {
    expect(canonicalizeJsonText(333333333.33333329)).toBe("333333333.3333333");
    expect(canonicalizeJsonText(4.5)).toBe("4.5");
  },
  "CJ-028": () => expectCanonicalError("NON_FINITE_NUMBER", Number.NaN),
  "CJ-029": () => expectCanonicalError("NON_FINITE_NUMBER", Number.POSITIVE_INFINITY),
  "CJ-030": () => expectCanonicalError("NON_FINITE_NUMBER", Number.NEGATIVE_INFINITY),
  "CJ-031": () => {
    class HostValue {}
    const probes: readonly unknown[] = [
      undefined,
      () => undefined,
      Symbol("host"),
      1n,
      new Date(0),
      new Map(),
      new Set(),
      new HostValue(),
    ];
    for (const probe of probes) expectCanonicalError("UNSUPPORTED_VALUE", probe);
  },
  "CJ-032": () => {
    const objectCycle: { self?: unknown } = {};
    objectCycle.self = objectCycle;
    expectCanonicalError("CYCLIC_STRUCTURE", objectCycle);

    const arrayCycle: unknown[] = [];
    arrayCycle.push(arrayCycle);
    expectCanonicalError("CYCLIC_STRUCTURE", arrayCycle);
  },
  "CJ-033": () => {
    expect(Array.from(canonicalizeJson("é"))).toEqual([0x22, 0xc3, 0xa9, 0x22]);
  },
  "CJ-034": () => {
    const first: Record<string, unknown> = {};
    first.b = 2;
    first.a = 1;
    const second: Record<string, unknown> = {};
    second.a = 1;
    second.b = 2;
    expect(Array.from(canonicalizeJson(first))).toEqual(Array.from(canonicalizeJson(second)));
  },
  "CJ-035": () => {
    const source = readFileSync(
      resolve(repositoryRoot, "packages/protocol/src/canonical-json.ts"),
      "utf8",
    );
    expect(source).not.toContain("node:crypto");
    expect(source).not.toContain("createHash(");
  },
  "CJ-036": () => {
    const spec = readFileSync(resolve(repositoryRoot, "specs/0054-m5-canonical-json.md"), "utf8");
    expect(spec).toContain("The M5-002 protocol-first candidate is restricted to exactly:");
    expect(spec).toContain("M5-003 remains unauthorized until M5-002 governance is separately closed.");
  },
};

describe("M5-002 canonical JSON portable corpus", () => {
  it("pins the exact profile and case set", () => {
    expect(corpus.profile).toBe("M5-002_CANONICAL_JSON_RFC8785_V1");
    expect(corpus.cases.map((entry) => entry.id)).toEqual(
      Array.from({ length: 36 }, (_, index) => `CJ-${String(index + 1).padStart(3, "0")}`),
    );
    expect(Object.keys(coverage).sort()).toEqual(corpus.cases.map((entry) => entry.id).sort());
  });

  for (const entry of corpus.cases) {
    it(`${entry.id} has executable coverage`, () => {
      const execute = coverage[entry.id];
      expect(execute, `missing executable coverage for ${entry.id}`).toBeTypeOf("function");
      execute();
    });
  }
});
