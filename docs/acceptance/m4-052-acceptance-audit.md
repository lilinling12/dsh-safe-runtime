# M4-052 Acceptance Audit — v0.1 Plugin-Sandbox Documentation Boundary

Status: **IMPLEMENTATION / CONFORMANCE ACCEPTED — AUDIT EXACT-HEAD VERIFICATION PENDING**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-052 P0 — document that v0.1 is not plugin sandbox`  
Profile: `M4-052_PLUGIN_SANDBOX_DOCUMENTATION_BOUNDARY_V1`

## 1. Gate authority

Normative candidate:

```text
specs/0052-m4-plugin-sandbox-documentation-boundary.md
```

Requirement corpus:

```text
fixtures/plugin-sandbox-documentation-boundary/cases.json
PSDB-001..PSDB-024
```

Pinned DeepSeek Harness compatibility baseline:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

M4-052 freezes a product/security documentation boundary, not a new enforcement
mechanism:

```text
DSH Safe Runtime v0.1 is not a sandbox for arbitrary in-process plugins.
```

The accepted meaning is deliberately narrow. Actions that reach the supported
ToolRuntime/provider enforcement seams can be governed according to already
accepted Capability Broker authority, but arbitrary code executing in the same
host process can invoke host/runtime APIs outside those seams when ordinary host
permissions allow it. M4-052 documents that fact and does not upgrade
`tool-enforced` into `process-isolated`.

## 2. Predecessor governance

M4-051 governance was fully closed before M4-052 repository work began.

Closure-record head:

```text
2be8d80ba2fcb6da97fb8e15d825a75ac1306c9f
```

Exact-head evidence:

```text
CI #639 / run 34212468367: PASS
Harness #581 / run 34212468357: PASS
Harness job 102016423212 step 10 exact pinned-source typecheck: PASS
Harness job 102016423212 step 11 real rc5 runtime conformance: PASS
```

The retained M4-051 boundary remains unchanged: lexical shell-string matching is
not complete nested-effect authority, while recognized shell calls remain
`process.exec`. M4-052 does not relabel the enclosing shell process as ungoverned.

## 3. Protocol-first candidate

Protocol-first exact head:

```text
5f1849271796bf688148eb507d963831e0141fbf
```

Its exact delta from the M4-051 closure-record contains only:

```text
docs/handoff/CURRENT.md
fixtures/plugin-sandbox-documentation-boundary/cases.json
specs/0052-m4-plugin-sandbox-documentation-boundary.md
```

Diff statistics:

```text
docs/handoff/CURRENT.md                                      +104 / -165
fixtures/plugin-sandbox-documentation-boundary/cases.json   +130 / -0
specs/0052-m4-plugin-sandbox-documentation-boundary.md      +385 / -0
```

No README/architecture implementation, production code, source-conformance test,
dependency, lockfile, Schema, Shared TCK, HISTORY, roadmap acceptance marker or
workflow changed in the protocol-first commit.

Exact-head evidence:

```text
CI #640 / run 34213032378: PASS
Harness #582 / run 34213032375: PASS
Harness job 102018247773 step 10 exact pinned-source typecheck: PASS
Harness job 102018247773 step 11 real rc5 runtime conformance: PASS
```

Documentation/source-conformance work therefore began only after the exact
protocol-first head reached the required dual-green boundary.

## 4. Documentation implementation sequence

Initial documentation/source-conformance commit:

```text
e5b858336245962e128f32692003d6ccfef01742
docs(m4-052): document v0.1 plugin sandbox boundary
```

Its exact delta from the dual-green protocol-first head contains only:

```text
README.md                                                           +14 / -0
docs/architecture.md                                                +36 / -0
packages/adapter-dsh/source-conformance/
  m4-052-plugin-sandbox-documentation-boundary.conformance.ts       +91 / -0
```

CI remained green, while the pinned Harness runtime-conformance step exposed a
source-conformance problem:

```text
CI #641 / run 34213428374: PASS
Harness #583 / run 34213428239: FAIL
Harness job 102019511908 step 10 exact pinned-source typecheck: PASS
Harness job 102019511908 step 11 real rc5 runtime conformance: FAIL
```

The GitHub connector available during acceptance review exposes the exact job and
step result but not the raw downloadable step log. This audit therefore does not
invent a stack trace or attribute a diagnostic that cannot be recovered from the
current GitHub evidence.

A first one-file compatibility/path-resolution remediation followed:

```text
ed03043728bf02969877de1f797502e8da36e9af
test(m4-052): use cwd for documentation conformance paths
```

Exact delta:

```text
packages/adapter-dsh/source-conformance/
  m4-052-plugin-sandbox-documentation-boundary.conformance.ts       +10 / -11
