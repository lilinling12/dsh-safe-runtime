# R1-001 Alpha Readiness Reconciliation

Status: **READINESS AUDIT CANDIDATE — EXACT-HEAD VERIFICATION REQUIRED**  
Milestone: `R1 — DeepSeek Harness Plugin Alpha Release`  
Gate: `R1-001 P0 — Alpha readiness reconciliation`  
Profile: `R1-001_ALPHA_READINESS_RECONCILIATION_V1`  
Pinned Harness: `0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a`

## 1. Scope and authority

This audit applies Spec 0055 and ARR-001..ARR-034. It is prospective readiness
evidence. It does not backdate historical M0/M1/M4/M20 checklist state and does
not implement R1-002+, M5-003+, package publication, a GitHub Release, or PR #3
merge.

Authority remains:

```text
GitHub live exact-head state
> normative Specs / architecture / compatibility contracts
> Schema / Shared TCK
> accepted exact-head audits
> CURRENT / HISTORY / roadmap
```

DeepSeek Harness is source-conformance/compatibility evidence only. It does not
redefine portable protocol semantics.

## 2. Live state reconciled before audit

At evidence collection start:

```text
PR #3: Open / Draft / unmerged
branch: feat/m4-capability-broker
head: 47738763c9ad321e41d2af77c7c3ca7a923421fd
base: main@57430273e065be8d38807d67b175fa154c801d43
main: 57430273e065be8d38807d67b175fa154c801d43
reviews: none
review threads: none
base drift: none
```

Exact-head verification on `47738763...`:

```text
CI #664 / run 34324935903: PASS
Harness #606 / run 34324935815: PASS
Harness job 102379908112 step 10 exact pinned-source typecheck: PASS
Harness job 102379908112 step 11 real rc5 runtime conformance: PASS
```

The original protocol-first commit was
`30e897888c1ea28a5082e2bdd9d36d3d2e2530ec`. Its exact delta from M5-002 closure
`c171e69af7b775d4dccf041df4a15ecf04ffab60` contains only:

```text
specs/0055-r1-alpha-readiness-reconciliation.md
fixtures/alpha-readiness-reconciliation/cases.json
docs/handoff/CURRENT.md
```

and that exact protocol-first commit independently passed:

```text
CI #663 / run 34323540954: PASS
Harness #605 / run 34323540944: PASS
```

The later `47738763...` testkit idempotence remediation therefore occurred after
protocol-first dual-green and did not precede protocol authority.

## 3. Prospective clean-checkout evidence

Spec 0055 permits an evidence-only workflow/branch that does not enter product
history. An evidence branch rooted at exact product head `47738763...` ran a
workflow whose checkout step explicitly selected that SHA.

Evidence:

```text
evidence branch: evidence/r1-001-clean-checkout-47738763
workflow commit: 99a9ca93a1475e150ae4f8ef8037354d0768e402
run: 34328489680
job: 102391245741
checkout ref: 47738763c9ad321e41d2af77c7c3ca7a923421fd
pnpm install --frozen-lockfile: PASS
pnpm build: PASS
pnpm check:all: PASS
job conclusion: SUCCESS
```

The evidence-only workflow is not part of PR #3 product history and does not
change the evaluated product tree.

This prospectively satisfies the literal M0 fresh-clone build requirement. The
old roadmap wording that still waits for a network lockfile bootstrap is status
drift, not current repository fact.

## 4. Prospective M1 current-state Spec Review

The historical M1 DoD checkbox `Spec Review 完成` remains unchecked. This audit
does not rewrite that history. It performs the review required by Spec 0055 now.

Reviewed current authority includes Spec 0001 and Spec 0002, current
Schema/fixture checks exercised by `pnpm check:all`, accepted M2/M3 authority,
and the M4 acceptance chain.

Findings:

1. **Runtime independence remains intact.** Spec 0001 defines a runtime-independent
   protocol and explicitly treats DeepSeek Harness as the first Adapter rather
   than protocol authority. Core semantics do not require Harness concrete types.
