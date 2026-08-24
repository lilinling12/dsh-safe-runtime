import { dshAdapterError } from "./errors.js";
import type { RuntimeEvent, RuntimeEventSink } from "./runtime-events.js";

export interface RuntimeEventDispatchFailure {
  readonly event: RuntimeEvent;
  readonly error: unknown;
}

export type RuntimeEventDispatchFailureHandler = (
  failure: RuntimeEventDispatchFailure,
) => void;

/**
 * Serializes observer delivery without allowing a slow or failing sink to
 * perturb Harness's own emit-style event producers.
 */
export class OrderedRuntimeEventDispatcher {
  readonly #sink: RuntimeEventSink;
  readonly #onFailure: RuntimeEventDispatchFailureHandler;
  #tail: Promise<void> = Promise.resolve();
  #closed = false;

  constructor(
    sink: RuntimeEventSink,
    onFailure: RuntimeEventDispatchFailureHandler,
  ) {
    this.#sink = sink;
    this.#onFailure = onFailure;
  }

  enqueue(event: RuntimeEvent): void {
    if (this.#closed) {
      throw dshAdapterError(
        "ADAPTER_EVENT_SINK_FAILED",
        "cannot enqueue a runtime event after the observation subscription was disposed",
      );
    }

    this.#tail = this.#tail.then(async () => {
      try {
        await this.#sink.accept(event);
      } catch (error: unknown) {
        try {
          this.#onFailure({ event, error });
        } catch {
          // Observation diagnostics must not break the serialized delivery chain.
        }
      }
    });
  }

  drain(): Promise<void> {
    return this.#tail;
  }

  close(): void {
    this.#closed = true;
  }
}
