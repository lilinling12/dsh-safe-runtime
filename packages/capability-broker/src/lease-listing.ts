import {
  compareUnicodeCodePointStrings,
  normalizeCapabilityResource,
  type CanonicalResource,
} from "@dsh-safe/policy-engine";

import { evaluateCapabilityLeaseTtl } from "./lease-ttl.js";
import { evaluateCapabilityLeaseUsage } from "./lease-usage.js";
import {
  LEASE_LISTING_PROFILE,
  MAX_LEASE_LIST_ENTRIES,
  type LeaseInventoryState,
  type LeaseInventoryStore,
  type LeaseListingEntry,
  type LeaseListingFailure,
  type LeaseListingFailureReason,
  type LeaseListingResult,
  type LeaseListingStage,
} from "./lease-listing-types.js";

const STATE_KEYS = new Set([
  "leaseRef", "subjectRef", "parentLeaseRef", "capability", "resource",
  "constraints", "issuedAt", "expiresAt", "maxUses", "remainingUses",
  "authorization", "revoked",
]);
const AUTHORIZATION_KINDS = new Set(["policy", "approval", "lease", "system"]);

type DataRead =
  | { readonly status: "DATA"; readonly value: unknown }
  | { readonly status: "MISSING" | "ACCESSOR" | "UNREADABLE" };

type StateReadResult =
  | { readonly ok: true; readonly entry: LeaseListingEntry }
  | { readonly ok: false; readonly failure: LeaseListingFailure };

function fail(stage: LeaseListingStage, reasonCode: LeaseListingFailureReason): LeaseListingFailure {
  return Object.freeze({ status: "FAIL_CLOSED", stage, reasonCode });
}

function stateFail(stage: LeaseListingStage, reasonCode: LeaseListingFailureReason): StateReadResult {
  return Object.freeze({ ok: false, failure: fail(stage, reasonCode) });
}

function isRecord(value: unknown): value is Readonly<Record<PropertyKey, unknown>> {
  if (typeof value !== "object" || value === null) return false;
  try { return !Array.isArray(value); } catch { return false; }
}

function ownKeys(value: object): readonly PropertyKey[] | undefined {
  try { return Reflect.ownKeys(value); } catch { return undefined; }
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

function exactKeys(value: object, expected: readonly string[]): boolean {
  const keys = ownKeys(value);
  return keys !== undefined
    && keys.length === expected.length
    && keys.every(key => typeof key === "string" && expected.includes(key));
}

function validRef(value: unknown): value is string {
  if (typeof value !== "string") return false;
  let count = 0;
  for (const _character of value) {
    count += 1;
    if (count > 512) return false;
  }
  return count >= 1;
}

function validLeaseCapability(value: unknown): value is string {
  if (typeof value !== "string") return false;
  let count = 0;
  for (const _character of value) {
    count += 1;
    if (count > 256) return false;
  }
  return count >= 3;
}

function denseArray(value: unknown, maxLength: number): readonly unknown[] | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  try { if (!Array.isArray(value)) return undefined; } catch { return undefined; }

  const keys = ownKeys(value);
  const length = readData(value, "length");
  if (
    keys === undefined || length.status !== "DATA" || typeof length.value !== "number"
    || !Number.isSafeInteger(length.value) || length.value < 0 || length.value > maxLength
  ) return undefined;

  const expectedLength = length.value;
  let indexed = 0;
  for (const key of keys) {
    if (key === "length") continue;
    if (typeof key !== "string" || !canonicalIndex(key, expectedLength)) return undefined;
    indexed += 1;
  }
  if (indexed !== expectedLength) return undefined;

  const items: unknown[] = [];
  for (let index = 0; index < expectedLength; index += 1) {
    const item = readData(value, String(index));
    if (item.status !== "DATA") return undefined;
    items.push(item.value);
  }
  return Object.freeze(items);
}

