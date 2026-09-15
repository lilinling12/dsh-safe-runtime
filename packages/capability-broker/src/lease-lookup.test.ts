import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { lookupCapabilityLeases } from "./lease-lookup.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/lease-lookup/cases.json");

interface FixtureCase {
  readonly id: string;
  readonly description: string;
  readonly subject: unknown;
  readonly capability: unknown;
  readonly resource: unknown;
  readonly leases: unknown;
  readonly expected: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fixtureCases(): readonly FixtureCase[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed["cases"])) {
    throw new Error("lease-lookup fixture must contain a cases array");
  }

  const seen = new Set<string>();
  return parsed["cases"].map(raw => {
    if (
      !isRecord(raw)
      || typeof raw["id"] !== "string"
      || typeof raw["description"] !== "string"
      || !Object.hasOwn(raw, "subject")
      || !Object.hasOwn(raw, "capability")
      || !Object.hasOwn(raw, "resource")
      || !Object.hasOwn(raw, "leases")
      || !Object.hasOwn(raw, "expected")
    ) {
      throw new Error("malformed lease-lookup portable fixture");
    }
    if (seen.has(raw["id"])) throw new Error(`duplicate lease-lookup fixture id: ${raw["id"]}`);
    seen.add(raw["id"]);
    return {
      id: raw["id"],
      description: raw["description"],
      subject: raw["subject"],
      capability: raw["capability"],
      resource: raw["resource"],
      leases: raw["leases"],
      expected: raw["expected"],
    };
  });
}

const cases = fixtureCases();

describe("M4-022 portable lease-lookup corpus", () => {
  test("fixture corpus has the reviewed breadth", () => {
    expect(cases).toHaveLength(28);
  });

  for (const fixture of cases) {
    test(`${fixture.id}: ${fixture.description}`, () => {
      expect(lookupCapabilityLeases({
        subject: fixture.subject,
        capability: fixture.capability,
        resource: fixture.resource,
        leases: fixture.leases,
      })).toEqual(fixture.expected);
    });
  }
});

