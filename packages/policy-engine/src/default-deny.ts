import type { PolicyRuleEffect } from "./effect-resolution-types.js";
import type {
  DefaultDenyFailClosed,
  DefaultDenyFailureReason,
  DefaultDenyResult,
} from "./default-deny-types.js";

const RESOLVED_KEYS = new Set(["ok", "status", "effect"]);
const NO_APPLICABLE_KEYS = new Set(["ok", "status"]);

interface OwnDataProperty {
  readonly ok: true;
  readonly value: unknown;
}

interface MissingOrAccessorProperty {
  readonly ok: false;
}

type OwnDataPropertyRead = OwnDataProperty | MissingOrAccessorProperty;

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
  if (typeof value !== "object" || value === null) {
    return false;
  }
  try {
    return !Array.isArray(value);
  } catch {
    return false;
  }
}

/**
 * Authorization inputs must be ordinary own data properties. Reading through
 * `obj[key]` after only an own-property test can still execute an accessor
 * getter. Descriptor reads preserve fail-closed behavior without invoking such
 * code; proxy/descriptor failures are treated as invalid input.
 */
function readOwnDataProperty(
  value: Readonly<Record<string, unknown>>,
  key: string,
): OwnDataPropertyRead {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor)) {
      return { ok: false };
    }
    return { ok: true, value: descriptor.value };
  } catch {
    return { ok: false };
  }
}

function hasOnlyOwnStringKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: ReadonlySet<string>,
): boolean {
  try {
    return Reflect.ownKeys(value).every(
      (key) => typeof key === "string" && allowed.has(key),
    );
  } catch {
    return false;
  }
}

function isPolicyRuleEffect(value: unknown): value is PolicyRuleEffect {
  return value === "deny" || value === "ask" || value === "allow";
}

/**
 * Validate only the Core default-effect invariant, not the full CapabilityPolicy
 * schema. Receiving the policy-spec object rather than a pre-extracted scalar is
 * security-significant: own-property presence must survive this boundary so an
 * inherited or accessor-backed value cannot disguise a missing JSON data field.
 */
function hasValidDefaultEffect(policySpecInput: unknown): boolean {
  if (!isRecord(policySpecInput)) {
    return false;
  }
  const defaultEffect = readOwnDataProperty(policySpecInput, "defaultEffect");
  return defaultEffect.ok && defaultEffect.value === "deny";
}

/**
 * Finalize only the v0.1 default-deny fragment after a successful M4-005 result.
 *
 * Default-effect presence/value is validated first on purpose. A runtime path
 * that bypasses M4-002 must never turn a missing or invalid default configuration
 * into permission merely because another processing fragment resolved `allow`.
 */
export function finalizeDefaultDeny(
  effectResolutionInput: unknown,
  policySpecInput: unknown,
): DefaultDenyResult {
  if (!hasValidDefaultEffect(policySpecInput)) {
    return failClosed("DEFAULT_EFFECT_CONFIG_INVALID");
  }

  if (!isRecord(effectResolutionInput)) {
    return failClosed("DEFAULT_DENY_INPUT_INVALID");
  }

  const status = readOwnDataProperty(effectResolutionInput, "status");
  const ok = readOwnDataProperty(effectResolutionInput, "ok");

  // Consume the native TypeScript M4-005 success projection directly. `ok` is
  // language-projection metadata, not an additional portable policy semantic.
  if (!ok.ok || ok.value !== true || !status.ok) {
    return failClosed("DEFAULT_DENY_INPUT_INVALID");
  }

  if (status.value === "RESOLVED") {
    if (!hasOnlyOwnStringKeys(effectResolutionInput, RESOLVED_KEYS)) {
      return failClosed("DEFAULT_DENY_INPUT_INVALID");
    }

    const effect = readOwnDataProperty(effectResolutionInput, "effect");
    if (!effect.ok || !isPolicyRuleEffect(effect.value)) {
      return failClosed("DEFAULT_DENY_INPUT_INVALID");
    }
    return finalized(effect.value);
  }

  if (status.value === "NO_APPLICABLE_RULES") {
    if (!hasOnlyOwnStringKeys(effectResolutionInput, NO_APPLICABLE_KEYS)) {
      return failClosed("DEFAULT_DENY_INPUT_INVALID");
    }
    return finalized("deny");
  }

  return failClosed("DEFAULT_DENY_INPUT_INVALID");
}
