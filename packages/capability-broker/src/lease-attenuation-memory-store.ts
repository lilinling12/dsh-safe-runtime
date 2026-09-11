import { normalizeCapabilityResource, type CanonicalResource } from "@dsh-safe/policy-engine";

import { evaluateCapabilityLeaseTtl } from "./lease-ttl.js";
import { evaluateCapabilityLeaseUsage } from "./lease-usage.js";
import type { LeaseUsageFailureReason } from "./lease-usage-types.js";
import type {
  LeaseAttenuationState,
  LeaseAttenuationStore,
  LeaseAttenuationStoreOutcome,
} from "./lease-attenuation-types.js";
import type {
  LeaseRevocationState,
  LeaseRevocationStore,
  LeaseRevocationStoreOutcome,
} from "./lease-revoke-types.js";

interface MutableLeaseAttenuationState {
  readonly leaseRef: string;
  readonly subjectRef: string;
  readonly parentLeaseRef?: string;
  readonly capability: string;
  readonly resource: LeaseAttenuationState["resource"];
  readonly constraints?: Readonly<Record<string, unknown>>;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly maxUses: number;
  remainingUses: number;
  readonly authorization: LeaseAttenuationState["authorization"];
  revoked: boolean;
}

type Release = () => void;

/**
 * Single-process M4-034 reference store.
 *
 * Hierarchy use and M4-033 revocation share the same per-Lease locks. This is a
 * process-local reference guarantee only; database/multi-process adapters need
 * their own transactional conformance evidence.
 */
export class InMemoryLeaseAttenuationStore implements LeaseAttenuationStore, LeaseRevocationStore {
  readonly #states = new Map<string, MutableLeaseAttenuationState>();
  readonly #tails = new Map<string, Promise<void>>();

