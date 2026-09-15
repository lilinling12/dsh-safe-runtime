import type { PolicyRuleEffect } from "./effect-resolution-types.js";

export type DefaultDenyFailureReason =
  | "DEFAULT_EFFECT_CONFIG_INVALID"
  | "DEFAULT_DENY_INPUT_INVALID";

export interface DefaultDenyFinalized {
  readonly ok: true;
  readonly status: "FINALIZED";
  readonly effect: PolicyRuleEffect;
}

export interface DefaultDenyFailClosed {
  readonly ok: false;
  readonly status: "FAIL_CLOSED";
  readonly effect: "deny";
  readonly reason: DefaultDenyFailureReason;
}

export type DefaultDenyResult = DefaultDenyFinalized | DefaultDenyFailClosed;
