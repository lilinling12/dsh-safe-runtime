import type { PolicyRuleEffect } from "./effect-resolution-types.js";
import type {
  DefaultDenyFailClosed,
  DefaultDenyFailureReason,
  DefaultDenyResult,
} from "./default-deny-types.js";

const RESOLVED_KEYS = new Set(["ok", "status", "effect"]);
const NO_APPLICABLE_KEYS = new Set(["ok", "status"]);

function failClosed(reason: DefaultDenyFailureReason): DefaultDenyFailClosed {
  return Object.freeze({
    ok: false,
    status: "FAIL_CLOSED",
    effect: "deny",
    reason,
  });
}

function finalized(effect: PolicyRuleEffect): DefaultDenyResult {
  return Object.freeze({ ok: true, status: "FINALIZED", effect });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyOwnStringKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: ReadonlySet<string>,
): boolean {
  return Reflect.ownKeys(value).every(
    (key) => typeof key === "string" && allowed.has(key),
  );
}

function isPolicyRuleEffect(value: unknown): value is PolicyRuleEffect {
  return value === "deny" || value === "ask" || value === "allow";
}

/**
 * Finalize only the v0.1 default-deny fragment after a successful M4-005 result.
 *
 * The default effect is validated first on purpose. A runtime path that bypasses
 * M4-002 must never turn a schema-invalid policy into permission merely because
 * another fragment of that invalid policy happened to resolve `allow` or `ask`.
 */
export function finalizeDefaultDeny(
  effectResolutionInput: unknown,
  defaultEffectInput?: unknown,
): DefaultDenyResult {
  if (defaultEffectInput !== "deny") {
    return failClosed("DEFAULT_EFFECT_CONFIG_INVALID");
  }

  if (!isRecord(effectResolutionInput)) {
    return failClosed("DEFAULT_DENY_INPUT_INVALID");
  }

  const status = Object.hasOwn(effectResolutionInput, "status")
    ? effectResolutionInput["status"]
    : undefined;
  const ok = Object.hasOwn(effectResolutionInput, "ok")
    ? effectResolutionInput["ok"]
    : undefined;

  // Consume the native TypeScript M4-005 success projection directly. `ok` is
  // language-projection metadata, not an additional portable policy semantic.
  if (ok !== true) {
    return failClosed("DEFAULT_DENY_INPUT_INVALID");
  }

  if (status === "RESOLVED") {
    if (!hasOnlyOwnStringKeys(effectResolutionInput, RESOLVED_KEYS)) {
      return failClosed("DEFAULT_DENY_INPUT_INVALID");
    }

    const effect = Object.hasOwn(effectResolutionInput, "effect")
      ? effectResolutionInput["effect"]
      : undefined;
    if (!isPolicyRuleEffect(effect)) {
      return failClosed("DEFAULT_DENY_INPUT_INVALID");
    }
    return finalized(effect);
  }

  if (status === "NO_APPLICABLE_RULES") {
    if (!hasOnlyOwnStringKeys(effectResolutionInput, NO_APPLICABLE_KEYS)) {
      return failClosed("DEFAULT_DENY_INPUT_INVALID");
    }
    return finalized("deny");
  }

  return failClosed("DEFAULT_DENY_INPUT_INVALID");
}
