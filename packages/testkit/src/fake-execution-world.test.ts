import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, test } from "vitest";
import { FakeExecutionWorld, FakeExecutionWorldError } from "./fake-execution-world.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const schemaPath = resolve(root, "schemas/v1alpha1/tck-fixture.schema.json");
const fixtureRoot = resolve(root, "fixtures/tck/valid");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}

async function loadFixture(name: string): Promise<Record<string, unknown>> {
  return requireRecord(JSON.parse(await readFile(resolve(fixtureRoot, name), "utf8")), "fixture");
}

async function validateEnvelope(fixture: unknown): Promise<void> {
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  expect(validate(fixture), JSON.stringify(validate.errors, null, 2)).toBe(true);
}

function readWorld(fixture: Record<string, unknown>): {
  readonly stimulus: Record<string, unknown>;
  readonly world: Record<string, unknown>;
  readonly expected: Record<string, unknown>;
} {
  const stimulus = requireRecord(fixture.stimulus, "stimulus");
  return {
    stimulus,
    world: requireRecord(stimulus.world, "execution world"),
    expected: requireRecord(fixture.expect, "expect"),
  };
}

function captureCode(action: () => unknown): string {
  try {
    action();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(FakeExecutionWorldError);
    if (error instanceof FakeExecutionWorldError) {
      return error.code;
    }
  }
  throw new Error("expected FakeExecutionWorldError");
}