2. **Policy precedence remains coherent.** Canonicalization, malformed-request
   rejection, explicit deny precedence, resource specificity, priority,
   `ASK > ALLOW`, and default-deny semantics in Spec 0002 are compatible with the
   accepted M4 policy-engine gates.
3. **Approval remains fail closed.** Spec 0001 requires only explicit one-shot
   allow to authorize; rejected/cancelled/unavailable/timeout deny. Accepted
   M4 approval-routing and native ASK evidence preserve that authority and do not
   add a second decision owner.
4. **Delegation remains attenuating.** Spec 0001/0002 prohibit child amplification;
   accepted M4-034 proves the parent-to-child restrictions rather than redefining
   them.
5. **Guarantee reporting remains weakest-boundary honest.** Accepted M4 guarantee
   evidence and M4-050..052 negative boundaries do not upgrade tool-mediated
   control to process isolation.
6. **Post-decision rewrite semantics remain normative.** Spec 0001/0002 require a
   policy-relevant rewrite to be re-evaluated or rejected. The current rc5 public
   pre-tool policy seam exposes no rewrite operation, so the requirement is not
   declared implemented by Harness behavior; it is handled under the bounded
   `BASELINE_NOT_APPLICABLE` classification below.
7. **Schema/fixture authority remains above TypeScript projections.** Current
   verification continues to validate protocol assets independently of Adapter
   implementation details.

No material M1-vs-M4 Alpha contradiction was found. The prospective review is
therefore evidence for current R1 track entry, not retroactive evidence that the
old M1 review checkbox had previously been completed.

## 5. M2 / M3 reconciliation

M2 remains accepted against exact Harness rc5 source
`47f943859bef60e4160492346772ded9b24f765a`. Its accepted evidence includes
runtime-independent Adapter ports, explicit unsupported-feature failure, exact
source-pinned type/runtime conformance, and the rule that Harness does not become
protocol authority.

M3 remains accepted with a language-independent Shared TCK, independently
packable `@dsh-safe/testkit`, and a real external non-workspace consumer of the
packed artifacts. The accepted M3 remediation head is
`e6522a18760268b56b09f9ac5d9c822671c41666` with CI #218 and exact Harness #177
both passing.

Current exact-head Harness #606 revalidates the pinned type surface and real rc5
runtime after all later accepted work.

## 6. M4 legacy DoD reconciliation

The legacy M4 DoD checklist remains historically unchecked even though its owned
requirements now have accepted exact-head evidence. Those rows are classified as
`STATUS_DRIFT` rather than rewritten as historically complete.

- **Default deny** — M4-006 accepted evidence proves no-match/missing-default and
  hostile input fail closed.
- **Approval unavailable** — M4-023/M4-042/M4-044 evidence proves only explicit
  authorization grants and missing provider/Agent or provider failure cannot
  silently authorize.
- **Lease expiry / maxUse** — M4-030 and M4-031 prove expiry and exhausted-use
  invalidation; M4-034 preserves ancestor restrictions for delegated leases.
- **Child cannot amplify** — M4-034 proves attenuation across capability,
  resource, constraints, time, usage and ancestor state.
- **Action rewrite** — exact rc5 compatibility evidence states the supported
  pre-tool policy seam deliberately exposes no argument-rewrite API, and the
  Adapter policy contract exposes no equivalent rewrite operation. This row is
  `BASELINE_NOT_APPLICABLE` for rc5 only. R1-006 must publish the limitation and
  the rule that any future supported Harness baseline exposing a policy-relevant
  rewrite seam automatically reopens conformance. Same-process host/plugin APIs
  remain ungoverned where they bypass supported mediation; this classification is
  not a security guarantee.
- **Audit redaction** — M4-045 proves a bounded Adapter-owned audit-admission
  egress with closed output and owned digests. It does not establish arbitrary
  native Harness history/log redaction or make ordinary RuntimeEvent persistence
  safe.
