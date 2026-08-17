import type { AdapterFeatureMatrix } from "./feature-matrix.js";
import type { RuntimeEventSink } from "./runtime-events.js";

export interface Disposable {
  dispose(): void | Promise<void>;
}

export interface ObservationSubscription extends Disposable {
  /** Wait until every event accepted before this call has settled. */
  drain(): Promise<void>;
}

export type ToolPolicyDecision =
  | { readonly kind: "ALLOW" }
  | { readonly kind: "DENY"; readonly reason: string }
  | { readonly kind: "ASK"; readonly reason?: string };

export type ToolGuardDecision =
  | { readonly kind: "ALLOW" }
  | { readonly kind: "DENY"; readonly reason: string };

export type ToolExecutionScope =
  | {
      readonly kind: "agent";
      readonly sessionRef: string;
      readonly agentRef: string;
    }
  | { readonly kind: "host" };

export interface ToolPolicyRequest {
  readonly callRef: string;
  readonly rootCallRef: string;
  readonly toolName: string;
  readonly arguments: unknown;
  readonly scope: ToolExecutionScope;
}

export type ToolPolicyHandler = (
  request: Readonly<ToolPolicyRequest>,
) => ToolPolicyDecision | Promise<ToolPolicyDecision>;

/** Harness monotonic guards are synchronous and cannot ask or force allow. */
export type ToolGuardHandler = (
  request: Readonly<ToolPolicyRequest>,
) => ToolGuardDecision;

export interface ApprovalRequest {
  readonly sessionRef: string;
  readonly callRef?: string;
  readonly toolName: string;
  readonly reason?: string;
  readonly signal?: AbortSignal;
}

export type ApprovalDecision =
  | "ALLOWED_ONCE"
  | "REJECTED"
  | "CANCELLED"
  | "UNAVAILABLE";

export interface CompletionBoundaryRequest {
  readonly sessionRef: string;
  readonly turnRef: string;
  readonly signal: AbortSignal;
}

export type TurnStoppingHandler = (
  request: Readonly<CompletionBoundaryRequest>,
) => void | Promise<void>;

export interface CompletionSteerRequest {
  readonly sessionRef: string;
  readonly turnRef: string;
  readonly reason: string;
  /** One-based ordinal of the retry the caller is requesting. */
  readonly retryOrdinal: number;
  /** Caller-defined retry budget from the governing acceptance contract. */
  readonly maxRetries: number;
}

/**
 * Runtime-independent reference to one provider-owned filesystem target.
 * `providerIdentity` is opaque: callers may compare it for equality but MUST
 * NOT parse it or manufacture provider semantics from its string form.
 */
export interface FilesystemTargetRef {
  readonly providerIdentity: string;
  readonly displayPath: string;
}

export interface FilesystemInfo {
  readonly version: string;
  readonly type: "file" | "directory" | "other";
  readonly size?: number;
}

export interface FilesystemPort {
  readonly mediation: "provider-service";
  /** M2 does not claim process/kernel isolation from the filesystem service seam. */
  readonly isolation: "not-asserted";

  resolve(
    path: string,
    options?: { readonly cwd?: string; readonly signal?: AbortSignal },
  ): Promise<FilesystemTargetRef>;

  stat(target: Readonly<FilesystemTargetRef>, signal?: AbortSignal): Promise<FilesystemInfo | undefined>;

  contains(
    parent: Readonly<FilesystemTargetRef>,
    child: Readonly<FilesystemTargetRef>,
  ): boolean;

  readText(target: Readonly<FilesystemTargetRef>, signal?: AbortSignal): Promise<string>;

  /**
   * Explicit security-sensitive bridge into the shared process execution world.
   * This does not make providerIdentity a path and does not assert containment.
   */
  processPath(target: Readonly<FilesystemTargetRef>): string;
}

export interface SubprocessSpawnRequest {
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly graceMs: number;
  readonly signal?: AbortSignal;
  readonly stdin?: string;
  readonly stdoutMaxBytes: number;
  readonly stderrMaxBytes: number;
}

export interface SubprocessOutcome {
  readonly exitCode: number | null;
  readonly signal: string | null;
}

export interface SubprocessOutputSnapshot {
  readonly text: string;
  readonly nextOffset: number;
  readonly lossy: boolean;
  readonly spillPath?: string;
}

export interface SubprocessExecution {
  readonly pid: number;
  readonly done: Promise<SubprocessOutcome>;
  readStdout(fromByte: number): SubprocessOutputSnapshot;
  readStderr(fromByte: number): SubprocessOutputSnapshot;
  terminate(): void;
  waitForExit(signal?: AbortSignal): Promise<boolean>;
}

export interface SubprocessPort {
  readonly mediation: "provider-service";
  /** M2 does not promote managed process-tree ownership into process isolation. */
  readonly isolation: "not-asserted";
  readonly executionWorld: "shared-with-filesystem";

  resolveExecutable(
    command: string,
    env?: Readonly<Record<string, string>>,
    signal?: AbortSignal,
  ): Promise<string>;

  /**
   * Start a process with bounded collected stdout/stderr only. Raw Node streams,
   * shell interpretation, PTY policy, and command defaulting stay outside M2.
   */
  spawn(request: Readonly<SubprocessSpawnRequest>): SubprocessExecution;
}

export interface HarnessRuntimeAdapter {
  readonly adapterName: "deepseek-harness";
  readonly adapterVersion: string;
  readonly harnessVersion: string;
  readonly harnessCommit?: string;
  readonly features: AdapterFeatureMatrix;

  observe(sink: RuntimeEventSink): ObservationSubscription;

  registerToolPolicy(handler: ToolPolicyHandler): Disposable;

  registerMonotonicToolGuard?(handler: ToolGuardHandler): Disposable;

  /** Register work that must complete inside Harness's awaited turn-stopping boundary. */
  registerTurnStopping(handler: TurnStoppingHandler): Disposable;

  requestApproval(request: ApprovalRequest): Promise<ApprovalDecision>;

  steerCompletion(request: CompletionSteerRequest): Promise<void>;

  readonly filesystem?: FilesystemPort;
  readonly subprocess?: SubprocessPort;
}