describe("M3-006 fake filesystem/subprocess execution world", () => {
  test("serves only explicit filesystem resolution, stat, containment, read, and process-path facts", async () => {
    const fixture = await loadFixture("execution-world-filesystem.json");
    await validateEnvelope(fixture);
    const { stimulus, world: worldConfig, expected } = readWorld(fixture);
    expect(stimulus.operation).toBe("execution-world.filesystem");
    const world = new FakeExecutionWorld(worldConfig);

    const results = requireArray(stimulus.operations, "filesystem operations").map(raw => {
      const operation = requireRecord(raw, "filesystem operation");
      switch (operation.kind) {
        case "resolve":
          return world.filesystem.resolve(operation.request);
        case "stat":
          return world.filesystem.stat(operation.targetRef);
        case "contains":
          return world.filesystem.contains(operation.parentRef, operation.childRef);
        case "readText":
          return world.filesystem.readText(operation.targetRef);
        case "processPath":
          return world.filesystem.processPath(operation.targetRef);
        default:
          throw new Error(`unsupported test operation: ${String(operation.kind)}`);
      }
    });

    expect(world.worldRef).toBe(expected.worldRef);
    expect(results).toEqual(expected.results);
  });

  test("matches executable and spawn requests deterministically without invoking host process semantics", async () => {
    const fixture = await loadFixture("execution-world-subprocess.json");
    await validateEnvelope(fixture);
    const { stimulus, world: worldConfig, expected } = readWorld(fixture);
    expect(stimulus.operation).toBe("execution-world.subprocess");
    const world = new FakeExecutionWorld(worldConfig);

    const resolvedPath = world.subprocess.resolveExecutable(stimulus.executableRequest);
    const execution = world.subprocess.spawn(stimulus.spawnRequest);

    expect(world.worldRef).toBe(expected.worldRef);
    expect(resolvedPath).toBe(expected.resolvedPath);
    expect(execution).toEqual(expected.execution);
    expect(world.subprocess.observations()).toEqual(expected.observations);
    expect(world.subprocess.remaining()).toBe(0);
  });

  test("does not infer subprocess-to-filesystem mediation from a shared worldRef", async () => {
    const fixture = await loadFixture("execution-world-non-mediation.json");
    await validateEnvelope(fixture);
    const { stimulus, world: worldConfig, expected } = readWorld(fixture);
    const world = new FakeExecutionWorld(worldConfig);

    const execution = world.subprocess.spawn(stimulus.spawnRequest);
    const readAfterSpawn = requireRecord(stimulus.filesystemReadAfterSpawn, "filesystemReadAfterSpawn");
    const targetRef = readAfterSpawn.targetRef;

    expect(world.worldRef).toBe(expected.worldRef);
    expect(execution.outcome).toEqual(expected.executionOutcome);
    expect(world.filesystem.readText(targetRef)).toBe(expected.filesystemTextAfterSpawn);
    expect(world.filesystem.stat(targetRef)?.version).toBe(expected.filesystemVersionAfterSpawn);
  });

  test("reports script exhaustion without fabricating a second execution observation", async () => {
    const fixture = await loadFixture("execution-world-subprocess-exhausted.json");
    await validateEnvelope(fixture);
    const { stimulus, world: worldConfig, expected } = readWorld(fixture);
    const requests = requireArray(stimulus.requests, "spawn requests");
    const world = new FakeExecutionWorld(worldConfig);

    const first = world.subprocess.spawn(requests[0]);
    const errorCode = captureCode(() => world.subprocess.spawn(requests[1]));

    expect(first.outcome).toEqual(expected.firstOutcome);
    expect(errorCode).toBe(expected.errorCode);
    expect(world.subprocess.observations()).toHaveLength(expected.observationCount as number);
    expect(world.subprocess.remaining()).toBe(0);
  });

  test("fails closed on ambiguous filesystem configuration rather than deriving hidden precedence", () => {
    expect(() => new FakeExecutionWorld({
      worldRef: "world-duplicate",
      filesystem: {
        targets: [
          { targetRef: "same", displayPath: "/a", processPath: "opaque:/a", info: null },
          { targetRef: "same", displayPath: "/b", processPath: "opaque:/b", info: null },
        ],
        resolutions: [],
        containments: [],
      },
      subprocess: { executables: [], script: [] },
    })).toThrowError(expect.objectContaining({ code: "FAKE_EXECUTION_WORLD_INVALID_CONFIG" }));
  });

  test("does not derive containment from path-like strings", () => {
    const world = new FakeExecutionWorld({
      worldRef: "world-no-containment",
      filesystem: {
        targets: [
          { targetRef: "parent", displayPath: "/workspace", processPath: "opaque:/workspace", info: null },
          { targetRef: "child", displayPath: "/workspace/file", processPath: "opaque:/workspace/file", info: null },
        ],
        resolutions: [],
        containments: [],
      },
      subprocess: { executables: [], script: [] },
    });

    expect(captureCode(() => world.filesystem.contains("parent", "child"))).toBe("FAKE_FILESYSTEM_UNKNOWN_CONTAINMENT");
  });

  test("unexpected spawn requests do not consume the next scripted execution", () => {
    const expectedRequest = {
      argv: ["/virtual/bin/expected"],
      cwd: "opaque:/workspace",
      graceMs: 1,
      stdoutMaxBytes: 1,
      stderrMaxBytes: 1,
    };
    const world = new FakeExecutionWorld({
      worldRef: "world-mismatch",
      filesystem: { targets: [], resolutions: [], containments: [] },
      subprocess: {
        executables: [],
        script: [{
          request: expectedRequest,
          execution: {
            pid: 9,
            outcome: { exitCode: 0, signal: null },
            stdout: { text: "", nextOffset: 0, lossy: false },
            stderr: { text: "", nextOffset: 0, lossy: false },
          },
        }],
      },
    });

    expect(captureCode(() => world.subprocess.spawn({ ...expectedRequest, argv: ["/virtual/bin/unexpected"] })))
      .toBe("FAKE_SUBPROCESS_UNEXPECTED_REQUEST");
    expect(world.subprocess.remaining()).toBe(1);
    expect(world.subprocess.observations()).toEqual([]);
    expect(world.subprocess.spawn(expectedRequest).pid).toBe(9);
  });

  test("returns defensive subprocess snapshots and keeps portable fixtures adapter-independent", async () => {
    const request = {
      argv: ["/virtual/bin/task"],
      cwd: "opaque:/workspace",
      graceMs: 1,
      stdoutMaxBytes: 8,
      stderrMaxBytes: 8,
    };
    const world = new FakeExecutionWorld({
      worldRef: "world-defensive",
      filesystem: { targets: [], resolutions: [], containments: [] },
      subprocess: {
        executables: [],
        script: [{
          request,
          execution: {
            pid: 5,
            outcome: { exitCode: 0, signal: null },
            stdout: { text: "ok", nextOffset: 2, lossy: false },
            stderr: { text: "", nextOffset: 0, lossy: false },
          },
        }],
      },
    });

    const execution = world.subprocess.spawn(request);
    const firstRead = world.subprocess.observations();
    expect(Object.isFrozen(execution)).toBe(true);
    expect(Object.isFrozen(execution.stdout)).toBe(true);
    expect(Object.isFrozen(firstRead[0])).toBe(true);
    expect(world.subprocess.observations()).toEqual(firstRead);
    expect(world.subprocess.observations()).not.toBe(firstRead);

    for (const name of [
      "execution-world-filesystem.json",
      "execution-world-subprocess.json",
      "execution-world-non-mediation.json",
      "execution-world-subprocess-exhausted.json",
    ]) {
      const text = await readFile(resolve(fixtureRoot, name), "utf8");
      expect(text).not.toContain("@deepseek-ai/");
      expect(text).not.toContain("dsh-agent-loop");
    }
  });
});
