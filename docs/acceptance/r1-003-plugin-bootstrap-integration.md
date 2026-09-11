# R1-003 DeepSeek Plugin / Bootstrap Integration Acceptance Audit

Status: **IMPLEMENTATION ACCEPTANCE CANDIDATE — GOVERNANCE CLOSURE NOT YET ESTABLISHED**  
Milestone: `R1 — DeepSeek Harness Plugin Alpha Release`  
Gate: `R1-003 P0 — DeepSeek plugin/bootstrap integration`  
Profile: `R1-003_DSH_PLUGIN_BOOTSTRAP_V1`  
Pinned Harness: `0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a`

## 1. Scope and authority

This audit applies Spec 0057 and portable cases DPB-001..DPB-032 to the reviewed
R1-003 implementation. It accepts only the programmatic native Cordis bootstrap
surface for the already accepted R1-002 Adapter API.

It does not make `@dsh-safe/adapter-dsh` publishable, does not finalize package
metadata or bare Loader configuration, does not perform R1-005 external tarball
smoke, does not define R1-006 compatibility/install ranges, does not implement
R1-007 release/provenance automation, does not resume M5-003+, does not publish a
registry artifact or GitHub Release, and does not merge or mark PR #3 Ready.

Authority remains:

```text
GitHub live exact-head state
> normative Specs / architecture / compatibility contracts
> Schema / Shared TCK
> accepted exact-head implementation/conformance evidence
> CURRENT / HISTORY / roadmap / PR body / chat
```

DeepSeek Harness remains compatibility/source-conformance evidence, not portable
safe-runtime protocol authority.

## 2. Predecessor and protocol-first authority

R1-002 final governance predecessor:

```text
3a5e8e780a09c6764eb4d966c4a42348817e0780
CI #677 / run 34394030179: PASS
Harness #619 / run 34394030180: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

R1-003 protocol-first exact head:

```text
fa89e3993c812aafa0325fab6b33dc339d7323dc
CI #678 / run 34425239915: PASS
Harness #620 / run 34425239924: PASS
```

The protocol-first authority froze:

```text
specs/0057-r1-dsh-plugin-bootstrap-integration.md
fixtures/dsh-plugin-bootstrap/cases.json
profile: R1-003_DSH_PLUGIN_BOOTSTRAP_V1
cases: DPB-001..DPB-032
```

No R1-003 production implementation preceded that same-head dual-green protocol
authority. Git ancestry confirms the reviewed implementation line descends from
`fa89e399...` without replacing that accepted ancestor.

## 3. Reviewed implementation delta

The production integration begins at:

```text
1a906ff3b1fe5a5d382928961d2b705c8c15c789
```

The implementation adds only the R1-003 bootstrap boundary and its exact-source
conformance support:

- `packages/adapter-dsh/src/plugin.ts` implements the Cordis-compatible factory;
- `packages/adapter-dsh/src/errors.ts` adds stable `INVALID_PLUGIN_OPTIONS`;
- `packages/adapter-dsh/src/index.ts` adds the curated plugin factory/types;
- source conformance covers the native rc5 lifecycle and public API allowlist;
- corpus coverage binds DPB-001..DPB-032 to explicit evidence;
- `packages/adapter-dsh/tsconfig.json` keeps Harness-facing source on the existing
  pinned-source compile topology instead of adding ambient shims or unpinned peer
  dependencies to ordinary CI.

The implementation deliberately does not modify `package.json` or
`pnpm-lock.yaml`, remove `private: true`, introduce package-publishing metadata,
or pull R1-004+ work into this Gate.

## 4. Public bootstrap and configuration surface

The package root now adds one runtime bootstrap value:

```ts
createDshRc5Plugin(options: DshRc5PluginOptions): DshRc5Plugin
```

and the narrowly required public types:

```text
DshRc5Plugin
DshRc5PluginOptions
DshRc5PluginPolicy
```

The factory returns a frozen native Cordis-compatible plugin object with stable
name:

```text
@dsh-safe/adapter-dsh/rc5
```

It remains a programmatic Alpha bootstrap. Required function-valued Adapter
configuration is not misrepresented as already serializable `cordis.yml` Loader
configuration.

The logical policy modes remain exactly:

```text
DENY_ALL
HANDLER(handler, optional monotonicGuard)
```

Omitted policy is semantically `DENY_ALL`.

## 5. Configuration validation and authority boundary

Plugin-owned configuration is inspected through own-property descriptors rather
than ordinary property reads. The factory rejects accessor-backed owned fields,
unexpected own string fields, symbol authority, malformed policy mode/handlers,
and unreadable or revoked Proxy configuration before successful activation.

The stable plugin-owned failure code is:

```text
INVALID_PLUGIN_OPTIONS
```

Nested Adapter validation remains owned by R1-002 and preserves:

```text
INVALID_ADAPTER_OPTIONS
```

The factory snapshots the selected mode and handler identities at construction
rather than allowing later caller mutation to silently rewrite an already-created
plugin's authority behavior.

No failure path needs to echo callback source, tool arguments, policy objects,
secrets or attacker-controlled configuration values.

## 6. Fail-closed default and monotonic veto

`DENY_ALL` constructs one R1-002 Adapter and registers both:

```text
registerToolPolicy()          -> DENY
registerMonotonicToolGuard()  -> DENY
```

using the same stable internal denial reason:

```text
safe-runtime plugin default deny
```

Activation preflights both `toolsPreExecute` and `toolsMonotonicGuard`; missing
required support fails explicitly rather than silently degrading to the
reorderable pre-execute listener alone.

Pinned rc5 runtime conformance proves a prepended ALLOW listener cannot reopen the
reached monotonic DENY, preserving the accepted M4 hard-veto boundary.

This is a ToolRuntime control property only. It is not arbitrary in-process
plugin sandboxing or complete host-effect mediation.

## 7. HANDLER and native ASK ownership

HANDLER mode registers the exact caller-supplied `ToolPolicyHandler` once through
the accepted R1-002 Adapter surface. ALLOW, DENY and ASK remain delegated to the
already accepted M4-040/R1-002 semantics rather than being reimplemented by the
plugin.

An optional monotonic guard is registered only when explicitly supplied. The
plugin does not derive a synchronous guard from the policy handler and does not
reinterpret ASK as a hard DENY.

The source boundary contains no plugin call to:

```text
adapter.requestApproval(...)
```

Pinned runtime conformance proves one reached ASK follows the native owner path:

```text
Adapter ASK
-> ToolRuntime.serviceAsk()
-> ctx.approval.request(...)
-> native ApprovalService outcome
```

Exactly one `approval/request` is observed for the reached ASK fixture. Agent-less
ASK remains fail closed with no synthesized approval owner and no tool-body entry.

No second approval provider, grant cache, remembered-grant store, retry loop or
policy runtime is introduced.

## 8. No premature CapabilityPolicy composition

R1-003 deliberately does not map ToolRuntime arguments directly into portable
Capability resources or provider identities.

Static conformance verifies the plugin implementation does not introduce
premature authority constructs including:

```text
CapabilityPolicy
EXECUTION_ROOT
workspace://
hostfs://
```

and does not guess executable/workdir/provider ownership in order to manufacture
an ALLOW/ASK result.

The accepted unresolved classifier/provider boundary remains intact. Full
Capability -> provider/resource -> PDP -> Lease -> decision/receipt -> execution
composition remains later integrated-runtime work rather than R1-003 bootstrap
behavior.

## 9. Activation atomicity and lifecycle ownership

Each successful mount constructs exactly one R1-002 Adapter on the Cordis plugin
Context and installs only the registrations required by the selected mode.

If a post-construction activation step fails, the plugin awaits Adapter disposal
before propagating failure. Cleanup failure remains observable rather than being
reported as successful activation.

On successful activation, the Cordis Fiber owns asynchronous cleanup that awaits:

```text
adapter.dispose()
```

Therefore:

```text
await fiber.dispose()
```

settles only after Adapter-owned aggregate teardown completes.

Runtime conformance verifies that disposal removes the old plugin handlers while
leaving the caller root Context and independent listeners usable. A later remount
has independent state; no process-global Adapter/plugin singleton is introduced.

The caller-owned Context, sessions, agents, services and independent approval
provider remain outside plugin ownership.

## 10. Compile topology and remediation history

The repository intentionally has two compile environments:

1. ordinary package/monorepo checks for runtime-independent source; and
2. exact pinned Harness source projection for Harness-facing binding/public/plugin
   integration.

`binding.ts`, `public-api.ts`, `index.ts` and the R1-003 `plugin.ts` remain on the
pinned-source topology rather than adding DeepSeek peer packages, ambient mocks,
or lockfile changes solely to satisfy ordinary CI.

First implementation head:

```text
1a906ff3b1fe5a5d382928961d2b705c8c15c789
CI #679 / run 34434418207: PASS
Harness #621 / run 34434418219: FAIL
```

Harness failed at the exact pinned source TypeScript step, so real runtime
conformance was not treated as passed.

A first conformance-only repair produced:

```text
8b92bfbddfa52df7bd14707b63733447d29221d6
CI #680 / run 34434869949: PASS
Harness #622 / run 34434869967: FAIL
```

The failing source-conformance fixture still directly asserted a deliberately
hostile `Record<string, unknown>` as `DshRc5PluginOptions`. Strict TypeScript
correctly diagnosed TS2352 because the static source type does not contain the
required `adapter` member and requires an explicit `unknown` boundary for an
intentional negative runtime fixture.

The final repair changed only that test boundary to:

```ts
accessorOptions as unknown as DshRc5PluginOptions
```

It did not weaken TypeScript, suppress diagnostics, modify production behavior,
add dependency shims, or change the pinned Harness baseline.

## 11. Final reviewed implementation evidence

Final reviewed implementation head:

```text
bbe3f18625de565564e57073599efd66baafd826
```

Exact-head evidence:

```text
CI #681 / run 34445638834: PASS
Harness #623 / run 34445638813: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