function canonicalIndex(key: string, length: number): boolean {
  if (key === "0") return length > 0;
  if (key.length === 0 || key.charCodeAt(0) === 48) return false;
  for (let index = 0; index < key.length; index += 1) {
    const code = key.charCodeAt(index);
    if (code < 48 || code > 57) return false;
  }
  const numeric = Number(key);
  return Number.isSafeInteger(numeric) && numeric >= 0 && numeric < length && String(numeric) === key;
}

function readAuthorization(value: unknown): LeaseInventoryState["authorization"] | undefined {
  if (!isRecord(value) || !exactKeys(value, ["kind", "ref"])) return undefined;
  const kind = readData(value, "kind");
  const ref = readData(value, "ref");
  if (
    kind.status !== "DATA" || ref.status !== "DATA"
    || typeof kind.value !== "string" || !AUTHORIZATION_KINDS.has(kind.value)
    || !validRef(ref.value)
  ) return undefined;
  return Object.freeze({
    kind: kind.value as LeaseInventoryState["authorization"]["kind"],
    ref: ref.value,
  });
}

function classifyConstraints(value: unknown): "NONE" | "NON_EMPTY" | undefined {
  if (!isRecord(value)) return undefined;
  const keys = ownKeys(value);
  if (keys === undefined || keys.some(key => typeof key !== "string")) return undefined;
  return keys.length === 0 ? "NONE" : "NON_EMPTY";
}

function freezeResource(resource: CanonicalResource): LeaseInventoryState["resource"] {
  return Object.freeze({
    scheme: resource.scheme,
    locator: resource.locator,
    ...(Object.hasOwn(resource, "providerIdentity") ? { providerIdentity: resource.providerIdentity } : {}),
  });
}

