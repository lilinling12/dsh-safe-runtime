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

export type AdapterFeature = keyof AdapterFeatureMatrix;

export function requireAdapterFeatures(
  features: AdapterFeatureMatrix,
  required: readonly AdapterFeature[],
): void {
  const missing = required.filter((feature) => features[feature] !== true);
  if (missing.length > 0) {
    throw new Error(`UNSUPPORTED_ADAPTER_FEATURES: ${missing.join(", ")}`);
  }
}
