# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-25`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M2: **ACCEPTED / MERGED** — PR #1 merge commit `52233e19c15504d5c5f77522bb4bf58a2d23c56f`
- M3: **ACCEPTED / MERGED** — PR #2 merge commit `57430273e065be8d38807d67b175fa154c801d43`
- M4-001 through M4-007: **ACCEPTED / GOVERNANCE CLOSED**
- M4-007 final governance head: `1f8d5a4a879d1dbc2df2b592896ffdb008c9f177`
- M4-007 final governance normal CI: **PASS — CI #331 / run `32717328232`**
- M4-007 final governance Harness: **PASS — #273 / run `32717328229`**
- Current gate: **M4-008 P1 — policy diagnostics**
- M4-008 authorization: **AUTHORIZED**
- M4-008 implementation: **NOT STARTED**
- M4-009, M4-020+ and M6: **NOT AUTHORIZED by the current gate**

Live GitHub state overrides this file.

## Accepted compatibility baseline

DeepSeek Harness remains an Adapter compatibility target, never protocol authority:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

M4 policy/diagnostic/evaluation semantics MUST NOT be inferred from Harness APIs
or runtime behavior.

## Repository topology

Accepted M2 and M3 milestone PRs are merged into `main` using merge commits so
accepted exact SHAs remain reachable in main ancestry.

PR #3 is directly based on `main` and remains Draft while M4 is in progress. M4
history has not been rebased, squashed, or force-rewritten during accepted gate
cleanup.

## M4-007 final closure

Accepted implementation head:

```text
1c8bc9ef50a6c680a930814821267e76d79357ac
```

Accepted implementation evidence:

- CI #329 / run `32716573950`: PASS;
- Harness #271 / run `32716573857`: PASS;
- 34 test files / 477 tests: PASS;
- M4-007 explanation suite: 33 PASS;
- strict TypeScript: PASS;
- supply-chain policy: PASS (124 entries);
- architecture boundaries / 16-schema shape / schema baseline: PASS;
- oxlint: 0 warnings / 0 errors on 110 files;
- Shared TCK packed artifact + external consumer: 44 assets PASS.

Final governance head:

```text
1f8d5a4a879d1dbc2df2b592896ffdb008c9f177
```

Final governance evidence:

- normal CI #331 / run `32717328232`: PASS;
- exact Harness rc5 source-conformance #273 / run `32717328229`: PASS.

Therefore M4-007 governance is **CLOSED** and M4-008 is the next authorized gate.

## M4-008 protocol-first authority

M4-008 must remain a deterministic static diagnostics/preflight layer, not a
second schema validator or authorization engine.

New draft normative profile:

```text
specs/0024-m4-capability-policy-diagnostics.md
```

Portable candidate corpus:

```text
fixtures/policy-diagnostics/cases.json
```

Reconciled accepted authority:

```text
specs/0018-m4-capability-policy-schema-validation.md
specs/0019-m4-canonical-resource-normalization.md
specs/0020-m4-deterministic-rule-ordering.md
specs/0021-m4-effect-resolution.md
specs/0022-m4-defensive-default-deny.md
specs/0023-m4-policy-effect-explanation.md
schemas/v1alpha1/capability-policy.schema.json
```

## M4-008 intended semantic boundary

Diagnostics consume a policy that has already passed M4-002 validation.
Diagnostics do not change policy validity or authorization behavior.

Initial v0.1 built-in diagnostics are deliberately limited to facts already
justified by accepted semantics:

1. resource selector normalization errors using M4-003 reason codes;
2. resource pattern syntax errors using M4-004 profile semantics;
3. duplicate rule-ID authoring warning using exact string equality;
4. explicit priority on `deny` as redundant under global explicit-deny semantics;
5. explicit `priority: 0` on `allow`/`ask` as redundant because absent priority is
   comparison-time zero;
6. empty rule set as informational because M4-005 then has no applicable rules
   and M4-006 defaults deny.

Diagnostics MUST NOT implement early semantics for:

- subject reachability;
- capability overlap/full applicability;
- arbitrary constraint satisfiability;
- lease behavior;
- approval routing;
- full-PDP rule shadowing;
- guarantee assignment;
- provider containment;
- decision receipt/provenance.

Those remain M4-020+ or provider-specific responsibilities.

## M4-008 deterministic output boundary

Portable diagnostic shape is intended to expose only:

```text
severity: ERROR | WARNING | INFO
code: stable machine-readable code
instancePath: RFC 6901 JSON Pointer
relatedPaths?: RFC 6901 JSON Pointer list
```

No resource selector, capability, subject, constraint, secret, source text,
absolute host path, stack trace, or library-specific error object should be
copied into portable output.

Diagnostics use deterministic source traversal ordering. The default portable
maximum is 256 emitted findings; additional findings set `truncated: true`.

Ordering is presentation/truncation order only and MUST NOT become rule
precedence.

## M4-008 runtime hardening requirement

Although the normal input is an M4-002 frozen JSON snapshot, direct JavaScript
callers can bypass that typed boundary.

The reference implementation must therefore:

- use own data-property descriptors for required inspected fields;
- reject accessor-backed required fields without invoking getters;
- reject sparse/accessor-backed rules/resources arrays;
- reject named/symbol array properties;
- fail explicitly on descriptor/proxy inspection errors;
- avoid reading deferred subject/constraint/lease fields;
- not mutate caller data;
- freeze success/failure/diagnostic/related-path outputs;
- perform no filesystem, network, process, time, randomness, locale, or Harness
  operations.

M4-008 runtime shape checking is defensive API hardening only. It MUST NOT become
a hand-written replacement for M4-002 JSON Schema validation.

## Active gate rule

The current protocol-first candidate must prove normal CI + exact Harness rc5
source-conformance on one exact head before production M4-008 TypeScript work
begins.

Until that happens:

```text
M4-007 governance: CLOSED
M4-008 protocol-first profile: IN PROGRESS
M4-008 implementation: NOT STARTED
M4-009: NOT AUTHORIZED
M4-020+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- Specs/schemas/TCK remain semantic authority.
- Harness is compatibility evidence only.
- M4-002 is schema validity authority.
- M4-003 is resource normalization authority.
- M4-004 is lexical pattern/structural ordering authority.
- M4-005 is effect-resolution authority over fully-applicable rules.
- M4-006 is defensive default-deny authority.
- M4-007 explanation is not a full PDP or durable provenance.
- M4-008 diagnostics must never change authorization behavior.
- Subject resolution/full policy evaluation remain M4-020/M4-021.
- Approval remains M4-023.
- Decision receipt/provenance remains M4-024.
- Guarantee assignment remains M4-025.
- Never weaken schemas, validators, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, compatibility evidence, or
  fail-closed behavior for CI.

## Resume instruction

On the next session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #3 live base/head and exact-head workflows;
3. live GitHub state overrides this snapshot;
4. continue only from the M4-008 protocol-first candidate gate;
5. do not write production M4-008 implementation until the exact spec/fixture
   candidate is CI + Harness dual-green;
6. inspect exact current-head diagnostics before fixing any failure;
7. do not start M4-009, M4-020+, or M6 early.
