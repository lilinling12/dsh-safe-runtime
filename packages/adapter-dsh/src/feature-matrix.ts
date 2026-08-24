import { dshAdapterError } from "./errors.js";

export const DSH_TESTED_BASELINE = {
  version: "0.1.0-rc.5",
  commit: "47f943859bef60e4160492346772ded9b24f765a",
} as const;

export interface AdapterFeatureMatrix {
  readonly toolsPreExecute: boolean;
  readonly toolsMonotonicGuard: boolean;
  readonly toolsFinalResultObserver: boolean;
  readonly toolsArgumentRewrite: boolean;
  readonly toolsScopedRestriction: boolean;
  readonly toolsRestrictionIsAuthorityBoundary: boolean;
  readonly approvalOneShot: boolean;
  readonly approvalFailClosed: boolean;
  readonly agentTurnStopping: boolean;
  readonly durableToolCall: boolean;
  readonly durableToolResult: boolean;
  readonly filesystemProviderSeam: boolean;
  readonly filesystemOpaqueTargets: boolean;
  readonly filesystemVersionTokens: boolean;
  readonly subprocessProviderSeam: boolean;
  readonly fsAndSubprocessShareExecutionWorld: boolean;
  readonly sandboxUniversalNetworkBoundary: boolean;
  readonly externalCustomSessionEventsStable: boolean;
}

export const DSH_RC5_FEATURES: AdapterFeatureMatrix = Object.freeze({
  toolsPreExecute: true,
  toolsMonotonicGuard: true,
  toolsFinalResultObserver: true,
  toolsArgumentRewrite: false,
  toolsScopedRestriction: true,
  toolsRestrictionIsAuthorityBoundary: false,
  approvalOneShot: true,
  approvalFailClosed: true,
  agentTurnStopping: true,
  durableToolCall: true,
  durableToolResult: true,
  filesystemProviderSeam: true,
  filesystemOpaqueTargets: true,
  filesystemVersionTokens: true,
  subprocessProviderSeam: true,
  fsAndSubprocessShareExecutionWorld: true,
  sandboxUniversalNetworkBoundary: false,
  externalCustomSessionEventsStable: false,
});

/**
 * Source-backed facts about the concrete provider families shipped at the
 * pinned Harness baseline. These are deliberately separate from
 * {@link AdapterFeatureMatrix}: they describe compatibility/security
 * properties that a safe-runtime implementation must reason about, not
 * optional adapter features that callers can simply require at runtime.
 */
export interface ProviderCompatibilityFacts {
  /** `FileSystem.processPath()` intentionally bridges a target to OS/process space. */
  readonly filesystemProcessPathBridge: boolean;
  /** Bare `fs-local` cwd is only a relative-path base, never a confinement root. */
  readonly filesystemLocalCwdIsContainmentBoundary: boolean;
  /** Existing local targets use realpath-derived identity, merging symlink aliases. */
  readonly filesystemLocalIdentityIsRealpathDerived: boolean;
  /** `fs-sandbox` applies its mode fence to write/edit mutation calls. */
  readonly filesystemSandboxConfinesMutations: boolean;
  /** `fs-sandbox` intentionally allows reads in every sandbox mode. */
  readonly filesystemSandboxConfinesReads: boolean;
  /** Local subprocess execution performs host OS access directly rather than through `ctx.fs`. */
  readonly localSubprocessHostAccessUsesFilesystemProvider: boolean;
  /** The local subprocess ambient credential scrub is name-pattern based, not a complete secret boundary. */
  readonly localSubprocessCredentialScrubIsHeuristic: boolean;
  /** Harness sandbox policy vocabulary governs file effects only. */
  readonly sandboxPolicyScope: "file-effects-only";
  /** Sandbox providers may explicitly report incomplete file-effect enforcement. */
  readonly sandboxCanReportPartialEnforcement: boolean;
  /** The sandbox seam is not a general process-isolation boundary. */
  readonly sandboxIsGeneralProcessIsolationBoundary: boolean;
}

export const DSH_RC5_PROVIDER_FACTS: ProviderCompatibilityFacts = Object.freeze({
  filesystemProcessPathBridge: true,
  filesystemLocalCwdIsContainmentBoundary: false,
  filesystemLocalIdentityIsRealpathDerived: true,
  filesystemSandboxConfinesMutations: true,
  filesystemSandboxConfinesReads: false,
  localSubprocessHostAccessUsesFilesystemProvider: false,
  localSubprocessCredentialScrubIsHeuristic: true,
  sandboxPolicyScope: "file-effects-only",
  sandboxCanReportPartialEnforcement: true,
  sandboxIsGeneralProcessIsolationBoundary: false,
});

export type AdapterFeature = keyof AdapterFeatureMatrix;

export function requireAdapterFeatures(
  features: AdapterFeatureMatrix,
  required: readonly AdapterFeature[],
): void {
  const missing = required.filter((feature) => features[feature] !== true);
  if (missing.length > 0) {
    throw dshAdapterError(
      "UNSUPPORTED_ADAPTER_FEATURES",
      `required DeepSeek Harness adapter features are unavailable: ${missing.join(", ")}`,
    );
  }
}
