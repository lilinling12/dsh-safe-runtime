import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { consumeCapabilityLeaseUse } from "./lease-consume.js";
import { InMemoryLeaseUseStore } from "./lease-consume-memory-store.js";
import type { LeaseUseState, LeaseUseStore } from "./lease-consume-types.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/lease-consume/cases.json");

interface FixtureCase {
  readonly id: string;
  readonly description: string;
  readonly mode: string;
  readonly input?: unknown;
  readonly inputs?: readonly unknown[];
  readonly store?: unknown;
  readonly storeFault?: string;
  readonly attemptCount?: number;
  readonly expected: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cases(): readonly FixtureCase[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || parsed["profile"] !== "M4-032_LEASE_CONSUME_V1" || !Array.isArray(parsed["cases"])) {
    throw new Error("lease-consume fixture must contain the reviewed profile and cases array");
  }
  return parsed["cases"].map((raw, index) => {
    if (!isRecord(raw) || typeof raw["id"] !== "string" || typeof raw["description"] !== "string" || typeof raw["mode"] !== "string" || !isRecord(raw["expected"])) {
      throw new Error("malformed lease-consume portable fixture");
    }
    const expectedId = `LCON-${String(index + 1).padStart(3, "0")}`;
    if (raw["id"] !== expectedId) throw new Error(`non-canonical lease-consume fixture id: ${raw["id"]}`);
    return raw as unknown as FixtureCase;
  });
}

function states(value: unknown): readonly LeaseUseState[] {
  if (value === undefined) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.filter(isRecord).map((state) => ({
    leaseRef: String(state["leaseRef"]),
    maxUses: state["maxUses"],
    remainingUses: state["remainingUses"],
  }));
}

function faultStore(fault: string): LeaseUseStore {
  return {
    consumeOne() {
      if (fault === "UNAVAILABLE_NOT_APPLIED") return { status: "UNAVAILABLE_NOT_APPLIED" };
      return { status: "OUTCOME_UNKNOWN" };
    },
  };
}

function counts(results: readonly Record<string, unknown>[], key: string): Record<string, number> {
  const output: Record<string, number> = {};
  for (const result of results) {
    const value = result[key];
    if (typeof value === "string") output[value] = (output[value] ?? 0) + 1;
  }
  return output;
}

const fixtures = cases();

describe("M4-032 portable CapabilityLease atomic-consume corpus", () => {
  test("fixture corpus has reviewed breadth and canonical IDs", () => {
    expect(fixtures).toHaveLength(40);
    expect(fixtures.at(0)?.id).toBe("LCON-001");
    expect(fixtures.at(-1)?.id).toBe("LCON-040");
  });

  for (const fixture of fixtures) {
    test(`${fixture.id}: ${fixture.description}`, async () => {
      const initialStates = states(fixture.store);
      const store = fixture.storeFault ? faultStore(fixture.storeFault) : new InMemoryLeaseUseStore(initialStates);
      let calls = 0;
      const counted: LeaseUseStore = {
        async consumeOne(leaseRef) {
          calls += 1;
          return store.consumeOne(leaseRef);
        },
      };

      if (fixture.mode === "SEQUENTIAL") {
        const result = await consumeCapabilityLeaseUse(fixture.input, counted);
        expect(result).toEqual(fixture.expected["result"]);
      } else if (fixture.mode === "SEQUENCE") {
        const results = [];
        for (let index = 0; index < (fixture.attemptCount ?? 0); index += 1) {
          results.push(await consumeCapabilityLeaseUse(fixture.input, counted));
        }
        expect(results).toEqual(fixture.expected["results"]);
      } else {
        const inputs = fixture.mode === "CONCURRENT_MULTI_LEASE"
          ? fixture.inputs ?? []
          : Array.from({ length: fixture.attemptCount ?? 0 }, () => fixture.input);
        const results = await Promise.all(inputs.map((input) => consumeCapabilityLeaseUse(input, counted)));
        expect(counts(results as unknown as Record<string, unknown>[], "status")).toEqual(fixture.expected["statusCounts"]);
        expect(counts(results as unknown as Record<string, unknown>[], "reasonCode")).toEqual(fixture.expected["reasonCodeCounts"]);
      }

      expect(calls).toBe(fixture.expected["storeCalls"]);

      const expectedFinal = fixture.expected["finalState"];
      if (expectedFinal !== "UNSPECIFIED" && store instanceof InMemoryLeaseUseStore) {
        if (Array.isArray(expectedFinal)) {
          for (const state of expectedFinal) {
            if (isRecord(state)) expect(store.snapshot(String(state["leaseRef"]))).toEqual(state);
          }
        } else if (expectedFinal === null) {
          const ref = isRecord(fixture.input) ? fixture.input["leaseRef"] : undefined;
          if (typeof ref === "string") expect(store.snapshot(ref)).toBeUndefined();
        } else if (isRecord(expectedFinal)) {
          expect(store.snapshot(String(expectedFinal["leaseRef"]))).toEqual(expectedFinal);
        }
      }
    });
  }
});
