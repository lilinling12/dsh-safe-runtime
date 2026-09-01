# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-09-01`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M4-001 through M4-014: **GOVERNANCE CLOSED**
- M4-020 through M4-024: **GOVERNANCE CLOSED**
- M4-025 guarantee level: **IMPLEMENTATION ACCEPTED / ACCEPTANCE-RECORD DUAL-GREEN**
- M4-025 final governance: **IN PROGRESS — final governance exact head must be dual-green before closure**
- M4-030+, M4-040+ and M6: **NOT AUTHORIZED**

Live GitHub state overrides this file.

## Live ancestry note

The long-running PR retains known ancestry-only drift relative to `main`. The
reconciled merge-base `65870612d039ce026a6952c16d5e069b11bd24a7` and
`main@57430273e065be8d38807d67b175fa154c801d43` point to source tree
`ed0c142bf6bbd00f607cc169222f0bf67057fca5`.

Do not rebase, force-update, squash, or rewrite accepted ancestry merely to
change GitHub compare counters.

## Compatibility baseline

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness availability, provider names and provider-reported metadata MUST NOT by
themselves define or upgrade Safe Runtime GuaranteeLevel semantics.

## M4-024 closure prerequisite

M4-024 final-governance exact head:

```text
08acc32c3c7d789c5a0d2c591529414d95bcf39e
```

Exact-head evidence:

- normal CI #496 / run `33384319578`: PASS;
- Harness rc5 source-conformance #438 / run `33384319584`: PASS;
- final governance delta from acceptance-record `bfb42d9600b223937081f8ebaf19627ea4282bbc`
  was exactly CURRENT, HISTORY `+61/-0`, and the M4-024 roadmap marker.

Therefore M4-024 governance is CLOSED.

## M4-025 protocol-first closure

Normative specification:

```text
specs/0036-m4-guarantee-assignment.md
```

Portable corpus:

```text
fixtures/guarantee-assignment/cases.json
```

Corpus profile:

```text
M4-025_GUARANTEE_ASSIGNMENT_V1
```

Portable cases: `30`, canonical sequential IDs `GA-001` through `GA-030`.

Protocol-first exact head:

```text
79c34ce92e420689cb416f1239a06f07f5d12de7
```

Relative to M4-024 final governance, the protocol-first delta was exactly:

```text
docs/handoff/CURRENT.md
fixtures/guarantee-assignment/cases.json
specs/0036-m4-guarantee-assignment.md
```

No production TypeScript, protocol enum, schema, Shared TCK, Adapter/Harness
baseline, dependency, lockfile or later-Gate file was included.

Exact-head evidence:

- normal CI #499: PASS;
- Harness rc5 source-conformance #441: PASS;
- no review/review-thread blocker.

Therefore M4-025 production implementation was authorized only after the
protocol-first head reached same-head dual-green.

## M4-025 accepted semantics

M4-025 classifies the strongest truthful, action-scoped enforcement boundary:

```text
process-isolated
  > provider-enforced
  > tool-enforced
  > advisory
```

This is enforcement-strength classification, not authorization precedence.
Authorization is already resolved upstream by M4-021 through M4-024.

Guarantee truth is based on **active verified enforcement**, not component
existence, package/category names, optimistic feature flags or unverified
provider strings.

### Tool qualification

`tool-enforced` requires exactly:

```text
state                = ENFORCING
authorizationBinding = EXACT_ACTION
dispatchControl      = MANDATORY
```

Tool hook availability alone remains advisory.

### Provider qualification

`provider-enforced` requires exactly:

```text
state                = ENFORCING
authorizationBinding = EXACT_CAPABILITY_RESOURCE
traversal            = MANDATORY
coverage             = COMPLETE
resourceIdentity     = PROVIDER_CANONICAL
deploymentEvidence   = VERIFIED
```

Mediation-only, bypassable traversal, partial coverage, non-canonical resource
identity or unverified deployment evidence cannot produce provider-enforced.

### Process-isolation qualification

Accepted boundary categories are:

```text
OS_PROCESS_SANDBOX
CONTAINER
VM
MICROVM
REMOTE_ISOLATED_RUNTIME
```

The category name alone is insufficient. Qualification additionally requires:

```text
authorizationBinding = EXACT_CAPABILITY_RESOURCE
coverage             = COMPLETE
directHostBypass     = BLOCKED
deploymentEvidence   = VERIFIED
```

Explicit valid non-security-boundary observations are:

```text
PLAIN_PROCESS
WORKER_THREAD
SAME_WORLD_SANDBOX
```

Those never become process-isolated merely by mechanism name.

### Weak versus malformed evidence

```text
structurally valid but explicitly weaker evidence
  -> continue to the next weaker boundary

malformed / unknown / unreadable evidence
  -> FAIL_CLOSED
```

