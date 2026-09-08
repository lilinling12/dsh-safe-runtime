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
- M4-050 governance transition head: `7c93e12380ce0595192f423ec98e9f9b97b9385d` — dual-green
- M4-050 closure-record head: `b7c2cd457e932464c31e0eaae164a687114cf679` — dual-green
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..036: **GOVERNANCE CLOSED**
- M4-040..050: **GOVERNANCE CLOSED**
- M4-051 equivalent shell spelling bypass string matcher test: **PROTOCOL-FIRST CANDIDATE; EXECUTABLE WORK NOT AUTHORIZED UNTIL THIS EXACT HEAD IS DUAL-GREEN**
- M4-052+: **NOT AUTHORIZED by the current Gate**
- M5, M6, M10, M13, M14 implementation, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-050 accepted / closed evidence

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

Protocol-first exact head `302ec43ee48937f13859079c2e00891131ecd9ad`:

- CI #629 / run `34193629081`: PASS.
- Harness #571 / run `34193629078`: PASS.
- Harness job `101956581627`, step 10 exact pinned-source typecheck: PASS.
- Same job, step 11 real rc5 runtime conformance: PASS.

Reviewed executable/source-conformance exact head
`a92a0fcf1b20ec460d85de2e1338c8139c370cc1`:

- exact executable delta is limited to the two dedicated M4-050 Adapter
  source-conformance files;
- real supported `node:fs/promises.writeFile` witness uses a disposable
  test-owned sentinel and fixed benign bytes;
- the same measured operation proves zero ToolRuntime/pre-execute/policy/guard/
  tool-body/`tools/result` participation;
- exact classification is `EXPECTED_UNGOVERNED`.
- CI #630 / run `34194046009`: PASS.
- Harness #572 / run `34194046036`: PASS.
- Harness job `101957818163`, step 10 and step 11: PASS.

Acceptance audit `docs/acceptance/m4-050-acceptance-audit.md` at
`44e3ce2d3b23f455628979535f275123ad605af6`:

- CI #631 / run `34200436950`: PASS.
- Harness #573 / run `34200436977`: PASS.
- Harness job `101977743221`, step 10 and step 11: PASS.

Governance transition `7c93e12380ce0595192f423ec98e9f9b97b9385d`:

- exact diff from `8365a1c...`: CURRENT `+5/-3`, HISTORY `+49/-0`, roadmap
  `+1/-1`; no other files changed;
- CI #633 / run `34206675133`: PASS;
- Harness #575 / run `34206675087`: PASS;
- Harness job `101997661205`, step 10 and step 11: PASS.

Closure record `b7c2cd457e932464c31e0eaae164a687114cf679`:

- exact diff from transition head: CURRENT `+13/-20`, HISTORY `+26/-0`; no
  other files changed;
- CI #634 / run `34207079458`: PASS;
- Harness #576 / run `34207079637`: PASS;
- Harness job `101998971842`, step 10 exact pinned-source typecheck: PASS;
- same job, step 11 real rc5 runtime conformance: PASS.

M4-050 is therefore **GOVERNANCE CLOSED**.

## M4-050 security boundary retained

M4-050 proves only that host-privileged in-process direct Node filesystem access
can bypass the accepted ToolRuntime seams. It does not implement or claim:

```text
node:fs interception or monkey patching
complete host-effect mediation
provider/process/kernel isolation
plugin sandboxing
filesystem transactionality or rollback
shell/subprocess equivalence
synthetic CapabilityRequest/Decision/Receipt/Lease facts
M6 workspace transactions
M14 process-isolated plugin hosting
```

M4-051 must not reinterpret that direct-host boundary as shell evidence.

## Current Gate — M4-051 protocol-first candidate

Normative candidate:

```text
specs/0051-m4-equivalent-shell-spelling-negative-boundary.md
```

Requirement corpus:

```text
fixtures/equivalent-shell-spelling-negative-boundary/cases.json
profile: M4-051_EQUIVALENT_SHELL_SPELLING_NEGATIVE_BOUNDARY_V1
cases: ESSM-001..ESSM-024
```

Recovered authority before authoring the candidate:

- Spec 0027 classifies exact `bash` / `pwsh` calls as `process.exec` only and
  requires `rawCommand` to remain opaque; nested filesystem/network/secret effect
  inference from shell text is explicitly outside M4-011.
- The accepted `builtin-shell.ts` implementation preserves exact `rawCommand`
  and contains no production shell parser or nested-effect string matcher.
- `docs/architecture.md` explicitly records that equivalent shell spellings may
  bypass string-level matchers and forbids Shell String as the sole security
  semantic.
- M4-050 explicitly deferred shell/subprocess equivalence to M4-051.

The M4-051 candidate therefore defines a narrow negative evidence boundary:

```text
recognized shell call remains process.exec-governed
  + test-only literal nested-effect matcher matches one spelling
  + effect-equivalent spelling misses that matcher
  + both controlled spellings prove the same benign test-owned effect
  -> EXPECTED_STRING_MATCHER_BYPASS
```

`EXPECTED_STRING_MATCHER_BYPASS` is Gate-local test/evidence vocabulary. It is
not policy ALLOW/DENY, not `EXPECTED_UNGOVERNED`, and not a GuaranteeLevel.

The test-only matcher MUST NOT become production policy/classifier code. M4-051
also MUST NOT claim that a matcher false negative bypasses the enclosing
`process.exec` requirement or M4-040/M4-041 ToolRuntime guard.

### Protocol-first exact-head requirement

This candidate transition is restricted to exactly:

```text
specs/0051-m4-equivalent-shell-spelling-negative-boundary.md
fixtures/equivalent-shell-spelling-negative-boundary/cases.json
docs/handoff/CURRENT.md
```

Not authorized before this exact candidate head reaches normal CI + exact pinned
Harness rc5 source-conformance dual-green:

```text
production TypeScript
executable/source-conformance witness
package/dependency/lockfile changes
schema/protocol wire changes
Shared TCK registration
HISTORY
roadmap M4-051 acceptance marker
workflow changes
M4-052+
M5/M6/M10/M13/M14 implementation/M15
PR #3 merge
```

Only after the exact M4-051 protocol-first head is dual-green may the smallest
executable/source-conformance witness begin. PR #3 must remain Open / Draft and
must not be merged without explicit user authorization.
