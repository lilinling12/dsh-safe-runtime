# DeepSeek Harness 0.1.0-rc.5 — Filesystem / Subprocess Provider Probe

Status: SOURCE-BACKED M2 PROBE  
Harness source commit: `47f943859bef60e4160492346772ded9b24f765a`  
Scope: filesystem, subprocess, and same-world sandbox provider seams

## 1. Purpose and authority

This document records provider facts needed by safe-runtime before designing a
workspace transaction implementation. It is compatibility evidence for one
exact upstream source baseline; it is **not** a normative safe-runtime protocol
specification and it does not permit Harness implementation details to redefine
protocol semantics.

Evidence is restricted to the pinned upstream product APIs, provider source,
package documentation, and exact-source compile conformance. The probe does not
infer stronger guarantees from package names such as `sandbox` or from an
implementation merely having a `cwd` option.

Primary pinned source surfaces:

- `packages/fs/fs/src/index.ts`
- `packages/fs/fs/src/types.ts`
- `packages/fs/fs-local/src/index.ts`
- `packages/fs/fs-local/src/fsio.ts`
- `packages/fs/fs-sandbox/src/index.ts`
- `packages/subprocess/subprocess/src/index.ts`
- `packages/subprocess/subprocess/src/types.ts`
- `packages/subprocess/subprocess-local/src/index.ts`
- `packages/subprocess/subprocess-local/README.md`
- `packages/sandbox/sandbox/src/index.ts`
- `packages/sandbox/sandbox-local/src/index.ts`
- `packages/sandbox/sandbox/README.md`

`packages/adapter-dsh/source-conformance/provider-seams.contract.ts` pins the
public rc5 method/vocabulary shapes during the existing exact-source TypeScript
gate. It intentionally does not require platform-specific sandbox availability.

## 2. Filesystem service contract

The public package is `@deepseek-ai/dsh-fs`, registered as `ctx.fs` through the
abstract `FileSystem` service. The seam is provider-owned: a local, sandboxed,
or remote provider may represent target identity and process paths differently.

### 2.1 Stable target identity is opaque

`resolve(path)` returns an `FsTarget` containing:

- `targetKey: FsTargetKey` — provider-owned opaque identity;
- `displayPath: string` — presentation path, which may be local,
  workspace-relative, or remote.

Consumers MUST NOT parse `targetKey` or assume it is a host absolute path. The
local backend happens to use a realpath-derived key; that implementation choice
is not a portable protocol contract.

For an existing local path, `fs-local` resolves `targetKey` from `realpath()`.
Consequently aliases through symbolic links converge on the same local target
identity and therefore share mutation serialization and stale-version guards.
For a missing target, the provider realpaths the nearest existing ancestor and
re-appends the missing suffix so identity remains stable across creation under
symlinked ancestors.

### 2.2 `processPath()` is an explicit capability bridge

`FileSystem.processPath(target)` returns the canonical absolute path that a
subprocess in the provider's execution world can open. This is deliberately
separate from `targetKey`.

This distinction matters to safe-runtime: converting an opaque filesystem
identity to an OS/process path crosses from the filesystem capability seam into
a capability that can perform direct operating-system access. A future
transaction runtime MUST treat this bridge as security-sensitive and cannot
assume that intercepting `ctx.fs` methods also intercepts consumers of the
returned process path.

`fileUrl(target)` is likewise provider-owned because the execution platform may
differ from the host platform.

### 2.3 Containment belongs to the provider

`contains(parent, child)` is the public canonical containment operation. A
consumer must not reconstruct containment by parsing `targetKey` or
`displayPath`.

The local backend implements containment using relative canonical process paths.
Its configured `cwd` is only the base used to resolve relative paths. Upstream
source explicitly states that `cwd` is **not** a containment boundary.

Therefore:

```text
fs-local(cwd=/workspace) != confined filesystem rooted at /workspace
```

A relative-path default cannot be used as evidence for resource isolation.

### 2.4 Symlink behavior is intentionally split

`resolve()` follows symbolic links to obtain stable target identity. `lstat()`
is path-shaped and does not follow the final symbolic-link component. This
allows a trust-boundary consumer to reject a repository-owned link before normal
resolution follows it.

The local provider writes through a symlink to its resolved target rather than
replacing the link itself. `fs-sandbox` re-canonicalizes immediately before a
mutation to narrow ancestor-symlink swap races, but its own threat model accepts
the remaining canonicalize-to-syscall TOCTOU window.

### 2.5 `FsVersion` is a CAS/freshness token, not a timestamp contract

`FsVersion` is opaque. The local provider currently derives it from high
resolution stat identity/freshness fields, but consumers MUST NOT interpret
those fields or reproduce a version token themselves.

