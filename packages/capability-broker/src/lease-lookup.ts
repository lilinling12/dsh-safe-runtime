import {
  compareUnicodeCodePointStrings,
  normalizeCapabilityResource,
  SUBJECT_REF_CODE_POINT_LIMIT,
  type CanonicalResource,
} from "@dsh-safe/policy-engine";

import type {
  LeaseLookupFailure,
  LeaseLookupFailureReason,
  LeaseLookupResult,
  LeaseLookupStage,
} from "./lease-lookup-types.js";

const REF_CODE_POINT_LIMIT = 512;
const LEASE_CAPABILITY_MIN_CODE_POINTS = 3;
const LEASE_CAPABILITY_MAX_CODE_POINTS = 256;
const REQUEST_CAPABILITY_MAX_CODE_POINTS = 256;
const REQUEST_CAPABILITY_PATTERN = /^[a-z][a-z0-9.-]*\.[a-z][a-z0-9.-]*$/;

const INPUT_KEYS = new Set(["subject", "capability", "resource", "leases"]);
const SUBJECT_KEYS = new Set(["kind", "id", "parent", "sessionRef"]);
const LEASE_KEYS = new Set([
  "apiVersion",
  "kind",
  "leaseRef",
  "subjectRef",
  "parentLeaseRef",
  "capability",
  "resource",
  "constraints",
  "issuedAt",
  "expiresAt",
  "maxUses",
  "remainingUses",
  "authorization",
]);
const SUBJECT_KINDS = new Set([
  "agent",
  "subagent",
  "tool",
  "plugin",
  "system",
  "verifier",
  "human",
  "service",
]);

type DataRead =
  | { readonly status: "DATA"; readonly value: unknown }
  | { readonly status: "MISSING" | "ACCESSOR" | "UNREADABLE" };

interface MaterializedInput {
  readonly subjectId: string;
  readonly capability: string;
  readonly resource: CanonicalResource;
  readonly leases: readonly unknown[];
}

interface PreparedLease {
  readonly leaseRef: string;
  readonly subjectRef: string;
  readonly capability: string;
  readonly resource: CanonicalResource;
  readonly constraintsDescriptor: PropertyDescriptor | undefined;
}

type PreparedLeaseResult =
  | { readonly ok: true; readonly lease: PreparedLease }
  | {
      readonly ok: false;
      readonly stage: LeaseLookupStage;
      readonly reasonCode: LeaseLookupFailureReason;
    };

/**
 * Discover exact CapabilityLease candidates from one coherent snapshot.
 *
 * This function intentionally does not establish lease usability. TTL, usage
 * validity/consume, revocation, parent attenuation, approval, decision receipt,
 * guarantee assignment and PEP enforcement remain later Gates.
 */
export function lookupCapabilityLeases(input: unknown): LeaseLookupResult {
  const materialized = materializeInput(input);
  if (isFailure(materialized)) return materialized;

  const preparedLeases: PreparedLease[] = [];
  const seenLeaseRefs = new Set<string>();

  for (const value of materialized.leases) {
    const prepared = prepareLease(value);
    if (!prepared.ok) return fail(prepared.stage, prepared.reasonCode);
    if (seenLeaseRefs.has(prepared.lease.leaseRef)) {
      return fail("LEASE_SNAPSHOT", "LEASE_LOOKUP_DUPLICATE_LEASE_REF");
    }
    seenLeaseRefs.add(prepared.lease.leaseRef);
    preparedLeases.push(prepared.lease);
  }

  const candidates: string[] = [];
  for (const lease of preparedLeases) {
    if (lease.subjectRef !== materialized.subjectId) continue;
    if (lease.capability !== materialized.capability) continue;
    if (!sameCanonicalResource(lease.resource, materialized.resource)) continue;

    if (lease.constraintsDescriptor !== undefined) {
      if (!("value" in lease.constraintsDescriptor)) {
        return fail("CONSTRAINT", "LEASE_LOOKUP_INPUT_INVALID");
      }
      const constraintShape = inspectConstraintObject(lease.constraintsDescriptor.value);
      if (constraintShape === "INVALID") {
        return fail("CONSTRAINT", "LEASE_LOOKUP_INPUT_INVALID");
      }
      if (constraintShape === "NON_EMPTY") {
        return fail("CONSTRAINT", "LEASE_CONSTRAINT_PROFILE_UNSUPPORTED");
      }
    }

    candidates.push(lease.leaseRef);
  }

  if (candidates.length === 0) {
    return Object.freeze({ status: "NO_CANDIDATE", candidateLeaseRefs: Object.freeze([]) });
  }

  candidates.sort(compareUnicodeCodePointStrings);
  return Object.freeze({
    status: "CANDIDATES_FOUND",
    candidateLeaseRefs: Object.freeze([...candidates]),
  });
}

