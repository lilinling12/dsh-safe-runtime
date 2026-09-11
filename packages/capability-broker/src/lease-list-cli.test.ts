import { describe, expect, test } from "vitest";

import { InMemoryLeaseInventoryStore } from "./lease-listing-memory-store.js";
import type { LeaseInventoryState, LeaseInventoryStore } from "./lease-listing-types.js";
import {
  escapeTerminalText,
  renderLeaseListHuman,
  renderLeaseListJson,
  runLeaseListCommand,
} from "./lease-list-cli.js";

const DEFAULT_STATE: Omit<LeaseInventoryState, "leaseRef"> = {
  subjectRef: "agent/root",
  capability: "fs.write",
  resource: { scheme: "workspace", locator: "/src/a.ts" },
  issuedAt: "2026-09-03T01:00:00Z",
  expiresAt: "2026-09-03T03:00:00Z",
  maxUses: 5,
  remainingUses: 5,
  authorization: { kind: "approval", ref: "approval:root" },
  revoked: false,
};

function state(leaseRef: string): LeaseInventoryState {
  return { ...DEFAULT_STATE, leaseRef };
}

function countedStore(states: readonly LeaseInventoryState[], calls: { value: number }): LeaseInventoryStore {
  const base = new InMemoryLeaseInventoryStore(states);
  return {
    listSnapshot(maxEntries) {
      calls.value += 1;
      return base.listSnapshot(maxEntries);
    },
  };
}

describe("M4-035 logical lease-list command", () => {
  test("projects explicit JSON observedAt without reading clock", async () => {
    const storeCalls = { value: 0 };
    let clockReads = 0;
    const result = await runLeaseListCommand(
      ["lease", "list", "--json", "--observed-at", "2026-09-03T02:00:00Z"],
      countedStore([], storeCalls),
      { now() { clockReads += 1; return "2026-09-03T09:00:00Z"; } },
    );
    expect(result).toMatchObject({
      status: "SUCCESS",
      format: "JSON",
      brokerInput: { profile: "M4-035_LEASE_LISTING_V1", observedAt: "2026-09-03T02:00:00Z" },
    });
    expect(clockReads).toBe(0);
    expect(storeCalls.value).toBe(1);
  });

  test("captures injected clock exactly once when observedAt is omitted", async () => {
    const storeCalls = { value: 0 };
    let clockReads = 0;
    const values = ["2026-09-03T02:00:00Z", "2026-09-03T02:00:01Z"];
    const result = await runLeaseListCommand(
      ["lease", "list"],
      countedStore([], storeCalls),
      { now() { const value = values[clockReads]; clockReads += 1; return value; } },
    );
    expect(result).toMatchObject({
      status: "SUCCESS",
      format: "HUMAN",
      brokerInput: { observedAt: "2026-09-03T02:00:00Z" },
    });
    expect(clockReads).toBe(1);
    expect(storeCalls.value).toBe(1);
  });

  test("unknown or duplicate options fail before clock/store", async () => {
    for (const argv of [
      ["lease", "list", "--active-only"],
      ["lease", "list", "--json", "--json"],
      ["lease", "list", "--observed-at"],
      ["lease", "list", "unexpected"],
    ]) {
      let clockReads = 0;
      let storeCalls = 0;
      const result = await runLeaseListCommand(
        argv,
        { listSnapshot() { storeCalls += 1; return { status: "SNAPSHOT", states: [] }; } },
        { now() { clockReads += 1; return "2026-09-03T02:00:00Z"; } },
      );
      expect(result).toEqual({ status: "CLI_USAGE_ERROR", reasonCode: "LEASE_LIST_CLI_ARGUMENT_INVALID" });
      expect(clockReads).toBe(0);
      expect(storeCalls).toBe(0);
    }
  });

  test("malformed explicit observedAt is a CLI usage error before store", async () => {
    let storeCalls = 0;
    const result = await runLeaseListCommand(
      ["lease", "list", "--observed-at", "invalid"],
      { listSnapshot() { storeCalls += 1; return { status: "SNAPSHOT", states: [] }; } },
      { now() { return "2026-09-03T02:00:00Z"; } },
    );
    expect(result).toEqual({ status: "CLI_USAGE_ERROR", reasonCode: "LEASE_LIST_CLI_ARGUMENT_INVALID" });
    expect(storeCalls).toBe(0);
  });

  test("invalid/throwing clock becomes sanitized runtime failure without store", async () => {
    for (const clock of [
      { now() { return "invalid"; } },
      { now(): never { throw new Error("clock secret"); } },
    ]) {
      let storeCalls = 0;
      const result = await runLeaseListCommand(
        ["lease", "list"],
        { listSnapshot() { storeCalls += 1; return { status: "SNAPSHOT", states: [] }; } },
        clock,
      );
      expect(result).toMatchObject({
        status: "RUNTIME_FAILURE",
        result: { status: "FAIL_CLOSED", stage: "INPUT", reasonCode: "LEASE_LIST_OBSERVED_AT_INVALID" },
      });
      expect(JSON.stringify(result)).not.toContain("clock secret");
      expect(storeCalls).toBe(0);
    }
  });
});