function readState(value: unknown, observedAt: string): StateReadResult {
  if (!isRecord(value)) return stateFail("SNAPSHOT", "LEASE_LIST_SNAPSHOT_INVALID");
  const keys = ownKeys(value);
  if (
    keys === undefined
    || keys.some(key => typeof key !== "string" || !STATE_KEYS.has(key))
    || ![
      "leaseRef", "subjectRef", "capability", "resource", "issuedAt", "expiresAt",
      "maxUses", "remainingUses", "authorization", "revoked",
    ].every(key => keys.includes(key))
  ) return stateFail("SNAPSHOT", "LEASE_LIST_SNAPSHOT_INVALID");

  const leaseRef = readData(value, "leaseRef");
  if (leaseRef.status !== "DATA" || !validRef(leaseRef.value)) {
    return stateFail("SNAPSHOT", "LEASE_LIST_LEASE_REF_INVALID");
  }

  const subjectRef = readData(value, "subjectRef");
  if (subjectRef.status !== "DATA" || !validRef(subjectRef.value)) {
    return stateFail("SNAPSHOT", "LEASE_LIST_SUBJECT_REF_INVALID");
  }

  let parentLeaseRef: string | undefined;
  if (keys.includes("parentLeaseRef")) {
    const parent = readData(value, "parentLeaseRef");
    if (parent.status !== "DATA" || !validRef(parent.value)) {
      return stateFail("SNAPSHOT", "LEASE_LIST_PARENT_LEASE_REF_INVALID");
    }
    parentLeaseRef = parent.value;
  }

  const capability = readData(value, "capability");
  if (capability.status !== "DATA" || !validLeaseCapability(capability.value)) {
    return stateFail("SNAPSHOT", "LEASE_LIST_CAPABILITY_INVALID");
  }

  const resourceData = readData(value, "resource");
  if (resourceData.status !== "DATA") return stateFail("SNAPSHOT", "LEASE_LIST_SNAPSHOT_INVALID");
  const resource = normalizeCapabilityResource(resourceData.value);
  if (!resource.ok) return stateFail("RESOURCE", resource.reason);

  let constraintsState: "NONE" | "NON_EMPTY" = "NONE";
  if (keys.includes("constraints")) {
    const constraints = readData(value, "constraints");
    if (constraints.status !== "DATA") return stateFail("SNAPSHOT", "LEASE_LIST_CONSTRAINTS_INVALID");
    const classified = classifyConstraints(constraints.value);
    if (classified === undefined) return stateFail("SNAPSHOT", "LEASE_LIST_CONSTRAINTS_INVALID");
    constraintsState = classified;
  }

  const authorizationData = readData(value, "authorization");
  const authorization = authorizationData.status === "DATA"
    ? readAuthorization(authorizationData.value)
    : undefined;
  if (authorization === undefined) return stateFail("SNAPSHOT", "LEASE_LIST_AUTHORIZATION_INVALID");

  const revoked = readData(value, "revoked");
  if (revoked.status !== "DATA" || typeof revoked.value !== "boolean") {
    return stateFail("SNAPSHOT", "LEASE_LIST_REVOKED_STATE_INVALID");
  }

  const issuedAt = readData(value, "issuedAt");
  const expiresAt = readData(value, "expiresAt");
  const maxUses = readData(value, "maxUses");
  const remainingUses = readData(value, "remainingUses");
  if (
    issuedAt.status !== "DATA" || expiresAt.status !== "DATA"
    || maxUses.status !== "DATA" || remainingUses.status !== "DATA"
  ) return stateFail("SNAPSHOT", "LEASE_LIST_SNAPSHOT_INVALID");

  const ttl = evaluateCapabilityLeaseTtl({
    profile: "M4-030_LEASE_TTL_V1",
    issuedAt: issuedAt.value,
    expiresAt: expiresAt.value,
    observedAt,
  });
  if (ttl.status === "FAIL_CLOSED") {
    switch (ttl.reasonCode) {
      case "LEASE_TTL_ISSUED_AT_INVALID":
      case "LEASE_TTL_EXPIRES_AT_INVALID":
      case "LEASE_TTL_WINDOW_INVALID":
        return stateFail("TIME", ttl.reasonCode);
      case "LEASE_TTL_INPUT_INVALID":
      case "LEASE_TTL_PROFILE_INVALID":
      case "LEASE_TTL_OBSERVED_AT_INVALID":
        return stateFail("SNAPSHOT", "LEASE_LIST_SNAPSHOT_INVALID");
    }
  }

  const usage = evaluateCapabilityLeaseUsage({
    profile: "M4-031_LEASE_USAGE_V1",
    maxUses: maxUses.value,
    remainingUses: remainingUses.value,
  });
  if (usage.status === "FAIL_CLOSED") {
    switch (usage.reasonCode) {
      case "LEASE_USAGE_MAX_USES_INVALID":
      case "LEASE_USAGE_REMAINING_USES_INVALID":
      case "LEASE_USAGE_STATE_INVALID":
        return stateFail("USAGE", usage.reasonCode);
      case "LEASE_USAGE_INPUT_INVALID":
      case "LEASE_USAGE_PROFILE_INVALID":
        return stateFail("SNAPSHOT", "LEASE_LIST_SNAPSHOT_INVALID");
    }
  }

  const entry: LeaseListingEntry = Object.freeze({
    leaseRef: leaseRef.value,
    subjectRef: subjectRef.value,
    ...(parentLeaseRef === undefined ? {} : { parentLeaseRef }),
    capability: capability.value,
    resource: freezeResource(resource.resource),
    issuedAt: issuedAt.value as string,
    expiresAt: expiresAt.value as string,
    maxUses: maxUses.value as number,
    remainingUses: remainingUses.value as number,
    authorization,
    revoked: revoked.value,
    constraintsState,
    ttl,
    usage,
  });
  return Object.freeze({ ok: true, entry });
}

