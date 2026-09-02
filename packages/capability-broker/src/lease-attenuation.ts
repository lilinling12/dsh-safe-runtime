import { normalizeCapabilityResource, type CanonicalResource } from "@dsh-safe/policy-engine";

import {
  LEASE_ATTENUATION_PROFILE,
  type LeaseAttenuationFailure,
  type LeaseAttenuationResult,
  type LeaseAttenuationState,
  type LeaseAttenuationStore,
  type LeaseAttenuationStoreOutcome,
} from "./lease-attenuation-types.js";

const INPUT_KEYS = new Set(["profile", "leaseRef"]);
const STATE_KEYS = new Set([
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
  "revoked",
]);
const AUTHORIZATION_KINDS = new Set(["policy", "approval", "lease", "system"]);

function failure(
  stage: LeaseAttenuationFailure["stage"],
  reasonCode: LeaseAttenuationFailure["reasonCode"],
): LeaseAttenuationFailure {
  return Object.freeze({ status: "FAIL_CLOSED", stage, reasonCode });
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
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

function readOwnData(
  value: object,
  key: PropertyKey,
): { readonly ok: true; readonly value: unknown } | { readonly ok: false } {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor)) return { ok: false };
    return { ok: true, value: descriptor.value };
  } catch {
    return { ok: false };
  }
}

function validRef(value: unknown): value is string {
  if (typeof value !== "string") return false;
  let count = 0;
  for (const _codePoint of value) {
    count += 1;
    if (count > 512) return false;
  }
  return count >= 1;
}

function exactInputKeys(value: object): boolean {
  const keys = ownKeys(value);
  return keys !== undefined
    && keys.length === INPUT_KEYS.size
    && keys.every(key => typeof key === "string" && INPUT_KEYS.has(key));
}

function snapshotArray(value: unknown): readonly unknown[] | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  try {
    if (!Array.isArray(value)) return undefined;
  } catch {
    return undefined;
  }

  const keys = ownKeys(value);
  const length = readOwnData(value, "length");
  if (
    keys === undefined
    || !length.ok
    || typeof length.value !== "number"
    || !Number.isSafeInteger(length.value)
    || length.value < 0
  ) {
    return undefined;
  }

  const expectedLength = length.value;
  let indexCount = 0;
  for (const key of keys) {
    if (key === "length") continue;
    if (typeof key !== "string" || !isCanonicalIndex(key, expectedLength)) return undefined;
    indexCount += 1;
  }
  if (indexCount !== expectedLength) return undefined;

  const result: unknown[] = [];
  for (let index = 0; index < expectedLength; index += 1) {
    const item = readOwnData(value, String(index));
    if (!item.ok) return undefined;
    result.push(item.value);
  }
  return Object.freeze(result);
}

function isCanonicalIndex(key: string, length: number): boolean {
  if (key === "0") return length > 0;
  if (key.length === 0 || key.charCodeAt(0) === 48) return false;
  for (let index = 0; index < key.length; index += 1) {
    const code = key.charCodeAt(index);
    if (code < 48 || code > 57) return false;
  }
  const numeric = Number(key);
  return Number.isSafeInteger(numeric) && numeric >= 0 && numeric < length && String(numeric) === key;
}

function readAuthorization(value: unknown): LeaseAttenuationState["authorization"] | undefined {
  if (!isRecord(value)) return undefined;
  const keys = ownKeys(value);
  if (
    keys === undefined
    || keys.length !== 2
    || !keys.every(key => key === "kind" || key === "ref")
  ) {
    return undefined;
  }
  const kind = readOwnData(value, "kind");
  const ref = readOwnData(value, "ref");
  if (
    !kind.ok
    || !ref.ok
    || typeof kind.value !== "string"
    || !AUTHORIZATION_KINDS.has(kind.value)
    || !validRef(ref.value)
  ) {
    return undefined;
  }
  return Object.freeze({
    kind: kind.value as LeaseAttenuationState["authorization"]["kind"],
    ref: ref.value,
  });
}

