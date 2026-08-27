/**
 * Capability Broker public package surface.
 *
 * M4-010 filesystem classification and M4-011 built-in shell classification are
 * accepted at their implementation boundaries. Final M4-011 governance closure
 * is still pending exact-head acceptance-record and governance dual-green.
 *
 * Unknown-tool fallback, MCP metadata classification, plugin registration, PDP
 * orchestration, approval/lease semantics and Adapter enforcement remain outside
 * this package stage.
 *
 * Protocol capability names remain owned by `@dsh-safe/protocol`; this package
 * has no concrete DeepSeek Harness runtime dependency.
 */
export const PACKAGE_STAGE = "M4-011-BUILTIN-SHELL-CLASSIFIER-ACCEPTED-GOVERNANCE-PENDING" as const;

export * from "./builtin-filesystem-tool-classifier.js";
export * from "./tool-classifier/builtin-shell.js";