  constructor(states: readonly LeaseAttenuationState[] = []) {
    for (const state of states) {
      if (this.#states.has(state.leaseRef)) throw new Error("duplicate leaseRef in reference store initialization");
      this.#states.set(state.leaseRef, cloneMutableState(state));
    }
  }

  async consumeHierarchy(leaseRef: string): Promise<LeaseAttenuationStoreOutcome> {
    const initial = this.#resolveChainRefs(leaseRef);
    if (initial.status !== "CHAIN") return initial.outcome;

    const releases = await this.#acquireMany(initial.refs);
    try {
      const resolved = this.#resolveChain(leaseRef);
      if (resolved.status !== "CHAIN") return resolved.outcome;
      return this.#consumeResolvedChain(resolved.chain);
    } finally {
      releaseReverse(releases);
    }
  }

  async revokeOne(leaseRef: string): Promise<LeaseRevocationStoreOutcome> {
    const release = await this.#acquireOne(leaseRef);
    try {
      const state = this.#states.get(leaseRef);
      if (state === undefined) return Object.freeze({ status: "NOT_FOUND" });
      if (state.revoked) return Object.freeze({ status: "ALREADY_REVOKED", state: revocationSnapshot(state) });

      const stateBefore = revocationSnapshot(state);
      state.revoked = true;
      return Object.freeze({ status: "REVOKED", stateBefore, stateAfter: revocationSnapshot(state) });
    } finally {
      release();
    }
  }

  snapshot(leaseRef: string): LeaseAttenuationState | undefined {
    const state = this.#states.get(leaseRef);
    return state === undefined ? undefined : stateSnapshot(state);
  }

  #resolveChainRefs(leaseRef: string):
    | { readonly status: "CHAIN"; readonly refs: readonly string[] }
    | { readonly status: "OUTCOME"; readonly outcome: LeaseAttenuationStoreOutcome } {
    const target = this.#states.get(leaseRef);
    if (target === undefined) return { status: "OUTCOME", outcome: Object.freeze({ status: "NOT_FOUND" }) };

    const refs: string[] = [];
    const seen = new Set<string>();
    let current: MutableLeaseAttenuationState | undefined = target;
    while (current !== undefined) {
      if (seen.has(current.leaseRef)) {
        return { status: "OUTCOME", outcome: semanticFailure("CHAIN", "LEASE_ATTENUATION_CYCLE") };
      }
      if (refs.length >= 32) {
        return { status: "OUTCOME", outcome: semanticFailure("CHAIN", "LEASE_ATTENUATION_DEPTH_EXCEEDED") };
      }
      seen.add(current.leaseRef);
      refs.push(current.leaseRef);
      if (current.parentLeaseRef === undefined) break;
      const parent = this.#states.get(current.parentLeaseRef);
      if (parent === undefined) {
        return { status: "OUTCOME", outcome: semanticFailure("CHAIN", "LEASE_ATTENUATION_PARENT_NOT_FOUND") };
      }
      current = parent;
    }
    return { status: "CHAIN", refs: Object.freeze(refs) };
  }

  #resolveChain(leaseRef: string):
    | { readonly status: "CHAIN"; readonly chain: readonly MutableLeaseAttenuationState[] }
    | { readonly status: "OUTCOME"; readonly outcome: LeaseAttenuationStoreOutcome } {
    const refs = this.#resolveChainRefs(leaseRef);
    if (refs.status !== "CHAIN") return refs;
    const chain: MutableLeaseAttenuationState[] = [];
    for (const ref of refs.refs) {
      const state = this.#states.get(ref);
      if (state === undefined) {
        return { status: "OUTCOME", outcome: semanticFailure("CHAIN", "LEASE_ATTENUATION_PARENT_NOT_FOUND") };
      }
      chain.push(state);
    }
    return { status: "CHAIN", chain: Object.freeze(chain) };
  }

  #consumeResolvedChain(chain: readonly MutableLeaseAttenuationState[]): LeaseAttenuationStoreOutcome {
    const semantic = validateStateAndEdges(chain);
    if (semantic !== undefined) return semantic;

    const before = Object.freeze(chain.map(stateSnapshot));
    const target = chain[0];
    if (target === undefined) return semanticFailure("CHAIN", "LEASE_ATTENUATION_STATE_INVALID");

    if (target.revoked) {
      return Object.freeze({ status: "NOT_CONSUMED", reasonCode: "LEASE_ATTENUATION_TARGET_REVOKED", chain: before });
    }
    if (chain.slice(1).some(state => state.revoked)) {
      return Object.freeze({ status: "NOT_CONSUMED", reasonCode: "LEASE_ATTENUATION_ANCESTOR_REVOKED", chain: before });
    }
    if (target.remainingUses === 0) {
      return Object.freeze({ status: "NOT_CONSUMED", reasonCode: "LEASE_USAGE_EXHAUSTED", chain: before });
    }
    if (chain.slice(1).some(state => state.remainingUses === 0)) {
      return Object.freeze({ status: "NOT_CONSUMED", reasonCode: "LEASE_ATTENUATION_ANCESTOR_EXHAUSTED", chain: before });
    }

    for (const state of chain) state.remainingUses -= 1;
    return Object.freeze({
      status: "CONSUMED",
      chainBefore: before,
      chainAfter: Object.freeze(chain.map(stateSnapshot)),
    });
  }

  async #acquireMany(refs: readonly string[]): Promise<readonly Release[]> {
    const releases: Release[] = [];
    for (const ref of [...refs].sort(compareCodePoints)) releases.push(await this.#acquireOne(ref));
    return Object.freeze(releases);
  }

  async #acquireOne(ref: string): Promise<Release> {
    const previous = this.#tails.get(ref) ?? Promise.resolve();
    let releaseCurrent!: Release;
    const current = new Promise<void>(resolve => { releaseCurrent = resolve; });
    const tail = previous.then(() => current);
    this.#tails.set(ref, tail);
    await previous;

    let released = false;
    return () => {
      if (released) return;
      released = true;
      releaseCurrent();
      void tail.finally(() => {
        if (this.#tails.get(ref) === tail) this.#tails.delete(ref);
      });
    };
  }
}

