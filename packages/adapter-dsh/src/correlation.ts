export interface CorrelationKey {
  readonly sessionRef: string;
  readonly turnRef?: string;
  readonly stepRef?: string;
  readonly callRef?: string;
}

export interface CorrelationRecord extends CorrelationKey {
  readonly adapterEventRef: string;
  readonly durableSequence?: number;
  readonly processLocalTokenRef?: string;
}

/**
 * Process-local execution tokens are deliberately not persisted. This registry
 * stores only caller-provided opaque references and drops token associations on
 * disposal/restart.
 */
export class CorrelationRegistry {
  readonly #records = new Map<string, CorrelationRecord>();

  put(record: CorrelationRecord): void {
    this.#records.set(record.adapterEventRef, Object.freeze({ ...record }));
  }

  get(adapterEventRef: string): CorrelationRecord | undefined {
    return this.#records.get(adapterEventRef);
  }

  delete(adapterEventRef: string): boolean {
    return this.#records.delete(adapterEventRef);
  }

  clear(): void {
    this.#records.clear();
  }
}
