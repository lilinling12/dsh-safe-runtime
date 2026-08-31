/**
 * Capability Broker public package surface.
 *
 * M4-010 through M4-014 classifier/fallback stages and M4-020/M4-021 PDP
 * prerequisites are governance-closed. M4-022 deterministic CapabilityLease
 * candidate lookup is implementation-accepted after exact-head dual-green
 * protocol-first and implementation Gates; final governance closure remains
 * separate.
 *
 * Lease lookup is not lease validity or authorization: TTL, usage/consume,
 * revocation, attenuation, approval, decision receipts, guarantees and PEP
 * enforcement remain later Gates.
 *
 * Protocol capability names remain owned by `@dsh-safe/protocol`; this package
 * has no concrete DeepSeek Harness runtime dependency.
 */
export const PACKAGE_STAGE = "M4-022-LEASE-LOOKUP-ACCEPTED" as const;

export * from "./builtin-filesystem-tool-classifier.js";
export * from "./tool-classifier/builtin-shell.js";
export * from "./tool-classifier/mcp-metadata.js";
export * from "./tool-classifier/unknown-tool-fallback.js";
export * from "./tool-classifier/plugin-classifier-registry.js";
export { lookupCapabilityLeases } from "./lease-lookup.js";
export {
  type LeaseLookupCandidatesFound,
  type LeaseLookupFailure,
  type LeaseLookupFailureReason,
  type LeaseLookupInput,
  type LeaseLookupNoCandidate,
  type LeaseLookupOwnedFailureReason,
  type LeaseLookupResult,
  type LeaseLookupStage,
} from "./lease-lookup-types.js";
