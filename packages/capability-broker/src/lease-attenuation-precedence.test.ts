import { describe, expect, test } from "vitest";

import { consumeCapabilityLeaseHierarchy } from "./lease-attenuation.js";
import { InMemoryLeaseAttenuationStore } from "./lease-attenuation-memory-store.js";
import type { LeaseAttenuationState } from "./lease-attenuation-types.js";

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

async function evaluate(
  rootState: LeaseAttenuationState,
  childState: LeaseAttenuationState,
) {
  const store = new InMemoryLeaseAttenuationStore([rootState, childState]);
  return consumeCapabilityLeaseHierarchy({
    profile: "M4-034_LEASE_ATTENUATION_V1",
    leaseRef: "lease:child",
  }, store);
}

describe("M4-034 observable failure precedence", () => {
  test("authorization failure wins over later usage failure", async () => {
    await expect(evaluate(
      root({ maxUses: 2, remainingUses: 3 }),
      child({ authorization: { kind: "lease", ref: "lease:other" } }),
    )).resolves.toEqual({
      status: "FAIL_CLOSED",
      stage: "ATTENUATION",
      reasonCode: "LEASE_ATTENUATION_AUTHORIZATION_INVALID",
    });
  });

  test("capability failure wins over later usage failure", async () => {
    await expect(evaluate(
      root({ maxUses: 2, remainingUses: 3 }),
      child({ capability: "fs.delete" }),
    )).resolves.toEqual({
      status: "FAIL_CLOSED",
      stage: "ATTENUATION",
      reasonCode: "LEASE_ATTENUATION_CAPABILITY_UNPROVABLE",
    });
  });

  test("resource failure wins over later usage failure", async () => {
    await expect(evaluate(
      root({ maxUses: 2, remainingUses: 3 }),
      child({ resource: { scheme: "workspace", locator: "/src/b.ts" } }),
    )).resolves.toEqual({
      status: "FAIL_CLOSED",
      stage: "ATTENUATION",
      reasonCode: "LEASE_ATTENUATION_RESOURCE_UNPROVABLE",
    });
  });

  test("constraint failure wins over later usage failure", async () => {
    await expect(evaluate(
      root({ maxUses: 2, remainingUses: 3 }),
      child({ constraints: { resourceWithin: "workspace://src/**" } }),
    )).resolves.toEqual({
      status: "FAIL_CLOSED",
      stage: "ATTENUATION",
      reasonCode: "LEASE_ATTENUATION_CONSTRAINT_PROFILE_UNSUPPORTED",
    });
  });

  test("time broadening wins over later usage failure", async () => {
    await expect(evaluate(
      root({ expiresAt: "2026-09-03T00:30:00Z", maxUses: 2, remainingUses: 3 }),
      child({ expiresAt: "2026-09-03T00:40:00Z" }),
    )).resolves.toEqual({
      status: "FAIL_CLOSED",
      stage: "ATTENUATION",
      reasonCode: "LEASE_ATTENUATION_TIME_BROADENING",
    });
  });

  test("usage coherence wins over later maxUses broadening", async () => {
    await expect(evaluate(
      root({ maxUses: 2, remainingUses: 3 }),
      child({ maxUses: 3, remainingUses: 3 }),
    )).resolves.toEqual({
      status: "FAIL_CLOSED",
      stage: "USAGE",
      reasonCode: "LEASE_USAGE_STATE_INVALID",
    });
  });
});
