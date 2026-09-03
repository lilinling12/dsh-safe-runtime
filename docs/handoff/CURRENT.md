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
- M4-041 P0 `ctx.tools.guard()`: **AUTHORIZED / PROTOCOL-FIRST IN PROGRESS**
- M4-041 production/conformance implementation: **NOT AUTHORIZED before protocol-first exact-head dual-green**
- M4-042+, M4-050+, M5, M6, M10, M13, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-040 final governance closure

Final M4-040 governance exact head:

```text
df21ba12a4b9dea6eb21243a76cfcd9489eabdb7
```

Its governance delta from audit head `694fe273...` was exactly:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md
docs/roadmap.md
```

Pre-push compare proved:

```text
CURRENT: modified
HISTORY: +67 / -0 (append-only)
roadmap: +1 / -1 (only M4-040 acceptance line)
```

Exact-head evidence:

- normal CI #584 / run `33767121207`: PASS;
- exact pinned Harness rc5 source-conformance #526 / run `33767121228`: PASS;
- Harness step 10 exact rc5 binding/source-conformance typecheck: PASS;
- Harness step 11 real rc5 runtime conformance: PASS;
- PR #3 remained Open, Draft and mergeable;
- reviews: none;
- review threads: none.

Therefore M4-040 governance is CLOSED and M4-041 is the sole newly authorized Gate.

## M4-041 roadmap authority

Roadmap Gate:

```text
M4-041 P0 — use ctx.tools.guard() for hard invariant where required
```

M2 Spec 0003 already states that a monotonic hard-deny installation MAY use
`ctx.tools.guard()` when policy must not be reopened by later reorderable listeners.
M4-041 refines only that already-established Adapter seam.

## Existing runtime-independent Adapter authority

Current Adapter ports already expose:

```text
ToolGuardDecision =
  ALLOW
  | DENY(reason)

ToolGuardHandler = synchronous ToolPolicyRequest -> ToolGuardDecision

HarnessRuntimeAdapter.registerMonotonicToolGuard?(handler)
```

The request remains the M4-040/M2 shape:

```text
callRef
rootCallRef
toolName
arguments
scope = agent(sessionRef, agentRef) | host
```

The rc5 feature matrix already records:

```text
toolsMonotonicGuard = true
```

M4-041 MUST test and harden this existing seam rather than create another Harness
dependency in core packages.

## Pinned Harness source facts

Pinned compatibility baseline remains:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

Exact pinned `dsh-tools` documentation/tests establish:

- execution order is `tools/pre-execute` -> monotonic guards -> `tools/execute` ->
  `tools/post-execute` -> finalization -> `tools/result`;
- `ctx.tools.guard()` is synchronous;
- `ToolGuard` returns `string | undefined`;
- returned string denies; `undefined` abstains;
- a later/prepended pre-execute ALLOW cannot reopen a guard denial;
- arguments are already materialized/frozen before policy/guard execution;
- a plain-context guard is global;
- an `agent.ctx` guard applies only to that agent;
- registration returns an exact disposer and is fiber-owned;
- duplicate registrations dispose independently;
- multiple guards compose monotonically when one abstains and another denies;
- upstream live-registration iteration behavior exists but is not portable
  safe-runtime semantics and MUST NOT be required for correctness.

Harness remains Adapter evidence only, not protocol authority.

## Protocol-first authority

Normative draft:

```text
specs/0045-m4-dsh-monotonic-tool-guard.md
profile: M4-041_DSH_MONOTONIC_TOOL_GUARD_V1
```

Portable/source-conformance corpus:

```text
fixtures/dsh-monotonic-tool-guard/cases.json
32 cases: DMGR-001 through DMGR-032
```

## Critical semantic boundary

M4-041 is a hard-deny registration Gate, not complete Capability Broker PEP
composition.

At the runtime-independent port:

```text
ALLOW == no hard veto / Harness guard abstention
DENY(reason) == monotonic pre-dispatch veto
```

`ALLOW` is not final authorization. `ASK` is intentionally absent from the hard
guard domain and approval remains M4-042/M4-044 territory.

M4-041 may prove that a reached guard DENY cannot be reopened by reorderable
pre-execute listeners and prevents the tool body from entering. It MUST NOT infer
that every host effect traverses ToolRuntime or claim complete system-wide
`tool-enforced` coverage. M4-050 negative-boundary work remains required.

## Runtime defensive boundary

Static TypeScript typing is not sufficient for a security-critical hard guard.

If JavaScript callers bypass typing, malformed handler results MUST fail closed to:

```text
safe-runtime monotonic guard failed closed
```

without becoming Harness `undefined`/abstention.

Protocol-first coverage explicitly includes:

```text
null/non-object result
Promise/thenable result
missing/unknown kind
accessor-backed/unreadable kind
revoked Proxy decision
DENY missing/non-string reason
accessor-backed/unreadable reason
```

Validation MUST NOT execute getters or coercion hooks.

This requirement is expected to expose a concrete production hardening gap in the
current M2 binding if malformed runtime decisions are not yet defensively validated.
Production code MUST NOT be changed until this protocol-first head is dual-green.

## Authorized protocol-first delta

Exactly:

```text
specs/0045-m4-dsh-monotonic-tool-guard.md
fixtures/dsh-monotonic-tool-guard/cases.json
docs/handoff/CURRENT.md
```

Not authorized in this protocol-first commit:

```text
production TypeScript
adapter-dsh dependency/package changes
pnpm-lock.yaml
schema/protocol wire changes
Shared TCK registration
HISTORY
roadmap M4-041 acceptance marker
Harness baseline/workflow changes
M4-042+
M4-050+
M5
M6
M10
M13
M15
PR #3 merge
```

## Resume instruction

1. refresh PR #3 live head/base/Open/Draft/mergeability/reviews/threads;
2. verify parent `df21ba12...` -> M4-041 protocol-first candidate changes exactly
   the three authorized files;
3. require exact-head normal CI + pinned Harness rc5 source-conformance green;
4. only after dual-green begin M4-041 production/conformance work;
5. first test the already-existing M2 `registerMonotonicToolGuard` binding against
   Spec 0045 and the 32-case corpus;
6. if malformed runtime handler decisions can escape or become abstention, harden
   the Adapter boundary without weakening TypeScript, tests or fail-closed rules;
7. do not add ASK/approval, full PDP aggregation, Lease composition or final-result
   semantics to M4-041;
8. keep M4-042+, M4-050+, M5, M6, M10, M13, M15 and PR #3 merge unauthorized.
