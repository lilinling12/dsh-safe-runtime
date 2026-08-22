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
- M4-002 acceptance record: `docs/acceptance/m4-002-acceptance-audit.md`
- Accepted M4-002 implementation head: `7b87c812fafab860d5ee95bebdfc706ec6e2ba06`
- M4-002 normal CI: **PASS — CI #260 / run `32603117802`**
- M4-002 Harness rc5 source-conformance: **PASS — #204 / run `32603117850`**
- Next gate after final governance verification: **M4-003 P0 — canonical resource normalization**

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

M4 policy syntax and semantics must not be inferred from Harness APIs or runtime
behavior.

## M4-002 acceptance boundary

Normative authority:

```text
specs/0018-m4-capability-policy-schema-validation.md
schemas/v1alpha1/capability-policy.schema.json
```

Acceptance record:

```text
docs/acceptance/m4-002-acceptance-audit.md
```

The accepted M4-002 boundary consumes only the JSON-compatible value produced by
M4-001 and validates it against the trusted repository-controlled CapabilityPolicy
Draft 2020-12 schema graph. Successful validation returns a detached recursively
frozen JSON-compatible snapshot. Failure returns deterministic portable schema
issues or a distinct trusted-schema configuration failure.

Accepted properties include:

1. Draft 2020-12 validation through strict `Ajv2020`;
2. exact trusted `$schema` / `$id` identities for the CapabilityPolicy and
   definitions schemas;
3. local repository-controlled `$ref` registration without runtime network schema
   fetches;
4. no type coercion, default insertion or additional-property removal;
5. missing `spec.defaultEffect` remains schema-invalid and is not synthesized;
6. existing `defaultEffect: deny` schema semantics remain unchanged;
7. successful output is detached from the mutable input and recursively frozen;
8. `__proto__` remains ordinary own data inside schema-open fields without
   prototype pollution;
9. invalid results use `POLICY_SCHEMA_INVALID` with normalized
   `instancePath` / `keyword` / `schemaPath`;
10. required/additional-property issue paths point to the affected property and
    use RFC 6901 escaping;
11. issue ordering is deterministic by instance path, keyword and schema path;
12. schema initialization/resolution failures are distinct
    `POLICY_SCHEMA_CONFIGURATION_ERROR` failures;
13. no M4-003 normalization, M4-004 ordering or M4-005/006 evaluation semantics
    are implemented.

`@dsh-safe/policy-engine` exact-pins `ajv@8.20.0`. `ajv-formats` is not a
policy-engine runtime dependency because the current CapabilityPolicy root only
reaches `defs.schema.json#/$defs/leaseRequest`, which has no `format` assertion.
If a future normative root reaches a formatted definition, that change requires
explicit strict format semantics and new conformance evidence.

## M4-002 exact-head evidence

Accepted implementation head:

```text
7b87c812fafab860d5ee95bebdfc706ec6e2ba06
```

Normal CI #260 / run `32603117802`:

- `pnpm install --frozen-lockfile`: PASS;
- supply-chain lockfile policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- repository tests: PASS (27 files / 294 tests);
- M4-002 validator tests: PASS (6 tests);
- M4-001 loader regressions: PASS (18 tests);
- JSON parser regressions: PASS (9 tests);
- oxlint: PASS (0 warnings / 0 errors);
- packed Shared TCK + external non-workspace consumer: PASS (44 registered assets).

Harness rc5 source-conformance #204 / run `32603117850`:

- exact pinned Harness public type build: PASS;
- reproducible safe-runtime install: PASS;
- exact workspace projection: PASS;
- projection idempotence: PASS;
- exact rc5 binding typecheck: PASS;
- real rc5 runtime conformance: PASS.

No schema, validator, fixture expectation, TypeScript strictness, frozen lockfile,
supply-chain policy, architecture boundary, compatibility gate or security
claim was weakened for acceptance.

## Governance closure rule

M4-002's implementation boundary is accepted, but the governance edits that
record that acceptance must themselves be verified before entering M4-003.

Therefore:

```text
M4-001 implementation: ACCEPTED
M4-002 implementation: ACCEPTED
M4-003 implementation: NOT STARTED
M4-003 authorization: PENDING FINAL GOVERNANCE-HEAD DUAL-GREEN
M4-004+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

Do not start M4-003 production code until the final governance head containing
the M4-002 acceptance audit, package stage, roadmap, this handoff, append-only
history and PR description is green in both normal CI and exact Harness rc5
source-conformance.

## Next gate — M4-003 canonical resource normalization

Once the final governance head is dual-green, the next and only authorized gate
is:

```text
M4-003 P0 — canonical resource normalization
```

M4-003 must start protocol-first. Re-read existing M1 resource semantics and any
relevant RFC/ADR/spec/schema before defining normalization. Do not infer canonical
identity from Harness APIs, incidental TypeScript strings, host-specific path
behavior, or roadmap shorthand.

M4-003 must remain limited to canonical resource normalization. It must not
opportunistically implement M4-004 deterministic rule ordering, M4-005 effects,
M4-006 default-deny evaluation, lease/approval routing, plugin registration, or
Workspace Transaction behavior.

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- Existing M1 Capability semantics remain authoritative until changed through the
  repository's normative process.
- DeepSeek Harness is an Adapter and cannot define Capability Broker semantics.
- Successful M4-001 loading is not policy validity or authorization.
- Successful M4-002 validation is not normalization, evaluation or authorization.
- Do not weaken TypeScript strictness, schemas, compatibility baseline,
  validators, conformance tests, frozen installs, architecture/security gates or
  supply-chain checks for CI.
- M4-004+ and M6 remain unauthorized.

## Resume instruction

On the next work session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #3 live head and exact-head workflow results;
3. live GitHub evidence overrides this snapshot;
4. if the M4-002 governance closure head is not yet dual-green, finish that
   verification first;
5. only after final governance dual-green, begin M4-003 protocol-first by reading
   the relevant existing resource semantics before changing code;
6. inspect exact current-head diagnostics on any failure; never infer from stale
   logs;
7. do not start M4-004+ or M6 early.
