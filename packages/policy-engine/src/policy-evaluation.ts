import { finalizeDefaultDeny } from "./default-deny.js";
import { resolveApplicableRuleEffects } from "./effect-resolution.js";
import type { ApplicableRuleEffect, PolicyRuleEffect } from "./effect-resolution-types.js";
import { explainPolicyEffect } from "./policy-effect-explanation.js";
import type {
  PolicyEvaluationFailure,
  PolicyEvaluationFailureReason,
  PolicyEvaluationResult,
  PolicyEvaluationStage,
  PolicyEvaluationSuccess,
} from "./policy-evaluation-types.js";
import { normalizeCapabilityResource } from "./resource-normalizer.js";
import { compareUnicodeCodePointStrings, orderRuleCandidatesForResource } from "./rule-ordering.js";
import type { RuleOrderingCandidate, RulePrecedenceBand } from "./rule-ordering-types.js";
import { SUBJECT_REF_CODE_POINT_LIMIT } from "./subject-resolution-types.js";

const RULE_ID_CODE_POINT_LIMIT = 128;
const CAPABILITY_CODE_POINT_LIMIT = 256;
const MIN_PRIORITY = -1_000_000;
const MAX_PRIORITY = 1_000_000;
const CAPABILITY_PATTERN = /^[a-z][a-z0-9.-]*\.[a-z][a-z0-9.-]*$/;
const SUBJECT_KINDS = new Set([
  "agent", "subagent", "tool", "plugin", "system", "verifier", "human", "service",
]);
const INPUT_KEYS = new Set(["policy", "subject", "capability", "resource", "requestConstraints"]);
const POLICY_KEYS = new Set(["apiVersion", "kind", "metadata", "spec"]);
const POLICY_SPEC_KEYS = new Set(["defaultEffect", "rules", "delegation"]);
const RULE_KEYS = new Set([
  "id", "effect", "capabilities", "resources", "subjects", "constraints", "lease", "priority",
]);
const SUBJECT_KEYS = new Set(["kind", "id", "parent", "sessionRef"]);

type DataRead =
  | { readonly status: "DATA"; readonly value: unknown }
  | { readonly status: "MISSING" | "ACCESSOR" | "UNREADABLE" };

interface ParsedSubjectSelector {
  readonly kind: string;
  readonly id: string;
}

interface PreparedRule {
  readonly id: string;
  readonly effect: PolicyRuleEffect;
  readonly capabilities: readonly string[];
  readonly resources: readonly string[];
  readonly subjects?: readonly ParsedSubjectSelector[];
  readonly constraintsPresent: boolean;
  readonly constraints: unknown;
  readonly priority?: number;
}

interface PreparedPolicy {
  readonly policySpec: Readonly<Record<string, unknown>>;
  readonly rules: readonly PreparedRule[];
}

interface MaterializedInput {
  readonly policy: unknown;
  readonly subject: Readonly<Record<string, unknown>>;
  readonly capability: string;
  readonly resource: unknown;
  readonly requestConstraintsPresent: boolean;
  readonly requestConstraints: unknown;
}

type PrepareFailure = {
  readonly ok: false;
  readonly stage: PolicyEvaluationStage;
  readonly reason: PolicyEvaluationFailureReason;
};
type PreparedPolicyResult = { readonly ok: true; readonly policy: PreparedPolicy } | PrepareFailure;
type PreparedRuleResult = { readonly ok: true; readonly rule: PreparedRule } | PrepareFailure;

/**
 * Compose the accepted M4 policy primitives into one deterministic effect fact.
 *
 * The result is intentionally not execution authority. Lease lookup, approval,
 * durable CapabilityDecision provenance, guarantees, delegation attenuation and
 * PEP enforcement remain later gates.
 */