```

It replaced `import.meta.url`-relative documentation lookup with repository-root
lookup derived from `process.cwd()` plus `node:path.resolve`. No documentation,
production, protocol, Schema, TCK, dependency, lockfile, workflow or governance
surface changed.

Evidence:

```text
CI #642 / run 34213832531: PASS
Harness #584 / run 34213832545: FAIL
Harness job 102020786823 step 10 exact pinned-source typecheck: PASS
Harness job 102020786823 step 11 real rc5 runtime conformance: FAIL
```

The first remediation therefore did not fully close runtime conformance.

At `ed030437...`, the conformance assertion required the continuous substring:

```text
future process-isolated Plugin Host is tracked as M14
```

while the exact README intentionally wraps the prose as:

```text
A future
process-isolated Plugin Host is tracked as M14
```

That exact assertion is deterministically false because Markdown line wrapping
introduces whitespace between `future` and `process-isolated`; this conclusion is
established directly from the exact-head test source and README, without relying
on an unavailable raw job log.

The final one-file remediation was:

```text
eca1b63fcc45d19147a5850cea9a9c3370c453b8
test(m4-052): normalize README whitespace in conformance
```

Exact delta:

```text
packages/adapter-dsh/source-conformance/
  m4-052-plugin-sandbox-documentation-boundary.conformance.ts       +3 / -1
```

Only the README assertion input is normalized with `readme.replace(/\s+/gu, " ")`
before checking the same complete future-M14 wording. The required words, order
and security meaning are unchanged; Markdown presentation whitespace is no
longer treated as protocol semantics.

## 5. Final reviewed implementation delta

Final reviewed implementation/source-conformance exact head:

```text
eca1b63fcc45d19147a5850cea9a9c3370c453b8
```

The cumulative delta from the dual-green protocol-first head is exactly three
files:

```text
README.md                                                           +14 / -0
docs/architecture.md                                                +36 / -0
packages/adapter-dsh/source-conformance/
  m4-052-plugin-sandbox-documentation-boundary.conformance.ts       +92 / -0
```

No production/runtime source, package manifest, lockfile, portable protocol wire,
Schema, Shared TCK, workflow, HISTORY, roadmap acceptance marker, CURRENT update
or later-Gate artifact appears in the cumulative post-protocol implementation
delta.

## 6. README public security boundary

The top-level README now states prominently:

```text
DSH Safe Runtime v0.1 is not a sandbox for arbitrary in-process plugins.
```

It also preserves the existing non-negotiable rule that tool-level policy must
not be described as isolation of arbitrary in-process plugins, and explains that:

- Capability Broker enforcement applies when actions reach supported
  ToolRuntime/provider seams;
- same-process code may still use host APIs outside those seams;
- M4-050 is an accepted direct-host negative witness;
- `tool-enforced` must not be presented as `process-isolated`;
- M4-051 concerns incomplete shell-string nested-effect authority while recognized
  shell calls remain `process.exec`;
- process-isolated Plugin Host work belongs to future M14 and is not part of v0.1.

The README therefore improves discoverability without claiming that prose itself
changes runtime security.

## 7. Architecture technical boundary

`docs/architecture.md` adds `7.2.1 v0.1 Plugin Sandbox Non-Claim` and keeps the
technical distinction explicit:

```text
reached Harness ToolRuntime / accepted provider seam
  -> Capability Broker / policy / guard / approval
  -> accepted tool-enforced/provider-aware guarantee only

same-process Plugin direct host/runtime/native API
  -> may not enter that seam
  -> no process-isolated/sandbox claim
