/** Portable M4-003 bound, aligned with the v0.1 structured resource schema. */
export const RESOURCE_STRING_CODE_POINT_LIMIT = 4096 as const;

/**
 * TypeScript projection of the standard resource schemes owned by Spec 0019 and
 * the v0.1 schema. Keeping this projection local avoids making policy-engine
 * normalization depend on another package's build output; packages/protocol is
 * a language projection, not the semantic authority for these literals.
 */
export type CanonicalResourceScheme =
  | "workspace"
  | "hostfs"
  | "process"
  | "network"
  | "secret"
  | "session"
  | "config"
  | "external";

export type ResourceNormalizationFailureReason =
  | "RESOURCE_INPUT_INVALID"
  | "RESOURCE_SCHEME_UNSUPPORTED"
  | "RESOURCE_LOCATOR_INVALID"
  | "RESOURCE_PROVIDER_IDENTITY_INVALID"
  | "RESOURCE_SELECTOR_SYNTAX_INVALID"
  | "RESOURCE_LIMIT_EXCEEDED";

export type ResourceNormalizationField =
  | "resource"
  | "scheme"
  | "locator"
  | "providerIdentity"
  | "selector"
  | "locatorPattern";

/**
 * Portable exact-resource form after M4-003 structural canonicalization.
 * `providerIdentity` remains opaque and has no path/containment semantics here.
 */
export interface CanonicalResource {
  readonly scheme: CanonicalResourceScheme;
  readonly locator: string;
  readonly providerIdentity?: string;
}

/**
 * Parsed outer form of one policy resources[] selector. Pattern semantics are
 * intentionally absent until their later normative gate.
 */
export interface CanonicalResourceSelector {
  readonly scheme: CanonicalResourceScheme;
  readonly locatorPattern: string;
}

export interface ResourceNormalizationFailure {
  readonly ok: false;
  readonly reason: ResourceNormalizationFailureReason;
  readonly field: ResourceNormalizationField;
}

export interface ExactResourceNormalizationSuccess {
  readonly ok: true;
  readonly resource: CanonicalResource;
}

export interface ResourceSelectorNormalizationSuccess {
  readonly ok: true;
  readonly selector: CanonicalResourceSelector;
}

export type ExactResourceNormalizationResult =
  | ExactResourceNormalizationSuccess
  | ResourceNormalizationFailure;

export type ResourceSelectorNormalizationResult =
  | ResourceSelectorNormalizationSuccess
  | ResourceNormalizationFailure;
