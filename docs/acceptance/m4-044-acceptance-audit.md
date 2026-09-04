# M4-044 Acceptance Audit — Approval Subsystem Uniqueness

Status: **IMPLEMENTATION / CONFORMANCE ACCEPTED — AUDIT EXACT-HEAD VERIFICATION PENDING**
Date: `2026-09-05`
Gate: `M4-044 P0 — no duplicate approval subsystem`

## 1. Authority and scope

This audit applies Spec 0048 (`specs/0048-m4-approval-subsystem-uniqueness.md`)
and the 24-case `M4-044_APPROVAL_SUBSYSTEM_UNIQUENESS_V1` corpus in
`fixtures/approval-subsystem-uniqueness/cases.json`. Spec 0034 / M4-023 retains
portable approval-routing authority; Spec 0046 / M4-042 retains Adapter native
ToolRuntime ASK ownership. Architecture sections 5-7 and the TCK approval
fail-closed boundary remain unchanged.

Harness is compatibility evidence only. Every upstream source claim below uses
`deepseek-ai/deepseek-harness@47f943859bef60e4160492346772ded9b24f765a`
(`0.1.0-rc.5`), not its default branch.

## 2. Protocol-first and reviewed implementation evidence

M4-043 governance head `6be76b80e5e462cd66c8743e1cf142b4e52b2d68` closed
before M4-044 work. M4-044 protocol-first head
`ff7bb64e9bf51c9687598476f52414dd0d964a39` passed:

- CI #609 / run `33883718218`;
- Harness #551 / run `33883718205`.

Reviewed conformance head:
`333ac1213c4e4b5f416b7c60497900fe2c2f7a9a`.

Its exact net delta from protocol-first is two added source-conformance files,
252 insertions and no deletions:

- `packages/adapter-dsh/source-conformance/m4-044-approval-subsystem-uniqueness.conformance.ts`;
- `packages/adapter-dsh/source-conformance/m4-044-corpus-coverage.conformance.ts`.

No production code, normative Spec/corpus, schema, dependency, lockfile, workflow,
roadmap or later-Gate implementation changed in that delta.

Exact reviewed-head verification:

- CI #613 / run `33930456673`: PASS;
- Harness #555 / run `33930456658`: PASS;
- Harness job `101207810230`, step 10 pinned-source typecheck: PASS;
- the same job, step 11 real rc5 runtime conformance: PASS.

## 3. Repository-wide ownership review

Search of production TypeScript approval invocations, their exports, package
manifests, test infrastructure and accepted conformance establishes these owners:

| Surface | Ownership and finding |
| --- | --- |
| Capability Broker `approval-routing.ts` | One supplied `ApprovalInvocationPort.request` invocation after validated ASK; allow/deny return before it. Outcomes return directly, with no retry, provider discovery or decision store. |
| Adapter `binding.ts::registerToolPolicy` | Projects ASK to a Harness pre-execute decision. It never calls the explicit Adapter approval method. |
| Adapter `binding.ts::requestApproval` | Resolves `ctx.get("approval")`, requires the existing live Agent when the service exists, calls that service once, and normalizes its result. No service returns UNAVAILABLE. |
| Pinned `packages/core/tools/src/index.ts::serviceAsk` | Resolves that same native service and calls `approval.request` once for an agent-backed reached ASK. Missing service/Agent fails closed. |
| Pinned `packages/interaction/user-approval/src/index.ts::request` | Owns a fresh ApprovalRequestId and the asked/decided session-log pair. |
| Adapter observation maps | `approvalCalls` and `observedApprovals` correlate already-observed native IDs to session/call facts and remove entries on decided events. They neither answer approval nor issue reusable grants or a second native request identity. |
| Decision receipt and Lease modules | Consume normalized approval/authorization facts for their already-accepted responsibilities. They do not invoke a second approval authority. |
| Testkit `fake-approval.ts` | Scripted deterministic testing state only. No production package imports or depends on it as an approval provider. |
| Package dependency direction | Capability Broker depends on policy-engine and protocol; Adapter depends on protocol and pinned Harness peers. Neither introduces the concrete other subsystem or testkit as a production approval owner. |

