import { normalizePolicyResourceSelector } from "./resource-normalizer.js";
import { validateCanonicalPolicyResourcePattern } from "./resource-pattern.js";
import type { ResourceNormalizationFailureReason } from "./resource-normalization-types.js";
import {
  POLICY_DIAGNOSTICS_LIMIT,
  type PolicyDiagnostic,
  type PolicyDiagnosticCode,
  type PolicyDiagnosticSeverity,
  type PolicyDiagnosticsFailure,
  type PolicyDiagnosticsResult,
} from "./policy-diagnostics-types.js";

type PolicyRuleEffect = "deny" | "ask" | "allow";

interface OwnDataProperty {
  readonly status: "VALUE";
  readonly value: unknown;
}

interface MissingProperty {
  readonly status: "MISSING";
}

interface InvalidProperty {
  readonly status: "INVALID";
}

type OwnPropertyRead = OwnDataProperty | MissingProperty | InvalidProperty;

interface PreparedRule {
  readonly id: string;
  readonly effect: PolicyRuleEffect;
  readonly resources: readonly string[];
  readonly hasPriority: boolean;
  readonly priority?: number;
}

interface PreparedPolicy {
  readonly rules: readonly PreparedRule[];
}

interface PreparedPolicySuccess {
  readonly ok: true;
  readonly policy: PreparedPolicy;
}

type PreparedPolicyResult = PreparedPolicySuccess | PolicyDiagnosticsFailure;

interface DiagnosticCollector {
  readonly diagnostics: PolicyDiagnostic[];
  truncated: boolean;
}

function failure(): PolicyDiagnosticsFailure {
  return Object.freeze({
    ok: false,
    status: "DIAGNOSTICS_FAILED",
    reason: "POLICY_DIAGNOSTICS_INPUT_INVALID",
  });
}

function readOwnProperty(value: object, key: PropertyKey): OwnPropertyRead {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) {
      return { status: "MISSING" };
    }
    if (!("value" in descriptor)) {
      return { status: "INVALID" };
    }
    return { status: "VALUE", value: descriptor.value };
  } catch {
    return { status: "INVALID" };
  }
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
 * Snapshot only dense data arrays. A policy arriving through M4-002 is already
 * plain JSON, but this defensive seam prevents direct JavaScript callers from
 * smuggling getters, sparse indexes, symbols, or named properties into the
 * diagnostics path.
 */
function snapshotDenseArray(value: unknown): readonly unknown[] | undefined {
  let arrayValue: readonly unknown[];
  try {
    if (!Array.isArray(value)) {
      return undefined;
    }
    arrayValue = value;
  } catch {
    return undefined;
  }

  const lengthProperty = readOwnProperty(arrayValue, "length");
  if (
    lengthProperty.status !== "VALUE" ||
    typeof lengthProperty.value !== "number" ||
    !Number.isSafeInteger(lengthProperty.value) ||
    lengthProperty.value < 0
  ) {
    return undefined;
  }
  const length = lengthProperty.value;

  let keys: readonly PropertyKey[];
  try {
    keys = Reflect.ownKeys(arrayValue);
  } catch {
    return undefined;
  }

  let indexCount = 0;
  for (const key of keys) {
    if (key === "length") {
      continue;
    }
    if (typeof key !== "string" || !isCanonicalArrayIndexKey(key, length)) {
      return undefined;
    }
    indexCount += 1;
  }
  if (indexCount !== length) {
    return undefined;
  }

  const snapshot: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const element = readOwnProperty(arrayValue, String(index));
    if (element.status !== "VALUE") {
      return undefined;
    }
    snapshot.push(element.value);
  }
  return snapshot;
}

function isValidRuleId(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  let count = 0;
  for (const codePoint of value) {
    void codePoint;
    count += 1;
    if (count > 128) {
      return false;
    }
  }
  return true;
}

function isPolicyRuleEffect(value: unknown): value is PolicyRuleEffect {
  return value === "deny" || value === "ask" || value === "allow";
}

function prepareRule(value: unknown): PreparedRule | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = readOwnProperty(value, "id");
  const effect = readOwnProperty(value, "effect");
  const resources = readOwnProperty(value, "resources");
  const priority = readOwnProperty(value, "priority");

  if (
    id.status !== "VALUE" ||
    !isValidRuleId(id.value) ||
    effect.status !== "VALUE" ||
    !isPolicyRuleEffect(effect.value) ||
    resources.status !== "VALUE"
  ) {
    return undefined;
  }

  const resourceValues = snapshotDenseArray(resources.value);
  if (resourceValues === undefined || resourceValues.length === 0) {
    return undefined;
  }

  const resourceStrings: string[] = [];
  for (const resource of resourceValues) {
    if (typeof resource !== "string") {
      return undefined;
    }
    resourceStrings.push(resource);
  }

  if (priority.status === "INVALID") {
    return undefined;
  }
  if (priority.status === "VALUE") {
    if (
      typeof priority.value !== "number" ||
      !Number.isInteger(priority.value) ||
      priority.value < -1_000_000 ||
      priority.value > 1_000_000
    ) {
      return undefined;
    }
    return Object.freeze({
      id: id.value,
      effect: effect.value,
      resources: Object.freeze(resourceStrings),
      hasPriority: true,
      priority: priority.value,
    });
  }

  return Object.freeze({
    id: id.value,
    effect: effect.value,
    resources: Object.freeze(resourceStrings),
    hasPriority: false,
  });
}

