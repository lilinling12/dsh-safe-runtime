import type { SubjectKind } from "@dsh-safe/protocol";

export const SUBJECT_REF_CODE_POINT_LIMIT = 512 as const;

export type SubjectResolutionFailureReason =
  | "SUBJECT_REQUEST_SESSION_INVALID"
  | "SUBJECT_INPUT_INVALID"
  | "SUBJECT_INPUT_UNREADABLE"
  | "SUBJECT_FIELDS_INVALID"
  | "SUBJECT_KIND_INVALID"
  | "SUBJECT_ID_INVALID"
  | "SUBJECT_PARENT_INVALID"
  | "SUBJECT_SESSION_REF_INVALID"
  | "SUBJECT_SESSION_MISMATCH";

interface ResolvedSubjectBase {
  readonly id: string;
  readonly sessionRef: string;
}

export interface ResolvedSubagentSubject extends ResolvedSubjectBase {
  readonly kind: "subagent";
  readonly parent: string;
}

export interface ResolvedNonSubagentSubject extends ResolvedSubjectBase {
  readonly kind: Exclude<SubjectKind, "subagent">;
  readonly parent?: string | null;
}

/**
 * Canonical Subject identity/context emitted by the M4-020 resolver.
 *
 * The authoritative request session is always materialized. The value does not
 * assert authentication, parent existence, lineage proof, delegation, policy
 * matching or authorization.
 */
export type ResolvedSubject = ResolvedSubagentSubject | ResolvedNonSubagentSubject;

export interface SubjectResolutionSuccess {
  readonly status: "RESOLVED";
  readonly subject: ResolvedSubject;
}

export interface SubjectResolutionFailure {
  readonly status: "ERROR";
  readonly reason: SubjectResolutionFailureReason;
}

export type SubjectResolutionResult = SubjectResolutionSuccess | SubjectResolutionFailure;