export function evaluateCapabilityPolicy(input: unknown): PolicyEvaluationResult {
  const materialized = materializeInput(input);
  if (materialized === undefined) return fail("INPUT", "POLICY_EVALUATION_INPUT_INVALID");
  if (!isValidCapabilityName(materialized.capability)) {
    return fail("INPUT", "POLICY_EVALUATION_INPUT_INVALID");
  }
  if (!validateRequestConstraintsBoundary(
    materialized.requestConstraintsPresent,
    materialized.requestConstraints,
  )) {
    return fail("INPUT", "POLICY_EVALUATION_INPUT_INVALID");
  }

  // Validate/canonicalize the request resource before matching so a malformed
  // resource cannot become an apparently ordinary no-match/default-deny result.
  const normalizedResource = normalizeCapabilityResource(materialized.resource);
  if (!normalizedResource.ok) return fail("RESOURCE", normalizedResource.reason);

  const prepared = preparePolicy(materialized.policy);
  if (!prepared.ok) return fail(prepared.stage, prepared.reason);

  const subjectKind = materialized.subject["kind"] as string;
  const subjectId = materialized.subject["id"] as string;
  const subjectMatched = prepared.policy.rules.filter(rule =>
    rule.subjects === undefined
      || rule.subjects.some(selector => selector.kind === subjectKind && selector.id === subjectId),
  );
  const capabilityMatched = subjectMatched.filter(rule =>
    rule.capabilities.includes(materialized.capability),
  );

  const candidates: RuleOrderingCandidate[] = capabilityMatched.map(rule =>
    rule.priority === undefined
      ? Object.freeze({ id: rule.id, resources: rule.resources })
      : Object.freeze({ id: rule.id, resources: rule.resources, priority: rule.priority }),
  );
  const ordering = orderRuleCandidatesForResource(
    normalizedResource.resource,
    Object.freeze(candidates),
  );
  if (!ordering.ok) return fail("RESOURCE", ordering.reason);

  const ruleById = new Map(prepared.policy.rules.map(rule => [rule.id, rule] as const));
  const matchedRuleIds = flattenBandRuleIds(ordering.bands);
  if (matchedRuleIds === undefined) return fail("RESOURCE", "RULE_ORDERING_INPUT_INVALID");

  // Constraints are deliberately inspected only after the other three
  // applicability dimensions match. Unknown predicates can never be ignored to
  // gain permission, while irrelevant extension predicates cannot globally DoS
  // unrelated requests.
  for (const ruleId of matchedRuleIds) {
    const rule = ruleById.get(ruleId);
    if (rule === undefined) return fail("INPUT", "POLICY_EVALUATION_INPUT_INVALID");
    if (!rule.constraintsPresent) continue;
    const constraintShape = inspectConstraintObject(rule.constraints);
    if (constraintShape === "INVALID") {
      return fail("CONSTRAINT", "POLICY_EVALUATION_INPUT_INVALID");
    }
    if (constraintShape === "NON_EMPTY") {
      return fail("CONSTRAINT", "POLICY_CONSTRAINT_PROFILE_UNSUPPORTED");
    }
  }

  const fullyApplicableRuleIds = Object.freeze(
    [...matchedRuleIds].sort(compareUnicodeCodePointStrings),
  );
  const effects: ApplicableRuleEffect[] = [];
  for (const ruleId of matchedRuleIds) {
    const rule = ruleById.get(ruleId);
    if (rule === undefined) return fail("INPUT", "POLICY_EVALUATION_INPUT_INVALID");
    effects.push(Object.freeze({ ruleId, effect: rule.effect }));
  }
  const frozenEffects = Object.freeze(effects);

  const resolvedEffects = resolveApplicableRuleEffects(ordering.bands, frozenEffects);
  if (!resolvedEffects.ok) return fail("EFFECT", resolvedEffects.reason);

  const finalized = finalizeDefaultDeny(resolvedEffects, prepared.policy.policySpec);
  if (!finalized.ok) return fail("DEFAULT_DENY", finalized.reason);

  const explanation = explainPolicyEffect(
    ordering.bands,
    frozenEffects,
    prepared.policy.policySpec,
  );
  if (!explanation.ok) return fail("EXPLAIN", explanation.reasonCode);

  // Narrow basis/reason pairs explicitly instead of relying on correlated-union
  // inference. Any impossible pair is treated as a component-contract failure.
  if (explanation.basis === "FAIL_CLOSED") {
    if (
      explanation.reasonCode === "DEFAULT_EFFECT_CONFIG_INVALID"
      || explanation.reasonCode === "DEFAULT_DENY_INPUT_INVALID"
    ) {
      return fail("DEFAULT_DENY", explanation.reasonCode);
    }
    return fail("EXPLAIN", "POLICY_EXPLAIN_INPUT_INVALID");
  }
  if (
    explanation.basis === "EXPLICIT_DENY"
    && explanation.reasonCode === "POLICY_EXPLICIT_DENY"
    && finalized.effect === "deny"
  ) {
    return success("deny", "EXPLICIT_DENY", "POLICY_EXPLICIT_DENY", fullyApplicableRuleIds, explanation.contributingRuleIds);
  }
  if (
    explanation.basis === "HIGHEST_BAND_ASK"
    && explanation.reasonCode === "POLICY_HIGHEST_BAND_ASK"
    && finalized.effect === "ask"
  ) {
    return success("ask", "HIGHEST_BAND_ASK", "POLICY_HIGHEST_BAND_ASK", fullyApplicableRuleIds, explanation.contributingRuleIds);
  }
  if (
    explanation.basis === "HIGHEST_BAND_ALLOW"
    && explanation.reasonCode === "POLICY_HIGHEST_BAND_ALLOW"
    && finalized.effect === "allow"
  ) {
    return success("allow", "HIGHEST_BAND_ALLOW", "POLICY_HIGHEST_BAND_ALLOW", fullyApplicableRuleIds, explanation.contributingRuleIds);
  }
  if (
    explanation.basis === "DEFAULT_DENY"
    && explanation.reasonCode === "POLICY_DEFAULT_DENY"
    && finalized.effect === "deny"
  ) {
    return success("deny", "DEFAULT_DENY", "POLICY_DEFAULT_DENY", fullyApplicableRuleIds, explanation.contributingRuleIds);
  }
  return fail("EXPLAIN", "POLICY_EXPLAIN_INPUT_INVALID");
}

