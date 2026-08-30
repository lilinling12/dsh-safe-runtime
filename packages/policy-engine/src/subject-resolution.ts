import type { SubjectKind } from "@dsh-safe/protocol";
import {
  SUBJECT_REF_CODE_POINT_LIMIT,
  type ResolvedNonSubagentSubject,
  type ResolvedSubagentSubject,
  type SubjectResolutionFailure,
  type SubjectResolutionFailureReason,
  type SubjectResolutionResult,
} from "./subject-resolution-types.js";

const SUBJECT_KINDS: ReadonlySet<SubjectKind> = new Set<SubjectKind>([
  "agent",
  "subagent",
  "tool",
  "plugin",
  "system",
  "verifier",
  "human",
  "service",
]);

const SUBJECT_FIELDS: ReadonlySet<string> = new Set(["kind", "id", "parent", "sessionRef"]);

type OwnDataRead =
  | { readonly status: "DATA"; readonly value: unknown }
  | { readonly status: "MISSING" }
  | { readonly status: "MALFORMED" }
  | { readonly status: "UNREADABLE" };

/**
 * Resolve an untrusted Subject shape against the authoritative request session.
 *
 * M4-020 intentionally performs identity/context validation only. This function
 * does not authenticate the subject, dereference a parent, prove lineage,
 * evaluate policy selectors, create a CapabilityDecision or assign authority.
 */
export function resolveSubject(
  subjectInput: unknown,
  requestSessionRefInput: unknown,
): SubjectResolutionResult {
  if (!isProtocolRef(requestSessionRefInput)) {
    return failure("SUBJECT_REQUEST_SESSION_INVALID");
  }
  const requestSessionRef = requestSessionRefInput;

  const recordStatus = inspectSubjectRecord(subjectInput);
  if (recordStatus === "INVALID") {
    return failure("SUBJECT_INPUT_INVALID");
  }
  if (recordStatus === "UNREADABLE") {
    return failure("SUBJECT_INPUT_UNREADABLE");
  }
  const subject = subjectInput as object;

  let keys: readonly (string | symbol)[];
  try {
    keys = Reflect.ownKeys(subject);
  } catch {
    return failure("SUBJECT_INPUT_UNREADABLE");
  }

  if (
    keys.some(key => typeof key !== "string" || !SUBJECT_FIELDS.has(key))
    || !keys.includes("kind")
    || !keys.includes("id")
  ) {
    return failure("SUBJECT_FIELDS_INVALID");
  }

  const kindRead = readOwnData(subject, "kind");
  const kindFailure = readFailure(kindRead);
  if (kindFailure !== undefined) return kindFailure;
  if (!isSubjectKind(kindRead.value)) {
    return failure("SUBJECT_KIND_INVALID");
  }
  const kind = kindRead.value;

  const idRead = readOwnData(subject, "id");
  const idFailure = readFailure(idRead);
  if (idFailure !== undefined) return idFailure;
  if (!isProtocolRef(idRead.value)) {
    return failure("SUBJECT_ID_INVALID");
  }
  const id = idRead.value;

  const hasParent = keys.includes("parent");
  let parent: string | null | undefined;
  if (hasParent) {
    const parentRead = readOwnData(subject, "parent");
    const parentFailure = readFailure(parentRead);
    if (parentFailure !== undefined) return parentFailure;

    if (kind === "subagent") {
      if (!isProtocolRef(parentRead.value)) {
        return failure("SUBJECT_PARENT_INVALID");
      }
      parent = parentRead.value;
    } else if (parentRead.value === null) {
      parent = null;
    } else if (isProtocolRef(parentRead.value)) {
      parent = parentRead.value;
    } else {
      return failure("SUBJECT_PARENT_INVALID");
    }
  } else if (kind === "subagent") {
    return failure("SUBJECT_PARENT_INVALID");
  }

  const hasSubjectSession = keys.includes("sessionRef");
  let resolvedSessionRef = requestSessionRef;
  if (hasSubjectSession) {
    const sessionRead = readOwnData(subject, "sessionRef");
    const sessionFailure = readFailure(sessionRead);
    if (sessionFailure !== undefined) return sessionFailure;
    if (!isProtocolRef(sessionRead.value)) {
      return failure("SUBJECT_SESSION_REF_INVALID");
    }
    if (sessionRead.value !== requestSessionRef) {
      return failure("SUBJECT_SESSION_MISMATCH");
    }
    resolvedSessionRef = sessionRead.value;
  }

  if (kind === "subagent") {
    const resolved: ResolvedSubagentSubject = Object.freeze({
      kind,
      id,
      parent: parent as string,
      sessionRef: resolvedSessionRef,
    });
    return Object.freeze({ status: "RESOLVED", subject: resolved });
  }

  const resolved: ResolvedNonSubagentSubject = parent === undefined
    ? Object.freeze({ kind, id, sessionRef: resolvedSessionRef })
    : Object.freeze({ kind, id, parent, sessionRef: resolvedSessionRef });
  return Object.freeze({ status: "RESOLVED", subject: resolved });
}

function inspectSubjectRecord(value: unknown): "RECORD" | "INVALID" | "UNREADABLE" {
  if (typeof value !== "object" || value === null) {
    return "INVALID";
  }
  try {
    return Array.isArray(value) ? "INVALID" : "RECORD";
  } catch {
    return "UNREADABLE";
  }
}

function readOwnData(input: object, key: string): OwnDataRead {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined) {
      return { status: "MISSING" };
    }
    if (!("value" in descriptor)) {
      return { status: "MALFORMED" };
    }
    return { status: "DATA", value: descriptor.value };
  } catch {
    return { status: "UNREADABLE" };
  }
}

function readFailure(read: OwnDataRead): SubjectResolutionFailure | undefined {
  switch (read.status) {
    case "DATA":
      return undefined;
    case "UNREADABLE":
      return failure("SUBJECT_INPUT_UNREADABLE");
    case "MISSING":
    case "MALFORMED":
      return failure("SUBJECT_FIELDS_INVALID");
  }
}

function isSubjectKind(value: unknown): value is SubjectKind {
  return typeof value === "string" && SUBJECT_KINDS.has(value as SubjectKind);
}

/**
 * Match the existing v1alpha1 `ref` lexical contract: primitive string,
 * non-empty, at most 512 Unicode code points. The traversal exits immediately
 * once the portable bound is exceeded and performs no normalization.
 */
function isProtocolRef(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  let codePoints = 0;
  for (const _codePoint of value) {
    codePoints += 1;
    if (codePoints > SUBJECT_REF_CODE_POINT_LIMIT) {
      return false;
    }
  }
  return codePoints > 0;
}

function failure(reason: SubjectResolutionFailureReason): SubjectResolutionFailure {
  return Object.freeze({ status: "ERROR", reason });
}
