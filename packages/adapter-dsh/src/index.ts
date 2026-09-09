// R1 Alpha user-facing entrypoint. The explicit exports below are the reviewed
// public Adapter contract; legacy M2 re-exports that follow remain internal to
// this still-private workspace package until the R1-002 export audit removes or
// relocates them before R1-004 publishability work.
export { createDshRc5Adapter } from "./public-api.js";
export type { DshRc5Adapter, DshRc5AdapterOptions } from "./public-api.js";

export * from "./audit-events.js";
export * from "./correlation.js";
export * from "./dispatcher.js";
export * from "./errors.js";
export * from "./feature-matrix.js";
export * from "./normalize.js";
export * from "./ports.js";
export * from "./provider-ports.js";
export * from "./replay-reconciliation.js";
export * from "./runtime-events.js";
export * from "./sidecar.js";

/** @internal Legacy workspace-stage marker; not part of the R1 Alpha semver API. */
export const PACKAGE_STAGE = "M2-ADAPTER-CONFORMANCE" as const;