function materializeInput(input: unknown): MaterializedInput | undefined {
  if (!isRecord(input)) return undefined;
  const keys = ownKeys(input);
  if (keys === undefined || !hasOnlyAllowedStringKeys(keys, INPUT_KEYS)) return undefined;
  if (!keys.includes("policy") || !keys.includes("subject") || !keys.includes("capability") || !keys.includes("resource")) return undefined;

  const policy = readData(input, "policy");
  const subject = readData(input, "subject");
  const capability = readData(input, "capability");
  const resource = readData(input, "resource");
  if (policy.status !== "DATA" || subject.status !== "DATA" || capability.status !== "DATA" || resource.status !== "DATA") return undefined;

  const resolvedSubject = materializeResolvedSubject(subject.value);
  if (resolvedSubject === undefined || typeof capability.value !== "string") return undefined;

  const requestConstraintsPresent = keys.includes("requestConstraints");
  let requestConstraints: unknown;
  if (requestConstraintsPresent) {
    const read = readData(input, "requestConstraints");
    if (read.status !== "DATA") return undefined;
    requestConstraints = read.value;
  }

  return Object.freeze({
    policy: policy.value,
    subject: resolvedSubject,
    capability: capability.value,
    resource: resource.value,
    requestConstraintsPresent,
    requestConstraints,
  });
}

function materializeResolvedSubject(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (!isRecord(value)) return undefined;
  const keys = ownKeys(value);
  if (keys === undefined || !hasOnlyAllowedStringKeys(keys, SUBJECT_KEYS)) return undefined;
  if (!keys.includes("kind") || !keys.includes("id") || !keys.includes("sessionRef")) return undefined;

  const kind = readData(value, "kind");
  const id = readData(value, "id");
  const sessionRef = readData(value, "sessionRef");
  if (
    kind.status !== "DATA" || typeof kind.value !== "string" || !SUBJECT_KINDS.has(kind.value)
    || id.status !== "DATA" || !isBoundedNonEmptyString(id.value, SUBJECT_REF_CODE_POINT_LIMIT)
    || sessionRef.status !== "DATA" || !isBoundedNonEmptyString(sessionRef.value, SUBJECT_REF_CODE_POINT_LIMIT)
  ) return undefined;

  const result: Record<string, unknown> = { kind: kind.value, id: id.value, sessionRef: sessionRef.value };
  if (keys.includes("parent")) {
    const parent = readData(value, "parent");
    if (parent.status !== "DATA") return undefined;
    if (kind.value === "subagent") {
      if (!isBoundedNonEmptyString(parent.value, SUBJECT_REF_CODE_POINT_LIMIT)) return undefined;
    } else if (parent.value !== null && !isBoundedNonEmptyString(parent.value, SUBJECT_REF_CODE_POINT_LIMIT)) {
      return undefined;
    }
    result["parent"] = parent.value;
  } else if (kind.value === "subagent") {
    return undefined;
  }
  return Object.freeze(result);
}

