export type AuditScalar = null | boolean | number | string;

export type AuditValue =
  | AuditScalar
  | readonly AuditValue[]
  | { readonly [key: string]: AuditValue };

export interface AuditRecord {
  readonly [key: string]: AuditValue;
}

export interface LedgerEntry {
  readonly sequence: number;
  readonly record: Readonly<AuditRecord>;
}

export type AppendOutcome =
  | { readonly kind: "APPENDED"; readonly sequence: number }
  | { readonly kind: "NOT_APPENDED"; readonly reason: string }
  | { readonly kind: "INDETERMINATE"; readonly reason: string };

export type AppendPublicationObservation =
  | { readonly kind: "PUBLISHED"; readonly sequence: number }
  | { readonly kind: "NOT_PUBLISHED"; readonly reason: string }
  | { readonly kind: "UNKNOWN"; readonly reason: string };

export const APPEND_OUTCOME_KINDS = Object.freeze([
  "APPENDED",
  "NOT_APPENDED",
  "INDETERMINATE",
] as const);

export interface AppendOnlyAuditStore {
  append(record: Readonly<AuditRecord>): Promise<AppendOutcome>;
  snapshot(): readonly Readonly<LedgerEntry>[];
}

/**
 * Convert a backend publication observation into the only portable M5-001
 * append outcomes. UNKNOWN deliberately remains indeterminate: callers cannot
 * safely convert an ambiguous publication boundary into success or failure.
 */
export function classifyAppendPublication(
  observation: AppendPublicationObservation,
): AppendOutcome {
  switch (observation.kind) {
    case "PUBLISHED": {
      if (!Number.isSafeInteger(observation.sequence) || observation.sequence < 0) {
        throw new RangeError("published append sequence must be a non-negative safe integer");
      }
      return Object.freeze({ kind: "APPENDED", sequence: observation.sequence });
    }
    case "NOT_PUBLISHED":
      return Object.freeze({ kind: "NOT_APPENDED", reason: observation.reason });
    case "UNKNOWN":
      return Object.freeze({ kind: "INDETERMINATE", reason: observation.reason });
  }
}

function cloneAuditValue(value: AuditValue, ancestors: Set<object>): AuditValue {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return value;
  }

  if (typeof value !== "object") {
    throw new TypeError("audit record contains a non-structured value");
  }
  if (ancestors.has(value)) {
    throw new TypeError("audit record contains a cyclic value");
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return Object.freeze(value.map((item) => cloneAuditValue(item, ancestors)));
    }

    // Audit records are opaque structured data. A null-prototype target preserves
    // own keys such as `__proto__` as ordinary data instead of invoking Object's
    // legacy prototype setter while establishing store-owned immutable copies.
    const copy = Object.create(null) as Record<string, AuditValue>;
    for (const [key, item] of Object.entries(value)) {
      copy[key] = cloneAuditValue(item, ancestors);
    }
    return Object.freeze(copy);
  } finally {
    ancestors.delete(value);
  }
}

function cloneAuditRecord(record: Readonly<AuditRecord>): Readonly<AuditRecord> {
  const copied = cloneAuditValue(record, new Set<object>());
  if (copied === null || typeof copied !== "object" || Array.isArray(copied)) {
    throw new TypeError("audit record must be an object");
  }
  return copied as Readonly<AuditRecord>;
}

/**
 * Runtime-neutral reference implementation of the M5-001 append-only state
 * machine. It provides process-memory publication only; it does not claim fsync,
 * crash durability, deduplication, canonicalization, digests, or hash chaining.
 */
export class InMemoryAppendOnlyAuditStore implements AppendOnlyAuditStore {
  readonly #entries: Readonly<LedgerEntry>[] = [];
  #tail: Promise<void> = Promise.resolve();

  append(record: Readonly<AuditRecord>): Promise<AppendOutcome> {
    let ownedRecord: Readonly<AuditRecord>;
    try {
      ownedRecord = cloneAuditRecord(record);
    } catch {
      return Promise.resolve(
        Object.freeze({ kind: "NOT_APPENDED", reason: "INVALID_RECORD" }),
      );
    }

    const operation = this.#tail.then((): AppendOutcome => {
      const sequence = this.#entries.length;
      const entry = Object.freeze({ sequence, record: ownedRecord });
      this.#entries.push(entry);
      return classifyAppendPublication({ kind: "PUBLISHED", sequence });
    });

    this.#tail = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  snapshot(): readonly Readonly<LedgerEntry>[] {
    return Object.freeze([...this.#entries]);
  }
}