describe("M4-022 hostile runtime boundary", () => {
  function lease(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      apiVersion: "safe-runtime.dev/v1alpha1",
      kind: "CapabilityLease",
      leaseRef: "lease:base",
      subjectRef: "agent/root",
      capability: "fs.read",
      resource: { scheme: "workspace", locator: "src/a.ts" },
      issuedAt: "2030-01-01T00:00:00Z",
      expiresAt: "2030-01-01T00:05:00Z",
      maxUses: 3,
      remainingUses: 3,
      authorization: { kind: "approval", ref: "approval:1" },
      ...overrides,
    };
  }

  function input(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      subject: { kind: "agent", id: "agent/root", sessionRef: "session:1" },
      capability: "fs.read",
      resource: { scheme: "workspace", locator: "src/a.ts" },
      leases: [lease()],
      ...overrides,
    };
  }

  test("top-level accessors never execute", () => {
    for (const field of ["subject", "capability", "resource", "leases"] as const) {
      let getterCalls = 0;
      const candidate = input();
      Object.defineProperty(candidate, field, {
        enumerable: true,
        configurable: true,
        get() {
          getterCalls += 1;
          return undefined;
        },
      });
      expect(lookupCapabilityLeases(candidate)).toMatchObject({ status: "FAIL_CLOSED" });
      expect(getterCalls).toBe(0);
    }
  });

  test("Subject identity accessors never execute", () => {
    let getterCalls = 0;
    const subject = { kind: "agent", id: "agent/root", sessionRef: "session:1" };
    Object.defineProperty(subject, "id", {
      enumerable: true,
      configurable: true,
      get() { getterCalls += 1; return "agent/root"; },
    });
    expect(lookupCapabilityLeases(input({ subject }))).toEqual({
      status: "FAIL_CLOSED",
      stage: "SUBJECT",
      reasonCode: "LEASE_LOOKUP_SUBJECT_INVALID",
    });
    expect(getterCalls).toBe(0);
  });

  test("lookup-field accessors never execute", () => {
    const expectations = {
      leaseRef: "LEASE_LOOKUP_LEASE_REF_INVALID",
      subjectRef: "LEASE_LOOKUP_SUBJECT_REF_INVALID",
      capability: "LEASE_LOOKUP_CAPABILITY_INVALID",
      resource: "LEASE_LOOKUP_SNAPSHOT_INVALID",
    } as const;

    for (const field of Object.keys(expectations) as Array<keyof typeof expectations>) {
      let getterCalls = 0;
      const candidate = lease();
      Object.defineProperty(candidate, field, {
        enumerable: true,
        configurable: true,
        get() { getterCalls += 1; return undefined; },
      });
      expect(lookupCapabilityLeases(input({ leases: [candidate] }))).toMatchObject({
        status: "FAIL_CLOSED",
        reasonCode: expectations[field],
      });
      expect(getterCalls).toBe(0);
    }
  });

  test("later-Gate lifecycle and provenance getters are never executed", () => {
    const deferred = [
      "issuedAt",
      "expiresAt",
      "maxUses",
      "remainingUses",
      "authorization",
      "parentLeaseRef",
    ] as const;

    for (const field of deferred) {
      let getterCalls = 0;
      const candidate = lease();
      Object.defineProperty(candidate, field, {
        enumerable: true,
        configurable: true,
        get() {
          getterCalls += 1;
          throw new Error("later Gate field must not be read by lookup");
        },
      });
      expect(lookupCapabilityLeases(input({ leases: [candidate] }))).toEqual({
        status: "CANDIDATES_FOUND",
        candidateLeaseRefs: ["lease:base"],
      });
      expect(getterCalls).toBe(0);
    }
  });

  test("matching constraint accessor fails closed without executing getter", () => {
    let getterCalls = 0;
    const candidate = lease();
    Object.defineProperty(candidate, "constraints", {
      enumerable: true,
      configurable: true,
      get() { getterCalls += 1; return {}; },
    });
    expect(lookupCapabilityLeases(input({ leases: [candidate] }))).toEqual({
      status: "FAIL_CLOSED",
      stage: "CONSTRAINT",
      reasonCode: "LEASE_LOOKUP_INPUT_INVALID",
    });
    expect(getterCalls).toBe(0);
  });

  test("nonmatching constraint accessor is never executed and does not block", () => {
    let getterCalls = 0;
    const candidate = lease({ subjectRef: "agent/other" });
    Object.defineProperty(candidate, "constraints", {
      enumerable: true,
      configurable: true,
      get() { getterCalls += 1; throw new Error("irrelevant constraint"); },
    });
    expect(lookupCapabilityLeases(input({ leases: [candidate] }))).toEqual({
      status: "NO_CANDIDATE",
      candidateLeaseRefs: [],
    });
    expect(getterCalls).toBe(0);
  });

  test("hostile nonmatching constraint body is never traversed", () => {
    let trapCalls = 0;
    const constraints = new Proxy({}, {
      ownKeys() { trapCalls += 1; throw new Error("must remain irrelevant"); },
      getOwnPropertyDescriptor() { trapCalls += 1; throw new Error("must remain irrelevant"); },
    });
    const candidate = lease({ subjectRef: "agent/other", constraints });
    expect(lookupCapabilityLeases(input({ leases: [candidate] }))).toEqual({
      status: "NO_CANDIDATE",
      candidateLeaseRefs: [],
    });
    expect(trapCalls).toBe(0);
  });

  test("matching revoked constraint body fails closed instead of escaping", () => {
    const revocable = Proxy.revocable({}, {});
    revocable.revoke();
    expect(lookupCapabilityLeases(input({ leases: [lease({ constraints: revocable.proxy })] }))).toEqual({
      status: "FAIL_CLOSED",
      stage: "CONSTRAINT",
      reasonCode: "LEASE_LOOKUP_INPUT_INVALID",
    });
  });

  test("sparse, named, and symbol snapshot arrays fail closed", () => {
    const sparse: unknown[] = [];
    sparse.length = 1;
    expect(lookupCapabilityLeases(input({ leases: sparse }))).toMatchObject({
      status: "FAIL_CLOSED",
      stage: "LEASE_SNAPSHOT",
    });

    const named = [lease()] as unknown[] & { authority?: string };
    named.authority = "allow";
    expect(lookupCapabilityLeases(input({ leases: named }))).toMatchObject({
      status: "FAIL_CLOSED",
      stage: "LEASE_SNAPSHOT",
    });

    const symbolic = [lease()] as unknown[] & Record<PropertyKey, unknown>;
    symbolic[Symbol("authority")] = "allow";
    expect(lookupCapabilityLeases(input({ leases: symbolic }))).toMatchObject({
      status: "FAIL_CLOSED",
      stage: "LEASE_SNAPSHOT",
    });
  });

  test("unexpected or symbol Lease fields fail closed without being authority", () => {
    const unexpected = lease({ allow: true });
    expect(lookupCapabilityLeases(input({ leases: [unexpected] }))).toMatchObject({
      status: "FAIL_CLOSED",
      stage: "LEASE_SNAPSHOT",
    });

    const symbolic: Record<PropertyKey, unknown> = lease();
    symbolic[Symbol("authority")] = true;
    expect(lookupCapabilityLeases(input({ leases: [symbolic] }))).toMatchObject({
      status: "FAIL_CLOSED",
      stage: "LEASE_SNAPSHOT",
    });
  });

  test("revoked input, Subject, snapshot, and Lease proxies fail closed", () => {
    for (const target of ["input", "subject", "leases", "lease"] as const) {
      const revocable = Proxy.revocable({}, {});
      revocable.revoke();
      if (target === "input") {
        expect(lookupCapabilityLeases(revocable.proxy)).toMatchObject({ status: "FAIL_CLOSED" });
      } else if (target === "subject") {
        expect(lookupCapabilityLeases(input({ subject: revocable.proxy }))).toMatchObject({ status: "FAIL_CLOSED" });
      } else if (target === "leases") {
        expect(lookupCapabilityLeases(input({ leases: revocable.proxy }))).toMatchObject({ status: "FAIL_CLOSED" });
      } else {
        expect(lookupCapabilityLeases(input({ leases: [revocable.proxy] }))).toMatchObject({ status: "FAIL_CLOSED" });
      }
    }
  });

  test("duplicate identity is rejected before filtering", () => {
    expect(lookupCapabilityLeases(input({
      leases: [
        lease({ leaseRef: "lease:dup" }),
        lease({
          leaseRef: "lease:dup",
          subjectRef: "agent/other",
          capability: "future.capability",
          resource: { scheme: "process", locator: "other" },
        }),
      ],
    }))).toEqual({
      status: "FAIL_CLOSED",
      stage: "LEASE_SNAPSHOT",
      reasonCode: "LEASE_LOOKUP_DUPLICATE_LEASE_REF",
    });
  });

  test("candidate order is deterministic and output is detached/frozen", () => {
    const leases = [
      lease({ leaseRef: "lease:z" }),
      lease({ leaseRef: "lease:A" }),
    ];
    const result = lookupCapabilityLeases(input({ leases }));
    expect(result).toEqual({
      status: "CANDIDATES_FOUND",
      candidateLeaseRefs: ["lease:A", "lease:z"],
    });
    expect(Object.isFrozen(result)).toBe(true);
    if (result.status === "CANDIDATES_FOUND") {
      expect(Object.isFrozen(result.candidateLeaseRefs)).toBe(true);
    }
    leases[0]!["leaseRef"] = "lease:mutated";
    expect(result).toMatchObject({ candidateLeaseRefs: ["lease:A", "lease:z"] });
  });

  test("failure output never echoes attacker-controlled refs", () => {
    const secret = "lease:do-not-echo-secret";
    const result = lookupCapabilityLeases(input({
      leases: [
        lease({ leaseRef: secret }),
        lease({ leaseRef: secret, subjectRef: "agent/other" }),
      ],
    }));
    expect(result).toEqual({
      status: "FAIL_CLOSED",
      stage: "LEASE_SNAPSHOT",
      reasonCode: "LEASE_LOOKUP_DUPLICATE_LEASE_REF",
    });
    expect(JSON.stringify(result)).not.toContain(secret);
  });
});
