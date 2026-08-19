import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, test } from "vitest";
import {
  FakeFaultInjectionError,
  FakeFaultInjectionService,
} from "./fake-fault-injection.js";

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

function readStimulus(fixture: Record<string, unknown>): {
  readonly stimulus: Record<string, unknown>;
  readonly expected: Record<string, unknown>;
} {
  return {
    stimulus: requireRecord(fixture.stimulus, "stimulus"),
    expected: requireRecord(fixture.expect, "expect"),
  };
}

describe("M3-007 deterministic fault injection contract", () => {
  test("keeps NO_FAULT and INJECT_FAULT as explicit test-control directives", async () => {
    const fixture = await loadFixture("fault-injection-sequence.json");
    await validateEnvelope(fixture);
    const { stimulus, expected } = readStimulus(fixture);
    expect(stimulus.operation).toBe("fault-injection.sequence");

    const fake = new FakeFaultInjectionService(stimulus.config);
    const directives = requireArray(stimulus.probes, "probes").map(probe => fake.probe(probe));

    expect(directives).toEqual(expected.directives);
    expect(fake.observations()).toHaveLength(expected.observationCount as number);
    expect(fake.remaining()).toBe(expected.remaining);
  });

  test("does not consume the script when a declared probe arrives out of order", async () => {
    const fixture = await loadFixture("fault-injection-unexpected-probe.json");
    await validateEnvelope(fixture);
    const { stimulus, expected } = readStimulus(fixture);
    const fake = new FakeFaultInjectionService(stimulus.config);

    let observedError: unknown;
    try {
      fake.probe(stimulus.unexpectedProbe);
    } catch (error: unknown) {
      observedError = error;
    }

    expect(observedError).toBeInstanceOf(FakeFaultInjectionError);
    if (!(observedError instanceof FakeFaultInjectionError)) {
      throw new Error("expected FakeFaultInjectionError");
    }
    expect(observedError.code).toBe(expected.errorCode);
    expect(fake.remaining()).toBe(expected.remainingAfterError);
    expect(fake.observations()).toHaveLength(expected.observationCountAfterError as number);
    expect(fake.probe(stimulus.expectedProbe)).toEqual(expected.directiveAfterRetry);
  });

  test("reports exhaustion without fabricating NO_FAULT or a second observation", async () => {
    const fixture = await loadFixture("fault-injection-script-exhausted.json");
    await validateEnvelope(fixture);
    const { stimulus, expected } = readStimulus(fixture);
    const probes = requireArray(stimulus.probes, "probes");
    const fake = new FakeFaultInjectionService(stimulus.config);

    expect(fake.probe(probes[0])).toEqual(expected.firstDirective);
    expect(() => fake.probe(probes[1])).toThrowError(
      expect.objectContaining({ code: expected.errorCode }),
    );
    expect(fake.observations()).toHaveLength(expected.observationCount as number);
    expect(fake.remaining()).toBe(expected.remaining);
  });

  test("rejects unknown runtime points before consuming scripted state", () => {
    const fake = new FakeFaultInjectionService({
      points: ["known.point"],
      script: [{
        probe: { pointRef: "known.point", context: null },
        directive: { kind: "NO_FAULT" },
      }],
    });

    expect(() => fake.probe({ pointRef: "unknown.point", context: null })).toThrowError(
      expect.objectContaining({ code: "FAKE_FAULT_UNKNOWN_POINT" }),
    );
    expect(fake.remaining()).toBe(1);
    expect(fake.observations()).toEqual([]);
  });

  test("fails closed on duplicate, undeclared, or unsupported configuration", () => {
    expect(() => new FakeFaultInjectionService({ points: ["p", "p"], script: [] })).toThrowError(
      expect.objectContaining({ code: "FAKE_FAULT_INVALID_CONFIG" }),
    );
    expect(() => new FakeFaultInjectionService({
      points: ["p"],
      script: [{ probe: { pointRef: "q", context: null }, directive: { kind: "NO_FAULT" } }],
    })).toThrowError(expect.objectContaining({ code: "FAKE_FAULT_INVALID_CONFIG" }));
    expect(() => new FakeFaultInjectionService({
      points: ["p"],
      script: [{ probe: { pointRef: "p", context: null }, directive: { kind: "CRASH" } }],
    })).toThrowError(expect.objectContaining({ code: "FAKE_FAULT_INVALID_CONFIG" }));
  });

  test("rejects non-portable cyclic probe context without consuming the script", () => {
    const fake = new FakeFaultInjectionService({
      points: ["p"],
      script: [{ probe: { pointRef: "p", context: null }, directive: { kind: "NO_FAULT" } }],
    });
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(() => fake.probe({ pointRef: "p", context: cyclic })).toThrowError(
      expect.objectContaining({ code: "FAKE_FAULT_INVALID_PROBE" }),
    );
    expect(fake.remaining()).toBe(1);
    expect(fake.observations()).toEqual([]);
  });

  test("snapshots caller input and returns defensive immutable evidence", () => {
    const context = { nested: { value: 1 } };
    const fake = new FakeFaultInjectionService({
      points: ["p"],
      script: [{
        probe: { pointRef: "p", context: { nested: { value: 1 } } },
        directive: {
          kind: "INJECT_FAULT",
          fault: { faultRef: "f", faultCode: "TEST", detail: { stable: true } },
        },
      }],
    });

    const directive = fake.probe({ pointRef: "p", context });
    context.nested.value = 99;
    const first = fake.observations();
    const second = fake.observations();

    expect(first[0]?.probe.context).toEqual({ nested: { value: 1 } });
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first[0])).toBe(true);
    expect(Object.isFrozen(first[0]?.probe)).toBe(true);
    expect(Object.isFrozen(directive)).toBe(true);
    if (directive.kind === "INJECT_FAULT") {
      expect(Object.isFrozen(directive.fault)).toBe(true);
      expect(Object.isFrozen(directive.fault.detail)).toBe(true);
    }
  });

  test("portable fault fixtures remain free of Harness concrete paths and action verbs", async () => {
    for (const name of [
      "fault-injection-sequence.json",
      "fault-injection-unexpected-probe.json",
      "fault-injection-script-exhausted.json",
    ]) {
      const text = await readFile(resolve(fixtureRoot, name), "utf8");
      expect(text).not.toContain("@deepseek-ai/");
      expect(text).not.toContain("dsh-agent-loop");
      expect(text).not.toContain('"throw"');
      expect(text).not.toContain('"crash"');
      expect(text).not.toContain('"sleep"');
    }
  });
});
