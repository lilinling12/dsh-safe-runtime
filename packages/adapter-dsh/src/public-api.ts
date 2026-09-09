import type { Context } from "@deepseek-ai/cordis";

import type {
  AuditDeliverySummary,
  AuditObservationSubscription,
  DshAuditEventSink,
} from "./audit-events.js";
import { createDshRc5Adapter as createInternalDshRc5Adapter } from "./binding.js";
import { dshAdapterError } from "./errors.js";
import type { AdapterFeatureMatrix } from "./feature-matrix.js";
import type {
  ApprovalDecision,
  ApprovalRequest,
  CompletionSteerRequest,
  Disposable,
  ObservationSubscription,
  ToolGuardHandler,
  ToolPolicyHandler,
  TurnStoppingHandler,
} from "./ports.js";
import type { RuntimeEvent, RuntimeEventSink } from "./runtime-events.js";

/**
 * User-facing options for the supported DeepSeek Harness rc5 adapter.
 *
 * The deterministic clock used by source-conformance tests intentionally stays
 * inside the package-private binding. It is not part of the Alpha semver API.
 */
export interface DshRc5AdapterOptions {
  readonly digest: (value: unknown) => string;
  readonly onObservationFailure?: (
    event: RuntimeEvent | undefined,
    error: unknown,
  ) => void;
}

/**
 * Curated R1 Alpha API for the DeepSeek Harness rc5 adapter.
 *
 * This interface deliberately does not extend the broad M2 HarnessRuntimeAdapter
 * port, whose filesystem/subprocess members are internal architecture seams and
 * are not materialized by this binding.
 */
export interface DshRc5Adapter {
  readonly adapterName: "deepseek-harness";
  readonly adapterVersion: string;
  readonly harnessVersion: string;
  readonly harnessCommit?: string;
  readonly features: AdapterFeatureMatrix;

  observe(sink: RuntimeEventSink): ObservationSubscription;
  observeAudit(sink: DshAuditEventSink): AuditObservationSubscription;
  registerToolPolicy(handler: ToolPolicyHandler): Disposable;
  registerMonotonicToolGuard(handler: ToolGuardHandler): Disposable;
  registerTurnStopping(handler: TurnStoppingHandler): Disposable;
  requestApproval(request: ApprovalRequest): Promise<ApprovalDecision>;
  steerCompletion(request: CompletionSteerRequest): Promise<void>;

  /**
   * Detach every adapter-owned Harness registration and drain child observation
   * work accepted before disposal. Repeated and concurrent calls share the same
   * teardown completion.
   */
  dispose(): Promise<void>;
}

type RegistrationDisposer = () => void;
type ChildTeardown = () => Promise<void>;
type UnknownFunction = (...args: unknown[]) => unknown;

function validateOptions(options: DshRc5AdapterOptions): void {
  if (typeof options !== "object" || options === null) {
    throw dshAdapterError(
      "INVALID_ADAPTER_OPTIONS",
      "DeepSeek Harness adapter options must be an object",
    );
  }
  if (typeof options.digest !== "function") {
    throw dshAdapterError(
      "INVALID_ADAPTER_OPTIONS",
      "DeepSeek Harness adapter digest must be a function",
    );
  }
  if (
    options.onObservationFailure !== undefined
    && typeof options.onObservationFailure !== "function"
  ) {
    throw dshAdapterError(
      "INVALID_ADAPTER_OPTIONS",
      "DeepSeek Harness observation failure callback must be a function when provided",
    );
  }
}

function callMethod(
  target: object,
  property: PropertyKey,
  args: unknown[],
): unknown {
  const method = Reflect.get(target, property, target);
  if (typeof method !== "function") {
    throw new TypeError(`DeepSeek Harness context member ${String(property)} is not callable`);
  }
  return Reflect.apply(method as UnknownFunction, target, args);
}

function managedRegistration(
  rawDispose: RegistrationDisposer,
  registrations: Set<RegistrationDisposer>,
): RegistrationDisposer {
  let active = true;
  const dispose = (): void => {
    if (!active) return;
    active = false;
    registrations.delete(dispose);
    rawDispose();
  };
  registrations.add(dispose);
  return dispose;
}

