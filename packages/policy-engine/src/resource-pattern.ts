import {
  normalizeCapabilityResource,
  normalizePolicyResourceSelector,
} from "./resource-normalizer.js";
import type {
  CanonicalResource,
  CanonicalResourceSelector,
} from "./resource-normalization-types.js";
import type {
  ResourcePatternMatchResult,
  ResourceSpecificity,
  RuleOrderingFailure,
} from "./rule-ordering-types.js";

type CompiledPatternSegment =
  | { readonly kind: "GLOBSTAR" }
  | { readonly kind: "SEGMENT"; readonly codePoints: readonly string[] };

interface CompiledResourcePattern {
  readonly selector: CanonicalResourceSelector;
  readonly segments: readonly CompiledPatternSegment[];
  readonly specificity: ResourceSpecificity;
}

interface CompilePatternSuccess {
  readonly ok: true;
  readonly pattern: CompiledResourcePattern;
}

type CompilePatternResult = CompilePatternSuccess | RuleOrderingFailure;

function failure(reason: RuleOrderingFailure["reason"]): RuleOrderingFailure {
  return Object.freeze({ ok: false, reason });
}

function frozenSpecificity(
  literalCodePoints: number,
  globstarCount: number,
  starCount: number,
): ResourceSpecificity {
  return Object.freeze({ literalCodePoints, globstarCount, starCount });
}

/**
 * Compile only the portable lexical operators owned by Spec 0020. In particular,
 * this is deliberately not delegated to a host glob/regex library whose escape,
 * separator or Unicode rules could become accidental protocol semantics.
 */
function compilePattern(selector: CanonicalResourceSelector): CompilePatternResult {
  const rawSegments = selector.locatorPattern.split("/");
  const compiled: CompiledPatternSegment[] = [];
  let literalCodePoints = Math.max(0, rawSegments.length - 1);
  let globstarCount = 0;
  let starCount = 0;

  for (const segment of rawSegments) {
    if (segment.includes("**")) {
      if (segment !== "**") {
        return failure("RESOURCE_PATTERN_SYNTAX_INVALID");
      }
      globstarCount += 1;
      compiled.push(Object.freeze({ kind: "GLOBSTAR" }));
      continue;
    }

    const codePoints = Array.from(segment);
    for (const codePoint of codePoints) {
      if (codePoint === "*") {
        starCount += 1;
      } else {
        literalCodePoints += 1;
      }
    }
    compiled.push(
      Object.freeze({ kind: "SEGMENT", codePoints: Object.freeze(codePoints) }),
    );
  }

  return Object.freeze({
    ok: true,
    pattern: Object.freeze({
      selector,
      segments: Object.freeze(compiled),
      specificity: frozenSpecificity(literalCodePoints, globstarCount, starCount),
    }),
  });
}

/** Match one slash-delimited locator segment against the v0.1 `*` operator. */
function matchesSegment(pattern: readonly string[], value: string): boolean {
  const valueCodePoints = Array.from(value);
  let patternIndex = 0;
  let valueIndex = 0;
  let lastStarIndex = -1;
  let starValueIndex = 0;

  while (valueIndex < valueCodePoints.length) {
    const patternCodePoint = pattern[patternIndex];
    const valueCodePoint = valueCodePoints[valueIndex];

    if (
      patternCodePoint !== undefined &&
      patternCodePoint !== "*" &&
      patternCodePoint === valueCodePoint
    ) {
      patternIndex += 1;
      valueIndex += 1;
      continue;
    }

    if (patternCodePoint === "*") {
      lastStarIndex = patternIndex;
      starValueIndex = valueIndex;
      patternIndex += 1;
      continue;
    }

    if (lastStarIndex >= 0) {
      starValueIndex += 1;
      if (starValueIndex > valueCodePoints.length) {
        return false;
      }
      patternIndex = lastStarIndex + 1;
      valueIndex = starValueIndex;
      continue;
    }

    return false;
  }

  while (pattern[patternIndex] === "*") {
    patternIndex += 1;
  }
  return patternIndex === pattern.length;
}

/**
 * Match complete lexical segments with iterative globstar fallback. Empty
 * segments are retained by String.split("/") and are therefore significant.
 */
function matchesCompiledPattern(
  pattern: CompiledResourcePattern,
  resource: CanonicalResource,
): boolean {
  if (pattern.selector.scheme !== resource.scheme) {
    return false;
  }

  const resourceSegments = resource.locator.split("/");
  let patternIndex = 0;
  let resourceIndex = 0;
  let lastGlobstarIndex = -1;
  let globstarResourceIndex = 0;

  while (resourceIndex < resourceSegments.length) {
    const segmentPattern = pattern.segments[patternIndex];
    const resourceSegment = resourceSegments[resourceIndex];

    if (segmentPattern?.kind === "GLOBSTAR") {
      lastGlobstarIndex = patternIndex;
      globstarResourceIndex = resourceIndex;
      patternIndex += 1;
      continue;
    }

    if (
      segmentPattern?.kind === "SEGMENT" &&
      resourceSegment !== undefined &&
      matchesSegment(segmentPattern.codePoints, resourceSegment)
    ) {
      patternIndex += 1;
      resourceIndex += 1;
      continue;
    }

    if (lastGlobstarIndex >= 0) {
      globstarResourceIndex += 1;
      if (globstarResourceIndex > resourceSegments.length) {
        return false;
      }
      patternIndex = lastGlobstarIndex + 1;
      resourceIndex = globstarResourceIndex;
      continue;
    }

    return false;
  }

  while (pattern.segments[patternIndex]?.kind === "GLOBSTAR") {
    patternIndex += 1;
  }
  return patternIndex === pattern.segments.length;
}

/**
 * Match one policy selector against one exact resource. Both values are passed
 * through the accepted M4-003 boundary first; malformed resource data is never
 * converted into a successful non-match.
 */
export function matchPolicyResourceSelector(
  selectorInput: unknown,
  resourceInput: unknown,
): ResourcePatternMatchResult {
  const resourceResult = normalizeCapabilityResource(resourceInput);
  if (!resourceResult.ok) {
    return failure(resourceResult.reason);
  }

  const selectorResult = normalizePolicyResourceSelector(selectorInput);
  if (!selectorResult.ok) {
    return failure(selectorResult.reason);
  }

  const compiled = compilePattern(selectorResult.selector);
  if (!compiled.ok) {
    return compiled;
  }

  return Object.freeze({
    ok: true,
    matched: matchesCompiledPattern(compiled.pattern, resourceResult.resource),
    specificity: compiled.pattern.specificity,
  });
}

export function compareResourceSpecificity(
  left: ResourceSpecificity,
  right: ResourceSpecificity,
): number {
  if (left.literalCodePoints !== right.literalCodePoints) {
    return right.literalCodePoints - left.literalCodePoints;
  }
  if (left.globstarCount !== right.globstarCount) {
    return left.globstarCount - right.globstarCount;
  }
  return left.starCount - right.starCount;
}