function preparePolicy(value: unknown): PreparedPolicyResult {
  if (!isRecord(value)) return prepareFailure("INPUT", "POLICY_EVALUATION_INPUT_INVALID");
  const policyKeys = ownKeys(value);
  if (policyKeys === undefined || !hasOnlyAllowedStringKeys(policyKeys, POLICY_KEYS)) return prepareFailure("INPUT", "POLICY_EVALUATION_INPUT_INVALID");
  if (!policyKeys.includes("apiVersion") || !policyKeys.includes("kind") || !policyKeys.includes("metadata") || !policyKeys.includes("spec")) return prepareFailure("INPUT", "POLICY_EVALUATION_INPUT_INVALID");

  const apiVersion = readData(value, "apiVersion");
  const kind = readData(value, "kind");
  const metadata = readData(value, "metadata");
  const spec = readData(value, "spec");
  if (
    apiVersion.status !== "DATA" || apiVersion.value !== "safe-runtime.dev/v1alpha1"
    || kind.status !== "DATA" || kind.value !== "CapabilityPolicy"
    || metadata.status !== "DATA" || !isRecord(metadata.value)
    || spec.status !== "DATA" || !isRecord(spec.value)
  ) return prepareFailure("INPUT", "POLICY_EVALUATION_INPUT_INVALID");

  const specKeys = ownKeys(spec.value);
  if (specKeys === undefined || !hasOnlyAllowedStringKeys(specKeys, POLICY_SPEC_KEYS)) return prepareFailure("INPUT", "POLICY_EVALUATION_INPUT_INVALID");
  const defaultEffect = readData(spec.value, "defaultEffect");
  const rulesRead = readData(spec.value, "rules");
  if (defaultEffect.status !== "DATA" || defaultEffect.value !== "deny" || rulesRead.status !== "DATA") return prepareFailure("INPUT", "POLICY_EVALUATION_INPUT_INVALID");

  const rawRules = snapshotArray(rulesRead.value);
  if (rawRules === undefined) return prepareFailure("INPUT", "POLICY_EVALUATION_INPUT_INVALID");

  const rules: PreparedRule[] = [];
  const seenRuleIds = new Set<string>();
  for (const rawRule of rawRules) {
    const prepared = prepareRule(rawRule);
    if (!prepared.ok) return prepared;
    if (seenRuleIds.has(prepared.rule.id)) return prepareFailure("INPUT", "RULE_ORDERING_DUPLICATE_RULE_ID");
    seenRuleIds.add(prepared.rule.id);
    rules.push(prepared.rule);
  }

  return Object.freeze({
    ok: true,
    policy: Object.freeze({
      policySpec: Object.freeze({ defaultEffect: "deny" }),
      rules: Object.freeze(rules),
    }),
  });
}

