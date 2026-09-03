import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { InMemoryLeaseInventoryStore } from "./lease-listing-memory-store.js";
import { listCapabilityLeases } from "./lease-listing.js";
import type { LeaseInventoryState, LeaseInventoryStore } from "./lease-listing-types.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/lease-listing/cases.json");

interface FixtureCase {
  readonly id: string;
  readonly description: string;
  readonly mode?: "CLI" | "RENDER_HUMAN" | "RENDER_JSON";
  readonly input?: unknown;
  readonly states?: readonly Record<string, unknown>[];
  readonly generatedStates?: { readonly count: number; readonly leaseRefPrefix: string };
  readonly storeFault?: string;
  readonly expected: Record<string, unknown>;
}

interface FixtureRoot {
  readonly profile: string;
  readonly snapshotLimit: number;
  readonly stateDefaults: Record<string, unknown>;
  readonly cases: readonly FixtureCase[];
}

function loadFixture(): FixtureRoot {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || parsed["profile"] !== "M4-035_LEASE_LISTING_V1" || parsed["snapshotLimit"] !== 1024) {
    throw new Error("lease-listing fixture profile/limit mismatch");
  }
  if (!isRecord(parsed["stateDefaults"]) || !Array.isArray(parsed["cases"])) {
    throw new Error("lease-listing fixture requires defaults/cases");
  }
  const cases = parsed["cases"] as unknown[];
  for (let index = 0; index < cases.length; index += 1) {
    const item = cases[index];
    if (!isRecord(item) || item["id"] !== `LLST-${String(index + 1).padStart(3, "0")}`) {
      throw new Error("lease-listing fixture ids must be contiguous");
    }
  }
  return parsed as unknown as FixtureRoot;
}

const fixture = loadFixture();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function materialize(raw: Record<string, unknown>): LeaseInventoryState {
  return { ...fixture.stateDefaults, ...raw } as unknown as LeaseInventoryState;
}

function statesFor(item: FixtureCase): readonly LeaseInventoryState[] {
  if (item.generatedStates !== undefined) {
    return Array.from({ length: item.generatedStates.count }, (_, index) => materialize({
      leaseRef: `${item.generatedStates?.leaseRefPrefix ?? "lease:item:"}${index}`,
    }));
  }
  return (item.states ?? []).map(materialize);
}

function storeFor(item: FixtureCase, onCall: () => void): LeaseInventoryStore {
  if (item.storeFault === "UNAVAILABLE") {
    return { listSnapshot() { onCall(); return { status: "UNAVAILABLE" }; } };
  }
  if (item.storeFault === "MALFORMED_RESULT") {
    return { listSnapshot() { onCall(); return { status: "BROKEN" } as never; } };
  }
  const base = new InMemoryLeaseInventoryStore(statesFor(item));
  return {
    listSnapshot(maxEntries) {
      onCall();
      return base.listSnapshot(maxEntries);
    },
  };
}

function findEntry(result: unknown, leaseRef: string): Record<string, unknown> | undefined {
  if (!isRecord(result) || !Array.isArray(result["entries"])) return undefined;
  return (result["entries"] as unknown[]).find(
    value => isRecord(value) && value["leaseRef"] === leaseRef,
  ) as Record<string, unknown> | undefined;
}

function assertExpected(item: FixtureCase, result: unknown): void {
  const expectedResult = item.expected["result"];
  if (isRecord(expectedResult)) {
    if (expectedResult["status"] === "LISTED" && Array.isArray(expectedResult["entries"])) {
      expect(result).toMatchObject(expectedResult);
    } else {
      expect(result).toEqual(expectedResult);
    }
  }

  const expectedOrder = item.expected["leaseRefOrder"];
  if (Array.isArray(expectedOrder) && isRecord(result) && Array.isArray(result["entries"])) {
    expect((result["entries"] as Record<string, unknown>[]).map(entry => entry["leaseRef"])).toEqual(expectedOrder);
  }

  const expectedEntry = item.expected["entry"];
  if (isRecord(expectedEntry) && typeof expectedEntry["leaseRef"] === "string") {
    expect(findEntry(result, expectedEntry["leaseRef"])).toMatchObject(expectedEntry);
  }

  const absent = item.expected["absentEntryKeys"];
  if (Array.isArray(absent) && isRecord(result) && Array.isArray(result["entries"])) {
    for (const entry of result["entries"] as Record<string, unknown>[]) {
      for (const key of absent) expect(Object.hasOwn(entry, String(key))).toBe(false);
    }
  }

  const forbiddenValues = item.expected["forbiddenOutputValues"];
  if (Array.isArray(forbiddenValues)) {
    const serialized = JSON.stringify(result);
    for (const value of forbiddenValues) expect(serialized).not.toContain(String(value));
  }
}

