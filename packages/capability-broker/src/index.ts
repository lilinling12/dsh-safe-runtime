/**
 * Capability Broker public package surface.
 *
 * M4-010 filesystem classification and M4-011 built-in shell classification are
 * governance-closed. M4-012 MCP ToolAnnotations classification is implemented
 * as advisory evidence only and remains subject to exact-head acceptance.
 *
 * Unknown-tool fallback, plugin registration, PDP orchestration,
 * approval/lease semantics and Adapter enforcement remain outside this package
 * stage.
 *
 * Protocol capability names remain owned by `@dsh-safe/protocol`; this package
 * has no concrete DeepSeek Harness runtime dependency.
 */
export const PACKAGE_STAGE = "M4-012-MCP-METADATA-CLASSIFIER-IMPLEMENTED" as const;

export * from "./builtin-filesystem-tool-classifier.js";
export * from "./tool-classifier/builtin-shell.js";
export * from "./tool-classifier/mcp-metadata.js";
