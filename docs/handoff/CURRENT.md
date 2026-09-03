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
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..036: **GOVERNANCE CLOSED**
- M4-040 P0 `tools/pre-execute`: **GOVERNANCE CLOSED**
- M4-041 P0 `ctx.tools.guard()`: **IMPLEMENTATION / CONFORMANCE ACCEPTED**
- M4-041 acceptance audit: **EXACT-HEAD VERIFIED**
- M4-041 final governance: **CANDIDATE / EXACT-HEAD VERIFICATION REQUIRED**
- M4-042+: **NOT AUTHORIZED until the containing final-governance head is dual-green**
- M4-050+, M5, M6, M10, M13, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-040 predecessor closure

Final M4-040 governance exact head:

```text
df21ba12a4b9dea6eb21243a76cfcd9489eabdb7
```

Exact-head evidence:

- normal CI #584 / run `33767121207`: PASS;
- exact pinned Harness rc5 source-conformance #526 / run `33767121228`: PASS;
- Harness step 10 exact binding/source-conformance typecheck: PASS;
- Harness step 11 real rc5 runtime conformance: PASS.

M4-041 began only after that governance head became dual-green.

## M4-041 protocol-first closure

Normative authority:

```text
specs/0045-m4-dsh-monotonic-tool-guard.md
profile: M4-041_DSH_MONOTONIC_TOOL_GUARD_V1
```

Portable/source-conformance corpus:

```text
fixtures/dsh-monotonic-tool-guard/cases.json
32 cases: DMGR-001 through DMGR-032
```

Protocol-first exact head:

```text
4e447a748e8ff8dbeb97a1599e1ce1de87c441cf
```

Its parent is M4-040 governance head `df21ba12...` and its exact delta is:

```text
specs/0045-m4-dsh-monotonic-tool-guard.md
fixtures/dsh-monotonic-tool-guard/cases.json
docs/handoff/CURRENT.md
```

Exact-head evidence:

- normal CI #585 / run `33767960425`: PASS;
- exact pinned Harness rc5 source-conformance #527 / run `33767960602`: PASS;
- Harness step 10: PASS;
- Harness step 11: PASS.

Production/conformance work began only after that exact head became dual-green.

## M4-041 accepted hard-guard semantics

M4-041 reuses the existing runtime-independent M2 Adapter seam:

```text
HarnessRuntimeAdapter.registerMonotonicToolGuard?(handler)

ToolGuardDecision =
  ALLOW
  | DENY(reason)
```

Pinned rc5 source/runtime evidence establishes the concrete execution boundary:

```text
tools/pre-execute waterfall
-> monotonic guards
-> tools/execute
-> tools/post-execute
-> finalization
-> tools/result
```

The pinned Harness guard is synchronous and returns `string | undefined`:

```text
safe-runtime ALLOW       -> Harness undefined / abstention
safe-runtime DENY(reason)-> exact reason string / monotonic denial
```

A reached guard denial cannot be reopened by a later or prepended pre-execute
ALLOW and prevents the tool body from entering.

`ALLOW` is not final Capability authorization. `ASK` is intentionally absent from
the hard-guard domain. Approval routing remains M4-042/M4-044 territory.

## Concrete production defect and repair

Protocol-first review found a real fail-open risk in the existing M2 binding.
The old `registerMonotonicToolGuard()` caught a synchronous handler throw but then
read `decision.kind` / `decision.reason` directly. JavaScript callers bypassing
static TypeScript could return Promise/thenable, malformed objects, accessors or
unreadable Proxies; an evaluation/materialization failure could escape or collapse
toward Harness `undefined`, which means guard abstention.

For a security hard invariant, evaluation failure must not become abstention.

Accepted repair adds one package-private runtime boundary:

```text
packages/adapter-dsh/src/monotonic-tool-guard.ts
```

It materializes only own data properties, never executes decision getters or
coercion hooks, never awaits thenables, and maps malformed/unreadable runtime
output to the stable denial:

```text
safe-runtime monotonic guard failed closed
```

