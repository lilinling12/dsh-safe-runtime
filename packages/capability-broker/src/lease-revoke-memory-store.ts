import type {
  LeaseRevocationState,
  LeaseRevocationStore,
  LeaseRevocationStoreOutcome,
} from "./lease-revoke-types.js";

interface MutableLeaseRevocationState {
  leaseRef: string;
  revoked: boolean;
}

function clone(state: MutableLeaseRevocationState): LeaseRevocationState {
  return Object.freeze({ leaseRef: state.leaseRef, revoked: state.revoked });
}

/**
 * Reference in-memory revocation store for tests and single-process embeddings.
 *
 * Linearizability is deliberately process-local. Persistent or multi-process
 * adapters must provide their own atomic transition and backend-specific
 * conformance evidence before claiming M4-033 guarantees.
 */
export class InMemoryLeaseRevocationStore implements LeaseRevocationStore {
  readonly #states = new Map<string, MutableLeaseRevocationState>();
  readonly #queues = new Map<string, Promise<void>>();

  constructor(initialStates: readonly LeaseRevocationState[] = []) {
    for (const state of initialStates) {
      this.#states.set(state.leaseRef, { leaseRef: state.leaseRef, revoked: state.revoked });
    }
  }

  async revokeOne(leaseRef: string): Promise<LeaseRevocationStoreOutcome> {
    let release!: () => void;
    const previous = this.#queues.get(leaseRef) ?? Promise.resolve();
    const current = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => current);
    this.#queues.set(leaseRef, tail);

    await previous;
    try {
      const state = this.#states.get(leaseRef);
      if (!state) return Object.freeze({ status: "NOT_FOUND" });
      if (state.revoked) return Object.freeze({ status: "ALREADY_REVOKED", state: clone(state) });

      const before = clone(state);
      state.revoked = true;
      return Object.freeze({ status: "REVOKED", stateBefore: before, stateAfter: clone(state) });
    } finally {
      release();
      if (this.#queues.get(leaseRef) === tail) this.#queues.delete(leaseRef);
    }
  }

  snapshot(leaseRef: string): LeaseRevocationState | undefined {
    const state = this.#states.get(leaseRef);
    return state ? clone(state) : undefined;
  }
}