function materializeInput(input: unknown): MaterializedInput | LeaseLookupFailure {
  if (!isRecord(input)) return fail("INPUT", "LEASE_LOOKUP_INPUT_INVALID");
  const keys = ownKeys(input);
  if (keys === undefined || !hasOnlyAllowedStringKeys(keys, INPUT_KEYS)) {
    return fail("INPUT", "LEASE_LOOKUP_INPUT_INVALID");
  }
  for (const required of ["subject", "capability", "resource", "leases"] as const) {
    if (!keys.includes(required)) return fail("INPUT", "LEASE_LOOKUP_INPUT_INVALID");
  }

  const subjectRead = readData(input, "subject");
  const capabilityRead = readData(input, "capability");
  const resourceRead = readData(input, "resource");
  const leasesRead = readData(input, "leases");
  if (
    subjectRead.status !== "DATA"
    || capabilityRead.status !== "DATA"
    || resourceRead.status !== "DATA"
    || leasesRead.status !== "DATA"
  ) {
    return fail("INPUT", "LEASE_LOOKUP_INPUT_INVALID");
  }

  const subjectId = materializeResolvedSubjectId(subjectRead.value);
  if (subjectId === undefined) return fail("SUBJECT", "LEASE_LOOKUP_SUBJECT_INVALID");

  if (!isValidRequestCapability(capabilityRead.value)) {
    return fail("INPUT", "LEASE_LOOKUP_INPUT_INVALID");
  }

  const normalizedResource = normalizeCapabilityResource(resourceRead.value);
  if (!normalizedResource.ok) return fail("RESOURCE", normalizedResource.reason);

  const leases = snapshotArray(leasesRead.value);
  if (leases === undefined) return fail("LEASE_SNAPSHOT", "LEASE_LOOKUP_SNAPSHOT_INVALID");

  return Object.freeze({
    subjectId,
    capability: capabilityRead.value,
    resource: normalizedResource.resource,
    leases,
  });
}

function materializeResolvedSubjectId(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  const keys = ownKeys(value);
  if (keys === undefined || !hasOnlyAllowedStringKeys(keys, SUBJECT_KEYS)) return undefined;
  if (!keys.includes("kind") || !keys.includes("id") || !keys.includes("sessionRef")) return undefined;

  const kind = readData(value, "kind");
  const id = readData(value, "id");
  const sessionRef = readData(value, "sessionRef");
  if (
    kind.status !== "DATA"
    || typeof kind.value !== "string"
    || !SUBJECT_KINDS.has(kind.value)
    || id.status !== "DATA"
    || !isBoundedNonEmptyString(id.value, SUBJECT_REF_CODE_POINT_LIMIT)
    || sessionRef.status !== "DATA"
    || !isBoundedNonEmptyString(sessionRef.value, SUBJECT_REF_CODE_POINT_LIMIT)
  ) {
    return undefined;
  }

  if (kind.value === "subagent") {
    if (!keys.includes("parent")) return undefined;
    const parent = readData(value, "parent");
    if (
      parent.status !== "DATA"
      || !isBoundedNonEmptyString(parent.value, SUBJECT_REF_CODE_POINT_LIMIT)
    ) {
      return undefined;
    }
  } else if (keys.includes("parent")) {
    const parent = readData(value, "parent");
    if (
      parent.status !== "DATA"
      || (parent.value !== null
        && !isBoundedNonEmptyString(parent.value, SUBJECT_REF_CODE_POINT_LIMIT))
    ) {
      return undefined;
    }
  }

  return id.value;
}

