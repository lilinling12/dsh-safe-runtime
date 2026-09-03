import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { InMemoryLeaseRevocationStore } from "./lease-revoke-memory-store.js";
import type {
  LeaseRevocationState,
  LeaseRevocationStore,
  LeaseRevocationStoreOutcome,
} from "./lease-revoke-types.js";
import {
  LEASE_REVOKE_CLI_PROFILE,
  renderLeaseRevokeHuman,
  renderLeaseRevokeJson,
  runLeaseRevokeCommand,
} from "./lease-revoke-cli.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/lease-revoke-cli/cases.json");

interface FixtureCase {
  readonly id: string;
  readonly description: string;
  readonly mode?: string;
  readonly argv?: unknown;
  readonly argvSequence?: readonly unknown[];
  readonly store?: unknown;
  readonly stores?: readonly unknown[];
  readonly storeFault?: string;
  readonly storeFaultSequence?: readonly string[];
  readonly preserved?: unknown;
  readonly expected: Readonly<Record<string, unknown>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCases(): readonly FixtureCase[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (
    !isRecord(parsed)
    || parsed["profile"] !== LEASE_REVOKE_CLI_PROFILE
    || parsed["brokerProfile"] !== "M4-033_LEASE_REVOKE_V1"
    || !Array.isArray(parsed["cases"])
  ) {
    throw new Error("M4-036 fixture must contain the reviewed CLI/broker profiles and cases array");
  }
  return parsed["cases"].map((raw, index) => {
    if (!isRecord(raw) || typeof raw["id"] !== "string" || typeof raw["description"] !== "string" || !isRecord(raw["expected"])) {
      throw new Error("malformed M4-036 portable fixture");
    }
    const expectedId = `LRCL-${String(index + 1).padStart(3, "0")}`;
    if (raw["id"] !== expectedId) throw new Error(`non-canonical M4-036 fixture id: ${raw["id"]}`);
    return raw as unknown as FixtureCase;
  });
}

function state(value: unknown): LeaseRevocationState | undefined {
  if (!isRecord(value) || typeof value["leaseRef"] !== "string" || typeof value["revoked"] !== "boolean") return undefined;
  return { leaseRef: value["leaseRef"], revoked: value["revoked"] };
}

function states(...values: readonly unknown[]): readonly LeaseRevocationState[] {
  const output: LeaseRevocationState[] = [];
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const parsed = state(item);
        if (parsed !== undefined) output.push(parsed);
      }
      continue;
    }
    const parsed = state(value);
    if (parsed !== undefined) output.push(parsed);
  }
  return output;
}

function faultOutcome(fault: string, leaseRef: string): LeaseRevocationStoreOutcome | undefined {
  if (fault === "UNAVAILABLE_NOT_APPLIED") return { status: "UNAVAILABLE_NOT_APPLIED" };
  if (fault === "OUTCOME_UNKNOWN") return { status: "OUTCOME_UNKNOWN" };
  if (fault === "MALFORMED_RESULT") return { status: "BROKEN" } as never;
  if (fault === "WRONG_IDENTITY_RESULT") {
    return {
      status: "REVOKED",
      stateBefore: { leaseRef: `${leaseRef}:other`, revoked: false },
      stateAfter: { leaseRef: `${leaseRef}:other`, revoked: true },
    };
  }
  return undefined;
}

function fixtureStore(fixture: FixtureCase, calls: { value: number }): {
  readonly store: LeaseRevocationStore;
  readonly base: InMemoryLeaseRevocationStore;
} {
  const base = new InMemoryLeaseRevocationStore(states(fixture.store, fixture.stores));
  let faultIndex = 0;
  const store: LeaseRevocationStore = {
    async revokeOne(leaseRef) {
      calls.value += 1;
      const sequenceFault = fixture.storeFaultSequence?.[faultIndex];
      faultIndex += 1;
      const fault = sequenceFault ?? fixture.storeFault;
      if (fault === "OUTCOME_UNKNOWN_COMMITTED") {
        await base.revokeOne(leaseRef);
        return { status: "OUTCOME_UNKNOWN" };
      }
      const injected = fault === undefined || fault === "NONE" ? undefined : faultOutcome(fault, leaseRef);
      return injected ?? base.revokeOne(leaseRef);
    },
  };
  return { store, base };
}

function assertExpected(result: Awaited<ReturnType<typeof runLeaseRevokeCommand>>, expected: Readonly<Record<string, unknown>>): void {
  expect(result.status).toBe(expected["commandStatus"]);
  if (expected["reasonCode"] !== undefined) {
    expect(result).toMatchObject({ reasonCode: expected["reasonCode"] });
  }
  if (result.status === "CLI_USAGE_ERROR") return;

  if (expected["format"] !== undefined) expect(result.format).toBe(expected["format"]);
  if (expected["brokerInput"] !== undefined) {
    expect("brokerInput" in result ? result.brokerInput : undefined).toEqual(expected["brokerInput"]);
  }
  if (expected["brokerResult"] !== undefined) expect(result.result).toEqual(expected["brokerResult"]);
  if (expected["output"] !== undefined) expect(result.output).toBe(expected["output"]);
}

const fixtures = readCases();

