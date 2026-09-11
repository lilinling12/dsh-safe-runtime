# M4-051 Acceptance Audit — Equivalent Shell Spelling String-Matcher Negative Boundary

Status: **IMPLEMENTATION / CONFORMANCE ACCEPTED — AUDIT EXACT-HEAD VERIFICATION PENDING**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-051 P0 — equivalent shell spelling bypass string matcher test`  
Profile: `M4-051_EQUIVALENT_SHELL_SPELLING_NEGATIVE_BOUNDARY_V1`

## 1. Gate authority

Normative candidate:

```text
specs/0051-m4-equivalent-shell-spelling-negative-boundary.md
```

Requirement corpus:

```text
fixtures/equivalent-shell-spelling-negative-boundary/cases.json
ESSM-001..024
```

Pinned DeepSeek Harness compatibility baseline:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

M4-051 freezes a narrow negative security fact: a raw shell command string cannot
be the sole security semantic for inferring nested filesystem/network/secret or
other effects because an effect-equivalent spelling can evade a fixed lexical
matcher.

The Gate does not claim that the enclosing shell process is ungoverned. Accepted
M4-011 authority remains unchanged: recognized `bash` / `pwsh` calls are
`process.exec`, `rawCommand` remains opaque, and M4-040/M4-041 continue to own the
reached ToolRuntime control path.

## 2. Predecessor governance

M4-050 governance was fully closed before M4-051 began.

Governance transition head:

```text
7c93e12380ce0595192f423ec98e9f9b97b9385d
```

Evidence:

```text
CI #633 / run 34206675133: PASS
Harness #575 / run 34206675087: PASS
Harness job 101997661205 step 10 exact pinned-source typecheck: PASS
Harness job 101997661205 step 11 real rc5 runtime conformance: PASS
```

Closure-record head:

```text
b7c2cd457e932464c31e0eaae164a687114cf679
```

Evidence:

```text
CI #634 / run 34207079458: PASS
Harness #576 / run 34207079637: PASS
Harness job 101998971842 step 10 exact pinned-source typecheck: PASS
Harness job 101998971842 step 11 real rc5 runtime conformance: PASS
```

M4-051 repository modification therefore began only after the predecessor closure
record itself was exact-head dual-green.

## 3. Protocol-first candidate

Protocol-first exact head:

```text
15d7a7de5ab13e6b47a01c449295bb0a5dc1a3d2
```

Its exact delta from the predecessor closure contains only:

```text
specs/0051-m4-equivalent-shell-spelling-negative-boundary.md
fixtures/equivalent-shell-spelling-negative-boundary/cases.json
docs/handoff/CURRENT.md
```

No production TypeScript, executable/source-conformance tests, dependency,
lockfile, Schema, Shared TCK, workflow, HISTORY or roadmap acceptance marker
changed in the protocol-first commit.

Exact-head evidence:

```text
CI #635 / run 34207867737: PASS
Harness #577 / run 34207867755: PASS
Harness job 102001564039 step 10 exact pinned-source typecheck: PASS
Harness job 102001564039 step 11 real rc5 runtime conformance: PASS
```

Executable work therefore began only after the protocol-first exact head reached
the required dual-green boundary.

## 4. Existing authority and source review

Spec 0027 remains the shell-classification authority. It requires exact `bash` and
`pwsh` calls to classify as one `process.exec` requirement and preserves
`rawCommand` exactly as opaque shell-language input. It explicitly forbids
parsing, tokenizing, normalizing, rewriting, emulating or pattern-matching shell
text to infer nested effects.

The current production `builtin-shell.ts` implementation follows that contract:
it recognizes exact tool names, validates bounded own data fields, preserves the
raw command, and creates no nested filesystem/network/secret classification.

Repository architecture also explicitly states that equivalent shell spellings
may bypass string-level matchers and that a Shell String must not be the sole
security semantic for production process enforcement.

DeepSeek Harness remains compatibility evidence only for concrete tool/runtime
claims. No Harness implementation detail is promoted into portable Bash or
PowerShell language semantics by M4-051.

## 5. Final executable/source-conformance head

Final reviewed executable exact head:

```text
338aba9f4ca286721cf9703d9474bfde4496370f
```

It is exactly one fast-forward commit from the dual-green protocol-first head.
The net delta contains two files only:

```text
packages/adapter-dsh/source-conformance/m4-051-corpus-coverage.conformance.ts
packages/adapter-dsh/source-conformance/m4-051-equivalent-shell-spelling-negative-boundary.conformance.ts
```

Diff statistics:

```text
m4-051-corpus-coverage.conformance.ts                              +111 / -0
m4-051-equivalent-shell-spelling-negative-boundary.conformance.ts +197 / -0
```

No production implementation, package manifest, lockfile, Schema, portable
protocol wire, workflow, roadmap, HISTORY or later-Gate artifact changed in this
implementation/conformance delta.

## 6. Real supported effect-equivalence witness

The executable witness uses only a unique test-owned temporary directory, the
fixed sentinel name `sentinel.txt`, and the fixed synthetic payload:

```text
m4-051-benign-shell-witness
```

It fixes the test-only matcher literal before either evaluation and uses two
distinct Bash command strings whose measured target effect is intentionally
simple and reviewable:

```text
reference:   printf '%s' '<fixed-payload>' > sentinel.txt
alternative: > sentinel.txt printf '%s' '<fixed-payload>'
```

The Gate-local matcher is deliberately only exact substring presence. It yields:

```text
referenceMatcherResult = MATCH
alternativeMatcherResult = NO_MATCH
```

The matcher is test-only evidence about an unsafe strategy. It is not exported,
installed in production, treated as a PDP, or described as a recommended
mitigation.

## 7. Independent provenance and measured effect

The witness does not infer semantic equivalence from command appearance.

For the reference execution it proves the sentinel is absent, executes Bash with
that temporary directory as cwd, and reads the exact expected bytes afterward.
Before the alternative execution it removes the sentinel and explicitly proves
absence again. The alternative then independently executes and must recreate the
same exact bytes.

The accepted evidence is therefore:

```text
referenceCommand != alternativeCommand
referenceMatcherResult = MATCH
alternativeMatcherResult = NO_MATCH
referenceSentinelExistsBefore = false
alternativeSentinelExistsBefore = false
referenceCommandSucceeded = true
alternativeCommandSucceeded = true
referenceBytesAfter = exact expected bytes
alternativeBytesAfter = exact expected bytes
referenceBytesAfter == alternativeBytesAfter
classification = EXPECTED_STRING_MATCHER_BYPASS
```

This satisfies the supported-environment requirement without using credentials,
production paths, repository secrets or unrelated user files.

## 8. Classification integrity

`EXPECTED_STRING_MATCHER_BYPASS` is a Gate-local evidence classification only.
It is not added to CapabilityDecision, policy-effect, Receipt or GuaranteeLevel
vocabularies.

The local evidence classifier rejects contradictory evidence as
`INVALID_EVIDENCE`, including at least:

```text
identical command strings
reference matcher miss
alternative matcher hit
pre-existing alternative sentinel
mismatched alternative bytes
```

A matcher `NO_MATCH` is never interpreted as policy allow. Likewise, this Gate
does not relabel the enclosing shell process as unclassified or ungoverned.

## 9. `process.exec` governance remains intact

M4-051 does not weaken M4-011, M4-040 or M4-041.

The negative proposition proven here is only:

```text
raw-command lexical matcher != complete nested-effect authority
```

It is not:

```text
shell process bypasses ToolRuntime
```

Recognized shell calls remain `process.exec` requests under accepted M4-011
semantics. If such a call reaches the accepted ToolRuntime controls, normal
policy/guard/approval authority remains applicable independently of whether a
test-only nested-effect string matcher recognizes a command spelling.

## 10. Corpus traceability

The companion coverage conformance test pins:

```text
profile: M4-051_EQUIVALENT_SHELL_SPELLING_NEGATIVE_BOUNDARY_V1
Harness: 0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
cases: ESSM-001..024 exactly once
```

Every corpus requirement is bound to an explicit evidence kind. Matcher
asymmetry, independent target provenance, exact post-state equivalence and the
final expected classification are grounded in the same real runtime witness;
architecture, existing-authority, pinned-source and gate-process claims remain
separate evidence categories.

## 11. Production-change review

No production change is required or justified by the M4-051 evidence.

The existing classifier already preserves shell command opacity and does not claim
nested-effect completeness. The architecture already rejects Shell String as the
sole security semantic.

Accordingly M4-051 does not add or widen production logic based on:

```text
rawCommand.includes(...)
rawCommand.startsWith(...)
regex allow/deny lists
quote stripping
variable-expansion emulation
shell AST matching
alias tables
shell command canonicalization
```

It also does not introduce provider mediation, process isolation or a plugin
sandbox.

## 12. Exact-head verification

Final executable/source-conformance exact head:

```text
338aba9f4ca286721cf9703d9474bfde4496370f
```

Evidence on that same SHA:

```text
CI #636 / run 34208412572: PASS
Harness #578 / run 34208412227: PASS
Harness job 102003343533 step 10 exact pinned-source typecheck: PASS
Harness job 102003343533 step 11 real rc5 runtime conformance: PASS
```

At acceptance review, PR #3 is Open, Draft and unmerged; its head is exactly the
reviewed executable SHA. `main` remains
`57430273e065be8d38807d67b175fa154c801d43`, equal to the PR base SHA, so no base
drift exists. GitHub reports no PR reviews and no inline review comments/threads.

## 13. Compatibility and security non-claims

M4-051 does not modify or claim:

```text
portable Capability schemas or wire types
M4-011 process.exec classification
M4-013 unknown-tool fallback
M4-040 tools/pre-execute authority
M4-041 monotonic guard authority
Harness 0.1.0-rc.5 pin
frozen lockfile or dependency graph
workflow behavior
complete shell parser semantics
complete nested-effect inference
provider-aware process mediation
process/kernel isolation
plugin sandboxing
filesystem transactionality / rollback
PowerShell equivalence from Bash-only evidence
M4-052 product documentation completion
M6 workspace transactions
M14 process-isolated plugin host
```

The Bash syntax used by the witness is runtime evidence for the controlled Linux
reference environment, not portable protocol authority for every shell dialect.

## 14. Gate separation

M4-051 acceptance does not authorize M4-052 repository work merely by creating
this audit.

The roadmap marker, append-only HISTORY and governance state must remain unchanged
until this audit commit itself reaches normal CI plus exact pinned Harness rc5
source-conformance dual-green.

PR #3 merge remains unauthorized without explicit user approval.

## 15. Acceptance decision

M4-051 implementation/conformance is **ACCEPTED** at:

```text
338aba9f4ca286721cf9703d9474bfde4496370f
```

because:

- M4-050 closure-record authority preceded M4-051 and was exact-head dual-green;
- protocol-first Spec/corpus/CURRENT preceded executable work and was exact-head
  dual-green;
- the executable delta contains only two source-conformance files and no
  production rewrite;
- the matcher is fixed, deliberately lexical, test-only and non-authoritative;
- the reference and alternative command strings are distinct;
- each execution independently begins with an absent test-owned sentinel;
- each execution succeeds and produces the same exact fixed benign bytes;
- the same fixed matcher reports reference `MATCH` and alternative `NO_MATCH`;
- the exact result remains `EXPECTED_STRING_MATCHER_BYPASS`, not policy allow,
  deny, ungoverned process execution or a stronger guarantee;
- M4-011 `process.exec` governance remains explicit and unchanged;
- contradictory matcher/provenance/effect evidence fails as `INVALID_EVIDENCE`;
- all ESSM-001..024 requirements are explicitly traceable;
- normal CI and exact pinned Harness typecheck/runtime are dual-green on the same
  final reviewed SHA;
- compatibility and security non-claims remain explicit.

This **audit commit itself is not yet accepted** until its own exact head passes
normal CI and exact pinned Harness source-conformance.

No M4-051 roadmap acceptance marker, HISTORY closure entry, M4-052 authorization
or PR merge state may change merely because this file was created.
