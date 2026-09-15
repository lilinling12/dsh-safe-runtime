import { finalizeDefaultDeny } from "./default-deny.js";
import { resolveApplicableRuleEffects } from "./effect-resolution.js";
import type { PolicyRuleEffect } from "./effect-resolution-types.js";
import { compareUnicodeCodePointStrings } from "./rule-ordering.js";
import type {
  PolicyEffectExplainFailureReason,
  PolicyEffectExplanation,
  PolicyEffectExplanationBasis,
  PolicyEffectExplanationReasonCode,
  PolicyEffectExplanationResult,
} from "./policy-effect-explanation-types.js";

interface OwnDataProperty {
  readonly ok: true;
  readonly value: unknown;
}

interface MissingOrAccessorProperty {
  readonly ok: false;
}

type OwnDataPropertyRead = OwnDataProperty | MissingOrAccessorProperty;

interface MaterializedExplanationInput {
  readonly bands: readonly unknown[];
  readonly effects: readonly unknown[];
}

interface MaterializationSuccess {
  readonly ok: true;
  readonly input: MaterializedExplanationInput;
}

interface MaterializationFailure {
  readonly ok: false;
}

type MaterializationResult = MaterializationSuccess | MaterializationFailure;

interface MaterializedValueSuccess {
  readonly ok: true;
  readonly value: unknown;
}

interface MaterializedValueFailure {
  readonly ok: false;
}

type MaterializedValueResult = MaterializedValueSuccess | MaterializedValueFailure;

function failed(reasonCode: PolicyEffectExplainFailureReason): PolicyEffectExplanationResult {
  return Object.freeze({ ok: false, status: "EXPLAIN_FAILED", reasonCode });
}

function explained(
  effect: PolicyRuleEffect,
  basis: PolicyEffectExplanationBasis,
  reasonCode: PolicyEffectExplanationReasonCode,
  contributingRuleIds: readonly string[],
): PolicyEffectExplanation {
  const detachedRuleIds = Object.freeze([...contributingRuleIds]);
  return Object.freeze({
    ok: true,
    status: "EXPLAINED",
    effect,
    basis,
    reasonCode,
    contributingRuleIds: detachedRuleIds,
  });
}

function readOwnDataProperty(value: object, key: PropertyKey): OwnDataPropertyRead {
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

function isArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safelyClassifyObject(
  value: unknown,
): "primitive" | "array" | "record" | "invalid" {
  if (typeof value !== "object" || value === null) {
    return "primitive";
  }
  try {
    return Array.isArray(value) ? "array" : "record";
  } catch {
    return "invalid";
  }
}

function isCanonicalArrayIndexKey(key: string, length: number): boolean {
  if (key === "0") {
    return length > 0;
  }
  if (key.length === 0 || key.length > 10 || key.charCodeAt(0) === 48) {
    return false;
  }
  for (let index = 0; index < key.length; index += 1) {
    const code = key.charCodeAt(index);
    if (code < 48 || code > 57) {
      return false;
    }
  }
  const numeric = Number(key);
  return Number.isInteger(numeric) && numeric >= 0 && numeric < length && String(numeric) === key;
}

/**
 * Snapshot an array without reading through ordinary property access. This
 * rejects sparse/accessor-backed arrays and named/symbol properties before the
 * M4-005 resolver can observe JavaScript-only object behavior.
 */
function snapshotArray(value: unknown): readonly unknown[] | undefined {
  let arrayValue: readonly unknown[];
  try {
    if (!Array.isArray(value)) {
      return undefined;
    }
    arrayValue = value;
  } catch {
    return undefined;
  }

  let keys: readonly PropertyKey[];
  try {
    keys = Reflect.ownKeys(arrayValue);
  } catch {
    return undefined;
  }

  const lengthProperty = readOwnDataProperty(arrayValue, "length");
  if (
    !lengthProperty.ok ||
    typeof lengthProperty.value !== "number" ||
    !Number.isSafeInteger(lengthProperty.value) ||
    lengthProperty.value < 0
  ) {
    return undefined;
  }
  const length = lengthProperty.value;

  let indexKeyCount = 0;
  for (const key of keys) {
    if (key === "length") {
      continue;
    }
    if (typeof key !== "string" || !isCanonicalArrayIndexKey(key, length)) {
      return undefined;
    }
    indexKeyCount += 1;
  }
  if (indexKeyCount !== length) {
    return undefined;
  }

  const snapshot: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const element = readOwnDataProperty(arrayValue, String(index));
    if (!element.ok) {
      return undefined;
    }
    snapshot.push(element.value);
  }
  return snapshot;
}