function prepareLease(value: unknown): PreparedLeaseResult {
  if (!isRecord(value)) return prepareFailure("LEASE_SNAPSHOT", "LEASE_LOOKUP_SNAPSHOT_INVALID");
  const keys = ownKeys(value);
  if (keys === undefined || !hasOnlyAllowedStringKeys(keys, LEASE_KEYS)) {
    return prepareFailure("LEASE_SNAPSHOT", "LEASE_LOOKUP_SNAPSHOT_INVALID");
  }

  for (const required of ["leaseRef", "subjectRef", "capability", "resource"] as const) {
    if (!keys.includes(required)) {
      return prepareFailure("LEASE_SNAPSHOT", "LEASE_LOOKUP_SNAPSHOT_INVALID");
    }
  }

  const leaseRef = readData(value, "leaseRef");
  if (
    leaseRef.status !== "DATA"
    || !isBoundedNonEmptyString(leaseRef.value, REF_CODE_POINT_LIMIT)
  ) {
    return prepareFailure("LEASE_SNAPSHOT", "LEASE_LOOKUP_LEASE_REF_INVALID");
  }

  const subjectRef = readData(value, "subjectRef");
  if (
    subjectRef.status !== "DATA"
    || !isBoundedNonEmptyString(subjectRef.value, REF_CODE_POINT_LIMIT)
  ) {
    return prepareFailure("LEASE_SNAPSHOT", "LEASE_LOOKUP_SUBJECT_REF_INVALID");
  }

  const capability = readData(value, "capability");
  if (
    capability.status !== "DATA"
    || !isBoundedString(
      capability.value,
      LEASE_CAPABILITY_MIN_CODE_POINTS,
      LEASE_CAPABILITY_MAX_CODE_POINTS,
    )
  ) {
    return prepareFailure("LEASE_SNAPSHOT", "LEASE_LOOKUP_CAPABILITY_INVALID");
  }

  const resource = readData(value, "resource");
  if (resource.status !== "DATA") {
    return prepareFailure("LEASE_SNAPSHOT", "LEASE_LOOKUP_SNAPSHOT_INVALID");
  }
  const normalizedResource = normalizeCapabilityResource(resource.value);
  if (!normalizedResource.ok) {
    return prepareFailure("RESOURCE", normalizedResource.reason);
  }

  let constraintsDescriptor: PropertyDescriptor | undefined;
  if (keys.includes("constraints")) {
    constraintsDescriptor = ownDescriptor(value, "constraints");
    if (constraintsDescriptor === undefined) {
      return prepareFailure("LEASE_SNAPSHOT", "LEASE_LOOKUP_SNAPSHOT_INVALID");
    }
  }

  return Object.freeze({
    ok: true,
    lease: Object.freeze({
      leaseRef: leaseRef.value,
      subjectRef: subjectRef.value,
      capability: capability.value,
      resource: normalizedResource.resource,
      constraintsDescriptor,
    }),
  });
}

function sameCanonicalResource(left: CanonicalResource, right: CanonicalResource): boolean {
  if (left.scheme !== right.scheme || left.locator !== right.locator) return false;
  const leftHasProvider = Object.hasOwn(left, "providerIdentity");
  const rightHasProvider = Object.hasOwn(right, "providerIdentity");
  if (leftHasProvider !== rightHasProvider) return false;
  return !leftHasProvider || left.providerIdentity === right.providerIdentity;
}

