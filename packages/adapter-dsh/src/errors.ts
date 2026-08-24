export type DshAdapterErrorCode =
  | "UNSUPPORTED_ADAPTER_FEATURES"
  | "INVALID_HARNESS_EVENT"
  | "UNSUPPORTED_HARNESS_TURN_END_REASON"
  | "INCONSISTENT_HARNESS_TOOL_OUTCOME"
  | "INVALID_COMPLETION_STEER_REQUEST"
  | "COMPLETION_STEER_BUDGET_EXHAUSTED"
  | "INVALID_SIDECAR_EVIDENCE_CORRELATION"
  | "INVALID_REPLAY_RECONCILIATION_INPUT"
  | "UNKNOWN_FILESYSTEM_TARGET"
  | "INCONSISTENT_PROVIDER_RESULT"
  | "HARNESS_AGENT_NOT_LIVE"
  | "HARNESS_SERVICE_UNAVAILABLE"
  | "ADAPTER_EVENT_SINK_FAILED";

/**
 * Stable adapter-layer failure with a machine-readable code.
 *
 * Adapter failures intentionally remain outside the safe-runtime protocol
 * vocabulary. They describe an inability to translate or enforce a Harness
 * integration contract, not a domain verdict.
 */
export class DshAdapterError extends Error {
  readonly code: DshAdapterErrorCode;

  constructor(
    code: DshAdapterErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "DshAdapterError";
    this.code = code;
  }
}

export function dshAdapterError(
  code: DshAdapterErrorCode,
  message: string,
  options?: ErrorOptions,
): DshAdapterError {
  return new DshAdapterError(code, message, options);
}