/** Preserve Spec 0041 observable failure precedence by validating in passes. */
function validateStateAndEdges(chain: readonly MutableLeaseAttenuationState[]): LeaseAttenuationStoreOutcome | undefined {
  const shapeFailure = validateStateShapes(chain);
  if (shapeFailure !== undefined) return shapeFailure;

  const authorizationFailure = validateAuthorizationEdges(chain);
  if (authorizationFailure !== undefined) return authorizationFailure;

  const capabilityFailure = validateCapabilities(chain);
  if (capabilityFailure !== undefined) return capabilityFailure;

  const resourceFailure = validateResources(chain);
  if (resourceFailure !== undefined) return resourceFailure;

  const constraintFailure = validateConstraints(chain);
  if (constraintFailure !== undefined) return constraintFailure;

  const timeFailure = validateTimes(chain);
  if (timeFailure !== undefined) return timeFailure;

  const usageFailure = validateUsage(chain);
  if (usageFailure !== undefined) return usageFailure;

  return validateMaxUses(chain);
}

function validateStateShapes(chain: readonly MutableLeaseAttenuationState[]): LeaseAttenuationStoreOutcome | undefined {
  for (const state of chain) {
    if (
      !validRef(state.leaseRef)
      || !validRef(state.subjectRef)
      || (state.parentLeaseRef !== undefined && !validRef(state.parentLeaseRef))
      || typeof state.capability !== "string"
      || typeof state.issuedAt !== "string"
      || typeof state.expiresAt !== "string"
      || typeof state.revoked !== "boolean"
    ) return semanticFailure("CHAIN", "LEASE_ATTENUATION_STATE_INVALID");
  }
  return undefined;
}

function validateAuthorizationEdges(chain: readonly MutableLeaseAttenuationState[]): LeaseAttenuationStoreOutcome | undefined {
  for (let index = 0; index < chain.length; index += 1) {
    const child = chain[index];
    if (child === undefined || !validAuthorization(child.authorization)) {
      return semanticFailure("ATTENUATION", "LEASE_ATTENUATION_AUTHORIZATION_INVALID");
    }
    const parent = chain[index + 1];
    if (parent === undefined) {
      if (child.parentLeaseRef !== undefined || child.authorization.kind === "lease") {
        return semanticFailure("ATTENUATION", "LEASE_ATTENUATION_AUTHORIZATION_INVALID");
      }
      continue;
    }
    if (
      child.parentLeaseRef !== parent.leaseRef
      || child.authorization.kind !== "lease"
      || child.authorization.ref !== parent.leaseRef
    ) return semanticFailure("ATTENUATION", "LEASE_ATTENUATION_AUTHORIZATION_INVALID");
  }
  return undefined;
}

function validateCapabilities(chain: readonly MutableLeaseAttenuationState[]): LeaseAttenuationStoreOutcome | undefined {
  for (let index = 0; index + 1 < chain.length; index += 1) {
    const child = chain[index];
    const parent = chain[index + 1];
    if (child === undefined || parent === undefined || child.capability !== parent.capability) {
      return semanticFailure("ATTENUATION", "LEASE_ATTENUATION_CAPABILITY_UNPROVABLE");
    }
  }
  return undefined;
}

function validateResources(chain: readonly MutableLeaseAttenuationState[]): LeaseAttenuationStoreOutcome | undefined {
  const normalized: CanonicalResource[] = [];
  for (const state of chain) {
    const resource = normalizeCapabilityResource(state.resource);
    if (!resource.ok) return semanticFailure("ATTENUATION", "LEASE_ATTENUATION_RESOURCE_UNPROVABLE");
    normalized.push(resource.resource);
  }
  for (let index = 0; index + 1 < normalized.length; index += 1) {
    const child = normalized[index];
    const parent = normalized[index + 1];
    if (child === undefined || parent === undefined || !sameResource(child, parent)) {
      return semanticFailure("ATTENUATION", "LEASE_ATTENUATION_RESOURCE_UNPROVABLE");
    }
  }
  return undefined;
}

