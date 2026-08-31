# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-31`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M4-001 through M4-014: **ACCEPTED / GOVERNANCE CLOSED**
- M4-020 P0 Subject resolution: **GOVERNANCE CLOSED**
- M4-021 P0 policy evaluation: **IMPLEMENTATION ACCEPTED / ACCEPTANCE RECORD IN PROGRESS**
- M4-022+, M4-040+ and M6: **NOT AUTHORIZED**

Live GitHub state overrides this file.

## Live ancestry note

The long-running PR retains known ancestry-only drift relative to `main`. The
reconciled merge-base `65870612d039ce026a6952c16d5e069b11bd24a7` and
`main@57430273e065be8d38807d67b175fa154c801d43` point to the same source tree
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

Harness behavior MUST NOT define Core Subject identity, policy/PDP semantics,
selector grammar, precedence, guarantees, plugin trust, or PEP behavior.

## M4-020 final closure

Final-governance exact head:

```text
005f436007ce05ed607979ca77f12960544ca655
```

Exact-head evidence:

- CI #420 / run `33326180401`: PASS;
- Harness rc5 source-conformance #362 / run `33326180648`: PASS.

M4-020 accepted implementation remains:

```text
31b3b190fc92372f2ccc2f6527b91826153f7917
```

Acceptance audit:

```text
docs/acceptance/m4-020-acceptance-audit.md
```

Therefore **M4-020 governance is CLOSED**.

## M4-021 protocol-first record

Normative profile:

```text
specs/0032-m4-policy-evaluation.md
```

Portable corpus:

```text
fixtures/policy-evaluation/cases.json
```

Portable cases: `31`.

Protocol-first exact head:

```text
3e9575ec90db6b509d818716cc9d3dc48c6febd4
```

Exact-head evidence:

- CI #425 / run `33327340780`: PASS;
- Harness rc5 source-conformance #367: PASS.

Production evaluator work began only after this exact protocol-first head was
dual-green.

## M4-021 accepted implementation

Accepted implementation exact head:

```text
21487cb2107dd708aab255472a1c2f71d3659584
```

Exact-head evidence:

- CI #437 / run `33347983574`: PASS;
- Harness rc5 source-conformance #379 / run `33347983577`: PASS.

Acceptance audit:

```text
docs/acceptance/m4-021-acceptance-audit.md
```

### Accepted composition boundary

M4-021 composes accepted primitives rather than creating a second PDP algorithm:

```text
resolved M4-020 Subject
+ canonical M4-003 Resource
+ exact request capability
+ one immutable validated CapabilityPolicy snapshot
  -> exact Subject applicability
  -> exact capability applicability
  -> accepted M4-004 resource match / specificity / priority bands
  -> portable constraint boundary
  -> fully-applicable rules
  -> accepted M4-005 effect resolution
  -> accepted M4-006 default deny
  -> accepted M4-007 explanation
  -> detached M4-021 policy-evaluation fact
```

The accepted precedence remains unchanged:

```text
explicit deny
  > more-specific resource
  > higher explicit priority
  > ask
  > allow
  > default deny
```

### Subject selector semantics

`rules[].subjects` portable v0.1 grammar:

```text
<SubjectKind>://<SubjectId>
```

- exact standard SubjectKind;
- first literal `://` is structural;
- remainder is opaque Subject ID data;
- exact kind + exact ID matching only;
- omitted `subjects` means unconstrained Subject dimension;
- no trim/case-fold/Unicode normalization/alias/prefix/glob/regex/role/group/
  parent/descendant/session/Harness-name semantics;
- `*` is ordinary opaque ID data, not a wildcard;
- malformed selectors fail closed as `POLICY_SUBJECT_SELECTOR_INVALID`.

### Capability semantics and final acceptance hardening

Capability selection uses the existing CapabilityRequest lexical profile and
exact string equality. No wildcard/prefix/namespace inheritance or case folding
exists.

Final acceptance review found that a caller bypassing M4-002 could otherwise
supply a schema-invalid `rule.capabilities[]` string that became an ordinary
no-match. Accepted implementation head `21487cb...` corrects this by validating
all materialized rule capability selectors before request-dependent filtering.
Malformed capability selectors therefore fail closed as
`POLICY_EVALUATION_INPUT_INVALID`.

### Rule identity and constraint boundaries

- rule IDs are globally unique across the complete policy before request
  filtering;
- duplicate IDs preserve `RULE_ORDERING_DUPLICATE_RULE_ID`;
- omitted or empty rule `constraints` means zero predicates;
- non-empty constraints on a Subject+capability+Resource matching rule fail
  closed as `POLICY_CONSTRAINT_PROFILE_UNSUPPORTED`;
- irrelevant constrained rules are not traversed as global blockers;
- request constraints do not invent generic JSON equality/subset semantics.

### Runtime hardening

Accepted implementation rejects/fails closed on hostile runtime mechanics,
including accessors, inherited/symbol authority, sparse/named arrays, revoked
Proxies, unreadable descriptors and malformed capability selectors.

Successful output is detached and immutable; failure output is bounded and does
not echo attacker-controlled policy values or host exceptions.

### Explicit non-goals preserved

M4-021 does not:

- look up or consume leases;
- route approval;
- persist `CapabilityDecision` / stable `matchedRuleRefs`;
- assign guarantee levels;
- prove delegation attenuation;
- persist receipts/provenance;
- perform provider execution or PEP enforcement;
- use Harness identity/order as protocol semantics.

M4-022 lease lookup, M4-023 approval routing, M4-024 decision/receipt/provenance,
M4-025 guarantee assignment and M4-040+ PEP remain later Gates.

## Acceptance-record gate

The implementation is accepted, but M4-021 governance is **not closed yet**.

The current acceptance-record transition may change only:

- `packages/policy-engine/src/index.ts` package stage;
- this `docs/handoff/CURRENT.md` snapshot;
- the already-created acceptance audit is evidence, not production behavior.

Before final governance, the exact acceptance-record head MUST reach:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS.

No production evaluator behavior, Spec/corpus/schema/TCK, dependency/lockfile,
Harness baseline or M4-022+ behavior may change in that transition.

## Boundaries that remain enforced

- Specs/schemas/TCK remain semantic authority.
- Harness remains compatibility evidence only.
- Never weaken schema validation, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, source-conformance, or
  fail-closed behavior for CI.
- M4-021 must reuse M4-003/004/005/006/007/020 rather than duplicate semantics.
- Unknown/malformed semantic input fails closed; it must not silently no-match
  when doing so could create permission.
- No merge of PR #3 without explicit user authorization.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads and workflows;
2. verify the M4-021 acceptance-record delta contains only audit/stage/handoff
   evidence and no production behavior change;
3. require normal CI + pinned Harness rc5 source-conformance dual-green on the
   exact acceptance-record head;
4. only after that append M4-021 to `HISTORY.md`, mark only M4-021 accepted in
   `docs/roadmap.md`, and refresh this file for final governance;
5. do not authorize M4-022 until M4-021 final-governance exact head is dual-green;
6. do not merge PR #3 without explicit authorization.
