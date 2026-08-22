# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-22`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m4-capability-broker`
- Stacked base: `feat/m3-shared-tck-foundation@65870612d039ce026a6952c16d5e069b11bd24a7`
- M2 acceptance: **ACCEPTED**
- M3 acceptance: **ACCEPTED**
- M4-001 acceptance: **ACCEPTED AT IMPLEMENTATION BOUNDARY**
- M4-001 acceptance record: `docs/acceptance/m4-001-acceptance-audit.md`
- Accepted M4-001 implementation head: `9443d907b2b9db6819fe697a49abd6bf47bf1edf`
- M4-001 normal CI: **PASS — CI #248 / run `32582943266`**
- M4-001 Harness rc5 source-conformance: **PASS — #192 / run `32582943175`**
- Next gate after governance verification: **M4-002 P0 — schema validation**

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

## M4-001 acceptance boundary

Normative loader authority:

```text
specs/0017-m4-capability-policy-document-loader.md
```

Acceptance record:

```text
docs/acceptance/m4-001-acceptance-audit.md
```

The accepted implementation boundary converts explicitly selected UTF-8 JSON or
YAML source into exactly one detached JSON-compatible value or an explicit
portable failure. It does not validate CapabilityPolicy schema or grant a
capability.

Accepted properties include:

1. explicit `JSON | YAML` format selection without content sniffing fallback;
2. duplicate-key rejection for JSON and YAML before hidden precedence can arise;
3. YAML single-document enforcement;
4. anchors, aliases, merge keys, explicit/custom tags and non-string mapping keys
   fail closed;
5. only JSON-domain scalar/container values are returned;
6. non-finite values fail closed;
7. `__proto__` remains ordinary own data and does not mutate object prototypes;
8. repeated loads return detached values;
9. `sourceRef` is diagnostic-only;
10. finite byte/depth/container-entry limits are enforced;
11. YAML byte length is checked before parser invocation;
12. YAML depth and semantic container-entry budgets are preflighted over the
    public Parser CST before Composer runs;
13. AST projection rechecks structural limits as defense in depth;
14. loader code performs no M4-002 validation or later evaluation semantics.

The YAML dependency is exact-pinned as `yaml@2.9.0` and the synchronized lockfile
passes the repository's frozen-install and supply-chain gates.

## M4-001 exact-head evidence

Accepted implementation head:

```text
9443d907b2b9db6819fe697a49abd6bf47bf1edf
```

Normal CI #248 / run `32582943266`:

- `pnpm install --frozen-lockfile`: PASS;
- supply-chain lockfile policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- repository tests: PASS (26 files / 288 tests);
- M4-001 loader tests: PASS (18 tests);
- JSON parser tests: PASS (9 tests);
- oxlint: PASS (0 warnings / 0 errors);
- packed Shared TCK + external non-workspace consumer: PASS (44 registered assets).

Harness rc5 source-conformance #192 / run `32582943175`:

- exact pinned Harness public type build: PASS;
- reproducible safe-runtime install: PASS;
- exact workspace projection: PASS;
- projection idempotence: PASS;
- exact rc5 binding typecheck: PASS;
- real rc5 runtime conformance: PASS.

No schema, validator, TCK, TypeScript strictness, frozen lockfile, supply-chain
policy, architecture boundary, compatibility gate or security guarantee was
weakened for acceptance.

## Governance closure rule

M4-001's implementation boundary is accepted, but the governance edits that
record that acceptance must themselves be verified before entering M4-002.

Therefore:

```text
M4-001 implementation: ACCEPTED
M4-002 implementation: NOT STARTED
M4-002 authorization: PENDING FINAL GOVERNANCE-HEAD DUAL-GREEN
M4-003+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

Do not start M4-002 production code until the final governance head containing
this handoff, roadmap state and append-only history is green in both normal CI
and exact Harness rc5 source-conformance.

## Next gate — M4-002 schema validation

Once the final governance head is dual-green, the next and only authorized gate
is:

```text
M4-002 P0 — schema validation
```

It must start protocol-first, not implementation-first.

A known normative question must be reconciled before validator behavior is
changed:

- `schemas/v1alpha1/capability-policy.schema.json` currently requires
  `spec.defaultEffect` and constrains it to `deny`;
- Core normative prose states that a missing `defaultEffect` MUST deny.

Do not silently choose one interpretation inside validator code. Determine the
intended portable contract, update normative authority/fixtures/compatibility
material as required, and only then implement M4-002 validation.

M4-002 must remain limited to schema validation. It must not opportunistically
implement M4-003 normalization, M4-004 ordering, M4-005 effects, M4-006 default
policy evaluation, lease/approval routing, Harness integration, or Workspace
Transaction semantics.

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- Existing M1 Capability semantics remain authoritative until changed through the
  repository's normative process.
- DeepSeek Harness is an Adapter and cannot define Capability Broker semantics.
- Unknown formats and unsafe parser constructs fail explicitly.
- Successful document loading is not policy validity and is not authorization.
- Do not weaken TypeScript strictness, schemas, compatibility baseline,
  validators, conformance tests, frozen installs, architecture/security gates or
  supply-chain checks for CI.
- M4-003+ and M6 remain unauthorized.

## Resume instruction

On the next work session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #3 live head and exact-head workflow results;
3. live GitHub evidence overrides this snapshot;
4. if governance closure is not yet dual-green, finish that verification first;
5. if it is dual-green, begin only M4-002 with a protocol-first reconciliation of
   the `defaultEffect` schema/prose boundary;
6. inspect exact current-head diagnostics on any failure; never infer from stale
   logs;
7. do not start M4-003+ or M6 early.
