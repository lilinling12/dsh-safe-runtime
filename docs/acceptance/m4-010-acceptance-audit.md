# M4-010 Acceptance Audit — Built-in Filesystem Tool Classifier

Status: **ACCEPTED AT IMPLEMENTATION BOUNDARY**

Accepted implementation head:

```text
4be1fffc452358acf6a1af4dff5d849ea7868ec8
```

Normative authority:

- `specs/0026-m4-builtin-filesystem-tool-classification.md`
- `specs/0001-safe-runtime-core.md`
- `packages/protocol/src/capability.ts`

Portable corpus:

- `fixtures/tool-classifier/builtin-fs-cases.json` — 22 cases.

Compatibility evidence only:

```text
DeepSeek Harness 0.1.0-rc.5
commit 47f943859bef60e4160492346772ded9b24f765a
```

## Acceptance result

M4-010 is accepted as a deterministic, IO-free classifier for the pinned built-in
filesystem tool surface. It converts recognized model-facing tool calls into a
conservative ordered filesystem capability-effect envelope plus unresolved
filesystem operands.

The classifier does not authorize, evaluate policy, resolve subjects, inspect or
canonicalize provider targets, consume leases, request approval, execute tools,
or create protocol `CapabilityRequest` objects.

DeepSeek Harness remains Adapter compatibility evidence. Harness tool names and
implementation behavior determine only the rc5 compatibility profile; the
canonical `fs.*` vocabulary remains owned by `@dsh-safe/protocol`.

## Accepted rc5 mapping

The accepted exact-name mapping is:

- `read` -> `fs.stat`, `fs.read` on required `file_path`;
- `read_image` -> `fs.stat`, `fs.read` on required `file_path`;
- `write` -> `fs.create`, `fs.write` on required `file_path`;
- `edit` -> `fs.edit` on required `file_path`;
- `glob` -> `fs.list` on optional `path`, otherwise unresolved execution root;
- `grep` -> `fs.read` on optional `path`, otherwise unresolved execution root;
- `str_replace_editor view` -> `fs.stat`, `fs.read`, `fs.list`;
- `str_replace_editor create` -> `fs.stat`, `fs.create`;
- `str_replace_editor str_replace|insert` -> `fs.stat`, `fs.read`, `fs.write`.

The `str_replace_editor` mutation mapping follows pinned rc5 provider operations,
not the model-facing command name: replacement and insertion stat and read the
file and persist through `writeText(replaceIfVersion)`. The separate `edit` tool
maps to `fs.edit` because pinned rc5 delegates that operation to provider
`editText`.

`glob` and `grep` are subprocess-backed in the pinned Harness source. M4-010
classifies their model-facing filesystem authority only; it does not claim their
execution is mediated by the filesystem provider or invent a process capability
for their fixed internal ripgrep implementation.

## Provider and resource boundary

M4-010 deliberately emits unresolved operands rather than `CapabilityResource`.
It never calls provider methods, normalizes `.`/`..`, follows links, guesses a
workspace root, derives a provider identity, or treats a model path as proof of
containment.

When `glob`/`grep` omit `path`, the result uses `EXECUTION_ROOT` rather than
inventing `/`, `.`, host cwd, or Adapter scope. Provider-aware resource
materialization and containment remain later enforcement responsibilities.

Accepted raw path strings are preserved exactly after the pinned built-in
non-blank check. This prevents the classifier from silently becoming a second
resource-normalization authority.

## Fail-closed runtime boundary

Unknown exact tool names return `NOT_APPLICABLE`; this is not allow/deny and does
not implement M4-013 unknown-tool policy.

Once an exact recognized tool is selected, malformed or unreadable
security-relevant classifier input returns an explicit error and cannot fall
through to another classifier. Stable reasons are:

- `FS_TOOL_ARGUMENTS_INVALID`;
- `FS_TOOL_PATH_INVALID`;
- `FS_TOOL_COMMAND_INVALID`;
- `FS_TOOL_INPUT_UNREADABLE`.

The implementation performs bounded known-field inspection with
`Object.getOwnPropertyDescriptor`. It does not enumerate or clone the untrusted
argument graph, invoke accessors, consume inherited values, or retain unrelated
content/replacement/search values.

Hostile-runtime tests prove:

- inherited path and command values cannot manufacture authority;
- path/command getters are not executed;
- unrelated accessors are not evaluated;
- symbol-only substitution is rejected;
- arrays fail closed as invalid argument records;
- proxy descriptor failures become `FS_TOOL_INPUT_UNREADABLE`;
- unknown tools do not inspect hostile argument objects;
- an `ownKeys` trap is unnecessary because enumeration is not used;
- successful classifications are detached from later caller mutation and deeply
  frozen.

## Review findings resolved before acceptance

The protocol-first head
`dffcc0ef99b445d70cd680bc15df6b1d076e2562` introduced Spec 0026 and the 22-case
portable corpus before production implementation. It passed CI #349 / run
`32942835039` and Harness #291 / run `32942835195`.

The first implementation head
`80d29a7a3a4a8b714a29b950181c54fe2cb3eb2e` preserved frozen install, schema and
architecture checks and passed Harness #292, but CI #350 correctly failed strict
TypeScript because the new broker consumer imported `@dsh-safe/protocol` while
that package exposes declarations from `dist/` and the workspace `typecheck`
phase does not emit them.

The correction did not remove the protocol type dependency or weaken TypeScript.
`@dsh-safe/capability-broker` now builds its workspace protocol dependency before
its own no-emit typecheck. The frozen lockfile and dependency graph were unchanged.

## Exact accepted-head evidence

At `4be1fffc452358acf6a1af4dff5d849ea7868ec8`:

- normal CI #351 / run `33036068127`: **PASS**;
- exact Harness rc5 source-conformance #293 / run `33036068108`: **PASS**;
- frozen pnpm install: PASS;
- supply-chain policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- 38 test files / 572 tests: PASS;
- M4-010 classifier suite: 34 PASS;
- M4-009 hot-reload suite: 25 + 3 hardening PASS;
- M4-008 diagnostics: 33 PASS;
- M4-007 explanation: 33 PASS;
- M4-006 default deny: 35 PASS;
- M4-005 effect resolution: 32 PASS;
- M4-004 ordering: 19 PASS;
- M4-003 normalizer: 38 + 2 PASS;
- M4-002 validator: 6 PASS;
- M4-001 loader: 18 PASS;
- oxlint: 0 warnings / 0 errors on 119 files;
- packed Shared TCK + external non-workspace consumer: 44 assets PASS;
- Harness source-conformance steps 6–11: PASS.

No schema, validator, TCK, TypeScript strictness, frozen lockfile, supply-chain
policy, protocol capability vocabulary, Adapter contract, provider containment
boundary, unknown-tool policy, Bash/PowerShell classifier, MCP classifier, PDP,
lease, approval, receipt/provenance, guarantee or M6 boundary was weakened or
pulled forward.

## Governance gate

This audit accepts M4-010 only at its implementation boundary. The
acceptance-record/PACKAGE_STAGE/CURRENT head must itself reach exact-head normal
CI plus exact Harness rc5 source-conformance dual-green. Only after that may
HISTORY and roadmap record final M4-010 governance closure. The final governance
head must also be dual-green before M4-011 is authorized.

Until final governance closure:

```text
M4-010 implementation: ACCEPTED
M4-010 governance: PENDING
M4-011+: NOT AUTHORIZED
M4-020+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```
