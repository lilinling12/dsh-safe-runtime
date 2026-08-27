/**
 * Capability Broker public package surface.
 *
 * M4-010 filesystem classification remains backward-compatible while M4-011
 * adds the exact built-in shell classifier defined by Spec 0027. Unknown-tool
 * fallback, plugin registration, PDP orchestration, and Adapter enforcement are
 * deliberately outside this package stage.
 *
 * Protocol capability names remain owned by `@dsh-safe/protocol`; this package
 * has no concrete DeepSeek Harness runtime dependency.
 */
export const PACKAGE_STAGE = "M4-011-BUILTIN-SHELL-CLASSIFIER-CONFORMANCE" as const;

export * from "./builtin-filesystem-tool-classifier.js";
export * from "./tool-classifier/builtin-shell.js";