Provider mutation semantics are:

- `writeText(..., { kind: "createIfAbsent" })` rejects an already existing
  target with `FS_NOT_OBSERVED`;
- `writeText(..., { kind: "replaceIfVersion", version })` rejects absence or a
  changed version with `FS_STALE_VERSION`;
- `editText(..., { version })` checks freshness before literal matching and
  reports `FS_STALE_VERSION` on mismatch;
- omission of the guard remains an unconditional provider operation;
- local mutations are serialized per `targetKey` and published atomically at
  the single-file provider boundary.

These primitives are suitable inputs to conflict detection, but they do not by
themselves create a multi-file safe-runtime transaction.

## 3. Filesystem sandbox provider

`@deepseek-ai/dsh-fs-sandbox` extends the local filesystem provider and adds a
per-call mode fence to **mutations only**:

| Mode | Provider behavior |
| --- | --- |
| `read-only` | deny `writeText` / `editText` |
| `workspace-write` | allow mutation only under canonical writable roots |
| `danger-full-access` | delegate unfenced |

Reads intentionally pass through in every mode.

The upstream threat model explicitly calls this a **policy fence, not a kernel
boundary**. It narrows symlink races by re-canonicalizing immediately before
mutation, but it does not eliminate all host-process TOCTOU. Therefore its
safe-runtime classification is limited to **provider-enforced mutation
confinement for calls that actually traverse this provider**.

It MUST NOT be represented as:

- read confinement;
- generic process isolation;
- network isolation;
- proof that a subprocess cannot write elsewhere.

## 4. Subprocess service contract

The public package is `@deepseek-ai/dsh-subprocess`, registered as
`ctx.subprocess`. The service owns executable lookup and managed child-process
lifetime in one execution world; consumer packages own command meaning,
defaults, deadlines, and protocol framing.

`SubprocessSpawnSpec` is fully specified and carries ordinary process-facing
values:

```text
argv: readonly string[]
cwd: string
stdio: explicit dispositions
graceMs: number
signal?: AbortSignal
env?: ProcessEnv
```

There is no `FsTarget` in this boundary. The `cwd` and executable path are
execution-world strings.

### 4.1 Local subprocess can bypass `ctx.fs`

`LocalSubprocessRuntime` uses Node/OS filesystem and process APIs directly. It
resolves executables with `stat` / `access`, spawns using the supplied `cwd`, and
creates PTYs with `node-pty`. It does not route a spawned program's filesystem
access through `ctx.fs`.

This establishes a critical negative fact:

```text
intercepting or replacing ctx.fs != intercepting filesystem effects of a local subprocess
```

A child process may open any host path allowed by its OS credentials and any
separate process sandbox. The fact that FS and subprocess providers share an
execution world is an interoperability contract, not a confinement guarantee.

### 4.2 Process lifetime management is not resource isolation

The local provider owns detached process trees, termination escalation, and
service-disposal cleanup. This is important lifecycle control, but it must not
be confused with capability confinement.

Upstream limitations explicitly note that daemonized/re-parented descendants
can escape some observable local process-tree boundaries. This further prevents
safe-runtime from treating managed-process ownership as a complete isolation
primitive.

### 4.3 Environment scrubbing has a narrow scope

The subprocess seam starts from the parent environment after removing:

- names matching `KEY|PASSWORD|SECRET|TOKEN` (case-insensitive);
- ambient `DSH_*` variables.

Then explicit `spec.env` values are merged afterward and may deliberately
reintroduce such values. The upstream local provider describes the credential
scrub as a **name heuristic**.

Accordingly this is defense-in-depth against accidental ambient leakage, not a
complete credential capability boundary.

## 5. Same-world process sandbox

`@deepseek-ai/dsh-sandbox` defines a process wrapper for same-world confinement.
Its mode vocabulary is exactly:

```text
read-only | workspace-write | danger-full-access
```

and the policy vocabulary is explicitly **file effects only**. Network access,
process visibility, syscall filtering as a general capability vocabulary,
devices, and credential access are outside the contract.

For confined modes, `SandboxProvider.confine()` returns wrapped argv plus a
provider-reported enforcement value:

```text
full | partial
```

If no usable backend can enforce a requested confined mode, the provider must
fail closed with `SANDBOX_UNAVAILABLE` rather than silently run the original
argv unconfined.

### 5.1 `full` is a provider report, not independent deployment attestation

The rc5 local provider selects a platform runner and reports the selected
backend's file-effect enforcement completeness. Some built-in paths obtain this
from functional probing or backend ABI facts, while other paths use static
provider knowledge.