function createManagedTools(
  tools: object,
  registrations: Set<RegistrationDisposer>,
): object {
  return new Proxy(tools, {
    get(target, property) {
      if (property === "guard") {
        return (...args: unknown[]): RegistrationDisposer => {
          const raw = callMethod(target, property, args);
          if (typeof raw !== "function") {
            throw new TypeError("DeepSeek Harness tools.guard did not return a disposer");
          }
          return managedRegistration(raw as RegistrationDisposer, registrations);
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function"
        ? (value as UnknownFunction).bind(target)
        : value;
    },
  });
}

/**
 * Wrap only the registration seams used by the rc5 binding. Other Context
 * members remain bound to the caller-owned Context so this facade never takes
 * lifecycle ownership of Harness itself.
 */
function createManagedContext(
  ctx: Context,
  registrations: Set<RegistrationDisposer>,
): Context {
  let managedTools: object | undefined;

  return new Proxy(ctx, {
    get(target, property) {
      if (property === "tools") {
        const tools = Reflect.get(target, property, target);
        if (typeof tools !== "object" || tools === null) return tools;
        managedTools ??= createManagedTools(tools, registrations);
        return managedTools;
      }
      if (property === "on") {
        return (...args: unknown[]): RegistrationDisposer => {
          const raw = callMethod(target, property, args);
          if (typeof raw !== "function") {
            throw new TypeError("DeepSeek Harness context.on did not return a disposer");
          }
          return managedRegistration(raw as RegistrationDisposer, registrations);
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function"
        ? (value as UnknownFunction).bind(target)
        : value;
    },
  }) as Context;
}

function safeObservationFailureCallback(
  callback: DshRc5AdapterOptions["onObservationFailure"],
): DshRc5AdapterOptions["onObservationFailure"] {
  if (callback === undefined) return undefined;
  return (event, error): void => {
    try {
      callback(event, error);
    } catch {
      // Diagnostics are observational only. A diagnostic callback failure must
      // never become an authorization or Harness event-path failure.
    }
  };
}

function ownDisposable(
  disposable: Disposable,
  children: Set<ChildTeardown>,
): Disposable {
  let disposal: Promise<void> | undefined;
  const teardown = (): Promise<void> => {
    if (disposal !== undefined) return disposal;
    const task = Promise.resolve()
      .then(() => disposable.dispose())
      .then(() => undefined)
      .finally(() => children.delete(teardown));
    disposal = task;
    return task;
  };
  children.add(teardown);
  return Object.freeze({ dispose: teardown });
}

function ownObservation(
  subscription: ObservationSubscription,
  children: Set<ChildTeardown>,
): ObservationSubscription {
  let disposal: Promise<void> | undefined;
  const teardown = (): Promise<void> => {
    if (disposal !== undefined) return disposal;
    const task = Promise.resolve(subscription.dispose())
      .then(() => undefined)
      .finally(() => children.delete(teardown));
    disposal = task;
    return task;
  };
  children.add(teardown);
  return Object.freeze({
    drain: () => subscription.drain(),
    dispose: teardown,
  });
}

function ownAuditObservation(
  subscription: AuditObservationSubscription,
  children: Set<ChildTeardown>,
): AuditObservationSubscription {
  let disposal: Promise<AuditDeliverySummary> | undefined;
  const dispose = (): Promise<AuditDeliverySummary> => {
    if (disposal !== undefined) return disposal;
    const task = subscription.dispose().finally(() => children.delete(teardown));
    disposal = task;
    return task;
  };
  const teardown = async (): Promise<void> => {
    await dispose();
  };
  children.add(teardown);
  return Object.freeze({
    drain: () => subscription.drain(),
    dispose,
  });
}

function disposeRegistrations(
  registrations: Set<RegistrationDisposer>,
): unknown | undefined {
  let firstFailure: unknown | undefined;
  const snapshot = [...registrations];
  for (let index = snapshot.length - 1; index >= 0; index -= 1) {
    try {
      snapshot[index]?.();
    } catch (error: unknown) {
      firstFailure ??= error;
    }
  }
  return firstFailure;
}

async function disposeChildren(
  children: Set<ChildTeardown>,
): Promise<unknown | undefined> {
  let firstFailure: unknown | undefined;
  const snapshot = [...children];
  for (let index = snapshot.length - 1; index >= 0; index -= 1) {
    try {
      await snapshot[index]?.();
    } catch (error: unknown) {
      firstFailure ??= error;
    }
  }
  return firstFailure;
}

/**
 * Construct the supported DeepSeek Harness rc5 adapter through the intentional
 * R1 Alpha public boundary.
 */
export function createDshRc5Adapter(
  ctx: Context,
  options: DshRc5AdapterOptions,
): DshRc5Adapter {
  // Validate all locally knowable user input before touching Harness.
  validateOptions(options);

  const registrations = new Set<RegistrationDisposer>();
  const children = new Set<ChildTeardown>();
  const managedContext = createManagedContext(ctx, registrations);
  const onObservationFailure = safeObservationFailureCallback(options.onObservationFailure);

  let internal: ReturnType<typeof createInternalDshRc5Adapter>;
  try {
    internal = createInternalDshRc5Adapter(managedContext, {
      digest: options.digest,
      ...(onObservationFailure === undefined ? {} : { onObservationFailure }),
    });
  } catch (error: unknown) {
    // Construction is atomic from the caller's ownership perspective. Best
    // effort rollback continues through every registration and preserves the
    // original construction failure as the primary diagnostic.
    disposeRegistrations(registrations);
    throw error;
  }

  let state: "LIVE" | "DISPOSING" | "DISPOSED" = "LIVE";
  let disposePromise: Promise<void> | undefined;

  const assertLive = (): void => {
    if (state !== "LIVE") {
      throw dshAdapterError(
        "ADAPTER_DISPOSED",
        "DeepSeek Harness adapter is disposing or disposed",
      );
    }
  };

  const dispose = (): Promise<void> => {
    if (disposePromise !== undefined) return disposePromise;
    state = "DISPOSING";
    disposePromise = (async (): Promise<void> => {
      const registrationFailure = disposeRegistrations(registrations);
      const childFailure = await disposeChildren(children);
      state = "DISPOSED";
      if (registrationFailure !== undefined) throw registrationFailure;
      if (childFailure !== undefined) throw childFailure;
    })();
    return disposePromise;
  };

  const adapter: DshRc5Adapter = {
    adapterName: internal.adapterName,
    adapterVersion: internal.adapterVersion,
    harnessVersion: internal.harnessVersion,
    ...(internal.harnessCommit === undefined ? {} : { harnessCommit: internal.harnessCommit }),
    features: internal.features,

    observe(sink) {
      assertLive();
      return ownObservation(internal.observe(sink), children);
    },

    observeAudit(sink) {
      assertLive();
      return ownAuditObservation(internal.observeAudit(sink), children);
    },

    registerToolPolicy(handler) {
      assertLive();
      return ownDisposable(internal.registerToolPolicy(handler), children);
    },

    registerMonotonicToolGuard(handler) {
      assertLive();
      if (internal.registerMonotonicToolGuard === undefined) {
        throw dshAdapterError(
          "UNSUPPORTED_ADAPTER_FEATURES",
          "DeepSeek Harness rc5 monotonic tool guard is unavailable",
        );
      }
      return ownDisposable(internal.registerMonotonicToolGuard(handler), children);
    },

    registerTurnStopping(handler) {
      assertLive();
      return ownDisposable(internal.registerTurnStopping(handler), children);
    },

    requestApproval(request) {
      assertLive();
      return internal.requestApproval(request);
    },

    steerCompletion(request) {
      assertLive();
      return internal.steerCompletion(request);
    },

    dispose,
  };

  return Object.freeze(adapter);
}
