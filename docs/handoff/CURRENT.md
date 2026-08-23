# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-23`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m4-capability-broker`
- Stacked base: `feat/m3-shared-tck-foundation@65870612d039ce026a6952c16d5e069b11bd24a7`
- M2 acceptance: **ACCEPTED**
- M3 acceptance: **ACCEPTED**
- M4-001 acceptance: **ACCEPTED AT IMPLEMENTATION BOUNDARY**
- M4-002 acceptance: **ACCEPTED AT IMPLEMENTATION BOUNDARY**
- M4-003 acceptance: **ACCEPTED AT IMPLEMENTATION BOUNDARY**
- M4-004 acceptance: **ACCEPTED AT IMPLEMENTATION BOUNDARY**
- M4-004 acceptance record: `docs/acceptance/m4-004-acceptance-audit.md`
- Accepted M4-004 implementation head: `69934dd62903b325b50e9f7b8df9849021e522b7`
- M4-004 normal CI: **PASS — CI #291 / run `32607126915`**
- M4-004 Harness rc5 source-conformance: **PASS — #235 / run `32607126899`**
- Next gate after final governance verification: **M4-005 P0 — deny / ask / allow**

Live GitHub state always overrides this file. PR #3 remains intentionally stacked
on the final accepted M3 governance head so M4 work cannot mutate the accepted M3
evidence line.

## Accepted compatibility baseline

DeepSeek Harness remains an Adapter compatibility target, never protocol authority:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

M4 policy syntax, matching and decision semantics must not be inferred from
Harness APIs or runtime behavior.

## M4-004 acceptance boundary

Normative authority:

```text
specs/0001-safe-runtime-core.md
specs/0002-state-machines-and-precedence.md
specs/0019-m4-canonical-resource-normalization.md
specs/0020-m4-deterministic-rule-ordering.md
schemas/v1alpha1/capability-policy.schema.json
```

Acceptance record:

```text
docs/acceptance/m4-004-acceptance-audit.md
```

M4-004 closes the previously deferred portable resource-pattern and structural
precedence semantics without producing an authorization decision.

Accepted properties include:

1. `/` is a portable lexical hierarchy separator only, not provider containment;
2. `*` matches zero or more Unicode code points within one slash segment;
3. `**` matches zero or more complete segments and is valid only as an entire
   segment;
4. matching is whole-locator anchored and preserves empty slash segments;
5. `?`, brackets, braces and backslash have no shell-glob/escape semantics;
6. matching and identifier ordering use Unicode code-point semantics rather than
   JavaScript UTF-16 default string ordering;
7. specificity is exactly `(literalCodePoints DESC, globstarCount ASC,
   starCount ASC)`;
8. a rule with multiple matching selectors uses its most-specific selector;
9. optional priority is comparison-time only: explicit value or absent => `0`;
10. specificity always dominates priority;
11. equal structural precedence remains one band; rule-id order inside a band is
    deterministic presentation only, not authorization precedence;
12. rule-array and resource-selector declaration order cannot change semantic
    bands;
13. duplicate IDs/selectors, malformed wildcard syntax and invalid runtime
    priority values fail closed;
14. `providerIdentity` remains opaque and cannot alter lexical match/specificity;
15. `effect` is not required, inspected or selected by M4-004;
16. no-match returns successful empty bands, not a deny decision.

Production pattern matching is custom and iterative. It does not delegate
protocol semantics to a glob/regex/shell/path library and performs no filesystem,
URL, DNS, process, secret or provider resolution.

## M4-004 exact-head evidence

Accepted implementation head:

```text
69934dd62903b325b50e9f7b8df9849021e522b7
```

Normal CI #291 / run `32607126915`:

- `pnpm install --frozen-lockfile`: PASS;
- supply-chain lockfile policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- repository tests: PASS (31 files / 377 tests);
- M4-004 rule-ordering suite: PASS (19 tests);
- M4-004 resource-pattern suite: PASS (24 tests);
- M4-003 normalization regressions: PASS (38 + 2 tests);
- M4-002 validator regressions: PASS (6 tests);
- M4-001 loader regressions: PASS (18 tests);
- oxlint: PASS (0 warnings / 0 errors on 101 files);
- packed Shared TCK + external non-workspace consumer: PASS (44 registered assets).

Harness rc5 source-conformance #235 / run `32607126899`:

- exact pinned Harness public type build: PASS;
- reproducible safe-runtime install: PASS;
- exact workspace projection: PASS;
- projection idempotence: PASS;
- exact rc5 binding typecheck: PASS;
- real rc5 runtime conformance: PASS.

The preceding CI #289 exposed only strict TypeScript narrowing errors in internal
helper unions. They were corrected with explicit `ok` discriminants without
assertions, `any`, compiler relaxation, fixture changes or semantic weakening.

No schema, validator, pattern contract, TypeScript strictness, frozen lockfile,
supply-chain policy, architecture boundary, compatibility gate or security
invariant was weakened for acceptance.

## Governance closure rule

M4-004's implementation boundary is accepted, but the governance edits recording
that acceptance must themselves pass normal CI and exact Harness rc5
source-conformance before M4-005 begins.

Therefore:

```text
M4-001 implementation: ACCEPTED
M4-002 implementation: ACCEPTED
M4-003 implementation: ACCEPTED
M4-004 implementation: ACCEPTED
M4-005 implementation: NOT STARTED
M4-005 authorization: PENDING FINAL GOVERNANCE-HEAD DUAL-GREEN
M4-006+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

Do not start M4-005 production code until the final governance head containing
the M4-004 acceptance audit, package stage, roadmap, this handoff, append-only
history and PR description is dual-green.

## Next gate — M4-005 deny / ask / allow

After final governance dual-green, the next and only authorized gate is:

```text
M4-005 P0 — deny / ask / allow
```

M4-005 must begin protocol-first by re-reading Core §8.3, the deterministic
precedence profile and Spec 0020. It must consume M4-004 structural bands without
turning deterministic `ruleIds` presentation order into authorization precedence.

Existing semantics require any fully matching explicit deny to dominate globally;
otherwise effect selection occurs in the highest applicable structural band with
`ASK > ALLOW`. The exact full-rule matching inputs for that gate must be defined
normatively before production implementation.

M4-006 default-deny behavior, explain API, lease/approval routing, tool classifier,
PDP composition, plugin registration and Workspace Transaction behavior remain
later gates.

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- `specs/` is semantic authority; TypeScript packages are projections.
- DeepSeek Harness is an Adapter and cannot define Capability Broker semantics.
- Successful M4-001 loading is not policy validity or authorization.
- Successful M4-002 validation is not policy evaluation or authorization.
- Successful M4-003 normalization is not provider containment or authorization.
- Successful M4-004 resource matching/order is not a complete rule match or
  authorization decision.
- Filesystem containment is provider-owned; lexical wildcard matching is not a
  provider-enforcement proof.
- Do not weaken TypeScript strictness, schemas, compatibility baseline,
  validators, conformance tests, frozen installs, architecture/security gates or
  supply-chain checks for CI.
- M4-006+ and M6 remain unauthorized.

## Resume instruction

On the next work session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #3 live head and exact-head workflow results;
3. live GitHub evidence overrides this snapshot;
4. if M4-004 governance closure is not dual-green, finish it first;
5. only after final governance dual-green, begin M4-005 protocol-first by
   re-reading the existing effect precedence semantics before changing code;
6. inspect exact current-head diagnostics on any failure; never infer from stale
   logs;
7. do not start M4-006+ or M6 early.