function preparePolicy(policyInput: unknown): PreparedPolicyResult {
  if (!isRecord(policyInput)) {
    return failure();
  }

  const specProperty = readOwnProperty(policyInput, "spec");
  if (specProperty.status !== "VALUE" || !isRecord(specProperty.value)) {
    return failure();
  }

  const rulesProperty = readOwnProperty(specProperty.value, "rules");
  if (rulesProperty.status !== "VALUE") {
    return failure();
  }

  const ruleValues = snapshotDenseArray(rulesProperty.value);
  if (ruleValues === undefined) {
    return failure();
  }

  const rules: PreparedRule[] = [];
  for (const value of ruleValues) {
    const rule = prepareRule(value);
    if (rule === undefined) {
      return failure();
    }
    rules.push(rule);
  }

  return Object.freeze({
    ok: true,
    policy: Object.freeze({ rules: Object.freeze(rules) }),
  });
}

function freezeDiagnostic(
  severity: PolicyDiagnosticSeverity,
  code: PolicyDiagnosticCode,
  instancePath: string,
  relatedPaths?: readonly string[],
): PolicyDiagnostic {
  if (relatedPaths === undefined) {
    return Object.freeze({ severity, code, instancePath });
  }
  return Object.freeze({
    severity,
    code,
    instancePath,
    relatedPaths: Object.freeze([...relatedPaths]),
  });
}

function addDiagnostic(collector: DiagnosticCollector, diagnostic: PolicyDiagnostic): boolean {
  if (collector.diagnostics.length < POLICY_DIAGNOSTICS_LIMIT) {
    collector.diagnostics.push(diagnostic);
    return true;
  }
  collector.truncated = true;
  return false;
}

function selectorFailureCode(
  reason: ResourceNormalizationFailureReason,
): PolicyDiagnosticCode | undefined {
  switch (reason) {
    case "RESOURCE_SCHEME_UNSUPPORTED":
    case "RESOURCE_LOCATOR_INVALID":
    case "RESOURCE_SELECTOR_SYNTAX_INVALID":
    case "RESOURCE_LIMIT_EXCEEDED":
      return reason;
    case "RESOURCE_INPUT_INVALID":
    case "RESOURCE_PROVIDER_IDENTITY_INVALID":
      return undefined;
  }
}

function diagnosed(collector: DiagnosticCollector): PolicyDiagnosticsResult {
  return Object.freeze({
    ok: true,
    status: "DIAGNOSED",
    diagnostics: Object.freeze([...collector.diagnostics]),
    truncated: collector.truncated,
  });
}

/**
 * Produce deterministic authoring diagnostics without participating in policy
 * authorization. The function inspects only fields owned by Spec 0024; deferred
 * capability/subject/constraint/lease semantics are intentionally never read.
 */
export function diagnoseCapabilityPolicy(policyInput: unknown): PolicyDiagnosticsResult {
  const prepared = preparePolicy(policyInput);
  if (!prepared.ok) {
    return prepared;
  }

  const collector: DiagnosticCollector = { diagnostics: [], truncated: false };
  const { rules } = prepared.policy;

  if (rules.length === 0) {
    addDiagnostic(
      collector,
      freezeDiagnostic(
        "INFO",
        "POLICY_DIAGNOSTIC_EMPTY_RULE_SET",
        "/spec/rules",
      ),
    );
    return diagnosed(collector);
  }

  const firstRulePathById = new Map<string, string>();

  for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
    const rule = rules[ruleIndex];
    if (rule === undefined) {
      return failure();
    }
    const basePath = `/spec/rules/${ruleIndex}`;
    const idPath = `${basePath}/id`;
    const firstIdPath = firstRulePathById.get(rule.id);
    if (firstIdPath === undefined) {
      firstRulePathById.set(rule.id, idPath);
    } else if (
      !addDiagnostic(
        collector,
        freezeDiagnostic(
          "WARNING",
          "POLICY_DIAGNOSTIC_DUPLICATE_RULE_ID",
          idPath,
          [firstIdPath],
        ),
      )
    ) {
      return diagnosed(collector);
    }

    for (let resourceIndex = 0; resourceIndex < rule.resources.length; resourceIndex += 1) {
      const resource = rule.resources[resourceIndex];
      if (resource === undefined) {
        return failure();
      }
      const resourcePath = `${basePath}/resources/${resourceIndex}`;
      const normalized = normalizePolicyResourceSelector(resource);
      if (!normalized.ok) {
        const code = selectorFailureCode(normalized.reason);
        if (code === undefined) {
          return failure();
        }
        if (!addDiagnostic(collector, freezeDiagnostic("ERROR", code, resourcePath))) {
          return diagnosed(collector);
        }
        continue;
      }

      const pattern = validateCanonicalPolicyResourcePattern(normalized.selector);
      if (!pattern.ok) {
        if (pattern.reason !== "RESOURCE_PATTERN_SYNTAX_INVALID") {
          return failure();
        }
        if (
          !addDiagnostic(
            collector,
            freezeDiagnostic("ERROR", "RESOURCE_PATTERN_SYNTAX_INVALID", resourcePath),
          )
        ) {
          return diagnosed(collector);
        }
      }
    }

    if (rule.hasPriority) {
      const priorityPath = `${basePath}/priority`;
      if (rule.effect === "deny") {
        if (
          !addDiagnostic(
            collector,
            freezeDiagnostic(
              "WARNING",
              "POLICY_DIAGNOSTIC_REDUNDANT_DENY_PRIORITY",
              priorityPath,
            ),
          )
        ) {
          return diagnosed(collector);
        }
      } else if (rule.priority === 0) {
        if (
          !addDiagnostic(
            collector,
            freezeDiagnostic(
              "WARNING",
              "POLICY_DIAGNOSTIC_REDUNDANT_ZERO_PRIORITY",
              priorityPath,
            ),
          )
        ) {
          return diagnosed(collector);
        }
      }
    }
  }

  return diagnosed(collector);
}
