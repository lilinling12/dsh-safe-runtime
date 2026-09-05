import {
  RESOURCE_STRING_CODE_POINT_LIMIT,
  type CanonicalResourceScheme,
  type ExactResourceNormalizationResult,
  type ResourceNormalizationFailure,
  type ResourceNormalizationFailureReason,
  type ResourceNormalizationField,
  type ResourceSelectorNormalizationResult,
} from "./resource-normalization-types.js";

const EXACT_RESOURCE_KEYS = new Set(["scheme", "locator", "providerIdentity"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isResourceScheme(value: unknown): value is CanonicalResourceScheme {
  return (
    value === "workspace" ||
    value === "hostfs" ||
    value === "process" ||
    value === "network" ||
    value === "secret" ||
    value === "session" ||
    value === "config" ||
    value === "external"
  );
}

function failure(
  reason: ResourceNormalizationFailureReason,
  field: ResourceNormalizationField,
): ResourceNormalizationFailure {
  return Object.freeze({ ok: false, reason, field });
}

function hasUnexpectedResourceKey(value: Readonly<Record<string, unknown>>): boolean {
  return Reflect.ownKeys(value).some(
    (key) => typeof key !== "string" || !EXACT_RESOURCE_KEYS.has(key),
  );
}

type PortableStringStatus = "VALID" | "INVALID" | "LIMIT_EXCEEDED";

/**
 * Inspect code points without materializing an Array.from() copy. This keeps the
 * limit check bounded even when an invalid caller bypasses the JSON schema.
 */
function inspectPortableString(value: unknown): PortableStringStatus {
  if (typeof value !== "string" || value.length === 0) {
    return "INVALID";
  }

  let codePoints = 0;
  for (const character of value) {
    codePoints += 1;
    if (codePoints > RESOURCE_STRING_CODE_POINT_LIMIT) {
      return "LIMIT_EXCEEDED";
    }

    const point = character.codePointAt(0);
    if (point === undefined || point <= 0x1f || point === 0x7f) {
      return "INVALID";
    }
  }

  return "VALID";
}

function validatePortableString(
  value: unknown,
  field: ResourceNormalizationField,
  invalidReason: ResourceNormalizationFailureReason,
): ResourceNormalizationFailure | undefined {
  const status = inspectPortableString(value);
  if (status === "VALID") {
    return undefined;
  }
  if (status === "LIMIT_EXCEEDED") {
    return failure("RESOURCE_LIMIT_EXCEEDED", field);
  }
  return failure(invalidReason, field);
}

/**
 * Canonicalize one exact CapabilityResource structurally. Only own data
 * properties participate in the portable structure: inherited prototype values
 * are not resource fields and must never become authorization input.
 *
 * No host/path/URL normalization is allowed here; accepted locator and provider
 * token code points are preserved exactly.
 */
export function normalizeCapabilityResource(input: unknown): ExactResourceNormalizationResult {
  if (!isRecord(input) || hasUnexpectedResourceKey(input)) {
    return failure("RESOURCE_INPUT_INVALID", "resource");
  }

  const scheme = Object.hasOwn(input, "scheme") ? input["scheme"] : undefined;
  if (!isResourceScheme(scheme)) {
    return failure("RESOURCE_SCHEME_UNSUPPORTED", "scheme");
  }

  const locator = Object.hasOwn(input, "locator") ? input["locator"] : undefined;
  const locatorFailure = validatePortableString(locator, "locator", "RESOURCE_LOCATOR_INVALID");
  if (locatorFailure !== undefined) {
    return locatorFailure;
  }

  const hasProviderIdentity = Object.hasOwn(input, "providerIdentity");
  const providerIdentity = hasProviderIdentity ? input["providerIdentity"] : undefined;
  if (hasProviderIdentity) {
    const providerFailure = validatePortableString(
      providerIdentity,
      "providerIdentity",
      "RESOURCE_PROVIDER_IDENTITY_INVALID",
    );
    if (providerFailure !== undefined) {
      return providerFailure;
    }
  }

  // validatePortableString() proves these runtime values are strings before the
  // localized assertions. No coercion or lossy rewriting occurs.
  const resource = Object.freeze({
    scheme,
    locator: locator as string,
    ...(hasProviderIdentity ? { providerIdentity: providerIdentity as string } : {}),
  });

  return Object.freeze({ ok: true, resource });
}

/**
 * Parse one policy resources[] selector at the first :// delimiter. The locator
 * pattern remains opaque at M4-003; wildcard matching/specificity are later gates.
 */
export function normalizePolicyResourceSelector(
  input: unknown,
): ResourceSelectorNormalizationResult {
  if (typeof input !== "string") {
    return failure("RESOURCE_INPUT_INVALID", "selector");
  }

  const delimiter = input.indexOf("://");
  if (delimiter < 0) {
    return failure("RESOURCE_SELECTOR_SYNTAX_INVALID", "selector");
  }

  const scheme = input.slice(0, delimiter);
  if (!isResourceScheme(scheme)) {
    return failure("RESOURCE_SCHEME_UNSUPPORTED", "scheme");
  }

  const locatorPattern = input.slice(delimiter + 3);
  const locatorFailure = validatePortableString(
    locatorPattern,
    "locatorPattern",
    "RESOURCE_LOCATOR_INVALID",
  );
  if (locatorFailure !== undefined) {
    return locatorFailure;
  }

  return Object.freeze({
    ok: true,
    selector: Object.freeze({ scheme, locatorPattern }),
  });
}
