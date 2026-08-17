import { dshAdapterError } from "./errors.js";
import type {
  FilesystemInfo,
  FilesystemPort,
  FilesystemTargetRef,
  HarnessRuntimeAdapter,
  SubprocessExecution,
  SubprocessOutcome,
  SubprocessOutputSnapshot,
  SubprocessPort,
  SubprocessSpawnRequest,
} from "./ports.js";

/** Structural subset of the pinned Harness filesystem target contract. */
export interface FilesystemProviderTarget {
  readonly targetKey: string;
  readonly displayPath: string;
}

/** Structural subset of the pinned Harness filesystem info contract. */
export interface FilesystemProviderInfo {
  readonly version: string;
  readonly type: "file" | "directory" | "other";
  readonly size?: number;
}

/**
 * Provider shape required by the M2 operational filesystem port. Concrete
 * Harness types are intentionally absent so normal adapter builds remain
 * independent of a particular Harness package graph.
 */
export interface FilesystemProvider<Target extends FilesystemProviderTarget> {
  resolve(
    path: string,
    options?: { readonly cwd?: string; readonly signal?: AbortSignal },
  ): Promise<Target>;
  stat(target: Target, signal?: AbortSignal): Promise<FilesystemProviderInfo | undefined>;
  contains(parent: Target, child: Target): boolean;
  readText(target: Target, signal?: AbortSignal): Promise<string>;
  processPath(target: Target): string;
}

export interface SubprocessProviderOutputRead {
  readonly text: string;
  readonly nextOffset: number;
  readonly lossy: boolean;
  readonly spillPath?: string;
}

export interface SubprocessProviderOutputReader {
  readFrom(fromByte: number): SubprocessProviderOutputRead;
}

export interface SubprocessProviderOutcome {
  readonly exitCode: number | null;
  readonly signal: string | null;
}

export interface SubprocessProviderHandle {
  readonly pid: number;
  readonly collected: {
    readonly stdout?: SubprocessProviderOutputReader;
    readonly stderr?: SubprocessProviderOutputReader;
  };
  readonly done: Promise<SubprocessProviderOutcome>;
  terminate(): void;
  waitForExit(signal?: AbortSignal): Promise<boolean>;
}

export interface SubprocessProviderSpawnSpec {
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly stdio: {
    readonly stdin: "ignore" | { readonly data: string };
    readonly stdout: { readonly maxBytes: number };
    readonly stderr: { readonly maxBytes: number };
  };
  readonly graceMs: number;
  readonly signal?: AbortSignal;
  readonly env?: Readonly<Record<string, string | undefined>>;
}

/** Structural subset of the pinned Harness subprocess service contract. */
export interface SubprocessProvider<Handle extends SubprocessProviderHandle> {
  resolveExecutable(
    command: string,
    env?: Readonly<Record<string, string>>,
    signal?: AbortSignal,
  ): Promise<string>;
  spawn(spec: SubprocessProviderSpawnSpec): Handle;
}

export interface OperationalProviderPorts {
  readonly filesystem: FilesystemPort;
  readonly subprocess: SubprocessPort;
}

function targetRef(target: FilesystemProviderTarget): FilesystemTargetRef {
  return Object.freeze({
    providerIdentity: String(target.targetKey),
    displayPath: target.displayPath,
  });
}

function infoOf(info: FilesystemProviderInfo): FilesystemInfo {
  return Object.freeze({
    version: String(info.version),
    type: info.type,
    ...(info.size === undefined ? {} : { size: info.size }),
  });
}

/**
 * Bind a provider filesystem without exposing its concrete target/version
 * types. The map is capability-local: callers cannot manufacture a target by
 * guessing an opaque provider identity.
 */
