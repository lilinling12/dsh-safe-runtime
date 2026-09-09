# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-09`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M5 — Audit Ledger + Privacy`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..036: **GOVERNANCE CLOSED**
- M4-040..052: **GOVERNANCE CLOSED**
- M5-001 P0 append-only store: **AUTHORIZED / PROTOCOL-FIRST NOT YET STARTED**
- M5-002+: **NOT AUTHORIZED by the current Gate**
- M6, M10, M13, M14 implementation, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-052 final closure evidence

Normative specification:

```text
specs/0052-m4-plugin-sandbox-documentation-boundary.md
```

Requirement corpus:

```text
fixtures/plugin-sandbox-documentation-boundary/cases.json
profile: M4-052_PLUGIN_SANDBOX_DOCUMENTATION_BOUNDARY_V1
cases: PSDB-001..PSDB-024
```

Final reviewed documentation/source-conformance head:

```text
eca1b63fcc45d19147a5850cea9a9c3370c453b8
CI #643 / run 34233256318: PASS
Harness #585 / run 34233256381: PASS
Harness job 102084404657 step 10: PASS
Harness job 102084404657 step 11: PASS
```

Acceptance audit head:

```text
3e2cd73d1e844c7a944c431908e73a825e7e1712
CI #644 / run 34256048732: PASS
Harness #586 / run 34256048713: PASS
Harness job 102162006462 step 10: PASS
Harness job 102162006462 step 11: PASS
```

Governance transition head:

```text
5c5b662b05380d64158d198c6b1327894bba97bc
CI #645 / run 34297276363: PASS
Harness #587 / run 34297276411: PASS
Harness job 102296523748 step 10: PASS
Harness job 102296523748 step 11: PASS
```

The exact governance-transition diff from the audit head is restricted to:

```text
docs/handoff/CURRENT.md   +71 / -119
docs/handoff/HISTORY.md   +58 / -0
docs/roadmap.md           +1 / -1   # M4-052 marker/details only
```

No production code, Spec/corpus/schema, Shared TCK, dependency, lockfile,
Adapter/Harness baseline/workflow or later-Gate implementation changed in the
governance transition. The prior HISTORY byte prefix was preserved.

M4-052 is therefore **GOVERNANCE CLOSED**.

## Retained M4-052 security boundary

The closed Gate records a truthful documentation/security non-claim:

```text
DSH Safe Runtime v0.1 is not a sandbox for arbitrary in-process plugins.
```

M4-052 does not add arbitrary in-process plugin isolation, Node API interception,
loader interception, provider/kernel/container sandboxing, brokered plugin RPC,
new Capability wire types or GuaranteeLevel values, M6 transactionality, M12
network isolation, M14 process-isolated Plugin Host implementation, or M17/M19
completion. M4-050 `EXPECTED_UNGOVERNED` direct-host evidence and the narrower
M4-051 shell-string matcher limitation remain unchanged.

## Next authorized Gate — M5-001

The live roadmap has no M4-053 item after M4-052. The next numbered engineering
Gate is:

```text
M5-001 P0 — append-only store
```

Only M5-001 protocol-first work is newly authorized by this closure. M5-002+ and
later milestones remain unauthorized until their own governance transitions.
M4 milestone DoD checkboxes remain roadmap state and are not rewritten by this
closure-record commit, whose allowed delta is CURRENT plus append-only HISTORY
only.

This closure-record head must itself reach exact-head normal CI plus exact pinned
Harness rc5 source-conformance, including steps 10 and 11, before any M5-001
repository modification begins. PR #3 remains Open / Draft and merge remains
unauthorized without explicit user approval.
