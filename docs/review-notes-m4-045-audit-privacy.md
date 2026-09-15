# M4-045 Audit Privacy Boundary Review

Status: **EVIDENCE RECOVERY COMPLETE — NOT AN ACCEPTANCE AUDIT**
Date: `2026-09-05`
Reviewed baseline: `0c47080b509a762e22461eea0ab9a785bb19d30c`
Gate: `M4-045 P0 — no raw secret in audit`

This is a non-normative engineering review. It neither grants an audit-safe
classification to existing RuntimeEvent records nor changes protocol semantics.
M4-045 implementation and acceptance have not started.

## 1. Recovery and predecessor evidence

At recovery, PR #3 is Open / Draft / mergeable on feat/m4-capability-broker;
base remains main@57430273e065be8d38807d67b175fa154c801d43.
The exact reviewed closure head passes CI #616 / 33974251591 and Harness #558 /
33974251606. Harness job 101328043285 passes pinned-source typecheck step 10 and
real rc5 runtime step 11. Reviews and review threads are empty.

M4-044 governance is closed. This authorizes recovery of the M4-045 boundary,
not a claim that M4-043 final-result observation or M4-044 approval uniqueness
has already established raw-secret audit safety.

## 2. Existing authority

| Authority | Consequence for M4-045 |
| --- | --- |
| Core Spec 0001 sections 13 and 28 | Receipt persistence follows redaction. Default audit/evidence must not retain raw secrets, complete environment/prompt/source/stdout/stderr or credentials. |
| Spec 0002 section 6 | Digest domain must be explicit. A digest computed after redaction cannot be represented as a digest of the original unredacted payload. |
| EvidenceRetentionProfile schema | secrets, environment and rawPrompt are fixed false. Source/stdout/stderr opt-in cannot authorize secret retention. Schema conformance alone does not inspect arbitrary strings for secrets. |
| Spec 0035 section 16 | M4-024 constructs detached Decision/Receipt records; it does not implement persistence or satisfy later redaction requirements. |
| Spec 0047 sections 17 and 25 | M4-043 preserves exact final tools/result digest ownership, leaves its algorithm host-defined and does not authorize raw-result persistence. |
| Architecture sections 5-7 and 25 | Adapter normalization and audit privacy/persistence have different responsibilities. Privacy includes classification, redaction and digest/reference substitution before persistence. |
| TCK security acceptance section 3.12 | Receipt must not contain secrets; negative cases cannot be replaced by a field-name-only assertion. |
| Roadmap M4.5 / M5.2 | M4-045 owns the integration privacy boundary. M5 separately owns secret detector interface, env redaction, digest defaults, source opt-in and retention; M4 must not quietly implement the ledger or a general detector. |

These statements are compatible: reading exact source facts for classification
or hashing does not authorize retaining them. Runtime compatibility evidence is
not portable privacy authority.

## 3. Data-flow inventory at the reviewed baseline

| Entry or exit | Actual behavior | Privacy implication |
| --- | --- | --- |
| binding.ts::toolPolicyRequest | Passes exec.arguments to the in-process policy/guard handler. | Enforcement input is a privileged raw-data channel, not audit output. Redacting it would change policy meaning. |
| normalize.ts::normalizeDurableEvent(tool/call) | Calls host Digest with the exact raw arguments string; emits names/refs plus argumentsDigest, not an arguments field. | Structural minimization holds. Digest callback and string metadata still require a privacy contract. |
| binding.ts tools/result observer | Passes the exact final result to host Digest; emits a normalized completion. | Preserve final-result authority; do not substitute a redacted candidate under the same resultDigest meaning. |
| normalize.ts::normalizeFinalToolResult | Copies execution identifiers/name and, if supplied on its supported snapshot, error.info.code. | Opaque strings and extension error codes are not inherently non-secret. Helper support does not prove current rc5 produces this shape. |
| binding.ts approval observation | Emits native ID/call correlation and a closed portable outcome. Omits approval reason and tool payload. | A useful minimization property; it does not sanitize arbitrary caller-selected identifiers. |
| binding.ts agent/request-error | Digests the complete failure and passes failure.code as failureClass. | Raw failure contents remain available to the digest callback; code provenance needs review rather than a universal safe-string assumption. |
| RuntimeEventSink / dispatcher.ts | Delivers RuntimeEvent records in order to the supplied in-process consumer. | This interface is not an implemented privacy gate, retention policy or durable ledger. |
| onObservationFailure | Receives an event and/or arbitrary thrown error, depending on the failure path. | A privileged diagnostic callback, not safe default audit data. Raw errors must not be copied into default persistence. |
| sidecar.ts::createSidecarEvidenceRecord | Allowlists correlation fields and the supplied evidence digest, omitting processLocalTokenRef. | Structural token exclusion is established; opaque refs and supplied digest remain caller-owned privacy inputs. |
| capability-broker decision-receipt.ts | Builds frozen records with caller-provided bounded identifiers. | Length/type validation is not secret detection. Construction success does not authorize persistence. |