function readConstraints(value: unknown): Readonly<Record<string, unknown>> | undefined | false {
  if (!isRecord(value)) return false;
  const keys = ownKeys(value);
  if (keys === undefined || keys.some(key => typeof key !== "string")) return false;
  if (keys.length !== 0) return false;
  return Object.freeze({});
}

function readState(value: unknown): LeaseAttenuationState | undefined {
  if (!isRecord(value)) return undefined;
  const keys = ownKeys(value);
  if (
    keys === undefined
    || keys.some(key => typeof key !== "string" || !STATE_KEYS.has(key))
    || ![
      "leaseRef",
      "subjectRef",
      "capability",
      "resource",
      "issuedAt",
      "expiresAt",
      "maxUses",
      "remainingUses",
      "authorization",
      "revoked",
    ].every(key => keys.includes(key))
  ) {
    return undefined;
  }

  const leaseRef = readOwnData(value, "leaseRef");
  const subjectRef = readOwnData(value, "subjectRef");
  const capability = readOwnData(value, "capability");
  const resource = readOwnData(value, "resource");
  const issuedAt = readOwnData(value, "issuedAt");
  const expiresAt = readOwnData(value, "expiresAt");
  const maxUses = readOwnData(value, "maxUses");
  const remainingUses = readOwnData(value, "remainingUses");
  const authorizationData = readOwnData(value, "authorization");
  const revoked = readOwnData(value, "revoked");
  if (
    !leaseRef.ok
    || !subjectRef.ok
    || !capability.ok
    || !resource.ok
    || !issuedAt.ok
    || !expiresAt.ok
    || !maxUses.ok
    || !remainingUses.ok
    || !authorizationData.ok
    || !revoked.ok
    || !validRef(leaseRef.value)
    || !validRef(subjectRef.value)
    || typeof capability.value !== "string"
    || typeof issuedAt.value !== "string"
    || typeof expiresAt.value !== "string"
    || typeof maxUses.value !== "number"
    || typeof remainingUses.value !== "number"
    || typeof revoked.value !== "boolean"
  ) {
    return undefined;
  }

  const normalizedResource = normalizeCapabilityResource(resource.value);
  const authorization = readAuthorization(authorizationData.value);
  if (!normalizedResource.ok || authorization === undefined) return undefined;

  let parentLeaseRef: string | undefined;
  if (keys.includes("parentLeaseRef")) {
    const parent = readOwnData(value, "parentLeaseRef");
    if (!parent.ok || !validRef(parent.value)) return undefined;
    parentLeaseRef = parent.value;
  }

  let constraints: Readonly<Record<string, unknown>> | undefined;
  if (keys.includes("constraints")) {
    const data = readOwnData(value, "constraints");
    if (!data.ok) return undefined;
    const inspected = readConstraints(data.value);
    if (inspected === false) return undefined;
    constraints = inspected;
  }

  return Object.freeze({
    leaseRef: leaseRef.value,
    subjectRef: subjectRef.value,
    ...(parentLeaseRef === undefined ? {} : { parentLeaseRef }),
    capability: capability.value,
    resource: freezeResource(normalizedResource.resource),
    ...(constraints === undefined ? {} : { constraints }),
    issuedAt: issuedAt.value,
    expiresAt: expiresAt.value,
    maxUses: maxUses.value,
    remainingUses: remainingUses.value,
    authorization,
    revoked: revoked.value,
  });
}

function freezeResource(resource: CanonicalResource): LeaseAttenuationState["resource"] {
  return Object.freeze({
    scheme: resource.scheme,
    locator: resource.locator,
    ...(Object.hasOwn(resource, "providerIdentity")
      ? { providerIdentity: resource.providerIdentity }
      : {}),
  });
}

