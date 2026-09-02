import { evaluateCapabilityLeaseUsage } from "./lease-usage.js";
import {
  LEASE_CONSUME_PROFILE,
  type LeaseConsumeFailure,
  type LeaseConsumeResult,
  type LeaseUseState,
  type LeaseUseStore,
  type LeaseUseStoreOutcome,
} from "./lease-consume-types.js";

const INPUT_KEYS = new Set(["profile", "leaseRef"]);

function failure(stage: LeaseConsumeFailure["stage"], reasonCode: LeaseConsumeFailure["reasonCode"]): LeaseConsumeFailure {
  return Object.freeze({ status: "FAIL_CLOSED", stage, reasonCode });
}

function isReadableRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOwnData(record: Record<PropertyKey, unknown>, key: PropertyKey): { ok: true; value: unknown } | { ok: false } {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (!descriptor || !("value" in descriptor)) return { ok: false };
    return { ok: true, value: descriptor.value };
  } catch {
    return { ok: false };
  }
}

function exactInputKeys(record: Record<PropertyKey, unknown>): boolean {
  try {
    const keys = Reflect.ownKeys(record);
    return keys.length === INPUT_KEYS.size
      && keys.every((key) => typeof key === "string" && INPUT_KEYS.has(key));
  } catch {
    return false;
  }
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function validLeaseRef(value: unknown): value is string {
  return typeof value === "string" && codePointLength(value) >= 1 && codePointLength(value) <= 512;
}

function usageResult(state: LeaseUseState): ReturnType<typeof evaluateCapabilityLeaseUsage> {
  return evaluateCapabilityLeaseUsage({
    profile: "M4-031_LEASE_USAGE_V1",
    maxUses: state.maxUses,
    remainingUses: state.remainingUses,
  });
}

function validStateLeaseRef(state: LeaseUseState, expectedLeaseRef: string): boolean {
  return state.leaseRef === expectedLeaseRef;
}

function normalizeOutcome(outcome: LeaseUseStoreOutcome, expectedLeaseRef: string): LeaseConsumeResult {
  if (outcome.status === "NOT_FOUND") {
    return Object.freeze({ status: "NOT_CONSUMED", reasonCode: "LEASE_CONSUME_NOT_FOUND" });
  }
  if (outcome.status === "UNAVAILABLE_NOT_APPLIED") {
    return failure("STORE", "LEASE_CONSUME_STORE_UNAVAILABLE");
  }
  if (outcome.status === "OUTCOME_UNKNOWN") {
    return failure("STORE", "LEASE_CONSUME_OUTCOME_UNKNOWN");
  }

  if (outcome.status === "EXHAUSTED") {
    if (!validStateLeaseRef(outcome.state, expectedLeaseRef)) {
      return failure("STORE", "LEASE_CONSUME_STORE_RESULT_INVALID");
    }
    const usage = usageResult(outcome.state);
    if (usage.status === "FAIL_CLOSED") return failure("USAGE", usage.reasonCode);
    if (usage.status !== "USAGE_INELIGIBLE") {
      return failure("STORE", "LEASE_CONSUME_STORE_RESULT_INVALID");
    }
    return Object.freeze({ status: "NOT_CONSUMED", reasonCode: "LEASE_USAGE_EXHAUSTED" });
  }

  if (!validStateLeaseRef(outcome.stateBefore, expectedLeaseRef)
      || !validStateLeaseRef(outcome.stateAfter, expectedLeaseRef)) {
    return failure("STORE", "LEASE_CONSUME_STORE_RESULT_INVALID");
  }

  const before = usageResult(outcome.stateBefore);
  if (before.status === "FAIL_CLOSED") return failure("USAGE", before.reasonCode);
  if (before.status !== "USAGE_ELIGIBLE") {
    return failure("STORE", "LEASE_CONSUME_STORE_RESULT_INVALID");
  }

  const after = usageResult(outcome.stateAfter);
  if (after.status === "FAIL_CLOSED") return failure("USAGE", after.reasonCode);

  const beforeRemaining = outcome.stateBefore.remainingUses;
  const afterRemaining = outcome.stateAfter.remainingUses;
  if (
    typeof beforeRemaining !== "number"
    || typeof afterRemaining !== "number"
    || outcome.stateBefore.maxUses !== outcome.stateAfter.maxUses
    || afterRemaining !== beforeRemaining - 1
  ) {
    return failure("STORE", "LEASE_CONSUME_STORE_RESULT_INVALID");
  }

  return Object.freeze({
    status: "CONSUMED",
    reasonCode: "LEASE_USE_CONSUMED",
    remainingUsesBefore: beforeRemaining,
    remainingUsesAfter: afterRemaining,
  });
}

/**
 * Atomically consumes one use through a trusted store port. The broker validates
 * the portable request and store evidence, performs no implicit retry, and never
 * implements a split read/check/write mutation itself.
 */
export async function consumeCapabilityLeaseUse(input: unknown, store: LeaseUseStore): Promise<LeaseConsumeResult> {
  if (!isReadableRecord(input) || !exactInputKeys(input)) {
    return failure("INPUT", "LEASE_CONSUME_INPUT_INVALID");
  }

  const profile = readOwnData(input, "profile");
  const leaseRef = readOwnData(input, "leaseRef");
  if (!profile.ok || !leaseRef.ok) return failure("INPUT", "LEASE_CONSUME_INPUT_INVALID");
  if (profile.value !== LEASE_CONSUME_PROFILE) return failure("INPUT", "LEASE_CONSUME_PROFILE_INVALID");
  if (!validLeaseRef(leaseRef.value)) return failure("INPUT", "LEASE_CONSUME_LEASE_REF_INVALID");

  let outcome: LeaseUseStoreOutcome;
  try {
    outcome = await store.consumeOne(leaseRef.value);
  } catch {
    return failure("STORE", "LEASE_CONSUME_OUTCOME_UNKNOWN");
  }

  if (!outcome || typeof outcome !== "object" || Array.isArray(outcome) || typeof outcome.status !== "string") {
    return failure("STORE", "LEASE_CONSUME_STORE_RESULT_INVALID");
  }

  return normalizeOutcome(outcome, leaseRef.value);
}
