import { evaluateCapabilityLeaseUsage } from "./lease-usage.js";
import type { LeaseUsageFailureReason } from "./lease-usage-types.js";
import {
  LEASE_CONSUME_PROFILE,
  type LeaseConsumeFailure,
  type LeaseConsumeResult,
  type LeaseUseState,
  type LeaseUseStore,
} from "./lease-consume-types.js";

const INPUT_KEYS = new Set(["profile", "leaseRef"]);

function failure(stage: LeaseConsumeFailure["stage"], reasonCode: LeaseConsumeFailure["reasonCode"]): LeaseConsumeFailure {
  return Object.freeze({ status: "FAIL_CLOSED", stage, reasonCode });
}

function isReadableRecord(value: unknown): value is Record<PropertyKey, unknown> {
  if (typeof value !== "object" || value === null) return false;
  try {
    return !Array.isArray(value);
  } catch {
    return false;
  }
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

function normalizeUsageFailure(reasonCode: LeaseUsageFailureReason): LeaseConsumeFailure {
  switch (reasonCode) {
    case "LEASE_USAGE_MAX_USES_INVALID":
    case "LEASE_USAGE_REMAINING_USES_INVALID":
    case "LEASE_USAGE_STATE_INVALID":
      return failure("USAGE", reasonCode);
    default:
      return failure("STORE", "LEASE_CONSUME_STORE_RESULT_INVALID");
  }
}

function readStoreState(value: unknown): LeaseUseState | undefined {
  if (!isReadableRecord(value)) return undefined;
  const leaseRef = readOwnData(value, "leaseRef");
  const maxUses = readOwnData(value, "maxUses");
  const remainingUses = readOwnData(value, "remainingUses");
  if (!leaseRef.ok || !maxUses.ok || !remainingUses.ok || typeof leaseRef.value !== "string") {
    return undefined;
  }
  return Object.freeze({
    leaseRef: leaseRef.value,
    maxUses: maxUses.value,
    remainingUses: remainingUses.value,
  });
}

function normalizeOutcome(outcome: unknown, expectedLeaseRef: string): LeaseConsumeResult {
  if (!isReadableRecord(outcome)) {
    return failure("STORE", "LEASE_CONSUME_STORE_RESULT_INVALID");
  }

  const statusData = readOwnData(outcome, "status");
  if (!statusData.ok || typeof statusData.value !== "string") {
    return failure("STORE", "LEASE_CONSUME_STORE_RESULT_INVALID");
  }

  switch (statusData.value) {
    case "NOT_FOUND":
      return Object.freeze({ status: "NOT_CONSUMED", reasonCode: "LEASE_CONSUME_NOT_FOUND" });
    case "UNAVAILABLE_NOT_APPLIED":
      return failure("STORE", "LEASE_CONSUME_STORE_UNAVAILABLE");
    case "OUTCOME_UNKNOWN":
      return failure("STORE", "LEASE_CONSUME_OUTCOME_UNKNOWN");
    case "EXHAUSTED": {
      const stateData = readOwnData(outcome, "state");
      const state = stateData.ok ? readStoreState(stateData.value) : undefined;
      if (!state || state.leaseRef !== expectedLeaseRef) {
        return failure("STORE", "LEASE_CONSUME_STORE_RESULT_INVALID");
      }
      const usage = usageResult(state);
      if (usage.status === "FAIL_CLOSED") return normalizeUsageFailure(usage.reasonCode);
      if (usage.status !== "USAGE_INELIGIBLE") {
        return failure("STORE", "LEASE_CONSUME_STORE_RESULT_INVALID");
      }
      return Object.freeze({ status: "NOT_CONSUMED", reasonCode: "LEASE_USAGE_EXHAUSTED" });
    }
    case "CONSUMED": {
      const beforeData = readOwnData(outcome, "stateBefore");
      const afterData = readOwnData(outcome, "stateAfter");
      const stateBefore = beforeData.ok ? readStoreState(beforeData.value) : undefined;
      const stateAfter = afterData.ok ? readStoreState(afterData.value) : undefined;
      if (!stateBefore || !stateAfter
          || stateBefore.leaseRef !== expectedLeaseRef
          || stateAfter.leaseRef !== expectedLeaseRef) {
        return failure("STORE", "LEASE_CONSUME_STORE_RESULT_INVALID");
      }

      const before = usageResult(stateBefore);
      if (before.status === "FAIL_CLOSED") return normalizeUsageFailure(before.reasonCode);
      if (before.status !== "USAGE_ELIGIBLE") {
        return failure("STORE", "LEASE_CONSUME_STORE_RESULT_INVALID");
      }

      const after = usageResult(stateAfter);
      if (after.status === "FAIL_CLOSED") return normalizeUsageFailure(after.reasonCode);

      const beforeRemaining = stateBefore.remainingUses;
      const afterRemaining = stateAfter.remainingUses;
      if (
        typeof beforeRemaining !== "number"
        || typeof afterRemaining !== "number"
        || stateBefore.maxUses !== stateAfter.maxUses
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
    default:
      return failure("STORE", "LEASE_CONSUME_STORE_RESULT_INVALID");
  }
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

  let outcome: unknown;
  try {
    outcome = await store.consumeOne(leaseRef.value);
  } catch {
    return failure("STORE", "LEASE_CONSUME_OUTCOME_UNKNOWN");
  }

  return normalizeOutcome(outcome, leaseRef.value);
}
