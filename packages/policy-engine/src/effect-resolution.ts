import { compareResourceSpecificity } from "./resource-pattern.js";
import { compareUnicodeCodePointStrings } from "./rule-ordering.js";
import type {
  EffectResolutionFailure,
  EffectResolutionFailureReason,
  EffectResolutionResult,
  PolicyRuleEffect,
} from "./effect-resolution-types.js";
import type { ResourceSpecificity, RulePrecedenceBand } from "./rule-ordering-types.js";

const RULE_ID_CODE_POINT_LIMIT = 128;
const MIN_PRIORITY = -1_000_000;
const MAX_PRIORITY = 1_000_000;
const BAND_KEYS = new Set(["specificity", "effectivePriority", "ruleIds"]);
const SPECIFICITY_KEYS = new Set(["literalCodePoints", "globstarCount", "starCount"]);
const EFFECT_KEYS = new Set(["ruleId", "effect"]);

interface PreparedEffectInput {
  readonly bands: readonly RulePrecedenceBand[];
  readonly effects: ReadonlyMap<string, PolicyRuleEffect>;
}

interface PreparedEffectSuccess {
  readonly ok: true;
  readonly input: PreparedEffectInput;
}

type PreparedEffectResult = PreparedEffectSuccess | EffectResolutionFailure;

function failure(reason: EffectResolutionFailureReason): EffectResolutionFailure {
  return Object.freeze({ ok: false, reason });
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

function isValidRuleId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    Array.from(value).length <= RULE_ID_CODE_POINT_LIMIT
  );
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function prepareSpecificity(value: unknown): ResourceSpecificity | undefined {
  if (!isRecord(value) || !hasOnlyOwnStringKeys(value, SPECIFICITY_KEYS)) {
    return undefined;
  }

  const literalCodePoints = Object.hasOwn(value, "literalCodePoints")
    ? value["literalCodePoints"]
    : undefined;
  const globstarCount = Object.hasOwn(value, "globstarCount")
    ? value["globstarCount"]
    : undefined;
  const starCount = Object.hasOwn(value, "starCount") ? value["starCount"] : undefined;

  if (
    !isNonNegativeSafeInteger(literalCodePoints) ||
    !isNonNegativeSafeInteger(globstarCount) ||
    !isNonNegativeSafeInteger(starCount)
  ) {
    return undefined;
  }

  return Object.freeze({ literalCodePoints, globstarCount, starCount });
}

function compareBandKey(left: RulePrecedenceBand, right: RulePrecedenceBand): number {
  const specificity = compareResourceSpecificity(left.specificity, right.specificity);
  if (specificity !== 0) {
    return specificity;
  }
  return right.effectivePriority - left.effectivePriority;
}

function prepareBands(input: unknown): readonly RulePrecedenceBand[] | EffectResolutionFailure {
  if (!Array.isArray(input)) {
    return failure("EFFECT_RESOLUTION_INPUT_INVALID");
  }

  const prepared: RulePrecedenceBand[] = [];
  const seenRuleIds = new Set<string>();

  for (const rawBand of input) {
    if (!isRecord(rawBand) || !hasOnlyOwnStringKeys(rawBand, BAND_KEYS)) {
      return failure("EFFECT_RESOLUTION_INPUT_INVALID");
    }

    const specificity = prepareSpecificity(
      Object.hasOwn(rawBand, "specificity") ? rawBand["specificity"] : undefined,
    );
    const effectivePriority = Object.hasOwn(rawBand, "effectivePriority")
      ? rawBand["effectivePriority"]
      : undefined;
    const rawRuleIds = Object.hasOwn(rawBand, "ruleIds") ? rawBand["ruleIds"] : undefined;

    if (
      specificity === undefined ||
      typeof effectivePriority !== "number" ||
      !Number.isInteger(effectivePriority) ||
      effectivePriority < MIN_PRIORITY ||
      effectivePriority > MAX_PRIORITY ||
      !Array.isArray(rawRuleIds) ||
      rawRuleIds.length === 0
    ) {
      return failure("EFFECT_RESOLUTION_INPUT_INVALID");
    }

    const ruleIds: string[] = [];
    let previousRuleId: string | undefined;
    for (const ruleId of rawRuleIds) {
      if (!isValidRuleId(ruleId) || seenRuleIds.has(ruleId)) {
        return failure("EFFECT_RESOLUTION_INPUT_INVALID");
      }
      if (
        previousRuleId !== undefined &&
        compareUnicodeCodePointStrings(previousRuleId, ruleId) >= 0
      ) {
        return failure("EFFECT_RESOLUTION_BANDS_NONCANONICAL");
      }
      previousRuleId = ruleId;
      seenRuleIds.add(ruleId);
      ruleIds.push(ruleId);
    }

    const band = Object.freeze({
      specificity,
      effectivePriority,
      ruleIds: Object.freeze(ruleIds),
    });

    const previousBand = prepared[prepared.length - 1];
    if (previousBand !== undefined && compareBandKey(previousBand, band) >= 0) {
      return failure("EFFECT_RESOLUTION_BANDS_NONCANONICAL");
    }
    prepared.push(band);
  }

  return Object.freeze(prepared);
}