describe("M4-035 rendering safety", () => {
  test("human rendering escapes ESC and bidi controls", () => {
    const unsafe = `lease:${String.fromCodePoint(0x1b)}[31mRED${String.fromCodePoint(0x202e)}`;
    const escaped = escapeTerminalText(unsafe);
    expect(escaped).toContain("\\u001b");
    expect(escaped).toContain("\\u202e");
    expect(escaped).not.toContain(String.fromCodePoint(0x1b));
    expect(escaped).not.toContain(String.fromCodePoint(0x202e));
  });

  test("JSON rendering preserves exact parsed ref while escaping terminal controls", () => {
    const leaseRef = `lease:${String.fromCodePoint(0x1b)}[31mRED`;
    const result = listedResult(leaseRef);
    const wire = renderLeaseListJson(result);
    expect(wire).toContain("\\u001b");
    expect((JSON.parse(wire) as { entries: { leaseRef: string }[] }).entries[0]?.leaseRef).toBe(leaseRef);
  });

  test("human renderer emits no raw control from normalized entries", () => {
    const leaseRef = `lease:${String.fromCodePoint(0x1b)}[31mRED${String.fromCodePoint(0x202e)}`;
    const output = renderLeaseListHuman(listedResult(leaseRef));
    expect(output).not.toContain(String.fromCodePoint(0x1b));
    expect(output).not.toContain(String.fromCodePoint(0x202e));
    expect(output).toContain("\\u001b");
    expect(output).toContain("\\u202e");
  });
});

describe("M4-035 CLI hostile argv", () => {
  test("rejects accessor argv without getter execution", async () => {
    let getterCalls = 0;
    const argv: unknown[] = ["lease", "list"];
    Object.defineProperty(argv, "2", {
      enumerable: true,
      get() { getterCalls += 1; return "--json"; },
    });
    let storeCalls = 0;
    const result = await runLeaseListCommand(
      argv,
      { listSnapshot() { storeCalls += 1; return { status: "SNAPSHOT", states: [] }; } },
      { now() { return "2026-09-03T02:00:00Z"; } },
    );
    expect(result).toEqual({ status: "CLI_USAGE_ERROR", reasonCode: "LEASE_LIST_CLI_ARGUMENT_INVALID" });
    expect(getterCalls).toBe(0);
    expect(storeCalls).toBe(0);
  });
});

function listedResult(leaseRef: string) {
  return {
    status: "LISTED",
    profile: "M4-035_LEASE_LISTING_V1",
    observedAt: "2026-09-03T02:00:00Z",
    entries: [{
      ...state(leaseRef),
      constraintsState: "NONE",
      ttl: { status: "TIME_ELIGIBLE", reasonCode: "LEASE_TTL_ACTIVE" },
      usage: { status: "USAGE_ELIGIBLE", reasonCode: "LEASE_USAGE_AVAILABLE" },
    }],
  } as const;
}
