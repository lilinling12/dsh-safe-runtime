// R1 Alpha public package root.
//
// Keep this surface intentionally small and explicit. Internal normalization,
// dispatcher, provider-port, replay, sidecar, correlation, compatibility and
// test/source-conformance helpers are available only through package-internal
// modules and are not part of the Alpha semver contract.
export { createDshRc5Adapter } from "./public-api.js";
export type { DshRc5Adapter, DshRc5AdapterOptions } from "./public-api.js";

export { createDshRc5Plugin } from "./plugin.js";
export type {
  DshRc5Plugin,
  DshRc5PluginOptions,
  DshRc5PluginPolicy,
} from "./plugin.js";

export { DshAdapterError } from "./errors.js";
export type { DshAdapterErrorCode } from "./errors.js";

export type { AdapterFeatureMatrix } from "./feature-matrix.js";
export type { RuntimeEvent, RuntimeEventSink } from "./runtime-events.js";
export type {
  AuditDeliverySummary,
  AuditObservationSubscription,
  DshAuditEvent,
  DshAuditEventSink,
} from "./audit-events.js";
export type {
  ApprovalDecision,
  ApprovalRequest,
  CompletionBoundaryRequest,
  CompletionSteerRequest,
  Disposable,
  ObservationSubscription,
  ToolExecutionScope,
  ToolGuardDecision,
  ToolGuardHandler,
  ToolPolicyDecision,
  ToolPolicyHandler,
  ToolPolicyRequest,
  TurnStoppingHandler,
} from "./ports.js";
