import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, test } from "vitest";
import { FakeToolRuntime, FakeToolRuntimeError } from "./fake-tool-runtime.js";

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

function readSequence(fixture: Record<string, unknown>): {
  readonly script: readonly unknown[];
  readonly requests: readonly unknown[];
  readonly expected: Record<string, unknown>;
} {
  const stimulus = requireRecord(fixture.stimulus, "stimulus");
  expect(Object.keys(stimulus).sort()).toEqual(["operation", "requests", "script"]);
  expect(stimulus.operation).toBe("tool.sequence");
  return {
    script: requireArray(stimulus.script, "tool script"),
    requests: requireArray(stimulus.requests, "tool requests"),
    expected: requireRecord(fixture.expect, "expect"),
  };
}

describe("M3-005 fake tool runtime contract", () => {
  test("preserves request, body-entry, and final-outcome distinctions", async () => {
    const fixture = await loadFixture("tool-runtime-sequence.json");
    await validateEnvelope(fixture);
    const sequence = readSequence(fixture);
    const fake = new FakeToolRuntime(sequence.script);

    const outcomes = sequence.requests.map(request => fake.invoke(request));

    expect(outcomes).toEqual(sequence.expected.outcomes);
    expect(fake.trace()).toEqual(sequence.expected.trace);
    expect(fake.remaining()).toBe(0);
  });

  test("denied requests never enter the body", async () => {
    const fixture = await loadFixture("tool-runtime-denied.json");
    await validateEnvelope(fixture);
    const sequence = readSequence(fixture);
    const fake = new FakeToolRuntime(sequence.script);

    const outcomes = sequence.requests.map(request => fake.invoke(request));
    const trace = fake.trace();

    expect(outcomes).toEqual(sequence.expected.outcomes);
    expect(trace).toEqual(sequence.expected.trace);
    expect(trace.map(entry => entry.phase)).not.toContain("BODY_ENTERED");
  });

  test("reports script exhaustion without inventing request or execution evidence", async () => {
    const fixture = await loadFixture("tool-runtime-script-exhausted.json");
    await validateEnvelope(fixture);
    const sequence = readSequence(fixture);
    const fake = new FakeToolRuntime(sequence.script);
    const outcomesBeforeError = [fake.invoke(sequence.requests[0])];

    let observedError: unknown;
    try {
      fake.invoke(sequence.requests[1]);
    } catch (error: unknown) {
      observedError = error;
    }

    expect(outcomesBeforeError).toEqual(sequence.expected.outcomesBeforeError);
    expect(observedError).toBeInstanceOf(FakeToolRuntimeError);
    if (!(observedError instanceof FakeToolRuntimeError)) {
      throw new Error("expected FakeToolRuntimeError");
    }
    expect(observedError.code).toBe(sequence.expected.errorCode);
    expect(fake.trace()).toEqual(sequence.expected.traceBeforeError);
  });

  test("rejects unknown scripted outcomes before execution", () => {
    expect(() => new FakeToolRuntime([{ kind: "SUCCESS", result: null }])).toThrowError(
      expect.objectContaining({ code: "FAKE_TOOL_INVALID_SCRIPT" }),
    );
  });

  test("rejects malformed requests before consuming script or mutating trace", () => {
    const fake = new FakeToolRuntime([{ kind: "RESULT", result: null }]);

    let observedError: unknown;
    try {
      fake.invoke({ callRef: "call-1", toolName: "demo.echo", arguments: null, hidden: true });
    } catch (error: unknown) {
      observedError = error;
    }

    expect(observedError).toBeInstanceOf(FakeToolRuntimeError);
    if (!(observedError instanceof FakeToolRuntimeError)) {
      throw new Error("expected FakeToolRuntimeError");
    }
    expect(observedError.code).toBe("FAKE_TOOL_INVALID_REQUEST");
    expect(fake.remaining()).toBe(1);
    expect(fake.trace()).toEqual([]);
  });

  test("returns defensive trace copies and keeps portable fixtures Harness-independent", async () => {
    const fake = new FakeToolRuntime([{ kind: "RESULT", result: { nested: [1, 2] } }]);
    fake.invoke({ callRef: "call-1", toolName: "demo.echo", arguments: { value: 1 } });

    const firstRead = fake.trace();
    expect(Object.isFrozen(firstRead[0])).toBe(true);
    expect(fake.trace()).toEqual(firstRead);
    expect(fake.trace()).not.toBe(firstRead);

    for (const name of [
      "tool-runtime-sequence.json",
      "tool-runtime-denied.json",
      "tool-runtime-script-exhausted.json",
    ]) {
      const text = await readFile(resolve(fixtureRoot, name), "utf8");
      expect(text).not.toContain("@deepseek-ai/");
      expect(text).not.toContain("dsh-agent-loop");
    }
  });
});
