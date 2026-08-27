/**
 * Capability Broker public package surface.
 *
 * Protocol types remain owned by `@dsh-safe/protocol`; this package provides
 * deterministic classification and later policy-broker orchestration without
 * depending on concrete Harness adapter types.
 */
export * from "./builtin-filesystem-tool-classifier.js";