function normalizeStoreOutcome(outcome: unknown, observedAt: string): LeaseListingResult {
  if (!isRecord(outcome)) return fail("STORE", "LEASE_LIST_STORE_RESULT_INVALID");
  const status = readData(outcome, "status");
  if (status.status !== "DATA" || typeof status.value !== "string") {
    return fail("STORE", "LEASE_LIST_STORE_RESULT_INVALID");
  }

  if (status.value === "LIMIT_EXCEEDED") {
    return exactKeys(outcome, ["status"])
      ? fail("STORE", "LEASE_LIST_SNAPSHOT_LIMIT_EXCEEDED")
      : fail("STORE", "LEASE_LIST_STORE_RESULT_INVALID");
  }
  if (status.value === "UNAVAILABLE") {
    return exactKeys(outcome, ["status"])
      ? fail("STORE", "LEASE_LIST_STORE_UNAVAILABLE")
      : fail("STORE", "LEASE_LIST_STORE_RESULT_INVALID");
  }
  if (status.value !== "SNAPSHOT" || !exactKeys(outcome, ["status", "states"])) {
    return fail("STORE", "LEASE_LIST_STORE_RESULT_INVALID");
  }

  const statesData = readData(outcome, "states");
  if (statesData.status !== "DATA") return fail("STORE", "LEASE_LIST_STORE_RESULT_INVALID");
  const states = denseArray(statesData.value, MAX_LEASE_LIST_ENTRIES);
  if (states === undefined) return fail("STORE", "LEASE_LIST_STORE_RESULT_INVALID");

  const entries: LeaseListingEntry[] = [];
  const seen = new Set<string>();
  for (const state of states) {
    const parsed = readState(state, observedAt);
    if (!parsed.ok) return parsed.failure;
    entries.push(parsed.entry);
  }
  for (const entry of entries) {
    if (seen.has(entry.leaseRef)) return fail("SNAPSHOT", "LEASE_LIST_DUPLICATE_LEASE_REF");
    seen.add(entry.leaseRef);
  }
  entries.sort((left, right) => compareUnicodeCodePointStrings(left.leaseRef, right.leaseRef));

  return Object.freeze({
    status: "LISTED",
    profile: LEASE_LISTING_PROFILE,
    observedAt,
    entries: Object.freeze(entries),
  });
}

/** Validate only the accepted M4-030 timestamp lexical/instant domain. */
function validObservedAt(value: string): boolean {
  const probe = evaluateCapabilityLeaseTtl({
    profile: "M4-030_LEASE_TTL_V1",
    issuedAt: value,
    expiresAt: value,
    observedAt: value,
  });
  return probe.status === "FAIL_CLOSED" && probe.reasonCode === "LEASE_TTL_WINDOW_INVALID";
}

/**
 * Produce one deterministic read-only M4-035 Lease inventory description.
 *
 * The Broker never reads a host clock, never consumes/revokes/repairs state,
 * never traverses parents and never synthesizes a usable/authorized verdict.
 */
export async function listCapabilityLeases(
  input: unknown,
  store: LeaseInventoryStore,
): Promise<LeaseListingResult> {
  if (!isRecord(input) || !exactKeys(input, ["profile", "observedAt"])) {
    return fail("INPUT", "LEASE_LIST_INPUT_INVALID");
  }

  const profile = readData(input, "profile");
  if (profile.status !== "DATA" || profile.value !== LEASE_LISTING_PROFILE) {
    return fail("INPUT", "LEASE_LIST_PROFILE_INVALID");
  }
  const observedAt = readData(input, "observedAt");
  if (
    observedAt.status !== "DATA" || typeof observedAt.value !== "string"
    || !validObservedAt(observedAt.value)
  ) return fail("INPUT", "LEASE_LIST_OBSERVED_AT_INVALID");

  let outcome: unknown;
  try {
    outcome = await store.listSnapshot(MAX_LEASE_LIST_ENTRIES);
  } catch {
    return fail("STORE", "LEASE_LIST_STORE_UNAVAILABLE");
  }
  return normalizeStoreOutcome(outcome, observedAt.value);
}