- **Honest security boundary** — M4-050..052 preserve the direct-host bypass and
  non-sandbox boundary. v0.1 is not an arbitrary in-process plugin sandbox.

## 7. M20 Alpha roll-up

The M20 Alpha checkboxes are still unchecked planning state. Direct accepted
evidence supports the underlying requirements, so the checklist itself is
`STATUS_DRIFT` rather than authority.

- **M0-M4 key P0** — current clean-checkout evidence plus accepted M1/M2/M3/M4
  authority establishes the Alpha prerequisite at the currently claimed scope.
- **Adapter TCK** — accepted M3 Shared TCK plus current exact rc5 conformance.
- **Capability Broker boundary honest** — guarantee-level evidence plus
  M4-050..052 explicitly retain ungoverned same-process paths and non-sandbox
  claims.
- **no silent allow** — accepted default-deny, unknown/malformed classification,
  approval fail-closed, and reached ToolRuntime guard evidence provide positive
  fail-closed proof. Direct host/plugin bypasses are represented as explicit
  non-claims, not silently relabeled as denied.

## 8. Adapter publishability inventory

Current `packages/adapter-dsh/package.json` remains `private: true`; publishable
`exports`, `types`, `files` and release metadata are not complete. Current public
`src/index.ts` does not export the real rc5 binding factory. These are expected
Alpha-release blockers, not R1-001 track-entry failures:

```text
R1-002: freeze/export the public Adapter API
R1-004: publishable package metadata/content boundary
R1-005: external tarball consumer + real Harness smoke
R1-006: compatibility/install/known-limitations contract
R1-007: changeset/changelog/reproducible pack/provenance/release pipeline
```

No package metadata, public export, bootstrap integration, registry credential,
release automation or publish operation is changed by R1-001.

## 9. ARR-001..034 disposition

