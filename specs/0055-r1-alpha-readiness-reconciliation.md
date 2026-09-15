# Spec 0055 — R1 Alpha Readiness Reconciliation

Status: **DRAFT NORMATIVE SPECIFICATION — PROTOCOL-FIRST / NOT ACCEPTED**  
Milestone: `R1 — DeepSeek Harness Plugin Alpha Release`  
Gate: `R1-001 P0 — Alpha readiness reconciliation`  
Profile: `R1-001_ALPHA_READINESS_RECONCILIATION_V1`

## 1. Purpose

R1-001 reconciles the repository's current, accepted evidence against the
requirements for starting the DeepSeek Harness Plugin Alpha productization track.
It exists because several early roadmap checkboxes predate later exact-head
acceptance evidence and because a publishable plugin has additional packaging and
release obligations that are not represented by M0-M4 implementation status
alone.

R1-001 is an **evidence and readiness Gate**. It is not a plugin implementation,
package-publication, release-automation, or registry-publish Gate.

The Gate MUST answer two separate questions:

1. may engineering proceed to `R1-002 P0 — freeze public DeepSeek Adapter API`?
2. what requirements still block the eventual R1-008 Alpha release?

Those questions MUST NOT be collapsed into one `ready/not-ready` boolean.

## 2. Authority

Authority order remains:

```text
GitHub live exact-head state
> normative Specs / architecture / compatibility contracts
> Schema / Shared TCK
> accepted acceptance audits and exact-head Gate evidence
> CURRENT
> HISTORY
> roadmap planning text / PR body / chat
```

The supported Harness baseline for this reconciliation is:

```text
DeepSeek Harness 0.1.0-rc.5
commit 47f943859bef60e4160492346772ded9b24f765a
```

The immediate predecessor is the M5-002 closure record:

```text
c171e69af7b775d4dccf041df4a15ecf04ffab60
```

R1-001 repository work is authorized only because that exact head passed normal
CI and pinned Harness source/runtime conformance.

## 3. Non-goals

R1-001 MUST NOT:

- export or redesign the public Adapter API;
- add plugin/bootstrap integration;
- change `private`, `exports`, `files`, package version, package name or registry
  metadata;
- add `pnpm pack` consumer logic to product workflows;
- create npm credentials, publish tokens, registry configuration or GitHub
  Releases;
- create a second approval/policy/runtime subsystem;
- claim arbitrary in-process plugin isolation;
- implement M5-003+;
- mark historical roadmap checkboxes complete merely because newer evidence
  appears related;
- merge PR #3.

Those concerns remain owned by R1-002+ or later milestones.

## 4. Classification vocabulary

Every readiness item MUST receive exactly one primary classification.

### `EVIDENCE_SATISFIED`

Current accepted exact-head evidence directly proves the requirement, and no
materially conflicting live state was found.

### `STATUS_DRIFT`

The roadmap/checklist text is stale or incomplete, but accepted exact-head
evidence directly proves the underlying requirement. The reconciliation record
MUST cite the newer evidence and MUST NOT rewrite history to pretend the older
checkbox was already correct.

### `R1_TRACK_BLOCKER`

Evidence or behavior required before R1-002 is missing or contradictory. Any
`R1_TRACK_BLOCKER` makes the R1-001 verdict `BLOCKED`.

### `ALPHA_RELEASE_BLOCKER`

The item does not block starting R1-002 because a later R1 Gate explicitly owns
it, but the item MUST be cleared before R1-008 can accept a release.

### `ACCEPTED_DEFERRED`

The item is intentionally outside Alpha requirements, with a named later owner or
priority. A deferred item MUST NOT be silently represented as implemented.

### `BASELINE_NOT_APPLICABLE`

The exact supported Harness baseline does not expose the relevant public seam, so
the requirement cannot be exercised through the supported Adapter contract.
This classification is allowed only when all of the following hold:

- exact-source compatibility evidence proves the seam is absent;
- the Adapter public contract does not expose an equivalent mutation path;
- the release compatibility/known-limitations contract will explicitly state the
  constraint;
- a future supported baseline exposing the seam automatically reopens the item;
- the classification does not convert an ungoverned host API into a security
  guarantee.

If any condition is missing, the item is a blocker instead.

## 5. Verdicts

R1-001 has two outputs.

### Track-entry verdict

```text
R1_002_AUTHORIZED
BLOCKED
```

`R1_002_AUTHORIZED` requires zero `R1_TRACK_BLOCKER` items.

### Alpha-release readiness

