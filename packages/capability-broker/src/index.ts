/**
 * Capability Broker public package surface.
 *
 * M4-010 filesystem classification, M4-011 built-in shell classification and
 * M4-012 MCP ToolAnnotations advisory classification are governance-closed.
 * M4-013 fixed v0.1 unknown-tool fail-closed resolution is accepted at the
 * implementation boundary and is awaiting final governance closure.
 *
 * Generic/plugin classifier registration, PDP orchestration, approval/lease
 * semantics and Adapter enforcement remain outside this package stage.
 *
 * Protocol capability names remain owned by `@dsh-safe/protocol`; this package
 * has no concrete DeepSeek Harness runtime dependency.
 */
export const PACKAGE_STAGE = "M4-013-UNKNOWN-TOOL-FALLBACK-ACCEPTED" as const;

export * from "./builtin-filesystem-tool-classifier.js";
export * from "./tool-classifier/builtin-shell.js";
export * from "./tool-classifier/mcp-metadata.js";
export * from "./tool-classifier/unknown-tool-fallback.js";