describe("M4-036 portable CapabilityLease revoke CLI corpus", () => {
  test("fixture corpus has reviewed breadth and canonical IDs", () => {
    expect(fixtures).toHaveLength(34);
    expect(fixtures.at(0)?.id).toBe("LRCL-001");
    expect(fixtures.at(-1)?.id).toBe("LRCL-034");
  });

  for (const fixture of fixtures) {
    test(`${fixture.id}: ${fixture.description}`, async () => {
      const calls = { value: 0 };
      const { store, base } = fixtureStore(fixture, calls);

      if (fixture.mode === "SEQUENCE") {
        const results = [];
        for (const argv of fixture.argvSequence ?? []) {
          results.push(await runLeaseRevokeCommand(argv, store));
        }
        expect(results.map(result => result.status)).toEqual(fixture.expected["commandStatuses"]);
        expect(results.map(result => result.status === "CLI_USAGE_ERROR" ? undefined : result.result.status))
          .toEqual(fixture.expected["brokerStatuses"]);
        if (fixture.expected["brokerReasonCodes"] !== undefined) {
          expect(results.map(result => result.status === "CLI_USAGE_ERROR" ? undefined : result.result.reasonCode))
            .toEqual(fixture.expected["brokerReasonCodes"]);
        }
      } else {
        const result = await runLeaseRevokeCommand(fixture.argv, store);
        assertExpected(result, fixture.expected);
      }

      expect(calls.value).toBe(fixture.expected["storeCalls"]);

      const expectedFinalState = state(fixture.expected["finalState"]);
      if (expectedFinalState !== undefined) {
        expect(base.snapshot(expectedFinalState.leaseRef)).toEqual(expectedFinalState);
      }
      const expectedFinalStates = fixture.expected["finalStates"];
      if (Array.isArray(expectedFinalStates)) {
        for (const raw of expectedFinalStates) {
          const parsed = state(raw);
          if (parsed !== undefined) expect(base.snapshot(parsed.leaseRef)).toEqual(parsed);
        }
      }

      if (fixture.expected["mustNotContainRawCodePoints"] !== undefined) {
        const result = await runLeaseRevokeCommand(fixture.argv, new InMemoryLeaseRevocationStore(states(fixture.store)));
        if (result.status !== "CLI_USAGE_ERROR") {
          expect(result.output).not.toContain(String.fromCodePoint(0x1b));
          expect(result.output).not.toContain(String.fromCodePoint(0x202e));
        }
      }
    });
  }
});

describe("M4-036 hostile argv and invocation hardening", () => {
  test("rejects accessor argv without executing getter or touching store", async () => {
    let getterCalls = 0;
    let storeCalls = 0;
    const argv: unknown[] = ["lease", "revoke", "--lease-ref", "lease:x"];
    Object.defineProperty(argv, "3", {
      enumerable: true,
      get() { getterCalls += 1; return "lease:secret"; },
    });
    const result = await runLeaseRevokeCommand(argv, {
      revokeOne() {
        storeCalls += 1;
        return { status: "NOT_FOUND" };
      },
    });
    expect(result).toEqual({ status: "CLI_USAGE_ERROR", reasonCode: "LEASE_REVOKE_CLI_ARGUMENT_INVALID" });
    expect(getterCalls).toBe(0);
    expect(storeCalls).toBe(0);
  });

  test("rejects named and symbol argv properties before store access", async () => {
    for (const decorate of [
      (argv: unknown[]) => { Object.defineProperty(argv, "named", { value: "x", enumerable: true }); },
      (argv: unknown[]) => { Object.defineProperty(argv, Symbol("hidden"), { value: "x", enumerable: true }); },
    ]) {
      const argv: unknown[] = ["lease", "revoke", "--lease-ref", "lease:x"];
      decorate(argv);
      let storeCalls = 0;
      const result = await runLeaseRevokeCommand(argv, {
        revokeOne() {
          storeCalls += 1;
          return { status: "NOT_FOUND" };
        },
      });
      expect(result.status).toBe("CLI_USAGE_ERROR");
      expect(storeCalls).toBe(0);
    }
  });

  test("sanitizes thrown store error through M4-033 and never retries", async () => {
    let calls = 0;
    const result = await runLeaseRevokeCommand(
      ["lease", "revoke", "--lease-ref", "lease:throw"],
      {
        revokeOne(): never {
          calls += 1;
          throw new Error("backend secret");
        },
      },
    );
    expect(result).toMatchObject({
      status: "RUNTIME_FAILURE",
      result: { status: "FAIL_CLOSED", stage: "STORE", reasonCode: "LEASE_REVOKE_OUTCOME_UNKNOWN" },
    });
    expect(JSON.stringify(result)).not.toContain("backend secret");
    expect(calls).toBe(1);
  });

  test("returns detached frozen command envelope and broker input", async () => {
    const result = await runLeaseRevokeCommand(
      ["lease", "revoke", "--lease-ref", "lease:frozen"],
      new InMemoryLeaseRevocationStore([{ leaseRef: "lease:frozen", revoked: false }]),
    );
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.status).toBe("SUCCESS");
    if (result.status === "SUCCESS") {
      expect(Object.isFrozen(result.brokerInput)).toBe(true);
      expect(Object.isFrozen(result.result)).toBe(true);
    }
  });
});

describe("M4-036 rendering", () => {
  test("human renderer emits only fixed M4-033 vocabulary", () => {
    expect(renderLeaseRevokeHuman({ status: "REVOKED", reasonCode: "LEASE_REVOKED" }))
      .toBe("REVOKED\tLEASE_REVOKED");
    expect(renderLeaseRevokeHuman({
      status: "FAIL_CLOSED",
      stage: "STORE",
      reasonCode: "LEASE_REVOKE_OUTCOME_UNKNOWN",
    })).toBe("FAIL_CLOSED\tSTORE\tLEASE_REVOKE_OUTCOME_UNKNOWN");
  });

  test("JSON renderer contains only the broker result object", () => {
    const wire = renderLeaseRevokeJson({ status: "ALREADY_REVOKED", reasonCode: "LEASE_ALREADY_REVOKED" });
    expect(JSON.parse(wire)).toEqual({ status: "ALREADY_REVOKED", reasonCode: "LEASE_ALREADY_REVOKED" });
    expect(wire).not.toContain("leaseRef");
  });
});