```

The architecture retains M4-050 `EXPECTED_UNGOVERNED` direct-host evidence and
M4-051's narrower lexical-boundary fact. It also explicitly rejects false
implications including:

```text
tool policy => arbitrary Plugin isolation
tool-enforced => process-isolated
command string matcher => complete nested-effect mediation
workspace rollback => complete Plugin sandbox
documentation statement => runtime enforcement
```

The future process-isolated Plugin Host remains owned by M14. The current roadmap
still marks every M14 worker/RPC/supervisor/OS/security item unchecked, including
isolated worker spawning, no host environment inheritance, no host cwd access,
resource limits, crash isolation, brokered fs/process/network RPC and the future
conversion of the direct-fs negative witness toward `DENIED`.

## 8. Corpus and source-conformance traceability

The language-neutral corpus pins exactly:

```text
profile: M4-052_PLUGIN_SANDBOX_DOCUMENTATION_BOUNDARY_V1
Harness: 0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
cases: PSDB-001..PSDB-024 exactly once
```

All 24 cases contain non-empty requirement and evidence fields. They cover the
explicit v0.1 non-sandbox statement, in-process scope, reached-seam versus direct
host distinction, guarantee vocabulary, M4-050/M4-051 retained facts, future M14
ownership, README/architecture surfaces, no production isolation implementation,
no new protocol/Schema/GuaranteeLevel vocabulary, no M6/M12/M14/M17/M19
premature claims, Harness pinning and independent PR/later-Gate governance.

The final source-conformance test binds those corpus/profile/pin facts to the
actual README, architecture and roadmap wording. It is repository/documentation
traceability only and does not implement a security control.

## 9. Production and protocol-change review

M4-052 makes no production enforcement change.

The reviewed delta does not add or modify:

```text
worker/process spawning
Node API monkey patches
module-loader interception
filesystem syscall interception
network namespace/eBPF/container/seccomp/AppContainer policy
host environment scrubbing
brokered plugin RPC
Capability wire types
GuaranteeLevel values
policy effects
Schema or Shared TCK
package dependencies or lockfile
workflow behavior
```

No allowlist, raw-command regex/substr matcher, coding convention, documentation
promise or transactionality claim is presented as a substitute for process
isolation.

## 10. Final exact-head verification

Final reviewed implementation/source-conformance exact head:

```text
eca1b63fcc45d19147a5850cea9a9c3370c453b8
```

Evidence on that same SHA:

```text
CI #643 / run 34233256318: PASS
Harness #585 / run 34233256381: PASS
Harness job 102084404657 step 10 exact pinned-source typecheck: PASS
Harness job 102084404657 step 11 real rc5 runtime conformance: PASS
```

The two required Harness stages are therefore green on the same final reviewed
head after both source-conformance remediations.

## 11. PR and base-state review

At acceptance review:

```text
PR: #3 — feat(policy): begin M4 capability broker
state: Open
Draft: true
merged: false
mergeable: true
head: feat/m4-capability-broker@eca1b63fcc45d19147a5850cea9a9c3370c453b8
base: main@57430273e065be8d38807d67b175fa154c801d43
```

Live `main` is still exactly `57430273e065be8d38807d67b175fa154c801d43`,
so no base drift exists. GitHub reports no submitted PR reviews and no inline
review threads. The PR body is stale and remains non-authoritative relative to
live GitHub state, normative Specs and exact-head evidence.

PR #3 merge remains unauthorized without explicit user approval.

## 12. Compatibility and security non-claims

M4-052 does not modify or claim completion of:

```text
M4-050 direct-host negative boundary
M4-051 process.exec / lexical nested-effect boundary
portable Capability schemas or wire types
GuaranteeLevel vocabulary
provider-aware arbitrary host mediation
workspace transactionality as a plugin sandbox
M12 complete same-process network isolation
M14 process-isolated Plugin Host
M17 Security Review
M19 full Security Model / Known Limitations program
kernel/container/process isolation
arbitrary Node/native API interception
```

DeepSeek Harness rc5 remains compatibility evidence for concrete ToolRuntime
control-flow claims only. No Harness implementation detail is promoted into a
process-isolation guarantee.

## 13. Gate separation

M4-052 implementation/conformance acceptance does not close governance merely by
creating this audit.

This audit commit itself must first pass normal CI plus exact pinned Harness rc5
source-conformance on its own exact head. Until then:

- `docs/handoff/CURRENT.md` must not be advanced ad hoc;
- `docs/handoff/HISTORY.md` must remain unchanged;
- the M4-052 roadmap acceptance marker must remain unchanged;
- governance transition is not yet accepted;
- M4-053 repository work remains unauthorized;
- PR #3 merge remains unauthorized.

After this audit head is exact-head dual-green, M4-052 may proceed only to its
separate governance-transition commit, followed by that commit's own dual-green
verification and then the separate closure-record commit.

## 14. Acceptance decision

M4-052 documentation/source-conformance is **ACCEPTED** at:

```text
eca1b63fcc45d19147a5850cea9a9c3370c453b8
```

because:

- governance-closed M4-051 preceded M4-052;
- the protocol-first Spec/corpus/CURRENT delta was exact-head dual-green before
  documentation work began;
- the implementation delta is limited to README, architecture and one
  source-conformance file;
- README makes the v0.1 arbitrary in-process plugin non-sandbox boundary explicit
  and discoverable;
- architecture preserves reached ToolRuntime/provider seams versus direct host API
  execution and refuses `process-isolated` overclaim;
- M4-050 `EXPECTED_UNGOVERNED` and M4-051 `process.exec`/lexical-boundary semantics
  remain intact;
- future process isolation remains explicitly owned by unimplemented M14;
- all PSDB-001..024 requirements are pinned and source-traceable;
- no production isolation mechanism, protocol/schema vocabulary, dependency,
  lockfile, workflow or later-Gate implementation was added;
- the transient Harness failures are recorded according to live GitHub job facts
  without fabricating unavailable raw diagnostics;
- the final whitespace-normalization assertion preserves the complete security
  wording while removing Markdown layout whitespace from test semantics;
- normal CI and exact pinned Harness typecheck/runtime are dual-green on the same
  final reviewed SHA;
- PR/base/review state introduces no additional acceptance blocker.

This **audit commit itself is not yet accepted** until its own exact head passes
normal CI and exact pinned Harness source-conformance.
