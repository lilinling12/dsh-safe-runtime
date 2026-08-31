import { describe, expect, test, vi } from "vitest";

import { routeCapabilityApproval } from "./approval-routing.js";
import type { ApprovalInvocationPort } from "./approval-routing-types.js";

const unusedPort: ApprovalInvocationPort = {
  request: vi.fn(() => "ALLOWED_ONCE"),
};

describe("M4-023 approval-routing coercion hardening", () => {
  test("malformed policy effect never executes string coercion hooks", async () => {
    let coercionCalls = 0;
    const hostileEffect = {
      [Symbol.toPrimitive]() {
        coercionCalls += 1;
        throw new Error("must not coerce authorization input");
      },
      toString() {
        coercionCalls += 1;
        throw new Error("must not stringify authorization input");
      },
    };

    const result = await routeCapabilityApproval({
      policyEvaluation: {
        status: "EVALUATED",
        effect: hostileEffect,
        basis: "HIGHEST_BAND_ASK",
        reasonCode: "POLICY_HIGHEST_BAND_ASK",
        fullyApplicableRuleIds: [],
        contributingRuleIds: [],
      },
      leaseLookup: { status: "NO_CANDIDATE", candidateLeaseRefs: [] },
      approvalRequest: { requestRef: "request-1", actionRef: "action-1" },
    }, unusedPort);

    expect(result).toEqual({
      status: "FAIL_CLOSED",
      effect: "deny",
      stage: "POLICY",
      reasonCode: "APPROVAL_ROUTING_POLICY_RESULT_INVALID",
    });
    expect(coercionCalls).toBe(0);
    expect(unusedPort.request).not.toHaveBeenCalled();
  });

  test("policy basis and reason accessors never execute", async () => {
    for (const field of ["basis", "reasonCode"] as const) {
      let getterCalls = 0;
      const policy: Record<string, unknown> = {
        status: "EVALUATED",
        effect: "ask",
        basis: "HIGHEST_BAND_ASK",
        reasonCode: "POLICY_HIGHEST_BAND_ASK",
        fullyApplicableRuleIds: [],
        contributingRuleIds: [],
      };
      Object.defineProperty(policy, field, {
        enumerable: true,
        configurable: true,
        get() {
          getterCalls += 1;
          throw new Error("must not execute");
        },
      });

      const provider = { request: vi.fn(() => "ALLOWED_ONCE") } satisfies ApprovalInvocationPort;
      const result = await routeCapabilityApproval({
        policyEvaluation: policy,
        leaseLookup: { status: "NO_CANDIDATE", candidateLeaseRefs: [] },
        approvalRequest: { requestRef: "request-1", actionRef: "action-1" },
      }, provider);

      expect(result).toMatchObject({
        status: "FAIL_CLOSED",
        stage: "POLICY",
        reasonCode: "APPROVAL_ROUTING_POLICY_RESULT_INVALID",
      });
      expect(getterCalls).toBe(0);
      expect(provider.request).not.toHaveBeenCalled();
    }
  });
});
