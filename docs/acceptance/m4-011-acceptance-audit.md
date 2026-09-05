# M4-011 Acceptance Audit — Built-in Shell Tool Classifier

Status: **ACCEPTED AT IMPLEMENTATION BOUNDARY**

Accepted implementation head:

```text
c8a5318220622e977e042b1585dcf183efff39e7
```

Normative authority:

- `specs/0027-m4-builtin-shell-tool-classification.md`
- `specs/0001-safe-runtime-core.md`
- `packages/protocol/src/capability.ts`

Portable corpus:

- `fixtures/tool-classifier/builtin-shell-cases.json` — 22 cases.

Compatibility evidence only:

```text
DeepSeek Harness 0.1.0-rc.5
commit 47f943859bef60e4160492346772ded9b24f765a
```

## Acceptance result

M4-011 is accepted as a deterministic, IO-free classifier for the exact pinned
built-in shell tool surface `bash` and `pwsh`. Each recognized call produces one
unresolved `process.exec` requirement carrying shell dialect, raw command,
foreground/background intent, and unresolved working-directory evidence.

The classifier does not authorize execution, resolve executable identity,
materialize a process resource, parse shell syntax, infer nested filesystem or
network effects, request approval, evaluate policy, allocate a lease, signal a
process, create a terminal, or execute a provider.

DeepSeek Harness remains Adapter compatibility evidence. The canonical
`process.*` vocabulary remains owned by `@dsh-safe/protocol`.

## Accepted rc5 mapping

The exact-name mapping is deliberately narrow:

- `bash` -> exactly one `process.exec` requirement with dialect `BASH`;
- `pwsh` -> exactly one `process.exec` requirement with dialect `POWERSHELL`.

M4-011 does **not** add `process.resolve`: pinned rc5 `ctx.shell.resolve()` fills
execution/provider defaults and does not represent a model request to resolve an
executable identity. Bash provider invocation is provider-owned (`bash -c`), and
PowerShell executable resolution is provider/configuration state.

M4-011 does **not** add `process.terminal`: terminal-shaped presentation is UI
evidence, not PTY authority. Pinned local executors collect process stdio and do
not establish model-requested terminal authority.

M4-011 does **not** add `process.signal`: timeout, abort, background cleanup and
provider `kill()` behavior are lifecycle mechanics, not an independently
model-requested process signal operation.

## Opaque command boundary

Accepted shell command text is validated only as a non-blank own string data
property and is then preserved exactly. It is never tokenized, normalized,
parsed, recursively interpreted, or used to infer nested capabilities.

Therefore commands such as:

```text
cat ./secret.txt && rm -f ./generated.txt
curl https://example.test/api
```

still classify only as `process.exec`. Filesystem, network, secret, subprocess
containment and negative guarantees remain provider/runtime enforcement
responsibilities rather than classifier guesses.

This boundary prevents the classifier from becoming an incomplete shell parser
or a second authority for nested side effects.

## Workdir and execution-mode boundary

An explicit non-blank `workdir` is preserved as unresolved
`ARGUMENT_WORKDIR` evidence. Omitted workdir becomes unresolved
`EXECUTION_ROOT` evidence.

The classifier never substitutes host cwd, session cwd, Adapter scope, `/`, `.`,
or provider canonical state, and never normalizes dot segments or platform path
syntax.

`run_in_background` is interpreted only when it is an own boolean data property:

- omitted or `false` -> `FOREGROUND`;
- `true` -> `BACKGROUND`;
- any explicit non-boolean value -> `SHELL_TOOL_BACKGROUND_INVALID`.

Background mode records execution-lifetime intent only; it does not add signal,
terminal, lease or provider authority.

## Fail-closed hostile-input boundary

Recognized tools require a non-null, non-array argument object. Security-relevant
fields are inspected in deterministic order:

1. `command`;
2. `workdir`;
3. `run_in_background`.

Only bounded own data-property descriptors are trusted. The classifier does not
enumerate, spread, stringify or recursively traverse the argument graph and does
not execute accessors.

Stable error reasons are:

- `SHELL_TOOL_ARGUMENTS_INVALID`;
- `SHELL_TOOL_COMMAND_INVALID`;
- `SHELL_TOOL_WORKDIR_INVALID`;
- `SHELL_TOOL_BACKGROUND_INVALID`;
- `SHELL_TOOL_INPUT_UNREADABLE`.

Runtime hardening tests prove:

- inherited command/workdir/background values cannot manufacture authority;
- command/workdir/background getters are rejected without execution;
- unrelated getters, including display/timeout/escalation fields, remain unread;
- symbol-only command substitution is rejected;
- arrays fail closed;
- descriptor-trap failures for each security-relevant field fail closed;
- deterministic field order controls the first explicit failure;
- `ownKeys` enumeration is never required;
- unknown tools do not touch hostile argument objects;
- accepted output is deeply frozen and detached from later caller mutation.

Unknown exact names return `NOT_APPLICABLE`. That status is not allow/deny and
does not implement M4-013 fallback policy.

## Maintainability and package boundary

M4-011 also performed a package-internal organization cleanup without changing
the accepted M4-010 public API:

```text
packages/capability-broker/src/
  builtin-filesystem-tool-classifier.ts   # compatibility re-export
  tool-classifier/
    hostile-input.ts
    builtin-filesystem.ts
    builtin-shell.ts
    builtin-shell.test.ts
```

The shared hostile-input module contains only the already-established bounded
argument-record and own-data-property primitives. It is package-internal and is
not a classifier registry or plugin API.

The original M4-010 import path remains a compatibility forwarding layer and its
34-test suite remains green. Generic classifier registration, precedence and
plugin extensibility remain M4-014 rather than being pulled forward here.

## Protocol-first evidence

The M4-011 protocol-first head is:

```text
204dd802e88645b6cc754a658ef691d6203da1bb
```

It introduced Spec 0027 and the reviewed 22-case portable corpus before
production implementation and passed:

- CI #355 / run `33063928757`: **PASS**;
- Harness rc5 source-conformance #297 / run `33063928753`: **PASS**.

## Exact accepted-head evidence

At `c8a5318220622e977e042b1585dcf183efff39e7`:

- normal CI #356 / run `33116459841`: **PASS**;
- exact Harness rc5 source-conformance #298 / run `33116459834`: **PASS**;
- frozen pnpm install: PASS;
- supply-chain policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- 39 test files / 610 tests: PASS;
- M4-011 shell classifier suite: 38 PASS;
- M4-010 filesystem classifier suite: 34 PASS;
- oxlint: 0 warnings / 0 errors on 123 files;
- packed Shared TCK + external non-workspace consumer: 44 assets PASS;
- Harness source-conformance steps 6–11: PASS.

No schema, validator, TCK, TypeScript strictness, frozen lockfile, supply-chain
policy, protocol capability vocabulary, Adapter contract, provider containment
boundary, unknown-tool fallback, MCP classifier, generic plugin classifier API,
PDP, subject resolution, lease, approval, receipt/provenance, guarantee or M6
boundary was weakened or pulled forward.

## Governance gate

This audit accepts M4-011 only at its implementation boundary. This
acceptance-record/CURRENT/package-stage head must itself reach exact-head normal
CI plus exact Harness rc5 source-conformance dual-green.

Only after that may an independent governance commit append HISTORY and mark only
M4-011 accepted in the roadmap. That final governance head must also reach
exact-head dual-green before M4-012 is authorized.

Until final governance closure:

```text
M4-011 implementation: ACCEPTED
M4-011 governance: PENDING
M4-012+: NOT AUTHORIZED
M4-020+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```
