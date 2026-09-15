import type { PolicyDocumentLoadFailureReason } from "./policy-document-types.js";
import type {
  PolicySchemaValidationIssue,
  ValidatedPolicyDocument,
} from "./policy-schema-types.js";
import type { ResourceNormalizationFailureReason } from "./resource-normalization-types.js";

export const POLICY_RELOAD_MAX_EPOCH = Number.MAX_SAFE_INTEGER;

export interface PolicyReloadRequest {
  readonly format: string;
  readonly source: string;
}

export interface PolicyHotReloadEmptyState {
  readonly status: "EMPTY";
  readonly epoch: 0;
}

export interface PolicyHotReloadActiveState {
  readonly status: "ACTIVE";
  readonly epoch: number;
  readonly policy: ValidatedPolicyDocument;
}

export type PolicyHotReloadState =
  | PolicyHotReloadEmptyState
  | PolicyHotReloadActiveState;

export interface PolicyReloadSuccess {
  readonly ok: true;
  readonly status: "SWAPPED";
  readonly epoch: number;
}

export type PolicyReloadFailureStage =
  | "REQUEST"
  | "LOAD"
  | "SCHEMA"
  | "RESOURCE"
  | "STATE";

export type PolicyReloadResourceFailureReason =
  | ResourceNormalizationFailureReason
  | "RESOURCE_PATTERN_SYNTAX_INVALID";

export type PolicyReloadFailureReason =
  | "POLICY_RELOAD_REQUEST_INVALID"
  | PolicyDocumentLoadFailureReason
  | "POLICY_SCHEMA_INVALID"
  | PolicyReloadResourceFailureReason
  | "POLICY_RELOAD_EPOCH_EXHAUSTED"
  | "POLICY_RELOAD_INTERNAL_FAILURE";

export interface PolicyReloadFailure {
  readonly ok: false;
  readonly status: "RELOAD_REJECTED";
  readonly stage: PolicyReloadFailureStage;
  readonly reasonCode: PolicyReloadFailureReason;
  readonly instancePath?: string;
  readonly issues?: readonly PolicySchemaValidationIssue[];
}

export type PolicyReloadResult = PolicyReloadSuccess | PolicyReloadFailure;

export interface CapabilityPolicyHotReloadStore {
  /**
   * Returns the current immutable record reference. Callers may retain an ACTIVE
   * handle across later swaps; M4-009 never mutates or repoints that handle.
   */
  read(): PolicyHotReloadState;

  /**
   * Fully prepares one candidate synchronously and publishes it only after every
   * accepted M4-001..004 activation gate succeeds.
   */
  reload(request: unknown): PolicyReloadResult;
}