/**
 * Copy all own string data properties while preserving unexpected fields for
 * M4-005 to reject. Accessors and symbol keys fail before any getter can run.
 */
function snapshotRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  try {
    if (Array.isArray(value)) {
      return undefined;
    }
  } catch {
    return undefined;
  }

  let keys: readonly PropertyKey[];
  try {
    keys = Reflect.ownKeys(value);
  } catch {
    return undefined;
  }

  const snapshot: Record<string, unknown> = {};
  for (const key of keys) {
    if (typeof key !== "string") {
      return undefined;
    }
    const property = readOwnDataProperty(value, key);
    if (!property.ok) {
      return undefined;
    }
    Object.defineProperty(snapshot, key, {
      value: property.value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return snapshot;
}

function materializeNestedValue(value: unknown): MaterializedValueResult {
  const kind = safelyClassifyObject(value);
  if (kind === "invalid") {
    return { ok: false };
  }
  if (kind === "array") {
    const snapshot = snapshotArray(value);
    return snapshot === undefined ? { ok: false } : { ok: true, value: snapshot };
  }
  if (kind === "record") {
    const snapshot = snapshotRecord(value);
    return snapshot === undefined ? { ok: false } : { ok: true, value: snapshot };
  }
  return { ok: true, value };
}

function materializeBand(value: unknown): MaterializedValueResult {
  const kind = safelyClassifyObject(value);
  if (kind === "invalid") {
    return { ok: false };
  }
  if (kind === "array") {
    const snapshot = snapshotArray(value);
    return snapshot === undefined ? { ok: false } : { ok: true, value: snapshot };
  }
  if (kind === "primitive") {
    return { ok: true, value };
  }

  const band = snapshotRecord(value);
  if (band === undefined) {
    return { ok: false };
  }

  if (Object.hasOwn(band, "specificity")) {
    const specificity = materializeNestedValue(band["specificity"]);
    if (!specificity.ok) {
      return { ok: false };
    }
    band["specificity"] = specificity.value;
  }

  if (Object.hasOwn(band, "ruleIds")) {
    const ruleIds = materializeNestedValue(band["ruleIds"]);
    if (!ruleIds.ok) {
      return { ok: false };
    }
    band["ruleIds"] = ruleIds.value;
  }

  return { ok: true, value: band };
}

function materializeEffect(value: unknown): MaterializedValueResult {
  return materializeNestedValue(value);
}

function materializeInput(bandsInput: unknown, effectsInput: unknown): MaterializationResult {
  if (
    safelyClassifyObject(bandsInput) !== "array" ||
    safelyClassifyObject(effectsInput) !== "array"
  ) {
    return { ok: false };
  }

  const rawBands = snapshotArray(bandsInput);
  const rawEffects = snapshotArray(effectsInput);
  if (rawBands === undefined || rawEffects === undefined) {
    return { ok: false };
  }

  const bands: unknown[] = [];
  for (const rawBand of rawBands) {
    const band = materializeBand(rawBand);
    if (!band.ok) {
      return { ok: false };
    }
    bands.push(band.value);
  }

  const effects: unknown[] = [];
  for (const rawEffect of rawEffects) {
    const effect = materializeEffect(rawEffect);
    if (!effect.ok) {
      return { ok: false };
    }
    effects.push(effect.value);
  }

  return {
    ok: true,
    input: {
      bands: Object.freeze(bands),
      effects: Object.freeze(effects),
    },
  };
}

function isPolicyRuleEffect(value: unknown): value is PolicyRuleEffect {
  return value === "deny" || value === "ask" || value === "allow";
}

function buildEffectMap(
  effects: readonly unknown[],
): ReadonlyMap<string, PolicyRuleEffect> | undefined {
  const map = new Map<string, PolicyRuleEffect>();
  for (const value of effects) {
    if (!isRecord(value)) {
      return undefined;
    }
    const ruleId = readOwnDataProperty(value, "ruleId");
    const effect = readOwnDataProperty(value, "effect");
    if (
      !ruleId.ok ||
      typeof ruleId.value !== "string" ||
      !effect.ok ||
      !isPolicyRuleEffect(effect.value)
    ) {
      return undefined;
    }
    map.set(ruleId.value, effect.value);
  }
  return map;
}

function highestBandRuleIds(bands: readonly unknown[]): readonly string[] | undefined {
  const first = bands[0];
  if (!isRecord(first)) {
    return undefined;
  }
  const ruleIdsProperty = readOwnDataProperty(first, "ruleIds");
  if (!ruleIdsProperty.ok || !isArray(ruleIdsProperty.value)) {
    return undefined;
  }

  const result: string[] = [];
  for (const ruleId of ruleIdsProperty.value) {
    if (typeof ruleId !== "string") {
      return undefined;
    }
    result.push(ruleId);
  }
  return result;
}

function contributingRuleIds(
  effect: PolicyRuleEffect,
  bands: readonly unknown[],
  effects: readonly unknown[],
): readonly string[] | undefined {
  const effectMap = buildEffectMap(effects);
  if (effectMap === undefined) {
    return undefined;
  }

  if (effect === "deny") {
    const denyRuleIds: string[] = [];
    for (const [ruleId, ruleEffect] of effectMap) {
      if (ruleEffect === "deny") {
        denyRuleIds.push(ruleId);
      }
    }
    denyRuleIds.sort(compareUnicodeCodePointStrings);
    return denyRuleIds;
  }

  const highestRuleIds = highestBandRuleIds(bands);
  if (highestRuleIds === undefined) {
    return undefined;
  }

  if (effect === "ask") {
    return highestRuleIds.filter((ruleId) => effectMap.get(ruleId) === "ask");
  }

  return highestRuleIds;
}

/**
 * Explain only the already-established M4-005/M4-006 effect facts.
 *
 * Full applicability is a caller-owned invariant that belongs to the later PDP.
 * The JavaScript boundary is materialized as data before M4-005 so accessors,
 * sparse arrays, and prototype behavior cannot become explanation input.
 */
export function explainPolicyEffect(
  bandsInput: unknown,
  effectsInput: unknown,
  policySpecInput: unknown,
): PolicyEffectExplanationResult {
  const materialized = materializeInput(bandsInput, effectsInput);
  if (!materialized.ok) {
    return failed("POLICY_EXPLAIN_INPUT_INVALID");
  }

  const effectResolution = resolveApplicableRuleEffects(
    materialized.input.bands,
    materialized.input.effects,
  );
  if (!effectResolution.ok) {
    return failed(effectResolution.reason);
  }

  const finalization = finalizeDefaultDeny(effectResolution, policySpecInput);
  if (!finalization.ok) {
    return explained("deny", "FAIL_CLOSED", finalization.reason, []);
  }

  if (effectResolution.status === "NO_APPLICABLE_RULES") {
    return explained("deny", "DEFAULT_DENY", "POLICY_DEFAULT_DENY", []);
  }

  const contributors = contributingRuleIds(
    effectResolution.effect,
    materialized.input.bands,
    materialized.input.effects,
  );
  if (contributors === undefined || contributors.length === 0) {
    return failed("POLICY_EXPLAIN_INPUT_INVALID");
  }

  if (effectResolution.effect === "deny") {
    return explained("deny", "EXPLICIT_DENY", "POLICY_EXPLICIT_DENY", contributors);
  }
  if (effectResolution.effect === "ask") {
    return explained(
      "ask",
      "HIGHEST_BAND_ASK",
      "POLICY_HIGHEST_BAND_ASK",
      contributors,
    );
  }
  return explained(
    "allow",
    "HIGHEST_BAND_ALLOW",
    "POLICY_HIGHEST_BAND_ALLOW",
    contributors,
  );
}
