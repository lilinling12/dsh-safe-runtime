import { describe, expect, test } from "vitest";

import { constructCapabilityDecisionReceipt } from "./decision-receipt.js";

function validInput(): Record<string, unknown> {
  return {
    routing: {
      status: "ROUTED",
      effect: "allow",
      routeSource: "POLICY",
      reasonCode: "APPROVAL_NOT_REQUIRED_POLICY_ALLOW",
    },
    issuance: {
      requestRef: "capreq:hardening",
      decisionRef: "capdec:hardening",
      receiptRef: "receipt:hardening",
      guaranteeLevel: "advisory",
      decidedAt: "2026-08-31T10:00:00Z",
      observedAt: "2026-08-31T10:00:01Z",
    },
  };
}

function revoke<T extends object>(value: T): T {
  const pair = Proxy.revocable(value, {});
  pair.revoke();
  return pair.proxy;
}

describe("M4-024 hostile runtime boundary", () => {
  test("outer routing accessor is rejected without executing", () => {
    let calls = 0;
    const input = validInput();
    Object.defineProperty(input, "routing", {
      enumerable: true,
      configurable: true,
      get() { calls += 1; return {}; },
    });

    expect(constructCapabilityDecisionReceipt(input)).toEqual({
      status: "FAIL_CLOSED",
      stage: "ROUTING",
      reasonCode: "DECISION_RECEIPT_ROUTING_INVALID",
    });
    expect(calls).toBe(0);
  });

  test("routing discriminant accessor is rejected without executing", () => {
    let calls = 0;
    const input = validInput();
    const routing = (input["routing"] as Record<string, unknown>);
    Object.defineProperty(routing, "status", {
      enumerable: true,
      configurable: true,
      get() { calls += 1; return "ROUTED"; },
    });

    expect(constructCapabilityDecisionReceipt(input)).toMatchObject({
      status: "FAIL_CLOSED",
      stage: "ROUTING",
    });
    expect(calls).toBe(0);
  });

  test("issuance is not inspected until routing is coherent", () => {
    let calls = 0;
    const input = validInput();
    input["routing"] = {
      status: "ROUTED",
      effect: "ask",
      routeSource: "POLICY",
      reasonCode: "HUMAN_APPROVAL_REQUIRED",
    };
    Object.defineProperty(input, "issuance", {
      enumerable: true,
      configurable: true,
      get() { calls += 1; throw new Error("must not execute"); },
    });

    expect(constructCapabilityDecisionReceipt(input)).toEqual({
      status: "FAIL_CLOSED",
      stage: "ROUTING",
      reasonCode: "DECISION_RECEIPT_ROUTING_INVALID",
    });
    expect(calls).toBe(0);
  });

  test("issuance accessors fail at the owning field without executing", () => {
    const cases = [
      ["requestRef", "DECISION_RECEIPT_REQUEST_REF_INVALID"],
      ["decisionRef", "DECISION_RECEIPT_DECISION_REF_INVALID"],
      ["receiptRef", "DECISION_RECEIPT_RECEIPT_REF_INVALID"],
      ["guaranteeLevel", "DECISION_RECEIPT_GUARANTEE_INVALID"],
      ["decidedAt", "DECISION_RECEIPT_DECIDED_AT_INVALID"],
      ["observedAt", "DECISION_RECEIPT_OBSERVED_AT_INVALID"],
    ] as const;

    for (const [field, reasonCode] of cases) {
      let calls = 0;
      const input = validInput();
      const issuance = input["issuance"] as Record<string, unknown>;
      Object.defineProperty(issuance, field, {
        enumerable: true,
        configurable: true,
        get() { calls += 1; return "attacker"; },
      });
      expect(constructCapabilityDecisionReceipt(input)).toEqual({
        status: "FAIL_CLOSED",
        stage: "ISSUANCE",
        reasonCode,
      });
      expect(calls).toBe(0);
    }
  });

  test("revoked outer, routing and issuance proxies fail closed", () => {
    expect(constructCapabilityDecisionReceipt(revoke(validInput()))).toEqual({
      status: "FAIL_CLOSED",
      stage: "INPUT",
      reasonCode: "DECISION_RECEIPT_INPUT_INVALID",
    });

    const routingInput = validInput();
    routingInput["routing"] = revoke(routingInput["routing"] as object);
    expect(constructCapabilityDecisionReceipt(routingInput)).toMatchObject({
      status: "FAIL_CLOSED",
      stage: "ROUTING",
    });

    const issuanceInput = validInput();
    issuanceInput["issuance"] = revoke(issuanceInput["issuance"] as object);
    expect(constructCapabilityDecisionReceipt(issuanceInput)).toEqual({
      status: "FAIL_CLOSED",
      stage: "ISSUANCE",
      reasonCode: "DECISION_RECEIPT_ISSUANCE_INVALID",
    });
  });

  test("unexpected string and symbol fields fail closed", () => {
    const outer = validInput();
    outer["hidden"] = "authority";
    expect(constructCapabilityDecisionReceipt(outer)).toMatchObject({
      status: "FAIL_CLOSED",
      stage: "INPUT",
    });

    const issuanceInput = validInput();
    (issuanceInput["issuance"] as Record<PropertyKey, unknown>)[Symbol("hidden")] = "authority";
    expect(constructCapabilityDecisionReceipt(issuanceInput)).toEqual({
      status: "FAIL_CLOSED",
      stage: "ISSUANCE",
      reasonCode: "DECISION_RECEIPT_ISSUANCE_INVALID",
    });
  });

  test("inherited-only issuance identity cannot become authority", () => {
    const input = validInput();
    const ownIssuance = input["issuance"] as Record<string, unknown>;
    const inherited = Object.create({ requestRef: ownIssuance["requestRef"] }) as Record<string, unknown>;
    for (const [key, value] of Object.entries(ownIssuance)) {
      if (key !== "requestRef") inherited[key] = value;
    }
    input["issuance"] = inherited;

    expect(constructCapabilityDecisionReceipt(input)).toEqual({
      status: "FAIL_CLOSED",
      stage: "ISSUANCE",
      reasonCode: "DECISION_RECEIPT_ISSUANCE_INVALID",
    });
  });

  test("security-relevant scalars are never coerced", () => {
    let coercions = 0;
    const attacker = {
      [Symbol.toPrimitive]() { coercions += 1; return "allow"; },
      toString() { coercions += 1; return "allow"; },
    };

    const routingInput = validInput();
    (routingInput["routing"] as Record<string, unknown>)["effect"] = attacker;
    expect(constructCapabilityDecisionReceipt(routingInput)).toMatchObject({
      status: "FAIL_CLOSED",
      stage: "ROUTING",
    });

    const issuanceInput = validInput();
    (issuanceInput["issuance"] as Record<string, unknown>)["guaranteeLevel"] = attacker;
    expect(constructCapabilityDecisionReceipt(issuanceInput)).toEqual({
      status: "FAIL_CLOSED",
      stage: "ISSUANCE",
      reasonCode: "DECISION_RECEIPT_GUARANTEE_INVALID",
    });
    expect(coercions).toBe(0);
  });

  test("constructed result and nested records are detached and frozen", () => {
    const input = validInput();
    const result = constructCapabilityDecisionReceipt(input);
    expect(result.status).toBe("CONSTRUCTED");
    if (result.status !== "CONSTRUCTED") return;

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.decision)).toBe(true);
    expect(Object.isFrozen(result.receipt)).toBe(true);
    expect(result.decision).not.toBe(input["routing"]);
    expect(result.receipt).not.toBe(input["issuance"]);

    (input["issuance"] as Record<string, unknown>)["requestRef"] = "mutated";
    expect(result.decision.requestId).toBe("capreq:hardening");
    expect(result.receipt.requestRef).toBe("capreq:hardening");
  });

  test("failures expose only stable stage/reason data", () => {
    const input = validInput();
    (input["issuance"] as Record<string, unknown>)["decisionRef"] = "SECRET-DECISION".repeat(100);
    const result = constructCapabilityDecisionReceipt(input);
    expect(result).toEqual({
      status: "FAIL_CLOSED",
      stage: "ISSUANCE",
      reasonCode: "DECISION_RECEIPT_DECISION_REF_INVALID",
    });
    expect(JSON.stringify(result)).not.toContain("SECRET-DECISION");
  });
});
