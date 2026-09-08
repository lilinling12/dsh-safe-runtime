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

## M4-051 accepted evidence

Normative specification:

```text
specs/0051-m4-equivalent-shell-spelling-negative-boundary.md
```

Requirement corpus:

```text
fixtures/equivalent-shell-spelling-negative-boundary/cases.json
profile: M4-051_EQUIVALENT_SHELL_SPELLING_NEGATIVE_BOUNDARY_V1
cases: ESSM-001..ESSM-024
```

Pinned Harness compatibility baseline:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

Protocol-first exact head `15d7a7de5ab13e6b47a01c449295bb0a5dc1a3d2`:

- exact delta: Spec 0051 + 24-case ESSM corpus + CURRENT only;
- CI #635 / run `34207867737`: PASS;
- Harness #577 / run `34207867755`: PASS;
- Harness job `102001564039`, step 10 exact pinned-source typecheck: PASS;
- same job, step 11 real rc5 runtime conformance: PASS.

Reviewed executable/source-conformance exact head
`338aba9f4ca286721cf9703d9474bfde4496370f`:

- exact delta is limited to two dedicated M4-051 Adapter source-conformance files;
- no production implementation changed;
- one real Bash witness fixes a test-only literal matcher before measurement,
  proves distinct command strings, reference `MATCH`, alternative `NO_MATCH`,
  independent absent-before provenance for both executions and the same exact
  fixed benign post-state bytes;
- exact classification is `EXPECTED_STRING_MATCHER_BYPASS`;
- CI #636 / run `34208412572`: PASS;
- Harness #578 / run `34208412227`: PASS;
- Harness job `102003343533`, step 10 and step 11: PASS.

Acceptance audit:

```text
docs/acceptance/m4-051-acceptance-audit.md
head: 91b9dcef1c092ab0968ff198d6342a8cc9c7bb81
```

- CI #637 / run `34210896023`: PASS;
- Harness #579 / run `34210896202`: PASS;
- Harness job `102011369018`, step 10 exact pinned-source typecheck: PASS;
- same job, step 11 real rc5 runtime conformance: PASS.

M4-051 implementation/conformance is therefore accepted at
`338aba9f4ca286721cf9703d9474bfde4496370f`. The acceptance audit itself is
dual-green.

## M4-051 security boundary retained

M4-051 proves only that equivalent measured shell effects can evade a fixed
string-level nested-effect matcher. It does not change accepted M4-011
`process.exec` classification and does not prove that the enclosing shell process
bypasses M4-040/M4-041 ToolRuntime controls.

The Gate does not implement or claim:

```text
production shell string matcher or parser
NO_MATCH => policy ALLOW
shell process => EXPECTED_UNGOVERNED
complete nested filesystem/network/secret inference
provider-aware process mediation
process/kernel isolation
plugin sandboxing
PowerShell equivalence from Bash-only evidence
filesystem transactionality or rollback
M6 workspace transactions
M14 process-isolated plugin hosting
```

## Current governance boundary

M4-051 implementation/conformance is **ACCEPTED** and this commit is the
governance transition candidate. It is restricted to exactly:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md    # append-only; prior byte prefix unchanged
docs/roadmap.md            # only M4-051 marker/details
```

M4-051 governance is **NOT CLOSED** until this exact governance-transition head
passes normal CI plus exact pinned Harness rc5 source-conformance, including
steps 10 and 11.

Until then:

```text
M4-052+: NOT AUTHORIZED
M5/M6/M10/M13/M14 implementation/M15: NOT AUTHORIZED
PR #3 merge: NOT AUTHORIZED without explicit user authorization
```

After this governance head becomes dual-green, a separate closure-record commit
limited to CURRENT plus append-only HISTORY must record that exact evidence. Only
a dual-green closure-record head may authorize M4-052 as the sole next Gate.