function readChain(value: unknown, expectedTargetRef: string): readonly LeaseAttenuationState[] | undefined {
  const items = snapshotArray(value);
  if (items === undefined || items.length < 1 || items.length > 32) return undefined;
  const chain: LeaseAttenuationState[] = [];
  for (const item of items) {
    const state = readState(item);
    if (state === undefined) return undefined;
    chain.push(state);
  }
  if (chain[0]?.leaseRef !== expectedTargetRef) return undefined;
  return Object.freeze(chain);
}

function sameResource(left: LeaseAttenuationState["resource"], right: LeaseAttenuationState["resource"]): boolean {
  return left.scheme === right.scheme
    && left.locator === right.locator
    && Object.hasOwn(left, "providerIdentity") === Object.hasOwn(right, "providerIdentity")
    && left.providerIdentity === right.providerIdentity;
}

function sameConstraints(
  left: LeaseAttenuationState["constraints"],
  right: LeaseAttenuationState["constraints"],
): boolean {
  return (left === undefined) === (right === undefined);
}

function sameImmutableState(left: LeaseAttenuationState, right: LeaseAttenuationState): boolean {
  return left.leaseRef === right.leaseRef
    && left.subjectRef === right.subjectRef
    && left.parentLeaseRef === right.parentLeaseRef
    && left.capability === right.capability
    && sameResource(left.resource, right.resource)
    && sameConstraints(left.constraints, right.constraints)
    && left.issuedAt === right.issuedAt
    && left.expiresAt === right.expiresAt
    && left.maxUses === right.maxUses
    && left.authorization.kind === right.authorization.kind
    && left.authorization.ref === right.authorization.ref
    && left.revoked === right.revoked;
}

function validateConsumedEvidence(
  outcome: object,
  expectedTargetRef: string,
): LeaseAttenuationResult {
  const beforeData = readOwnData(outcome, "chainBefore");
  const afterData = readOwnData(outcome, "chainAfter");
  const before = beforeData.ok ? readChain(beforeData.value, expectedTargetRef) : undefined;
  const after = afterData.ok ? readChain(afterData.value, expectedTargetRef) : undefined;
  if (before === undefined || after === undefined || before.length !== after.length) {
    return failure("STORE", "LEASE_ATTENUATION_STORE_RESULT_INVALID");
  }

  for (let index = 0; index < before.length; index += 1) {
    const previous = before[index];
    const next = after[index];
    if (
      previous === undefined
      || next === undefined
      || !sameImmutableState(previous, next)
      || !Number.isSafeInteger(previous.remainingUses)
      || !Number.isSafeInteger(next.remainingUses)
      || previous.remainingUses < 1
      || next.remainingUses !== previous.remainingUses - 1
    ) {
      return failure("STORE", "LEASE_ATTENUATION_STORE_RESULT_INVALID");
    }
  }

  const targetBefore = before[0];
  const targetAfter = after[0];
  if (targetBefore === undefined || targetAfter === undefined) {
    return failure("STORE", "LEASE_ATTENUATION_STORE_RESULT_INVALID");
  }
  return Object.freeze({
    status: "CONSUMED",
    reasonCode: "LEASE_ATTENUATED_USE_CONSUMED",
    remainingUsesBefore: targetBefore.remainingUses,
    remainingUsesAfter: targetAfter.remainingUses,
  });
}