function prepareRule(value: unknown): PreparedRuleResult {
  if (!isRecord(value)) return prepareFailure("INPUT", "POLICY_EVALUATION_INPUT_INVALID");
  const keys = ownKeys(value);
  if (keys === undefined || !hasOnlyAllowedStringKeys(keys, RULE_KEYS)) return prepareFailure("INPUT", "POLICY_EVALUATION_INPUT_INVALID");
  for (const required of ["id", "effect", "capabilities", "resources"] as const) {
    if (!keys.includes(required)) return prepareFailure("INPUT", "POLICY_EVALUATION_INPUT_INVALID");
  }

  const id = readData(value, "id");
  const effect = readData(value, "effect");
  const capabilities = readData(value, "capabilities");
  const resources = readData(value, "resources");
  if (
    id.status !== "DATA" || !isBoundedNonEmptyString(id.value, RULE_ID_CODE_POINT_LIMIT)
    || effect.status !== "DATA" || !isPolicyRuleEffect(effect.value)
    || capabilities.status !== "DATA" || resources.status !== "DATA"
  ) return prepareFailure("INPUT", "POLICY_EVALUATION_INPUT_INVALID");

  const capabilityList = snapshotUniqueNonEmptyStrings(capabilities.value);
  const resourceList = snapshotUniqueNonEmptyStrings(resources.value);
  if (capabilityList === undefined || resourceList === undefined) return prepareFailure("INPUT", "POLICY_EVALUATION_INPUT_INVALID");

  let subjects: readonly ParsedSubjectSelector[] | undefined;
  if (keys.includes("subjects")) {
    const subjectsRead = readData(value, "subjects");
    if (subjectsRead.status !== "DATA") return prepareFailure("SUBJECT_SELECTOR", "POLICY_SUBJECT_SELECTOR_INVALID");
    const subjectStrings = snapshotUniqueNonEmptyStrings(subjectsRead.value);
    if (subjectStrings === undefined) return prepareFailure("SUBJECT_SELECTOR", "POLICY_SUBJECT_SELECTOR_INVALID");
    const parsed: ParsedSubjectSelector[] = [];
    for (const selector of subjectStrings) {
      const item = parseSubjectSelector(selector);
      if (item === undefined) return prepareFailure("SUBJECT_SELECTOR", "POLICY_SUBJECT_SELECTOR_INVALID");
      parsed.push(item);
    }
    subjects = Object.freeze(parsed);
  }

  let priority: number | undefined;
  if (keys.includes("priority")) {
    const priorityRead = readData(value, "priority");
    if (
      priorityRead.status !== "DATA" || typeof priorityRead.value !== "number"
      || !Number.isInteger(priorityRead.value)
      || priorityRead.value < MIN_PRIORITY || priorityRead.value > MAX_PRIORITY
    ) return prepareFailure("INPUT", "POLICY_EVALUATION_INPUT_INVALID");
    priority = priorityRead.value;
  }

  const constraintsPresent = keys.includes("constraints");
  let constraints: unknown;
  if (constraintsPresent) {
    const constraintsRead = readData(value, "constraints");
    if (constraintsRead.status !== "DATA") return prepareFailure("INPUT", "POLICY_EVALUATION_INPUT_INVALID");
    constraints = constraintsRead.value;
  }
  if (keys.includes("lease") && readData(value, "lease").status !== "DATA") return prepareFailure("INPUT", "POLICY_EVALUATION_INPUT_INVALID");

  const common = {
    id: id.value,
    effect: effect.value,
    capabilities: capabilityList,
    resources: resourceList,
    ...(subjects === undefined ? {} : { subjects }),
    constraintsPresent,
    constraints,
  };
  const rule: PreparedRule = priority === undefined
    ? Object.freeze(common)
    : Object.freeze({ ...common, priority });
  return Object.freeze({ ok: true, rule });
}

function parseSubjectSelector(selector: string): ParsedSubjectSelector | undefined {
  const delimiter = selector.indexOf("://");
  if (delimiter <= 0) return undefined;
  const kind = selector.slice(0, delimiter);
  const id = selector.slice(delimiter + 3);
  if (!SUBJECT_KINDS.has(kind) || !isBoundedNonEmptyString(id, SUBJECT_REF_CODE_POINT_LIMIT)) return undefined;
  return Object.freeze({ kind, id });
}

function flattenBandRuleIds(bands: readonly RulePrecedenceBand[]): readonly string[] | undefined {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const band of bands) {
    for (const ruleId of band.ruleIds) {
      if (seen.has(ruleId)) return undefined;
      seen.add(ruleId);
      ids.push(ruleId);
    }
  }
  return Object.freeze(ids);
}

function validateRequestConstraintsBoundary(present: boolean, value: unknown): boolean {
  if (!present) return true;
  if (!isRecord(value)) return false;
  const keys = ownKeys(value);
  if (keys === undefined || keys.some(key => typeof key !== "string")) return false;
  return keys.every(key => readData(value, key).status === "DATA");
}

function inspectConstraintObject(value: unknown): "EMPTY" | "NON_EMPTY" | "INVALID" {
  if (!isRecord(value)) return "INVALID";
  const keys = ownKeys(value);
  if (keys === undefined || keys.some(key => typeof key !== "string")) return "INVALID";
  return keys.length === 0 ? "EMPTY" : "NON_EMPTY";
}

