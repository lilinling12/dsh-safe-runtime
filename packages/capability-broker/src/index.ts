/**
 * Capability Broker public package surface.
 *
 * M4-010 built-in filesystem classification is accepted at its implementation
 * boundary. Later classifiers, PDP orchestration and Adapter enforcement remain
 * unauthorized pending governance closure.
 *
 * Protocol types remain owned by `@dsh-safe/protocol`; this package does not
 * depend on concrete DeepSeek Harness Adapter types.
 */
export const PACKAGE_STAGE = "M4-010-BUILTIN-FS-CLASSIFIER-CONFORMANCE" as const;

export * from "./builtin-filesystem-tool-classifier.js";
