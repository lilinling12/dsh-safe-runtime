import { describe, expect, test } from "vitest";

import { revokeCapabilityLease } from "./lease-revoke.js";
import type { LeaseRevocationStore } from "./lease-revoke-types.js";

const validInput = Object.freeze({
  profile: "M4-033_LEASE_REVOKE_V1",
  leaseRef: "lease:hardening",
});

function revokedStore(): LeaseRevocationStore {
  return {
    revokeOne(leaseRef) {
      return {
        status: "REVOKED",
        stateBefore: { leaseRef, revoked: false },
        stateAfter: { leaseRef, revoked: true },
      };
    },
  };
}

describe("M4-033 hostile runtime and store boundary", () => {
  test("rejects accessor input without executing getter or invoking store", async () => {
    let getterCalls = 0;
    let storeCalls = 0;
    const input = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(input, "profile", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "M4-033_LEASE_REVOKE_V1";
      },
    });
    Object.defineProperty(input, "leaseRef", { enumerable: true, value: "lease:x" });

    const result = await revokeCapabilityLease(input, {
      revokeOne() {
        storeCalls += 1;
        return { status: "NOT_FOUND" };
      },
    });

    expect(result).toEqual({ status: "FAIL_CLOSED", stage: "INPUT", reasonCode: "LEASE_REVOKE_INPUT_INVALID" });
    expect(getterCalls).toBe(0);
    expect(storeCalls).toBe(0);
  });

  test("fails closed on revoked Proxy and unexpected symbol authority", async () => {
    const { proxy, revoke } = Proxy.revocable(validInput, {});
    revoke();
    let storeCalls = 0;
    expect(await revokeCapabilityLease(proxy, {
      revokeOne() {
        storeCalls += 1;
        return { status: "NOT_FOUND" };
      },
    })).toEqual({ status: "FAIL_CLOSED", stage: "INPUT", reasonCode: "LEASE_REVOKE_INPUT_INVALID" });
    expect(storeCalls).toBe(0);

    const symbolInput: Record<PropertyKey, unknown> = { ...validInput };
    symbolInput[Symbol("authority")] = true;
    expect(await revokeCapabilityLease(symbolInput, revokedStore())).toEqual({
      status: "FAIL_CLOSED", stage: "INPUT", reasonCode: "LEASE_REVOKE_INPUT_INVALID",
    });
  });

  test("rejects inherited identity without invoking store", async () => {
    let calls = 0;
    const inherited = Object.create(validInput);
    const result = await revokeCapabilityLease(inherited, {
      revokeOne() {
        calls += 1;
        return { status: "NOT_FOUND" };
      },
    });
    expect(result).toEqual({ status: "FAIL_CLOSED", stage: "INPUT", reasonCode: "LEASE_REVOKE_INPUT_INVALID" });
    expect(calls).toBe(0);
  });

  test("calls the store exactly once and never retries an exception", async () => {
    let calls = 0;
    const result = await revokeCapabilityLease(validInput, {
      revokeOne() {
        calls += 1;
        throw new Error("commit outcome cannot be determined");
      },
    });
    expect(calls).toBe(1);
    expect(result).toEqual({ status: "FAIL_CLOSED", stage: "STORE", reasonCode: "LEASE_REVOKE_OUTCOME_UNKNOWN" });
  });

  test("rejects wrong identity and fabricated state transitions", async () => {
    expect(await revokeCapabilityLease(validInput, {
      revokeOne() {
        return {
          status: "REVOKED",
          stateBefore: { leaseRef: "lease:other", revoked: false },
          stateAfter: { leaseRef: "lease:other", revoked: true },
        };
      },
    })).toEqual({ status: "FAIL_CLOSED", stage: "STORE", reasonCode: "LEASE_REVOKE_STORE_RESULT_INVALID" });

    expect(await revokeCapabilityLease(validInput, {
      revokeOne(leaseRef) {
        return {
          status: "REVOKED",
          stateBefore: { leaseRef, revoked: true },
          stateAfter: { leaseRef, revoked: true },
        };
      },
    })).toEqual({ status: "FAIL_CLOSED", stage: "STORE", reasonCode: "LEASE_REVOKE_STORE_RESULT_INVALID" });
  });

  test("malformed store results fail closed without invoking accessors", async () => {
    let statusGetterCalls = 0;
    const accessorOutcome = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(accessorOutcome, "status", {
      enumerable: true,
      get() {
        statusGetterCalls += 1;
        return "REVOKED";
      },
    });

    expect(await revokeCapabilityLease(validInput, {
      revokeOne: () => accessorOutcome as never,
    })).toEqual({ status: "FAIL_CLOSED", stage: "STORE", reasonCode: "LEASE_REVOKE_STORE_RESULT_INVALID" });
    expect(statusGetterCalls).toBe(0);

    const state = Object.create(null) as Record<string, unknown>;
    let revokedGetterCalls = 0;
    Object.defineProperty(state, "leaseRef", { enumerable: true, value: validInput.leaseRef });
    Object.defineProperty(state, "revoked", {
      enumerable: true,
      get() {
        revokedGetterCalls += 1;
        return true;
      },
    });
    expect(await revokeCapabilityLease(validInput, {
      revokeOne: () => ({ status: "ALREADY_REVOKED", state }) as never,
    })).toEqual({ status: "FAIL_CLOSED", stage: "STORE", reasonCode: "LEASE_REVOKE_STORE_RESULT_INVALID" });
    expect(revokedGetterCalls).toBe(0);
  });

  test("returns detached frozen results and does not mutate request input", async () => {
    const input = { ...validInput };
    const result = await revokeCapabilityLease(input, revokedStore());
    expect(Object.isFrozen(result)).toBe(true);
    expect(result).toEqual({ status: "REVOKED", reasonCode: "LEASE_REVOKED" });
    expect(input).toEqual(validInput);
  });
});
