# M4-013 Acceptance Audit — Unknown-Tool Fallback Resolution

Status: **ACCEPTED AT IMPLEMENTATION BOUNDARY**

Accepted implementation head:

```text
bee673cb8463efa04ff314b93d56cfb785dc8b99
```

Normative authority:

- `specs/0029-m4-unknown-tool-fallback-resolution.md`
- accepted M4-010 built-in filesystem classifier semantics
- accepted M4-011 built-in shell classifier semantics
- accepted M4-012 MCP ToolAnnotations advisory-only boundary
- safe-runtime protocol default-deny and capability-authority boundaries

Portable corpus:

- `fixtures/tool-classifier/unknown-tool-fallback-cases.json` — 22 cases.

Compatibility evidence only:

```text
DeepSeek Harness 0.1.0-rc.5
commit 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

## Acceptance result

M4-013 is accepted at the implementation boundary as the deterministic resolver
for the currently governance-closed built-in classifier set plus the portable
`STRICT_DENY_V1` unknown-tool fallback profile.

The accepted behavior is deliberately narrow:

1. validate the fallback profile first;
2. validate the model-facing tool name second;
3. invoke the accepted filesystem classifier;
4. preserve its `CLASSIFIED` or `ERROR` result as-is;
5. only after filesystem `NOT_APPLICABLE`, invoke the accepted shell classifier;
6. preserve its `CLASSIFIED` or `ERROR` result as-is;
7. only after both classifiers return `NOT_APPLICABLE`, return immutable
   `UNCLASSIFIED / STRICT_DENY_V1 / BLOCK / NO_APPLICABLE_CLASSIFIER`.

`BLOCK` is a mandatory pre-execution disposition. It is not evidence that a
runtime PEP has already enforced the decision. M4-040+ remains the owner of
`tools/pre-execute` enforcement integration.

## Live-state reconciliation

The acceptance review refreshed GitHub state before making this record.

At review time:

- PR #3: `OPEN / DRAFT / mergeable`;
- branch: `feat/m4-capability-broker`;
- exact head: `bee673cb8463efa04ff314b93d56cfb785dc8b99`;
- current main: `57430273e065be8d38807d67b175fa154c801d43`;
- submitted reviews: none;
- review threads: none.

GitHub compare reports the PR head as `ahead 150 / behind 2 / diverged` relative
to current `main`. This is ancestry-only drift, not source-tree content drift:
the compare merge-base `65870612d039ce026a6952c16d5e069b11bd24a7`
and `main@57430273e065be8d38807d67b175fa154c801d43` both point to tree
`ed0c142bf6bbd00f607cc169222f0bf67057fca5`.

Therefore the branch is not rebased or rewritten for this Gate. The acceptance
record must not describe the branch as `behind 0`; it records the exact ancestry
state honestly while preserving the existing reviewed ancestry.

The PR body is operationally stale because it still describes M4-010 as the
current Gate. It is not used as protocol or acceptance authority.

## Protocol-first evidence

The M4-013 protocol-first head is:

```text
7c1f5e650923475045e197e13b8c6d6baab0bc2c
```

It contains Spec 0029 and the reviewed 22-case portable corpus before production
implementation. Exact-head evidence:

- CI #371 / run `33213233181`: **PASS**;
- Harness rc5 source-conformance #313 / run `33213233223`: **PASS**.

This satisfies the protocol-first prerequisite for production implementation.

## Implementation delta audit

Compared with protocol-first head
`7c1f5e650923475045e197e13b8c6d6baab0bc2c`, the accepted implementation head
`bee673cb8463efa04ff314b93d56cfb785dc8b99` is three commits ahead and zero
behind.

The delta is limited to:

- `packages/capability-broker/src/tool-classifier/unknown-tool-fallback.ts`;
- `packages/capability-broker/src/tool-classifier/unknown-tool-fallback.test.ts`;
- `packages/capability-broker/src/index.ts`.

No schema, Shared TCK, dependency manifest, lockfile, Harness baseline,
architecture rule or protocol capability vocabulary changed in the implementation
delta.

## Spec 0029 conformance review

### Fallback profile

The resolver accepts only the exact primitive string:

```text
STRICT_DENY_V1
```

Every other runtime value fails closed with:

```text
ERROR / UNKNOWN_TOOL_PROFILE_INVALID
```

The profile check occurs before tool-name classification and before either
accepted classifier receives the argument value. There is no implicit default,
`ALLOW_UNKNOWN`, `ASK_UNKNOWN`, coercion or extensible profile registry.

### Tool-name boundary

After profile validation, `toolName` must be a primitive non-empty string.
Invalid values fail closed with:

```text
ERROR / TOOL_NAME_INVALID
```

The implementation does not trim, case-fold, Unicode-normalize, split prefixes,
parse namespaces or reverse model-facing MCP public names.

Whitespace-only non-empty names remain opaque and proceed through exact classifier
matching to strict fallback when no classifier owns the name.

### Current classifier composition

The resolver directly reuses the accepted M4-010 filesystem classifier and
M4-011 shell classifier. It does not copy their name sets, argument extraction,
capability mapping or error logic into a third classifier.

Composition is fixed:

```text
filesystem -> shell -> STRICT_DENY_V1 fallback
```

The current filesystem and shell name sets are reviewed and disjoint. This order
is deterministic composition for M4-013 only; the implementation does not expose
it as a generic precedence mechanism.

M4-014 remains the sole owner of dynamic/plugin classifier registration,
duplicate handling and general precedence/conflict semantics.

### Owning-classifier result preservation

For filesystem and shell classifiers alike:

- `CLASSIFIED` returns from the resolver unchanged;
- `ERROR` returns from the resolver unchanged;
- only `NOT_APPLICABLE` permits continued classifier composition.

Therefore malformed recognized calls do not degrade into generic unknown-tool
fallback. Examples include filesystem path errors and shell command/argument
errors, including stable revoked-Proxy argument errors from the owning classifier.

### Strict unknown fallback

Only the all-`NOT_APPLICABLE` path returns:

```text
{
  status: "UNCLASSIFIED",
  profile: "STRICT_DENY_V1",
  disposition: "BLOCK",
  reason: "NO_APPLICABLE_CLASSIFIER"
}
```

The result does not include tool name, arguments, MCP identity, schemas,
descriptions, annotations, stack text or attacker-controlled diagnostic values.

No synthetic capability, wildcard capability, resource, `CapabilityRequest`,
`CapabilityDecision`, approval, lease or guarantee is created.

## Portable fixture consumption

Production tests load
`fixtures/tool-classifier/unknown-tool-fallback-cases.json` directly, validate the
fixture record shape and duplicate IDs, assert the reviewed corpus length is 22,
and execute every fixture through `resolveToolClassification(...)`.

The corpus covers:

- filesystem `CLASSIFIED` preservation;
- shell `CLASSIFIED` preservation;
- filesystem recognized `ERROR` preservation;
- shell recognized `ERROR` preservation;
- ordinary unknown fallback;
- shell alias and case-variant rejection;
- filesystem case-variant rejection;
- opaque MCP-looking public names;
- null, array and nested unknown arguments;
- invalid null/allow/ask/case-changed/object/array fallback profiles;
- invalid numeric and empty tool names;
- whitespace-only tool names without trimming;
- invalid-profile precedence over recognized-tool argument validation.

No portable fixture is shadow-copied into production test data.

## Hostile-runtime and privacy review

Runtime-only tests additionally prove the JSON corpus cannot express the
following boundaries:

- invalid profile returns before hostile argument descriptor inspection;
- invalid tool name returns before hostile argument descriptor inspection;
- unknown exact names do not execute argument getters;
- unknown exact names do not trigger `ownKeys` traps;
- revoked Proxy arguments on unknown names do not throw and still produce strict
  fallback;
- revoked Proxy arguments on recognized filesystem names preserve the filesystem
  fail-closed error;
- revoked Proxy arguments on recognized shell names preserve the shell fail-closed
  error;
- resolver-owned M4-013 results are frozen;
- unknown fallback results do not retain caller argument graphs;
- MCP-looking names remain opaque even when arguments contain safety-looking
  ToolAnnotations.

The two accepted built-in classifiers perform exact name ownership checks before
argument-record inspection. Consequently an unknown tool does not require
`Array.isArray`, property-descriptor inspection, enumeration, spread, clone,
stringification or recursive traversal of the argument graph.

The resolver itself retains neither caller arguments nor attacker-controlled tool
objects. Valid tool names are primitive strings; invalid non-primitive names fail
before argument inspection.

## Immutability and singleton review

M4-013's resolver-owned profile error, tool-name error and strict fallback values
are immutable frozen constants. They contain only fixed protocol strings and no
caller-controlled references.

Using frozen singletons for these value-only results does not create mutable
shared state, object-retention risk or nondeterminism. Existing M4-010/M4-011
results retain their own established immutability contracts, and the resolver
returns owning-classifier `CLASSIFIED`/`ERROR` objects as-is rather than wrapping
or weakening them.

## MCP boundary review

A name such as:

```text
mcp__weather__forecast
```

is treated as an opaque model-facing string. M4-013 does not:

- recognize `mcp__` as a trusted prefix;
- derive `(serverName, rawName)` from the public name;
- invoke M4-012 based on name shape;
- infer capability requirements from annotations, description, input/output
  schema or text;
- reduce the `BLOCK` fallback because annotations look read-only,
  non-destructive, idempotent or closed-world.

M4-012 evidence remains `ADVISORY_ONLY / UNVERIFIED_SERVER` and cannot authorize
or classify an otherwise unknown tool.

## No-premature-abstraction review

The M4-013 delta introduces no:

- classifier registry;
- dynamic registration API;
- plugin callback surface;
- duplicate/overlap resolution mechanism;
- generic classifier precedence claim;
- subject resolution;
- full PDP evaluation;
- lease or approval flow;
- receipt/provenance flow;
- guarantee assignment;
- runtime PEP/enforcement hook;
- provider containment change;
- M6 workspace transaction behavior.

The package export remains a small explicit surface for the fixed resolver and
its portable types.

## Exact accepted-head evidence

At `bee673cb8463efa04ff314b93d56cfb785dc8b99`:

- normal CI #374 / run `33213727426`: **PASS**;
- exact Harness rc5 source-conformance #316 / run `33213727405`: **PASS**.

The normal CI verify job completed successfully, including frozen install and the
repository `pnpm check:all` Gate. The Harness workflow completed its exact-source
baseline checkout/build, reproducible safe-runtime install, workspace projection,
idempotence check, real rc5 typecheck and runtime conformance steps successfully.

No Gate was weakened to obtain green status.

## Acceptance findings

The review found no acceptance-blocking defect in the M4-013 production delta.
In particular:

- Spec 0029 and production composition agree;
- all 22 portable fixtures are consumed by production tests;
- hostile runtime requirements are covered;
- owning classifier `CLASSIFIED` and `ERROR` results are preserved;
- strict fallback occurs only after both accepted classifiers return
  `NOT_APPLICABLE`;
- unknown arguments remain opaque;
- no MCP-name parsing exists;
- no synthetic capability exists;
- no generic registry/plugin API exists;
- no PDP/approval/PEP/enforcement concern is pulled forward;
- public types keep the M4-013 boundary explicit;
- resolver-owned results are immutable and privacy-preserving;
- current deterministic filesystem-then-shell composition is not presented as a
  general overlapping-classifier precedence policy.

## Governance gate

This audit accepts M4-013 only at its implementation boundary.

The next meaningful state change must create an M4-013 acceptance-record head
that:

1. transitions the capability-broker package stage from implemented to accepted;
2. updates the non-normative current handoff to the verified M4-013 acceptance
   state and exact live ancestry facts;
3. makes no production classifier, schema, TCK, dependency, lockfile or security
   boundary change.

That new exact head must reach normal CI plus exact pinned Harness rc5
source-conformance dual-green.

Only after the acceptance-record head is dual-green may a separate final
governance commit append `docs/handoff/HISTORY.md`, mark only M4-013 accepted in
`docs/roadmap.md`, and update `docs/handoff/CURRENT.md` to authorize M4-014 as the
next Gate.

The final governance head must itself reach exact-head dual-green before M4-013
is governance-closed.

Until then:

```text
M4-013 implementation: ACCEPTED
M4-013 governance: PENDING
M4-014+: NOT AUTHORIZED
M4-020+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```
