import type { GuaranteeLevel } from "@dsh-safe/protocol";

import {
  GUARANTEE_ASSIGNMENT_PROFILE,
  type GuaranteeAssigned,
  type GuaranteeAssignmentFailure,
  type GuaranteeAssignmentFailureReason,
  type GuaranteeAssignmentResult,
  type GuaranteeAssignmentStage,
  type ProcessIsolationBoundary,
  type NonSecurityProcessMechanism,
} from "./guarantee-assignment-types.js";

const INPUT_KEYS = new Set(["profile", "evidence"]);
const EVIDENCE_KEYS = new Set(["isolation", "provider", "tool"]);
const SINGLE_STATE_KEYS = new Set(["state"]);
const NON_SECURITY_ISOLATION_KEYS = new Set(["state", "mechanism"]);
const ENFORCING_ISOLATION_KEYS = new Set([
  "state",
  "boundary",
  "authorizationBinding",
  "coverage",
  "directHostBypass",
  "deploymentEvidence",
]);
const ENFORCING_PROVIDER_KEYS = new Set([
  "state",
  "authorizationBinding",
  "traversal",
  "coverage",
  "resourceIdentity",
  "deploymentEvidence",
]);
const ENFORCING_TOOL_KEYS = new Set(["state", "authorizationBinding", "dispatchControl"]);

const NON_SECURITY_MECHANISMS = new Set<NonSecurityProcessMechanism>([
  "PLAIN_PROCESS",
  "WORKER_THREAD",
  "SAME_WORLD_SANDBOX",
]);
const PROCESS_BOUNDARIES = new Set<ProcessIsolationBoundary>([
  "OS_PROCESS_SANDBOX",
  "CONTAINER",
  "VM",
  "MICROVM",
  "REMOTE_ISOLATED_RUNTIME",
]);

type DataRead =
  | { readonly status: "DATA"; readonly value: unknown }
  | { readonly status: "MISSING" | "ACCESSOR" | "UNREADABLE" };

type BoundaryAssessment =
  | { readonly status: "QUALIFIES" }
  | { readonly status: "VALID_WEAK" }
  | { readonly status: "INVALID" };

/**
 * Deterministically assign the strongest truthful M4-025 GuaranteeLevel from a
 * trusted, action-scoped enforcement-evidence projection.
 *
 * This primitive is intentionally pure. It does not probe the host, invoke an
 * Adapter/provider, create a sandbox, execute an action, or decide whether the
 * resulting level is sufficient for a caller's minimum-guarantee policy.
 */
