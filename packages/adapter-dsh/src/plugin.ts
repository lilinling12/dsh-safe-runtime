import type { Context } from "@deepseek-ai/cordis";

import { dshAdapterError } from "./errors.js";
import {
  createDshRc5Adapter,
  type DshRc5Adapter,
  type DshRc5AdapterOptions,
} from "./public-api.js";
import type { ToolGuardHandler, ToolPolicyHandler } from "./ports.js";

const PLUGIN_NAME = "@dsh-safe/adapter-dsh/rc5" as const;
const DEFAULT_DENY_REASON = "safe-runtime plugin default deny";

type UnknownRecord = Record<PropertyKey, unknown>;

export type DshRc5PluginPolicy =
  | { readonly mode: "DENY_ALL" }
  | {
      readonly mode: "HANDLER";
      readonly handler: ToolPolicyHandler;
      readonly monotonicGuard?: ToolGuardHandler;
    };

export interface DshRc5PluginOptions {
  readonly adapter: DshRc5AdapterOptions;
  readonly policy?: DshRc5PluginPolicy;
}

/**
 * Narrow native Cordis plugin shape for the R1 Alpha bootstrap surface.
 *
 * Keeping this structural avoids exporting Cordis registry/Fiber internals as
 * part of the safe-runtime semver surface while remaining directly consumable
 * by `ctx.plugin(plugin)` on the pinned rc5 baseline.
 */
export interface DshRc5Plugin {
  readonly name: typeof PLUGIN_NAME;
  apply(ctx: Context): Promise<() => Promise<void>>;
}

interface DshRc5PluginSnapshot {
  readonly adapter: DshRc5AdapterOptions;
  readonly policy: DshRc5PluginPolicy;
}

function invalidPluginOptions(message: string): never {
  throw dshAdapterError("INVALID_PLUGIN_OPTIONS", message);
}

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

/**
 * Reads only own descriptors. Proxy traps may still run because ECMAScript
 * exposes no trap-free reflection for proxies, so every reflective operation
 * is caught and converted to a stable plugin-options failure. Accessor bodies
 * and user coercion are never invoked.
 */
function ownKeys(value: object, scope: string): readonly PropertyKey[] {
  try {
    return Reflect.ownKeys(value);
  } catch {
    return invalidPluginOptions(`${scope} must be safely inspectable`);
  }
}

function ownDataValue(
  value: object,
  key: PropertyKey,
  scope: string,
  required: boolean,
): unknown {
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(value, key);
  } catch {
    return invalidPluginOptions(`${scope} must be safely inspectable`);
  }

  if (descriptor === undefined) {
    if (required) {
      return invalidPluginOptions(`${scope} is missing a required field`);
    }
    return undefined;
  }

  if (!("value" in descriptor)) {
    return invalidPluginOptions(`${scope} must not contain accessor-backed fields`);
  }

  return descriptor.value;
}

function assertAllowedOwnKeys(
  value: object,
  allowed: ReadonlySet<string>,
  scope: string,
): void {
  for (const key of ownKeys(value, scope)) {
    if (typeof key !== "string" || !allowed.has(key)) {
      invalidPluginOptions(`${scope} contains an unsupported field`);
    }
  }
}

/**
 * Capture Adapter-owned values without executing getters. Invalid nested
 * Adapter values intentionally remain R1-002's validation responsibility, so
 * unreadable/accessor-backed Adapter fields are represented as missing values
 * and later fail with INVALID_ADAPTER_OPTIONS.
 */
function snapshotAdapterOptions(value: unknown): DshRc5AdapterOptions {
  if (typeof value !== "object" || value === null) {
    return value as DshRc5AdapterOptions;
  }

  const readNestedDataValue = (key: "digest" | "onObservationFailure"): unknown => {
    let current: object | null = value;
    const visited = new Set<object>();

    while (current !== null && !visited.has(current)) {
      visited.add(current);
      let descriptor: PropertyDescriptor | undefined;
      try {
        descriptor = Object.getOwnPropertyDescriptor(current, key);
      } catch {
        return undefined;
      }

      if (descriptor !== undefined) {
        return "value" in descriptor ? descriptor.value : undefined;
      }

      try {
        current = Object.getPrototypeOf(current) as object | null;
      } catch {
        return undefined;
      }
    }

    return undefined;
  };

  const digest = readNestedDataValue("digest");
  const onObservationFailure = readNestedDataValue("onObservationFailure");

  return Object.freeze({
    digest: digest as DshRc5AdapterOptions["digest"],
    ...(onObservationFailure === undefined
      ? {}
      : {
          onObservationFailure:
            onObservationFailure as NonNullable<DshRc5AdapterOptions["onObservationFailure"]>,
        }),
  });
}

