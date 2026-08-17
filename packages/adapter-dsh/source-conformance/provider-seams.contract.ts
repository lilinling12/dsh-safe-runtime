import type {
  FileSystem,
  FsEditOutcome,
  FsInfo,
  FsPathInfo,
  FsTarget,
  FsVersion,
  FsWriteOutcome,
} from "@deepseek-ai/dsh-fs";
import type {
  ConfinedArgv,
  SandboxEnforcement,
  SandboxExecutionPolicy,
  SandboxMode,
  SandboxPolicy,
  SandboxProvider,
} from "@deepseek-ai/dsh-sandbox";
import type {
  SubprocessHandle,
  SubprocessRuntime,
  SubprocessSpawnSpec,
} from "@deepseek-ai/dsh-subprocess";

/** Compile-time equality used to pin closed public vocabularies in rc5. */
type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends
    (<T>() => T extends Right ? 1 : 2)
    ? (<T>() => T extends Right ? 1 : 2) extends
        (<T>() => T extends Left ? 1 : 2)
      ? true
      : false
    : false;

type Assert<Condition extends true> = Condition;

export type Rc5SandboxModeContract = Assert<
  Equal<SandboxMode, "read-only" | "workspace-write" | "danger-full-access">
>;

export type Rc5SandboxEnforcementContract = Assert<
  Equal<SandboxEnforcement, "full" | "partial">
>;

/**
 * This function is never executed. Exact-source CI typechecks it against the
 * pinned upstream build so changes to the public provider seams fail loudly.
 */
export async function assertRc5FilesystemContract(
  fs: FileSystem,
  target: FsTarget,
  parent: FsTarget,
  version: FsVersion,
  policy: SandboxExecutionPolicy,
): Promise<void> {
  const processPath: string = fs.processPath(target);
  const fileUrl: string = fs.fileUrl(target);
  const contained: boolean = fs.contains(parent, target);
  const info: FsInfo | undefined = await fs.stat(target);
  const pathInfo: FsPathInfo | undefined = await fs.lstat(processPath);
  const write: FsWriteOutcome = await fs.writeText(
    target,
    "replacement",
    { kind: "replaceIfVersion", version },
    undefined,
    policy,
  );
  const edit: FsEditOutcome = await fs.editText(
    target,
    { oldString: "before", newString: "after", replaceAll: false },
    { version },
    undefined,
    policy,
  );

  void fileUrl;
  void contained;
  void info;
  void pathInfo;
  void write;
  void edit;
}

/**
 * Pin the fully-specified subprocess request shape used at the provider seam.
 * The cwd and environment cross into the execution world as explicit strings;
 * no filesystem target is part of this API.
 */
export function assertRc5SubprocessContract(
  subprocess: SubprocessRuntime,
  signal: AbortSignal,
): SubprocessHandle {
  const spec: SubprocessSpawnSpec = {
    argv: ["node", "script.mjs"],
    cwd: "/workspace",
    stdio: {
      stdin: "ignore",
      stdout: { maxBytes: 4096 },
      stderr: { maxBytes: 4096 },
    },
    graceMs: 1_000,
    signal,
    env: {
      EXPLICIT_VALUE: "present",
    },
  };

  return subprocess.spawn(spec);
}

/** Pin the same-world file-effect sandbox vocabulary and confine result. */
export function assertRc5SandboxContract(
  sandbox: SandboxProvider,
  argv: readonly string[],
  policy: SandboxPolicy,
): ConfinedArgv {
  const confined = sandbox.confine(argv, policy);
  const enforcement: SandboxEnforcement = confined.enforcement;
  void enforcement;
  return confined;
}
