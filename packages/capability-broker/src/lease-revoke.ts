import {
  LEASE_REVOKE_PROFILE,
  type LeaseRevokeFailure,
  type LeaseRevokeResult,
  type LeaseRevocationState,
  type LeaseRevocationStore,
} from "./lease-revoke-types.js";

const INPUT_KEYS = new Set(["profile", "leaseRef"]);

function failure(stage: LeaseRevokeFailure["stage"], reasonCode: LeaseRevokeFailure["reasonCode"]): LeaseRevokeFailure {
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

function validLeaseRef(value: unknown): value is string {
  if (typeof value !== "string") return false;
  let length = 0;
  for (const _codePoint of value) {
    length += 1;
    if (length > 512) return false;
  }
  return length >= 1;
}

function readStoreState(value: unknown): LeaseRevocationState | undefined {
  if (!isReadableRecord(value)) return undefined;
  const leaseRef = readOwnData(value, "leaseRef");
  const revoked = readOwnData(value, "revoked");
  if (!leaseRef.ok || !revoked.ok || typeof leaseRef.value !== "string" || typeof revoked.value !== "boolean") {
    return undefined;
  }
  return Object.freeze({ leaseRef: leaseRef.value, revoked: revoked.value });
}

function normalizeOutcome(outcome: unknown, expectedLeaseRef: string): LeaseRevokeResult {
  if (!isReadableRecord(outcome)) return failure("STORE", "LEASE_REVOKE_STORE_RESULT_INVALID");

  const statusData = readOwnData(outcome, "status");
  if (!statusData.ok || typeof statusData.value !== "string") {
    return failure("STORE", "LEASE_REVOKE_STORE_RESULT_INVALID");
  }

  switch (statusData.value) {
    case "NOT_FOUND":
      return Object.freeze({ status: "NOT_REVOKED", reasonCode: "LEASE_REVOKE_NOT_FOUND" });
    case "UNAVAILABLE_NOT_APPLIED":
      return failure("STORE", "LEASE_REVOKE_STORE_UNAVAILABLE");
    case "OUTCOME_UNKNOWN":
      return failure("STORE", "LEASE_REVOKE_OUTCOME_UNKNOWN");
    case "ALREADY_REVOKED": {
      const stateData = readOwnData(outcome, "state");
      const state = stateData.ok ? readStoreState(stateData.value) : undefined;
      if (!state || state.leaseRef !== expectedLeaseRef || state.revoked !== true) {
        return failure("STORE", "LEASE_REVOKE_STORE_RESULT_INVALID");
      }
      return Object.freeze({ status: "ALREADY_REVOKED", reasonCode: "LEASE_ALREADY_REVOKED" });
    }
    case "REVOKED": {
      const beforeData = readOwnData(outcome, "stateBefore");
      const afterData = readOwnData(outcome, "stateAfter");
      const stateBefore = beforeData.ok ? readStoreState(beforeData.value) : undefined;
      const stateAfter = afterData.ok ? readStoreState(afterData.value) : undefined;
      if (
        !stateBefore
        || !stateAfter
        || stateBefore.leaseRef !== expectedLeaseRef
        || stateAfter.leaseRef !== expectedLeaseRef
        || stateBefore.revoked !== false
        || stateAfter.revoked !== true
      ) {
        return failure("STORE", "LEASE_REVOKE_STORE_RESULT_INVALID");
      }
      return Object.freeze({ status: "REVOKED", reasonCode: "LEASE_REVOKED" });
    }
    default:
      return failure("STORE", "LEASE_REVOKE_STORE_RESULT_INVALID");
  }
}

/**
 * Revokes one exact Lease identity through a trusted authoritative store port.
 * The primitive validates both untrusted request shape and store evidence,
 * performs no implicit retry, and never simulates revocation via TTL, usage, or
 * deletion side effects.
 */
export async function revokeCapabilityLease(input: unknown, store: LeaseRevocationStore): Promise<LeaseRevokeResult> {
  if (!isReadableRecord(input) || !exactInputKeys(input)) {
    return failure("INPUT", "LEASE_REVOKE_INPUT_INVALID");
  }

  const profile = readOwnData(input, "profile");
  const leaseRef = readOwnData(input, "leaseRef");
  if (!profile.ok || !leaseRef.ok) return failure("INPUT", "LEASE_REVOKE_INPUT_INVALID");
  if (profile.value !== LEASE_REVOKE_PROFILE) return failure("INPUT", "LEASE_REVOKE_PROFILE_INVALID");
  if (!validLeaseRef(leaseRef.value)) return failure("INPUT", "LEASE_REVOKE_LEASE_REF_INVALID");

  let outcome: unknown;
  try {
    outcome = await store.revokeOne(leaseRef.value);
  } catch {
    return failure("STORE", "LEASE_REVOKE_OUTCOME_UNKNOWN");
  }

  return normalizeOutcome(outcome, leaseRef.value);
}
