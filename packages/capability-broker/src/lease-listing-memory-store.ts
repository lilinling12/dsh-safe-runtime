import type {
  LeaseInventoryState,
  LeaseInventoryStore,
  LeaseInventoryStoreOutcome,
} from "./lease-listing-types.js";

/**
 * Immutable single-process reference inventory for M4-035.
 *
 * The constructor captures one detached inventory and every list call returns a
 * detached frozen snapshot. Constraint values are deliberately not traversed;
 * only their top-level own-property container is detached because M4-035 consumes
 * key presence only. This reference adapter intentionally exposes no mutation API
 * and therefore does not claim automatic state sharing with the M4-032/M4-033/
 * M4-034 reference stores. Production deployments must bind the inventory port to
 * their authoritative Lease backend when live lifecycle state is required.
 */
export class InMemoryLeaseInventoryStore implements LeaseInventoryStore {
  readonly #states: readonly LeaseInventoryState[];

  constructor(states: readonly LeaseInventoryState[] = []) {
    this.#states = Object.freeze(states.map(cloneState));
  }

  listSnapshot(maxEntries: 1024): LeaseInventoryStoreOutcome {
    if (this.#states.length > maxEntries) {
      return Object.freeze({ status: "LIMIT_EXCEEDED" });
    }
    return Object.freeze({
      status: "SNAPSHOT",
      states: Object.freeze(this.#states.map(cloneState)),
    });
  }
}

function cloneState(state: LeaseInventoryState): LeaseInventoryState {
  return Object.freeze({
    leaseRef: state.leaseRef,
    subjectRef: state.subjectRef,
    ...(state.parentLeaseRef === undefined ? {} : { parentLeaseRef: state.parentLeaseRef }),
    capability: state.capability,
    resource: Object.freeze({
      scheme: state.resource.scheme,
      locator: state.resource.locator,
      ...(state.resource.providerIdentity === undefined
        ? {}
        : { providerIdentity: state.resource.providerIdentity }),
    }),
    ...(state.constraints === undefined ? {} : { constraints: cloneConstraintContainer(state.constraints) }),
    issuedAt: state.issuedAt,
    expiresAt: state.expiresAt,
    maxUses: state.maxUses,
    remainingUses: state.remainingUses,
    authorization: Object.freeze({ kind: state.authorization.kind, ref: state.authorization.ref }),
    revoked: state.revoked,
  });
}

/**
 * Detach the only part of constraints that M4-035 observes: top-level own keys.
 *
 * Property descriptors are copied without reading accessor values and nested
 * values are not traversed. Freezing the new container prevents later caller key
 * additions/deletions from changing the inventory snapshot's constraintsState.
 */
function cloneConstraintContainer(
  constraints: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const clone = Object.create(null) as Record<PropertyKey, unknown>;
  for (const key of Reflect.ownKeys(constraints)) {
    const descriptor = Object.getOwnPropertyDescriptor(constraints, key);
    if (descriptor === undefined) {
      throw new TypeError("constraint property descriptor disappeared during snapshot capture");
    }
    if ("value" in descriptor) {
      Object.defineProperty(clone, key, {
        value: descriptor.value,
        enumerable: descriptor.enumerable,
        configurable: false,
        writable: false,
      });
    } else {
      Object.defineProperty(clone, key, {
        get: descriptor.get,
        enumerable: descriptor.enumerable,
        configurable: false,
      });
    }
  }
  return Object.freeze(clone) as Readonly<Record<string, unknown>>;
}