function snapshotUniqueNonEmptyStrings(value: unknown): readonly string[] | undefined {
  const items = snapshotArray(value);
  if (items === undefined || items.length === 0) return undefined;
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (typeof item !== "string" || item.length === 0 || seen.has(item)) return undefined;
    seen.add(item);
    result.push(item);
  }
  return Object.freeze(result);
}

function snapshotArray(value: unknown): readonly unknown[] | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  try {
    if (!Array.isArray(value)) return undefined;
  } catch {
    return undefined;
  }
  const keys = ownKeys(value);
  if (keys === undefined) return undefined;
  const lengthRead = readData(value, "length");
  if (lengthRead.status !== "DATA" || typeof lengthRead.value !== "number" || !Number.isSafeInteger(lengthRead.value) || lengthRead.value < 0) return undefined;
  const length = lengthRead.value;

  let indexes = 0;
  for (const key of keys) {
    if (key === "length") continue;
    if (typeof key !== "string" || !isCanonicalArrayIndex(key, length)) return undefined;
    indexes += 1;
  }
  if (indexes !== length) return undefined;

  const result: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const item = readData(value, String(index));
    if (item.status !== "DATA") return undefined;
    result.push(item.value);
  }
  return Object.freeze(result);
}

function isCanonicalArrayIndex(key: string, length: number): boolean {
  if (key === "0") return length > 0;
  if (key.length === 0 || key.length > 10 || key.charCodeAt(0) === 48) return false;
  for (let index = 0; index < key.length; index += 1) {
    const code = key.charCodeAt(index);
    if (code < 48 || code > 57) return false;
  }
  const numeric = Number(key);
  return Number.isInteger(numeric) && numeric >= 0 && numeric < length && String(numeric) === key;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null) return false;
  try {
    return !Array.isArray(value);
  } catch {
    return false;
  }
}

function ownKeys(value: object): readonly PropertyKey[] | undefined {
  try {
    return Reflect.ownKeys(value);
  } catch {
    return undefined;
  }
}

function hasOnlyAllowedStringKeys(keys: readonly PropertyKey[], allowed: ReadonlySet<string>): boolean {
  return keys.every(key => typeof key === "string" && allowed.has(key));
}

function readData(value: object, key: PropertyKey): DataRead {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) return { status: "MISSING" };
    if (!("value" in descriptor)) return { status: "ACCESSOR" };
    return { status: "DATA", value: descriptor.value };
  } catch {
    return { status: "UNREADABLE" };
  }
}

function isBoundedNonEmptyString(value: unknown, maxCodePoints: number): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  let count = 0;
  for (const _codePoint of value) {
    count += 1;
    if (count > maxCodePoints) return false;
  }
  return count > 0;
}

function isValidCapabilityName(value: string): boolean {
  return CAPABILITY_PATTERN.test(value) && isBoundedNonEmptyString(value, CAPABILITY_CODE_POINT_LIMIT);
}

function isPolicyRuleEffect(value: unknown): value is PolicyRuleEffect {
  return value === "deny" || value === "ask" || value === "allow";
}

function prepareFailure(stage: PolicyEvaluationStage, reason: PolicyEvaluationFailureReason): PrepareFailure {
  return Object.freeze({ ok: false, stage, reason });
}

function fail(stage: PolicyEvaluationStage, reasonCode: PolicyEvaluationFailureReason): PolicyEvaluationFailure {
  return Object.freeze({ status: "FAIL_CLOSED", effect: "deny", stage, reasonCode });
}

function success(
  effect: PolicyEvaluationSuccess["effect"],
  basis: PolicyEvaluationSuccess["basis"],
  reasonCode: PolicyEvaluationSuccess["reasonCode"],
  fullyApplicableRuleIds: readonly string[],
  contributingRuleIds: readonly string[],
): PolicyEvaluationSuccess {
  return Object.freeze({
    status: "EVALUATED",
    effect,
    basis,
    reasonCode,
    fullyApplicableRuleIds: Object.freeze([...fullyApplicableRuleIds]),
    contributingRuleIds: Object.freeze([...contributingRuleIds]),
  });
}
