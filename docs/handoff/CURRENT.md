# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-30`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Main: `57430273e065be8d38807d67b175fa154c801d43`
- M4-001 through M4-013: **ACCEPTED / GOVERNANCE CLOSED**
- M4-013 final-governance head: `48e8a16ee747e620ffc16e2d57844874fe59ba1e`
- M4-013 final-governance exact-head gates: **DUAL-GREEN**
- M4-014 P1 plugin-supplied classifier API: **ACTIVE / PROTOCOL-FIRST**
- M4-014 production implementation: **NOT AUTHORIZED until the clarified protocol-first exact head is dual-green**
- M4-020+ PDP, M4-040+ PEP and M6: **NOT AUTHORIZED**

Live GitHub state overrides this file.

## Live ancestry note

The long-running PR has known ancestry-only drift relative to `main`. The compare
merge-base `65870612d039ce026a6952c16d5e069b11bd24a7` and
`main@57430273e065be8d38807d67b175fa154c801d43` point to the same source tree
`ed0c142bf6bbd00f607cc169222f0bf67057fca5`.

Do not rewrite, rebase or force-update accepted ancestry merely to make GitHub's
behind counter read zero.

## Accepted compatibility baseline

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness runtime behavior MUST NOT define Core protocol capability semantics,
provider containment, policy/PDP semantics, plugin precedence or authorization.

## M4-013 closure evidence

M4-013 final-governance head:

```text
48e8a16ee747e620ffc16e2d57844874fe59ba1e
```

Exact final-governance evidence:

- CI #377 / run `33302539105`: PASS;
- Harness rc5 source-conformance #319 / run `33302539079`: PASS.

Therefore M4-013 is governance-closed and M4-014 is authorized as the next
protocol-first Gate. No closure-only follow-up commit was created.

## M4-014 normative boundary

Normative profile:

```text
specs/0030-m4-plugin-tool-classifier-api.md
```

Initial spec commit:

```text
3f2f6b18d98fd43129e079f6713b89e3fb0f62bd
```

Portable corpus:

```text
fixtures/tool-classifier/plugin-classifier-cases.json
```

Portable corpus commit:

```text
ed25447e6082e681a488b64f7a97609aa1124cbe
```

Portable cases: `27`.

The first assembled protocol-first head was:

```text
f4d41277efd722396c28b8425dbb0765059e183a
```

Exact evidence for that head:

- CI #380 / run `33303317938`: PASS;
- Harness rc5 source-conformance #322 / run `33303317919`: PASS.

### Pre-implementation protocol clarification

Before writing production code, review found one wording defect: Spec 0030 called
the registry-aware `toolName` validation rule an "accepted" M4-013 rule even
though accepted M4-013 intentionally has its own older public input behavior.

The clarification commit is:

```text
0a87b68ae75ddbe92b0a63b4e9109a0c3cef69f3
```

It makes two non-implementation corrections:

1. non-blank / `MAX_TOOL_NAME_CODE_POINTS` validation is explicitly an **M4-014
   registry-aware resolver rule only**; accepted M4-013
   `resolveToolClassification()` behavior remains unchanged;
2. portable `generatedString`, `generatedNames`, and `generatedClassifiers`
   directives are explicitly fixture encoding that consumers expand before API
   invocation; those objects are never valid production registration values.

Because this clarification changes normative text, the clarified protocol-first
exact head must be dual-green before production implementation begins, even
though the earlier assembled protocol-first head was already dual-green.

## M4-014 composition semantics

The v0.1 design remains intentionally narrow:

```text
validate M4-014 registry-aware toolName
-> M4-010 built-in filesystem classifier
-> preserve CLASSIFIED / ERROR
-> M4-011 built-in shell classifier
-> preserve CLASSIFIED / ERROR
-> exact immutable plugin-owner lookup by toolName only
-> invoke at most one exact owner
-> validate/detach existing FS or SHELL_PROCESS family result
-> otherwise M4-013 STRICT_DENY_V1 terminal block
```

Plugin ownership is exact-string and finite. Accepted built-in names are
reserved. Registry construction rejects duplicate classifier IDs, duplicate
names inside one classifier, built-in claims and cross-classifier ownership
conflicts.

There is deliberately no registration-order precedence, first/last wins,
numeric priority, regex/glob/prefix/fuzzy matching, MCP public-name parsing, or
callback probing to discover ownership.

The registry chooses the owner using only validated primitive `toolName`.
Unrelated callbacks do not receive invocation arguments. The broker does not
enumerate, clone, stringify, recursively traverse or normalize arguments merely
to dispatch.

An exact owning callback is trusted in-process integration code and may inspect
its own invocation arguments. M4-014 is not a plugin sandbox and does not claim
`process-isolated` or provider-level enforcement.

A plugin may classify only into the already normative M4-010 filesystem or
M4-011 shell/process requirement grammars. It cannot invent network, secret,
external-effect or custom capability semantics.

Once an exact owner is selected, owner rejection/throw/async/malformed output is
a terminal fail-closed classification error and must not fall through.

## Portable bounds

```text
MAX_PLUGIN_CLASSIFIERS = 128
MAX_PLUGIN_TOOL_NAMES_PER_CLASSIFIER = 128
MAX_PLUGIN_TOOL_CLAIMS = 1024
MAX_CLASSIFIER_ID_CODE_POINTS = 128
MAX_TOOL_NAME_CODE_POINTS = 256
```

Bounds are measured in Unicode code points. Validation stops after exceeding the
relevant bound and must not materialize an input-sized code-point array merely
to count it.

## Current gate

The current candidate contains only Spec 0030, its 27-case portable corpus, the
pre-implementation wording/fixture-encoding clarification, and handoff updates.
There is still no production plugin registry or registry-aware resolver code.

Require exact-head dual-green from:

```text
normal CI
exact pinned Harness rc5 source-conformance
```

Only after this clarified exact head is dual-green may production implementation
begin.

If either workflow fails, inspect the exact failing job/step and fix only the
protocol-first defect. Do not weaken a gate and do not begin production
implementation while the clarified protocol-first head is red or pending.

## Boundaries that remain enforced

- Protocol/spec/portable fixtures precede implementation.
- Specs/schemas/TCK remain semantic authority.
- Harness remains Adapter compatibility evidence only.
- Accepted M4-013 `resolveToolClassification()` behavior remains unchanged.
- Built-in classifier `CLASSIFIED` and `ERROR` results cannot be shadowed.
- Unknown unowned tools still terminate at `STRICT_DENY_V1` block.
- No MCP public-name parsing or ToolAnnotations-based authorization.
- No plugin discovery/loading, hot mutation or global singleton registry in M4-014 v0.1.
- No synthetic/new capability vocabulary through plugin callbacks.
- No plugin isolation claim; host-privileged direct effects remain outside current tool enforcement.
- Subject resolution/full PDP remain M4-020/M4-021.
- Approval remains M4-023.
- Receipt/provenance remains M4-024.
- Guarantee assignment remains M4-025.
- Actual pre-execution PEP/enforcement remains M4-040+.
- M6 workspace transaction remains unauthorized.
- Never weaken schemas, validators, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, compatibility evidence or
  fail-closed behavior for CI.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads and exact-head workflows;
2. live GitHub state overrides this snapshot;
3. require the clarified M4-014 protocol-first exact head to be dual-green;
4. only then implement Spec 0030 + portable corpus semantics inside
   `@dsh-safe/capability-broker` with hostile runtime tests;
5. do not pull M4-020+, M4-040+ or M6 work forward.