```text
ALPHA_RELEASE_NOT_READY
ALPHA_RELEASE_READY_FOR_R1_008_AUDIT
```

R1-001 is expected to produce `ALPHA_RELEASE_NOT_READY` because R1-002..007 own
public API, packaging, external-consumer, compatibility and release-pipeline work.
R1-001 MUST NOT treat that expected result as a failure of the track-entry Gate.

## 6. M0 reconciliation

R1-001 MUST distinguish the following facts.

### 6.1 Repository and lockfile

The historical M0-001 text says fresh-clone work is waiting for a networked
lockfile bootstrap. Current CI already performs on a fresh GitHub runner:

```text
actions/checkout
pnpm install --frozen-lockfile
pnpm check:all
```

That wording is therefore stale with respect to lockfile/frozen-install
availability.

### 6.2 Fresh-clone build proof

M0 DoD specifically says `Repo fresh clone build green`. The ordinary CI job does
not currently run the root `pnpm build` command. R1-001 MUST obtain new,
exact-head, clean-checkout evidence that at least:

```text
pnpm install --frozen-lockfile
pnpm build
pnpm check:all
```

passes from the R1-001 evidence head.

This proof MAY be produced by a temporary evidence-only workflow/branch that does
not enter product history. The result MUST be recorded rather than backfilled as
historical M0 evidence.

### 6.3 Release-note mechanism

`M0-005 P1` changeset/release-note work is not an M20 Alpha P0 prerequisite. It is
not allowed to disappear, however: R1-007 owns the final release mechanism and
this item remains an Alpha-release requirement through that later Gate.

## 7. M1 reconciliation

All listed M1 P0 protocol/schema items are currently marked implemented, but the
M1 DoD `Spec Review 完成` remains unchecked and no dedicated M1 acceptance audit
has been established as authority.

R1-001 MUST perform a **prospective current-state review**, not retroactive
historical backfill. The review MUST at minimum verify:

- the current core capability/precedence Specs remain internally coherent for the
  M0-M4 Alpha surface;
- current Schemas/fixtures remain the protocol authority rather than TypeScript
  implementation details;
- default-deny, approval fail-closed, delegation attenuation and guarantee-level
  semantics used by M4 do not contradict M1 authority;
- later M4/M5 Specs narrow or implement the core contract rather than silently
  redefining it;
- protocol remains implementable without DeepSeek Harness concrete types.

Any material contradiction is an `R1_TRACK_BLOCKER`. Absence of a historical M1
review record is not itself grounds to fake an old acceptance date; the new
R1-001 review evidence is prospective Alpha-readiness evidence.

## 8. M2 / M3 reconciliation

R1-001 MUST verify accepted evidence for:

- exact source-pinned DeepSeek Harness baseline reconnaissance and Adapter ports;
- fail-explicit unsupported features;
- core independence from Harness concrete event types;
- Shared Adapter TCK;
- packed Shared TCK external non-workspace consumer;
- final exact rc5 source/runtime conformance.

Accepted P1 deferrals that are not M20 Alpha requirements remain
`ACCEPTED_DEFERRED` and MUST stay visibly deferred.

## 9. M4 DoD reconciliation

The seven legacy M4 DoD rows MUST be reconciled individually.

### 9.1 Default deny

Accepted M4-006 evidence may satisfy the underlying requirement. The unchecked
DoD row remains historical status drift unless current evidence contradicts it.

### 9.2 Approval unavailable

Accepted approval-routing evidence MUST prove `UNAVAILABLE` cannot authorize an
action and that provider failure fails closed.

### 9.3 Lease expiry and maxUse

Accepted M4-030/M4-031 evidence MUST prove expiration and exhausted-use behavior.

### 9.4 Child cannot amplify

Accepted M4-034 evidence MUST prove parent-child attenuation and ancestor
restrictions.

### 9.5 Action rewrite after decision

Core/TCK authority requires policy-relevant post-decision rewrites to be
re-evaluated or rejected. The exact rc5 compatibility contract states that the
supported pre-tool policy seam deliberately exposes no argument-rewrite API.

R1-001 MUST NOT mark this as ordinary `EVIDENCE_SATISFIED` unless an accepted Gate
actually proves rewrite handling. It MAY classify the item
`BASELINE_NOT_APPLICABLE` for rc5 only after reconciling exact-source evidence and
the Adapter contract. That classification MUST become a release compatibility
constraint and MUST reopen when a future supported Harness baseline adds such a
rewrite seam.