function normalizeOutcome(outcome: unknown, expectedTargetRef: string): LeaseAttenuationResult {
  if (!isRecord(outcome)) return failure("STORE", "LEASE_ATTENUATION_STORE_RESULT_INVALID");
  const status = readOwnData(outcome, "status");
  if (!status.ok || typeof status.value !== "string") {
    return failure("STORE", "LEASE_ATTENUATION_STORE_RESULT_INVALID");
  }

  switch (status.value) {
    case "NOT_FOUND":
      return Object.freeze({ status: "NOT_CONSUMED", reasonCode: "LEASE_ATTENUATION_NOT_FOUND" });
    case "UNAVAILABLE_NOT_APPLIED":
      return failure("STORE", "LEASE_ATTENUATION_STORE_UNAVAILABLE");
    case "OUTCOME_UNKNOWN":
      return failure("STORE", "LEASE_ATTENUATION_OUTCOME_UNKNOWN");
    case "FAIL_CLOSED": {
      const stage = readOwnData(outcome, "stage");
      const reasonCode = readOwnData(outcome, "reasonCode");
      if (
        !stage.ok
        || !reasonCode.ok
        || (stage.value !== "CHAIN" && stage.value !== "ATTENUATION" && stage.value !== "USAGE")
        || typeof reasonCode.value !== "string"
      ) {
        return failure("STORE", "LEASE_ATTENUATION_STORE_RESULT_INVALID");
      }
      return failure(
        stage.value,
        reasonCode.value as LeaseAttenuationFailure["reasonCode"],
      );
    }
    case "NOT_CONSUMED": {
      const reasonCode = readOwnData(outcome, "reasonCode");
      const chainData = readOwnData(outcome, "chain");
      const chain = chainData.ok ? readChain(chainData.value, expectedTargetRef) : undefined;
      if (!reasonCode.ok || typeof reasonCode.value !== "string" || chain === undefined) {
        return failure("STORE", "LEASE_ATTENUATION_STORE_RESULT_INVALID");
      }
      switch (reasonCode.value) {
        case "LEASE_ATTENUATION_TARGET_REVOKED":
          if (chain[0]?.revoked !== true) return failure("STORE", "LEASE_ATTENUATION_STORE_RESULT_INVALID");
          break;
        case "LEASE_ATTENUATION_ANCESTOR_REVOKED":
          if (!chain.slice(1).some(state => state.revoked)) return failure("STORE", "LEASE_ATTENUATION_STORE_RESULT_INVALID");
          break;
        case "LEASE_USAGE_EXHAUSTED":
          if (chain[0]?.remainingUses !== 0) return failure("STORE", "LEASE_ATTENUATION_STORE_RESULT_INVALID");
          break;
        case "LEASE_ATTENUATION_ANCESTOR_EXHAUSTED":
          if (!chain.slice(1).some(state => state.remainingUses === 0)) return failure("STORE", "LEASE_ATTENUATION_STORE_RESULT_INVALID");
          break;
        default:
          return failure("STORE", "LEASE_ATTENUATION_STORE_RESULT_INVALID");
      }
      return Object.freeze({ status: "NOT_CONSUMED", reasonCode: reasonCode.value });
    }
    case "CONSUMED":
      return validateConsumedEvidence(outcome, expectedTargetRef);
    default:
      return failure("STORE", "LEASE_ATTENUATION_STORE_RESULT_INVALID");
  }
}

/**
 * Consume one hierarchy-aware Lease use through one trusted authoritative store
 * operation. The broker validates untrusted request shape and returned evidence,
 * but never simulates hierarchy atomicity with split reads/checks/writes.
 */
export async function consumeCapabilityLeaseHierarchy(
  input: unknown,
  store: LeaseAttenuationStore,
): Promise<LeaseAttenuationResult> {
  if (!isRecord(input) || !exactInputKeys(input)) {
    return failure("INPUT", "LEASE_ATTENUATION_INPUT_INVALID");
  }

  const profile = readOwnData(input, "profile");
  const leaseRef = readOwnData(input, "leaseRef");
  if (!profile.ok || !leaseRef.ok) return failure("INPUT", "LEASE_ATTENUATION_INPUT_INVALID");
  if (profile.value !== LEASE_ATTENUATION_PROFILE) {
    return failure("INPUT", "LEASE_ATTENUATION_PROFILE_INVALID");
  }
  if (!validRef(leaseRef.value)) {
    return failure("INPUT", "LEASE_ATTENUATION_LEASE_REF_INVALID");
  }

  let outcome: LeaseAttenuationStoreOutcome | unknown;
  try {
    outcome = await store.consumeHierarchy(leaseRef.value);
  } catch {
    return failure("STORE", "LEASE_ATTENUATION_OUTCOME_UNKNOWN");
  }
  return normalizeOutcome(outcome, leaseRef.value);
}
