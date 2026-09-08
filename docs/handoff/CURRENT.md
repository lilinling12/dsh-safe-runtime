# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-08`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- Active exact head before this candidate: `2be8d80ba2fcb6da97fb8e15d825a75ac1306c9f`
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..036: **GOVERNANCE CLOSED**
- M4-040..051: **GOVERNANCE CLOSED**
- M4-052: **PROTOCOL-FIRST CANDIDATE / DOCUMENTATION IMPLEMENTATION NOT YET AUTHORIZED**
- M4-053+: **NOT AUTHORIZED**
- M5, M6, M10, M13, M14 implementation, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-051 final closure evidence

Accepted M4-051 authority:

```text
specs/0051-m4-equivalent-shell-spelling-negative-boundary.md
fixtures/equivalent-shell-spelling-negative-boundary/cases.json
profile: M4-051_EQUIVALENT_SHELL_SPELLING_NEGATIVE_BOUNDARY_V1
```

Protocol-first head:

```text
15d7a7de5ab13e6b47a01c449295bb0a5dc1a3d2
CI #635 / run 34207867737: PASS
Harness #577 / run 34207867755: PASS
Harness job 102001564039 step 10: PASS
Harness job 102001564039 step 11: PASS
```

Reviewed executable/source-conformance head:

```text
338aba9f4ca286721cf9703d9474bfde4496370f
CI #636 / run 34208412572: PASS
Harness #578 / run 34208412227: PASS
Harness job 102003343533 step 10: PASS
Harness job 102003343533 step 11: PASS
```

Acceptance audit head:

```text
91b9dcef1c092ab0968ff198d6342a8cc9c7bb81
CI #637 / run 34210896023: PASS
Harness #579 / run 34210896202: PASS
Harness job 102011369018 step 10: PASS
Harness job 102011369018 step 11: PASS
```

Governance transition:

```text
33d33c71f754f9ac6042a72169382e9b15f21b0f
CI #638 / run 34212084370: PASS
Harness #580 / run 34212084357: PASS
Harness job 102015196009 step 10: PASS
Harness job 102015196009 step 11: PASS
```

Closure-record:

```text
2be8d80ba2fcb6da97fb8e15d825a75ac1306c9f
CI #639 / run 34212468367: PASS
Harness #581 / run 34212468357: PASS
Harness job 102016423212 step 10: PASS
Harness job 102016423212 step 11: PASS
```

M4-051 is therefore **GOVERNANCE CLOSED**.

Its retained security boundary is narrow: equivalent measured shell effects can
bypass a fixed string-derived nested-effect matcher, but recognized shell calls
remain accepted M4-011 `process.exec` requests. M4-051 did not add a production
shell parser/matcher and did not prove ToolRuntime, provider, process or plugin
isolation.

## M4-052 recovered authority

Roadmap Gate:

```text
M4-052 P0 — document that v0.1 is not plugin sandbox
```

Existing authority already establishes:

1. `README.md` says tool-level policy MUST NOT be described as isolation of
   arbitrary in-process plugins.
2. `docs/architecture.md` PEP-TOOL governs only behavior that reaches the Tool
   Pipeline; a host Plugin can call Node APIs outside that boundary.
3. PEP-TOOL guarantee is `tool-enforced`, not `process-isolated`.
4. governance-closed M4-050 proves the direct-host filesystem negative boundary.
5. governance-closed M4-051 proves shell-string nested-effect inference is
   incomplete without relabeling the enclosing `process.exec` as ungoverned.
6. roadmap M14 explicitly owns the future process-isolated Plugin Host and remains
   unimplemented/unauthorized.
7. M19 separately owns the future full Security Model / Known Limitations
   documentation program and MUST NOT be prematurely claimed complete here.

## Current Gate — M4-052 protocol-first candidate

Normative candidate:

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

The candidate freezes one public product/security statement:

```text
DSH Safe Runtime v0.1 is not a sandbox for arbitrary in-process plugins.
```

The required post-protocol implementation is intentionally documentation-only:

```text
README.md
  -> concise discoverable v0.1 non-sandbox statement

docs/architecture.md
  -> precise PEP-TOOL / direct-host / process-isolation boundary

source-conformance
  -> repository/documentation traceability only; no new isolation mechanism
```

The Gate MUST NOT create or claim:

```text
process-isolated plugin host
Node API interception / monkey patching
provider/kernel/container sandbox
new Capability wire types or GuaranteeLevel values
M6 transactionality
M12 network isolation
M14 worker/RPC/supervisor/OS backends
M17 security review completion
M19 full Security Model / Known Limitations completion
```

## Protocol-first delta boundary

This candidate head is restricted to exactly:

```text
specs/0052-m4-plugin-sandbox-documentation-boundary.md
fixtures/plugin-sandbox-documentation-boundary/cases.json
docs/handoff/CURRENT.md
```

No README/architecture implementation, source-conformance, production code,
dependency, lockfile, schema, Shared TCK, HISTORY, roadmap acceptance marker,
workflow or later-Gate artifact may change before this exact protocol-first head
passes normal CI plus exact pinned Harness rc5 source-conformance.

After this candidate becomes exact-head dual-green, only the smallest M4-052
documentation/source-conformance delta becomes authorized.

PR #3 remains Open / Draft and merge remains unauthorized without explicit user
approval.
