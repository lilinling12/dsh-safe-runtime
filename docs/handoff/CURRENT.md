# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-22`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m4-capability-broker`
- Stacked base: `feat/m3-shared-tck-foundation@65870612d039ce026a6952c16d5e069b11bd24a7`
- M2 acceptance: **ACCEPTED**
- M3 acceptance: **ACCEPTED**
- M3 acceptance record: `docs/acceptance/m3-acceptance-audit.md`
- Accepted M3 remediation implementation head: `e6522a18760268b56b09f9ac5d9c822671c41666`
- Final M3 governance head: `65870612d039ce026a6952c16d5e069b11bd24a7`
- Current gate: **M4-001 P0 — YAML/JSON loader**
- Current M4-001 protocol/fixture head: `81d2fd108e5b499700ef6eaa890026dc5f3e95b1`
- Current M4-001 normal CI: **PASS — CI #235 / run `32580005006`**

Live GitHub state always overrides this file. PR #3 is intentionally stacked on
the final accepted M3 governance head so M4 work cannot mutate the accepted M3
evidence line.

## Accepted compatibility baseline

DeepSeek Harness remains an Adapter compatibility target, never protocol authority:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

M4-001 does not depend on Harness behavior. Do not use Harness parser/API behavior
to define CapabilityPolicy syntax or semantics.

## M3 closure prerequisite

Before M4 was entered, the final M3 governance head
`65870612d039ce026a6952c16d5e069b11bd24a7` was verified dual-green:

- normal CI #222: **PASS**;
- Harness rc5 source-conformance #181: **PASS**;
- exact pinned Harness public-type build: **PASS**;
- workspace projection/idempotence: **PASS**;
- exact binding typecheck: **PASS**;
- real rc5 runtime conformance: **PASS**.

M3 remains **ACCEPTED** and is not reopened by M4 work.

## M4-001 normative boundary

Normative authority added for the current gate:

```text
specs/0017-m4-capability-policy-document-loader.md
```

Spec-first head:

```text
81298c33c7c76175f8a49be26f285ecb38e2398b
```

Normal CI for that spec head: **PASS — CI #223**.

Existing M1 authority remains in force:

- `specs/0001-safe-runtime-core.md` defines the CapabilityPolicy model and
  authorization semantics;
- `schemas/v1alpha1/capability-policy.schema.json` remains the normative policy
  schema;
- M4-001 MUST NOT redefine those semantics in loader code.

The M4-001 loader boundary is intentionally limited to converting explicitly
selected UTF-8 JSON or YAML source text into a detached JSON-compatible value or
an explicit portable loader failure.

It does **not** perform or imply:

- M4-002 CapabilityPolicy JSON Schema validation;
- M4-003 canonical resource normalization;
- M4-004 deterministic rule ordering;
- M4-005 deny/ask/allow evaluation;
- M4-006 default-deny evaluation;
- lease/approval routing;
- Harness plugin integration;
- M6 Workspace Transaction behavior.

A successfully parsed document is not automatically a valid CapabilityPolicy and
does not grant any capability.

## M4-001 accepted parser requirements

The current normative contract requires:

1. explicit `JSON | YAML` format selection — no silent content sniffing fallback;
2. exactly one detached JSON-compatible result value on success;
3. duplicate object/mapping keys fail explicitly;
4. JSON must remain actual JSON syntax rather than relaxed YAML syntax;
5. YAML is restricted to a safe JSON-compatible subset;
6. YAML anchors/aliases are forbidden;
7. YAML merge keys are forbidden;
8. YAML explicit/custom tags are forbidden;
9. YAML multi-document input is forbidden;
10. non-string YAML mapping keys are forbidden;
11. cyclic/shared-reference/non-finite/host-only values are forbidden;
12. source-byte, nesting-depth and container-entry limits are finite and
    fail closed;
13. parser output/failure is deterministic for the same source, format and limits;
14. parser code does not execute tags, constructors, interpolation, includes,
    filesystem/network access or arbitrary code.

Portable failure reasons are fixed by Spec 0017 and MUST NOT be replaced by
package-specific parser messages.

## M4-001 portable fixtures

Language-independent loader source cases are now under:

```text
fixtures/policy-loader/
```

Case index:

```text
fixtures/policy-loader/cases.json
```

Current cases cover:

- successful JSON policy text;
- successful YAML policy text;
- duplicate JSON key;
- duplicate YAML key;
- YAML multiple documents;
- YAML alias/anchor;
- YAML custom tag;
- YAML merge key;
- YAML non-string key;
- malformed JSON;
- malformed YAML.

The fixture head is:

```text
81d2fd108e5b499700ef6eaa890026dc5f3e95b1
```

Exact-head evidence:

- normal CI #235 / run `32580005006`: **PASS**.

These fixtures define parser inputs/expected portable failure reasons only. They
must not be interpreted as M4-002 schema-validation acceptance.

## Dependency/security decision for implementation

The production implementation should use a maintained YAML parser rather than a
handwritten general YAML parser.

`yaml@2.8.1` was rejected because current security evidence identifies an
uncontrolled-recursion vulnerability fixed in `2.8.3+`. The intended dependency
baseline is therefore `yaml@2.8.3` or a later explicitly reviewed compatible
version, with frozen-lockfile evidence.

Do **not**:

- add the dependency without synchronizing `pnpm-lock.yaml`;
- disable or bypass `pnpm install --frozen-lockfile`;
- accept an older vulnerable YAML parser only because its lock metadata is easier
  to obtain;
- hand-edit a guessed lockfile and claim reproducibility without CI proof.

The current execution environment could not resolve GitHub/npm over its local
network, so no unverifiable dependency/lockfile change was committed. This is an
operational tooling constraint, not authorization to weaken the supply-chain gate.

## Current implementation gate

The next engineering work remains inside **M4-001**:

```text
Implement the policy document loader against Spec 0017 and the portable fixtures.
```

Expected implementation shape:

- package: `packages/policy-engine`;
- explicit loader request/result/error types;
- JSON parser path that preserves duplicate-key detection rather than relying on
  ordinary `JSON.parse` last-write-wins behavior;
- maintained YAML parser path pinned through the frozen lockfile;
- AST/value checks that reject alias/tag/merge/non-string-key/non-JSON constructs
  before exposing a result;
- explicit finite source/depth/entry limits;
- deterministic portable reason-code mapping;
- unit/conformance tests consuming the portable fixture sources;
- no M4-002 schema validation inside the loader.

Do not advance to `M4-002` until M4-001 implementation is exact-head green and
its acceptance evidence is recorded.

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- Existing M1 Capability semantics are authoritative where already defined.
- DeepSeek Harness is an Adapter and cannot define Capability Broker semantics.
- Unknown formats and unsafe parser constructs fail explicitly.
- Do not weaken TypeScript strictness, schemas, compatibility baseline,
  validators, conformance tests, frozen installs, architecture/security gates or
  security claims for CI.
- Do not enter M4-002+ merely to simplify M4-001 implementation.
- M6 Workspace Transaction remains unauthorized.

## Resume instruction

On the next work session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #3 live head and exact-head workflow results;
3. live GitHub evidence overrides this snapshot;
4. if the current head fails, inspect that exact failing job/step/diagnostic;
5. otherwise continue only with M4-001 implementation;
6. preserve frozen-lockfile reproducibility when introducing the YAML parser;
7. do not start M4-002+ or M6 early.
