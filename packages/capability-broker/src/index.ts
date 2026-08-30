/**
 * Capability Broker public package surface.
 *
 * M4-010 through M4-013 classifier/fallback stages are governance-closed.
 * M4-014 adds the protocol-reviewed immutable exact-owner plugin classifier
 * registry and registry-aware resolver. This is classification evidence only:
 * PDP orchestration, approval/lease semantics, PEP enforcement and plugin
 * process isolation remain later Gates.
 *
 * Protocol capability names remain owned by `@dsh-safe/protocol`; this package
 * has no concrete DeepSeek Harness runtime dependency.
 */
export const PACKAGE_STAGE = "M4-014-PLUGIN-CLASSIFIER-IMPLEMENTED" as const;

export * from "./builtin-filesystem-tool-classifier.js";
export * from "./tool-classifier/builtin-shell.js";
export * from "./tool-classifier/mcp-metadata.js";
export * from "./tool-classifier/unknown-tool-fallback.js";
export * from "./tool-classifier/plugin-classifier.js";
