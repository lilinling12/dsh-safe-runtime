import {
  LEASE_USAGE_PROFILE,
  type LeaseUsageEvaluationResult,
  type LeaseUsageFailure,
  type LeaseUsageFailureReason,
  type LeaseUsageStage,
} from "./lease-usage-types.js";

const INPUT_KEYS = new Set(["profile", "maxUses", "remainingUses"]);

type DataRead =
  | { readonly status: "DATA"; readonly value: unknown }
  | { readonly status: "MISSING" | "ACCESSOR" | "UNREADABLE" };

/**
 * Evaluate only M4-031 usage-counter validity for one existing CapabilityLease
 * snapshot. This primitive is read-only: it never reserves or decrements a use,
 * touches persistence, checks TTL/revocation/delegation, or authorizes execution.
 */
export function evaluateCapabilityLeaseUsage(input: unknown): LeaseUsageEvaluationResult {
  if (!isRecord(input)) return fail("INPUT", "LEASE_USAGE_INPUT_INVALID");

  const keys = ownKeys(input);
  if (keys === undefined || !hasExactRequiredKeys(keys, INPUT_KEYS)) {
    return fail("INPUT", "LEASE_USAGE_INPUT_INVALID");
  }

  const profile = readData(input, "profile");
  if (profile.status !== "DATA" || profile.value !== LEASE_USAGE_PROFILE) {
    return fail("INPUT", "LEASE_USAGE_PROFILE_INVALID");
  }

  const maxUsesRead = readData(input, "maxUses");
  if (maxUsesRead.status !== "DATA" || !isPortableExactInteger(maxUsesRead.value) || maxUsesRead.value < 1) {
    return fail("USAGE", "LEASE_USAGE_MAX_USES_INVALID");
  }

  const remainingUsesRead = readData(input, "remainingUses");
  if (
    remainingUsesRead.status !== "DATA"
    || !isPortableExactInteger(remainingUsesRead.value)
    || remainingUsesRead.value < 0
  ) {
    return fail("USAGE", "LEASE_USAGE_REMAINING_USES_INVALID");
  }

  if (remainingUsesRead.value > maxUsesRead.value) {
    return fail("USAGE", "LEASE_USAGE_STATE_INVALID");
  }

  if (remainingUsesRead.value === 0) {
    return Object.freeze({
      status: "USAGE_INELIGIBLE",
      reasonCode: "LEASE_USAGE_EXHAUSTED",
    });
  }

  return Object.freeze({
    status: "USAGE_ELIGIBLE",
    reasonCode: "LEASE_USAGE_AVAILABLE",
  });
}

function isPortableExactInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function fail(stage: LeaseUsageStage, reasonCode: LeaseUsageFailureReason): LeaseUsageFailure {
  return Object.freeze({ status: "FAIL_CLOSED", stage, reasonCode });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null) return false;
  try {
    return !Array.isArray(value);
  } catch {
    return false;
  }
}

function ownKeys(value: object): readonly PropertyKey[] | undefined {
  try {
    return Reflect.ownKeys(value);
  } catch {
    return undefined;
  }
}

function hasExactRequiredKeys(
  keys: readonly PropertyKey[],
  required: ReadonlySet<string>,
): boolean {
  return keys.length === required.size
    && keys.every(key => typeof key === "string" && required.has(key));
}

function readData(value: object, key: PropertyKey): DataRead {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) return { status: "MISSING" };
    if (!("value" in descriptor)) return { status: "ACCESSOR" };
    return { status: "DATA", value: descriptor.value };
  } catch {
    return { status: "UNREADABLE" };
  }
}
