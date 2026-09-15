# M5-002 Acceptance Audit — RFC 8785 Canonical JSON

Status: **IMPLEMENTATION / CONFORMANCE ACCEPTED — AUDIT EXACT-HEAD VERIFICATION PENDING**  
Milestone: `M5 — Audit Ledger + Privacy`  
Gate: `M5-002 P0 — canonical JSON`  
Profile: `M5-002_CANONICAL_JSON_RFC8785_V1`

## 1. Gate authority

Normative specification:

```text
specs/0054-m5-canonical-json.md
```

Portable requirement corpus:

```text
fixtures/canonical-json/cases.json
profile: M5-002_CANONICAL_JSON_RFC8785_V1
cases: CJ-001..CJ-036
```

Pinned DeepSeek Harness compatibility baseline:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

M5-002 defines one narrow portable transformation:

```text
structured JSON value
  -> RFC 8785 / JCS canonical JSON text
  -> exact UTF-8 canonical bytes
```

It does not define parsing of raw JSON text, SHA-256, digest formatting, record
digest fields, previous-record digest linkage, hash chains, tamper verification,
persistence, retention, or integrity CLI behavior.

## 2. Predecessor closure

M5-001 governance was closed before M5-002 protocol-first work began.

Closure-record exact head:

```text
c93e31751b25e131eb82c68d1d812813f34f01a7
```

Exact-head evidence:

```text
CI #656 / run 34304178785: PASS
Harness #598 / run 34304178770: PASS
Harness job 102317305472 step 10 pinned-source typecheck: PASS
Harness job 102317305472 step 11 real rc5 runtime conformance: PASS
```

The M5-001 append-only store remains semantically independent of canonical JSON;
M5-002 does not alter append publication, sequence, failure-outcome, or
immutability semantics.

## 3. Protocol-first candidate

Protocol-first exact head:

```text
a3d89753133f3ebc3132cd034b5d0a5caf55f43a
spec(m5-002): define canonical JSON protocol
```

Exact delta from the M5-001 closure head:

```text
docs/handoff/CURRENT.md                  +112 / -45
fixtures/canonical-json/cases.json       +245 / -0
specs/0054-m5-canonical-json.md          +523 / -0
```

No production implementation, runtime/package dependency, lockfile, Schema,
Shared TCK, Adapter/Harness source, HISTORY, workflow, M5-003+ artifact, or
roadmap acceptance marker changed in the protocol-first commit.

Exact-head evidence:

```text
CI #657 / run 34304845631: PASS
Harness #599 / run 34304845765: PASS
Harness job 102319284518 step 10 pinned-source typecheck: PASS
Harness job 102319284518 step 11 real rc5 runtime conformance: PASS
```

Implementation was therefore authorized only after the exact protocol-first head
reached the required dual-green boundary.

## 4. Independent release-roadmap planning delta

After protocol-first dual-green and before implementation, the user explicitly
requested that the roadmap gain a first-class DeepSeek plugin Alpha release
track. That planning change was intentionally isolated from M5-002 implementation.

Roadmap-planning exact head:

```text
be0214ebc226d0bf1b8752b70be7a4dd84910a9b
docs(roadmap): add DeepSeek plugin alpha release track
```

Exact delta from the protocol-first head:

```text
docs/roadmap.md                          +86 / -0
```

The new `R1 — DeepSeek Harness Plugin Alpha Release` track is sequencing and
productization planning only. It does not implement canonical JSON, change the
M5-002 contract, mark any R1 task complete, or weaken M20 release gates. It also
records that after M5-002 governance closure the project pauses M5-003+ and
executes R1-001..R1-008 before returning to later M5 work.

Exact-head evidence:

```text
CI #658 / run 34316924618: PASS
Harness #600 / run 34316924500: PASS
Harness job 102354979028 step 10 pinned-source typecheck: PASS
Harness job 102354979028 step 11 real rc5 runtime conformance: PASS
```

This planning head is treated as an independent accepted repository-state delta,
not as implementation evidence for RFC 8785 behavior.

## 5. Reviewed implementation delta

Final reviewed implementation/conformance exact head:

```text
2bd329d900f1e269e472f518386ef8d3ed6a59fd
feat(protocol): implement RFC 8785 canonical JSON
```

Exact delta from the dual-green roadmap-planning head:

```text
packages/protocol/src/canonical-json.ts                    +257 / -0
packages/protocol/src/index.ts                              +1 / -0
packages/protocol/test/canonical-json.corpus.test.ts       +179 / -0
packages/protocol/test/canonical-json.hardening.test.ts    +100 / -0
```

No package manifest, dependency, lockfile, storage implementation, Schema,
Shared TCK, Adapter/Harness source, workflow, CURRENT, HISTORY, roadmap marker,
or M5-003+ artifact changed in the implementation commit.

