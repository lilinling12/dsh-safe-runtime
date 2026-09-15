import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { classifyBuiltinFilesystemTool } from "./builtin-filesystem-tool-classifier.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/tool-classifier/builtin-fs-cases.json");

interface FixtureCase {
  readonly id: string;
  readonly description: string;
  readonly toolName: string;
  readonly arguments: unknown;
  readonly expected: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCases(): readonly FixtureCase[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed["cases"])) {
    throw new Error("built-in FS classifier fixture must contain a cases array");
  }

  const seen = new Set<string>();
  return parsed["cases"].map((value) => {
    if (
      !isRecord(value)
      || typeof value["id"] !== "string"
      || typeof value["description"] !== "string"
      || typeof value["toolName"] !== "string"
      || !Object.hasOwn(value, "arguments")
      || !Object.hasOwn(value, "expected")
    ) {
      throw new Error("every built-in FS classifier fixture requires id, description, toolName, arguments, and expected");
    }
    if (seen.has(value["id"])) {
      throw new Error(`duplicate built-in FS classifier fixture id: ${value["id"]}`);
    }
    seen.add(value["id"]);
    return {
      id: value["id"],
      description: value["description"],
      toolName: value["toolName"],
      arguments: value["arguments"],
      expected: value["expected"],
    };
  });
}

const cases = parseCases();

describe("M4-010 portable built-in filesystem classifier", () => {
  test("fixture corpus has the reviewed breadth", () => {
    expect(cases).toHaveLength(22);
  });

  for (const fixture of cases) {
    test(`${fixture.id}: ${fixture.description}`, () => {
      expect(
        classifyBuiltinFilesystemTool(fixture.toolName, fixture.arguments),
      ).toEqual(fixture.expected);
    });
  }
});

describe("M4-010 hostile runtime arguments", () => {
  test("inherited file_path cannot manufacture a filesystem operand", () => {
    const prototype = { file_path: "/workspace/inherited.txt" };
    const argumentsValue = Object.create(prototype) as object;

    expect(classifyBuiltinFilesystemTool("read", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "FS_TOOL_PATH_INVALID",
    });
  });

  test("inherited editor command cannot select an effect envelope", () => {
    const prototype = { command: "view" };
    const argumentsValue = Object.assign(Object.create(prototype) as object, {
      path: "/workspace/a.txt",
    });

    expect(classifyBuiltinFilesystemTool("str_replace_editor", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "FS_TOOL_COMMAND_INVALID",
    });
  });

  test("path accessor is rejected without executing the getter", () => {
    let getterCalls = 0;
    const argumentsValue = Object.defineProperty({}, "file_path", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "/workspace/secret.txt";
      },
    });

    expect(classifyBuiltinFilesystemTool("read", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "FS_TOOL_INPUT_UNREADABLE",
    });
    expect(getterCalls).toBe(0);
  });

  test("command accessor is rejected without executing the getter", () => {
    let getterCalls = 0;
    const argumentsValue = Object.defineProperties({}, {
      command: {
        enumerable: true,
        get() {
          getterCalls += 1;
          return "view";
        },
      },
      path: {
        enumerable: true,
        value: "/workspace/a.txt",
      },
    });

    expect(classifyBuiltinFilesystemTool("str_replace_editor", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "FS_TOOL_INPUT_UNREADABLE",
    });
    expect(getterCalls).toBe(0);
  });

  test("unrelated accessors are never evaluated or enumerated", () => {
    let getterCalls = 0;
    const argumentsValue = Object.defineProperties({}, {
      file_path: {
        enumerable: true,
        value: "/workspace/a.txt",
      },
      content: {
        enumerable: true,
        get() {
          getterCalls += 1;
          throw new Error("content must remain opaque to classifier");
        },
      },
    });

    expect(classifyBuiltinFilesystemTool("write", argumentsValue)).toEqual({
      status: "CLASSIFIED",
      requirements: [
        {
          capability: "fs.create",
          operand: {
            source: "ARGUMENT_PATH",
            argumentName: "file_path",
            rawPath: "/workspace/a.txt",
            reach: "EXACT",
          },
        },
        {
          capability: "fs.write",
          operand: {
            source: "ARGUMENT_PATH",
            argumentName: "file_path",
            rawPath: "/workspace/a.txt",
            reach: "EXACT",
          },
        },
      ],
    });
    expect(getterCalls).toBe(0);
  });

  test("symbol-only path substitution is not accepted", () => {
    const argumentsValue = {
      [Symbol("file_path")]: "/workspace/a.txt",
    };

    expect(classifyBuiltinFilesystemTool("read", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "FS_TOOL_PATH_INVALID",
    });
  });

  test("array arguments fail closed before property classification", () => {
    const argumentsValue = Object.assign([], {
      file_path: "/workspace/a.txt",
    });

    expect(classifyBuiltinFilesystemTool("read", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "FS_TOOL_ARGUMENTS_INVALID",
    });
  });

  test("proxy descriptor failure becomes an explicit unreadable-input error", () => {
    const argumentsValue = new Proxy({}, {
      getOwnPropertyDescriptor() {
        throw new Error("hostile descriptor trap");
      },
    });

    expect(classifyBuiltinFilesystemTool("read", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "FS_TOOL_INPUT_UNREADABLE",
    });
  });

  test("unknown tools do not touch hostile arguments", () => {
    let descriptorCalls = 0;
    const argumentsValue = new Proxy({}, {
      getOwnPropertyDescriptor() {
        descriptorCalls += 1;
        throw new Error("must never execute");
      },
    });

    expect(classifyBuiltinFilesystemTool("future_fs_tool", argumentsValue)).toEqual({
      status: "NOT_APPLICABLE",
    });
    expect(descriptorCalls).toBe(0);
  });

  test("classification is detached from later caller mutation and deeply frozen", () => {
    const argumentsValue = { file_path: "/workspace/a.txt" };
    const result = classifyBuiltinFilesystemTool("read", argumentsValue);

    expect(result.status).toBe("CLASSIFIED");
    if (result.status !== "CLASSIFIED") {
      throw new Error("expected read classification");
    }

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.requirements)).toBe(true);
    for (const requirement of result.requirements) {
      expect(Object.isFrozen(requirement)).toBe(true);
      expect(Object.isFrozen(requirement.operand)).toBe(true);
    }

    argumentsValue.file_path = "/workspace/mutated.txt";
    expect(result.requirements[0]?.operand).toEqual({
      source: "ARGUMENT_PATH",
      argumentName: "file_path",
      rawPath: "/workspace/a.txt",
      reach: "EXACT",
    });
  });

  test("ownKeys trap is not needed because the classifier uses bounded known-field access", () => {
    const target = { file_path: "/workspace/a.txt" };
    const argumentsValue = new Proxy(target, {
      ownKeys() {
        throw new Error("enumeration is forbidden");
      },
    });

    expect(classifyBuiltinFilesystemTool("edit", argumentsValue)).toEqual({
      status: "CLASSIFIED",
      requirements: [
        {
          capability: "fs.edit",
          operand: {
            source: "ARGUMENT_PATH",
            argumentName: "file_path",
            rawPath: "/workspace/a.txt",
            reach: "EXACT",
          },
        },
      ],
    });
  });
});
