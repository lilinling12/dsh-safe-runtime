import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { resolveToolClassification } from "./unknown-tool-fallback.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../../..");
const fixturePath = resolve(
  root,
  "fixtures/tool-classifier/unknown-tool-fallback-cases.json",
);

interface FixtureCase {
  readonly id: string;
  readonly description: string;
  readonly fallbackProfile: unknown;
  readonly toolName: unknown;
  readonly arguments: unknown;
  readonly expected: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCases(): readonly FixtureCase[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed["cases"])) {
    throw new Error("unknown-tool fallback fixture must contain a cases array");
  }

  const seen = new Set<string>();
  return parsed["cases"].map((value) => {
    if (
      !isRecord(value)
      || typeof value["id"] !== "string"
      || typeof value["description"] !== "string"
      || !Object.hasOwn(value, "fallbackProfile")
      || !Object.hasOwn(value, "toolName")
      || !Object.hasOwn(value, "arguments")
      || !Object.hasOwn(value, "expected")
    ) {
      throw new Error(
        "every unknown-tool fallback fixture requires id, description, fallbackProfile, toolName, arguments, and expected",
      );
    }
    if (seen.has(value["id"])) {
      throw new Error(`duplicate unknown-tool fallback fixture id: ${value["id"]}`);
    }
    seen.add(value["id"]);
    return {
      id: value["id"],
      description: value["description"],
      fallbackProfile: value["fallbackProfile"],
      toolName: value["toolName"],
      arguments: value["arguments"],
      expected: value["expected"],
    };
  });
}

const cases = parseCases();

describe("M4-013 portable unknown-tool fallback resolution", () => {
  test("fixture corpus has the reviewed breadth", () => {
    expect(cases).toHaveLength(22);
  });

  for (const fixture of cases) {
    test(`${fixture.id}: ${fixture.description}`, () => {
      expect(
        resolveToolClassification(
          fixture.fallbackProfile,
          fixture.toolName,
          fixture.arguments,
        ),
      ).toEqual(fixture.expected);
    });
  }
});

describe("M4-013 hostile runtime and fail-closed boundaries", () => {
  test("invalid profile returns before hostile arguments are inspected", () => {
    let descriptorCalls = 0;
    const argumentsValue = new Proxy({}, {
      getOwnPropertyDescriptor() {
        descriptorCalls += 1;
        throw new Error("must not inspect arguments for invalid profile");
      },
    });

    expect(resolveToolClassification("ALLOW", "bash", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "UNKNOWN_TOOL_PROFILE_INVALID",
    });
    expect(descriptorCalls).toBe(0);
  });

  test("invalid tool name returns before hostile arguments are inspected", () => {
    let descriptorCalls = 0;
    const argumentsValue = new Proxy({}, {
      getOwnPropertyDescriptor() {
        descriptorCalls += 1;
        throw new Error("must not inspect arguments for invalid tool name");
      },
    });

    expect(resolveToolClassification("STRICT_DENY_V1", 42, argumentsValue)).toEqual({
      status: "ERROR",
      reason: "TOOL_NAME_INVALID",
    });
    expect(descriptorCalls).toBe(0);
  });

  test("unknown exact name does not execute argument getters", () => {
    let getterCalls = 0;
    const argumentsValue = Object.defineProperty({}, "command", {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("unknown-tool arguments must remain opaque");
      },
    });

    expect(
      resolveToolClassification("STRICT_DENY_V1", "future_tool", argumentsValue),
    ).toEqual({
      status: "UNCLASSIFIED",
      profile: "STRICT_DENY_V1",
      disposition: "BLOCK",
      reason: "NO_APPLICABLE_CLASSIFIER",
    });
    expect(getterCalls).toBe(0);
  });

  test("unknown exact name does not enumerate hostile arguments", () => {
    let ownKeysCalls = 0;
    const argumentsValue = new Proxy({}, {
      ownKeys() {
        ownKeysCalls += 1;
        throw new Error("unknown-tool arguments must not be enumerated");
      },
    });

    expect(
      resolveToolClassification("STRICT_DENY_V1", "future_tool", argumentsValue),
    ).toEqual({
      status: "UNCLASSIFIED",
      profile: "STRICT_DENY_V1",
      disposition: "BLOCK",
      reason: "NO_APPLICABLE_CLASSIFIER",
    });
    expect(ownKeysCalls).toBe(0);
  });

  test("revoked Proxy arguments for unknown name remain strict fallback", () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();

    expect(
      resolveToolClassification("STRICT_DENY_V1", "future_tool", proxy),
    ).toEqual({
      status: "UNCLASSIFIED",
      profile: "STRICT_DENY_V1",
      disposition: "BLOCK",
      reason: "NO_APPLICABLE_CLASSIFIER",
    });
  });

  test("recognized revoked Proxy arguments preserve filesystem unreadable error", () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();

    expect(resolveToolClassification("STRICT_DENY_V1", "read", proxy)).toEqual({
      status: "ERROR",
      reason: "FS_TOOL_ARGUMENTS_INVALID",
    });
  });

  test("recognized revoked Proxy arguments preserve shell unreadable error", () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();

    expect(resolveToolClassification("STRICT_DENY_V1", "bash", proxy)).toEqual({
      status: "ERROR",
      reason: "SHELL_TOOL_ARGUMENTS_INVALID",
    });
  });

  test("resolver-owned results are frozen", () => {
    const unknown = resolveToolClassification("STRICT_DENY_V1", "future_tool", {});
    const invalidProfile = resolveToolClassification("allow", "future_tool", {});
    const invalidName = resolveToolClassification("STRICT_DENY_V1", "", {});

    expect(Object.isFrozen(unknown)).toBe(true);
    expect(Object.isFrozen(invalidProfile)).toBe(true);
    expect(Object.isFrozen(invalidName)).toBe(true);
  });

  test("unknown result does not retain caller arguments", () => {
    const secret = { nested: { token: "do-not-retain" } };
    const result = resolveToolClassification("STRICT_DENY_V1", "future_tool", secret);

    secret.nested.token = "changed";

    expect(result).toEqual({
      status: "UNCLASSIFIED",
      profile: "STRICT_DENY_V1",
      disposition: "BLOCK",
      reason: "NO_APPLICABLE_CLASSIFIER",
    });
    expect(JSON.stringify(result)).not.toContain("do-not-retain");
    expect(JSON.stringify(result)).not.toContain("changed");
  });

  test("MCP-looking names remain opaque even with safety-looking annotations", () => {
    const result = resolveToolClassification(
      "STRICT_DENY_V1",
      "mcp__server__read_only_tool",
      {
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
    );

    expect(result).toEqual({
      status: "UNCLASSIFIED",
      profile: "STRICT_DENY_V1",
      disposition: "BLOCK",
      reason: "NO_APPLICABLE_CLASSIFIER",
    });
  });
});