function inspectConstraintObject(value: unknown): "EMPTY" | "NON_EMPTY" | "INVALID" {
  if (!isRecord(value)) return "INVALID";
  const keys = ownKeys(value);
  if (keys === undefined || keys.some(key => typeof key !== "string")) return "INVALID";
  return keys.length === 0 ? "EMPTY" : "NON_EMPTY";
}

function snapshotArray(value: unknown): readonly unknown[] | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  try {
    if (!Array.isArray(value)) return undefined;
  } catch {
    return undefined;
  }

  const keys = ownKeys(value);
  if (keys === undefined) return undefined;
  const lengthRead = readData(value, "length");
  if (
    lengthRead.status !== "DATA"
    || typeof lengthRead.value !== "number"
    || !Number.isSafeInteger(lengthRead.value)
    || lengthRead.value < 0
  ) {
    return undefined;
  }

  const length = lengthRead.value;
  let indexedKeys = 0;
  for (const key of keys) {
    if (key === "length") continue;
    if (typeof key !== "string" || !isCanonicalArrayIndex(key, length)) return undefined;
    indexedKeys += 1;
  }
  if (indexedKeys !== length) return undefined;

  const result: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const item = readData(value, String(index));
    if (item.status !== "DATA") return undefined;
    result.push(item.value);
  }
  return Object.freeze(result);
}

function isCanonicalArrayIndex(key: string, length: number): boolean {
  if (key === "0") return length > 0;
  if (key.length === 0 || key.length > 10 || key.charCodeAt(0) === 48) return false;
  for (let index = 0; index < key.length; index += 1) {
    const code = key.charCodeAt(index);
    if (code < 48 || code > 57) return false;
  }
  const numeric = Number(key);
  return Number.isInteger(numeric) && numeric >= 0 && numeric < length && String(numeric) === key;
}

function isValidRequestCapability(value: unknown): value is string {
  return typeof value === "string"
    && REQUEST_CAPABILITY_PATTERN.test(value)
    && isBoundedString(value, 1, REQUEST_CAPABILITY_MAX_CODE_POINTS);
}

function isBoundedNonEmptyString(value: unknown, maxCodePoints: number): value is string {
  return isBoundedString(value, 1, maxCodePoints);
}

function isBoundedString(
  value: unknown,
  minCodePoints: number,
  maxCodePoints: number,
): value is string {
  if (typeof value !== "string") return false;
  let count = 0;
  for (const _codePoint of value) {
    count += 1;
    if (count > maxCodePoints) return false;
  }
  return count >= minCodePoints;
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

function hasOnlyAllowedStringKeys(keys: readonly PropertyKey[], allowed: ReadonlySet<string>): boolean {
  return keys.every(key => typeof key === "string" && allowed.has(key));
}

function readData(value: object, key: PropertyKey): DataRead {
  const descriptor = ownDescriptor(value, key);
  if (descriptor === undefined) return { status: "MISSING" };
  if (!("value" in descriptor)) return { status: "ACCESSOR" };
  return { status: "DATA", value: descriptor.value };
}

function ownDescriptor(value: object, key: PropertyKey): PropertyDescriptor | undefined {
  try {
    return Object.getOwnPropertyDescriptor(value, key);
  } catch {
    return undefined;
  }
}

function prepareFailure(
  stage: LeaseLookupStage,
  reasonCode: LeaseLookupFailureReason,
): PreparedLeaseResult {
  return Object.freeze({ ok: false, stage, reasonCode });
}

function fail(
  stage: LeaseLookupStage,
  reasonCode: LeaseLookupFailureReason,
): LeaseLookupFailure {
  return Object.freeze({ status: "FAIL_CLOSED", stage, reasonCode });
}

function isFailure(
  value: MaterializedInput | LeaseLookupFailure,
): value is LeaseLookupFailure {
  return "status" in value && value.status === "FAIL_CLOSED";
}
