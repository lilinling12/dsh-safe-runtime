# M4-051 — Equivalent Shell Spelling String-Matcher Negative Boundary Contract

Status: **DRAFT NORMATIVE SPECIFICATION — PROTOCOL-FIRST / NOT ACCEPTED**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-051 P0 — equivalent shell spelling bypass string matcher test`  
Conformance profile: `M4-051_EQUIVALENT_SHELL_SPELLING_NEGATIVE_BOUNDARY_V1`  
Pinned Harness compatibility baseline: `0.1.0-rc.5` / `47f943859bef60e4160492346772ded9b24f765a`  
Depends on: accepted M4-011 shell classification, accepted M4-013 unknown-tool fallback, accepted M4-040/M4-041 ToolRuntime controls, accepted M4-050 negative-boundary honesty  
Separated from: M4-052 plugin-sandbox documentation, M5 audit ledger/privacy infrastructure, M6 workspace transaction, M14 process-isolated plugin host

## 1. Purpose

M4-051 freezes one explicit negative security fact already stated by the current
architecture and by M4-011:

```text
raw shell command string
  -> lexical/string matcher for an inferred nested effect
  -> equivalent effect spelling
  -> lexical matcher may miss the equivalent spelling
  -> EXPECTED_STRING_MATCHER_BYPASS
