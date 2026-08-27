# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-28`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- PR state: `OPEN / DRAFT / mergeable`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M2 / M3: **ACCEPTED / MERGED**
- M4-001 through M4-010: **ACCEPTED / GOVERNANCE CLOSED**
- M4-010 final governance head: `994a8ddf1be5d0899c1749bc5b639650135b35a6`
- M4-010 final governance CI: **PASS — CI #354**
- M4-010 final governance Harness: **PASS — #296**
- M4-011 implementation boundary: **ACCEPTED**
- M4-011 protocol-first head: `204dd802e88645b6cc754a658ef691d6203da1bb`
- M4-011 implementation head: `c8a5318220622e977e042b1585dcf183efff39e7`
- M4-011 acceptance audit: `docs/acceptance/m4-011-acceptance-audit.md`
- M4-011 acceptance-audit commit: `d3aeb2e9625c307c4b7f1d0042dcf6dfe50ab2d8`
- M4-011 acceptance-record head: `2d95d5b6904f24da226cd09e6e70a6a92507e27a`
- M4-011 acceptance-record CI: **PASS — CI #358 / run `33117086290`**
- M4-011 acceptance-record Harness: **PASS — #300 / run `33117086251`**
- M4-011 final governance closure: **PENDING THIS GOVERNANCE HEAD DUAL-GREEN**
- M4-012+, M4-020+ and M6: **NOT AUTHORIZED until final M4-011 governance dual-green**

Live GitHub state overrides this file.

## Accepted compatibility baseline

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness APIs/runtime behavior MUST NOT define Core protocol capability semantics,
provider containment, policy/PDP semantics, classifier fallback policy or plugin
classifier precedence.

## M4-010 final closure

M4-010 built-in filesystem classification is governance-closed at corrected
append-only governance head:

```text
994a8ddf1be5d0899c1749bc5b639650135b35a6
```

Its exact governance-head CI #354 and Harness #296 passed. That closure formally
authorized M4-011 and no later classifier gate.

The accepted M4-010 compatibility import remains available through
`builtin-filesystem-tool-classifier.ts`; the internal move performed during
M4-011 did not remove or redefine that public surface.

## M4-011 accepted normative boundary

Normative profile:

```text
specs/0027-m4-builtin-shell-tool-classification.md
```

Portable corpus:

```text
fixtures/tool-classifier/builtin-shell-cases.json
```

The protocol-first head is:

```text
204dd802e88645b6cc754a658ef691d6203da1bb
```

It passed:

- CI #355 / run `33063928757`;
- Harness #297 / run `33063928753`.

The exact pinned rc5 model-facing shell tools covered by M4-011 are only:

```text
bash
pwsh
```

Both classify to exactly one `process.exec` requirement. Protocol capability
names come from `@dsh-safe/protocol`; pinned Harness source supplies only
compatibility facts about the model-facing surface and provider lifecycle.

## Accepted M4-011 implementation

Accepted implementation head:

```text
c8a5318220622e977e042b1585dcf183efff39e7
```

The implementation is intentionally classification-only:

- exact `bash` -> `process.exec` with `BASH` dialect;
- exact `pwsh` -> `process.exec` with `POWERSHELL` dialect;
- no `process.resolve` from provider-owned default/executable resolution;
- no `process.terminal` from terminal-shaped presentation UI;
- no `process.signal` from timeout/abort/background cleanup mechanics;
- no shell parsing and no nested filesystem/network/secret capability inference;
- no provider invocation, executable resolution, policy/PDP, approval, lease or
  execution.

Command text is accepted only as a non-blank own string data property and is
preserved exactly. The classifier must not become a shell parser or secondary
authority for command semantics.

## Workdir and execution mode

Explicit non-blank `workdir` is preserved as unresolved `ARGUMENT_WORKDIR`
evidence. Omitted workdir is recorded as unresolved `EXECUTION_ROOT` evidence.
No host cwd, Adapter scope, provider root or path canonicalization is invented.

`run_in_background` is interpreted narrowly:

- omitted or `false` -> `FOREGROUND`;
- `true` -> `BACKGROUND`;
- explicit non-boolean -> `SHELL_TOOL_BACKGROUND_INVALID`.

Background intent does not imply terminal or signal authority.

## Fail-closed hostile-input boundary

Recognized tool arguments must be non-null, non-array objects. Security-relevant
fields are inspected in deterministic order:

1. `command`;
2. `workdir`;
3. `run_in_background`.

Only own data-property descriptors are trusted. No getter execution, inherited
value consumption, key enumeration, spreading, stringification or recursive
traversal is used.

Stable errors are:

- `SHELL_TOOL_ARGUMENTS_INVALID`;
- `SHELL_TOOL_COMMAND_INVALID`;
- `SHELL_TOOL_WORKDIR_INVALID`;
- `SHELL_TOOL_BACKGROUND_INVALID`;
- `SHELL_TOOL_INPUT_UNREADABLE`.

Unknown exact names return `NOT_APPLICABLE` without touching hostile arguments.
That status is not allow/deny and remains separate from M4-013 fallback policy.
Successful classifications are deeply frozen and detached from later caller
mutation.

## Maintainable package structure

M4-011 introduced only the minimum package-internal modularization required to
keep classifier code cohesive and maintainable:

```text
packages/capability-broker/src/
├── builtin-filesystem-tool-classifier.ts
├── index.ts
└── tool-classifier/
    ├── hostile-input.ts
    ├── builtin-filesystem.ts
    ├── builtin-shell.ts
    └── builtin-shell.test.ts
```

`hostile-input.ts` contains the bounded untrusted-record primitives shared by the
two built-in classifiers. It is not a registry and does not pull M4-014 plugin
classification forward. The filesystem compatibility facade remains exported and
its accepted behavior remains covered by CI.

## Exact accepted implementation evidence

At `c8a5318220622e977e042b1585dcf183efff39e7`:

- normal CI #356 / run `33116459841`: PASS;
- exact Harness rc5 source-conformance #298 / run `33116459834`: PASS;
- Harness steps 6–11: PASS;
- frozen install: PASS;
- supply-chain policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- 39 test files / 610 tests: PASS;
- M4-011 shell classifier suite: 38 PASS;
- M4-010 filesystem classifier suite: 34 PASS;
- oxlint: 0 warnings / 0 errors on 123 files;
- packed Shared TCK + external non-workspace consumer: 44 assets PASS.

No package dependency, lockfile, schema, TCK, protocol capability vocabulary or
pinned Harness runtime dependency was changed by the M4-011 implementation.

## Acceptance-record verification

Implementation acceptance is recorded by:

- audit commit `d3aeb2e9625c307c4b7f1d0042dcf6dfe50ab2d8`;
- acceptance-record head `2d95d5b6904f24da226cd09e6e70a6a92507e27a`.

That exact acceptance-record head reached dual-green before this final governance
candidate was prepared:

- normal CI #358 / run `33117086290`: PASS;
- exact Harness rc5 source-conformance #300 / run `33117086251`: PASS.

This satisfies the prerequisite for the M4-011 final governance candidate. It
does not by itself authorize M4-012; the governance head containing HISTORY,
roadmap and CURRENT closure must also reach exact-head dual-green.

## Current gate

`docs/acceptance/m4-011-acceptance-audit.md` records **M4-011 ACCEPTED AT
IMPLEMENTATION BOUNDARY**.

This final governance candidate is intentionally limited to operational and
governance state:

1. append M4-011 acceptance evidence to `docs/handoff/HISTORY.md`;
2. mark only M4-011 accepted in `docs/roadmap.md`;
3. update this handoff snapshot with verified acceptance-record evidence;
4. make no production-code, schema, TCK, dependency, lockfile or security-boundary
   change;
5. require exact-head normal CI + Harness rc5 dual-green on the resulting
   governance commit before authorizing M4-012.

Until this final governance head is dual-green:

```text
M4-011 implementation: ACCEPTED
M4-011 acceptance-record head: DUAL-GREEN
M4-011 governance: PENDING FINAL GOVERNANCE-HEAD DUAL-GREEN
M4-012+: NOT AUTHORIZED
M4-020+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- Specs/schemas/TCK remain semantic authority.
- Harness remains Adapter compatibility evidence only.
- M4-001 through M4-010 remain governance-closed authorities for their concerns.
- M4-011 is built-in Bash/PowerShell classification only.
- Known MCP metadata classification remains M4-012.
- Unknown-tool fallback/profile policy remains M4-013.
- Generic/plugin classifier API remains M4-014.
- Subject resolution/full policy evaluation remain M4-020/M4-021.
- Approval remains M4-023.
- Decision receipt/provenance remains M4-024.
- Guarantee assignment remains M4-025.
- Provider-aware containment and execution remain separate enforcement concerns.
- Never weaken schemas, validators, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, compatibility evidence or
  fail-closed behavior for CI.

## Resume instruction

On the next session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #3 live head/base, reviews/threads and exact-head workflows;
3. live GitHub state overrides this snapshot;
4. if this final M4-011 governance head is dual-green, treat M4-011 governance as
   closed and authorize only M4-012 as the next protocol-first Gate;
5. otherwise inspect the exact current-head failure before editing;
6. do not start M4-013+, M4-020+ or M6 early.
