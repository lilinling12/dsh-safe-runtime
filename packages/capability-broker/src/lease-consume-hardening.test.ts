import { describe, expect, test } from "vitest";

import { consumeCapabilityLeaseUse } from "./lease-consume.js";
import type { LeaseUseStore } from "./lease-consume-types.js";

const validInput = Object.freeze({
  profile: "M4-032_LEASE_CONSUME_V1",
  leaseRef: "lease:hardening",
});

function consumedStore(): LeaseUseStore {
  return {
    consumeOne(leaseRef) {
      return {
        status: "CONSUMED",
        stateBefore: { leaseRef, maxUses: 2, remainingUses: 2 },
        stateAfter: { leaseRef, maxUses: 2, remainingUses: 1 },
      };
    },
  };
}

describe("M4-032 hostile runtime and store boundary", () => {
  test("rejects accessor input without executing the getter or invoking the store", async () => {
    let getterCalls = 0;
    let storeCalls = 0;
    const input = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(input, "profile", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "M4-032_LEASE_CONSUME_V1";
      },
    });
    Object.defineProperty(input, "leaseRef", { enumerable: true, value: "lease:x" });

    const result = await consumeCapabilityLeaseUse(input, {
      consumeOne() {
        storeCalls += 1;
        return { status: "NOT_FOUND" };
      },
    });

    expect(result).toEqual({ status: "FAIL_CLOSED", stage: "INPUT", reasonCode: "LEASE_CONSUME_INPUT_INVALID" });
    expect(getterCalls).toBe(0);
    expect(storeCalls).toBe(0);
  });

  test("fails closed on revoked proxy input without store access", async () => {
    const { proxy, revoke } = Proxy.revocable(validInput, {});
    revoke();
    let storeCalls = 0;
    const result = await consumeCapabilityLeaseUse(proxy, {
      consumeOne() {
        storeCalls += 1;
        return { status: "NOT_FOUND" };
      },
    });
    expect(result).toEqual({ status: "FAIL_CLOSED", stage: "INPUT", reasonCode: "LEASE_CONSUME_INPUT_INVALID" });
    expect(storeCalls).toBe(0);
  });

  test("rejects inherited identity and unexpected symbol authority", async () => {
    const inherited = Object.create({ profile: "M4-032_LEASE_CONSUME_V1", leaseRef: "lease:x" });
    expect(await consumeCapabilityLeaseUse(inherited, consumedStore())).toEqual({
      status: "FAIL_CLOSED", stage: "INPUT", reasonCode: "LEASE_CONSUME_INPUT_INVALID",
    });

    const symbolInput: Record<PropertyKey, unknown> = { ...validInput };
    symbolInput[Symbol("authority")] = true;
    expect(await consumeCapabilityLeaseUse(symbolInput, consumedStore())).toEqual({
      status: "FAIL_CLOSED", stage: "INPUT", reasonCode: "LEASE_CONSUME_INPUT_INVALID",
    });
  });

  test("calls the store exactly once and never retries an exception", async () => {
    let calls = 0;
    const result = await consumeCapabilityLeaseUse(validInput, {
      consumeOne() {
        calls += 1;
        throw new Error("commit outcome cannot be determined");
      },
    });
    expect(calls).toBe(1);
    expect(result).toEqual({ status: "FAIL_CLOSED", stage: "STORE", reasonCode: "LEASE_CONSUME_OUTCOME_UNKNOWN" });
  });

  test("rejects fabricated store transitions and wrong lease identity", async () => {
    expect(await consumeCapabilityLeaseUse(validInput, {
      consumeOne() {
        return {
          status: "CONSUMED",
          stateBefore: { leaseRef: "lease:other", maxUses: 2, remainingUses: 2 },
          stateAfter: { leaseRef: "lease:other", maxUses: 2, remainingUses: 1 },
        };
      },
    })).toEqual({ status: "FAIL_CLOSED", stage: "STORE", reasonCode: "LEASE_CONSUME_STORE_RESULT_INVALID" });

    expect(await consumeCapabilityLeaseUse(validInput, {
      consumeOne(leaseRef) {
        return {
          status: "CONSUMED",
          stateBefore: { leaseRef, maxUses: 2, remainingUses: 2 },
          stateAfter: { leaseRef, maxUses: 2, remainingUses: 0 },
        };
      },
    })).toEqual({ status: "FAIL_CLOSED", stage: "STORE", reasonCode: "LEASE_CONSUME_STORE_RESULT_INVALID" });
  });

  test("returns detached frozen results and does not mutate request input", async () => {
    const input = { ...validInput };
    const result = await consumeCapabilityLeaseUse(input, consumedStore());
    expect(Object.isFrozen(result)).toBe(true);
    expect(result).toEqual({
      status: "CONSUMED",
      reasonCode: "LEASE_USE_CONSUMED",
      remainingUsesBefore: 2,
      remainingUsesAfter: 1,
    });
    expect(input).toEqual(validInput);
  });
});