Production searches identify no implemented default audit store or detector in
the current tree. There is therefore no evidence of an existing durable leak
to repair, and no basis for claiming privacy enforcement is already complete.

## 4. Reproducible local boundary probes

Four assertions executed against the unchanged normalization helpers at the
reviewed baseline. Only a synthetic sentinel
`M4_045_SYNTHETIC_SECRET_CANARY` was used; no user secrets were read.

| Probe | Setup | Observed result |
| --- | --- | --- |
| P45-001 | Safe session/call/tool identifiers; canary in raw arguments; SHA-256 test digest over JSON.stringify(input). | Serialized normalized output omits the canary. |
| P45-002 | Same input; host Digest deliberately returns the canary. | argumentsDigest contains it unchanged. |
| P45-003 | Cryptographic test digest; canary in sessionRef/toolName. | Serialized normalized output contains it through metadata. |
| P45-004 | normalizeFinalToolResult supported snapshot carries canary at error.info.code. | errorCode contains it unchanged. |

Minimal reproduction uses these existing exports from
`packages/adapter-dsh/src/normalize.ts`:

```ts
const event = normalizeDurableEvent("safe-session", {
  type: "tool/call", seq: 1, time: 0,
  data: {
    turn: 1, step: 1, callId: "safe-call", name: "safe-tool",
    arguments: JSON.stringify({ token: syntheticCanary }),
  },
}, () => syntheticCanary);
// event.type === "tool.requested"; argumentsDigest is syntheticCanary.
```

The temporary probe is `.tmp/m4-045-boundary-probe.ts`; it is a local investigation
artifact, not a new TCK or product file. Four assertions pass. The SHA-256 test
callback is a probe instrument, not a proposed production canonicalization
profile or a claim of RFC 8785 conformance.

These are helper-level boundary demonstrations, not new real Harness runtime
claims, not evidence of a leaked real credential, and not sufficient Gate
acceptance. A malicious/incorrect privileged callback is not a sandbox breach.

## 5. Exact pinned-source cross-check

Compatibility source is fixed to deepseek-ai/deepseek-harness
`47f943859bef60e4160492346772ded9b24f765a` (`0.1.0-rc.5`).

- `packages/core/session/src/types.ts` defines tool/call arguments as a raw
  string alongside tool name and call ID.
- `packages/interaction/user-approval/src/index.ts::request` records native
  approval/asked with toolName and optional callId/reason before recording
  approval/decided with the same generated ID.
- Thus raw Harness session history is a separate privileged source. Adapter
  omission of approval reason does not retroactively redact that native log.

M4-045 must not relabel upstream session storage as privacy-safe, modify upstream
behavior, or claim control over arbitrary host plugins and their own logging.

## 6. Requirements to resolve in the protocol-first contract

The next bounded deliverable is a Spec 0049 candidate plus a requirement corpus.
Before implementation, that contract must make the following decisions explicit:

1. Name the safe-runtime-owned audit/evidence egress and its admission point.
   Keep ordinary in-process RuntimeEvent observation distinct from default
   persistence; do not silently change accepted policy, replay or correlation APIs.
2. Define treatment and provenance for every free-form string, including refs,
   tool names, error codes, digest results and failure diagnostics. Neither
   field names, a bounded string nor a digest-shaped regex proves privacy.
3. Define trusted digest ownership and documented domains for arguments, exact
   final results, failure facts and any substituted metadata. Do not hash an
   already-computed digest and relabel it as the original resultDigest.
4. Choose an explicit fail-closed behavior when safe audit representation cannot
   be established. Do not serialize raw fallback values, invoke generic
   toString/JSON on hostile diagnostics, or silently claim successful recording.
5. Specify whether and how metadata is admitted, omitted or replaced by safe
   references. Any substitution must preserve required correlation semantics
   and avoid hidden API/Schema changes.
6. Cover live, replay/sidecar, Decision/Receipt construction and diagnostics
   separately. Distinguish structural minimization, trusted-host premises and
   executable guarantees in the evidence matrix.
7. Keep detector engines, broad pattern libraries, storage, retention TTL,
   export/delete, encryption, spool and ledger recovery in their owning M5 Gates.

A runtime test using a proper digest and harmless metadata can prove a bounded
positive path. It cannot by itself justify the general no-raw-secret claim.
Host configuration premises must be explicit and enforced at the owned audit
boundary where required; they cannot be hidden as test-only assumptions.

## 7. Next verification and non-claims

Publish this review and refreshed handoff with no production/Spec/schema/TCK,
dependency, workflow or roadmap acceptance changes. Verify that exact head with
normal CI and pinned Harness before using it as the protocol-first design baseline.

M4-045 remains unaccepted. M4-050+, M5 implementation and PR #3 merge remain
unauthorized. No privacy guarantee, generic secret detection, audit persistence,
new approval owner, system-wide mediation or isolation is claimed by this review.