The implementation therefore follows the architecture-owned `protocol /
canonical-json` boundary rather than embedding canonicalization into storage or
Adapter-specific code.

## 6. Public canonicalization API

The protocol package now exports:

```text
canonicalizeJsonText(value: unknown): string
canonicalizeJson(value: unknown): Uint8Array
CanonicalJsonError
CanonicalJsonErrorCode
```

The byte API is an explicit UTF-8 encoding of the exact JCS text result. The
implementation does not prepend a BOM, append a newline/NUL terminator, or expose
host-specific text encoding as protocol semantics.

Canonicalization failures use the narrow error-code vocabulary:

```text
INVALID_UNICODE
NON_FINITE_NUMBER
UNSUPPORTED_VALUE
CYCLIC_STRUCTURE
```

The included diagnostic path is non-normative diagnostic context only and is not
used as protocol identity.

## 7. RFC 8785 / JCS behavior review

The reviewed implementation preserves the normative M5-002 semantics:

- `null`, booleans, strings and finite binary64 numbers use whitespace-free JSON
  serialization;
- finite number serialization uses ECMAScript JSON number serialization, including
  `-0 -> 0`, exponent spelling and binary64 rounding behavior required by JCS;
- `NaN`, positive Infinity and negative Infinity fail loud;
- strings are not Unicode-normalized;
- lone UTF-16 high/low surrogates fail loud rather than being replaced;
- strings use JSON escaping with JCS-compatible control-character behavior;
- arrays preserve element order and are never sorted;
- every nested object is recursively property-sorted;
- object member ordering uses raw property names and ECMAScript default string
  ordering, i.e. UTF-16 code-unit lexicographic ordering, with no locale collation;
- valid non-ASCII text is emitted as UTF-8 without lossy transcoding;
- semantically equal JSON objects differing only in insertion order produce the
  same canonical byte sequence.

The implementation does not parse raw JSON strings, so duplicate-member detection
at raw-text parse time remains an upstream parser responsibility as frozen by Spec
0054.

## 8. Host-language safety boundary

M5-002 intentionally accepts structured JSON values, not arbitrary JavaScript
objects with JSON-like coercion semantics.

The implementation fails loud instead of applying host-language conveniences for:

```text
undefined
function
symbol
bigint
Date
Map / Set
non-plain class instances
accessor properties
symbol-keyed own properties
non-enumerable own object metadata
sparse arrays
custom named array properties
cyclic graphs
unsafe prototype/descriptor introspection failures
```

This prevents `JSON.stringify` behaviors such as silent omission, `null`
substitution, `toJSON()` conversion, getter execution, or other host-specific
coercion from becoming accidental portable protocol semantics.

Acyclic repeated object aliases are permitted and serialized independently as the
same logical JSON subtree; only actual ancestor cycles fail.

An own `__proto__` member originating from JSON data remains ordinary canonical
member data. The implementation constructs output text directly and does not
assign attacker-controlled members into a normal object, so the regression test
also proves the canonicalizer does not introduce prototype pollution while
serializing that key.

## 9. Exact corpus traceability

`canonical-json.corpus.test.ts` pins exactly:

```text
profile: M5-002_CANONICAL_JSON_RFC8785_V1
IDs: CJ-001..CJ-036 exactly once
```

It defines one executable coverage function for every corpus ID and asserts the
coverage key set is exactly the corpus ID set before executing each case.

The executable coverage spans:

```text
LITERALS
STRINGS_AND_ESCAPING
UNICODE_PRESERVATION
INVALID_UNICODE
ARRAY_ORDER
OBJECT_SORTING
RECURSIVE_SORTING
WHITESPACE_FREE
BINARY64_NUMBER_SERIALIZATION
NON_FINITE_REJECTION
HOST_VALUE_REJECTION
CYCLIC_REJECTION
UTF8_BYTES
DETERMINISM
NO_DIGEST_SEMANTICS
PROTOCOL_FIRST_BOUNDARY
```

`CJ-036` does not pretend the current mutable handoff/roadmap is historical Git
evidence. Its executable projection checks the stable Spec 0054 protocol-first
boundary wording; the actual historical three-file commit shape is proven by the
GitHub exact compare recorded in section 3 of this audit. This preserves the
lesson learned during M5-001 governance remediation and avoids coupling a
historical assertion to mutable CURRENT state.

## 10. Additional hardening coverage

`canonical-json.hardening.test.ts` adds host-runtime regression coverage beyond
the minimum portable corpus:

