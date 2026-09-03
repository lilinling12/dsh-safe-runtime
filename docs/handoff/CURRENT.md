# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-03`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- Parent governance-closed head: `93d0879c9d7960524aafb0d60906ed37b21c835e` (M4-036)
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..036: **GOVERNANCE CLOSED**
- M4-040 P0 `tools/pre-execute`: **IMPLEMENTATION / CONFORMANCE ACCEPTED**
- M4-040 acceptance audit: **EXACT-HEAD VERIFIED**
- M4-040 final governance: **CANDIDATE / EXACT-HEAD VERIFICATION REQUIRED**
- M4-041+: **NOT AUTHORIZED until the containing final-governance head is dual-green**
- M4-050+, M5, M6, M10, M13, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-040 protocol-first closure

Normative authority:

```text
specs/0044-m4-dsh-pre-execute-registration.md
profile: M4-040_DSH_PRE_EXECUTE_REGISTRATION_V1
```

Portable/source-conformance corpus:

```text
fixtures/dsh-pre-execute-registration/cases.json
24 cases: DPER-001 through DPER-024
```

Protocol-first exact head:

```text
544a8b13cc93729c1ea6178c54cd976e827983c0
```

Its parent is the M4-036 governance-closed head
`93d0879c9d7960524aafb0d60906ed37b21c835e`.

The protocol-first delta was exactly:

```text
specs/0044-m4-dsh-pre-execute-registration.md
fixtures/dsh-pre-execute-registration/cases.json
docs/handoff/CURRENT.md
```

Exact-head evidence:

- normal CI #578 / run `33742873583`: PASS;
- exact pinned Harness rc5 source-conformance #520 / run `33742873592`: PASS.

Only after this exact head became dual-green did M4-040 conformance work begin.

## M4-040 accepted implementation strategy

Spec 0044 required the existing M2 runtime-independent seam to be tested before
production code was changed:

```text
HarnessRuntimeAdapter.registerToolPolicy(handler)
```

Review and exact-source tests proved the already-existing production binding in
`packages/adapter-dsh/src/binding.ts` conforms. Therefore M4-040 did not perform a
gratuitous production rewrite.

The accepted implementation/conformance delta from protocol-first head
`544a8b13...` to final reviewed conformance head `46daba53...` changes exactly:

```text
packages/adapter-dsh/source-conformance/m4-040-pre-execute-registration.conformance.ts
packages/adapter-dsh/source-conformance/m4-040-corpus-coverage.conformance.ts
packages/adapter-dsh/tsconfig.harness-rc5.json
```

No production Adapter source, protocol/schema, core package, dependency,
package manifest, lockfile, Shared TCK registration or Harness pin/workflow changed.

## M4-040 accepted semantics

Exact pinned rc5 source/runtime evidence proves:

```text
callRef     = String(exec.callId)
rootCallRef = String(exec.rootCallId)
toolName    = exec.name
arguments   = exact already-materialized/frozen exec.arguments reference
```

Scope remains exactly:

```text
agent -> sessionRef + agentRef
host  -> host
```

Decision mapping remains:

```text
ALLOW -> waterfall next()
DENY(reason) -> Harness { kind: "deny", reason }
ASK -> Harness { kind: "ask" }
ASK(reason) -> Harness { kind: "ask", reason }
handler throw/reject -> deny("safe-runtime policy evaluation failed closed")
```

Critical limitation:

```text
M4-040 ALLOW == delegation to next waterfall listener
M4-040 ALLOW != final authorization
M4-040 registration alone != tool-enforced
```

A downstream listener may still deny/ask, while an earlier listener may
short-circuit before safe-runtime runs. M4-041 separately owns the monotonic
`ctx.tools.guard()` hard-deny invariant.

M4-040 also does not directly route approval, does not observe authoritative final
`tools/result` as this Gate's output, does not aggregate classifier/PDP requirement
sets, does not resolve provider/execution-root operands, does not select/consume
Leases and does not construct final Decision/Receipt/Guarantee state.

## Conformance hardening and real failure reconciliation

First source-conformance implementation head:

