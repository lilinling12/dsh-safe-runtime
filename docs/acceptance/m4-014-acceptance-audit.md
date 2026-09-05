# M4-014 Acceptance Audit — Plugin-Supplied Tool Classifier API

Status: **ACCEPTED AT IMPLEMENTATION BOUNDARY**

Accepted implementation head:

```text
4290249c282426e7e95aa0ad133ff17a7ca9a9c0
```

Normative authority:

- `specs/0030-m4-plugin-tool-classifier-api.md`;
- accepted M4-010 built-in filesystem classifier semantics;
- accepted M4-011 built-in shell classifier semantics;
- accepted M4-013 strict unknown-tool fallback semantics;
- `@dsh-safe/protocol` standard capability vocabulary and repository security boundaries.

Portable corpus:

- `fixtures/tool-classifier/plugin-classifier-cases.json` — 27 cases.

Compatibility evidence only:

```text
DeepSeek Harness 0.1.0-rc.5
commit 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

## Acceptance result

M4-014 is accepted at the implementation boundary as the deterministic,
construction-time immutable extension seam for trusted in-process plugin tool
classifiers.

The accepted implementation is deliberately narrower than a general plugin
framework or policy engine. It provides only:

1. hostile-input-safe registry construction;
2. exact finite tool-name ownership;
3. collision rejection rather than dynamic precedence;
4. built-in-first composition;
5. invocation of at most one exact plugin owner;
6. validation/detachment of already normative filesystem or shell/process
   classification evidence;
7. fail-closed owner failure;
8. M4-013 strict block when no owner exists.

It does not authorize execution and does not create PDP, approval, lease,
receipt, guarantee, PEP, provider containment, plugin sandboxing or M6 behavior.

## Live-state reconciliation

The acceptance review refreshed GitHub live state before creating this record.

At review time:

- PR #3: `OPEN / DRAFT`;
- branch: `feat/m4-capability-broker`;
- exact implementation head: `4290249c282426e7e95aa0ad133ff17a7ca9a9c0`;
- base: `main@57430273e065be8d38807d67b175fa154c801d43`;
- submitted reviews: none;
- review threads: none.

The PR body remains operationally stale and still describes an earlier M4 Gate.
It is not used as protocol or acceptance authority.

The branch retains the previously reviewed ancestry-only drift relative to
`main`; no rebase or force rewrite is performed merely to change GitHub compare
counters.

## Protocol-first evidence

The first assembled M4-014 protocol-first head was:

```text
f4d41277efd722396c28b8425dbb0765059e183a
```

with:

- CI #380 / run `33303317938`: **PASS**;
- Harness rc5 source-conformance #322 / run `33303317919`: **PASS**.

Before production implementation, review found one normative wording defect:
Spec 0030 incorrectly described its new non-blank/code-point-bounded registry-
aware tool-name validation as an already accepted M4-013 rule. The spec was
clarified without changing M4-013 behavior and the portable fixture generation
directives were explicitly documented as fixture encoding rather than runtime
API values.

The clarified protocol-first exact head was:

```text
979f1a2d60e90254a85a992e38f33bf13689be51
```

with:

- CI #382 / run `33303563719`: **PASS**;
- Harness rc5 source-conformance #324 / run `33303563713`: **PASS**.

Production implementation began only after that clarified exact head was
dual-green.

## Implementation delta audit

Compared with clarified protocol-first head
`979f1a2d60e90254a85a992e38f33bf13689be51`, accepted implementation head
`4290249c282426e7e95aa0ad133ff17a7ca9a9c0` is six commits ahead and zero behind.

Its **net source delta** is limited to:

- `packages/capability-broker/src/tool-classifier/plugin-classifier-registry.ts`;
- `packages/capability-broker/src/tool-classifier/plugin-classifier-registry.test.ts`;
- `packages/capability-broker/src/index.ts`.

No schema, Shared TCK, protocol capability definition, dependency manifest,
lockfile, Harness pin, architecture boundary or provider implementation changed.

One intermediate implementation SHA failed strict TypeScript because an
`Array.isArray` result had been stored in a boolean before later descriptor
inspection, preventing TypeScript from preserving the object narrowing. That
superseded draft was replaced by the final hardened registry implementation;
no TypeScript, architecture, test, supply-chain or conformance Gate was weakened.
The accepted exact head is fully green.

## Exact ownership and precedence review

The registry accepts only a finite set of exact primitive tool-name claims.
Ownership is exact string equality with no:

- trimming after validation;
- case folding;
- Unicode normalization;
- prefix/suffix matching;
- glob/regex/fuzzy matching;
- MCP namespace parsing;
- registration-order precedence;
- first-wins or last-wins rule;
- numeric priority;
- callback probing.

All accepted built-in names are reserved:

```text
read
read_image
write
edit
glob
grep
str_replace_editor
bash
pwsh
```

A plugin cannot shadow a built-in. Duplicate exact ownership across plugins is a
registry construction error, and duplicate ownership within one registration is
also rejected.

Therefore load order cannot silently change which classifier is authoritative
for a tool invocation.

## Atomic registry construction review

`createPluginToolClassifierRegistry(...)` constructs the complete candidate
before publishing its frozen opaque handle.

Registration input is inspected using own-property descriptors and bounded dense
array validation. The implementation rejects:

- invalid registry containers;
- more than 128 classifiers;
- blank or oversized classifier IDs;
- duplicate classifier IDs;
- empty, malformed or oversized tool-name lists;
- blank or oversized tool names;
- more than 1024 aggregate ownership claims;
- reserved built-in names;
- duplicate local names;
- cross-classifier ownership conflicts;
- missing/non-callable callbacks;
- hostile unreadable descriptor/Proxy states.

No callback is invoked during registry construction.

The public `READY` object exposes no ownership map. Registry state is held behind
an implementation-private `WeakMap`, and caller-owned registration objects or
name arrays are not retained. Only copied primitive IDs/names and the callback
references intentionally required for later invocation are retained.

## Built-in preservation review

The registry-aware resolver performs:

```text
M4-014 tool-name validation
-> M4-010 filesystem classifier
-> preserve CLASSIFIED / ERROR
-> M4-011 shell classifier
-> preserve CLASSIFIED / ERROR
-> exact plugin lookup
-> exact owner or strict fallback
```

A plugin is never invoked for a recognized built-in result. In particular,
built-in malformed-input `ERROR` cannot degrade into plugin classification or
unknown fallback.

The accepted M4-013 `resolveToolClassification(...)` function was not modified.
M4-014's stricter non-blank/256-code-point invocation rule belongs only to the
new registry-aware resolver. Runtime regression tests prove a whitespace-only
name retains the accepted M4-013 strict-fallback behavior while the new M4-014
resolver returns `TOOL_NAME_INVALID`.

## Argument privacy and dispatch review

Plugin ownership is selected using only the validated primitive `toolName`.
The broker does not inspect arguments to discover plugin applicability.

For an unowned tool:

- no plugin callback runs;
- argument getters are not invoked;
- argument descriptor traps are not required;
- no clone/spread/stringification/recursive traversal occurs;
- the terminal result is the M4-013 strict block.

Only the exact owner receives the original argument value. That callback is
trusted in-process integration code; this is intentionally not represented as a
sandbox or process-isolated plugin boundary.

## Callback failure review

After exact ownership is selected, owner failure is terminal and cannot fall
through to another plugin or strict unknown fallback.

Stable mappings are:

```text
REJECTED              -> PLUGIN_CLASSIFIER_REJECTED
synchronous throw     -> PLUGIN_CLASSIFIER_THROWN
Promise / own thenable -> PLUGIN_CLASSIFIER_ASYNC_UNSUPPORTED
malformed result      -> PLUGIN_CLASSIFIER_RESULT_INVALID
```

Errors do not echo thrown values, stack text, callback source, tool arguments or
plugin-returned attacker-controlled values.

## Classification-family review

Plugin callbacks cannot create arbitrary portable capability semantics.
Accepted `CLASSIFIED` outcomes are restricted to the two already normative
families:

- filesystem requirements using standard `fs.*` capability vocabulary and
  M4-010 unresolved filesystem operand grammar;
- shell/process requirements using `process.exec` and the M4-011 unresolved
  shell-command/workdir grammar.

Unsupported values such as a fabricated `network.http` capability fail closed as
`PLUGIN_CLASSIFIER_RESULT_INVALID`.

The broker validates every accepted result using own-data shapes, reconstructs
new immutable nested values, and never exposes the callback-owned result object
as authoritative evidence.

## Result detachment and hostile-object review

Runtime tests prove that:

- registration accessors do not execute;
- inherited registration authority is rejected;
- sparse, named-property and symbol-bearing registration arrays fail closed;
- revoked registration proxies produce a stable unreadable error;
- post-construction caller mutation of an owned-name array does not change the
  registry;
- unowned calls do not expose hostile arguments to unrelated callbacks;
- callback throws are sanitized;
- native Promise and own-thenable returns are rejected as async;
- result accessors do not execute;
- plugin `CLASSIFIED` results are detached from mutable callback-owned arrays and
  operand objects;
- result, requirement arrays, requirements and operands are frozen;
- forged `{ status: "READY" }` handles are rejected because they have no internal
  registry state;
- accepted M4-013 behavior remains unchanged.

Portable tests directly consume all 27 JSON cases rather than maintaining a
shadow test copy. Declarative boundary generators are expanded by the fixture
consumer before registry invocation and are not accepted by the production API.

## Portable corpus review

The 27 portable cases cover:

- exact filesystem plugin classification;
- exact shell/process plugin classification;
- unowned strict fallback;
- case-sensitive ownership;
- reserved filesystem and shell built-in claims;
- cross-classifier ownership conflicts;
- duplicate local names;
- duplicate classifier IDs;
- blank/oversized classifier IDs;
- empty/blank/oversized tool-name claims;
- classifier-count, per-classifier-name and aggregate-claim limits;
- owner rejection;
- malformed classification result;
- unsupported capability semantics;
- built-in filesystem `CLASSIFIED` and `ERROR` preservation;
- built-in shell `CLASSIFIED` and `ERROR` preservation;
- registration-order equivalence;
- exact opaque MCP-looking names without namespace inference.

## Security-boundary review

M4-014 does not claim that plugin code itself is confined.

A registered classifier callback already executes inside the host process and
may directly call host APIs if the embedding application gave it those powers.
That remains outside the current tool-enforced classification guarantee and is
not mislabeled as `provider-enforced` or `process-isolated`.

The implementation introduces no:

- plugin module discovery/loading framework;
- mutable global registry;
- hot reload/watchers;
- remote classifier service;
- subject resolution;
- PDP decision construction;
- approval or lease flow;
- receipt/provenance flow;
- guarantee assignment;
- pre-execution PEP hook;
- provider containment claim;
- M6 workspace transaction behavior.

M4-020+ and M4-040+ therefore remain separate future Gates.

## Exact accepted-head evidence

At `4290249c282426e7e95aa0ad133ff17a7ca9a9c0`:

- normal CI #388 / run `33303937406`: **PASS**;
- exact Harness rc5 source-conformance #330 / run `33303937405`: **PASS**.

Harness #330 completed successfully through:

- exact safe-runtime checkout;
- exact pinned Harness source checkout;
- pinned pnpm setup;
- Harness public type-surface build;
- reproducible safe-runtime install;
- exact Harness workspace projection;
- projection idempotence verification;
- real rc5 binding typecheck;
- real rc5 runtime conformance.

No Gate was weakened to obtain green status.

## Acceptance findings

The review found no acceptance-blocking defect in the final M4-014 net
implementation delta.

In particular:

- protocol-first sequencing was preserved, including re-gating after the
  pre-implementation normative clarification;
- exact ownership is deterministic and registration-order independent;
- built-ins cannot be shadowed;
- built-in `CLASSIFIED`/`ERROR` results are preserved;
- no owner means strict M4-013 block;
- unrelated callbacks cannot inspect arguments;
- an exact owner's failure never falls through;
- output capability families are restricted to existing normative grammars;
- plugin output is detached and immutable;
- all 27 portable fixtures are consumed;
- hostile JavaScript boundaries are covered;
- M4-013 public behavior is unchanged;
- no plugin-isolation, PDP, approval, PEP or provider guarantee is overclaimed.

## Governance gate

This audit accepts M4-014 only at its implementation boundary.

The next state change must create an M4-014 acceptance-record head that:

1. changes the capability-broker package stage from implemented to accepted;
2. refreshes `docs/handoff/CURRENT.md` with the clarified protocol-first and
   accepted implementation exact-head evidence;
3. makes no production classifier behavior, protocol schema, Shared TCK,
   dependency, lockfile, Harness baseline or security-boundary change.

That acceptance-record exact head must reach normal CI plus exact pinned Harness
rc5 source-conformance dual-green.

Only then may a final governance commit append M4-014 acceptance to
`docs/handoff/HISTORY.md`, mark only M4-014 accepted in `docs/roadmap.md`, and
advance the roadmap to the next authorized Gate. The final governance head must
itself be dual-green.

Until those later transitions complete:

```text
M4-014 implementation: ACCEPTED
M4-014 governance: PENDING
M4-020+: NOT AUTHORIZED
M4-040+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```
