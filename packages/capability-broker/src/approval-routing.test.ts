import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test, vi } from "vitest";

import { routeCapabilityApproval } from "./approval-routing.js";
import type { ApprovalInvocationPort } from "./approval-routing-types.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/approval-routing/cases.json");

interface FixtureCase {
  readonly id: string;
  readonly description: string;
  readonly input: unknown;
  readonly approvalBehavior: unknown;
  readonly expected: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fixtureCases(): readonly FixtureCase[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || parsed["profile"] !== "M4-023_APPROVAL_ROUTING_V1" || !Array.isArray(parsed["cases"])) {
    throw new Error("approval-routing fixture must contain the reviewed profile and cases array");
  }

  const seen = new Set<string>();
  return parsed["cases"].map(raw => {
    if (
      !isRecord(raw)
      || typeof raw["id"] !== "string"
      || typeof raw["description"] !== "string"
      || !Object.hasOwn(raw, "input")
      || !Object.hasOwn(raw, "approvalBehavior")
      || !Object.hasOwn(raw, "expected")
    ) {
      throw new Error("malformed approval-routing portable fixture");
    }
    if (seen.has(raw["id"])) throw new Error(`duplicate approval-routing fixture id: ${raw["id"]}`);
    seen.add(raw["id"]);
    return {
      id: raw["id"],
      description: raw["description"],
      input: raw["input"],
      approvalBehavior: raw["approvalBehavior"],
      expected: raw["expected"],
    };
  });
}

function fixturePort(behavior: unknown, observed: unknown[]): ApprovalInvocationPort {
  return {
    async request(request) {
      observed.push(request);
      if (!isRecord(behavior) || typeof behavior["type"] !== "string") {
        throw new Error("malformed fixture approval behavior");
      }
      if (behavior["type"] === "MUST_NOT_CALL") {
        throw new Error("approval provider must not be called");
      }
      if (behavior["type"] === "ERROR") {
        throw new Error(typeof behavior["error"] === "string" ? behavior["error"] : "fixture error");
      }
      if (behavior["type"] !== "RETURN") {
        throw new Error("unsupported fixture approval behavior");
      }
      return behavior["outcome"];
    },
  };
}

const cases = fixtureCases();

describe("M4-023 portable approval-routing corpus", () => {
  test("fixture corpus has the reviewed breadth", () => {
    expect(cases).toHaveLength(25);
  });

  for (const fixture of cases) {
    test(`${fixture.id}: ${fixture.description}`, async () => {
      if (!isRecord(fixture.expected) || !Object.hasOwn(fixture.expected, "result") || !Array.isArray(fixture.expected["approvalCalls"])) {
        throw new Error(`malformed expected result for ${fixture.id}`);
      }
      const observed: unknown[] = [];
      const result = await routeCapabilityApproval(
        fixture.input,
        fixturePort(fixture.approvalBehavior, observed),
      );
      expect(result).toEqual(fixture.expected["result"]);
      expect(observed).toEqual(fixture.expected["approvalCalls"]);
    });
  }
});

function askPolicy(): Record<string, unknown> {
  return {
    status: "EVALUATED",
    effect: "ask",
    basis: "HIGHEST_BAND_ASK",
    reasonCode: "POLICY_HIGHEST_BAND_ASK",
    fullyApplicableRuleIds: ["rule-ask"],
    contributingRuleIds: ["rule-ask"],
  };
}

function allowPolicy(): Record<string, unknown> {
  return {
    status: "EVALUATED",
    effect: "allow",
    basis: "HIGHEST_BAND_ALLOW",
    reasonCode: "POLICY_HIGHEST_BAND_ALLOW",
    fullyApplicableRuleIds: ["rule-allow"],
    contributingRuleIds: ["rule-allow"],
  };
}

function noCandidate(): Record<string, unknown> {
  return { status: "NO_CANDIDATE", candidateLeaseRefs: [] };
}

function request(): Record<string, unknown> {
  return { requestRef: "capreq-1", actionRef: "action-1", reason: "Need approval" };
}

function input(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    policyEvaluation: askPolicy(),
    leaseLookup: noCandidate(),
    approvalRequest: request(),
    ...overrides,
  };
}

