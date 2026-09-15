import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { classifyBuiltinShellTool } from "./builtin-shell.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../../..");
const fixturePath = resolve(root, "fixtures/tool-classifier/builtin-shell-cases.json");

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
    throw new Error("built-in shell classifier fixture must contain a cases array");
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
      throw new Error(
        "every built-in shell classifier fixture requires id, description, toolName, arguments, and expected",
      );
    }
    if (seen.has(value["id"])) {
      throw new Error(`duplicate built-in shell classifier fixture id: ${value["id"]}`);
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

describe("M4-011 portable built-in shell classifier", () => {
  test("fixture corpus has the reviewed breadth", () => {
    expect(cases).toHaveLength(22);
  });

  for (const fixture of cases) {
    test(`${fixture.id}: ${fixture.description}`, () => {
      expect(
        classifyBuiltinShellTool(fixture.toolName, fixture.arguments),
      ).toEqual(fixture.expected);
    });
  }
});

describe("M4-011 hostile runtime arguments", () => {
  test("inherited command cannot manufacture process authority", () => {
    const argumentsValue = Object.create({ command: "echo inherited" }) as object;

    expect(classifyBuiltinShellTool("bash", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "SHELL_TOOL_COMMAND_INVALID",
    });
  });

  test("command accessor is rejected without executing the getter", () => {
    let getterCalls = 0;
    const argumentsValue = Object.defineProperty({}, "command", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "echo secret";
      },
    });

    expect(classifyBuiltinShellTool("bash", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "SHELL_TOOL_INPUT_UNREADABLE",
    });
    expect(getterCalls).toBe(0);
  });

  test("workdir accessor is rejected without executing the getter", () => {
    let getterCalls = 0;
    const argumentsValue = Object.defineProperties({}, {
      command: { enumerable: true, value: "pwd" },
      workdir: {
        enumerable: true,
        get() {
          getterCalls += 1;
          return "/workspace/private";
        },
      },
    });

    expect(classifyBuiltinShellTool("bash", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "SHELL_TOOL_INPUT_UNREADABLE",
    });
    expect(getterCalls).toBe(0);
  });

  test("background accessor is rejected without executing the getter", () => {
    let getterCalls = 0;
    const argumentsValue = Object.defineProperties({}, {
      command: { enumerable: true, value: "sleep 1" },
      run_in_background: {
        enumerable: true,
        get() {
          getterCalls += 1;
          return true;
        },
      },
    });

    expect(classifyBuiltinShellTool("bash", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "SHELL_TOOL_INPUT_UNREADABLE",
    });
    expect(getterCalls).toBe(0);
  });

  test("unrelated metadata accessors are never inspected", () => {
    let getterCalls = 0;
    const argumentsValue = Object.defineProperties({}, {
      command: { enumerable: true, value: "make build" },
      description: hostileAccessor(),
      timeoutMs: hostileAccessor(),
      sandbox_permissions: hostileAccessor(),
      justification: hostileAccessor(),
      unrelated: hostileAccessor(),
    });

    expect(classifyBuiltinShellTool("bash", argumentsValue)).toEqual({
      status: "CLASSIFIED",
      requirements: [
        {
          capability: "process.exec",
          operand: {
            source: "SHELL_COMMAND",
            dialect: "BASH",
            rawCommand: "make build",
            executionMode: "FOREGROUND",
            workdir: { source: "EXECUTION_ROOT" },
          },
        },
      ],
    });
    expect(getterCalls).toBe(0);

    function hostileAccessor(): PropertyDescriptor {
      return {
        enumerable: true,
        get() {
          getterCalls += 1;
          throw new Error("classifier must not inspect unrelated metadata");
        },
      };
    }
  });

  test("symbol-only command substitution is not accepted", () => {
    const argumentsValue = {
      [Symbol("command")]: "echo x",
    };

    expect(classifyBuiltinShellTool("bash", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "SHELL_TOOL_COMMAND_INVALID",
    });
  });

  test("array arguments fail closed before field classification", () => {
    const argumentsValue = Object.assign([], { command: "echo x" });

    expect(classifyBuiltinShellTool("bash", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "SHELL_TOOL_ARGUMENTS_INVALID",
    });
  });

  test("command descriptor failure becomes unreadable input", () => {
    const argumentsValue = new Proxy({}, {
      getOwnPropertyDescriptor() {
        throw new Error("hostile command descriptor trap");
      },
    });

    expect(classifyBuiltinShellTool("bash", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "SHELL_TOOL_INPUT_UNREADABLE",
    });
  });

  test("workdir descriptor failure is observed only after command succeeds", () => {
    const target = { command: "pwd" };
    const seenKeys: PropertyKey[] = [];
    const argumentsValue = new Proxy(target, {
      getOwnPropertyDescriptor(current, key) {
        seenKeys.push(key);
        if (key === "workdir") {
          throw new Error("hostile workdir descriptor trap");
        }
        return Reflect.getOwnPropertyDescriptor(current, key);
      },
    });

    expect(classifyBuiltinShellTool("bash", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "SHELL_TOOL_INPUT_UNREADABLE",
    });
    expect(seenKeys).toEqual(["command", "workdir"]);
  });

  test("background descriptor failure is observed after command and workdir", () => {
    const target = { command: "sleep 1", workdir: "scripts" };
    const seenKeys: PropertyKey[] = [];
    const argumentsValue = new Proxy(target, {
      getOwnPropertyDescriptor(current, key) {
        seenKeys.push(key);
        if (key === "run_in_background") {
          throw new Error("hostile background descriptor trap");
        }
        return Reflect.getOwnPropertyDescriptor(current, key);
      },
    });

    expect(classifyBuiltinShellTool("bash", argumentsValue)).toEqual({
      status: "ERROR",
      reason: "SHELL_TOOL_INPUT_UNREADABLE",
    });
    expect(seenKeys).toEqual(["command", "workdir", "run_in_background"]);
  });

  test("unknown tools do not touch hostile arguments", () => {
    let descriptorCalls = 0;
    const argumentsValue = new Proxy({}, {
      getOwnPropertyDescriptor() {
        descriptorCalls += 1;
        throw new Error("must never execute");
      },
    });

    expect(classifyBuiltinShellTool("future_shell", argumentsValue)).toEqual({
      status: "NOT_APPLICABLE",
    });
    expect(descriptorCalls).toBe(0);
  });

  test("ownKeys enumeration is not required", () => {
    const target = { command: "echo x" };
    const argumentsValue = new Proxy(target, {
      ownKeys() {
        throw new Error("enumeration is forbidden");
      },
    });

    expect(classifyBuiltinShellTool("bash", argumentsValue).status).toBe("CLASSIFIED");
  });

  test("classification is detached from caller mutation and deeply frozen", () => {
    const argumentsValue = {
      command: "pnpm test",
      workdir: "packages/core",
      run_in_background: true,
    };
    const result = classifyBuiltinShellTool("bash", argumentsValue);

    expect(result.status).toBe("CLASSIFIED");
    if (result.status !== "CLASSIFIED") {
      throw new Error("expected shell classification");
    }

    const requirement = result.requirements[0];
    if (requirement === undefined) {
      throw new Error("expected process.exec requirement");
    }

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.requirements)).toBe(true);
    expect(Object.isFrozen(requirement)).toBe(true);
    expect(Object.isFrozen(requirement.operand)).toBe(true);
    expect(Object.isFrozen(requirement.operand.workdir)).toBe(true);

    argumentsValue.command = "rm -rf .";
    argumentsValue.workdir = "/";
    argumentsValue.run_in_background = false;

    expect(requirement).toEqual({
      capability: "process.exec",
      operand: {
        source: "SHELL_COMMAND",
        dialect: "BASH",
        rawCommand: "pnpm test",
        executionMode: "BACKGROUND",
        workdir: {
          source: "ARGUMENT_WORKDIR",
          argumentName: "workdir",
          rawWorkdir: "packages/core",
        },
      },
    });
  });

  test("missing display description does not alter authority classification", () => {
    expect(classifyBuiltinShellTool("pwsh", { command: "Get-Date" })).toEqual({
      status: "CLASSIFIED",
      requirements: [
        {
          capability: "process.exec",
          operand: {
            source: "SHELL_COMMAND",
            dialect: "POWERSHELL",
            rawCommand: "Get-Date",
            executionMode: "FOREGROUND",
            workdir: { source: "EXECUTION_ROOT" },
          },
        },
      ],
    });
  });

  test("shell-looking nested effects do not broaden the capability envelope", () => {
    const result = classifyBuiltinShellTool("bash", {
      command: "cat secret.txt && curl https://example.test && rm output.txt",
    });

    expect(result.status).toBe("CLASSIFIED");
    if (result.status !== "CLASSIFIED") {
      throw new Error("expected shell classification");
    }
    expect(result.requirements.map(({ capability }) => capability)).toEqual([
      "process.exec",
    ]);
  });
});
