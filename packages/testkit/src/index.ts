/**
 * @dsh-safe/testkit public boundary.
 *
 * Shared TCK semantics remain specification-first. The exports below are
 * TypeScript projections of the language-independent contracts; test fakes are
 * deterministic infrastructure and never protocol or Harness authority.
 */
export const PACKAGE_STAGE = "M3-ADAPTER-DSH-CANCELLATION" as const;

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

export {
  ADAPTER_DSH_TURN_LIFECYCLE_ERROR_CODES,
  ADAPTER_DSH_TURN_LIFECYCLE_OPERATION,
  AdapterDshTurnLifecycleFixtureError,
  parseAdapterDshTurnLifecycleFixture,
  runAdapterDshTurnLifecycleFixture,
} from "./adapter-dsh-turn-lifecycle.js";
export type {
  AdapterDshTurnLifecycleCaseResult,
  AdapterDshTurnLifecycleErrorCode,
  AdapterDshTurnLifecycleExpectation,
  AdapterDshTurnLifecycleFixture,
  AdapterDshTurnLifecycleObservable,
  AdapterDshTurnLifecycleProjection,
  AdapterDshTurnLifecycleSourceEvent,
  AdapterDshTurnLifecycleStimulus,
} from "./adapter-dsh-turn-lifecycle.js";

export {
  ADAPTER_DSH_TOOL_ORDERING_ERROR_CODES,
  ADAPTER_DSH_TOOL_ORDERING_OPERATION,
  AdapterDshToolOrderingFixtureError,
  parseAdapterDshToolOrderingFixture,
  runAdapterDshToolOrderingFixture,
} from "./adapter-dsh-tool-ordering.js";
export type {
  AdapterDshToolOrderingCaseResult,
  AdapterDshToolOrderingErrorCode,
  AdapterDshToolOrderingExpectation,
  AdapterDshToolOrderingFixture,
  AdapterDshToolOrderingObservable,
  AdapterDshToolOrderingProjection,
  AdapterDshToolOrderingRequestObservation,
  AdapterDshToolOrderingResultObservation,
  AdapterDshToolOrderingSourceObservation,
  AdapterDshToolOrderingStimulus,
} from "./adapter-dsh-tool-ordering.js";

export {
  ADAPTER_DSH_DENIED_BODY_ENTRY_ERROR_CODES,
  ADAPTER_DSH_DENIED_BODY_ENTRY_OPERATION,
  AdapterDshDeniedBodyEntryFixtureError,
  parseAdapterDshDeniedBodyEntryFixture,
  runAdapterDshDeniedBodyEntryFixture,
} from "./adapter-dsh-denied-body-entry.js";
export type {
  AdapterDshDeniedBodyEntryCaseResult,
  AdapterDshDeniedBodyEntryErrorCode,
  AdapterDshDeniedBodyEntryFixture,
  AdapterDshDeniedBodyEntryObservable,
  AdapterDshDeniedBodyEntryStimulus,
} from "./adapter-dsh-denied-body-entry.js";

export {
  ADAPTER_DSH_FINAL_RESULT_MAPPING_ERROR_CODES,
  ADAPTER_DSH_FINAL_RESULT_MAPPING_OPERATION,
  AdapterDshFinalResultMappingFixtureError,
  parseAdapterDshFinalResultMappingFixture,
  runAdapterDshFinalResultMappingFixture,
} from "./adapter-dsh-final-result-mapping.js";
export type {
  AdapterDshFinalResultMappingCaseResult,
  AdapterDshFinalResultMappingErrorCode,
  AdapterDshFinalResultMappingFixture,
  AdapterDshFinalResultMappingObservable,
  AdapterDshFinalResultMappingStimulus,
  AdapterDshFinalResultOutcome,
} from "./adapter-dsh-final-result-mapping.js";

export {
  ADAPTER_DSH_APPROVAL_UNAVAILABLE_ERROR_CODES,
  ADAPTER_DSH_APPROVAL_UNAVAILABLE_OPERATION,
  AdapterDshApprovalUnavailableFixtureError,
  parseAdapterDshApprovalUnavailableFixture,
  runAdapterDshApprovalUnavailableFixture,
} from "./adapter-dsh-approval-unavailable.js";
export type {
  AdapterDshApprovalUnavailableCaseResult,
  AdapterDshApprovalUnavailableErrorCode,
  AdapterDshApprovalUnavailableFixture,
  AdapterDshApprovalUnavailableObservable,
  AdapterDshApprovalUnavailableRequest,
  AdapterDshApprovalUnavailableSourceFact,
  AdapterDshApprovalUnavailableStimulus,
} from "./adapter-dsh-approval-unavailable.js";

export {
  ADAPTER_DSH_CANCELLATION_ERROR_CODES,
  ADAPTER_DSH_CANCELLATION_OPERATION,
  AdapterDshCancellationFixtureError,
  parseAdapterDshCancellationFixture,
  runAdapterDshCancellationFixture,
} from "./adapter-dsh-cancellation.js";
export type {
  AdapterDshCancellationCaseResult,
  AdapterDshCancellationErrorCode,
  AdapterDshCancellationFixture,
  AdapterDshCancellationObservable,
  AdapterDshCancellationRequest,
  AdapterDshCancellationSourceFact,
  AdapterDshCancellationStimulus,
  AdapterDshCancellationToolCode,
} from "./adapter-dsh-cancellation.js";