```

The Gate proves that a raw shell command string cannot be the **sole security
semantic** for inferring nested filesystem, network, secret, or other effects.
It does not introduce a better production shell parser in M4 and it does not
retrofit complete process-effect mediation.

M4-051 is a **negative-boundary evidence Gate**. The expected result is to show,
with benign test-owned evidence, that one deliberately narrow test-only lexical
matcher can recognize one spelling while an effect-equivalent spelling avoids the
matcher and still produces the same measured benign effect.

A conforming implementation MUST NOT make the negative test green by widening the
test matcher until it recognizes the chosen alternative spelling. That would test
the fixture against itself rather than establish the architectural limitation.

## 2. Existing authority remains unchanged

### 2.1 M4-011 owns shell tool classification

Spec 0027 recognizes exact `bash` and `pwsh` model-facing tools and classifies
accepted calls as exactly one `process.exec` requirement. Its command operand is:

```text
source: SHELL_COMMAND
rawCommand: exact accepted string
```

M4-011 explicitly requires command text to remain opaque and forbids parsing,
tokenizing, normalizing, rewriting, emulating, or pattern-matching it to infer
nested effects.

M4-051 converts that non-claim into executable negative evidence. It MUST NOT
change M4-011 or create a second shell classifier.

### 2.2 `process.exec` remains governed

M4-051 does **not** prove that an accepted `bash`/`pwsh` ToolRuntime invocation
bypasses the current Tool PEP. The shell tool call itself remains a
`process.exec` request and, when it reaches the accepted M4-040/M4-041 seams,
remains subject to the existing policy/guard/approval flow.

The bypass proven by this Gate is narrower:

```text
hypothetical nested-effect decision based only on raw command spelling
```

For example, a test-only matcher that tries to infer one filesystem write from a
literal command fragment can miss an effect-equivalent spelling. That does not
erase or downgrade the enclosing `process.exec` requirement.

A conformance report that says the shell process itself was unclassified,
implicitly allowed, or outside ToolRuntime merely because the nested matcher was
bypassed is `INVALID_EVIDENCE`.

### 2.3 M4-050 remains a different boundary

M4-050 proves direct in-process host filesystem access can occur completely
outside Harness ToolRuntime. M4-051 instead measures a shell call whose enclosing
process execution may still traverse ToolRuntime while a **string-derived nested
effect matcher** fails to recognize an equivalent spelling.

The two Gates MUST NOT be conflated:

```text
M4-050: host API bypasses ToolRuntime entirely
M4-051: shell process remains process.exec; lexical nested-effect inference is incomplete
```

## 3. Test-only matcher definition

M4-051 MUST use a deliberately narrow, deterministic, test-only matcher. The
reference profile is:

```text
LITERAL_DENY_SUBSTRING_V1
```

It consumes exactly:

```text
rawCommand: string
literal: non-empty string
```

and returns only:

```text
MATCH
NO_MATCH
```

Semantics are exact code-unit substring presence with no trim, case folding,
Unicode normalization, tokenization, quote interpretation, escape processing,
variable expansion, alias resolution, AST parsing, globbing, redirection parsing,
or shell execution.

The matcher exists only as a falsifiable oracle for this negative Gate. It MUST
NOT be added to production policy/classifier code, exported as a supported
security primitive, or described as a recommended mitigation.

## 4. Meaning of “equivalent shell spelling”

M4-051 does not attempt to prove universal semantic equivalence between arbitrary
shell programs. For this Gate, two spellings are **measured-effect equivalent**
only when the same controlled witness proves all of the following:

1. both operate only on the same test-owned disposable target;
2. the sentinel is absent before each isolated execution;
3. both use the same fixed synthetic non-secret payload;
4. each execution succeeds in the supported reference environment;
5. after each execution the sentinel contains exactly the same expected bytes;
6. no additional security claim is inferred from their textual similarity.

The accepted Bash reference witness SHOULD use a shell-defined redirection
placement difference or another simple, reviewable spelling difference whose
measured effect can be proven without accessing secrets or production paths.

The executable witness MUST NOT rely only on a reviewer saying that two commands
“look equivalent”. Exact observed benign effect evidence is required.

## 5. Required matcher asymmetry

For one coherent supported witness, the Gate MUST prove:

```text
referenceMatcherResult = MATCH
alternativeMatcherResult = NO_MATCH
referenceMeasuredEffect = exact expected benign effect
alternativeMeasuredEffect = exact same expected benign effect
classification = EXPECTED_STRING_MATCHER_BYPASS
```

The matcher literal MUST be fixed before the two matcher evaluations. It MUST NOT
be chosen after observing the alternative command merely to manufacture a miss.

The reference and alternative commands MUST be distinct exact strings. A test
that supplies the same string twice is `INVALID_EVIDENCE`.

## 6. Required boundary classifications

The M4-051 test/evidence result is exactly one of:

```text
EXPECTED_STRING_MATCHER_BYPASS
ENVIRONMENT_UNSUPPORTED
INVALID_EVIDENCE
```

These are Gate-local evidence classifications. They are not CapabilityDecision
effects, GuaranteeLevel values, policy effects, or new portable protocol enums.

### 6.1 `EXPECTED_STRING_MATCHER_BYPASS`

This is the required acceptance result for at least one supported exact-head
reference environment. It means the same witness proves:

- the reference spelling matches the fixed lexical matcher;
- the alternative spelling does not;
- the two exact command strings differ;
- both executions remain valid shell `process.exec` requests under M4-011;
- both produce the same exact controlled benign effect;
- the alternative therefore demonstrates a false negative for that lexical
  nested-effect matcher;
- no stronger parser, provider or isolation claim is fabricated.

`EXPECTED_STRING_MATCHER_BYPASS` MUST NOT be relabeled `ALLOW`, `DENY`,
`UNCLASSIFIED`, `EXPECTED_UNGOVERNED`, `SANDBOXED`, `TOOL_ENFORCED`,
`PROVIDER_ENFORCED`, or `PROCESS_ISOLATED`.

### 6.2 `ENVIRONMENT_UNSUPPORTED`

Use this only when the reference environment cannot execute the selected
controlled shell witness for reasons outside the measured matcher boundary, for
example the required shell is unavailable or an external CI/container policy
prevents creation of the disposable test target.

An external restriction is not proof that safe-runtime recognized the nested
effect. `ENVIRONMENT_UNSUPPORTED` MUST NOT be converted to `DENY`.

An unsupported-only matrix cannot accept M4-051; at least one supported exact-head
environment must produce `EXPECTED_STRING_MATCHER_BYPASS`.

### 6.3 `INVALID_EVIDENCE`

This classification is required when the evidence is contradictory or incomplete,
including when:

- the reference does not match the fixed test matcher;
- the alternative also matches it;
- the commands are identical;
- the sentinel already exists and provenance is ambiguous;
- one spelling fails to produce the exact expected bytes;
- the two measured effects differ;
- the enclosing shell call is incorrectly claimed to have escaped
  `process.exec` classification;
- a real secret, production path, or unrelated user file is used;
- the test rewrites production classification/policy logic to manufacture the
  expected result.

`INVALID_EVIDENCE` fails conformance.

## 7. Safe witness target

Executable evidence MUST operate only on a test-owned disposable target.

For every measured command execution:

1. use an isolated temporary root owned by that test;
2. prove the exact sentinel is absent immediately before execution;
3. use fixed non-secret synthetic bytes;
4. capture exact post-execution sentinel bytes;
5. clean up after evidence capture;
6. never read or modify credentials, `.env`, SSH material, tokens, production
   configuration, repository secrets, or unrelated user files.

The two spellings SHOULD execute in separately reset target state so the second
run cannot pass merely because the first run already created the sentinel.

## 8. No production shell string matcher

M4-051 MUST NOT add or widen a production command-string matcher.

In particular, this Gate MUST NOT add production logic based on:

```text
rawCommand.includes(...)
rawCommand.startsWith(...)
regular expressions over shell text
command allow/deny word lists
quote stripping
variable expansion emulation
shell AST parsing
shell alias tables
shell-command canonicalization
```

A future provider/process enforcement design may parse or normalize structured
process requests under a separately accepted contract. That does not make a
string matcher sound as the sole security boundary.

The architecture requirement remains:

```text
process.exec + provider-aware structured execution authority
```

rather than “dangerous-looking command text”.

## 9. No parser-completeness claim

M4-051 does not choose or validate a general Bash or PowerShell parser. It does
not claim that AST matching would be complete, because shell effects may also
arise through variables, functions, sourced files, executables, subprocesses,
interpreters, environment state, provider behavior, or external programs.

The Gate proves only the narrower proposition needed by the roadmap: equivalent
measured effect spelling can bypass a string-level matcher.

## 10. No policy or capability fabrication

The negative witness MUST NOT:

- turn the test matcher result into a synthetic CapabilityDecision;
- interpret `NO_MATCH` as policy allow;
- infer an `fs.*`, `net.*`, or `secret.*` CapabilityRequest solely from the raw
  command string and call that protocol authority;
- fabricate approval, Lease, Receipt, or audit identity;
- weaken the enclosing `process.exec` requirement;
- claim the nested filesystem effect was provider-mediated without provider
  evidence.

The test matcher is evidence about an unsafe strategy, not a PDP.

## 11. Relationship to M4-040/M4-041 PEP controls

For a real Harness shell-tool witness, conformance MUST distinguish:

```text
ToolRuntime shell execution / process.exec governance
```

from:

```text
test-only lexical nested-effect matcher
```

The witness MAY instrument the accepted ToolRuntime seams to prove the shell call
entered the existing process-execution control path. Such instrumentation is
observation-only and MUST NOT create a second authorization system.

A matcher bypass does not imply that the monotonic ToolRuntime guard was bypassed.
If the test claims that, it is measuring another boundary and is non-conforming.

## 12. Relationship to provider-aware enforcement

Current architecture states that production process enforcement must not use a
Shell String as the unique security semantic. Provider-aware process execution
owns concrete executable/cwd/environment/sandbox facts and later milestones may
introduce stronger structured mediation.

M4-051 does not implement that future PEP. It records why the future boundary is
necessary and prevents a lexical shortcut from being mistaken for equivalent
security.

## 13. Bash and PowerShell scope

M4-011 supports exact `bash` and `pwsh` tool names. M4-051's language-neutral
requirement applies to shell-language raw strings generally, but Gate acceptance
does not require every supported dialect to be executable on every CI host.

The initial real reference witness MAY use Bash because the repository's current
Linux CI environment can provide a supported Bash execution surface. Assertions
about PowerShell behavior require their own supported source/runtime evidence and
MUST NOT be guessed from Bash syntax.

A Bash witness does not authorize changing the accepted `pwsh` classifier.

## 14. Required repository/source audit

Conformance MUST establish these repository facts:

1. Spec 0027 makes `rawCommand` opaque and forbids nested-effect pattern matching;
2. the accepted `builtin-shell.ts` classifier preserves `rawCommand` and emits
   `process.exec` only;
3. repository production code does not currently install the M4-051 test-only
   literal matcher as a security boundary;
4. architecture documentation explicitly warns that equivalent shell spelling
   may bypass string-level matchers and forbids Shell String as the sole security
   semantic;
5. M4-050 remains a distinct direct-host-API boundary;
6. M4-052 remains responsible for the broader v0.1 “not a plugin sandbox”
   product documentation statement.

Repository search does not replace the real effect-equivalence witness.

## 15. Pinned Harness authority boundary

DeepSeek Harness source/runtime is compatibility evidence only for concrete shell
tool execution and ToolRuntime control-flow claims.

M4-051 MUST NOT make Harness source portable authority for Bash/PowerShell
language semantics. The measured effect is established by the controlled witness,
not by assuming an upstream implementation comment proves shell equivalence.

Any exact-source claim about `bash`/`pwsh` tool dispatch or ToolRuntime events MUST
use the pinned rc5 commit
`47f943859bef60e4160492346772ded9b24f765a`.

## 16. Conformance corpus

Language-neutral requirement corpus:

```text
fixtures/equivalent-shell-spelling-negative-boundary/cases.json
```

Profile:

```text
M4-051_EQUIVALENT_SHELL_SPELLING_NEGATIVE_BOUNDARY_V1
```

The corpus MUST cover at least:

- M4-011 shell command opacity;
- `process.exec` classification remains authoritative for recognized shell calls;
- architecture prohibition on Shell String as sole security semantic;
- test-only `LITERAL_DENY_SUBSTRING_V1` semantics;
- fixed matcher configuration before measurement;
- distinct reference and alternative command strings;
- reference `MATCH` and alternative `NO_MATCH`;
- test-owned disposable target;
- fixed synthetic non-secret bytes;
- absent-before proof for each isolated execution;
- exact same measured effect after both executions;
- exact `EXPECTED_STRING_MATCHER_BYPASS` classification;
- `ENVIRONMENT_UNSUPPORTED` semantics and acceptance limitation;
- contradictory/incomplete evidence -> `INVALID_EVIDENCE`;
- no inference that `NO_MATCH` means policy allow;
- no inference that the enclosing `process.exec` escaped ToolRuntime controls;
- no production matcher/parser/canonicalizer rewrite;
- no parser-completeness claim;
- separation from M4-050 direct-host bypass;
- separation from M4-052 plugin-sandbox documentation;
- exact pinned Harness evidence for Harness-specific claims;
- no secret-bearing fixture;
- no schema/protocol wire change;
- later Gates and PR merge remain unauthorized.

## 17. Acceptance expectation

M4-051 follows the repository protocol-first sequence:

1. publish this Spec and requirement corpus;
2. require normal CI + exact pinned Harness rc5 source-conformance dual-green on
   that exact protocol-first head;
3. only then add the smallest executable/source-conformance witness;
4. require at least one supported exact-head environment to produce
   `EXPECTED_STRING_MATCHER_BYPASS`;
5. review that the evidence proves a lexical-matcher limitation while preserving
   the enclosing `process.exec` governance truth;
6. publish an acceptance audit;
7. perform governance transition and closure only after their required exact-head
   evidence is green.

A test that passes because production code was changed to special-case the chosen
strings is non-conforming.

## 18. Explicit non-goals

M4-051 does not:

- parse or canonicalize arbitrary shell programs;
- add a production shell string matcher;
- infer nested filesystem/network/secret capabilities from raw shell text;
- change M4-011 `process.exec` classification;
- weaken M4-040/M4-041 ToolRuntime controls;
- claim every shell process bypasses ToolRuntime;
- claim a string matcher miss is policy allow;
- implement provider/process isolation;
- implement a plugin sandbox;
- implement workspace transaction/rollback (M6+);
- complete the v0.1 plugin-sandbox documentation Gate (M4-052);
- implement M14 process-isolated plugin hosting;
- change protocol schemas/types;
- change the pinned Harness baseline;
- authorize M4-052+;
- authorize M5, M6, M10, M13, M14 implementation, or M15;
- authorize PR #3 merge.

## 19. Protocol-first Gate boundary

The M4-051 protocol-first delta MUST be limited to exactly:

```text
specs/0051-m4-equivalent-shell-spelling-negative-boundary.md
fixtures/equivalent-shell-spelling-negative-boundary/cases.json
docs/handoff/CURRENT.md
```

Not authorized in this protocol-first commit:

```text
production TypeScript
source-conformance/runtime test implementation
package.json or pnpm-lock.yaml
schema/protocol wire changes
Shared TCK registration
HISTORY
roadmap M4-051 acceptance marker
Harness baseline/workflow changes
M4-052+
M5
M6
M10
M13
M14 implementation
M15
PR #3 merge
```

Executable/source-conformance work may begin only after the exact M4-051
protocol-first head reaches normal repository CI + exact pinned Harness rc5
source-conformance dual-green with PR #3 still Open/Draft and no unresolved
review blocker.