Malformed stronger evidence is never silently ignored to obtain a weaker label.

## Accepted implementation

Accepted implementation exact head:

```text
0fb296447256ba3d1918ec005326ac79eff2394c
```

Implementation delta from protocol-first head is exactly:

```text
packages/capability-broker/src/guarantee-assignment-hardening.test.ts
packages/capability-broker/src/guarantee-assignment-types.ts
packages/capability-broker/src/guarantee-assignment.test.ts
packages/capability-broker/src/guarantee-assignment.ts
packages/capability-broker/src/index.ts
```

No Adapter, Harness baseline, protocol wire enum, schema, Shared TCK,
dependency/lockfile or later-Gate change is part of the implementation.

The implementation is pure and portable:

- runtime input boundary is `unknown`;
- exact own-key domains and own data-property descriptors;
- no getter execution or inherited/symbol authority;
- no implicit string/value coercion;
- revoked Proxy / ownKeys / descriptor failures fail closed;
- qualifying stronger boundaries short-circuit without traversing irrelevant
  weaker nested evidence;
- success/failure output is detached and frozen;
- no host clock/randomness/fs/process/network/container/Harness/provider probe;
- no concrete Adapter/Harness import.

## CI-discovered hardening defect

The first complete implementation candidate was:

```text
da72f106627ec93d8d451c4a8e226a01525bf2dc
```

CI #504 caught a genuine hostile-runtime defect: JavaScript `Array.isArray()`
throws when applied to a revoked Proxy, so the initial record predicate could
leak a host `TypeError` instead of returning the stable fail-closed contract.

The regression test was retained. The object-shape probe was corrected so that
the meta-operation itself is guarded and unreadable/revoked values become
invalid evidence.

Corrected accepted head remained limited to the same five implementation files.

## Accepted implementation evidence

For `0fb296447256ba3d1918ec005326ac79eff2394c`:

- normal CI #505: PASS;
- Harness rc5 source-conformance #447: PASS;
- frozen install: PASS;
- 124-entry supply-chain policy: PASS;
- architecture boundaries: PASS;
- 16-schema shape and compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- 51 test files / 976 tests: PASS;
- M4-025 primary suite: 32 PASS;
- M4-025 hostile-runtime hardening suite: 10 PASS;
- oxlint: 0 errors; two pre-existing unrelated warnings;
- packed Shared TCK / external consumer: 44 registered assets PASS;
- Harness build/install/projection/idempotence/exact-source typecheck/runtime:
  PASS.

## Acceptance record

Acceptance audit:

```text
docs/acceptance/m4-025-acceptance-audit.md
```

Acceptance-record exact head:

```text
40ba27452f90e06fe4daa3f2a4243986f7d5d0ed
```

Relative to the accepted implementation head, acceptance-record delta is
exactly:

```text
docs/acceptance/m4-025-acceptance-audit.md
packages/capability-broker/src/index.ts   # package stage only
```

Exact-head evidence:

- normal CI #507: PASS;
- Harness rc5 source-conformance #449: PASS;
- pinned public type build, reproducible install, exact projection,
  projection idempotence, exact-source typecheck and real runtime conformance:
  PASS.

## Final-governance transition

This transition is intentionally limited to:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # append-only; deletions MUST equal 0
docs/roadmap.md           # only M4-025 acceptance marker
```

No production implementation, Spec/corpus/schema, Shared TCK, dependency,
lockfile, Adapter/Harness baseline, M4-030+, M4-040+ or M6 change is authorized
in final governance.

The resulting exact governance head MUST itself reach:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS;
3. PR remains Open/Draft/mergeable with no review/thread blocker.

Only after that same-head evidence may M4-025 governance be declared CLOSED and
M4-030 P0 TTL become the next protocol-first Gate.

## Boundaries that remain enforced

- M4-025 classifies trusted evidence; it does not manufacture deployment
  attestation.
- Provider mediation is not provider enforcement.
- Process/container/sandbox category is not itself process isolation.
- Minimum required GuaranteeLevel negotiation remains later composition/PEP
  work.
- M4-030+, M4-040+ and M6 remain unauthorized until the current governance Gate
  closes.
- PR #3 remains Draft; no merge without explicit user authorization.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads;
2. compare final-governance head against acceptance-record `40ba2745...`;
3. require exactly CURRENT, append-only HISTORY and the M4-025 roadmap marker;
4. mechanically require HISTORY deletions = 0 and roadmap `+1/-1` only;
5. require final-governance exact-head normal CI + pinned Harness dual-green;
6. only then declare M4-025 GOVERNANCE CLOSED and authorize M4-030 P0 TTL
   protocol-first work;
7. keep M4-031+, M4-040+, M6 and PR merge unauthorized.
