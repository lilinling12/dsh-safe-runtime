# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-10`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `R1 — DeepSeek Harness Plugin Alpha Release`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M4-001..052: **GOVERNANCE CLOSED**
- M5-001 P0 append-only store: **GOVERNANCE CLOSED**
- M5-002 P0 canonical JSON: **GOVERNANCE CLOSED**
- R1-001 P0 Alpha readiness reconciliation: **GOVERNANCE CLOSED**
- R1-002 P0 public DeepSeek Adapter API: **IMPLEMENTATION ACCEPTED / GOVERNANCE TRANSITION PENDING EXACT-HEAD DUAL-GREEN**
- R1-003+: **NOT AUTHORIZED until R1-002 governance exact head is dual-green**
- M5-003+: **PAUSED until R1 Alpha release governance closes**
- npm/registry publish and GitHub Release: **NOT AUTHORIZED**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## Current authority — R1-002

Normative Spec:

```text
specs/0056-r1-dsh-public-adapter-api.md
```

Contract corpus:

```text
fixtures/dsh-public-adapter-api/cases.json
profile: R1-002_DSH_PUBLIC_ADAPTER_API_V1
cases: DPA-001..DPA-036
```

Acceptance audit:

```text
docs/acceptance/r1-002-public-adapter-api.md
```

Pinned Harness compatibility baseline remains exactly:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

DeepSeek Harness remains Adapter compatibility/source-conformance evidence only;
it does not redefine portable safe-runtime protocol semantics.

## R1-002 exact evidence chain

Protocol-first exact head:

```text
da133cadb64ae071b68e020ea15c0295f9ce9033
CI #670: PASS
Harness #612: PASS
```

The first managed-facade implementation candidate
`bebe55535e312619e2a52a6572b50a4a50fe3bc0` failed CI #671 and Harness #613.
Exact failed job diagnostics were inspected before remediation. The failure was a
Harness-facing compile-topology and strict-TypeScript issue; no validator,
TypeScript strictness, dependency policy, frozen lockfile or compatibility
baseline was weakened.

Corrected managed-facade head:

```text
7243987d9f6222d52079d10deb848f992dbef89c
CI #672 / run 34335868629: PASS
Harness #614 / run 34335868609: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

Final public-root hardening head:

```text
45d9f4cf0c53cda87937493bf8bb3a0c25f64a5f
CI #675 / run 34339695836: PASS
Harness #617 / run 34339695827: PASS
Harness job 102427316176 step 10: PASS
Harness job 102427316176 step 11: PASS
```

That head freezes an explicit package-root public allowlist and keeps internal
normalization, dispatcher, provider-port, replay/source-conformance helpers and
package-stage markers out of the Alpha semver surface.

Acceptance-audit exact head:

```text
97d7904d2fe1ac7c54bbbb0b81ac931ee58e8117
CI #676 / run 34340038589: PASS
Harness #618 / run 34340038525: PASS
Harness job 102428421525 step 10: PASS
Harness job 102428421525 step 11: PASS
```

All DPA-001..036 requirements are satisfied at that exact acceptance head.

## Accepted R1-002 public API boundary

The Alpha TypeScript API intentionally exposes one curated package-root entry:

```text
createDshRc5Adapter(ctx, options): DshRc5Adapter
```

Accepted public behavior includes:

- required `digest(value: unknown): string`;
- optional diagnostic-only `onObservationFailure`;
- no public deterministic `now`/clock seam;
- dedicated `DshRc5Adapter`, not public inheritance from broad M2
  `HarnessRuntimeAdapter`;
- no public filesystem/subprocess provider ports;
- explicit metadata, observation/audit, policy, monotonic-guard, turn-stopping,
  approval and completion-steering methods;
- aggregate asynchronous `dispose()`;
- atomic construction rollback after partial Harness registration failure;
- lifecycle `LIVE -> DISPOSING -> DISPOSED`;
- idempotent/concurrent-safe aggregate disposal;
- Adapter-owned child/root resource cleanup without disposing caller-owned
  Harness Context/services/agents/listeners;
- stable `INVALID_ADAPTER_OPTIONS` and `ADAPTER_DISPOSED` Adapter errors;
- post-dispose operations fail before initiating new Harness work;
- existing fail-closed policy/approval/guard/final-result/audit semantics remain
  owned by the already accepted internal rc5 binding.

## R1-002 non-claims / excluded work

R1-002 does not:

- make `@dsh-safe/adapter-dsh` publishable;
- implement R1-003 plugin/bootstrap integration;
- set package `exports`/`types`/`files` or remove `private: true`;
- implement external tarball consumer smoke or compatibility-range policy;
- implement release pipeline, versioning, provenance, registry publish or GitHub
  Release;
- resume M5-003+;
- claim process isolation, arbitrary in-process plugin sandboxing, complete
  host-effect mediation or external-effect rollback;
- authorize PR #3 merge.

Those later concerns remain assigned to R1-003..008 and later security/runtime
milestones.

## Current governance transition

The only authorized repository change after the accepted audit head is the
R1-002 governance transition, restricted to:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # append-only
docs/roadmap.md           # only R1-002 acceptance marker/details
```

No production source/test, Spec/corpus/Schema, Shared TCK, dependency/lockfile,
Harness baseline/workflow, package publication metadata, R1-003+, M5-003+,
registry/GitHub Release or merge change belongs in this transition.

The resulting governance exact head must itself pass, on the same SHA:

```text
normal CI
+
Harness source-conformance step 10 pinned-source typecheck
+
Harness source-conformance step 11 real rc5 runtime conformance
```

Until that exact-head evidence is green:

```text
R1-002 GOVERNANCE NOT CLOSED
R1-003 NOT AUTHORIZED
```

## Next allowed action

Verify the final R1-002 governance exact head only. If normal CI and exact pinned
Harness steps 10/11 are all green, R1-002 becomes **GOVERNANCE CLOSED** and
`R1-003 P0 — DeepSeek plugin/bootstrap integration` becomes the sole newly
authorized Gate. R1-003 must then begin protocol-first in a subsequent Gate step.

PR #3 must remain Open / Draft / unmerged unless explicit merge authorization is
provided.