Coverage includes null/non-object/function results, Promise/custom thenables,
missing/unknown kind, accessor-backed kind/reason, DENY without a string reason,
revoked Proxy and descriptor/prototype traps. Valid DENY reasons are preserved
exactly, including the empty string.

## Final reviewed implementation/conformance head

Accepted implementation/conformance exact head:

```text
9e1372e285f38f3e0e7e69cb61c1c7546b769cca
```

Its delta from protocol-first head changes exactly:

```text
packages/adapter-dsh/src/monotonic-tool-guard.ts
packages/adapter-dsh/src/binding.ts
packages/adapter-dsh/test/monotonic-tool-guard.test.ts
packages/adapter-dsh/source-conformance/m4-041-monotonic-tool-guard.conformance.ts
packages/adapter-dsh/source-conformance/m4-041-corpus-coverage.conformance.ts
```

`binding.ts` changed only `+2/-7`: import the private evaluator and replace the
old local try/direct-property decision block.

No public Adapter port, feature matrix, dependency, package manifest, lockfile,
workflow, public protocol/schema, policy-engine, capability-broker, Shared TCK or
later Gate changed.

Exact-head evidence:

- normal CI #586 / run `33773380454`: PASS;
- exact pinned Harness rc5 source-conformance #528 / run `33773380443`: PASS;
- Harness step 10 exact rc5 typecheck: PASS;
- Harness step 11 real rc5 runtime conformance: PASS.

## Acceptance audit evidence

Acceptance audit:

```text
docs/acceptance/m4-041-acceptance-audit.md
```

Audit-only exact head:

```text
bbf3983f62504599b96416b4feb75a5e2319cf1d
```

Exact-head evidence:

- normal CI #587 / run `33773802585`: PASS;
- exact pinned Harness rc5 source-conformance #529 / run `33773802594`: PASS;
- Harness step 10: PASS;
- Harness step 11: PASS;
- PR #3 remained Open, Draft and mergeable;
- reviews: none;
- review threads: none.

## Security / guarantee boundary

M4-041 proves only a reached Harness ToolRuntime monotonic guard can impose a
pre-dispatch hard veto that reorderable pre-execute listeners cannot reopen.

It does not prove every host effect traverses ToolRuntime and does not govern
direct Node filesystem/process/network effects. It therefore does not by itself
establish complete system-wide `tool-enforced` coverage. M4-050 negative-boundary
work remains required, and GuaranteeLevel must continue to report only the action
boundary actually evidenced under accepted M4-025 semantics.

M4-041 also does not aggregate classifier/PDP requirements, resolve provider or
execution-root operands, select/consume Leases, route approval, own authoritative
final result composition, construct complete Decision/Receipt state or implement
audit redaction.

## Final governance candidate boundary

This final-governance transition is authorized to change only:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md
docs/roadmap.md
```

The roadmap change must mark only M4-041 accepted. M4-042 remains unchecked.

This governance transition must not change:

```text
production TypeScript
Spec 0045
M4-041 corpus
public protocol/schema wire types
Shared TCK registration
package manifests/dependencies
pnpm-lock.yaml
Adapter/Harness baseline or workflow
M4-042 implementation/spec/corpus
M4-043+
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
   `bbf3983f62504599b96416b4feb75a5e2319cf1d` and changes only CURRENT,
   append-only HISTORY and the single M4-041 roadmap marker/details;
3. require exact-head normal CI + exact pinned Harness rc5 source-conformance green;
4. inspect Harness step 10 and step 11 and require both to execute successfully;
5. only after that exact governance head is dual-green declare M4-041 governance
   CLOSED and authorize M4-042 P0 as the sole next protocol-first Gate;
6. M4-042 must reconcile accepted M4-023 approval routing, existing Adapter
   requestApproval semantics and exact pinned `ctx.approval` behavior before any
   production change; it must not create a duplicate approval subsystem;
7. keep M4-043+, M4-050+, M5, M6, M10, M13, M15 and PR #3 merge unauthorized.
