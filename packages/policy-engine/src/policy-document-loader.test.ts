import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { loadPolicyDocument } from "./policy-document-loader.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixtureRoot = resolve(root, "fixtures/policy-loader");

async function fixture(relativePath: string): Promise<string> {
  return readFile(resolve(fixtureRoot, relativePath), "utf8");
}

describe("M4-001 policy document loader", () => {
  test("loads equivalent portable JSON and YAML documents without validating policy semantics", async () => {
    const json = loadPolicyDocument({
      format: "JSON",
      source: await fixture("valid/policy-minimal.json"),
    });
    const yaml = loadPolicyDocument({
      format: "YAML",
      source: await fixture("valid/policy-minimal.yaml"),
    });

    expect(json.ok).toBe(true);
    expect(yaml).toEqual(json);

    expect(
      loadPolicyDocument({ format: "YAML", source: "notPolicy: true\n" }),
    ).toEqual({ ok: true, value: { notPolicy: true } });
  });

  test.each([
    ["invalid/yaml-duplicate-key.yaml", "POLICY_DOCUMENT_DUPLICATE_KEY"],
    ["invalid/yaml-multiple-documents.yaml", "POLICY_DOCUMENT_MULTIPLE_DOCUMENTS"],
    ["invalid/yaml-alias.yaml", "POLICY_DOCUMENT_YAML_ALIAS_FORBIDDEN"],
    ["invalid/yaml-anchor.yaml", "POLICY_DOCUMENT_YAML_ALIAS_FORBIDDEN"],
    ["invalid/yaml-custom-tag.yaml", "POLICY_DOCUMENT_YAML_TAG_FORBIDDEN"],
    ["invalid/yaml-merge-key.yaml", "POLICY_DOCUMENT_YAML_MERGE_FORBIDDEN"],
    ["invalid/yaml-non-string-key.yaml", "POLICY_DOCUMENT_NON_STRING_KEY"],
    ["invalid/yaml-malformed.yaml", "POLICY_DOCUMENT_SYNTAX_INVALID"],
  ] as const)("maps %s to portable failure reason %s", async (relativePath, reason) => {
    const result = loadPolicyDocument({
      format: "YAML",
      source: await fixture(relativePath),
    });

    expect(result).toMatchObject({ ok: false, reason });
  });

  test("rejects unsupported format without content sniffing fallback", () => {
    const result = loadPolicyDocument({
      format: "TOML",
      source: '{"kind":"CapabilityPolicy"}',
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "POLICY_DOCUMENT_FORMAT_UNSUPPORTED",
    });
  });

  test("rejects YAML non-finite numbers outside the JSON value domain", () => {
    const result = loadPolicyDocument({ format: "YAML", source: "value: .inf\n" });

    expect(result).toMatchObject({
      ok: false,
      reason: "POLICY_DOCUMENT_NON_JSON_VALUE",
    });
  });

  test("enforces source, depth, and container-entry limits on YAML input", () => {
    const sourceFailure = loadPolicyDocument({
      format: "YAML",
      source: "key: value\n",
      limits: { maxSourceBytes: 4 },
    });
    const depthFailure = loadPolicyDocument({
      format: "YAML",
      source: "a:\n  b:\n    c: value\n",
      limits: { maxDepth: 2 },
    });
    const entryFailure = loadPolicyDocument({
      format: "YAML",
      source: "a: 1\nb: 2\n",
      limits: { maxContainerEntries: 1 },
    });

    for (const result of [sourceFailure, depthFailure, entryFailure]) {
      expect(result).toMatchObject({
        ok: false,
        reason: "POLICY_DOCUMENT_LIMIT_EXCEEDED",
      });
    }
  });

  test("rejects deeply nested flow collections before YAML composition", () => {
    const nesting = 512;
    const source = `${"[".repeat(nesting)}0${"]".repeat(nesting)}`;
    const result = loadPolicyDocument({
      format: "YAML",
      source,
      limits: {
        maxSourceBytes: 4096,
        maxDepth: 64,
        maxContainerEntries: 4096,
      },
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "POLICY_DOCUMENT_LIMIT_EXCEEDED",
    });
  });

  test("rejects deeply nested block collections before YAML composition", () => {
    const nesting = 256;
    const source = `${Array.from({ length: nesting }, (_, index) => `${"  ".repeat(index)}-`).join("\n")}\n${"  ".repeat(nesting)}value\n`;
    const result = loadPolicyDocument({
      format: "YAML",
      source,
      limits: {
        maxSourceBytes: 131_072,
        maxDepth: 64,
        maxContainerEntries: 1024,
      },
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "POLICY_DOCUMENT_LIMIT_EXCEEDED",
    });
  });

  test("rejects oversized flow collection fan-out before YAML composition", () => {
    const source = `[${Array.from({ length: 512 }, () => "0").join(",")}]`;
    const result = loadPolicyDocument({
      format: "YAML",
      source,
      limits: {
        maxSourceBytes: 4096,
        maxDepth: 8,
        maxContainerEntries: 64,
      },
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "POLICY_DOCUMENT_LIMIT_EXCEEDED",
    });
  });

  test("preserves __proto__ as ordinary YAML data without prototype mutation", () => {
    const result = loadPolicyDocument({
      format: "YAML",
      source: "__proto__:\n  polluted: true\n",
    });

    expect(result.ok).toBe(true);
    if (
      !result.ok ||
      typeof result.value !== "object" ||
      result.value === null ||
      Array.isArray(result.value)
    ) {
      throw new Error("Expected a YAML mapping result.");
    }

    expect(Object.getPrototypeOf(result.value)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(result.value, "__proto__")).toBe(true);
    expect(result.value["__proto__"]).toEqual({ polluted: true });
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  test("returns detached values across repeated loads", () => {
    const source = "metadata:\n  name: first\n";
    const first = loadPolicyDocument({ format: "YAML", source });
    const second = loadPolicyDocument({ format: "YAML", source });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      throw new Error("Expected successful YAML loads.");
    }
    if (
      typeof first.value !== "object" ||
      first.value === null ||
      Array.isArray(first.value) ||
      typeof second.value !== "object" ||
      second.value === null ||
      Array.isArray(second.value)
    ) {
      throw new Error("Expected mapping results.");
    }

    first.value["metadata"] = "mutated";
    expect(second.value).toEqual({ metadata: { name: "first" } });
  });

  test("keeps explicit sourceRef diagnostic-only", () => {
    const withRef = loadPolicyDocument({
      format: "JSON",
      source: "{\"value\":1}",
      sourceRef: "file:a",
    });
    const withoutRef = loadPolicyDocument({
      format: "JSON",
      source: "{\"value\":1}",
    });

    expect(withRef).toEqual(withoutRef);
  });
});
