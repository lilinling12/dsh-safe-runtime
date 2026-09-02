import { describe, expect, test } from "vitest";

import { consumeCapabilityLeaseHierarchy } from "./lease-attenuation.js";
import { InMemoryLeaseAttenuationStore } from "./lease-attenuation-memory-store.js";
import type { LeaseAttenuationState, LeaseAttenuationStore } from "./lease-attenuation-types.js";
import { revokeCapabilityLease } from "./lease-revoke.js";

function root(overrides: Partial<LeaseAttenuationState> = {}): LeaseAttenuationState {
  return {
    leaseRef: "lease:root",
    subjectRef: "agent/root",
    capability: "fs.write",
    resource: { scheme: "workspace", locator: "/src/a.ts" },
    issuedAt: "2026-09-03T00:00:00Z",
    expiresAt: "2026-09-03T01:00:00Z",
    maxUses: 2,
    remainingUses: 2,
    authorization: { kind: "approval", ref: "approval:root" },
    revoked: false,
    ...overrides,
  };
}

function child(overrides: Partial<LeaseAttenuationState> = {}): LeaseAttenuationState {
  return {
    leaseRef: "lease:child",
    subjectRef: "subagent/child",
    parentLeaseRef: "lease:root",
    capability: "fs.write",
    resource: { scheme: "workspace", locator: "/src/a.ts" },
    issuedAt: "2026-09-03T00:10:00Z",
    expiresAt: "2026-09-03T00:50:00Z",
    maxUses: 2,
    remainingUses: 2,
    authorization: { kind: "lease", ref: "lease:root" },
    revoked: false,
    ...overrides,
  };
}

function input(): unknown {
  return { profile: "M4-034_LEASE_ATTENUATION_V1", leaseRef: "lease:child" };
}

describe("M4-034 hostile-runtime and store-evidence hardening", () => {
  test("rejects accessor-backed input without executing the getter", async () => {
    let getterCalls = 0;
    const request = { leaseRef: "lease:child" } as Record<string, unknown>;
    Object.defineProperty(request, "profile", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "M4-034_LEASE_ATTENUATION_V1";
      },
    });
    let storeCalls = 0;
    const store: LeaseAttenuationStore = {
      consumeHierarchy() {
        storeCalls += 1;
        return { status: "NOT_FOUND" };
      },
    };

    await expect(consumeCapabilityLeaseHierarchy(request, store)).resolves.toEqual({
      status: "FAIL_CLOSED",
      stage: "INPUT",
      reasonCode: "LEASE_ATTENUATION_INPUT_INVALID",
    });
    expect(getterCalls).toBe(0);
    expect(storeCalls).toBe(0);
  });

  test("fails closed on revoked Proxy and symbol authority before store access", async () => {
    const target = {};
    const proxy = new Proxy(target, {});
    Proxy.revocable(target, {}).revoke();
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    let calls = 0;
    const store: LeaseAttenuationStore = {
      consumeHierarchy() {
        calls += 1;
        return { status: "NOT_FOUND" };
      },
    };

    await expect(consumeCapabilityLeaseHierarchy(revoked.proxy, store)).resolves.toMatchObject({
      status: "FAIL_CLOSED",
      stage: "INPUT",
    });
    await expect(consumeCapabilityLeaseHierarchy({
      profile: "M4-034_LEASE_ATTENUATION_V1",
      leaseRef: "lease:child",
      [Symbol("authority")]: true,
    }, store)).resolves.toMatchObject({ status: "FAIL_CLOSED", stage: "INPUT" });
    expect(proxy).toBeDefined();
    expect(calls).toBe(0);
  });

  test("maps a thrown store operation to unknown outcome exactly once", async () => {
    let calls = 0;
    const store: LeaseAttenuationStore = {
      consumeHierarchy() {
        calls += 1;
        throw new Error("backend detail must not escape");
      },
    };
    await expect(consumeCapabilityLeaseHierarchy(input(), store)).resolves.toEqual({
      status: "FAIL_CLOSED",
      stage: "STORE",
      reasonCode: "LEASE_ATTENUATION_OUTCOME_UNKNOWN",
    });
    expect(calls).toBe(1);
  });

  test("rejects an unrecognized semantic failure reason instead of echoing it", async () => {
    const store: LeaseAttenuationStore = {
      consumeHierarchy() {
        return {
          status: "FAIL_CLOSED",
          stage: "CHAIN",
          reasonCode: "ATTACKER_CONTROLLED_REASON",
        } as never;
      },
    };
    await expect(consumeCapabilityLeaseHierarchy(input(), store)).resolves.toEqual({
      status: "FAIL_CLOSED",
      stage: "STORE",
      reasonCode: "LEASE_ATTENUATION_STORE_RESULT_INVALID",
    });
  });

  test("rejects fabricated success when an ancestor was not decremented", async () => {
    const before = [child(), root()];
    const after = [child({ remainingUses: 1 }), root()];
    const store: LeaseAttenuationStore = {
      consumeHierarchy() {
        return { status: "CONSUMED", chainBefore: before, chainAfter: after };
      },
    };
    await expect(consumeCapabilityLeaseHierarchy(input(), store)).resolves.toEqual({
      status: "FAIL_CLOSED",
      stage: "STORE",
      reasonCode: "LEASE_ATTENUATION_STORE_RESULT_INVALID",
    });
  });

  test("rejects fabricated success that rewrites immutable authority", async () => {
    const before = [child(), root()];
    const after = [
      child({ remainingUses: 1, capability: "fs.delete" }),
      root({ remainingUses: 1 }),
    ];
    const store: LeaseAttenuationStore = {
      consumeHierarchy() {
        return { status: "CONSUMED", chainBefore: before, chainAfter: after };
      },
    };
    await expect(consumeCapabilityLeaseHierarchy(input(), store)).resolves.toEqual({
      status: "FAIL_CLOSED",
      stage: "STORE",
      reasonCode: "LEASE_ATTENUATION_STORE_RESULT_INVALID",
    });
  });

  test("shared reference state makes committed ancestor revocation block descendant use", async () => {
    const store = new InMemoryLeaseAttenuationStore([root(), child()]);
    await expect(revokeCapabilityLease({
      profile: "M4-033_LEASE_REVOKE_V1",
      leaseRef: "lease:root",
    }, store)).resolves.toEqual({ status: "REVOKED", reasonCode: "LEASE_REVOKED" });

    await expect(consumeCapabilityLeaseHierarchy(input(), store)).resolves.toEqual({
      status: "NOT_CONSUMED",
      reasonCode: "LEASE_ATTENUATION_ANCESTOR_REVOKED",
    });
    expect(store.snapshot("lease:root")?.remainingUses).toBe(2);
    expect(store.snapshot("lease:child")?.remainingUses).toBe(2);
  });

  test("successful output is detached and frozen", async () => {
    const store = new InMemoryLeaseAttenuationStore([root(), child()]);
    const result = await consumeCapabilityLeaseHierarchy(input(), store);
    expect(result).toEqual({
      status: "CONSUMED",
      reasonCode: "LEASE_ATTENUATED_USE_CONSUMED",
      remainingUsesBefore: 2,
      remainingUsesAfter: 1,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(store.snapshot("lease:root")?.remainingUses).toBe(1);
    expect(store.snapshot("lease:child")?.remainingUses).toBe(1);
  });
});
