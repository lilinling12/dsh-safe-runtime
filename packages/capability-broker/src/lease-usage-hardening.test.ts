import { describe, expect, test } from "vitest";

import { evaluateCapabilityLeaseUsage } from "./lease-usage.js";

function validInput(): Record<string, unknown> {
  return {
    profile: "M4-031_LEASE_USAGE_V1",
    maxUses: 5,
    remainingUses: 3,
  };
}

function revoke<T extends object>(value: T): T {
  const pair = Proxy.revocable(value, {});
  pair.revoke();
  return pair.proxy;
}

describe("M4-031 hostile runtime boundary", () => {
  test("counter accessors are rejected without executing", () => {
    let calls = 0;
    const input = validInput();
    Object.defineProperty(input, "maxUses", {
      enumerable: true,
      configurable: true,
      get() {
        calls += 1;
        return 5;
      },
    });

    expect(evaluateCapabilityLeaseUsage(input)).toEqual({
      status: "FAIL_CLOSED",
      stage: "USAGE",
      reasonCode: "LEASE_USAGE_MAX_USES_INVALID",
    });
    expect(calls).toBe(0);
  });

  test("revoked outer proxies fail closed", () => {
    expect(evaluateCapabilityLeaseUsage(revoke(validInput()))).toEqual({
      status: "FAIL_CLOSED",
      stage: "INPUT",
      reasonCode: "LEASE_USAGE_INPUT_INVALID",
    });
  });

  test("ownKeys traps fail closed without leaking trap details", () => {
    const input = new Proxy(validInput(), {
      ownKeys() {
        throw new Error("secret trap detail");
      },
    });

    expect(evaluateCapabilityLeaseUsage(input)).toEqual({
      status: "FAIL_CLOSED",
      stage: "INPUT",
      reasonCode: "LEASE_USAGE_INPUT_INVALID",
    });
  });

  test("descriptor traps fail closed at the owning field", () => {
    const input = new Proxy(validInput(), {
      getOwnPropertyDescriptor(target, property) {
        if (property === "remainingUses") throw new Error("secret descriptor detail");
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });

    expect(evaluateCapabilityLeaseUsage(input)).toEqual({
      status: "FAIL_CLOSED",
      stage: "USAGE",
      reasonCode: "LEASE_USAGE_REMAINING_USES_INVALID",
    });
  });

  test("unexpected string and symbol fields fail closed", () => {
    const extra = validInput();
    extra["expiresAt"] = "2026-09-02T00:00:00Z";
    expect(evaluateCapabilityLeaseUsage(extra)).toEqual({
      status: "FAIL_CLOSED",
      stage: "INPUT",
      reasonCode: "LEASE_USAGE_INPUT_INVALID",
    });

    const symbolInput = validInput() as Record<PropertyKey, unknown>;
    symbolInput[Symbol("hidden-authority")] = true;
    expect(evaluateCapabilityLeaseUsage(symbolInput)).toEqual({
      status: "FAIL_CLOSED",
      stage: "INPUT",
      reasonCode: "LEASE_USAGE_INPUT_INVALID",
    });
  });

  test("inherited required fields cannot become authority", () => {
    const input = Object.create({ profile: "M4-031_LEASE_USAGE_V1" }) as Record<string, unknown>;
    input["maxUses"] = 5;
    input["remainingUses"] = 3;

    expect(evaluateCapabilityLeaseUsage(input)).toEqual({
      status: "FAIL_CLOSED",
      stage: "INPUT",
      reasonCode: "LEASE_USAGE_INPUT_INVALID",
    });
  });

  test("counter values are never number-coerced", () => {
    let coercions = 0;
    const attacker = {
      [Symbol.toPrimitive]() {
        coercions += 1;
        return 5;
      },
      valueOf() {
        coercions += 1;
        return 5;
      },
    };
    const input = validInput();
    input["maxUses"] = attacker;

    expect(evaluateCapabilityLeaseUsage(input)).toEqual({
      status: "FAIL_CLOSED",
      stage: "USAGE",
      reasonCode: "LEASE_USAGE_MAX_USES_INVALID",
    });
    expect(coercions).toBe(0);
  });

  test("validation order does not traverse later counter accessors", () => {
    let laterCalls = 0;
    const input = validInput();
    input["maxUses"] = "invalid";
    Object.defineProperty(input, "remainingUses", {
      enumerable: true,
      configurable: true,
      get() {
        laterCalls += 1;
        throw new Error("must not execute");
      },
    });

    expect(evaluateCapabilityLeaseUsage(input)).toEqual({
      status: "FAIL_CLOSED",
      stage: "USAGE",
      reasonCode: "LEASE_USAGE_MAX_USES_INVALID",
    });
    expect(laterCalls).toBe(0);
  });

  test("profile rejection short-circuits counter accessors", () => {
    let calls = 0;
    const input = validInput();
    input["profile"] = "M4-031_LEASE_USAGE_FUTURE";
    Object.defineProperty(input, "maxUses", {
      enumerable: true,
      configurable: true,
      get() {
        calls += 1;
        throw new Error("must not execute");
      },
    });

    expect(evaluateCapabilityLeaseUsage(input)).toEqual({
      status: "FAIL_CLOSED",
      stage: "INPUT",
      reasonCode: "LEASE_USAGE_PROFILE_INVALID",
    });
    expect(calls).toBe(0);
  });

  test("success and failure results are detached and frozen", () => {
    const input = validInput();
    const success = evaluateCapabilityLeaseUsage(input);
    const failureInput = validInput();
    failureInput["remainingUses"] = 6;
    const failure = evaluateCapabilityLeaseUsage(failureInput);

    expect(Object.isFrozen(success)).toBe(true);
    expect(Object.isFrozen(failure)).toBe(true);
    expect(success).toEqual({ status: "USAGE_ELIGIBLE", reasonCode: "LEASE_USAGE_AVAILABLE" });
    expect(failure).toEqual({
      status: "FAIL_CLOSED",
      stage: "USAGE",
      reasonCode: "LEASE_USAGE_STATE_INVALID",
    });

    input["remainingUses"] = 0;
    expect(success).toEqual({ status: "USAGE_ELIGIBLE", reasonCode: "LEASE_USAGE_AVAILABLE" });
  });

  test("failure payload never reflects attacker-controlled values or errors", () => {
    const input = validInput();
    input["remainingUses"] = "SECRET-COUNTER";
    const result = evaluateCapabilityLeaseUsage(input);

    expect(result).toEqual({
      status: "FAIL_CLOSED",
      stage: "USAGE",
      reasonCode: "LEASE_USAGE_REMAINING_USES_INVALID",
    });
    expect(JSON.stringify(result)).not.toContain("SECRET-COUNTER");
  });
});
