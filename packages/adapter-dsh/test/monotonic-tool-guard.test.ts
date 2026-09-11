import { describe, expect, it } from "vitest";

import {
  MONOTONIC_TOOL_GUARD_FAIL_CLOSED_REASON,
  normalizeToolGuardDecision,
} from "../src/monotonic-tool-guard.js";

const FAIL_CLOSED = {
  kind: "DENY",
  reason: MONOTONIC_TOOL_GUARD_FAIL_CLOSED_REASON,
} as const;

describe("monotonic tool guard runtime decision normalization", () => {
  it("preserves valid ALLOW and DENY decisions without normalizing the reason", () => {
    expect(normalizeToolGuardDecision({ kind: "ALLOW" })).toEqual({ kind: "ALLOW" });
    expect(normalizeToolGuardDecision({ kind: "DENY", reason: "" })).toEqual({
      kind: "DENY",
      reason: "",
    });
    expect(normalizeToolGuardDecision({ kind: "DENY", reason: "  exact reason  " })).toEqual({
      kind: "DENY",
      reason: "  exact reason  ",
    });
  });

  it.each([
    null,
    undefined,
    true,
    1,
    "ALLOW",
    () => ({ kind: "ALLOW" }),
    {},
    { kind: "ASK" },
    { kind: "DENY" },
    { kind: "DENY", reason: 42 },
  ])("fails closed for malformed runtime output %#", (value) => {
    expect(normalizeToolGuardDecision(value)).toEqual(FAIL_CLOSED);
  });

  it("rejects Promise and custom thenable results without awaiting them", () => {
    const promise = Promise.resolve({ kind: "ALLOW" });
    const thenable = Object.create({
      then() {
        throw new Error("must not execute then");
      },
    }) as object;
    Object.defineProperty(thenable, "kind", { value: "ALLOW", enumerable: true });

    expect(normalizeToolGuardDecision(promise)).toEqual(FAIL_CLOSED);
    expect(normalizeToolGuardDecision(thenable)).toEqual(FAIL_CLOSED);
  });

  it("rejects accessor-backed kind and reason without invoking getters", () => {
    let getterCalls = 0;
    const accessorKind = {};
    Object.defineProperty(accessorKind, "kind", {
      get() {
        getterCalls += 1;
        return "ALLOW";
      },
    });

    const accessorReason = { kind: "DENY" };
    Object.defineProperty(accessorReason, "reason", {
      get() {
        getterCalls += 1;
        return "denied";
      },
    });

    expect(normalizeToolGuardDecision(accessorKind)).toEqual(FAIL_CLOSED);
    expect(normalizeToolGuardDecision(accessorReason)).toEqual(FAIL_CLOSED);
    expect(getterCalls).toBe(0);
  });

  it("fails closed for revoked Proxies and descriptor/prototype traps", () => {
    const revoked = Proxy.revocable({ kind: "ALLOW" }, {});
    revoked.revoke();

    const descriptorTrap = new Proxy({ kind: "ALLOW" }, {
      getOwnPropertyDescriptor() {
        throw new Error("descriptor trap");
      },
    });

    const prototypeTrap = new Proxy({ kind: "ALLOW" }, {
      getPrototypeOf() {
        throw new Error("prototype trap");
      },
    });

    expect(normalizeToolGuardDecision(revoked.proxy)).toEqual(FAIL_CLOSED);
    expect(normalizeToolGuardDecision(descriptorTrap)).toEqual(FAIL_CLOSED);
    expect(normalizeToolGuardDecision(prototypeTrap)).toEqual(FAIL_CLOSED);
  });
});
