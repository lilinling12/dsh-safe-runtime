import { describe, expect, test } from "vitest";

import { evaluateCapabilityLeaseTtl } from "./lease-ttl.js";

function validInput(): Record<string, unknown> {
  return {
    profile: "M4-030_LEASE_TTL_V1",
    issuedAt: "2026-09-02T00:00:00Z",
    expiresAt: "2026-09-02T00:10:00Z",
    observedAt: "2026-09-02T00:05:00Z",
  };
}

function revoke<T extends object>(value: T): T {
  const pair = Proxy.revocable(value, {});
  pair.revoke();
  return pair.proxy;
}

describe("M4-030 hostile runtime boundary", () => {
  test("timestamp accessors are rejected without executing", () => {
    let calls = 0;
    const input = validInput();
    Object.defineProperty(input, "issuedAt", {
      enumerable: true,
      configurable: true,
      get() {
        calls += 1;
        return "2026-09-02T00:00:00Z";
      },
    });

    expect(evaluateCapabilityLeaseTtl(input)).toEqual({
      status: "FAIL_CLOSED",
      stage: "TIME",
      reasonCode: "LEASE_TTL_ISSUED_AT_INVALID",
    });
    expect(calls).toBe(0);
  });

  test("revoked outer proxies fail closed", () => {
    expect(evaluateCapabilityLeaseTtl(revoke(validInput()))).toEqual({
      status: "FAIL_CLOSED",
      stage: "INPUT",
      reasonCode: "LEASE_TTL_INPUT_INVALID",
    });
  });

  test("ownKeys traps fail closed without leaking trap details", () => {
    const input = new Proxy(validInput(), {
      ownKeys() {
        throw new Error("secret trap detail");
      },
    });

    expect(evaluateCapabilityLeaseTtl(input)).toEqual({
      status: "FAIL_CLOSED",
      stage: "INPUT",
      reasonCode: "LEASE_TTL_INPUT_INVALID",
    });
  });

  test("unexpected string and symbol fields fail closed", () => {
    const extra = validInput();
    extra["remainingUses"] = 1;
    expect(evaluateCapabilityLeaseTtl(extra)).toEqual({
      status: "FAIL_CLOSED",
      stage: "INPUT",
      reasonCode: "LEASE_TTL_INPUT_INVALID",
    });

    const symbolInput = validInput() as Record<PropertyKey, unknown>;
    symbolInput[Symbol("hidden-authority")] = true;
    expect(evaluateCapabilityLeaseTtl(symbolInput)).toEqual({
      status: "FAIL_CLOSED",
      stage: "INPUT",
      reasonCode: "LEASE_TTL_INPUT_INVALID",
    });
  });

  test("inherited required fields cannot become authority", () => {
    const input = Object.create({ profile: "M4-030_LEASE_TTL_V1" }) as Record<string, unknown>;
    input["issuedAt"] = "2026-09-02T00:00:00Z";
    input["expiresAt"] = "2026-09-02T00:10:00Z";
    input["observedAt"] = "2026-09-02T00:05:00Z";

    expect(evaluateCapabilityLeaseTtl(input)).toEqual({
      status: "FAIL_CLOSED",
      stage: "INPUT",
      reasonCode: "LEASE_TTL_INPUT_INVALID",
    });
  });

  test("timestamp values are never string-coerced", () => {
    let coercions = 0;
    const attacker = {
      [Symbol.toPrimitive]() {
        coercions += 1;
        return "2026-09-02T00:00:00Z";
      },
      toString() {
        coercions += 1;
        return "2026-09-02T00:00:00Z";
      },
    };
    const input = validInput();
    input["issuedAt"] = attacker;

    expect(evaluateCapabilityLeaseTtl(input)).toEqual({
      status: "FAIL_CLOSED",
      stage: "TIME",
      reasonCode: "LEASE_TTL_ISSUED_AT_INVALID",
    });
    expect(coercions).toBe(0);
  });

  test("validation order does not traverse later timestamp accessors", () => {
    let laterCalls = 0;
    const input = validInput();
    input["issuedAt"] = "invalid";
    Object.defineProperty(input, "expiresAt", {
      enumerable: true,
      configurable: true,
      get() {
        laterCalls += 1;
        throw new Error("must not execute");
      },
    });

    expect(evaluateCapabilityLeaseTtl(input)).toEqual({
      status: "FAIL_CLOSED",
      stage: "TIME",
      reasonCode: "LEASE_TTL_ISSUED_AT_INVALID",
    });
    expect(laterCalls).toBe(0);
  });

  test("profile rejection short-circuits timestamp accessors", () => {
    let calls = 0;
    const input = validInput();
    input["profile"] = "M4-030_LEASE_TTL_FUTURE";
    Object.defineProperty(input, "issuedAt", {
      enumerable: true,
      configurable: true,
      get() {
        calls += 1;
        throw new Error("must not execute");
      },
    });

    expect(evaluateCapabilityLeaseTtl(input)).toEqual({
      status: "FAIL_CLOSED",
      stage: "INPUT",
      reasonCode: "LEASE_TTL_PROFILE_INVALID",
    });
    expect(calls).toBe(0);
  });

  test("success and failure results are detached and frozen", () => {
    const input = validInput();
    const success = evaluateCapabilityLeaseTtl(input);
    const failureInput = validInput();
    failureInput["expiresAt"] = "invalid";
    const failure = evaluateCapabilityLeaseTtl(failureInput);

    expect(Object.isFrozen(success)).toBe(true);
    expect(Object.isFrozen(failure)).toBe(true);
    expect(success).toEqual({ status: "TIME_ELIGIBLE", reasonCode: "LEASE_TTL_ACTIVE" });
    expect(failure).toEqual({
      status: "FAIL_CLOSED",
      stage: "TIME",
      reasonCode: "LEASE_TTL_EXPIRES_AT_INVALID",
    });

    input["observedAt"] = "2099-01-01T00:00:00Z";
    expect(success).toEqual({ status: "TIME_ELIGIBLE", reasonCode: "LEASE_TTL_ACTIVE" });
  });

  test("failure payload never reflects attacker-controlled timestamp text", () => {
    const input = validInput();
    input["observedAt"] = "SECRET-TIMESTAMP".repeat(100);
    const result = evaluateCapabilityLeaseTtl(input);

    expect(result).toEqual({
      status: "FAIL_CLOSED",
      stage: "TIME",
      reasonCode: "LEASE_TTL_OBSERVED_AT_INVALID",
    });
    expect(JSON.stringify(result)).not.toContain("SECRET-TIMESTAMP");
  });
});
