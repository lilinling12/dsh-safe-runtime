import { evaluateCapabilityLeaseUsage } from "./lease-usage.js";
import type { LeaseUseState, LeaseUseStore, LeaseUseStoreOutcome } from "./lease-consume-types.js";

interface MutableLeaseUseState {
  leaseRef: string;
  maxUses: unknown;
  remainingUses: unknown;
}

function clone(state: MutableLeaseUseState): LeaseUseState {
  return Object.freeze({
    leaseRef: state.leaseRef,
    maxUses: state.maxUses,
    remainingUses: state.remainingUses,
  });
}

/**
 * Reference in-memory store for tests and single-process embeddings.
 *
 * Atomicity scope is deliberately process-local. This class is not evidence of
 * multi-process or database linearizability; real persistence adapters must
 * provide their own atomic primitive and conformance evidence.
 */
export class InMemoryLeaseUseStore implements LeaseUseStore {
  readonly #states = new Map<string, MutableLeaseUseState>();
  readonly #queues = new Map<string, Promise<void>>();

  constructor(initialStates: readonly LeaseUseState[] = []) {
    for (const state of initialStates) {
      this.#states.set(state.leaseRef, {
        leaseRef: state.leaseRef,
        maxUses: state.maxUses,
        remainingUses: state.remainingUses,
      });
    }
  }

  async consumeOne(leaseRef: string): Promise<LeaseUseStoreOutcome> {
    let release!: () => void;
    const previous = this.#queues.get(leaseRef) ?? Promise.resolve();
    const current = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => current);
    this.#queues.set(leaseRef, tail);

    await previous;
    try {
      const state = this.#states.get(leaseRef);
      if (!state) return Object.freeze({ status: "NOT_FOUND" });

      const before = clone(state);
      const usage = evaluateCapabilityLeaseUsage({
        profile: "M4-031_LEASE_USAGE_V1",
        maxUses: state.maxUses,
        remainingUses: state.remainingUses,
      });

      if (usage.status === "FAIL_CLOSED" || usage.status === "USAGE_INELIGIBLE") {
        return Object.freeze({ status: "EXHAUSTED", state: before });
      }

      const remaining = state.remainingUses;
      if (typeof remaining !== "number") return Object.freeze({ status: "EXHAUSTED", state: before });
      state.remainingUses = remaining - 1;
      return Object.freeze({ status: "CONSUMED", stateBefore: before, stateAfter: clone(state) });
    } finally {
      release();
      if (this.#queues.get(leaseRef) === tail) this.#queues.delete(leaseRef);
    }
  }

  snapshot(leaseRef: string): LeaseUseState | undefined {
    const state = this.#states.get(leaseRef);
    return state ? clone(state) : undefined;
  }
}
