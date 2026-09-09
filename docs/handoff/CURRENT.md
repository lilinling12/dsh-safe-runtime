# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-09`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..036: **GOVERNANCE CLOSED**
- M4-040..051: **GOVERNANCE CLOSED**
- M4-052 implementation/conformance: **ACCEPTED**
- M4-052 governance: **TRANSITION CANDIDATE — NOT CLOSED UNTIL THIS EXACT HEAD IS DUAL-GREEN**
- Post-M4-052 work: **NOT AUTHORIZED until a separate dual-green closure record reconciles the roadmap**
- M5, M6, M10, M13, M14 implementation, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-052 accepted authority

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

Pinned Harness compatibility baseline:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

The accepted product/security statement is:

```text
DSH Safe Runtime v0.1 is not a sandbox for arbitrary in-process plugins.
```

This is a documentation/security boundary, not a new enforcement mechanism.
ToolRuntime/provider seams may provide accepted tool-level enforcement when an
action reaches those seams, while arbitrary code executing in the same host
process can still invoke ordinary host/runtime APIs outside those seams when host
permissions allow it. `tool-enforced` MUST NOT be represented as
`process-isolated`.

## Exact accepted evidence

M4-051 closure-record predecessor:

```text
2be8d80ba2fcb6da97fb8e15d825a75ac1306c9f
CI #639 / run 34212468367: PASS
Harness #581 / run 34212468357: PASS
Harness job 102016423212 step 10: PASS
Harness job 102016423212 step 11: PASS
```

M4-052 protocol-first head:

```text
5f1849271796bf688148eb507d963831e0141fbf
CI #640 / run 34213032376: PASS
Harness #582 / run 34213032375: PASS
Harness job 102018247773 step 10: PASS
Harness job 102018247773 step 11: PASS
```

Final reviewed documentation/source-conformance head:

```text
eca1b63fcc45d19147a5850cea9a9c3370c453b8
CI #643 / run 34233256318: PASS
Harness #585 / run 34233256381: PASS
Harness job 102084404657 step 10: PASS
Harness job 102084404657 step 11: PASS
```

Acceptance audit:

```text
docs/acceptance/m4-052-acceptance-audit.md
head: 3e2cd73d1e844c7a944c431908e73a825e7e1712
CI #644 / run 34256048732: PASS
Harness #586 / run 34256048713: PASS
Harness job 102162006462 step 10: PASS
Harness job 102162006462 step 11: PASS
```

The audit exact head is therefore dual-green and authorizes this governance
transition.

## Accepted security boundary

M4-052 preserves the governance-closed negative boundaries rather than
overclaiming them:

- M4-050 direct host `node:fs` evidence remains `EXPECTED_UNGOVERNED`; it proves
  the supported ToolRuntime seams do not mediate arbitrary same-process host API
  calls.
- M4-051 remains a lexical nested-effect inference limitation only; recognized
  shell calls remain M4-011 `process.exec` requests.
- M4-052 adds no production shell parser/matcher, Node API interception, loader
  interception, provider/kernel/container sandbox, process isolation or brokered
  plugin RPC.
- M14 remains the future owner of a process-isolated Plugin Host.
- M17/M19 security-review/documentation programs are not claimed complete by this
  Gate.

## Current governance boundary

M4-052 implementation/conformance is **ACCEPTED** and this commit is the
governance-transition candidate. Its repository delta is restricted to exactly:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md    # append-only; prior byte prefix unchanged
docs/roadmap.md            # only M4-052 marker/details
```

M4-052 governance is **NOT CLOSED** until this exact governance-transition head
passes normal CI plus exact pinned Harness rc5 source-conformance, including
steps 10 and 11.

Until then, no later roadmap work is authorized. After this governance head is
dual-green, a separate closure-record commit limited to CURRENT plus append-only
HISTORY must record that exact evidence and reconcile the actual next roadmap
boundary. PR #3 remains Open / Draft and merge remains unauthorized without
explicit user approval.