export function assignGuaranteeLevel(input: unknown): GuaranteeAssignmentResult {
  if (!isRecord(input)) return fail("INPUT", "GUARANTEE_ASSIGNMENT_INPUT_INVALID");

  const inputKeys = ownKeys(input);
  if (inputKeys === undefined || !hasExactRequiredKeys(inputKeys, INPUT_KEYS)) {
    return fail("INPUT", "GUARANTEE_ASSIGNMENT_INPUT_INVALID");
  }

  const profile = readData(input, "profile");
  if (profile.status !== "DATA" || profile.value !== GUARANTEE_ASSIGNMENT_PROFILE) {
    return fail("INPUT", "GUARANTEE_ASSIGNMENT_PROFILE_INVALID");
  }

  const evidenceRead = readData(input, "evidence");
  if (evidenceRead.status !== "DATA" || !isRecord(evidenceRead.value)) {
    return fail("EVIDENCE", "GUARANTEE_ASSIGNMENT_EVIDENCE_INVALID");
  }

  const evidence = evidenceRead.value;
  const evidenceKeys = ownKeys(evidence);
  if (evidenceKeys === undefined || !hasExactRequiredKeys(evidenceKeys, EVIDENCE_KEYS)) {
    return fail("EVIDENCE", "GUARANTEE_ASSIGNMENT_EVIDENCE_INVALID");
  }

  const isolationRead = readData(evidence, "isolation");
  if (isolationRead.status !== "DATA") {
    return fail("ISOLATION", "GUARANTEE_ASSIGNMENT_ISOLATION_EVIDENCE_INVALID");
  }
  const isolation = assessIsolation(isolationRead.value);
  if (isolation.status === "INVALID") {
    return fail("ISOLATION", "GUARANTEE_ASSIGNMENT_ISOLATION_EVIDENCE_INVALID");
  }
  if (isolation.status === "QUALIFIES") {
    return assigned("process-isolated", "GUARANTEE_ASSIGNED_PROCESS_ISOLATED");
  }

  const providerRead = readData(evidence, "provider");
  if (providerRead.status !== "DATA") {
    return fail("PROVIDER", "GUARANTEE_ASSIGNMENT_PROVIDER_EVIDENCE_INVALID");
  }
  const provider = assessProvider(providerRead.value);
  if (provider.status === "INVALID") {
    return fail("PROVIDER", "GUARANTEE_ASSIGNMENT_PROVIDER_EVIDENCE_INVALID");
  }
  if (provider.status === "QUALIFIES") {
    return assigned("provider-enforced", "GUARANTEE_ASSIGNED_PROVIDER_ENFORCED");
  }

  const toolRead = readData(evidence, "tool");
  if (toolRead.status !== "DATA") {
    return fail("TOOL", "GUARANTEE_ASSIGNMENT_TOOL_EVIDENCE_INVALID");
  }
  const tool = assessTool(toolRead.value);
  if (tool.status === "INVALID") {
    return fail("TOOL", "GUARANTEE_ASSIGNMENT_TOOL_EVIDENCE_INVALID");
  }
  if (tool.status === "QUALIFIES") {
    return assigned("tool-enforced", "GUARANTEE_ASSIGNED_TOOL_ENFORCED");
  }

  return assigned("advisory", "GUARANTEE_ASSIGNED_ADVISORY");
}

function assessIsolation(value: unknown): BoundaryAssessment {
  if (!isRecord(value)) return invalid();
  const keys = ownKeys(value);
  if (keys === undefined) return invalid();

  const state = readData(value, "state");
  if (state.status !== "DATA") return invalid();

  if (state.value === "NONE") {
    return hasExactRequiredKeys(keys, SINGLE_STATE_KEYS) ? weak() : invalid();
  }

  if (state.value === "NON_SECURITY_BOUNDARY") {
    if (!hasExactRequiredKeys(keys, NON_SECURITY_ISOLATION_KEYS)) return invalid();
    const mechanism = readData(value, "mechanism");
    if (
      mechanism.status !== "DATA"
      || typeof mechanism.value !== "string"
      || !NON_SECURITY_MECHANISMS.has(mechanism.value as NonSecurityProcessMechanism)
    ) {
      return invalid();
    }
    return weak();
  }

  if (state.value !== "ENFORCING") return invalid();
  if (!hasExactRequiredKeys(keys, ENFORCING_ISOLATION_KEYS)) return invalid();

  const boundary = readData(value, "boundary");
  const authorizationBinding = readData(value, "authorizationBinding");
  const coverage = readData(value, "coverage");
  const directHostBypass = readData(value, "directHostBypass");
  const deploymentEvidence = readData(value, "deploymentEvidence");

  if (
    boundary.status !== "DATA"
    || typeof boundary.value !== "string"
    || !PROCESS_BOUNDARIES.has(boundary.value as ProcessIsolationBoundary)
    || authorizationBinding.status !== "DATA"
    || (authorizationBinding.value !== "EXACT_CAPABILITY_RESOURCE")
    || coverage.status !== "DATA"
    || (coverage.value !== "COMPLETE" && coverage.value !== "PARTIAL")
    || directHostBypass.status !== "DATA"
    || (directHostBypass.value !== "BLOCKED" && directHostBypass.value !== "NOT_BLOCKED")
    || deploymentEvidence.status !== "DATA"
    || (deploymentEvidence.value !== "VERIFIED" && deploymentEvidence.value !== "UNVERIFIED")
  ) {
    return invalid();
  }

  return coverage.value === "COMPLETE"
    && directHostBypass.value === "BLOCKED"
    && deploymentEvidence.value === "VERIFIED"
    ? qualifies()
    : weak();
}