function snapshotPolicy(value: unknown): DshRc5PluginPolicy {
  if (!isObject(value)) {
    return invalidPluginOptions("DeepSeek Harness plugin policy must be an object");
  }

  const mode = ownDataValue(value, "mode", "DeepSeek Harness plugin policy", true);

  if (mode === "DENY_ALL") {
    assertAllowedOwnKeys(value, new Set(["mode"]), "DeepSeek Harness plugin policy");
    return Object.freeze({ mode: "DENY_ALL" });
  }

  if (mode === "HANDLER") {
    assertAllowedOwnKeys(
      value,
      new Set(["mode", "handler", "monotonicGuard"]),
      "DeepSeek Harness plugin policy",
    );
    const handler = ownDataValue(
      value,
      "handler",
      "DeepSeek Harness plugin HANDLER policy",
      true,
    );
    const monotonicGuard = ownDataValue(
      value,
      "monotonicGuard",
      "DeepSeek Harness plugin HANDLER policy",
      false,
    );

    if (typeof handler !== "function") {
      return invalidPluginOptions(
        "DeepSeek Harness plugin HANDLER policy requires a function handler",
      );
    }
    if (monotonicGuard !== undefined && typeof monotonicGuard !== "function") {
      return invalidPluginOptions(
        "DeepSeek Harness plugin monotonic guard must be a function when provided",
      );
    }

    return Object.freeze({
      mode: "HANDLER",
      handler: handler as ToolPolicyHandler,
      ...(monotonicGuard === undefined
        ? {}
        : { monotonicGuard: monotonicGuard as ToolGuardHandler }),
    });
  }

  return invalidPluginOptions("DeepSeek Harness plugin policy mode is unsupported");
}

function snapshotOptions(options: DshRc5PluginOptions): DshRc5PluginSnapshot {
  if (!isObject(options)) {
    return invalidPluginOptions("DeepSeek Harness plugin options must be an object");
  }

  assertAllowedOwnKeys(
    options,
    new Set(["adapter", "policy"]),
    "DeepSeek Harness plugin options",
  );

  const adapter = ownDataValue(
    options,
    "adapter",
    "DeepSeek Harness plugin options",
    true,
  );
  const policy = ownDataValue(
    options,
    "policy",
    "DeepSeek Harness plugin options",
    false,
  );

  return Object.freeze({
    adapter: snapshotAdapterOptions(adapter),
    policy:
      policy === undefined
        ? Object.freeze({ mode: "DENY_ALL" })
        : snapshotPolicy(policy),
  });
}

function requirePolicyFeatures(
  adapter: DshRc5Adapter,
  policy: DshRc5PluginPolicy,
): void {
  if (!adapter.features.toolsPreExecute) {
    throw dshAdapterError(
      "UNSUPPORTED_ADAPTER_FEATURES",
      "DeepSeek Harness plugin requires tools pre-execute support",
    );
  }

  if (
    (policy.mode === "DENY_ALL" || policy.monotonicGuard !== undefined) &&
    !adapter.features.toolsMonotonicGuard
  ) {
    throw dshAdapterError(
      "UNSUPPORTED_ADAPTER_FEATURES",
      "DeepSeek Harness plugin requires monotonic tool guard support",
    );
  }
}

async function rollbackActivation(
  adapter: DshRc5Adapter,
  activationError: unknown,
): Promise<never> {
  try {
    await adapter.dispose();
  } catch (cleanupError) {
    throw new AggregateError(
      [activationError, cleanupError],
      "DeepSeek Harness plugin activation and cleanup both failed",
    );
  }

  throw activationError;
}

/**
 * Create a native Cordis-compatible plugin without touching Harness state.
 * Harness registrations are created only when Cordis invokes `apply()`.
 */
export function createDshRc5Plugin(options: DshRc5PluginOptions): DshRc5Plugin {
  const snapshot = snapshotOptions(options);

  return Object.freeze({
    name: PLUGIN_NAME,
    async apply(ctx: Context): Promise<() => Promise<void>> {
      const adapter: DshRc5Adapter = createDshRc5Adapter(ctx, snapshot.adapter);

      try {
        requirePolicyFeatures(adapter, snapshot.policy);

        if (snapshot.policy.mode === "DENY_ALL") {
          const denyPolicy: ToolPolicyHandler = () => ({
            kind: "DENY",
            reason: DEFAULT_DENY_REASON,
          });
          const denyGuard: ToolGuardHandler = () => ({
            kind: "DENY",
            reason: DEFAULT_DENY_REASON,
          });

          adapter.registerToolPolicy(denyPolicy);
          adapter.registerMonotonicToolGuard(denyGuard);
        } else {
          adapter.registerToolPolicy(snapshot.policy.handler);
          if (snapshot.policy.monotonicGuard !== undefined) {
            adapter.registerMonotonicToolGuard(snapshot.policy.monotonicGuard);
          }
        }
      } catch (error) {
        return rollbackActivation(adapter, error);
      }

      return async (): Promise<void> => {
        await adapter.dispose();
      };
    },
  });
}
