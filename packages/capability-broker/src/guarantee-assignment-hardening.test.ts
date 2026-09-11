import { describe, expect, test } from "vitest";

import { assignGuaranteeLevel } from "./guarantee-assignment.js";

function baseEvidence(): {
  isolation: unknown;
  provider: unknown;
  tool: unknown;
} {
  return {
    isolation: { state: "NONE" },
    provider: { state: "NONE" },
    tool: { state: "NONE" },
  };
}

function input(evidence: unknown): unknown {
  return {
    profile: "M4-025_GUARANTEE_ASSIGNMENT_V1",
    evidence,
  };
}

describe("M4-025 hostile-runtime hardening", () => {
  test("does not execute accessors while reading security facts", () => {
    let getterCalls = 0;
    const isolation = {};
    Object.defineProperty(isolation, "state", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "NONE";
      },
    });

    expect(assignGuaranteeLevel(input({
      ...baseEvidence(),
      isolation,
    }))).toEqual({
      status: "FAIL_CLOSED",
      stage: "ISOLATION",
      reasonCode: "GUARANTEE_ASSIGNMENT_ISOLATION_EVIDENCE_INVALID",
    });
    expect(getterCalls).toBe(0);
  });

  test("fails closed on revoked proxies", () => {
    const { proxy, revoke } = Proxy.revocable({ state: "NONE" }, {});
    revoke();

    expect(assignGuaranteeLevel(input({
      ...baseEvidence(),
      provider: proxy,
    }))).toEqual({
      status: "FAIL_CLOSED",
      stage: "PROVIDER",
      reasonCode: "GUARANTEE_ASSIGNMENT_PROVIDER_EVIDENCE_INVALID",
    });
  });

  test("fails closed on ownKeys traps without leaking trap errors", () => {
    const provider = new Proxy({ state: "NONE" }, {
      ownKeys() {
        throw new Error("secret trap detail");
      },
    });

    expect(assignGuaranteeLevel(input({
      ...baseEvidence(),
      provider,
    }))).toEqual({
      status: "FAIL_CLOSED",
      stage: "PROVIDER",
      reasonCode: "GUARANTEE_ASSIGNMENT_PROVIDER_EVIDENCE_INVALID",
    });
  });

  test("rejects unexpected symbol fields", () => {
    const marker = Symbol("hidden");
    const tool = {
      state: "ENFORCING",
      authorizationBinding: "EXACT_ACTION",
      dispatchControl: "MANDATORY",
      [marker]: true,
    };

    expect(assignGuaranteeLevel(input({
      ...baseEvidence(),
      tool,
    }))).toEqual({
      status: "FAIL_CLOSED",
      stage: "TOOL",
      reasonCode: "GUARANTEE_ASSIGNMENT_TOOL_EVIDENCE_INVALID",
    });
  });

  test("does not invoke string coercion hooks", () => {
    let coercions = 0;
    const hostile = {
      [Symbol.toPrimitive]() {
        coercions += 1;
        return "ENFORCING";
      },
      toString() {
        coercions += 1;
        return "ENFORCING";
      },
    };

    expect(assignGuaranteeLevel(input({
      ...baseEvidence(),
      tool: { state: hostile },
    }))).toEqual({
      status: "FAIL_CLOSED",
      stage: "TOOL",
      reasonCode: "GUARANTEE_ASSIGNMENT_TOOL_EVIDENCE_INVALID",
    });
    expect(coercions).toBe(0);
  });

  test("qualifying process isolation does not traverse provider or tool records", () => {
    let providerTouched = 0;
    let toolTouched = 0;
    const provider = new Proxy({ state: "NONE" }, {
      ownKeys() {
        providerTouched += 1;
        throw new Error("provider must not be inspected");
      },
    });
    const tool = new Proxy({ state: "NONE" }, {
      ownKeys() {
        toolTouched += 1;
        throw new Error("tool must not be inspected");
      },
    });

    expect(assignGuaranteeLevel(input({
      isolation: {
        state: "ENFORCING",
        boundary: "MICROVM",
        authorizationBinding: "EXACT_CAPABILITY_RESOURCE",
        coverage: "COMPLETE",
        directHostBypass: "BLOCKED",
        deploymentEvidence: "VERIFIED",
      },
      provider,
      tool,
    }))).toEqual({
      status: "ASSIGNED",
      guaranteeLevel: "process-isolated",
      reasonCode: "GUARANTEE_ASSIGNED_PROCESS_ISOLATED",
    });
    expect(providerTouched).toBe(0);
    expect(toolTouched).toBe(0);
  });

  test("qualifying provider enforcement does not traverse the tool record", () => {
    let toolTouched = 0;
    const tool = new Proxy({ state: "NONE" }, {
      ownKeys() {
        toolTouched += 1;
        throw new Error("tool must not be inspected");
      },
    });

    expect(assignGuaranteeLevel(input({
      isolation: { state: "NONE" },
      provider: {
        state: "ENFORCING",
        authorizationBinding: "EXACT_CAPABILITY_RESOURCE",
        traversal: "MANDATORY",
        coverage: "COMPLETE",
        resourceIdentity: "PROVIDER_CANONICAL",
        deploymentEvidence: "VERIFIED",
      },
      tool,
    }))).toEqual({
      status: "ASSIGNED",
      guaranteeLevel: "provider-enforced",
      reasonCode: "GUARANTEE_ASSIGNED_PROVIDER_ENFORCED",
    });
    expect(toolTouched).toBe(0);
  });

  test("malformed stronger evidence never falls through to a weaker qualifying boundary", () => {
    expect(assignGuaranteeLevel(input({
      isolation: {
        state: "ENFORCING",
        boundary: "CONTAINER",
        authorizationBinding: "EXACT_CAPABILITY_RESOURCE",
        coverage: "COMPLETE",
        deploymentEvidence: "VERIFIED",
      },
      provider: {
        state: "ENFORCING",
        authorizationBinding: "EXACT_CAPABILITY_RESOURCE",
        traversal: "MANDATORY",
        coverage: "COMPLETE",
        resourceIdentity: "PROVIDER_CANONICAL",
        deploymentEvidence: "VERIFIED",
      },
      tool: {
        state: "ENFORCING",
        authorizationBinding: "EXACT_ACTION",
        dispatchControl: "MANDATORY",
      },
    }))).toEqual({
      status: "FAIL_CLOSED",
      stage: "ISOLATION",
      reasonCode: "GUARANTEE_ASSIGNMENT_ISOLATION_EVIDENCE_INVALID",
    });
  });

  test("inherited evidence values are not treated as authority", () => {
    const tool = Object.create({ state: "ENFORCING" }) as Record<string, unknown>;
    tool.authorizationBinding = "EXACT_ACTION";
    tool.dispatchControl = "MANDATORY";

    expect(assignGuaranteeLevel(input({
      ...baseEvidence(),
      tool,
    }))).toEqual({
      status: "FAIL_CLOSED",
      stage: "TOOL",
      reasonCode: "GUARANTEE_ASSIGNMENT_TOOL_EVIDENCE_INVALID",
    });
  });

  test("successful and failure results are detached and frozen", () => {
    const success = assignGuaranteeLevel(input(baseEvidence()));
    const failure = assignGuaranteeLevel(input({
      ...baseEvidence(),
      tool: { state: "FUTURE" },
    }));

    expect(Object.isFrozen(success)).toBe(true);
    expect(Object.isFrozen(failure)).toBe(true);
    expect(success).toEqual({
      status: "ASSIGNED",
      guaranteeLevel: "advisory",
      reasonCode: "GUARANTEE_ASSIGNED_ADVISORY",
    });
    expect(failure).toEqual({
      status: "FAIL_CLOSED",
      stage: "TOOL",
      reasonCode: "GUARANTEE_ASSIGNMENT_TOOL_EVIDENCE_INVALID",
    });
  });
});
