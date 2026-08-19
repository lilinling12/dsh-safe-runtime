/**
 * @dsh-safe/testkit public boundary.
 *
 * Shared TCK semantics remain specification-first. The exports below are
 * TypeScript projections of the language-independent contracts; test fakes are
 * deterministic infrastructure and never protocol or Harness authority.
 */
export const PACKAGE_STAGE = "M3-FAULT-INJECTION" as const;

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

export {
  FAKE_TOOL_ERROR_CODES,
  FakeToolRuntime,
  FakeToolRuntimeError,
  TCK_FAKE_TOOL_OUTCOME_KINDS,
} from "./fake-tool-runtime.js";
export type {
  FakeToolErrorCode,
  FakeToolOutcome,
  FakeToolOutcomeKind,
  FakeToolRequest,
  FakeToolTraceEntry,
} from "./fake-tool-runtime.js";

export {
  FAKE_EXECUTION_WORLD_ERROR_CODES,
  FakeExecutionWorld,
  FakeExecutionWorldError,
  FakeFilesystem,
  FakeSubprocess,
} from "./fake-execution-world.js";
export type {
  FakeExecutableResolutionRequest,
  FakeExecutionWorldErrorCode,
  FakeFilesystemInfo,
  FakeFilesystemResolutionRequest,
  FakeFilesystemTargetRef,
  FakeSubprocessExecutionSnapshot,
  FakeSubprocessObservation,
  FakeSubprocessOutcome,
  FakeSubprocessOutputSnapshot,
  FakeSubprocessSpawnRequest,
} from "./fake-execution-world.js";

export {
  FAKE_FAULT_ERROR_CODES,
  FakeFaultInjectionError,
  FakeFaultInjectionService,
} from "./fake-fault-injection.js";
export type {
  FakeFaultDescriptor,
  FakeFaultDirective,
  FakeFaultErrorCode,
  FakeFaultObservation,
  FakeFaultProbe,
} from "./fake-fault-injection.js";