| ID | Classification | Evidence / owner |
| --- | --- | --- |
| ARR-001 | EVIDENCE_SATISFIED | M5-002 closure `c171e69...` exact-head dual-green. |
| ARR-002 | EVIDENCE_SATISFIED | Live PR #3 Open/Draft/unmerged; merge unauthorized. |
| ARR-003 | STATUS_DRIFT | Frozen lockfile works in current CI and clean-checkout evidence; roadmap wording is stale. |
| ARR-004 | EVIDENCE_SATISFIED | Evidence run `34328489680`, job `102391245741`, exact checkout `47738763...`: install/build/check all PASS. |
| ARR-005 | EVIDENCE_SATISFIED | Current `check:all` and accepted architecture boundary evidence remain green. |
| ARR-006 | ALPHA_RELEASE_BLOCKER | Release-note/changeset mechanism remains outstanding; owner R1-007. |
| ARR-007 | EVIDENCE_SATISFIED | M1 P0 protocol/schema assets remain current authority and verification is green. |
| ARR-008 | STATUS_DRIFT | Historical M1 review checkbox remains unchecked; section 4 is prospective current-state review only. |
| ARR-009 | EVIDENCE_SATISFIED | Prospective review finds no material capability/precedence contradiction with accepted M4. |
| ARR-010 | EVIDENCE_SATISFIED | Protocol remains runtime independent; Harness concrete types stay Adapter-side. |
| ARR-011 | EVIDENCE_SATISFIED | Accepted M2 plus current Harness #606 exact pinned source/runtime PASS. |
| ARR-012 | EVIDENCE_SATISFIED | Accepted M3 Shared TCK and external packed non-workspace consumer evidence. |
| ARR-013 | STATUS_DRIFT | Legacy DoD unchecked; M4-006 accepted default-deny evidence directly satisfies requirement. |
| ARR-014 | STATUS_DRIFT | Legacy DoD unchecked; approval-routing/native ASK/uniqueness evidence is fail closed. |
| ARR-015 | STATUS_DRIFT | Legacy DoD unchecked; M4-030 accepted TTL evidence. |
| ARR-016 | STATUS_DRIFT | Legacy DoD unchecked; M4-031 accepted maxUse evidence. |
| ARR-017 | STATUS_DRIFT | Legacy DoD unchecked; M4-034 accepted attenuation evidence. |
| ARR-018 | BASELINE_NOT_APPLICABLE | Exact rc5 exposes no policy rewrite API; Adapter exposes no equivalent. R1-006 must document limitation and future-baseline reopen rule. |
| ARR-019 | STATUS_DRIFT | Legacy DoD unchecked; M4-045 satisfies bounded Adapter audit-redaction ownership only. |
| ARR-020 | STATUS_DRIFT | Legacy DoD unchecked; M4-050..052 preserve explicit non-sandbox/unguarded-host boundaries. |
| ARR-021 | STATUS_DRIFT | M20 checkbox unchecked; direct current/accepted M0-M4 evidence supports the Alpha prerequisite. |
| ARR-022 | STATUS_DRIFT | M20 checkbox unchecked; accepted M3 TCK + exact rc5 conformance supports requirement. |
| ARR-023 | STATUS_DRIFT | M20 checkbox unchecked; M4 negative-boundary/non-sandbox evidence supports honest boundary. |
| ARR-024 | STATUS_DRIFT | M20 checkbox unchecked; fail-closed policy/classifier/approval/guard evidence plus explicit bypass non-claims support requirement. |
| ARR-025 | ALPHA_RELEASE_BLOCKER | `adapter-dsh` remains `private: true`; owner R1-004. |
| ARR-026 | ALPHA_RELEASE_BLOCKER | Real rc5 binding factory is not exported from public `src/index.ts`; owner R1-002. |
| ARR-027 | ALPHA_RELEASE_BLOCKER | Publishable exports/types/files/build/package metadata incomplete; owner R1-004. |
| ARR-028 | ALPHA_RELEASE_BLOCKER | Release tarball external-consumer + real Harness smoke remains R1-005. |
| ARR-029 | ALPHA_RELEASE_BLOCKER | Release compatibility/install/known-limitations matrix remains R1-006. |
| ARR-030 | ALPHA_RELEASE_BLOCKER | Changeset/changelog/reproducible pack/provenance/release pipeline remains R1-007. |
| ARR-031 | EVIDENCE_SATISFIED | Audit preserves tool/provider/process distinction and arbitrary-plugin non-sandbox claim. |
| ARR-032 | EVIDENCE_SATISFIED | No R1-002+, M5-003+, registry publish, GitHub Release or PR merge performed in product branch. |
| ARR-033 | EVIDENCE_SATISFIED | Zero R1_TRACK_BLOCKER items; later-R1 release blockers remain explicit and owned. |
| ARR-034 | EVIDENCE_SATISFIED | Original `30e897...` protocol-first commit changed only Spec 0055, ARR corpus and CURRENT and was exact-head dual-green before evidence work. |

Classification totals:

```text
EVIDENCE_SATISFIED: 13
STATUS_DRIFT: 13
R1_TRACK_BLOCKER: 0
ALPHA_RELEASE_BLOCKER: 7
ACCEPTED_DEFERRED: 0
BASELINE_NOT_APPLICABLE: 1
```

## 10. Verdict

Track-entry verdict:

```text
R1_002_AUTHORIZED
```

Reason: all ARR requirements are resolved and there are zero
`R1_TRACK_BLOCKER` items.

Alpha-release readiness:

```text
ALPHA_RELEASE_NOT_READY
```

Reason: R1-002, R1-004, R1-005, R1-006 and R1-007 still own explicit product,
package, external-consumer, compatibility and release-engineering blockers. R1-003
also remains a required later Alpha integration Gate even though no ARR row is a
standalone inventory item for it.

This verdict does not authorize registry publication, GitHub Release, M5-003+ or
PR #3 merge. R1-002 may begin only after this audit/current-state head passes
normal CI and exact pinned Harness source/runtime conformance and the separate
R1-001 governance transition records that exact evidence.
