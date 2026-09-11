# R1-002 Public DeepSeek Adapter API Acceptance Audit

Status: **IMPLEMENTATION ACCEPTANCE CANDIDATE — GOVERNANCE CLOSURE NOT YET ESTABLISHED**  
Milestone: `R1 — DeepSeek Harness Plugin Alpha Release`  
Gate: `R1-002 P0 — freeze public DeepSeek Adapter API`  
Profile: `R1-002_DSH_PUBLIC_ADAPTER_API_V1`  
Pinned Harness: `0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a`

## 1. Scope and authority

This audit applies Spec 0056 and portable cases DPA-001..DPA-036 to the reviewed
R1-002 implementation. It freezes the Alpha TypeScript construction/lifecycle
surface only. It does not make the package publishable, does not implement
R1-003 bootstrap integration or R1-004 package metadata, does not resume M5-003+,
does not publish a registry artifact or GitHub Release, and does not merge PR #3.

Authority remains:

```text
GitHub live exact-head state
> normative Specs / architecture / compatibility contracts
> Schema / Shared TCK
> accepted exact-head implementation/conformance evidence
> CURRENT / HISTORY / roadmap / PR body / chat
```

DeepSeek Harness remains compatibility/source-conformance evidence, not portable
protocol authority.

## 2. Predecessor and protocol-first evidence

R1-001 governance closure predecessor:

```text
4bb553651061b66176dfd1babe24c96fdd415995
CI #669 / run 34330477937: PASS
Harness #611 / run 34330477951: PASS
```

R1-002 protocol-first exact head:

```text
da133cadb64ae071b68e020ea15c0295f9ce9033
CI #670: PASS
Harness #612: PASS
```

The protocol-first delta was limited to:

```text
specs/0056-r1-dsh-public-adapter-api.md
fixtures/dsh-public-adapter-api/cases.json
docs/handoff/CURRENT.md
```

No production/test/package-publication work preceded that dual-green authority.

## 3. Implementation history and failure classification

The first managed-facade implementation candidate was:

```text
bebe55535e312619e2a52a6572b50a4a50fe3bc0
CI #671: FAIL
Harness #613: FAIL
```

Exact failed-job diagnostics were read before remediation. The failure was a
build-topology/typecheck problem: ordinary CI does not project the source-only
Harness peer packages, while the public facade intentionally imports the real rc5
binding. Additional strict-TypeScript diagnostics covered `void | Promise<void>`
disposal normalization, method receiver preservation and conformance assertion
typing.

The remediation did not add DeepSeek devDependencies, change the lockfile, add
ambient shims, weaken TypeScript strictness, weaken the compatibility baseline or
skip pinned source/runtime conformance. Instead it retained the established dual
compile topology: runtime-independent internals remain in ordinary package
checking, while Harness-facing `binding.ts`, `public-api.ts` and root `index.ts`
are checked against the exact projected rc5 source in the required Harness gate.

Remediation exact head:

```text
7243987d9f6222d52079d10deb848f992dbef89c
CI #672 / run 34335868629: PASS
Harness #614 / run 34335868609: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

## 4. Final public-root hardening

From `7243987d...` to the final reviewed implementation head, the delta is exactly
three files:

```text
packages/adapter-dsh/src/index.ts
packages/adapter-dsh/source-conformance/public-api.conformance.ts
packages/adapter-dsh/source-conformance/replay-reconciliation.conformance.ts
```

The root now uses an explicit allowlist. Its only runtime values are:

```text
createDshRc5Adapter
DshAdapterError
```

The root also exports only the types required to construct and use the curated
Adapter API: Adapter/options/error types; feature metadata; runtime/audit sinks and
subscriptions; policy/guard/approval/completion request, handler and result types;
and the common disposable type.

Historical workspace-private exports for normalization, dispatchers, provider
ports, replay/correlation/sidecar helpers, compatibility constants and
`PACKAGE_STAGE` are no longer root semver commitments. The one old replay
source-conformance consumer that genuinely needs replay/sidecar internals now
uses explicit package-internal deep imports instead of forcing those internals
back into the public root.

Final reviewed implementation head:

```text
45d9f4cf0c53cda87937493bf8bb3a0c25f64a5f
CI #675 / run 34339695836: PASS
Harness #617 / run 34339695827: PASS
Harness job 102427316176 step 10 pinned-source typecheck: PASS
Harness job 102427316176 step 11 real rc5 runtime conformance: PASS
```

## 5. Public construction and type surface

The public root exposes:

```ts
createDshRc5Adapter(ctx, options): DshRc5Adapter
```

`DshRc5AdapterOptions` exposes only:

```text
digest(value: unknown): string
onObservationFailure?(event, error): void
```

The deterministic `now` seam remains package-private/source-conformance-only and
has a negative TypeScript contract assertion.

`DshRc5Adapter` is a dedicated curated interface rather than a public extension of
M2 `HarnessRuntimeAdapter`. It exposes metadata, observation/audit, policy,
monotonic guard, turn-stopping, approval, completion steering and asynchronous
aggregate disposal. It does not expose the M2 filesystem/subprocess provider
ports.

The public-root conformance suite positively imports every root type required by
those methods and negatively asserts that `HarnessRuntimeAdapter` and
`FilesystemPort` are not importable from the root. It also verifies that the
runtime namespace contains only the two reviewed public values and that
`filesystem`/`subprocess` are absent from `keyof DshRc5Adapter`.

## 6. Lifecycle, ownership and construction atomicity

The managed public facade wraps the accepted internal rc5 binding rather than
creating a second policy/approval/audit/runtime subsystem.

Construction validates locally knowable options before Harness registration. A
managed Context records the root `ctx.on(...)` and `ctx.tools.guard(...)`
registration disposers used by the internal binding. If partial construction
fails, all registrations created by that attempt are rolled back before the
original construction error is propagated.

The public lifecycle is effectively:

```text
LIVE -> DISPOSING -> DISPOSED
```

`dispose()` sets `DISPOSING` synchronously, returns one shared Promise to all
concurrent callers, detaches tracked root registrations, disposes every still-live
Adapter-created child observation/audit/policy/guard/turn-stopping resource and
waits for those child disposal/drain boundaries before settling. The caller-owned
Context, services, agents and independent listeners are not owned or disposed.

Previously returned child handles remain idempotently disposable. Observation and
audit child `drain()` remain delegated to their accepted dispatcher boundaries.

Once disposal begins, all new registration/observation/Harness-action methods
first fail through `assertLive()` with stable `DshAdapterError` code
`ADAPTER_DISPOSED`; no new approval or steering action is initiated by such a
post-dispose call.

Invalid public options fail with `INVALID_ADAPTER_OPTIONS` before Harness
registration.

## 7. Existing fail-closed behavior preserved

R1-002 delegates policy, guard, approval, completion, event normalization and
audit semantics to the already accepted internal binding. The public facade does
not reinterpret those outcomes.

In particular, accepted behavior remains authoritative for:

- policy-handler failure resolving through the existing fail-closed DENY path;
- approval service absence resolving to `UNAVAILABLE`;
- unsupported approval outcomes and non-live Harness agents failing explicitly;
- monotonic hard-veto guard semantics;
- authoritative final tool-result mapping;
- approval uniqueness;
- Adapter-owned audit egress/redaction;
- contained observer/sink failure.

The public observation-failure callback is wrapped defensively: an exception from
that diagnostic callback is swallowed and cannot authorize execution or crash the
Harness event path.

## 8. DPA-001..DPA-036 reconciliation

All 36 portable R1-002 cases are satisfied by reviewed evidence:

| Cases | Result | Evidence |
| --- | --- | --- |
| DPA-001..002 | SATISFIED | R1-001 dual-green predecessor; PR #3 remains Draft/unmerged; later Gates remain unauthorized. |
| DPA-003..004 | SATISFIED | Root `createDshRc5Adapter`; exact rc5 root-import conformance compiles/runs. |
| DPA-005..008 | SATISFIED | Required digest; pre-registration validation; diagnostic-only callback containment; `now` negative type assertion. |
| DPA-009..011 | SATISFIED | Dedicated curated Adapter interface; no filesystem/subprocess; explicit metadata. |
| DPA-012..018 | SATISFIED | Public observe/audit/policy/guard/turn-stopping/approval/steering methods delegate to accepted rc5 binding semantics. |
| DPA-019..025 | SATISFIED | Aggregate async idempotent/concurrent-safe disposal, owned-root/child teardown, drain behavior and caller ownership boundary. |
| DPA-026..027 | SATISFIED | `assertLive()` gates new child creation and Harness actions with `ADAPTER_DISPOSED`. |
| DPA-028..029 | SATISFIED | Managed-registration construction rollback and no returned handle on failure. |
| DPA-030..033 | SATISFIED | Public error/type allowlist, hidden internals, positive and negative exact-rc5 root contract checks. |
| DPA-034 | SATISFIED | Spec/facade make no process-isolation, arbitrary-plugin-sandbox, full host-mediation or external-effect rollback claim. |
| DPA-035 | SATISFIED | Final exact head CI #675 + Harness #617, including steps 10 and 11. |
| DPA-036 | SATISFIED | Protocol-first exact delta remained authority-only until protocol dual-green. |

No unresolved R1-002 case remains.

## 9. Security/non-claims

R1-002 acceptance does not establish:

```text
process isolation
arbitrary in-process plugin sandboxing
complete host-effect mediation
network/secret mediation
external-effect rollback
future Harness-version compatibility
publishable package metadata
external tarball installability
```

Adapter disposal is lifecycle/resource cleanup. It does not undo an external
effect already initiated before disposal.

## 10. Acceptance verdict

At final reviewed implementation head:

```text
45d9f4cf0c53cda87937493bf8bb3a0c25f64a5f
```

R1-002 implementation acceptance criteria are satisfied and DPA-001..DPA-036 are
fully reconciled.

Verdict:

```text
R1_002_IMPLEMENTATION_ACCEPTED
R1_003_NOT_YET_AUTHORIZED
```

A separate governance-closure patch must still update the append-only handoff
history and roadmap state and must itself obtain normal CI plus exact pinned
Harness source/runtime conformance on one exact SHA before R1-003 can begin.