Most importantly, an operator-supplied `runnerCommand` is explicitly treated by
upstream as an **operator assertion**: rc5 skips the built-in runner selection
and functional probe and returns `enforcement: "full"` for that configured
runner. Therefore safe-runtime MUST NOT reinterpret the string `full` by itself
as independent evidence that the current deployment has passed an isolation
acceptance test.

The correct separation is:

```text
provider report: full/partial for the sandbox seam's declared file-effect scope
+
environment acceptance evidence: proves the concrete deployment actually meets
its requested safe-runtime guarantee
```

A `partial` report is always a hard ceiling: it MUST NOT be promoted to `full`.
A `full` report is necessary provider metadata for consumers that rely on full
file-effect enforcement, but stronger safe-runtime guarantee levels still need
their own environment-specific evidence.

This same-world sandbox is stronger than a tool-level policy check for the file
effects the active backend actually governs, but it still does not justify
safe-runtime's general `process-isolated` guarantee level. The seam intentionally
shares the host kernel/filesystem; containers, microVMs, and remote environments
replace whole capability implementations instead of being represented as this
provider.

## 6. Guarantee classification

The following classification is intentionally conservative.

| rc5 configuration / mechanism | What source proves | Maximum safe-runtime claim from this source evidence |
| --- | --- | --- |
| `fs-local` | provider-mediated text/file operations, atomic single-file mutation, opaque identity/version | provider semantics only; **no confinement** |
| `fs-local` configured with `cwd` | relative-path resolution base | **no containment guarantee** |
| `fs-sandbox` | trusted-code canonical mutation fence; reads pass; residual TOCTOU accepted | **provider-enforced mutation confinement** only |
| `subprocess-local` | managed process trees and explicit cwd/env/stdio | lifecycle management; **no FS/network confinement** |
| sandbox provider reporting `full` | the provider claims completeness for its declared **file-effect** policy; configured custom runners may reach this report from operator assertion without built-in functional probing | provider-reported file-effect completeness only; deployment guarantee still requires acceptance evidence; **not universal process isolation** |
| sandbox provider reporting `partial` | provider declares that some promised file effects are not governed | explicitly partial ceiling; callers requiring full enforcement fail closed |
| remote/container/microVM execution-world replacement | architecture permits replacing whole capability implementations | stronger guarantees are possible in principle, but **not proven by this local rc5 probe** |

No row above proves a universal network boundary.

## 7. Safe-runtime design consequences

### 7.1 A transaction cannot rely on filesystem interception alone

If transaction-scoped work can launch a local subprocess, replacing/intercepting
`ctx.fs` is insufficient: the subprocess can access OS paths directly.

A future workspace transaction runtime must therefore choose an execution model
that keeps subprocess effects coherent with the transactional filesystem view,
for example through a provider-paired execution world or a stronger isolated
runtime. This probe does **not** choose or implement that architecture; it only
rules out the unsafe assumption that `ctx.fs` interception is universal.

### 7.2 Keep opaque target/version semantics above the adapter

Safe-runtime protocol objects must not persist or parse rc5 local realpaths or
stat-derived version internals as protocol semantics. The adapter/runtime may
hold provider tokens while interacting with the provider, but normative
resource identity and conflict semantics remain safe-runtime-owned.

### 7.3 Feature detection must separate mediation from isolation

Future guarantee negotiation must distinguish at least:

- provider seam exists;
- operation is routed through that provider;
- provider supplies a policy fence;
- OS/process confinement is active;
- provider-reported completeness is `full` versus `partial` for its declared
  scope;
- environment-specific acceptance evidence exists for the guarantee being
  claimed;
- network isolation is independently available or unavailable.

A package being named `sandbox`, or a provider merely returning `full`, is not
sufficient evidence for a stronger cross-capability guarantee.

### 7.4 Unknown or weaker environments fail closed

When a safe-runtime operation requires a guarantee stronger than the selected
provider combination can prove, the runtime must reject/downgrade the requested
operation explicitly. It must not silently relabel provider mediation or a
provider-reported completeness field as general process isolation.

## 8. Probe acceptance boundary

This provider probe is complete only when:

1. the source-backed facts above remain pinned to the exact rc5 commit;
2. exact-source TypeScript accepts `provider-seams.contract.ts` against the
   built upstream public packages;
3. the adapter feature/provider fact records agree with this document;
4. normal repository CI remains green;
5. the exact-source conformance workflow remains green.

Platform-specific availability of bubblewrap, Landlock, Seatbelt, Windows ACL
runners, configured custom runners, or remote providers is deliberately outside
this portable M2 probe. Those mechanisms require separate environment-specific
acceptance evidence before safe-runtime may claim their concrete guarantee
level.
