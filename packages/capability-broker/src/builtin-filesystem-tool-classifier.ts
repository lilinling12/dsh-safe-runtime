/**
 * Compatibility export for the accepted M4-010 module path.
 *
 * The implementation now lives under `tool-classifier/` so built-in
 * classifiers can share package-internal hostile-input primitives without
 * expanding the public classifier abstraction ahead of M4-014.
 */
export * from "./tool-classifier/builtin-filesystem.js";
