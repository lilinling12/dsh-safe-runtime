import type {
  ToolGuardDecision,
  ToolGuardHandler,
  ToolPolicyRequest,
} from "./ports.js";

export const MONOTONIC_TOOL_GUARD_FAIL_CLOSED_REASON =
  "safe-runtime monotonic guard failed closed" as const;

const FAIL_CLOSED_DECISION: ToolGuardDecision = Object.freeze({
  kind: "DENY",
  reason: MONOTONIC_TOOL_GUARD_FAIL_CLOSED_REASON,
});

type OwnDataPropertyRead =
  | { readonly status: "VALUE"; readonly value: unknown }
  | { readonly status: "INVALID" };

/**
 * Read one own data property without invoking accessors or coercion hooks.
 *
 * Adapter handlers are same-process JavaScript callbacks and can bypass their
 * static TypeScript contract at runtime. Descriptor inspection therefore forms
 * part of the fail-closed boundary rather than ordinary property access.
 */
function readOwnDataProperty(
  value: object,
  key: PropertyKey,
): OwnDataPropertyRead {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor)) {
      return { status: "INVALID" };
    }
    return { status: "VALUE", value: descriptor.value };
  } catch {
    return { status: "INVALID" };
  }
}

/**
 * Detect a Promise/thenable surface without reading `value.then`.
 *
 * Walking descriptors also rejects accessor-backed or unreadable `then`
 * properties without executing them. Prototype/descriptor traps are treated as
 * invalid input because a security boundary must not turn unreadable state into
 * guard abstention.
 */
function hasThenableSurface(value: object): boolean {
  const seen = new Set<object>();
  let current: object | null = value;

  try {
    while (current !== null) {
      if (seen.has(current)) return true;
      seen.add(current);

      const descriptor = Object.getOwnPropertyDescriptor(current, "then");
      if (descriptor !== undefined) {
        if (!("value" in descriptor)) return true;
        if (typeof descriptor.value === "function") return true;
      }

      current = Object.getPrototypeOf(current);
    }
  } catch {
    return true;
  }

  return false;
}

/**
 * Materialize the synchronous runtime result of a monotonic tool-guard handler.
 *
 * Unknown, async, accessor-backed, or unreadable values are hard failures. They
 * must never degrade to Harness `undefined`, because `undefined` means the guard
 * abstains and would reopen dispatch precisely when the safety decision failed.
 */
export function normalizeToolGuardDecision(value: unknown): ToolGuardDecision {
  if (typeof value !== "object" || value === null) {
    return FAIL_CLOSED_DECISION;
  }
  if (hasThenableSurface(value)) return FAIL_CLOSED_DECISION;

  const kind = readOwnDataProperty(value, "kind");
  if (kind.status !== "VALUE") return FAIL_CLOSED_DECISION;

  if (kind.value === "ALLOW") {
    return { kind: "ALLOW" };
  }

  if (kind.value !== "DENY") return FAIL_CLOSED_DECISION;

  const reason = readOwnDataProperty(value, "reason");
  if (reason.status !== "VALUE" || typeof reason.value !== "string") {
    return FAIL_CLOSED_DECISION;
  }

  return { kind: "DENY", reason: reason.value };
}

/**
 * Evaluate one synchronous hard-invariant handler through the runtime-shape
 * boundary. Handler failures and malformed JavaScript returns share the same
 * stable fail-closed result and never leak caller error details.
 */
export function evaluateToolGuardHandler(
  handler: ToolGuardHandler,
  request: Readonly<ToolPolicyRequest>,
): ToolGuardDecision {
  try {
    return normalizeToolGuardDecision(handler(request));
  } catch {
    return FAIL_CLOSED_DECISION;
  }
}