Direct host/plugin mutation outside the supported seam remains governed by the
M4-050/M4-052 non-sandbox boundary and cannot be used to claim rewrite safety.

### 9.6 Audit redaction

Accepted M4-045 evidence may satisfy the owned Adapter audit-egress profile, but
R1-001 MUST preserve its limitation: it does not label arbitrary native Harness
history or all logs as audit-safe.

### 9.7 Honest security boundary

M4-050, M4-051 and M4-052 must remain visible negative/non-claim evidence. R1-001
MUST reject any readiness conclusion that upgrades `tool-enforced` to
`process-isolated` or describes v0.1 as an arbitrary plugin sandbox.

## 10. M20 Alpha reconciliation

The four M20 Alpha requirements are:

```text
M0-M4 key P0
Adapter TCK
Capability Broker boundary honest
no silent allow
```

R1-001 MUST produce an explicit roll-up for each row rather than treating the M20
checkbox itself as evidence.

`no silent allow` requires positive fail-closed evidence from policy/default-deny,
unknown classification, approval failure and reached ToolRuntime guard boundaries,
plus retention of the known ungoverned host-plugin boundary as an explicit
non-claim rather than a false deny.

## 11. Adapter publishability inventory

R1-001 MUST record, but MUST NOT implement, current productization gaps. At
minimum inspect:

- `packages/adapter-dsh/package.json`;
- public `src/index.ts`;
- the existing real rc5 binding entrypoint;
- build/package output metadata;
- external consumer coverage;
- compatibility documentation;
- release automation.

Known observed gaps MUST be classified as `ALPHA_RELEASE_BLOCKER` with their
owning later Gate rather than as R1-001 failures when the roadmap already assigns
that work to R1-002..007.

Examples include package `private: true`, missing public binding export,
publishable `exports/files/types` metadata, external tarball smoke and release
pipeline/provenance.

## 12. Evidence integrity

A readiness statement MUST name the evidence source and distinguish:

```text
historical roadmap status
accepted exact-head implementation/audit evidence
live repository state
new R1-001 prospective evidence
```

The audit MUST NOT infer success merely because a later component depends on an
earlier one.

If raw historical logs are unavailable, only verified run/job/step status may be
recorded; diagnostic text MUST NOT be invented.

## 13. Portable profile

Portable requirement corpus:

```text
fixtures/alpha-readiness-reconciliation/cases.json
profile: R1-001_ALPHA_READINESS_RECONCILIATION_V1
cases: ARR-001..ARR-034
```

The corpus is a requirement/evidence matrix during protocol-first. The R1-001
readiness audit after protocol dual-green MUST resolve every case with one primary
classification and evidence/owner metadata.

## 14. Protocol-first change boundary

This protocol-first candidate is restricted to exactly:

```text
specs/0055-r1-alpha-readiness-reconciliation.md
fixtures/alpha-readiness-reconciliation/cases.json
docs/handoff/CURRENT.md
```

It MUST NOT modify:

```text
docs/roadmap.md
docs/handoff/HISTORY.md
packages/** production or tests
package.json / pnpm-lock.yaml
Schema / Shared TCK
Harness compatibility baseline
workflow files
release credentials / registry state
R1-002+ implementation
M5-003+
```

Only after this exact head passes normal CI and exact pinned Harness rc5
source/runtime conformance may R1-001 evidence collection and readiness-audit
work begin.

## 15. R1-001 acceptance rule

R1-001 may authorize R1-002 only when all of the following are true:

- this protocol-first exact head is dual-green;
- fresh-clean-checkout `install + build + check:all` evidence is green;
- a prospective current-state M1 Spec Review finds no Alpha-blocking contradiction;
- M2/M3 accepted Adapter/TCK evidence remains valid;
- every legacy M4 DoD row receives an explicit evidence-backed classification;
- every M20 Alpha row receives an explicit evidence-backed roll-up;
- `BASELINE_NOT_APPLICABLE` is used only with exact supported-baseline proof and
  an explicit future-reopen rule;
- publishability gaps are inventoried and assigned to R1-002..007 rather than
  hidden;
- the audit concludes with zero `R1_TRACK_BLOCKER` items;
- normal CI and pinned Harness source/runtime conformance are green on the final
  reviewed readiness-audit head.

R1-001 acceptance does **not** mean the Alpha package is release-ready. It only
means the repository may proceed to R1-002 under the documented outstanding
Alpha-release blockers.

R1-002+, M5-003+, npm/registry publish, GitHub Release and PR #3 merge remain
unauthorized until their own governance/explicit-authorization requirements are
met.
