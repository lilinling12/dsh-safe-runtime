import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { revokeCapabilityLease } from "./lease-revoke.js";
import { InMemoryLeaseRevocationStore } from "./lease-revoke-memory-store.js";
import type { LeaseRevocationState, LeaseRevocationStore } from "./lease-revoke-types.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/lease-revocation/cases.json");

interface FixtureAttempt {
  readonly input: unknown;
}

interface FixtureCase {
  readonly id: string;
  readonly description: string;
  readonly mode: string;
  readonly input?: unknown;
  readonly attempts?: readonly FixtureAttempt[];
  readonly store?: unknown;
  readonly stores?: readonly unknown[];
  readonly storeFault?: string;
  readonly attemptCount?: number;
  readonly expected: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cases(): readonly FixtureCase[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || parsed["profile"] !== "M4-033_LEASE_REVOKE_V1" || !Array.isArray(parsed["cases"])) {
    throw new Error("lease-revocation fixture must contain the reviewed profile and cases array");
  }
  return parsed["cases"].map((raw, index) => {
    if (!isRecord(raw) || typeof raw["id"] !== "string" || typeof raw["description"] !== "string" || typeof raw["mode"] !== "string" || !isRecord(raw["expected"])) {
      throw new Error("malformed lease-revocation portable fixture");
    }
    const expectedId = `LREV-${String(index + 1).padStart(3, "0")}`;
    if (raw["id"] !== expectedId) throw new Error(`non-canonical lease-revocation fixture id: ${raw["id"]}`);
    return raw as unknown as FixtureCase;
  });
}

function state(value: unknown): LeaseRevocationState | undefined {
  if (!isRecord(value) || typeof value["leaseRef"] !== "string" || typeof value["revoked"] !== "boolean") return undefined;
  return { leaseRef: value["leaseRef"], revoked: value["revoked"] };
}

function states(value: unknown): readonly LeaseRevocationState[] {
  if (value === undefined) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map(state).filter((item): item is LeaseRevocationState => item !== undefined);
}

function faultStore(fault: string): LeaseRevocationStore {
  return {
    revokeOne(leaseRef) {
      if (fault === "UNAVAILABLE_NOT_APPLIED") return { status: "UNAVAILABLE_NOT_APPLIED" };
      if (fault === "OUTCOME_UNKNOWN") return { status: "OUTCOME_UNKNOWN" };
      if (fault === "WRONG_IDENTITY_RESULT") {
        return {
          status: "REVOKED",
          stateBefore: { leaseRef: `${leaseRef}:other`, revoked: false },
          stateAfter: { leaseRef: `${leaseRef}:other`, revoked: true },
        };
      }
      return { status: "BROKEN" } as never;
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

describe("M4-033 portable CapabilityLease revocation corpus", () => {
  test("fixture corpus has reviewed breadth and canonical IDs", () => {
    expect(fixtures).toHaveLength(32);
    expect(fixtures.at(0)?.id).toBe("LREV-001");
    expect(fixtures.at(-1)?.id).toBe("LREV-032");
  });

  for (const fixture of fixtures) {
    test(`${fixture.id}: ${fixture.description}`, async () => {
      const initialStates = fixture.mode === "MULTI_LEASE" ? states(fixture.stores) : states(fixture.store);
      const store = fixture.storeFault ? faultStore(fixture.storeFault) : new InMemoryLeaseRevocationStore(initialStates);
      let calls = 0;
      const counted: LeaseRevocationStore = {
        async revokeOne(leaseRef) {
          calls += 1;
          return store.revokeOne(leaseRef);
        },
      };

      if (fixture.mode === "SEQUENTIAL") {
        const result = await revokeCapabilityLease(fixture.input, counted);
        expect(result).toEqual(fixture.expected["result"]);
      } else if (fixture.mode === "CONCURRENT") {
        const results = await Promise.all(
          Array.from({ length: fixture.attemptCount ?? 0 }, () => revokeCapabilityLease(fixture.input, counted)),
        );
        expect(counts(results as unknown as Record<string, unknown>[], "status")).toEqual(fixture.expected["statusCounts"]);
        expect(counts(results as unknown as Record<string, unknown>[], "reasonCode")).toEqual(fixture.expected["reasonCodeCounts"]);
      } else if (fixture.mode === "MULTI_LEASE") {
        const results = await Promise.all((fixture.attempts ?? []).map((attempt) => revokeCapabilityLease(attempt.input, counted)));
        expect(counts(results as unknown as Record<string, unknown>[], "status")).toEqual(fixture.expected["statusCounts"]);
      } else {
        throw new Error(`unsupported lease-revocation fixture mode: ${fixture.mode}`);
      }

      expect(calls).toBe(fixture.expected["storeCalls"]);

      if (store instanceof InMemoryLeaseRevocationStore) {
        const expectedFinal = fixture.expected["finalState"];
        if (expectedFinal !== "UNSPECIFIED") {
          if (expectedFinal === null) {
            const ref = isRecord(fixture.input) ? fixture.input["leaseRef"] : undefined;
            if (typeof ref === "string") expect(store.snapshot(ref)).toBeUndefined();
          } else {
            const final = state(expectedFinal);
            if (final) expect(store.snapshot(final.leaseRef)).toEqual(final);
          }
        }

        const expectedFinalStates = fixture.expected["finalStates"];
        if (Array.isArray(expectedFinalStates)) {
          for (const raw of expectedFinalStates) {
            const final = state(raw);
            if (final) expect(store.snapshot(final.leaseRef)).toEqual(final);
          }
        }
      }
    });
  }
});
