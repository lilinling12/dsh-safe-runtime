/**
 * @dsh-safe/testkit public boundary.
 *
 * M3 starts from language-independent contracts. The exports below are a
 * TypeScript projection of Spec 0004 and its JSON Schema, not their semantic
 * authority. Fake runtimes and profile executors remain intentionally deferred.
 */
export const PACKAGE_STAGE = "M3-SHARED-TCK-FOUNDATION" as const;

export {
  TCK_FIXTURE_API_VERSION,
  TCK_PROFILES,
  TCK_RUNNER_STATUSES,
} from "./tck-contract.js";
export type {
  TckDeterminism,
  TckFixtureV1Alpha1,
  TckJsonValue,
  TckProfile,
  TckRunnerStatus,
} from "./tck-contract.js";