function prepareEffects(
  input: unknown,
  bandRuleIds: ReadonlySet<string>,
): ReadonlyMap<string, PolicyRuleEffect> | EffectResolutionFailure {
  if (!Array.isArray(input)) {
    return failure("EFFECT_RESOLUTION_INPUT_INVALID");
  }

  const effects = new Map<string, PolicyRuleEffect>();
  for (const rawBinding of input) {
    if (!isRecord(rawBinding) || !hasOnlyOwnStringKeys(rawBinding, EFFECT_KEYS)) {
      return failure("EFFECT_RESOLUTION_INPUT_INVALID");
    }

    const ruleId = Object.hasOwn(rawBinding, "ruleId") ? rawBinding["ruleId"] : undefined;
    const effect = Object.hasOwn(rawBinding, "effect") ? rawBinding["effect"] : undefined;
    if (!isValidRuleId(ruleId)) {
      return failure("EFFECT_RESOLUTION_INPUT_INVALID");
    }
    if (effect !== "deny" && effect !== "ask" && effect !== "allow") {
      return failure("EFFECT_RESOLUTION_EFFECT_INVALID");
    }
    if (effects.has(ruleId)) {
      return failure("EFFECT_RESOLUTION_RULE_SET_MISMATCH");
    }
    effects.set(ruleId, effect);
  }

  if (effects.size !== bandRuleIds.size) {
    return failure("EFFECT_RESOLUTION_RULE_SET_MISMATCH");
  }
  for (const ruleId of effects.keys()) {
    if (!bandRuleIds.has(ruleId)) {
      return failure("EFFECT_RESOLUTION_RULE_SET_MISMATCH");
    }
  }

  return effects;
}

function prepareInput(bandsInput: unknown, effectsInput: unknown): PreparedEffectResult {
  const bands = prepareBands(bandsInput);
  if (!Array.isArray(bands)) {
    return bands;
  }

  const bandRuleIds = new Set<string>();
  for (const band of bands) {
    for (const ruleId of band.ruleIds) {
      bandRuleIds.add(ruleId);
    }
  }

  const effects = prepareEffects(effectsInput, bandRuleIds);
  if (!(effects instanceof Map)) {
    return effects;
  }

  return Object.freeze({
    ok: true,
    input: Object.freeze({ bands, effects }),
  });
}

/**
 * Resolve only the effect-precedence fragment of the policy model. Full rule
 * applicability is a caller-provided invariant owned by later PDP composition.
 */
export function resolveApplicableRuleEffects(
  bandsInput: unknown,
  effectsInput: unknown,
): EffectResolutionResult {
  const prepared = prepareInput(bandsInput, effectsInput);
  if (!prepared.ok) {
    return prepared;
  }

  const { bands, effects } = prepared.input;
  if (bands.length === 0) {
    return Object.freeze({ ok: true, status: "NO_APPLICABLE_RULES" });
  }

  for (const effect of effects.values()) {
    if (effect === "deny") {
      return Object.freeze({ ok: true, status: "RESOLVED", effect: "deny" });
    }
  }

  const highestBand = bands[0];
  if (highestBand === undefined) {
    return failure("EFFECT_RESOLUTION_INPUT_INVALID");
  }

  for (const ruleId of highestBand.ruleIds) {
    if (effects.get(ruleId) === "ask") {
      return Object.freeze({ ok: true, status: "RESOLVED", effect: "ask" });
    }
  }

  return Object.freeze({ ok: true, status: "RESOLVED", effect: "allow" });
}
