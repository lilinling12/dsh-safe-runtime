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
- M4-003 acceptance record: `docs/acceptance/m4-003-acceptance-audit.md`
- Accepted M4-003 implementation head: `edd91190eb4489e7b73a8cc7fde05140939cb36d`
- M4-003 normal CI: **PASS — CI #275 / run `32604956296`**
- M4-003 Harness rc5 source-conformance: **PASS — #219 / run `32604956288`**
- Next gate after final governance verification: **M4-004 P0 — deterministic rule ordering**

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

M4 policy semantics must not be inferred from Harness APIs or runtime behavior.

## M4-003 acceptance boundary

Normative authority:

```text
specs/0019-m4-canonical-resource-normalization.md
specs/0001-safe-runtime-core.md
specs/0002-state-machines-and-precedence.md
schemas/v1alpha1/defs.schema.json#/$defs/resource
```

Acceptance record:

```text
docs/acceptance/m4-003-acceptance-audit.md
```

M4-003 defines a structural, rejecting resource-normalization boundary. It
canonicalizes the portable structure without inventing host/provider semantics.

Accepted properties include:

1. exact standard lowercase resource schemes only;
2. exact-resource `scheme` / `locator` / optional opaque `providerIdentity`;
3. policy selector parsing at the first literal `://` only;
4. locator/pattern/provider token content preserved without trim, Unicode
   normalization, case-folding, URL decoding, path resolution or realpath;
5. 4096 **Unicode code-point** bound, directly tested with BMP and astral input;
6. C0 controls and `U+007F` fail closed;
7. provider identity remains opaque and is never parsed into a path/URI or used by
   string prefix as a containment proof;
8. inherited prototype fields never become resource authorization input;
9. own `providerIdentity: undefined` is invalid rather than silently treated as
   absent;
10. unexpected exact-resource own fields fail closed;
11. returned TypeScript values are detached/frozen and normalization is
    idempotent;
12. wildcard matching, specificity, deterministic rule ordering, effects and
    default-deny evaluation remain absent.

The production normalizer contains no Harness, filesystem/path, URL/DNS,
executable lookup or secret-dereference dependency. Provider-backed filesystem
identity/containment remains an Adapter/runtime responsibility through the
accepted provider seam.

## M4-003 exact-head evidence

Accepted implementation head:

```text
edd91190eb4489e7b73a8cc7fde05140939cb36d
```

Normal CI #275 / run `32604956296`:

- `pnpm install --frozen-lockfile`: PASS;
- supply-chain lockfile policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- repository tests: PASS (29 files / 334 tests);
- M4-003 portable normalizer suite: PASS (38 tests);
- M4-003 runtime object-boundary suite: PASS (2 tests);
- M4-002 validator regressions: PASS (6 tests);
- M4-001 loader regressions: PASS (18 tests);
- JSON parser regressions: PASS (9 tests);
- oxlint: PASS (0 warnings / 0 errors);
- packed Shared TCK + external non-workspace consumer: PASS (44 registered assets).

Harness rc5 source-conformance #219 / run `32604956288`:

- exact pinned Harness public type build: PASS;
- reproducible safe-runtime install: PASS;
- exact workspace projection: PASS;
- projection idempotence: PASS;
- exact rc5 binding typecheck: PASS;
- real rc5 runtime conformance: PASS.

No schema, validator, fixture expectation, TypeScript strictness, frozen lockfile,
supply-chain policy, architecture boundary, compatibility gate or security
invariant was weakened for acceptance.

## Governance closure rule

M4-003's implementation boundary is accepted, but the governance edits recording
that acceptance must themselves pass normal CI and exact Harness rc5
source-conformance before M4-004 begins.

Therefore:

```text
M4-001 implementation: ACCEPTED
M4-002 implementation: ACCEPTED
M4-003 implementation: ACCEPTED
M4-004 implementation: NOT STARTED
M4-004 authorization: PENDING FINAL GOVERNANCE-HEAD DUAL-GREEN
M4-005+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

Do not start M4-004 production code until the final governance head containing
the M4-003 acceptance audit, package stage, roadmap, this handoff, append-only
history and PR description is dual-green.

## Next gate — M4-004 deterministic rule ordering

After final governance dual-green, the next and only authorized gate is:

```text
M4-004 P0 — deterministic rule ordering
```

Before defining or implementing M4-004, re-read the existing deterministic
precedence specification, CapabilityPolicy schema and relevant M1 semantics.
Do not infer precedence from JavaScript array/object behavior, Harness behavior,
incidental implementation ordering, or roadmap shorthand.

M4-004 must remain limited to deterministic rule ordering. M4-005 deny/ask/allow
effect behavior, M4-006 default-deny evaluation, lease/approval routing, plugin
registration and Workspace Transaction behavior remain later gates.

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- `specs/` is semantic authority; TypeScript packages are projections.
- DeepSeek Harness is an Adapter and cannot define Capability Broker semantics.
- Successful M4-001 loading is not policy validity or authorization.
- Successful M4-002 validation is not policy evaluation or authorization.
- Successful M4-003 normalization is not a match, precedence decision or
  authorization.
- Filesystem containment is provider-owned; string-prefix tests are not
  containment proofs.
- Do not weaken TypeScript strictness, schemas, compatibility baseline,
  validators, conformance tests, frozen installs, architecture/security gates or
  supply-chain checks for CI.
- M4-005+ and M6 remain unauthorized.

## Resume instruction

On the next work session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #3 live head and exact-head workflow results;
3. live GitHub evidence overrides this snapshot;
4. if M4-003 governance closure is not dual-green, finish it first;
5. only after final governance dual-green, begin M4-004 protocol-first by
   re-reading the existing precedence semantics before changing code;
6. inspect exact current-head diagnostics on any failure; never infer from stale
   logs;
7. do not start M4-005+ or M6 early.