describe("M4-035 portable lease-listing Broker corpus", () => {
  test("contains exactly reviewed LLST-001..035 cases", () => {
    expect(fixture.cases).toHaveLength(35);
    expect(fixture.cases.at(0)?.id).toBe("LLST-001");
    expect(fixture.cases.at(-1)?.id).toBe("LLST-035");
  });

  for (const item of fixture.cases.filter(entry => entry.mode === undefined)) {
    test(`${item.id} ${item.description}`, async () => {
      let calls = 0;
      const result = await listCapabilityLeases(item.input, storeFor(item, () => { calls += 1; }));
      assertExpected(item, result);
      expect(calls).toBe(item.expected["storeCalls"]);
    });
  }
});

describe("M4-035 Broker hostile-runtime hardening", () => {
  test("rejects accessor input without executing getter", async () => {
    let getterCalls = 0;
    const input = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(input, "profile", { enumerable: true, value: "M4-035_LEASE_LISTING_V1" });
    Object.defineProperty(input, "observedAt", {
      enumerable: true,
      get() { getterCalls += 1; return "2026-09-03T02:00:00Z"; },
    });
    let storeCalls = 0;
    const result = await listCapabilityLeases(input, {
      listSnapshot() { storeCalls += 1; return { status: "SNAPSHOT", states: [] }; },
    });
    expect(result).toEqual({ status: "FAIL_CLOSED", stage: "INPUT", reasonCode: "LEASE_LIST_OBSERVED_AT_INVALID" });
    expect(getterCalls).toBe(0);
    expect(storeCalls).toBe(0);
  });

  test("sanitizes store exceptions and calls the store once", async () => {
    let calls = 0;
    const result = await listCapabilityLeases(
      { profile: "M4-035_LEASE_LISTING_V1", observedAt: "2026-09-03T02:00:00Z" },
      { listSnapshot() { calls += 1; throw new Error("secret backend diagnostic"); } },
    );
    expect(result).toEqual({ status: "FAIL_CLOSED", stage: "STORE", reasonCode: "LEASE_LIST_STORE_UNAVAILABLE" });
    expect(JSON.stringify(result)).not.toContain("secret backend diagnostic");
    expect(calls).toBe(1);
  });

  test("rejects an accessor inside constraints without reading values", async () => {
    let secretGetterCalls = 0;
    const constraints = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(constraints, "secret", {
      enumerable: true,
      get() { secretGetterCalls += 1; return "DO_NOT_READ"; },
    });
    const state = materialize({ leaseRef: "lease:constrained", constraints });
    const result = await listCapabilityLeases(
      { profile: "M4-035_LEASE_LISTING_V1", observedAt: "2026-09-03T02:00:00Z" },
      { listSnapshot() { return { status: "SNAPSHOT", states: [state] }; } },
    );
    expect(result).toMatchObject({ status: "LISTED", entries: [{ constraintsState: "NON_EMPTY" }] });
    expect(secretGetterCalls).toBe(0);
    expect(JSON.stringify(result)).not.toContain("DO_NOT_READ");
  });

  test("returns deeply frozen public structural output", async () => {
    const result = await listCapabilityLeases(
      { profile: "M4-035_LEASE_LISTING_V1", observedAt: "2026-09-03T02:00:00Z" },
      new InMemoryLeaseInventoryStore([materialize({ leaseRef: "lease:a" })]),
    );
    expect(Object.isFrozen(result)).toBe(true);
    if (result.status === "LISTED") {
      expect(Object.isFrozen(result.entries)).toBe(true);
      expect(Object.isFrozen(result.entries[0])).toBe(true);
      expect(Object.isFrozen(result.entries[0]?.resource)).toBe(true);
      expect(Object.isFrozen(result.entries[0]?.authorization)).toBe(true);
      expect(Object.isFrozen(result.entries[0]?.ttl)).toBe(true);
      expect(Object.isFrozen(result.entries[0]?.usage)).toBe(true);
    }
  });
});