export function createFilesystemPort<Target extends FilesystemProviderTarget>(
  provider: FilesystemProvider<Target>,
): FilesystemPort {
  const targets = new Map<string, Target>();

  const remember = (target: Target): FilesystemTargetRef => {
    const identity = String(target.targetKey);
    targets.set(identity, target);
    return targetRef(target);
  };

  const requireTarget = (target: Readonly<FilesystemTargetRef>): Target => {
    const known = targets.get(target.providerIdentity);
    if (known === undefined) {
      throw dshAdapterError(
        "UNKNOWN_FILESYSTEM_TARGET",
        `filesystem target ${target.providerIdentity} was not resolved by this adapter port`,
      );
    }
    return known;
  };

  return Object.freeze({
    mediation: "provider-service" as const,
    isolation: "not-asserted" as const,
    async resolve(
      path: string,
      options?: { readonly cwd?: string; readonly signal?: AbortSignal },
    ): Promise<FilesystemTargetRef> {
      return remember(await provider.resolve(path, options));
    },
    async stat(
      target: Readonly<FilesystemTargetRef>,
      signal?: AbortSignal,
    ): Promise<FilesystemInfo | undefined> {
      const info = await provider.stat(requireTarget(target), signal);
      return info === undefined ? undefined : infoOf(info);
    },
    contains(
      parent: Readonly<FilesystemTargetRef>,
      child: Readonly<FilesystemTargetRef>,
    ): boolean {
      return provider.contains(requireTarget(parent), requireTarget(child));
    },
    readText(
      target: Readonly<FilesystemTargetRef>,
      signal?: AbortSignal,
    ): Promise<string> {
      return provider.readText(requireTarget(target), signal);
    },
    processPath(target: Readonly<FilesystemTargetRef>): string {
      return provider.processPath(requireTarget(target));
    },
  });
}

function snapshotOf(read: SubprocessProviderOutputRead): SubprocessOutputSnapshot {
  return Object.freeze({
    text: read.text,
    nextOffset: read.nextOffset,
    lossy: read.lossy,
    ...(read.spillPath === undefined ? {} : { spillPath: read.spillPath }),
  });
}

function outcomeOf(outcome: SubprocessProviderOutcome): SubprocessOutcome {
  return Object.freeze({
    exitCode: outcome.exitCode,
    signal: outcome.signal,
  });
}

/**
 * Bind the provider's managed process-tree primitive to a deliberately narrow
 * collected-output port. Shell defaults, raw streams and PTY behavior stay out
 * of the M2 adapter contract.
 */
export function createSubprocessPort<Handle extends SubprocessProviderHandle>(
  provider: SubprocessProvider<Handle>,
): SubprocessPort {
  return Object.freeze({
    mediation: "provider-service" as const,
    isolation: "not-asserted" as const,
    executionWorld: "shared-with-filesystem" as const,
    resolveExecutable(
      command: string,
      env?: Readonly<Record<string, string>>,
      signal?: AbortSignal,
    ): Promise<string> {
      return provider.resolveExecutable(command, env, signal);
    },
    spawn(request: Readonly<SubprocessSpawnRequest>): SubprocessExecution {
      const handle = provider.spawn({
        argv: request.argv,
        cwd: request.cwd,
        stdio: {
          stdin: request.stdin === undefined ? "ignore" : { data: request.stdin },
          stdout: { maxBytes: request.stdoutMaxBytes },
          stderr: { maxBytes: request.stderrMaxBytes },
        },
        graceMs: request.graceMs,
        ...(request.signal === undefined ? {} : { signal: request.signal }),
        ...(request.env === undefined ? {} : { env: request.env }),
      });

      const stdout = handle.collected.stdout;
      const stderr = handle.collected.stderr;
      if (stdout === undefined || stderr === undefined) {
        throw dshAdapterError(
          "INCONSISTENT_PROVIDER_RESULT",
          "subprocess provider did not expose collected stdout/stderr requested by the adapter",
        );
      }

      return Object.freeze({
        pid: handle.pid,
        done: handle.done.then(outcomeOf),
        readStdout(fromByte: number): SubprocessOutputSnapshot {
          return snapshotOf(stdout.readFrom(fromByte));
        },
        readStderr(fromByte: number): SubprocessOutputSnapshot {
          return snapshotOf(stderr.readFrom(fromByte));
        },
        terminate(): void {
          handle.terminate();
        },
        waitForExit(signal?: AbortSignal): Promise<boolean> {
          return handle.waitForExit(signal);
        },
      });
    },
  });
}

/**
 * Compose already-bound provider ports onto the Harness runtime adapter. This
 * keeps the rc5 package imports in exact-source/bootstrap code while making the
 * operational ports explicit on the adapter object used by safe-runtime.
 */
export function withOperationalProviderPorts(
  adapter: HarnessRuntimeAdapter,
  ports: Readonly<OperationalProviderPorts>,
): HarnessRuntimeAdapter {
  return Object.freeze({
    ...adapter,
    filesystem: ports.filesystem,
    subprocess: ports.subprocess,
  });
}