function validateConstraints(chain: readonly MutableLeaseAttenuationState[]): LeaseAttenuationStoreOutcome | undefined {
  for (const state of chain) {
    if (hasInvalidConstraints(state.constraints) || hasNonEmptyConstraints(state.constraints)) {
      return semanticFailure("ATTENUATION", "LEASE_ATTENUATION_CONSTRAINT_PROFILE_UNSUPPORTED");
    }
  }
  return undefined;
}

function validateTimes(chain: readonly MutableLeaseAttenuationState[]): LeaseAttenuationStoreOutcome | undefined {
  for (const state of chain) {
    const time = evaluateCapabilityLeaseTtl({
      profile: "M4-030_LEASE_TTL_V1",
      issuedAt: state.issuedAt,
      expiresAt: state.expiresAt,
      observedAt: state.issuedAt,
    });
    if (time.status !== "TIME_ELIGIBLE") return semanticFailure("ATTENUATION", "LEASE_ATTENUATION_TIME_INVALID");
  }

  for (let index = 0; index + 1 < chain.length; index += 1) {
    const child = chain[index];
    const parent = chain[index + 1];
    if (child === undefined || parent === undefined) return semanticFailure("CHAIN", "LEASE_ATTENUATION_STATE_INVALID");

    const parentAtChildStart = evaluateCapabilityLeaseTtl({
      profile: "M4-030_LEASE_TTL_V1",
      issuedAt: parent.issuedAt,
      expiresAt: parent.expiresAt,
      observedAt: child.issuedAt,
    });
    const childAtParentEnd = evaluateCapabilityLeaseTtl({
      profile: "M4-030_LEASE_TTL_V1",
      issuedAt: child.issuedAt,
      expiresAt: child.expiresAt,
      observedAt: parent.expiresAt,
    });
    if (
      parentAtChildStart.status !== "TIME_ELIGIBLE"
      || childAtParentEnd.status !== "TIME_INELIGIBLE"
      || childAtParentEnd.reasonCode !== "LEASE_TTL_EXPIRED"
    ) return semanticFailure("ATTENUATION", "LEASE_ATTENUATION_TIME_BROADENING");
  }
  return undefined;
}

function validateUsage(chain: readonly MutableLeaseAttenuationState[]): LeaseAttenuationStoreOutcome | undefined {
  for (const state of chain) {
    const usage = evaluateCapabilityLeaseUsage({
      profile: "M4-031_LEASE_USAGE_V1",
      maxUses: state.maxUses,
      remainingUses: state.remainingUses,
    });
    if (usage.status === "FAIL_CLOSED") return normalizeUsageFailure(usage.reasonCode);
  }
  return undefined;
}

function validateMaxUses(chain: readonly MutableLeaseAttenuationState[]): LeaseAttenuationStoreOutcome | undefined {
  for (let index = 0; index + 1 < chain.length; index += 1) {
    const child = chain[index];
    const parent = chain[index + 1];
    if (child === undefined || parent === undefined) return semanticFailure("CHAIN", "LEASE_ATTENUATION_STATE_INVALID");
    if (child.maxUses > parent.maxUses) {
      return semanticFailure("ATTENUATION", "LEASE_ATTENUATION_MAX_USES_BROADENING");
    }
  }
  return undefined;
}

function normalizeUsageFailure(reasonCode: LeaseUsageFailureReason): LeaseAttenuationStoreOutcome {
  switch (reasonCode) {
    case "LEASE_USAGE_MAX_USES_INVALID":
    case "LEASE_USAGE_REMAINING_USES_INVALID":
    case "LEASE_USAGE_STATE_INVALID":
      return semanticFailure("USAGE", reasonCode);
    case "LEASE_USAGE_INPUT_INVALID":
    case "LEASE_USAGE_PROFILE_INVALID":
      return semanticFailure("CHAIN", "LEASE_ATTENUATION_STATE_INVALID");
  }
}

function validAuthorization(value: LeaseAttenuationState["authorization"]): boolean {
  return (value.kind === "policy" || value.kind === "approval" || value.kind === "lease" || value.kind === "system")
    && validRef(value.ref);
}

function hasInvalidConstraints(value: LeaseAttenuationState["constraints"]): boolean {
  if (value === undefined) return false;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return true;
  try { return Reflect.ownKeys(value).some(key => typeof key !== "string"); } catch { return true; }
}

