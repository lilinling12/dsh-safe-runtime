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
- Accepted predecessor governance head: `4124fbfbcc8186b972f4f61646a42b012ce1977f`
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..036: **GOVERNANCE CLOSED**
- M4-040..045: **GOVERNANCE CLOSED**
- M4-050 direct Node fs bypass → `EXPECTED_UNGOVERNED`: **IMPLEMENTATION / CONFORMANCE ACCEPTED; GOVERNANCE UPDATE PENDING**
- M4-051+: **NOT AUTHORIZED until M4-050 governance closure reaches its own exact-head dual-green**
- M5, M6, M10, M13, M14 implementation, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-050 accepted evidence

Normative specification:

```text
specs/0050-m4-direct-host-fs-negative-boundary.md
```

Requirement corpus:

```text
fixtures/direct-host-fs-negative-boundary/cases.json
profile: M4-050_DIRECT_HOST_FS_NEGATIVE_BOUNDARY_V1
cases: DHFS-001..DHFS-024
```

Pinned Harness compatibility baseline:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

### Protocol-first exact head

```text
302ec43ee48937f13859079c2e00891131ecd9ad
```

- CI #629 / run `34193629081`: PASS.
- Harness #571 / run `34193629078`: PASS.
- Harness job `101956581627`, step 10 exact pinned-source typecheck: PASS.
- Same job, step 11 real rc5 runtime conformance: PASS.

Only after this exact head became dual-green did executable/source-conformance
work begin.

### Reviewed executable/source-conformance exact head

```text
a92a0fcf1b20ec460d85de2e1338c8139c370cc1
```

Its exact delta from the protocol-first head contains only:

```text
packages/adapter-dsh/source-conformance/m4-050-corpus-coverage.conformance.ts
packages/adapter-dsh/source-conformance/m4-050-direct-host-fs-negative-boundary.conformance.ts
```

The supported real rc5 witness performs one direct
`node:fs/promises.writeFile` against a disposable test-owned sentinel using fixed
benign bytes. The same measured operation proves sentinel absence before, exact
bytes after, and zero raw `tools/pre-execute`, safe-runtime policy, monotonic
guard, tool body and `tools/result` participation. The exact expected boundary
classification is `EXPECTED_UNGOVERNED`; contradictory provenance or mediation
evidence is `INVALID_EVIDENCE`.

Exact-head evidence:

- CI #630 / run `34194046009`: PASS.
- Harness #572 / run `34194046036`: PASS.
- Harness job `101957818163`, step 10 exact pinned-source typecheck: PASS.
- Same job, step 11 real rc5 runtime conformance: PASS.

No production implementation, Schema, dependency, lockfile, workflow, roadmap,
HISTORY or later-Gate behavior changed in that executable delta.

### Acceptance audit exact head

Acceptance audit:

```text
docs/acceptance/m4-050-acceptance-audit.md
```

Audit-only exact head:

```text
44e3ce2d3b23f455628979535f275123ad605af6
```

- CI #631 / run `34200436950`: PASS.
- Harness #573 / run `34200436977`: PASS.
- Harness job `101977743221`, step 10 exact pinned-source typecheck: PASS.
- Same job, step 11 real rc5 runtime conformance: PASS.

The audit accepts M4-050 implementation/conformance at `a92a0fcf...`. It does not
itself close governance or authorize M4-051.

## M4-050 security boundary

M4-050 is deliberately a negative-boundary evidence Gate. It proves that current
host-privileged in-process direct Node filesystem access can bypass the accepted
ToolRuntime seams. It MUST NOT be interpreted as evidence of safe-runtime ALLOW or
DENY.

M4-050 does not implement or claim:

```text
node:fs interception or monkey patching
complete host-effect mediation
provider/process/kernel isolation
plugin sandboxing
filesystem transactionality or rollback
shell/subprocess equivalence
synthetic CapabilityRequest/Decision/Receipt/Lease facts
synthetic approval or audit facts
M6 workspace transactions
M14 process-isolated plugin hosting
```

The direct Node spelling is Adapter/source-conformance evidence only. DeepSeek
Harness remains compatibility evidence and does not become portable filesystem
protocol authority.

## Current governance boundary

The next repository transition is M4-050 governance bookkeeping only. It is
restricted to the governance records required by repository process:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # append-only; prior byte prefix must be preserved
docs/roadmap.md           # only the M4-050 marker/details
```

No production, Spec/corpus/schema, Shared TCK, dependency, lockfile, Harness
baseline/workflow or M4-051 implementation may enter that transition.

Because `HISTORY.md` is append-only, a tooling path that cannot prove preservation
of the exact existing byte prefix must not rewrite it. Governance is not CLOSED
until the required governance records are safely committed and that resulting
exact head itself reaches normal CI plus exact pinned Harness rc5 source-
conformance dual-green.

Only after that closure may M4-051 become the sole newly authorized protocol-first
Gate. PR #3 must remain Open / Draft and must not be merged without explicit user
authorization.
