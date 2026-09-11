import {
  AUDIT_DIAGNOSTIC_CODES,
  type AuditDeliverySummary,
  type AuditDiagnosticCode,
  type AuditProjectionResult,
  type DshAuditEvent,
  type DshAuditEventSink,
} from "./audit-events.js";

const MAX_OUTSTANDING = 1_024;
const MAX_COUNTER = Number.MAX_SAFE_INTEGER;

type CountName = "delivered" | "projectionRejected" | "deliveryFailed";

export interface SaturatingAuditCounterResult {
  readonly value: number;
  readonly exact: boolean;
}

/** Package-internal arithmetic shared by the dispatcher and its boundary tests. */
export function incrementAuditCounter(value: number): SaturatingAuditCounterResult {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_COUNTER) {
    return Object.freeze({ value: MAX_COUNTER, exact: false });
  }
  if (value === MAX_COUNTER) {
    return Object.freeze({ value: MAX_COUNTER, exact: false });
  }
  return Object.freeze({ value: value + 1, exact: true });
}

/**
 * Per-subscription audit delivery queue. It never retries and never surfaces a
 * sink exception outside this owned admission boundary.
 */
export class OrderedAuditEventDispatcher {
  readonly #sink: DshAuditEventSink;
  readonly #diagnostics = new Set<AuditDiagnosticCode>();
  #tail: Promise<void> = Promise.resolve();
  #outstanding = 0;
  #delivered = 0;
  #projectionRejected = 0;
  #deliveryFailed = 0;
  #countsExact = true;
  #captureStopped = false;
  #closed = false;

  constructor(sink: DshAuditEventSink) {
    this.#sink = sink;
  }

  capture(result: AuditProjectionResult): void {
    if (this.#closed || this.#captureStopped) return;
    if (result.kind === "rejected") {
      this.#recordProjectionRejection(result.code);
      return;
    }
    if (this.#outstanding >= MAX_OUTSTANDING) {
      this.#recordProjectionRejection("AUDIT_LIMIT_EXCEEDED");
      return;
    }

    this.#outstanding += 1;
    const event: DshAuditEvent = result.event;
    this.#tail = this.#tail.then(async () => {
      try {
        await this.#sink.accept(event);
        this.#increment("delivered");
      } catch {
        this.#diagnostics.add("AUDIT_SINK_FAILED");
        this.#increment("deliveryFailed");
      } finally {
        this.#outstanding -= 1;
      }
    });
  }

  closeCapture(): void {
    this.#closed = true;
  }

  drain(): Promise<AuditDeliverySummary> {
    const captured = this.#tail;
    return captured.then(() => this.#snapshot());
  }

  #recordProjectionRejection(code: Exclude<AuditDiagnosticCode, "AUDIT_SINK_FAILED">): void {
    this.#diagnostics.add(code);
    this.#increment("projectionRejected");
  }

  #increment(name: CountName): void {
    const current = name === "delivered"
      ? this.#delivered
      : name === "projectionRejected"
        ? this.#projectionRejected
        : this.#deliveryFailed;
    const next = incrementAuditCounter(current);
    if (name === "delivered") this.#delivered = next.value;
    else if (name === "projectionRejected") this.#projectionRejected = next.value;
    else this.#deliveryFailed = next.value;

    if (!next.exact) {
      this.#countsExact = false;
      this.#captureStopped = true;
      this.#diagnostics.add("AUDIT_LIMIT_EXCEEDED");
    }
  }

  #snapshot(): AuditDeliverySummary {
    const diagnostics = Object.freeze(
      AUDIT_DIAGNOSTIC_CODES.filter((code) => this.#diagnostics.has(code)),
    );
    const incomplete = this.#projectionRejected > 0
      || this.#deliveryFailed > 0
      || !this.#countsExact;
    return Object.freeze({
      delivered: this.#delivered,
      projectionRejected: this.#projectionRejected,
      deliveryFailed: this.#deliveryFailed,
      countsExact: this.#countsExact,
      status: incomplete ? "INCOMPLETE" as const : "COMPLETE" as const,
      diagnostics,
    });
  }
}