const allowOncePort: ApprovalInvocationPort = {
  request: () => "ALLOWED_ONCE",
};

describe("M4-023 hostile runtime boundary", () => {
  test("top-level policy accessor is rejected without executing", async () => {
    let getterCalls = 0;
    const candidate = input();
    Object.defineProperty(candidate, "policyEvaluation", {
      enumerable: true,
      configurable: true,
      get() { getterCalls += 1; return askPolicy(); },
    });
    await expect(routeCapabilityApproval(candidate, allowOncePort)).resolves.toEqual({
      status: "FAIL_CLOSED",
      effect: "deny",
      stage: "POLICY",
      reasonCode: "APPROVAL_ROUTING_POLICY_RESULT_INVALID",
    });
    expect(getterCalls).toBe(0);
  });

  test("policy allow does not inspect hostile Lease or approval request values", async () => {
    let leaseGetterCalls = 0;
    let requestGetterCalls = 0;
    const candidate = input({ policyEvaluation: allowPolicy() });
    Object.defineProperty(candidate, "leaseLookup", {
      enumerable: true,
      configurable: true,
      get() { leaseGetterCalls += 1; throw new Error("must not execute"); },
    });
    Object.defineProperty(candidate, "approvalRequest", {
      enumerable: true,
      configurable: true,
      get() { requestGetterCalls += 1; throw new Error("must not execute"); },
    });
    const provider = { request: vi.fn(() => "ALLOWED_ONCE") } satisfies ApprovalInvocationPort;
    await expect(routeCapabilityApproval(candidate, provider)).resolves.toMatchObject({
      status: "ROUTED",
      effect: "allow",
      routeSource: "POLICY",
    });
    expect(leaseGetterCalls).toBe(0);
    expect(requestGetterCalls).toBe(0);
    expect(provider.request).not.toHaveBeenCalled();
  });

  test("Lease failure does not inspect approval request", async () => {
    let requestGetterCalls = 0;
    const candidate = input({
      leaseLookup: {
        status: "FAIL_CLOSED",
        stage: "LEASE_SNAPSHOT",
        reasonCode: "LEASE_LOOKUP_DUPLICATE_LEASE_REF",
      },
    });
    Object.defineProperty(candidate, "approvalRequest", {
      enumerable: true,
      configurable: true,
      get() { requestGetterCalls += 1; throw new Error("must not execute"); },
    });
    const provider = { request: vi.fn(() => "ALLOWED_ONCE") } satisfies ApprovalInvocationPort;
    await expect(routeCapabilityApproval(candidate, provider)).resolves.toEqual({
      status: "FAIL_CLOSED",
      effect: "deny",
      stage: "LEASE_LOOKUP",
      reasonCode: "LEASE_LOOKUP_DUPLICATE_LEASE_REF",
    });
    expect(requestGetterCalls).toBe(0);
    expect(provider.request).not.toHaveBeenCalled();
  });

  test("policy rule-id payloads are not traversed", async () => {
    let getterCalls = 0;
    const policy = askPolicy();
    const hostileRuleIds = new Proxy([], {
      ownKeys() { getterCalls += 1; throw new Error("must not enumerate"); },
      get() { getterCalls += 1; throw new Error("must not read"); },
    });
    policy["fullyApplicableRuleIds"] = hostileRuleIds;
    policy["contributingRuleIds"] = hostileRuleIds;
    await expect(routeCapabilityApproval(input({ policyEvaluation: policy }), allowOncePort)).resolves.toMatchObject({
      status: "ROUTED",
      effect: "allow",
      routeSource: "APPROVAL",
    });
    expect(getterCalls).toBe(0);
  });

  test("candidate refs are not traversed", async () => {
    let getterCalls = 0;
    const hostileRefs = new Proxy([], {
      ownKeys() { getterCalls += 1; throw new Error("must not enumerate"); },
      get() { getterCalls += 1; throw new Error("must not read"); },
    });
    await expect(routeCapabilityApproval(input({
      leaseLookup: { status: "CANDIDATES_FOUND", candidateLeaseRefs: hostileRefs },
    }), allowOncePort)).resolves.toMatchObject({
      status: "ROUTED",
      effect: "allow",
      routeSource: "APPROVAL",
    });
    expect(getterCalls).toBe(0);
  });

  test("approval request accessor is rejected without executing", async () => {
    let getterCalls = 0;
    const approvalRequest = request();
    Object.defineProperty(approvalRequest, "actionRef", {
      enumerable: true,
      configurable: true,
      get() { getterCalls += 1; return "action-1"; },
    });
    const provider = { request: vi.fn(() => "ALLOWED_ONCE") } satisfies ApprovalInvocationPort;
    await expect(routeCapabilityApproval(input({ approvalRequest }), provider)).resolves.toMatchObject({
      status: "FAIL_CLOSED",
      stage: "APPROVAL_REQUEST",
    });
    expect(getterCalls).toBe(0);
    expect(provider.request).not.toHaveBeenCalled();
  });

  test("revoked policy, Lease and approval request proxies fail closed", async () => {
    const revokedValues = [askPolicy(), noCandidate(), request()].map(value => {
      const pair = Proxy.revocable(value, {});
      pair.revoke();
      return pair.proxy;
    });
    const inputs = [
      input({ policyEvaluation: revokedValues[0] }),
      input({ leaseLookup: revokedValues[1] }),
      input({ approvalRequest: revokedValues[2] }),
    ];
    for (const candidate of inputs) {
      await expect(routeCapabilityApproval(candidate, allowOncePort)).resolves.toMatchObject({
        status: "FAIL_CLOSED",
        effect: "deny",
      });
    }
  });

  test("unexpected and symbol approval-request fields fail closed", async () => {
    const extra = request();
    extra["capability"] = "process.exec";
    await expect(routeCapabilityApproval(input({ approvalRequest: extra }), allowOncePort)).resolves.toMatchObject({
      status: "FAIL_CLOSED",
      stage: "APPROVAL_REQUEST",
    });

    const symbol = request();
    Object.defineProperty(symbol, Symbol("hidden"), { value: "secret", enumerable: true });
    await expect(routeCapabilityApproval(input({ approvalRequest: symbol }), allowOncePort)).resolves.toMatchObject({
      status: "FAIL_CLOSED",
      stage: "APPROVAL_REQUEST",
    });
  });

  test("provider synchronous throw and asynchronous rejection are sanitized", async () => {
    for (const provider of [
      { request: () => { throw new Error("secret-sync"); } },
      { request: async () => { throw new Error("secret-async"); } },
    ] satisfies ApprovalInvocationPort[]) {
      const result = await routeCapabilityApproval(input(), provider);
      expect(result).toEqual({
        status: "FAIL_CLOSED",
        effect: "deny",
        stage: "APPROVAL_SERVICE",
        reasonCode: "APPROVAL_ROUTING_SERVICE_ERROR",
      });
      expect(JSON.stringify(result)).not.toContain("secret");
    }
  });

  test("malformed provider outcomes never become allow", async () => {
    for (const outcome of [true, 1, "allowed", "ALLOWED_ALWAYS", {}, null]) {
      await expect(routeCapabilityApproval(input(), { request: () => outcome })).resolves.toEqual({
        status: "FAIL_CLOSED",
        effect: "deny",
        stage: "APPROVAL_SERVICE",
        reasonCode: "APPROVAL_ROUTING_OUTCOME_INVALID",
      });
    }
  });

  test("approval is invoked exactly once with a frozen detached minimal request", async () => {
    const original = request();
    let received: Readonly<Record<string, unknown>> | undefined;
    const provider: ApprovalInvocationPort = {
      request(value) {
        received = value;
        return "ALLOWED_ONCE";
      },
    };
    const result = await routeCapabilityApproval(input({ approvalRequest: original }), provider);
    expect(result).toMatchObject({ status: "ROUTED", effect: "allow", routeSource: "APPROVAL" });
    expect(received).toEqual(original);
    expect(received).not.toBe(original);
    expect(Object.isFrozen(received)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
  });

  test("failure output never echoes attacker-controlled refs or reason text", async () => {
    const result = await routeCapabilityApproval(input({
      approvalRequest: {
        requestRef: "attacker-request-secret",
        actionRef: "attacker-action-secret",
        reason: 7,
      },
    }), allowOncePort);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("attacker-request-secret");
    expect(serialized).not.toContain("attacker-action-secret");
  });
});
