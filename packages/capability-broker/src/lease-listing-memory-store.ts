import type {
  LeaseInventoryState,
  LeaseInventoryStore,
  LeaseInventoryStoreOutcome,
} from "./lease-listing-types.js";

/**
 * Immutable single-process reference inventory for M4-035.
 *
 * The constructor captures one detached runtime snapshot and every list call
 * returns another detached frozen snapshot. Runtime own-property shape is
 * preserved rather than reconstructed from the static interface so malformed
 * evidence remains visible to the Broker's defensive validator instead of being
 * silently repaired. Constraint values are never traversed; only their top-level
 * property descriptors are detached because M4-035 consumes key presence only.
 *
 * This reference adapter intentionally exposes no mutation API and therefore does
 * not claim automatic state sharing with the M4-032/M4-033/M4-034 reference
 * stores. Production deployments must bind the inventory port to their
 * authoritative Lease backend when live lifecycle state is required.
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
  return cloneRecordPreservingShape(state, key => {
    if (key === "resource") return cloneNestedRecord;
    if (key === "authorization") return cloneNestedRecord;
    if (key === "constraints") return cloneConstraintContainer;
    return undefined;
  }) as LeaseInventoryState;
}

type ValueClone = (value: unknown) => unknown;

function cloneRecordPreservingShape(
  value: object,
  valueCloneForKey: (key: PropertyKey) => ValueClone | undefined,
): Readonly<Record<PropertyKey, unknown>> {
  const clone = Object.create(null) as Record<PropertyKey, unknown>;
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) {
      throw new TypeError("property descriptor disappeared during snapshot capture");
    }
    if ("value" in descriptor) {
      const cloneValue = valueCloneForKey(key);
      Object.defineProperty(clone, key, {
        value: cloneValue === undefined ? descriptor.value : cloneValue(descriptor.value),
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
  return Object.freeze(clone);
}

function cloneNestedRecord(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  let isArray: boolean;
  try { isArray = Array.isArray(value); } catch { return value; }
  if (isArray) return value;
  return cloneRecordPreservingShape(value, () => undefined);
}

/**
 * Detach the only part of constraints that M4-035 observes: top-level own keys.
 *
 * Property descriptors are copied without reading accessor values and nested
 * values are not traversed. Freezing the new container prevents later caller key
 * additions/deletions from changing the inventory snapshot's constraintsState.
 */
function cloneConstraintContainer(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  let isArray: boolean;
  try { isArray = Array.isArray(value); } catch { return value; }
  if (isArray) return value;
  return cloneRecordPreservingShape(value, () => undefined);
}
