import type { Digest } from "./common.js";

export type TransactionState =
  | "NEW"
  | "PREPARING"
  | "ACTIVE"
  | "VERIFYING"
  | "PREPARING_COMMIT"
  | "COMMITTING"
  | "RECOVERY_REQUIRED"
  | "ROLLING_BACK"
  | "COMMITTED"
  | "ROLLED_BACK"
  | "CONFLICTED"
  | "ABORTED"
  | "FAILED";

export type FileOperation = "create" | "modify" | "delete" | "move";

export interface FileDelta {
  readonly path: string;
  readonly operation: FileOperation;
  readonly baseVersion: string | null;
  readonly finalVersion?: string | null;
  readonly contentDigest?: Digest;
}

export type ExternalEffectClassification =
  | "transactional"
  | "compensatable"
  | "external-nontransactional";

export interface ExternalEffect {
  readonly classification: ExternalEffectClassification;
  readonly description: string;
}

export interface WorkspaceTransaction {
  readonly apiVersion: "safe-runtime.dev/v1alpha1";
  readonly kind: "WorkspaceTransaction";
  readonly transactionRef: string;
  readonly sessionRef: string;
  readonly turnRef?: string;
  readonly state: TransactionState;
  readonly scope: "workspace-filesystem-effects";
  readonly baseRevision: string;
  readonly shadowRef?: string;
  readonly fileDeltas?: readonly FileDelta[];
  readonly externalEffects?: readonly ExternalEffect[];
  readonly createdAt: string;
  readonly updatedAt?: string;
}

export interface CommitPlanEntry {
  readonly targetRef: string;
  readonly operation: "create" | "replace" | "delete" | "move";
  readonly expectedBaseVersion: string | null;
  readonly sourceRef?: string;
  readonly contentDigest?: import("./common.js").Digest;
  readonly backupRef?: string;
}

export interface CommitPlan {
  readonly apiVersion: "safe-runtime.dev/v1alpha1";
  readonly kind: "CommitPlan";
  readonly commitPlanRef: string;
  readonly transactionRef: string;
  readonly baseRevision: string;
  readonly entries: readonly CommitPlanEntry[];
  readonly createdAt: string;
}

export interface CommitResult {
  readonly apiVersion: "safe-runtime.dev/v1alpha1";
  readonly kind: "CommitResult";
  readonly commitResultRef: string;
  readonly transactionRef: string;
  readonly commitPlanRef?: string;
  readonly status: "COMMITTED" | "CONFLICTED" | "RECOVERY_REQUIRED" | "FAILED";
  readonly appliedEntries?: number;
  readonly conflictTargetRefs?: readonly string[];
  readonly errorCode?: string;
  readonly completedAt: string;
}

export interface RecoveryRecord {
  readonly apiVersion: "safe-runtime.dev/v1alpha1";
  readonly kind: "RecoveryRecord";
  readonly recoveryRef: string;
  readonly transactionRef: string;
  readonly journalRef: string;
  readonly strategy: "resume-commit" | "restore-base" | "manual";
  readonly status:
    | "PENDING"
    | "RUNNING"
    | "RECOVERED_COMMITTED"
    | "RECOVERED_ROLLED_BACK"
    | "FAILED"
    | "MANUAL_REQUIRED";
  readonly lastAppliedEntry?: number;
  readonly errorCode?: string;
  readonly updatedAt: string;
}
