/**
 * @dsh-safe/testkit public boundary.
 *
 * Shared TCK semantics remain specification-first. The exports below are
 * TypeScript projections of the language-independent contracts; test fakes are
 * deterministic infrastructure and never protocol or Harness authority.
 */
export const PACKAGE_STAGE = "M3-FAKE-APPROVAL" as const;

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

export {
  FAKE_APPROVAL_ERROR_CODES,
  FakeApprovalError,
  FakeApprovalService,
  TCK_APPROVAL_DECISIONS,
} from "./fake-approval.js";
export type {
  FakeApprovalErrorCode,
  FakeApprovalObservation,
  FakeApprovalRequest,
  TckApprovalDecision,
} from "./fake-approval.js";