function hasNonEmptyConstraints(value: LeaseAttenuationState["constraints"]): boolean {
  if (value === undefined) return false;
  try { return Reflect.ownKeys(value).length !== 0; } catch { return true; }
}

function sameResource(left: CanonicalResource, right: CanonicalResource): boolean {
  return left.scheme === right.scheme
    && left.locator === right.locator
    && Object.hasOwn(left, "providerIdentity") === Object.hasOwn(right, "providerIdentity")
    && left.providerIdentity === right.providerIdentity;
}

function cloneMutableState(state: LeaseAttenuationState): MutableLeaseAttenuationState {
  const resource = normalizeCapabilityResource(state.resource);
  if (!resource.ok) throw new Error("invalid resource in reference store initialization");
  return {
    leaseRef: state.leaseRef,
    subjectRef: state.subjectRef,
    ...(state.parentLeaseRef === undefined ? {} : { parentLeaseRef: state.parentLeaseRef }),
    capability: state.capability,
    resource: Object.freeze({
      scheme: resource.resource.scheme,
      locator: resource.resource.locator,
      ...(Object.hasOwn(resource.resource, "providerIdentity") ? { providerIdentity: resource.resource.providerIdentity } : {}),
    }),
    ...(state.constraints === undefined ? {} : { constraints: cloneConstraints(state.constraints) }),
    issuedAt: state.issuedAt,
    expiresAt: state.expiresAt,
    maxUses: state.maxUses,
    remainingUses: state.remainingUses,
    authorization: Object.freeze({ kind: state.authorization.kind, ref: state.authorization.ref }),
    revoked: state.revoked,
  };
}

function cloneConstraints(value: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return Reflect.ownKeys(value).length === 0 ? Object.freeze({}) : Object.freeze({ ...value });
}

function stateSnapshot(state: MutableLeaseAttenuationState): LeaseAttenuationState {
  return Object.freeze({
    leaseRef: state.leaseRef,
    subjectRef: state.subjectRef,
    ...(state.parentLeaseRef === undefined ? {} : { parentLeaseRef: state.parentLeaseRef }),
    capability: state.capability,
    resource: state.resource,
    ...(state.constraints === undefined ? {} : { constraints: state.constraints }),
    issuedAt: state.issuedAt,
    expiresAt: state.expiresAt,
    maxUses: state.maxUses,
    remainingUses: state.remainingUses,
    authorization: state.authorization,
    revoked: state.revoked,
  });
}

function revocationSnapshot(state: MutableLeaseAttenuationState): LeaseRevocationState {
  return Object.freeze({ leaseRef: state.leaseRef, revoked: state.revoked });
}

function semanticFailure(
  stage: "CHAIN" | "ATTENUATION" | "USAGE",
  reasonCode: Extract<LeaseAttenuationStoreOutcome, { status: "FAIL_CLOSED" }>["reasonCode"],
): LeaseAttenuationStoreOutcome {
  return Object.freeze({ status: "FAIL_CLOSED", stage, reasonCode });
}

function releaseReverse(releases: readonly Release[]): void {
  for (let index = releases.length - 1; index >= 0; index -= 1) releases[index]?.();
}

function compareCodePoints(left: string, right: string): number {
  const leftIterator = left[Symbol.iterator]();
  const rightIterator = right[Symbol.iterator]();
  while (true) {
    const leftNext = leftIterator.next();
    const rightNext = rightIterator.next();
    if (leftNext.done || rightNext.done) {
      if (leftNext.done && rightNext.done) return 0;
      return leftNext.done ? -1 : 1;
    }
    const leftPoint = leftNext.value.codePointAt(0) ?? 0;
    const rightPoint = rightNext.value.codePointAt(0) ?? 0;
    if (leftPoint !== rightPoint) return leftPoint - rightPoint;
  }
}

function validRef(value: string): boolean {
  let count = 0;
  for (const _codePoint of value) {
    count += 1;
    if (count > 512) return false;
  }
  return count >= 1;
}
