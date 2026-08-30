# Engineering Handoff History

This is an append-only operational history. It is non-normative.

## 2026-08-17T17:43:00+08:00 — Establish repository-backed handoff

Repository continuity records were added during M2 so future work does not
depend on chat history.

Snapshot at the last verified implementation head
`7c4354e369aaf7097d7a5b25ed47ba452df5fc9b`:

- PR #1 remained open and Draft.
- normal CI passed;
- exact Harness source baseline remained
  `47f943859bef60e4160492346772ded9b24f765a` (`0.1.0-rc.5`);
- source-conformance successfully built pinned Harness, installed safe-runtime
  reproducibly, projected the exact workspace, and verified projection
  idempotence;
- source-conformance failed at step 10, the exact rc5
  binding/source-conformance TypeScript check;
- runtime conformance was skipped because the stricter typecheck failed first;
- the next action was therefore changed from runtime-failure debugging to
  obtaining and fixing the actual compiler diagnostic for the latest head.

The handoff policy requires future sessions to refresh live PR/head/workflow
state before acting and forbids using these snapshots to override normative
specification artifacts or weaken quality gates.

## 2026-08-17T18:43:00+08:00 — Close exact-source runtime prerequisite

The M2 exact-source prerequisite became fully green on implementation head
`4d089dedc1d15c71267474ae166360b5bf9821a9`.

Evidence:

- normal CI run `32022049143` (#38): PASS;
- exact Harness source-conformance run `32022049099` (#20): PASS;
- job `95363595323` steps 6–11 all passed, including exact-source TypeScript and
  real rc5 runtime conformance;
- exact Harness baseline remained
  `47f943859bef60e4160492346772ded9b24f765a` (`0.1.0-rc.5`).

The runtime blocker preceding this state was a Cordis fixture assertion that
read `fiber.parent` through a proxied injected Context. Pinned Cordis source
proved `ctx.inject()` already returns the direct child Fiber. The fixture was
corrected to keep its Context-only `inject()` API stable and add a narrowly
scoped `injectWithFiber()` path for lifecycle assertions. The fix changed only
source-conformance fixture mechanics, not adapter/protocol semantics.

A further real ToolRuntime conformance test was then added for the
`tools/result` authority boundary. It executes an agent-scoped tool, changes the
accepted content in `tools/post-execute`, and verifies the adapter's
`tool.completed.resultDigest` equals the final materialized ToolRuntime result.
The complete public Agent fixture uses real Session/Inbox instances and avoids
unsafe type escape hatches.

With the dual-green prerequisite and authoritative final-result test now
verified, the active M2 gate advances to the Filesystem / Subprocess Provider
Probe. PR #1 remains Draft; M2 is not Ready until the provider probe and M2
Acceptance Audit are complete.

## 2026-08-17T19:10:00+08:00 — Complete portable rc5 provider probe

The Filesystem / Subprocess Provider Probe closed on head
`39eaaada8186ad7555456d76aeed647d1a3d7e5f`.

Evidence:

- normal CI run `32022994277` (#41): PASS;
- exact source-conformance run `32022994262` (#23): PASS;
- job `95366391189` steps 6–11 all passed;
- exact-source TypeScript step 10 compiled the new
  `provider-seams.contract.ts` against the pinned upstream public packages;
- runtime conformance step 11 remained green.

The probe records several security-critical negative facts: local FS cwd is not
containment, `fs-sandbox` is mutation-only provider fencing rather than general
isolation, local subprocess filesystem effects bypass `ctx.fs`, sandbox policy
scope is file effects only, and a provider-reported `full` value is not by
itself environment attestation (a configured runner can assert it without the
built-in functional probe).

The active gate advances to the **M2 Acceptance Audit**. The audit must reconcile
the normative adapter spec, TCK/security expectations, stale roadmap tracking
items, and live CI evidence. PR #1 remains Draft until that audit either proves
M2 acceptance or identifies/fixes the remaining P0 blockers.

## 2026-08-17T20:49:00+08:00 — Acceptance audit closes B1/B2 remediation

The repository-backed M2 Acceptance Audit was recorded in
`docs/acceptance/m2-acceptance-audit.md`. It kept PR #1 Draft and identified four
P0 remediation items rather than treating green CI as semantic acceptance.

Two normative gaps were then remediated and verified on implementation head
`e53d13ba4531c9e315a0fd2e3f999cbf463d595c`:

- **P0-B1 completion steering budget**: `CompletionSteerRequest` now carries the
  caller-defined `maxRetries`; malformed budgets fail explicitly; over-budget
  steering fails with `COMPLETION_STEER_BUDGET_EXHAUSTED` before Harness
  `agent.steer()` is invoked; exact rc5 runtime conformance covers the positive
  boundary and negative exhausted-budget path.
- **P0-B2 sidecar correlation**: the adapter now exposes a minimal
  `SidecarEvidenceRecord` / `SidecarEvidenceSink` boundary keyed by durable
  Harness event ref/sequence and evidence ref/digest. Projection is allow-listed
  and explicitly omits `processLocalTokenRef`. Full ledger persistence, hash
  chaining, retention, and replay indexes remain later-milestone work.

A real intermediate CI failure was fixed from current-head evidence rather than
old logs: head `fd4e7c03ffe526cca10440933a9188d536b1454e` passed frozen install but failed
`pnpm check:all`; check-run annotations reported `Cannot find module
'@dsh-safe/protocol' or its corresponding type declarations.` The sidecar seam
was corrected to remain package-local/runtime-independent instead of weakening
TypeScript or frozen-install requirements.

Final evidence at `e53d13ba4531c9e315a0fd2e3f999cbf463d595c`:

- normal CI run `32031495534` / job `95392301947`: PASS;
- frozen install: PASS;
- `pnpm check:all`: PASS;
- exact rc5 source-conformance run `32031495546` / job `95392301956`: PASS;
- pinned upstream build, reproducible install, package projection,
  idempotence, exact-source TypeScript, and real rc5 runtime conformance all
  passed.

M2 is still **NOT ACCEPTED**. The active blocker advances to **P0-B3: minimal
operational Filesystem/Subprocess adapter ports**. P0-B4 exact-source
subagent/workflow reconnaissance remains after B3. M3 shared TCK and M4
Capability Broker remain unauthorized until M2 P0 remediation is complete.

## 2026-08-17T20:55:14+08:00 — Close B3 operational provider ports

P0-B3 closed on implementation head
`c5d42ac67cff40102de5b5e6a3aea459e646d7ba` with dual-green evidence.

The guarantee-only filesystem/subprocess markers were replaced by minimal
operational, runtime-independent ports:

- filesystem preserves opaque provider target identity and exposes only the M2
  resolve/stat/contains/readText/processPath seam;
- guessed/unresolved target identities fail explicitly rather than being
  interpreted as paths;
- subprocess exposes executable resolution and an explicit bounded
  collected-output spawn request;
- missing requested stdout/stderr collectors fail closed;
- both ports declare provider mediation while explicitly refusing to assert
  process/kernel isolation;
- filesystem/subprocess are recorded as sharing an execution world without
  claiming subprocess file effects traverse `ctx.fs`;
- raw Node streams, shell defaults, PTY policy, workspace transactions and
  broader sandbox semantics were not pulled into M2.

Exact-source `provider-seams.contract.ts` now proves the official pinned rc5
`FileSystem` and `SubprocessRuntime` public types bind directly to these
structural adapters. No concrete Harness type was promoted into protocol/core.

A real intermediate normal-CI failure on head
`04ab5764d127be6979976c96998de0a40e36ead2` was caused only by current-head
`TS7006` implicit-any diagnostics in new factory callbacks. Frozen install
passed. The fix added explicit parameter/return types; TypeScript strictness and
all validation requirements remained unchanged.

Final evidence at `c5d42ac67cff40102de5b5e6a3aea459e646d7ba`:

- normal CI run `32032290309` / job `95394774984`: PASS;
- frozen install and `pnpm check:all`: PASS;
- exact rc5 source-conformance run `32032290352` / job `95394780881`: PASS;
- source-conformance steps 6–11 all PASS, including exact-source TypeScript
  binding against official rc5 and real runtime conformance.

M2 remains **NOT ACCEPTED**. The active blocker advances to **P0-B4: minimal operational Filesystem/Subprocess adapter ports / exact-source subagent-workflow reconnaissance continuation**.

## 2026-08-18 — Close B4 and accept M2 P0 baseline

P0-B4 exact-source reconnaissance was completed against only the pinned Harness
commit `47f943859bef60e4160492346772ded9b24f765a`.

The public source confirms the accepted subagent/workflow compatibility seams while preserving the non-authoritative Harness boundary. M2 was accepted after P0-B1 through P0-B4 remediation and exact-head evidence; M2-017 remained deferred P1.

## 2026-08-18T17:22:00+08:00 — Enter M3 Shared TCK Foundation

Final M2 head `6a9c64155ec6c376908e64d70f2b50d5b8de1285` was rechecked before crossing the milestone boundary with normal CI #71 PASS and exact Harness rc5 source-conformance #53 PASS. M3 work moved to Draft PR #2 and began protocol-first.

## 2026-08-18T18:10:00+08:00 — Close M3-004 fake approval

M3-004 closed on implementation head `cc59a5db1045346792d823e56557d78438dd37c1` after Spec 0005, portable approval fixtures and deterministic TypeScript projection. CI #79 passed without weakening gates.

## 2026-08-19T09:18:00+08:00 — Close M3-005 deterministic fake tool runtime

M3-005 closed on implementation head `d5cc341594e79e7203d2203052db27f37984dfa7` after Spec 0006 and portable fake-runtime fixtures. CI #81 passed with architecture/schema/typecheck/test/lint gates intact.

## 2026-08-19T09:41:00+08:00 — Close M3-006 deterministic fake execution world

M3-006 closed on `de5d4e0cc7099cfa35d91211f81b87f2784ca5df`; fake filesystem/subprocess behavior remained inert and deterministic, and CI #86 passed cleanly.

## 2026-08-19T10:02:00+08:00 — Close M3-007 deterministic fault injection interface

M3-007 closed on `494e08de5b1304ef039c5a5462f083b7e76b8a29` with portable deterministic fault directives and CI #91 PASS.

## 2026-08-19T10:18:00+08:00 — Close M3-010 Adapter DSH turn lifecycle Shared TCK

M3-010 closed on `728f44e73ac61dba1b40d570f2458bd456d79bbc` with normal CI #99 and exact Harness source-conformance #58 PASS.

## 2026-08-21 — Accept M3 Shared TCK Foundation

M3 acceptance remediation closed on `e6522a18760268b56b09f9ac5d9c822671c41666`; normal CI #218 and exact Harness rc5 source-conformance #177 passed. The Shared TCK remained portable and externally consumable.

## 2026-08-22 — Accept M4-001 Capability Policy document loader

M4-001 closed at `9443d907b2b9db6819fe697a49abd6bf47bf1edf` with Spec 0017, bounded duplicate-aware JSON/YAML loading, CI #248 PASS and Harness #192 PASS.

## 2026-08-23 — Accept M4-002 CapabilityPolicy schema validation

M4-002 closed at `7b87c812fafab860d5ee95bebdfc706ec6e2ba06` with strict Draft 2020-12 validation, CI #260 PASS and Harness #204 PASS.

## 2026-08-23 — Accept M4-003 canonical resource normalization

M4-003 closed at `edd91190eb4489e7b73a8cc7fde05140939cb36d` with Spec 0019, 35 portable cases and fail-closed runtime hardening; CI #275/Harness #219 passed.

## 2026-08-23 — Accept M4-004 deterministic rule ordering

M4-004 closed at `69934dd62903b325b50e9f7b8df9849021e522b7` with Spec 0020, 37 portable cases and deterministic structural precedence; CI #291/Harness #235 passed.

## 2026-08-24 — Accept M4-005 deterministic effect resolution

M4-005 closed at `81e09435f1c038205977e740f8ac11c4d1bab796` with Spec 0021 and deterministic deny/ask/allow resolution; CI #304/Harness #248 passed.

## 2026-08-24 — Accept M4-006 defensive default deny

M4-006 closed at `de614120fdbf5c210c3b4f823d215a9ea89916b5` with Spec 0022 and fail-closed default deny; CI #320/Harness #264 passed.

## 2026-08-24 — Accept M4-007 deterministic policy effect explanation

M4-007 closed at `1c8bc9ef50a6c680a930814821267e76d79357ac` with Spec 0023 and deterministic explanation; CI #329/Harness #271 passed.

## 2026-08-25 — Accept M4-008 deterministic CapabilityPolicy diagnostics

M4-008 closed at `2aa8250f6c98b9853497481c08e584df866863ff` with Spec 0024; CI #335/Harness #277 passed.

## 2026-08-25 — Close M4-008 governance and authorize M4-009

Final M4-008 governance head `71046abef4568668ba9e3448b496430b5c48ebb7` reached CI #337/Harness #279 dual-green.

## 2026-08-25 — Accept M4-009 atomic CapabilityPolicy hot reload

M4-009 closed at `76dd50e731df617c1fafc1929be306f73458b7d4` with Spec 0025; CI #346/Harness #288 passed and acceptance record was dual-green.

## 2026-08-27 — Accept M4-010 built-in filesystem tool classification

M4-010 is accepted at implementation boundary on
`4be1fffc452358acf6a1af4dff5d849ea7868ec8` after protocol-first definition in
Spec 0026 and a 22-case portable fixture corpus.

The accepted classifier maps only exact pinned built-in filesystem tools to conservative `fs.*` effect envelopes and unresolved operands. Provider canonicalization/containment/execution remain out of scope. Exact implementation evidence: CI #351 / run `33036068127` PASS; Harness #293 / run `33036068108` PASS. Acceptance-record head `1222c9f903e1d6be42633f7e63e8a0d54cbaff2c` also reached CI #352/Harness #294 dual-green.

## 2026-08-28 — Accept M4-011 built-in shell tool classification

M4-011 is accepted at implementation boundary on `c8a5318220622e977e042b1585dcf183efff39e7` after Spec 0027 and a 22-case corpus. Exact `bash`/`pwsh` map to one `process.exec` requirement without inferring nested effects. CI #356/Harness #298 passed; acceptance-record `2d95d5b6904f24da226cd09e6e70a6a92507e27a` reached CI #358/Harness #300 dual-green.

## 2026-08-28 — Accept M4-012 MCP ToolAnnotations advisory metadata classification

M4-012 is accepted at implementation boundary on `debfce009c4d082aed6cd62646943e36242396e1` after Spec 0028 and a 19-case corpus. ToolAnnotations remain `ADVISORY_ONLY / UNVERIFIED_SERVER`; hostile proxy/accessor inputs fail closed. CI #366/Harness #308 passed; acceptance-record `18360fb464d66b7e1c427e23a4f6750144f1d2c3` reached CI #368/Harness #310 dual-green.

## 2026-08-30 — Accept M4-013 unknown-tool strict fallback resolution

M4-013 is accepted at the implementation boundary on
`bee673cb8463efa04ff314b93d56cfb785dc8b99` after protocol-first definition in
Spec 0029 and a 22-case portable corpus.

The resolver has one portable profile, `STRICT_DENY_V1`. It validates profile
and tool name before classifier dispatch, then composes the accepted built-in
filesystem classifier followed by the accepted built-in shell classifier.
Any owning classifier `CLASSIFIED` or `ERROR` result is preserved as-is. Only
when both classifiers return `NOT_APPLICABLE` does resolution produce
`UNCLASSIFIED / BLOCK / NO_APPLICABLE_CLASSIFIER`.

Unknown-tool arguments remain opaque: the resolver does not enumerate, clone,
spread, stringify, recursively traverse or retain them. MCP-looking public
names remain opaque; M4-012 advisory/unverified ToolAnnotations cannot grant
authority or weaken fallback. No synthetic capability, CapabilityDecision,
approval, lease, guarantee, plugin registry or PEP/enforcement claim is added.

Exact accepted implementation evidence at `bee673cb...`:

- normal CI #374 / run `33213727426`: PASS;
- exact Harness rc5 source-conformance #316 / run `33213727405`: PASS.

Acceptance audit commit is
`8dc19ffe482660b3f098653dbff7fe4bd96c1346`. Acceptance-record head is
`3e5c98813a94ef756135d5f4c3c0bc48c64962f5`, which reached normal CI #376 /
run `33278767205` PASS and exact Harness rc5 source-conformance #318 /
run `33278767065` PASS before this final governance record was prepared.

`docs/acceptance/m4-013-acceptance-audit.md` records M4-013 accepted at the
implementation boundary. This governance head is intentionally limited to
HISTORY, roadmap and CURRENT state. It must itself reach exact-head normal CI +
Harness rc5 dual-green before M4-014 is authorized. M4-020+ and M6 remain
unauthorized by this Gate.

## 2026-08-30 — Accept M4-014 deterministic plugin-supplied classifier API

M4-014 is accepted at the implementation boundary on
`4290249c282426e7e95aa0ad133ff17a7ca9a9c0` after protocol-first definition in
Spec 0030 and a 27-case portable corpus.

The accepted v0.1 extension seam uses immutable exact-name ownership. Built-in
filesystem and shell tool names are reserved; duplicate classifier IDs,
duplicate owned names and cross-classifier ownership conflicts are rejected
instead of resolved through hidden registration order, priority or first/last
wins. There is no regex/glob/prefix/fuzzy ownership or MCP public-name parsing.

Registry-aware resolution preserves accepted built-in `CLASSIFIED` and `ERROR`
results before plugin lookup. Exact plugin ownership is selected using only the
validated tool name, so unrelated callbacks never receive invocation arguments.
Only the selected owner receives the original opaque argument value. Owner
rejection, throw, asynchronous return or malformed output is terminal fail-closed
and never falls through to another classifier or an allow/ask path.

Plugin output is restricted to the already normative M4-010 filesystem and
M4-011 shell/process requirement grammars. Successful evidence is validated,
detached and recursively frozen. M4-014 creates no new capability vocabulary,
CapabilityDecision, PDP, approval, lease, receipt, guarantee, provider
containment, PEP enforcement or plugin-isolation claim.

The clarified protocol-first head
`979f1a2d60e90254a85a992e38f33bf13689be51` reached normal CI #382 / run
`33303563719` PASS and exact Harness rc5 source-conformance #324 / run
`33303563713` PASS before production implementation began.

Exact accepted implementation evidence at `4290249c...`:

- normal CI #388 / run `33303937406`: PASS;
- exact Harness rc5 source-conformance #330 / run `33303937405`: PASS.

Acceptance audit commit is
`ecfa7aa0e079835f57ae5c11dbbf7a46d7ec6ccb`. Acceptance-record head is
`290fa8d28d4823114b26fba942f1904dfd093e46`, which reached normal CI #391 /
run `33304165439` PASS and exact Harness rc5 source-conformance #333 /
run `33304165445` PASS before this final governance record was prepared.

`docs/acceptance/m4-014-acceptance-audit.md` records M4-014 accepted at the
implementation boundary. This final governance state changes only handoff/roadmap
bookkeeping; production classifier behavior remains unchanged. The final
governance exact head must itself reach normal CI + exact Harness rc5
source-conformance dual-green before M4-020 is authorized. M4-021+, M4-040+ and
M6 remain unauthorized by this Gate.