function assessProvider(value: unknown): BoundaryAssessment {
  if (!isRecord(value)) return invalid();
  const keys = ownKeys(value);
  if (keys === undefined) return invalid();

  const state = readData(value, "state");
  if (state.status !== "DATA") return invalid();

  if (state.value === "NONE" || state.value === "MEDIATED_ONLY") {
    return hasExactRequiredKeys(keys, SINGLE_STATE_KEYS) ? weak() : invalid();
  }

  if (state.value !== "ENFORCING") return invalid();
  if (!hasExactRequiredKeys(keys, ENFORCING_PROVIDER_KEYS)) return invalid();

  const authorizationBinding = readData(value, "authorizationBinding");
  const traversal = readData(value, "traversal");
  const coverage = readData(value, "coverage");
  const resourceIdentity = readData(value, "resourceIdentity");
  const deploymentEvidence = readData(value, "deploymentEvidence");

  if (
    authorizationBinding.status !== "DATA"
    || authorizationBinding.value !== "EXACT_CAPABILITY_RESOURCE"
    || traversal.status !== "DATA"
    || (traversal.value !== "MANDATORY" && traversal.value !== "BYPASSABLE")
    || coverage.status !== "DATA"
    || (coverage.value !== "COMPLETE" && coverage.value !== "PARTIAL")
    || resourceIdentity.status !== "DATA"
    || (resourceIdentity.value !== "PROVIDER_CANONICAL" && resourceIdentity.value !== "NON_CANONICAL")
    || deploymentEvidence.status !== "DATA"
    || (deploymentEvidence.value !== "VERIFIED" && deploymentEvidence.value !== "UNVERIFIED")
  ) {
    return invalid();
  }

  return traversal.value === "MANDATORY"
    && coverage.value === "COMPLETE"
    && resourceIdentity.value === "PROVIDER_CANONICAL"
    && deploymentEvidence.value === "VERIFIED"
    ? qualifies()
    : weak();
}

function assessTool(value: unknown): BoundaryAssessment {
  if (!isRecord(value)) return invalid();
  const keys = ownKeys(value);
  if (keys === undefined) return invalid();

  const state = readData(value, "state");
  if (state.status !== "DATA") return invalid();

  if (state.value === "NONE" || state.value === "AVAILABLE_ONLY") {
    return hasExactRequiredKeys(keys, SINGLE_STATE_KEYS) ? weak() : invalid();
  }

  if (state.value !== "ENFORCING") return invalid();
  if (!hasExactRequiredKeys(keys, ENFORCING_TOOL_KEYS)) return invalid();

  const authorizationBinding = readData(value, "authorizationBinding");
  const dispatchControl = readData(value, "dispatchControl");
  if (
    authorizationBinding.status !== "DATA"
    || authorizationBinding.value !== "EXACT_ACTION"
    || dispatchControl.status !== "DATA"
    || dispatchControl.value !== "MANDATORY"
  ) {
    return invalid();
  }

  return qualifies();
}

function assigned(
  guaranteeLevel: GuaranteeLevel,
  reasonCode: GuaranteeAssigned["reasonCode"],
): GuaranteeAssigned {
  return Object.freeze({ status: "ASSIGNED", guaranteeLevel, reasonCode });
}

function fail(
  stage: GuaranteeAssignmentStage,
  reasonCode: GuaranteeAssignmentFailureReason,
): GuaranteeAssignmentFailure {
  return Object.freeze({ status: "FAIL_CLOSED", stage, reasonCode });
}

function qualifies(): BoundaryAssessment {
  return Object.freeze({ status: "QUALIFIES" });
}

function weak(): BoundaryAssessment {
  return Object.freeze({ status: "VALID_WEAK" });
}

function invalid(): BoundaryAssessment {
  return Object.freeze({ status: "INVALID" });
}

function isRecord(value: unknown): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ownKeys(value: object): readonly PropertyKey[] | undefined {
  try {
    return Reflect.ownKeys(value);
  } catch {
    return undefined;
  }
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

function hasExactRequiredKeys(
  keys: readonly PropertyKey[],
  required: ReadonlySet<string>,
): boolean {
  if (keys.length !== required.size) return false;
  for (const key of keys) {
    if (typeof key !== "string" || !required.has(key)) return false;
  }
  return true;
}