```text
104c92625e9860592248687be92e8485f6654775
```

Evidence:

- CI #579 / run `33744719534`: PASS;
- Harness #521 / run `33744719552`: PASS.

Review continued after green automation and added explicit 24-case corpus evidence
plus additional waterfall behavior evidence.

The corpus-coverage commit
`a0739a82933a0f7bdb2f7fa51110ecb9b7f38dd9` introduced a Harness-only exact-source
typecheck regression while normal CI stayed green:

- CI #580 / run `33747029071`: PASS;
- Harness #522 / run `33747029186`: FAIL at step 10.

Hardening head `2405635e79c00d382167f5f1c482bbb2bb2eea9d` preserved the same real failure:

- CI #581 / run `33747173913`: PASS;
- Harness #523 / run `33747173901`: FAIL at step 10;
- runtime conformance step 11 was skipped because typecheck failed first.

The failing corpus test had introduced `node:fs/promises` only to read a checked-in
static JSON fixture. The dedicated Harness compile graph did not otherwise require
that Node ambient type dependency. The repair removed unnecessary filesystem I/O,
uses a static JSON module import and enables only `resolveJsonModule` in the
Harness-specific tsconfig.

The repair did not weaken TypeScript strictness, suppress diagnostics, add `any`,
change the Harness workflow, modify production code, remove the corpus test, add a
new dependency or hand-edit the frozen lockfile.

## Final reviewed conformance evidence

Final reviewed conformance exact head:

```text
46daba5306f4773fcc6f2b9a0927f9e67df6a2f1
```

Exact-head evidence:

- normal CI #582 / run `33760915397`: PASS;
- exact pinned Harness rc5 source-conformance #524 / run `33760915449`: PASS;
- Harness step 10 exact rc5 binding/source-conformance typecheck: PASS;
- Harness step 11 real rc5 runtime conformance: PASS.

## Acceptance audit evidence

Acceptance audit:

```text
docs/acceptance/m4-040-acceptance-audit.md
```

Audit-only exact head:

```text
694fe273163699a42eae857989bb379fba3b5c08
```

Exact-head evidence:

- normal CI #583 / run `33763130310`: PASS;
- exact pinned Harness rc5 source-conformance #525 / run `33763130316`: PASS;
- Harness step 10: PASS;
- Harness step 11: PASS;
- PR #3 remained Open, Draft and mergeable;
- reviews: none;
- review threads: none.

The Adapter package stage remains `M2-ADAPTER-CONFORMANCE`; M4-040 reuses an
accepted M2 seam and does not require a misleading M4 package-stage promotion.

## Final governance candidate boundary

This final-governance transition is authorized to change only:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md
docs/roadmap.md
```

The roadmap change must mark only M4-040 accepted. M4-041 remains unchecked.

This governance transition must not change:

```text
production TypeScript
Spec 0044
M4-040 corpus
schema/protocol wire types
Shared TCK registration
package manifests/dependencies
pnpm-lock.yaml
Adapter/Harness baseline or workflow
M4-041 implementation/spec/corpus
M4-042+
M4-050+
M5
M6
M10
M13
M15
PR #3 merge state
```

## Resume instruction

1. refresh PR #3 live head/base/Open/Draft/mergeability/reviews/threads;
2. confirm the final-governance candidate is based directly on audit head
   `694fe273163699a42eae857989bb379fba3b5c08` and changes only CURRENT,
   append-only HISTORY and the single M4-040 roadmap marker/details;
3. require exact-head normal CI + exact pinned Harness rc5 source-conformance green;
4. inspect Harness step 10 and step 11 and require both to execute successfully;
5. only after that exact governance head is dual-green declare M4-040 governance
   CLOSED and authorize M4-041 P0 as the sole next protocol-first Gate;
6. M4-041 must recover the exact pinned `ctx.tools.guard()` ordering/decision/
   lifecycle semantics before any production change and must not let Harness
   reverse-define portable protocol authority;
7. keep M4-042+, M4-050+, M5, M6, M10, M13, M15 and PR #3 merge unauthorized.
