# Spec 0007: M3 Fake Filesystem/Subprocess Execution World

Status: DRAFT  
Milestone: M3-006  
Scope: language-independent deterministic fake filesystem/subprocess semantics for Shared TCK tests

## 1. Purpose

M3-006 provides deterministic test doubles for the runtime-independent
filesystem and subprocess seams established before M3. The fake execution world
exists so Shared TCK scenarios can exercise provider-facing behavior without
reading host files, parsing host paths, spawning processes, invoking a shell,
reading environment variables, or depending on DeepSeek Harness internals.

This specification is test infrastructure only. It does **not** define a
production filesystem provider, process sandbox, workspace transaction, path
security policy, or operating-system isolation boundary.

## 2. Authority and security boundary

A conforming fake execution world MUST preserve these non-guarantees:

- filesystem provider mediation is not process/kernel isolation;
- a subprocess and filesystem may be correlated to one execution world without
  proving that subprocess file effects traverse the filesystem provider;
- display paths and process paths are inert scripted strings, not authority to
  access the host;
- string prefix, path normalization, symlink handling, junction handling,
  canonical containment, rollback, and commit semantics are outside M3-006;
- no fixture value may be interpreted as executable code, a shell command, a
  network target, a real path, or an environment lookup instruction;
- DeepSeek Harness package paths, event names, or concrete types MUST NOT define
  the portable contract.

M3-006 intentionally models facts explicitly rather than deriving them from host
behavior.

## 3. Execution world

A fake execution world has one non-empty opaque `worldRef` and two independent
portable services:

```text
filesystem
subprocess
```

`worldRef` correlates those services for a scenario. It is not proof of
containment, virtualization, isolation, or transactionality.

The services share no implicit mutation channel. A scripted subprocess execution
MUST NOT alter fake filesystem state unless a later normative contract explicitly
introduces such behavior.

## 4. Fake filesystem

### 4.1 Target definitions

A target definition is ordinary JSON:

```json
{
  "targetRef": "target-readme",
  "displayPath": "/workspace/README.md",
  "processPath": "opaque:/workspace/README.md",
  "info": {
    "version": "v3",
    "type": "file",
    "size": 5
  },
  "text": "hello"
}
```

`targetRef`, `displayPath`, and `processPath` are non-empty strings.
`targetRef` is the portable identity used by the fake. Neither path string is
parsed or normalized.

`info` is either `null` or:

```json
{
  "version": "v1",
  "type": "file | directory | other",
  "size": 123
}
```

`version` is opaque and non-empty. `size`, when present, is a non-negative
integer. `info: null` represents an explicitly modeled target whose current stat
result is absent.

`text` is optional scripted read content. Its presence does not imply host file
existence.

Duplicate `targetRef` values are invalid configuration and MUST fail before any
operation is served.

### 4.2 Explicit resolution table

Path resolution is configured as exact facts:

```json
{
  "request": {
    "path": "README.md",
    "cwd": "/workspace"
  },
  "targetRef": "target-readme"
}
```

`path` is required and non-empty. `cwd` is optional and, when present, non-empty.
A fake MUST NOT normalize, join, canonicalize, case-fold, or otherwise interpret
these strings.

Resolution lookup is exact over the portable request object. Duplicate mappings
for the same request are invalid configuration. Unknown requests fail explicitly
with:

```text
FAKE_FILESYSTEM_UNKNOWN_RESOLUTION
```

### 4.3 Explicit containment table

Containment is also configured as an exact fact:

```json
{
  "parentRef": "target-workspace",
  "childRef": "target-readme",
  "result": true
}
```

The fake MUST NOT derive containment from `displayPath` or `processPath`.
Duplicate parent/child facts are invalid configuration. A missing fact fails
explicitly with:

```text
FAKE_FILESYSTEM_UNKNOWN_CONTAINMENT
```

This preserves the M3 boundary: the fake can test how a consumer reacts to a
provider-reported containment fact without implementing M6/M11 path security.

### 4.4 Operations

The portable fake filesystem exposes these observable operations:

```text
resolve(request) -> { targetRef, displayPath }
stat(targetRef) -> info | null
contains(parentRef, childRef) -> boolean
readText(targetRef) -> string
processPath(targetRef) -> string
```

An unknown `targetRef` fails with:

```text
FAKE_FILESYSTEM_UNKNOWN_TARGET
```

`readText` requires scripted `text`; otherwise it fails with:

```text
FAKE_FILESYSTEM_NOT_READABLE
```

The fake does not add write, delete, rename, rollback, or commit operations in
M3-006.

## 5. Fake subprocess

### 5.1 Executable resolution

Executable resolution is an exact fact table:

```json
{
  "request": {
    "command": "node",
    "env": {
      "PATH": "/virtual/bin"
    }
  },
  "resolvedPath": "/virtual/bin/node"
}
```

`command` and `resolvedPath` are non-empty strings. `env` is optional ordinary
JSON whose values are strings. The fake MUST NOT read the host environment or
search the host `PATH`.

Duplicate executable-resolution requests are invalid configuration. An unknown
request fails explicitly with:

```text
FAKE_SUBPROCESS_UNKNOWN_EXECUTABLE
```

### 5.2 Spawn request

A spawn request is inert JSON data:

```json
{
  "argv": ["/virtual/bin/node", "script.js"],
  "cwd": "opaque:/workspace",
  "graceMs": 1000,
  "stdoutMaxBytes": 4096,
  "stderrMaxBytes": 4096,
  "stdin": "optional input",
  "env": {
    "MODE": "test"
  }
}
```

`argv` MUST contain at least one non-empty string. `cwd` MUST be non-empty.
`graceMs`, `stdoutMaxBytes`, and `stderrMaxBytes` MUST be non-negative integers.
`stdin` and `env` are optional.

These fields are compared as data only. No shell interpretation, executable
lookup, file access, environment expansion, or process creation occurs.

### 5.3 Scripted execution snapshots

Each accepted spawn consumes exactly one FIFO script entry containing an exact
expected request and an execution snapshot:

```json
{
  "request": {
    "argv": ["/virtual/bin/node", "script.js"],
    "cwd": "opaque:/workspace",
    "graceMs": 1000,
    "stdoutMaxBytes": 4096,
    "stderrMaxBytes": 4096
  },
  "execution": {
    "pid": 4242,
    "outcome": {
      "exitCode": 0,
      "signal": null
    },
    "stdout": {
      "text": "ok\n",
      "nextOffset": 3,
      "lossy": false
    },
    "stderr": {
      "text": "",
      "nextOffset": 0,
      "lossy": false
    }
  }
}
```

`pid` is a positive integer supplied by the script. `exitCode` is an integer or
`null`; `signal` is a string or `null`.

`stdout` and `stderr` are already-scripted output snapshots containing:

```text
text
nextOffset
lossy
spillPath? 
```

`nextOffset` is a non-negative integer. `spillPath`, when present, is a non-empty
inert string. M3-006 does not derive truncation, byte offsets, spilling, or file
creation from these values; later profile-specific TCK contracts may constrain
those algorithms if needed.

### 5.4 FIFO and mismatch behavior

Before consuming a spawn entry, the fake compares the validated request with the
next scripted request using structural JSON equality independent of object key
order.

If no script entry remains, fail with:

```text
FAKE_SUBPROCESS_SCRIPT_EXHAUSTED
```

If the next scripted request does not match, fail with:

```text
FAKE_SUBPROCESS_UNEXPECTED_REQUEST
```

Neither failure may consume the script entry or append a successful spawn
observation. This prevents a malformed test sequence from silently drifting into
later scripted outcomes.

## 6. Spawn observations

Successful spawn observations are ordered and contain only:

```text
ordinal
request
execution
```

`ordinal` is one-based. Reads of observations MUST return defensive immutable
copies so test code cannot mutate future fake behavior or evidence.

## 7. Invalid configuration and malformed requests

Invalid world configuration fails before the fake becomes usable with:

```text
FAKE_EXECUTION_WORLD_INVALID_CONFIG
```

Malformed filesystem operation input fails with:

```text
FAKE_FILESYSTEM_INVALID_REQUEST
```

Malformed subprocess operation input fails with:

```text
FAKE_SUBPROCESS_INVALID_REQUEST
```

Unknown fields in portable config/request objects are rejected rather than
becoming hidden implementation semantics.

## 8. Shared TCK fixture projection

M3-006 fixtures use profile `FULL` and these operation names:

```text
execution-world.filesystem
execution-world.subprocess
execution-world.subprocess-exhaustion
```

The generic envelope remains defined by Spec 0004. The operation-specific
semantics above are defined here and remain language-independent.

## 9. Determinism

Given the same validated configuration and operation sequence, a conforming fake
MUST produce the same results and observations independent of host time, locale,
timezone, filesystem state, process table, scheduling, random source, network,
environment variables, or shell configuration.

M3-003 seed/logical-clock values remain available to the surrounding TCK runner,
but M3-006 consumes neither.

## 10. Deferred behavior

M3-006 deliberately does not define:

- filesystem mutation or transactional shadow workspaces;
- canonical path containment or escape prevention;
- symlink/junction/reparse/hardlink policy;
- shell parsing, PTY behavior, process-tree ownership, or signal delivery;
- actual stdout/stderr buffering algorithms;
- fault injection scheduling;
- capability decisions or approval composition;
- network or secret access;
- DeepSeek Harness binding details.

Those belong to later M3 gates or later runtime milestones.

## 11. Acceptance criteria

M3-006 is complete only when:

- this language-independent contract exists before implementation;
- portable fixtures cover explicit filesystem facts, deterministic subprocess
  execution, no implicit subprocess-to-filesystem mutation, and explicit script
  exhaustion;
- `@dsh-safe/testkit` provides one TypeScript projection without importing
  `@deepseek-ai/*` or adapter concrete types;
- duplicate/ambiguous configuration and unknown operations fail closed;
- unexpected spawn requests do not consume the script;
- observation reads are defensive;
- frozen install and repository `pnpm check:all` remain green.
