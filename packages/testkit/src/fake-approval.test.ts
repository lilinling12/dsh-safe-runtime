import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, test } from "vitest";
import {
  FakeApprovalError,
  FakeApprovalService,
  TCK_APPROVAL_DECISIONS,
  type FakeApprovalRequest,
  type TckApprovalDecision,
} from "./fake-approval.js";

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

function requireDecision(value: unknown): TckApprovalDecision {
  if (typeof value !== "string" || !(TCK_APPROVAL_DECISIONS as readonly string[]).includes(value)) {
    throw new Error("fixture contains an unsupported approval decision");
  }
  return value as TckApprovalDecision;
}

function requireRequest(value: unknown): FakeApprovalRequest {
  const request = requireRecord(value, "approval request");
  const keys = Object.keys(request).sort();
  const allowedKeys = request.reason === undefined
    ? ["actionRef", "requestRef"]
    : ["actionRef", "reason", "requestRef"];
  expect(keys).toEqual(allowedKeys);
  if (typeof request.requestRef !== "string" || typeof request.actionRef !== "string") {
    throw new Error("approval request refs must be strings");
  }
  if (request.reason !== undefined && typeof request.reason !== "string") {
    throw new Error("approval reason must be a string when present");
  }
  return request.reason === undefined
    ? { requestRef: request.requestRef, actionRef: request.actionRef }
    : { requestRef: request.requestRef, actionRef: request.actionRef, reason: request.reason };
}

async function loadFixture(name: string): Promise<Record<string, unknown>> {
  return requireRecord(
    JSON.parse(await readFile(resolve(fixtureRoot, name), "utf8")),
    "fixture",
  );
}

async function validateEnvelope(fixture: unknown): Promise<void> {
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  expect(validate(fixture), JSON.stringify(validate.errors, null, 2)).toBe(true);
}

function readSequence(fixture: Record<string, unknown>): {
  readonly script: readonly TckApprovalDecision[];
  readonly requests: readonly FakeApprovalRequest[];
  readonly expected: Record<string, unknown>;
} {
  const stimulus = requireRecord(fixture.stimulus, "stimulus");
  expect(Object.keys(stimulus).sort()).toEqual(["operation", "requests", "script"]);
  expect(stimulus.operation).toBe("approval.sequence");
  if (!Array.isArray(stimulus.script) || !Array.isArray(stimulus.requests)) {
    throw new Error("approval sequence script and requests must be arrays");
  }
  return {
    script: stimulus.script.map(requireDecision),
    requests: stimulus.requests.map(requireRequest),
    expected: requireRecord(fixture.expect, "expect"),
  };
}

describe("M3-004 fake approval contract", () => {
  test("consumes scripted decisions FIFO and records only portable observables", async () => {
    const fixture = await loadFixture("approval-sequence.json");
    await validateEnvelope(fixture);
    const sequence = readSequence(fixture);
    const fake = new FakeApprovalService(sequence.script);

    const decisions = sequence.requests.map(request => fake.request(request));

    expect(decisions).toEqual(sequence.expected.decisions);
    expect(fake.observations()).toEqual(sequence.expected.observations);
  });

  test("reports script exhaustion explicitly and does not coerce it to UNAVAILABLE", async () => {
    const fixture = await loadFixture("approval-script-exhausted.json");
    await validateEnvelope(fixture);
    const sequence = readSequence(fixture);
    const fake = new FakeApprovalService(sequence.script);
    const decisionsBeforeError: TckApprovalDecision[] = [];

    decisionsBeforeError.push(fake.request(sequence.requests[0]!));

    let observedError: unknown;
    try {
      fake.request(sequence.requests[1]!);
    } catch (error: unknown) {
      observedError = error;
    }

    expect(decisionsBeforeError).toEqual(sequence.expected.decisionsBeforeError);
    expect(observedError).toBeInstanceOf(FakeApprovalError);
    if (!(observedError instanceof FakeApprovalError)) {
      throw new Error("expected FakeApprovalError");
    }
    expect(observedError.code).toBe(sequence.expected.errorCode);
    expect(fake.observations()).toEqual(sequence.expected.observationsBeforeError);
  });

  test("returns defensive observation copies so callers cannot mutate future evidence", () => {
    const fake = new FakeApprovalService(["ALLOWED_ONCE"]);
    fake.request({ requestRef: "approval-1", actionRef: "action-1" });

    const firstRead = fake.observations();
    expect(Object.isFrozen(firstRead[0])).toBe(true);
    expect(Object.isFrozen(firstRead[0]!.request)).toBe(true);
    expect(fake.observations()).toEqual(firstRead);
    expect(fake.observations()).not.toBe(firstRead);
  });

  test("rejects unknown script decisions before any request can authorize", () => {
    let observedError: unknown;
    try {
      new FakeApprovalService(["ALLOWED_ALWAYS"]);
    } catch (error: unknown) {
      observedError = error;
    }

    expect(observedError).toBeInstanceOf(FakeApprovalError);
    if (!(observedError instanceof FakeApprovalError)) {
      throw new Error("expected FakeApprovalError");
    }
    expect(observedError.code).toBe("FAKE_APPROVAL_INVALID_SCRIPT");
  });
});