Approval-named types, correlation maps, receipt facts and test fakes are not
independent decision owners. The review found no repository production path
automatically composing explicit Adapter approval with native ToolRuntime ASK
for one action. No production correction is warranted.

## 4. Executable proof and corpus traceability

One M4-044 test uses the same Context, live registered Agent, real ToolRuntime
and real ApprovalService throughout. Before explicit invocation, native ASK
produces exactly one approval/request, one asked/decided pair with matching IDs,
one pre-execute entry and one tool-body execution. The later deliberate
requestApproval invocation increases the service request count to two and adds
one correlated pair with a distinct native ID, while both ToolRuntime entry
and body counts remain one. Exact call IDs distinguish these deliberately
separate invocations.

| Corpus IDs | Evidence |
| --- | --- |
| DAU-001–002 | Spec 0048 authority separation and duplicate-owner definition; ownership review above. |
| DAU-003–005 | M4-023 approval-routing corpus/tests and `approval-routing.ts`: allow/deny short-circuit, exactly one supplied port on ASK, terminal outcomes. |
| DAU-006 | Capability Broker production imports and package manifest. |
| DAU-007–011 | M4-044 same-execution request and audit-pair counts; pinned ToolRuntime serviceAsk; reused M4-042 native projection evidence. |
| DAU-012–013 | Adapter explicit service lookup and M4-044 deliberate second invocation without ToolRuntime entry. |
| DAU-014 | `approval.conformance.ts` absent-service case: UNAVAILABLE and no fabricated audit. |
| DAU-015 | M4-044 pair-ID equality and distinct per-request IDs; pinned ApprovalService identity generation; existing normalized-observation conformance. |
| DAU-016 | Spec 0048 section 9 and M4-023 opaque portable correlation; no equality inferred with native IDs. |
| DAU-017–018 | M4-023/M4-042 terminal outcome tests; reviewed production source has no fallback approval or remembered grant. |
| DAU-019–021 | Testkit/production dependency audit and invocation/state review above. |
| DAU-022 | Protocol-first dual-green prerequisite and production-free reviewed diff. |
| DAU-023 | Exact pinned source, feature matrix and unchanged workflow pin. |
| DAU-024 | Non-claims and Gate separation below. |

The corpus coverage suite checks profile, exact IDs and explicit evidence
classification. It is a traceability check, not runtime proof of every row;
repository/source/architecture claims require the review recorded here.

## 5. Remediation and verification limits

At `869151d25fb13536298127b2615a9e3504aaac9d`, Harness #552 failed step 10:
four TS2339 diagnostics at uniqueness-conformance lines 136-138. A helper
declared only `{ readonly type: string }`, discarding SessionEvent payload
typing. `a18d4467571379da605cdcd81a7a42e5993f2df4` removed that helper and
used direct session.events filtering, preserving the pinned discriminated union
and all assertions. CI #611 and Harness #553 then passed. Agent registration
was already present; no production liveness change was needed.

Further review corrected DAU-012 through DAU-023 evidence labels and added
same-request identity and no-second-pre-execute assertions. These changes
strengthen evidence without changing the normative corpus or weakening tests.

The local Windows full check encountered the existing duplicated-drive-path
error in verify-boundaries.mjs. It was not modified. Local corpus tests passed
4/4; the fixed Linux CI and pinned-source/runtime workflows above are the
acceptance evidence. No local full-suite success is claimed.

## 6. Non-claims and disposition

This Gate does not prove arbitrary external callers cannot deliberately invoke
both approval APIs for one business action; every host effect traverses
ToolRuntime; approval implies effect success; failure implies rollback;
provider/process/kernel isolation; complete system-wide tool enforcement;
durable exactly-once approval across processes; or raw audit-data secrecy.
M4-045 audit redaction, M4-050+ negative boundaries and M5 ledger work remain
outside this audit.

Implementation/conformance is accepted at the exact reviewed head above.
This audit commit must itself pass normal CI and pinned Harness validation
before the separate governance update. M4-045 remains locked until that
governance head is dual-green. PR #3 remains Open / Draft; merge is not authorized.
