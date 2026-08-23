import { normalizeCapabilityResource } from "./resource-normalizer.js";
import {
  compareResourceSpecificity,
  matchPolicyResourceSelector,
} from "./resource-pattern.js";
import type {
  ResourceSpecificity,
  RuleOrderingFailure,
  RuleOrderingResult,
  RulePrecedenceBand,
} from "./rule-ordering-types.js";

const RULE_ID_CODE_POINT_LIMIT = 128;
const MIN_PRIORITY = -1_000_000;
const MAX_PRIORITY = 1_000_000;

interface PreparedCandidate {
  readonly id: string;
  readonly resources: readonly string[];
  readonly effectivePriority: number;
}

interface MatchedCandidate {
  readonly id: string;
  readonly specificity: ResourceSpecificity;
  readonly effectivePriority: number;
}

function failure(reason: RuleOrderingFailure["reason"]): RuleOrderingFailure {
  return Object.freeze({ ok: false, reason });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidRuleId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Array.from(value).length <= RULE_ID_CODE_POINT_LIMIT;
}

/**
 * JavaScript's default string sort is UTF-16-code-unit based. The protocol uses
 * Unicode code-point lexicographic order so astral identifiers remain portable.
 */
export function compareUnicodeCodePointStrings(left: string, right: string): number {
  const leftCodePoints = Array.from(left);
  const rightCodePoints = Array.from(right);
  const sharedLength = Math.min(leftCodePoints.length, rightCodePoints.length);

  for (let index = 0; index < sharedLength; index += 1) {
    const leftValue = leftCodePoints[index];
    const rightValue = rightCodePoints[index];
    if (leftValue === undefined || rightValue === undefined || leftValue === rightValue) {
      continue;
    }

    const leftPoint = leftValue.codePointAt(0);
    const rightPoint = rightValue.codePointAt(0);
    if (leftPoint === undefined || rightPoint === undefined) {
      continue;
    }
    return leftPoint - rightPoint;
  }

  return leftCodePoints.length - rightCodePoints.length;
}

function prepareCandidates(input: unknown): readonly PreparedCandidate[] | RuleOrderingFailure {
  if (!Array.isArray(input)) {
    return failure("RULE_ORDERING_INPUT_INVALID");
  }

  const prepared: PreparedCandidate[] = [];
  const seenIds = new Set<string>();

  for (const candidate of input) {
    if (!isRecord(candidate)) {
      return failure("RULE_ORDERING_INPUT_INVALID");
    }

    const id = Object.hasOwn(candidate, "id") ? candidate["id"] : undefined;
    const resources = Object.hasOwn(candidate, "resources") ? candidate["resources"] : undefined;
    if (!isValidRuleId(id) || !Array.isArray(resources) || resources.length === 0) {
      return failure("RULE_ORDERING_INPUT_INVALID");
    }

    if (seenIds.has(id)) {
      return failure("RULE_ORDERING_DUPLICATE_RULE_ID");
    }
    seenIds.add(id);

    const hasPriority = Object.hasOwn(candidate, "priority");
    const priority = hasPriority ? candidate["priority"] : 0;
    if (
      typeof priority !== "number" ||
      !Number.isInteger(priority) ||
      priority < MIN_PRIORITY ||
      priority > MAX_PRIORITY
    ) {
      return failure("RULE_ORDERING_INPUT_INVALID");
    }

    const selectorStrings: string[] = [];
    const seenSelectors = new Set<string>();
    for (const selector of resources) {
      if (typeof selector !== "string") {
        return failure("RESOURCE_INPUT_INVALID");
      }
      if (seenSelectors.has(selector)) {
        return failure("RULE_ORDERING_INPUT_INVALID");
      }
      seenSelectors.add(selector);
      selectorStrings.push(selector);
    }

    selectorStrings.sort(compareUnicodeCodePointStrings);
    prepared.push(
      Object.freeze({
        id,
        resources: Object.freeze(selectorStrings),
        effectivePriority: priority,
      }),
    );
  }

  prepared.sort((left, right) => compareUnicodeCodePointStrings(left.id, right.id));
  return Object.freeze(prepared);
}

function sameSpecificity(left: ResourceSpecificity, right: ResourceSpecificity): boolean {
  return (
    left.literalCodePoints === right.literalCodePoints &&
    left.globstarCount === right.globstarCount &&
    left.starCount === right.starCount
  );
}

function compareMatchedCandidates(left: MatchedCandidate, right: MatchedCandidate): number {
  const specificity = compareResourceSpecificity(left.specificity, right.specificity);
  if (specificity !== 0) {
    return specificity;
  }
  if (left.effectivePriority !== right.effectivePriority) {
    return right.effectivePriority - left.effectivePriority;
  }
  return compareUnicodeCodePointStrings(left.id, right.id);
}

/**
 * Compute M4-004 structural precedence only. The result intentionally contains
 * no effect and no authorization winner; M4-005 must evaluate complete bands.
 */
export function orderRuleCandidatesForResource(
  resourceInput: unknown,
  candidateInput: unknown,
): RuleOrderingResult {
  const resourceResult = normalizeCapabilityResource(resourceInput);
  if (!resourceResult.ok) {
    return failure(resourceResult.reason);
  }

  const prepared = prepareCandidates(candidateInput);
  if ("ok" in prepared && prepared.ok === false) {
    return prepared;
  }

  const matched: MatchedCandidate[] = [];
  for (const candidate of prepared) {
    let bestSpecificity: ResourceSpecificity | undefined;

    for (const selector of candidate.resources) {
      const match = matchPolicyResourceSelector(selector, resourceResult.resource);
      if (!match.ok) {
        return match;
      }
      if (!match.matched) {
        continue;
      }
      if (
        bestSpecificity === undefined ||
        compareResourceSpecificity(match.specificity, bestSpecificity) < 0
      ) {
        bestSpecificity = match.specificity;
      }
    }

    if (bestSpecificity !== undefined) {
      matched.push(
        Object.freeze({
          id: candidate.id,
          specificity: bestSpecificity,
          effectivePriority: candidate.effectivePriority,
        }),
      );
    }
  }

  matched.sort(compareMatchedCandidates);

  const bands: RulePrecedenceBand[] = [];
  for (const candidate of matched) {
    const previous = bands[bands.length - 1];
    if (
      previous !== undefined &&
      sameSpecificity(previous.specificity, candidate.specificity) &&
      previous.effectivePriority === candidate.effectivePriority
    ) {
      bands[bands.length - 1] = Object.freeze({
        specificity: previous.specificity,
        effectivePriority: previous.effectivePriority,
        ruleIds: Object.freeze([...previous.ruleIds, candidate.id]),
      });
      continue;
    }

    bands.push(
      Object.freeze({
        specificity: candidate.specificity,
        effectivePriority: candidate.effectivePriority,
        ruleIds: Object.freeze([candidate.id]),
      }),
    );
  }

  return Object.freeze({ ok: true, bands: Object.freeze(bands) });
}
