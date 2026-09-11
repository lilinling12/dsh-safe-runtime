import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AnySchemaObject } from "ajv";
import { describe, expect, test } from "vitest";
import {
  createCapabilityPolicyHotReloadStore,
  createCapabilityPolicyHotReloadStoreForTest,
} from "./policy-hot-reload.js";
import type {
  CapabilityPolicyHotReloadStore,
  PolicyHotReloadState,
  PolicyReloadResult,
} from "./policy-hot-reload-types.js";
import { createTrustedCapabilityPolicySchemaGraph } from "./trusted-policy-schema.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/policy-hot-reload/cases.json");
const policySchemaPath = resolve(root, "schemas/v1alpha1/capability-policy.schema.json");
const definitionsSchemaPath = resolve(root, "schemas/v1alpha1/defs.schema.json");

interface HotReloadFixture {
  readonly id: string;
  readonly operations: readonly FixtureOperation[];
}

type FixtureOperation =
  | { readonly op: "read"; readonly expect: Readonly<Record<string, unknown>> }
  | {
      readonly op: "reload";
      readonly request: unknown;
      readonly expect: Readonly<Record<string, unknown>>;
    }
  | { readonly op: "capture"; readonly handle: string }
  | {
      readonly op: "readCaptured";
      readonly handle: string;
      readonly expect: Readonly<Record<string, unknown>>;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function parseFixtures(): readonly HotReloadFixture[] {
  const parsed = parseJsonFile(fixturePath);
  if (!isRecord(parsed) || !Array.isArray(parsed["cases"])) {
    throw new Error("policy-hot-reload/cases.json must contain a cases array");
  }

  const seen = new Set<string>();
  return parsed["cases"].map((item): HotReloadFixture => {
    if (!isRecord(item) || typeof item["id"] !== "string" || !Array.isArray(item["operations"])) {
      throw new Error("Every policy-hot-reload fixture requires id/operations");
    }
    if (seen.has(item["id"])) {
      throw new Error(`Duplicate policy-hot-reload fixture id: ${item["id"]}`);
    }
    seen.add(item["id"]);
    return {
      id: item["id"],
      operations: item["operations"].map(parseOperation),
    };
  });
}

function parseOperation(value: unknown): FixtureOperation {
  if (!isRecord(value) || typeof value["op"] !== "string") {
    throw new Error("Hot-reload operation must be an object with op");
  }

  switch (value["op"]) {
    case "read":
      return { op: "read", expect: requiredExpected(value) };
    case "reload":
      if (!Object.hasOwn(value, "request")) {
        throw new Error("reload operation requires request");
      }
      return { op: "reload", request: value["request"], expect: requiredExpected(value) };
    case "capture":
      if (typeof value["handle"] !== "string") {
        throw new Error("capture operation requires handle");
      }
      return { op: "capture", handle: value["handle"] };
    case "readCaptured":
      if (typeof value["handle"] !== "string") {
        throw new Error("readCaptured operation requires handle");
      }
      return {
        op: "readCaptured",
        handle: value["handle"],
        expect: requiredExpected(value),
      };
    default:
      throw new Error(`Unknown hot-reload operation: ${value["op"]}`);
  }
}

function requiredExpected(value: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const expected = value["expect"];
  if (!isRecord(expected)) {
    throw new Error("Hot-reload operation requires object expect");
  }
  return expected;
}

const fixtures = parseFixtures();
const trustedGraph = createTrustedCapabilityPolicySchemaGraph(
  parseJsonFile(policySchemaPath) as AnySchemaObject,
  parseJsonFile(definitionsSchemaPath) as AnySchemaObject,
);

function createStore(): CapabilityPolicyHotReloadStore {
  return createCapabilityPolicyHotReloadStore(trustedGraph);
}

function portableState(state: PolicyHotReloadState): Readonly<Record<string, unknown>> {
  if (state.status === "EMPTY") {
    return { status: state.status, epoch: state.epoch };
  }
  return {
    status: state.status,
    epoch: state.epoch,
    activePolicyName: activePolicyName(state),
  };
}

function activePolicyName(state: Extract<PolicyHotReloadState, { readonly status: "ACTIVE" }>): string {
  if (!isRecord(state.policy)) {
    throw new Error("Validated active policy must be an object");
  }
  const metadata = state.policy["metadata"];
  if (!isRecord(metadata) || typeof metadata["name"] !== "string") {
    throw new Error("Validated active policy must contain metadata.name");
  }
  return metadata["name"];
}

function portableResult(result: PolicyReloadResult): Readonly<Record<string, unknown>> {
  if (result.ok) {
    return { status: result.status, epoch: result.epoch };
  }

  const projected: Record<string, unknown> = {
    status: result.status,
    stage: result.stage,
    reasonCode: result.reasonCode,
  };
  if (result.instancePath !== undefined) {
    projected["instancePath"] = result.instancePath;
  }
  return projected;
}

function assertFixtureExpectation(
  actual: Readonly<Record<string, unknown>>,
  expected: Readonly<Record<string, unknown>>,
  result?: PolicyReloadResult,
): void {
  const issuePath = expected["issueInstancePathIncludes"];
  if (typeof issuePath === "string") {
    expect(result?.ok).toBe(false);
    if (result === undefined || result.ok || result.issues === undefined) {
      throw new Error("Fixture expected schema issues");
    }
    expect(result.issues.some(issue => issue.instancePath === issuePath)).toBe(true);
    const withoutIssueExpectation = { ...expected };
    delete withoutIssueExpectation["issueInstancePathIncludes"];
    expect(actual).toEqual(withoutIssueExpectation);
    return;
  }
  expect(actual).toEqual(expected);
}

const VALID_EMPTY_POLICY = JSON.stringify({
  apiVersion: "safe-runtime.dev/v1alpha1",
  kind: "CapabilityPolicy",
  metadata: { name: "valid" },
  spec: { defaultEffect: "deny", rules: [] },
});

describe("M4-009 portable CapabilityPolicy hot reload", () => {
  test("fixture corpus has the expected breadth", () => {
    expect(fixtures).toHaveLength(16);
  });

  for (const fixture of fixtures) {
    test(fixture.id, () => {
      const store = createStore();
      const captures = new Map<string, PolicyHotReloadState>();

      for (const operation of fixture.operations) {
        switch (operation.op) {
          case "read":
            assertFixtureExpectation(portableState(store.read()), operation.expect);
            break;
          case "reload": {
            const result = store.reload(operation.request);
            assertFixtureExpectation(portableResult(result), operation.expect, result);
            break;
          }
          case "capture":
            captures.set(operation.handle, store.read());
            break;
          case "readCaptured": {
            const captured = captures.get(operation.handle);
            if (captured === undefined) {
              throw new Error(`Unknown captured handle: ${operation.handle}`);
            }
            assertFixtureExpectation(portableState(captured), operation.expect);
            break;
          }
        }
      }
    });
  }
});

describe("M4-009 runtime hardening and atomic state", () => {
  test("request accessors are rejected without invoking getters", () => {
    const store = createStore();
    let calls = 0;
    const request = {
      get format(): string {
        calls += 1;
        return "JSON";
      },
      source: VALID_EMPTY_POLICY,
    };

    expect(store.reload(request)).toEqual({
      ok: false,
      status: "RELOAD_REJECTED",
      stage: "REQUEST",
      reasonCode: "POLICY_RELOAD_REQUEST_INVALID",
    });
    expect(calls).toBe(0);
    expect(store.read()).toBe(store.read());
  });

  test("inherited, extra, and symbol request fields fail before loading", () => {
    const inherited = Object.create({ format: "JSON" }) as Record<string, unknown>;
    inherited["source"] = VALID_EMPTY_POLICY;

    const extra = { format: "JSON", source: VALID_EMPTY_POLICY, sourceRef: "secret" };
    const symbol = { format: "JSON", source: VALID_EMPTY_POLICY } as Record<PropertyKey, unknown>;
    symbol[Symbol("unexpected")] = true;

    for (const request of [inherited, extra, symbol]) {
      const store = createStore();
      expect(store.reload(request)).toMatchObject({
        ok: false,
        stage: "REQUEST",
        reasonCode: "POLICY_RELOAD_REQUEST_INVALID",
      });
      expect(store.read()).toEqual({ status: "EMPTY", epoch: 0 });
    }
  });

  test("revoked request proxies fail closed and preserve the exact active handle", () => {
    const store = createStore();
    expect(store.reload({ format: "JSON", source: VALID_EMPTY_POLICY }).ok).toBe(true);
    const before = store.read();

    const revoked = Proxy.revocable({ format: "JSON", source: VALID_EMPTY_POLICY }, {});
    revoked.revoke();

    expect(store.reload(revoked.proxy)).toMatchObject({
      ok: false,
      stage: "REQUEST",
      reasonCode: "POLICY_RELOAD_REQUEST_INVALID",
    });
    expect(store.read()).toBe(before);
  });

  test("rejected candidates preserve the exact last-known-good record reference", () => {
    const store = createStore();
    expect(store.reload({ format: "JSON", source: VALID_EMPTY_POLICY }).ok).toBe(true);
    const before = store.read();

    expect(store.reload({ format: "JSON", source: "{" }).ok).toBe(false);
    expect(store.read()).toBe(before);
  });

  test("old ACTIVE handles remain frozen and stable after a later swap", () => {
    const store = createStore();
    expect(store.reload({ format: "JSON", source: VALID_EMPTY_POLICY }).ok).toBe(true);
    const oldHandle = store.read();
    if (oldHandle.status !== "ACTIVE") {
      throw new Error("Expected ACTIVE handle");
    }

    const nextPolicy = VALID_EMPTY_POLICY.replace('"name":"valid"', '"name":"next"');
    expect(store.reload({ format: "JSON", source: nextPolicy })).toEqual({
      ok: true,
      status: "SWAPPED",
      epoch: 2,
    });

    expect(oldHandle.epoch).toBe(1);
    expect(activePolicyName(oldHandle)).toBe("valid");
    expect(Object.isFrozen(oldHandle)).toBe(true);
    expect(Object.isFrozen(oldHandle.policy)).toBe(true);
    expect(store.read()).not.toBe(oldHandle);
  });

  test("success/failure/state wrappers are frozen and source is never retained", () => {
    const store = createStore();
    const secretMarker = "SOURCE-MARKER-MUST-NOT-BE-RETAINED";
    const source = VALID_EMPTY_POLICY.replace('"name":"valid"', `"name":"${secretMarker}"`);
    const success = store.reload({ format: "JSON", source });

    expect(Object.isFrozen(success)).toBe(true);
    const state = store.read();
    expect(Object.isFrozen(state)).toBe(true);
    if (state.status !== "ACTIVE") {
      throw new Error("Expected ACTIVE state");
    }
    expect(Object.hasOwn(state, "source")).toBe(false);
    expect(Object.hasOwn(state.policy as object, "source")).toBe(false);

    const failure = store.reload({ format: "TOML", source: secretMarker });
    expect(Object.isFrozen(failure)).toBe(true);
    expect(JSON.stringify(failure)).not.toContain(secretMarker);
  });

  test("schema issue arrays remain frozen and detached from caller input", () => {
    const store = createStore();
    const result = store.reload({
      format: "JSON",
      source: JSON.stringify({
        apiVersion: "safe-runtime.dev/v1alpha1",
        kind: "CapabilityPolicy",
        metadata: { name: "bad" },
        spec: { rules: [] },
      }),
    });

    expect(result.ok).toBe(false);
    if (result.ok || result.issues === undefined) {
      throw new Error("Expected schema rejection with issues");
    }
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.issues)).toBe(true);
    expect(result.issues.every(issue => Object.isFrozen(issue))).toBe(true);
  });

  test("epoch exhaustion rejects an otherwise-valid candidate without publication", () => {
    const store = createCapabilityPolicyHotReloadStoreForTest(trustedGraph, 1);
    expect(store.reload({ format: "JSON", source: VALID_EMPTY_POLICY })).toEqual({
      ok: true,
      status: "SWAPPED",
      epoch: 1,
    });
    const before = store.read();

    expect(store.reload({ format: "JSON", source: VALID_EMPTY_POLICY })).toEqual({
      ok: false,
      status: "RELOAD_REJECTED",
      stage: "STATE",
      reasonCode: "POLICY_RELOAD_EPOCH_EXHAUSTED",
    });
    expect(store.read()).toBe(before);
  });
});
