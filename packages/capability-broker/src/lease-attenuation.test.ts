import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { consumeCapabilityLeaseHierarchy } from "./lease-attenuation.js";
import { InMemoryLeaseAttenuationStore } from "./lease-attenuation-memory-store.js";
import type { LeaseAttenuationState, LeaseAttenuationStore } from "./lease-attenuation-types.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/lease-attenuation/cases.json");

interface FixtureCase {
  readonly id: string;
  readonly description: string;
  readonly mode: "SEQUENTIAL" | "SEQUENCE" | "CONCURRENT";
  readonly input?: unknown;
  readonly attempts?: readonly { readonly input: unknown }[];
  readonly attemptCount?: number;
  readonly states?: readonly Record<string, unknown>[];
  readonly generatedChain?: {
    readonly length: number;
    readonly leaseRefPrefix: string;
    readonly maxUses: number;
    readonly remainingUses: number;
  };
  readonly storeFault?: string;
  readonly expected: Record<string, unknown>;
}

interface FixtureRoot {
  readonly profile: string;
  readonly stateDefaults: Record<string, unknown>;
  readonly cases: readonly FixtureCase[];
}

function parsedFixture(): FixtureRoot {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || parsed["profile"] !== "M4-034_LEASE_ATTENUATION_V1" || !isRecord(parsed["stateDefaults"]) || !Array.isArray(parsed["cases"])) {
    throw new Error("lease-attenuation fixture must contain reviewed profile/defaults/cases");
  }
  const cases = parsed["cases"] as unknown[];
  for (let index = 0; index < cases.length; index += 1) {
    const item = cases[index];
    if (!isRecord(item) || item["id"] !== `LATT-${String(index + 1).padStart(3, "0")}`) {
      throw new Error("lease-attenuation fixture ids must be canonical and contiguous");
    }
  }
  return parsed as unknown as FixtureRoot;
}

const fixture = parsedFixture();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function materializeState(raw: Record<string, unknown>): LeaseAttenuationState {
  const merged = { ...fixture.stateDefaults, ...raw };
  const leaseRef = merged["leaseRef"];
  if (typeof leaseRef !== "string") throw new Error("fixture state requires leaseRef");
  const parentLeaseRef = merged["parentLeaseRef"];
  const authorization = isRecord(merged["authorization"])
    ? merged["authorization"]
    : parentLeaseRef === undefined
      ? { kind: "approval", ref: "approval:root" }
      : { kind: "lease", ref: parentLeaseRef };
  return {
    leaseRef,
    subjectRef: String(merged["subjectRef"]),
    ...(parentLeaseRef === undefined ? {} : { parentLeaseRef: String(parentLeaseRef) }),
    capability: String(merged["capability"]),
    resource: merged["resource"] as LeaseAttenuationState["resource"],
    ...(merged["constraints"] === undefined
      ? {}
      : { constraints: merged["constraints"] as Readonly<Record<string, unknown>> }),
    issuedAt: String(merged["issuedAt"]),
    expiresAt: String(merged["expiresAt"]),
    maxUses: merged["maxUses"] as number,
    remainingUses: merged["remainingUses"] as number,
    authorization: authorization as LeaseAttenuationState["authorization"],
    revoked: merged["revoked"] as boolean,
  };
}

function statesFor(item: FixtureCase): readonly LeaseAttenuationState[] {
  if (item.generatedChain !== undefined) {
    const generated: LeaseAttenuationState[] = [];
    for (let index = 0; index < item.generatedChain.length; index += 1) {
      generated.push(materializeState({
        leaseRef: `${item.generatedChain.leaseRefPrefix}${index}`,
        ...(index === 0 ? {} : { parentLeaseRef: `${item.generatedChain.leaseRefPrefix}${index - 1}` }),
        maxUses: item.generatedChain.maxUses,
        remainingUses: item.generatedChain.remainingUses,
      }));
    }
    return generated;
  }
  return (item.states ?? []).map(materializeState);
}

function faultStore(fault: string): LeaseAttenuationStore {
  return {
    consumeHierarchy() {
      if (fault === "UNAVAILABLE_NOT_APPLIED") return { status: "UNAVAILABLE_NOT_APPLIED" };
      if (fault === "OUTCOME_UNKNOWN") return { status: "OUTCOME_UNKNOWN" };
      return { status: "BROKEN" } as never;
    },
  };
}

function counts(results: readonly Record<string, unknown>[], key: string): Record<string, number> {
  const output: Record<string, number> = {};
  for (const result of results) {
    const value = result[key];
    if (typeof value === "string") output[value] = (output[value] ?? 0) + 1;
  }
  return output;
}

function assertFinalRemaining(
  store: InMemoryLeaseAttenuationStore,
  expected: unknown,
): void {
  if (!isRecord(expected)) return;
  for (const [leaseRef, remainingUses] of Object.entries(expected)) {
    expect(store.snapshot(leaseRef)?.remainingUses).toBe(remainingUses);
  }
}

async function executeCase(item: FixtureCase): Promise<void> {
  let calls = 0;
  const baseStore = new InMemoryLeaseAttenuationStore(statesFor(item));
  const store: LeaseAttenuationStore = item.storeFault === undefined
    ? {
        async consumeHierarchy(leaseRef) {
          calls += 1;
          return baseStore.consumeHierarchy(leaseRef);
        },
      }
    : {
        async consumeHierarchy(leaseRef) {
          calls += 1;
          return faultStore(item.storeFault ?? "").consumeHierarchy(leaseRef);
        },
      };

  if (item.mode === "SEQUENTIAL") {
    const result = await consumeCapabilityLeaseHierarchy(item.input, store);
    expect(result).toEqual(item.expected["result"]);
  } else if (item.mode === "SEQUENCE") {
    const results = [];
    for (const attempt of item.attempts ?? []) {
      results.push(await consumeCapabilityLeaseHierarchy(attempt.input, store));
    }
    expect(results).toEqual(item.expected["results"]);
  } else {
    const inputs = item.attempts?.map(attempt => attempt.input)
      ?? Array.from({ length: item.attemptCount ?? 0 }, () => item.input);
    const results = await Promise.all(inputs.map(input => consumeCapabilityLeaseHierarchy(input, store)));
    if (isRecord(item.expected["statusCounts"])) {
      expect(counts(results as unknown as Record<string, unknown>[], "status")).toEqual(item.expected["statusCounts"]);
    }
    if (isRecord(item.expected["reasonCodeCounts"])) {
      expect(counts(results as unknown as Record<string, unknown>[], "reasonCode")).toEqual(item.expected["reasonCodeCounts"]);
    }
  }

  assertFinalRemaining(baseStore, item.expected["finalRemainingUses"]);
  expect(calls).toBe(item.expected["storeCalls"]);
}

describe("M4-034 portable parent-child attenuation corpus", () => {
  test("contains exactly the reviewed LATT-001..028 profile", () => {
    expect(fixture.cases).toHaveLength(28);
    expect(fixture.cases.at(0)?.id).toBe("LATT-001");
    expect(fixture.cases.at(-1)?.id).toBe("LATT-028");
  });

  for (const item of fixture.cases) {
    test(`${item.id} ${item.description}`, async () => {
      await executeCase(item);
    });
  }
});
