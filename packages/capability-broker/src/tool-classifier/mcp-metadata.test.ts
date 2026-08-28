import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { classifyMcpToolMetadata } from "./mcp-metadata.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../../..");
const fixturePath = resolve(root, "fixtures/tool-classifier/mcp-metadata-cases.json");

interface FixtureCase {
  readonly id: string;
  readonly description: string;
  readonly metadata: unknown;
  readonly expected: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCases(): readonly FixtureCase[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed["cases"])) {
    throw new Error("MCP metadata classifier fixture must contain a cases array");
  }

  const seen = new Set<string>();
  return parsed["cases"].map((value) => {
    if (
      !isRecord(value)
      || typeof value["id"] !== "string"
      || typeof value["description"] !== "string"
      || !Object.hasOwn(value, "metadata")
      || !Object.hasOwn(value, "expected")
    ) {
      throw new Error(
        "every MCP metadata classifier fixture requires id, description, metadata, and expected",
      );
    }
    if (seen.has(value["id"])) {
      throw new Error(`duplicate MCP metadata classifier fixture id: ${value["id"]}`);
    }
    seen.add(value["id"]);
    return {
      id: value["id"],
      description: value["description"],
      metadata: value["metadata"],
      expected: value["expected"],
    };
  });
}

const cases = parseCases();

describe("M4-012 portable MCP metadata classifier", () => {
  test("fixture corpus has the reviewed breadth", () => {
    expect(cases).toHaveLength(19);
  });

  for (const fixture of cases) {
    test(`${fixture.id}: ${fixture.description}`, () => {
      expect(classifyMcpToolMetadata(fixture.metadata)).toEqual(fixture.expected);
    });
  }
});

describe("M4-012 hostile MCP metadata", () => {
  test("inherited annotations are absent and use MCP defaults", () => {
    const metadata = Object.create({
      annotations: { readOnlyHint: true },
    }) as object;

    expect(classifyMcpToolMetadata(metadata)).toEqual(classifyMcpToolMetadata({}));
  });

  test("annotations accessor is rejected without executing the getter", () => {
    let getterCalls = 0;
    const metadata = Object.defineProperty({}, "annotations", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return { readOnlyHint: true };
      },
    });

    expect(classifyMcpToolMetadata(metadata)).toEqual({
      status: "ERROR",
      reason: "MCP_TOOL_METADATA_UNREADABLE",
    });
    expect(getterCalls).toBe(0);
  });

  test("inherited known hints cannot override MCP defaults", () => {
    const annotations = Object.create({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    }) as object;

    expect(classifyMcpToolMetadata({ annotations })).toEqual(
      classifyMcpToolMetadata({ annotations: {} }),
    );
  });

  for (const name of [
    "readOnlyHint",
    "destructiveHint",
    "idempotentHint",
    "openWorldHint",
  ] as const) {
    test(`${name} accessor is rejected without executing the getter`, () => {
      let getterCalls = 0;
      const annotations = Object.defineProperty({}, name, {
        enumerable: true,
        get() {
          getterCalls += 1;
          return true;
        },
      });

      expect(classifyMcpToolMetadata({ annotations })).toEqual({
        status: "ERROR",
        reason: "MCP_TOOL_METADATA_UNREADABLE",
      });
      expect(getterCalls).toBe(0);
    });
  }

  test("unknown annotation getters and ownKeys traps are never touched", () => {
    let getterCalls = 0;
    let ownKeysCalls = 0;
    const target = Object.defineProperty({}, "futureRiskHint", {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("unknown metadata must not be inspected");
      },
    });
    const annotations = new Proxy(target, {
      ownKeys() {
        ownKeysCalls += 1;
        throw new Error("classifier must not enumerate annotations");
      },
    });

    expect(classifyMcpToolMetadata({ annotations })).toEqual(
      classifyMcpToolMetadata({ annotations: {} }),
    );
    expect(getterCalls).toBe(0);
    expect(ownKeysCalls).toBe(0);
  });

  test("descriptor failures are fail-closed for the carrier", () => {
    const metadata = new Proxy({}, {
      getOwnPropertyDescriptor() {
        throw new Error("revoked-like carrier");
      },
    });

    expect(classifyMcpToolMetadata(metadata)).toEqual({
      status: "ERROR",
      reason: "MCP_TOOL_METADATA_UNREADABLE",
    });
  });

  test("descriptor failures are fail-closed for known annotation fields", () => {
    const visited: string[] = [];
    const annotations = new Proxy({}, {
      getOwnPropertyDescriptor(_target, key) {
        visited.push(String(key));
        if (key === "idempotentHint") {
          throw new Error("unreadable idempotent hint");
        }
        return undefined;
      },
    });

    expect(classifyMcpToolMetadata({ annotations })).toEqual({
      status: "ERROR",
      reason: "MCP_TOOL_METADATA_UNREADABLE",
    });
    expect(visited).toEqual([
      "readOnlyHint",
      "destructiveHint",
      "idempotentHint",
    ]);
  });

  test("known fields are inspected in normative order and stop at first invalid field", () => {
    const visited: string[] = [];
    const annotations = new Proxy({}, {
      getOwnPropertyDescriptor(_target, key) {
        visited.push(String(key));
        if (key === "destructiveHint") {
          return {
            configurable: true,
            enumerable: true,
            value: "false",
            writable: true,
          };
        }
        return undefined;
      },
    });

    expect(classifyMcpToolMetadata({ annotations })).toEqual({
      status: "ERROR",
      reason: "MCP_TOOL_DESTRUCTIVE_HINT_INVALID",
    });
    expect(visited).toEqual(["readOnlyHint", "destructiveHint"]);
  });

  test("successful evidence is detached from caller mutation", () => {
    const annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
    const result = classifyMcpToolMetadata({ annotations });

    annotations.readOnlyHint = false;
    annotations.destructiveHint = true;
    annotations.idempotentHint = false;
    annotations.openWorldHint = true;

    expect(result).toEqual({
      status: "CLASSIFIED",
      evidence: {
        kind: "MCP_TOOL_ANNOTATIONS",
        profile: "MCP_2025_11_25",
        authority: "ADVISORY_ONLY",
        trust: "UNVERIFIED_SERVER",
        hints: {
          readOnlyHint: { value: true, source: "EXPLICIT" },
          destructiveHint: {
            value: false,
            source: "EXPLICIT",
            applicability: "NOT_APPLICABLE_READ_ONLY",
          },
          idempotentHint: {
            value: true,
            source: "EXPLICIT",
            applicability: "NOT_APPLICABLE_READ_ONLY",
          },
          openWorldHint: { value: false, source: "EXPLICIT" },
        },
      },
    });
  });

  test("successful evidence is recursively frozen", () => {
    const result = classifyMcpToolMetadata({
      annotations: { readOnlyHint: true },
    });
    expect(result.status).toBe("CLASSIFIED");
    if (result.status !== "CLASSIFIED") return;

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.evidence)).toBe(true);
    expect(Object.isFrozen(result.evidence.hints)).toBe(true);
    expect(Object.isFrozen(result.evidence.hints.readOnlyHint)).toBe(true);
    expect(Object.isFrozen(result.evidence.hints.destructiveHint)).toBe(true);
    expect(Object.isFrozen(result.evidence.hints.idempotentHint)).toBe(true);
    expect(Object.isFrozen(result.evidence.hints.openWorldHint)).toBe(true);
  });
});
