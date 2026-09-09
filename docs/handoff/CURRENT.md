# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-09`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M5 — Audit Ledger + Privacy`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M4-001..052: **GOVERNANCE CLOSED**
- M5-001 P0 append-only store: **GOVERNANCE CLOSED**
- M5-002 P0 canonical JSON: **PROTOCOL-FIRST CANDIDATE / IMPLEMENTATION NOT AUTHORIZED UNTIL THIS EXACT HEAD IS DUAL-GREEN**
- M5-003+: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M5-001 final closure evidence

Closure-record exact head:

```text
c93e31751b25e131eb82c68d1d812813f34f01a7
CI #656 / run 34304178785: PASS
Harness #598 / run 34304178770: PASS
Harness job 102317305472 step 10: PASS
Harness job 102317305472 step 11: PASS
```

M5-001 is therefore **GOVERNANCE CLOSED**. Its append-only semantics remain
predecessor authority and MUST NOT be weakened by M5-002.

The earlier M5-001 governance-transition CI failures and their test-only
remediation remain recorded in:

```text
docs/acceptance/m5-001-acceptance-audit-amendment.md
```

The next roadmap Gate is `M5-002 P0 — canonical JSON`.

## M5-002 recovered authority

Existing deterministic-semantics authority states:

```text
Portable protocol digests SHOULD use RFC 8785 JSON Canonicalization Scheme for
structured JSON payloads and SHA-256 by default.
```

M5-002 owns only the canonical JSON portion of that statement. The roadmap assigns
record digest to M5-003, hash chain to M5-004, and integrity verification CLI to
M5-005; those concerns remain excluded from this Gate.

Architecture already reserves portable `canonical-json/` responsibility in the
core package layout. Canonicalization must not become DeepSeek Harness or Adapter
specific.

RFC 8785/JCS requires deterministic canonical representation built from I-JSON
input constraints, ECMAScript-compatible primitive serialization, recursive
property sorting by raw UTF-16 code units, preserved array order, and final UTF-8
encoding.

## Current Gate — M5-002 protocol-first candidate

Normative candidate:

```text
specs/0054-m5-canonical-json.md
```

Portable requirement corpus:

```text
fixtures/canonical-json/cases.json
profile: M5-002_CANONICAL_JSON_RFC8785_V1
cases: CJ-001..CJ-036
```

Pinned Harness compatibility baseline remains:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

The candidate defines a language-neutral operation:

```text
structured JSON value -> RFC 8785 canonical UTF-8 bytes
```

Required semantics include:

- portable inputs are JSON values only;
- object property names are recursively sorted by raw UTF-16 code units,
  independent of locale and insertion order;
- array element order is preserved;
- literals/string escaping/finite binary64 number serialization follow JCS;
- Unicode content is preserved without normalization;
- lone surrogates fail loud rather than being replaced;
- NaN and infinities fail loud;
- unsupported host values, coercion-dependent objects, and cyclic graphs fail loud
  rather than being silently omitted/stringified/coerced;
- canonical output authority is exact UTF-8 bytes with no BOM or extra whitespace;
- canonicalization does not mutate caller input;
- no digest/hash-chain/tamper-evidence behavior is included.

## Explicit later-Gate exclusions

M5-002 MUST NOT implement or claim:

```text
M5-003 record digest
M5-004 hash chain
M5-005 integrity verify CLI
M5-010 secret detector interface
M5-011 env redaction
M5-012 args/result digest default
M5-013 source-content retention opt-in
M5-014 retention TTL
M5-015 delete/export workflow
M5-020 audit-store unavailable policy
M5-021 durable local spool
M5-022 spool reconciliation
```

It also MUST NOT redefine M5-001 append ordering/sequence/outcome semantics or add
history-rewriting operations.

## Protocol-first delta boundary

This candidate is restricted to exactly:

```text
specs/0054-m5-canonical-json.md
fixtures/canonical-json/cases.json
docs/handoff/CURRENT.md
```

No production implementation, dependency/lockfile, Schema, Shared TCK,
Adapter/Harness rewrite, HISTORY, roadmap acceptance marker, workflow, or M5-003+
artifact may change before this exact protocol-first head passes normal CI plus
exact pinned Harness rc5 source-conformance.

After this exact head becomes dual-green, only the smallest M5-002 implementation
and executable-conformance delta becomes authorized. Package/file ownership must
be justified from the existing architecture and current module boundaries rather
than guessed from roadmap wording.

PR #3 remains Open / Draft and merge remains unauthorized without explicit user
approval.
