import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { parseJsonPolicyDocument } from "./json-document-parser.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixtureRoot = resolve(root, "fixtures/policy-loader");

async function fixture(relativePath: string): Promise<string> {
  return readFile(resolve(fixtureRoot, relativePath), "utf8");
}

describe("M4-001 strict JSON document parser", () => {
  test("loads the portable JSON policy source without performing schema validation", async () => {
    const result = parseJsonPolicyDocument(await fixture("valid/policy-minimal.json"));

    expect(result).toEqual({
      ok: true,
      value: {
        apiVersion: "safe-runtime.dev/v1alpha1",
        kind: "CapabilityPolicy",
        metadata: { name: "minimal" },
        spec: { defaultEffect: "deny", rules: [] },
      },
    });

    expect(parseJsonPolicyDocument('{"not":"a capability policy"}')).toEqual({
      ok: true,
      value: { not: "a capability policy" },
    });
  });

  test("rejects duplicate object keys before last-write-wins information loss", async () => {
    const result = parseJsonPolicyDocument(await fixture("invalid/json-duplicate-key.json"));

    expect(result).toMatchObject({
      ok: false,
      reason: "POLICY_DOCUMENT_DUPLICATE_KEY",
    });
  });

  test("rejects malformed JSON without returning a partial document", async () => {
    const result = parseJsonPolicyDocument(await fixture("invalid/json-malformed.json"));

    expect(result).toMatchObject({
      ok: false,
      reason: "POLICY_DOCUMENT_SYNTAX_INVALID",
    });
  });

  test("preserves __proto__ as ordinary data instead of mutating the object prototype", () => {
    const result = parseJsonPolicyDocument('{"__proto__":{"polluted":true}}');
    expect(result.ok).toBe(true);
    if (!result.ok || typeof result.value !== "object" || result.value === null || Array.isArray(result.value)) {
      throw new Error("Expected a JSON object result.");
    }

    expect(Object.getPrototypeOf(result.value)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(result.value, "__proto__")).toBe(true);
    expect(result.value["__proto__"]).toEqual({ polluted: true });
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  test("fails closed when source bytes exceed the configured maximum", () => {
    const result = parseJsonPolicyDocument('"abcd"', {
      maxSourceBytes: 4,
      maxDepth: 8,
      maxContainerEntries: 8,
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "POLICY_DOCUMENT_LIMIT_EXCEEDED",
    });
  });

  test("fails closed when nesting depth exceeds the configured maximum", () => {
    const result = parseJsonPolicyDocument("[[[0]]]", {
      maxSourceBytes: 128,
      maxDepth: 2,
      maxContainerEntries: 8,
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "POLICY_DOCUMENT_LIMIT_EXCEEDED",
    });
  });

  test("fails closed when container entries exceed the configured maximum", () => {
    const result = parseJsonPolicyDocument('{"a":1,"b":2}', {
      maxSourceBytes: 128,
      maxDepth: 8,
      maxContainerEntries: 1,
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "POLICY_DOCUMENT_LIMIT_EXCEEDED",
    });
  });

  test("rejects finite-syntax numbers that cannot be represented as finite runtime numbers", () => {
    const result = parseJsonPolicyDocument("1e9999");

    expect(result).toMatchObject({
      ok: false,
      reason: "POLICY_DOCUMENT_NON_JSON_VALUE",
    });
  });

  test("treats invalid limit configuration as a programmer error rather than a portable document failure", () => {
    expect(() =>
      parseJsonPolicyDocument("{}", {
        maxSourceBytes: 0,
        maxDepth: 8,
        maxContainerEntries: 8,
      }),
    ).toThrow(RangeError);
  });
});