- accessors are rejected without invoking their getter;
- symbol/non-enumerable object metadata is rejected;
- sparse/custom-property arrays are rejected;
- acyclic aliases are accepted;
- own `__proto__` remains data without prototype mutation;
- non-plain prototypes are rejected;
- hostile descriptor/prototype Proxy failures are contained as
  `UNSUPPORTED_VALUE` rather than escaping as partially successful output.

These tests harden the TypeScript projection without changing the language-neutral
JCS output rules.

## 11. No digest / hash-chain pull-forward

The reviewed M5-002 implementation contains no `node:crypto` import and no
`createHash()` call. The corpus explicitly tests the absence of that hashing
surface from the canonicalizer source.

M5-002 does not:

```text
compute SHA-256
format sha256:<hex>
add digest fields
bind digests to audit records
reference previous-record digests
construct a hash chain
verify tamper evidence
implement an integrity CLI
```

Those concerns remain owned by M5-003, M5-004 and M5-005. Under the newly accepted
R1 sequencing plan, they are additionally paused until the DeepSeek plugin Alpha
release track is completed after M5-002 governance closure.

## 12. Dependency / packaging review

No runtime or development dependency was added for canonical JSON. There is no
package-manifest or lockfile change.

The implementation is exported through the existing `@dsh-safe/protocol` public
index, consistent with the architecture that reserves canonical JSON under the
protocol package. It does not create a new package, does not make storage depend
on protocol canonicalization yet, and does not alter Adapter/Harness package
boundaries.

## 13. Final exact-head verification

Final reviewed implementation/conformance exact head:

```text
2bd329d900f1e269e472f518386ef8d3ed6a59fd
```

Evidence on that same SHA:

```text
CI #659 / run 34317551487: PASS
Harness #601 / run 34317551427: PASS
Harness job 102356846690 step 10 pinned-source typecheck: PASS
Harness job 102356846690 step 11 real rc5 runtime conformance: PASS
```

The full repository `pnpm check:all` passed on the product branch exact head; the
separate temporary-candidate verifier was only a pre-push safeguard and is not
used as substitute acceptance evidence.

## 14. PR / base / review state

At acceptance review:

```text
PR: #3 — feat(policy): begin M4 capability broker
state: Open
Draft: true
merged: false
mergeable: true
head: feat/m4-capability-broker@2bd329d900f1e269e472f518386ef8d3ed6a59fd
base: main@57430273e065be8d38807d67b175fa154c801d43
reviews: none
review threads: none
```

The PR body is stale and remains non-authoritative relative to live GitHub state,
normative Specs, roadmap, CURRENT and exact-head evidence.

PR #3 merge remains unauthorized without explicit user approval.

## 15. Gate separation and next authorized sequence

This audit accepts the M5-002 implementation/conformance head; it does not itself
close governance.

The audit commit must first pass normal CI plus exact pinned Harness rc5
source-conformance on its own exact head. Only then may a governance-transition
commit update:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md    # append-only
docs/roadmap.md            # M5-002 marker/details only
```

That transition must itself be exact-head dual-green. A separate closure-record
commit limited to CURRENT plus append-only HISTORY must then pass another exact
normal-CI/Harness dual-green gate.

Because the independent roadmap-planning head already established the release
sequencing override, successful M5-002 closure authorizes:

```text
R1-001 P0 — Alpha readiness reconciliation
```

and intentionally does **not** authorize M5-003 at that point. R1-002+ remain
unauthorized until R1-001 is separately governed according to the repository
process.

## 16. Acceptance decision

M5-002 implementation/conformance is **ACCEPTED** at:

```text
2bd329d900f1e269e472f518386ef8d3ed6a59fd
```

because:

- M5-001 governance was closed first;
- Spec 0054 and the 36-case corpus were committed protocol-first and exact-head
  dual-green before implementation;
- the later R1 roadmap planning change was isolated to one roadmap-only commit and
  exact-head dual-green before implementation;
- implementation is confined to the architecture-owned protocol canonical-JSON
  surface and tests;
- all `CJ-001..CJ-036` cases receive explicit executable coverage;
- RFC 8785 object ordering, recursion, array order, Unicode preservation, string
  escaping, binary64 number serialization and UTF-8 byte output are covered;
- invalid Unicode, non-finite numbers, unsupported host values and cycles fail
  loud;
- additional hostile JavaScript object-shape tests prevent common silent-coercion
  and side-effect hazards;
- there is no runtime dependency, lockfile, Schema/TCK, storage, Adapter/Harness,
  workflow or M5-003+ implementation change;
- no digest/hash-chain/integrity behavior is pulled forward;
- normal CI and exact pinned Harness steps 10/11 are dual-green on the final
  reviewed exact SHA;
- PR/base/review state introduces no acceptance blocker.

This **audit commit itself remains pending acceptance** until its own exact head is
dual-green.