The PR was rechecked at that head and remained Open / Draft / unmerged.

Git compare from protocol-first `fa89e399...` to `bbe3f186...` confirms the
protocol authority remains an ancestor of the reviewed implementation line.

## 12. DPB-001..DPB-032 reconciliation

All 32 portable R1-003 cases are bound exactly once by the repository
source-conformance evidence map:

| Cases | Result | Reviewed evidence |
| --- | --- | --- |
| DPB-001..002 | SATISFIED | R1-002 governance predecessor is dual-green; PR #3 remains Draft/Open and R1-004+/merge remain unauthorized. |
| DPB-003..005 | SATISFIED | Curated package-root factory; real native `ctx.plugin(plugin)` mount; factory creation alone has no Harness side effects. |
| DPB-006..008 | SATISFIED | Hostile plugin-owned config rejects without accessor execution; nested Adapter validation remains R1-002-owned; mode/handler identity is detached at factory time. |
| DPB-009..012 | SATISFIED | Omitted policy equals fail-closed DENY_ALL; stable dual-deny reason; required feature preflight; prepended ALLOW cannot bypass reached monotonic veto. |
| DPB-013..015 | SATISFIED | Exact HANDLER registration preserves ALLOW/DENY and accepted handler failure behavior. |
| DPB-016..018 | SATISFIED | No duplicate approval call; one reached ASK uses exactly one native approval request; agent-less ASK fails closed. |
| DPB-019..020 | SATISFIED | Explicit monotonic guard is invoked once; no derived guard exists when omitted. |
| DPB-021..025 | SATISFIED | One Adapter per mount; activation rollback; Fiber-owned async teardown; root/independent resources survive; remount is isolated. |
| DPB-026..028 | SATISFIED | No guessed resource/provider composition, no duplicate lifecycle/policy/approval subsystem, same-process security/non-sandbox boundary retained. |
| DPB-029..030 | SATISFIED | Public export allowlist remains curated; package publishability/Loader UX remain unchanged and deferred. |
| DPB-031..032 | SATISFIED | Exact rc5 source/runtime gate is pinned and green; implementation descends from accepted protocol-first head. |

No unresolved R1-003 corpus case remains at the reviewed implementation head.

## 13. Security and release non-claims

R1-003 acceptance does not establish:

```text
process isolation
arbitrary in-process plugin sandboxing
complete host filesystem/process/network/secret mediation
external-effect rollback
provider/resource identity inference
complete Capability Broker PEP composition
future Harness-version compatibility
publishable npm package metadata
external tarball installability
bare cordis.yml Loader readiness
registry publication
GitHub Release readiness
```

The package remains private and release engineering remains owned by later R1
Gates. Fiber/Adapter disposal is lifecycle/resource cleanup and does not undo an
external effect already initiated before disposal.

## 14. Acceptance verdict

At final reviewed implementation head:

```text
bbe3f18625de565564e57073599efd66baafd826
```

R1-003 implementation acceptance criteria are satisfied and DPB-001..DPB-032 are
fully reconciled.

Verdict:

```text
R1_003_IMPLEMENTATION_ACCEPTED
R1_003_GOVERNANCE_CLOSURE_PENDING
R1_004_NOT_YET_AUTHORIZED
```

This audit is a separate acceptance commit. Its own exact head must obtain normal
CI plus exact pinned Harness rc5 source/runtime conformance before the governance
closure patch may update CURRENT, append-only HISTORY and only the R1-003 roadmap
acceptance marker/details.

Acceptance is not authorization to mark PR #3 Ready, merge it, publish a package,
create a GitHub Release, resume M5-003+, or begin R1-004 before that governance
head is itself dual-green.
