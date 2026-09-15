# Spec 0054 — M5-002 Canonical JSON

Status: **DRAFT NORMATIVE SPECIFICATION — PROTOCOL-FIRST / NOT ACCEPTED**

Milestone: `M5 — Audit Ledger + Privacy`

Gate: `M5-002 P0 — canonical JSON`

Profile: `M5-002_CANONICAL_JSON_RFC8785_V1`

External canonicalization reference: **RFC 8785 — JSON Canonicalization Scheme (JCS)**

---

## 1. Purpose

M5-002 defines one deterministic, language-neutral canonical representation for
structured JSON values used by later Safe Runtime evidence and integrity work.

For every conforming input JSON value, every conforming implementation MUST
produce the same canonical UTF-8 byte sequence.

This Gate defines canonicalization only. It does **not** compute a record digest,
build a hash chain, verify ledger integrity, select a persistence engine, or alter
the append-only storage semantics accepted by M5-001.

---

## 2. Existing authority retained

This specification preserves the following existing authority:

1. `specs/0002-state-machines-and-precedence.md` states that portable structured
   JSON digests SHOULD use RFC 8785 JCS and SHA-256 by default.
2. The roadmap assigns canonical JSON to M5-002, record digest to M5-003, hash
   chain to M5-004, and integrity verification CLI to M5-005.
3. Core Spec 0001 treats canonical JSON and digest/integrity evidence as related
   but separable Evidence Plane concerns.
4. `docs/architecture.md` reserves a portable `canonical-json/` responsibility in
   the core package architecture rather than making an Adapter/Harness-specific
   serializer authoritative.
5. M5-001 accepted append-only store semantics without requiring canonical bytes;
   M5-002 MUST compose with that store rather than rewrite its history contract.
6. Generic portable protocol/testkit data remains JSON data; TypeScript/JavaScript
   classes, symbols, functions, `Date`, `undefined`, and similar host-only values
   are not portable protocol values.

M5-002 therefore adopts RFC 8785 serialization behavior for its canonical JSON
profile while leaving SHA-256 and all digest semantics to M5-003.

---

## 3. Canonicalization function

The portable operation is conceptually:

```text
canonicalizeJson(value) -> CanonicalJsonBytes | CanonicalJsonError
```

`CanonicalJsonBytes` is the exact UTF-8 encoding of the RFC 8785 canonical JSON
representation of `value`.

The portable output authority is **bytes**, not an implementation language's
native string storage encoding. An implementation MAY expose a text convenience
view only when that view encodes to exactly the same UTF-8 bytes.

The output MUST NOT contain a UTF-8 BOM.

---

## 4. Portable input domain

A conforming M5-002 input is a structured JSON tree whose nodes are only:

```text
null
boolean
string
finite IEEE-754 binary64 number
array of canonicalizable JSON values
object with unique string property names and canonicalizable JSON values
```

The canonicalizer operates on an already constructed JSON value tree. Parsing
arbitrary raw JSON text is not part of the portable M5-002 API.

If an implementation offers a raw-text convenience API, that parser is outside
the portable canonicalizer contract and MUST establish RFC 8785/I-JSON-compatible
input before invoking canonicalization, including rejecting duplicate object
member names rather than silently selecting one.

---

## 5. I-JSON and fail-loud input requirements

M5-002 uses the RFC 8785 input constraints required for interoperable JCS data.
A conforming canonicalizer MUST reject rather than silently coerce input that is
outside its portable domain.

### 5.1 Object member names

Object member names MUST be unique within one object.

A structured object model that cannot contain duplicate names satisfies this by
construction. A text parser used before canonicalization MUST NOT silently erase
duplicate members and then claim the original text was canonically represented.

### 5.2 Strings

String content MUST be valid Unicode data representable by the RFC 8785/JCS
string model.

Occurrences of lone UTF-16 surrogate code units MUST fail canonicalization.
Implementations MUST NOT replace invalid Unicode with U+FFFD and then report
canonical success.

Canonicalization MUST NOT apply NFC, NFD, NFKC, NFKD, locale folding, case folding,
or any other Unicode normalization. String data is preserved as supplied, subject
only to the JSON escaping required by RFC 8785.

### 5.3 Numbers

Portable JSON numbers have IEEE-754 binary64 semantics.

NaN, positive Infinity, and negative Infinity MUST fail canonicalization.

If a host language supplies a numeric type or numeric value that cannot be
faithfully projected into the binary64 input domain selected by this profile, the
implementation MUST reject it or require the caller to map it explicitly before
canonicalization. It MUST NOT silently convert arbitrary-precision integers,
decimals, or other higher-precision values and then claim that the resulting
bytes canonically represent the original numeric value.

Applications that require larger integers, arbitrary precision, monetary decimal
semantics, or other non-binary64 number domains must define their portable JSON
mapping separately, commonly by using JSON strings. M5-002 does not invent such a
mapping.

### 5.4 Host-only values

The following are not portable M5-002 JSON values and MUST NOT be silently
stringified, omitted, converted to `null`, or invoked as coercion hooks:

```text
undefined / missing-value sentinels
functions / callables
symbols
BigInt or arbitrary-precision host integers without an explicit JSON mapping
Date/time objects without an explicit JSON string mapping
Map/Set or language-specific collection objects without an explicit JSON mapping
class instances with non-JSON semantics
cyclic object/array graphs
accessor/coercion behavior that requires executing application code
```

A conforming implementation fails loud instead of relying on host serializer
convenience behavior that changes the logical input tree.

---

## 6. Literal serialization

The JSON literals MUST serialize exactly as:

```text
null
true
false
```

No alternate capitalization or whitespace is permitted.

---

## 7. String serialization

Strings and object property names MUST follow RFC 8785 string serialization.

Required behavior includes:

1. U+0008, U+0009, U+000A, U+000C, and U+000D use `\b`, `\t`, `\n`, `\f`, and
   `\r` respectively.
2. Other U+0000..U+001F control values use lowercase `\uhhhh` escapes.
3. U+0022 (`"`) is escaped as `\"`.
4. U+005C (`\`) is escaped as `\\`.
5. Other valid Unicode content outside the control range is emitted as-is in the
   canonical JSON text and then UTF-8 encoded.
6. `/` is not escaped merely for presentation preference.
7. No Unicode normalization is performed.
8. Invalid lone surrogate data causes an error.

Equivalent strings with different Unicode code-point sequences remain different
canonical inputs and may therefore produce different canonical bytes.

---

## 8. Number serialization

Finite binary64 JSON numbers MUST use the number serialization required by RFC
8785, which delegates to the ECMAScript number-to-string algorithm identified by
that RFC.

The implementation MUST NOT substitute locale formatting, fixed-scale decimal
formatting, arbitrary pretty-printing, or a language-default representation that
produces different JCS bytes.

Important consequences include:

```text
-0       -> 0
1e30     -> 1e+30
0.002    -> 0.002
1e-27    -> 1e-27
```

Canonicalization may expose the rounding already inherent in the binary64 input
value. It MUST NOT claim to preserve a higher-precision source value that was
silently rounded before entering the defined binary64 domain.

---

## 9. Object property ordering

Every JSON object MUST be serialized with its property names sorted recursively
according to RFC 8785.

The sort key is the **raw, unescaped property name** interpreted as a sequence of
UTF-16 code units.

Comparison rules are:

1. compare UTF-16 code units as unsigned integer values;
2. compare from the first code unit;
3. at the first differing position, the lower code-unit value sorts first;
4. when one property name is a prefix of another, the shorter name sorts first;
5. sorting is locale-independent and MUST NOT use locale collation;
6. sorting MUST NOT be performed on escaped JSON source spellings;
7. sorting MUST NOT use UTF-8 byte order when that would differ from RFC 8785.

Object ordering is recursive at every nesting level.

---

## 10. Array semantics

Array element order is semantically significant and MUST NOT be sorted or
otherwise reordered by canonicalization.

Canonicalization MUST recursively canonicalize object/array values contained
inside an array while preserving the array's original element order.

---

## 11. Whitespace and delimiters

Canonical output MUST contain no insignificant whitespace between JSON tokens.

Canonicalizers MUST NOT emit pretty-print indentation, line breaks, spaces after
commas/colons, trailing commas, comments, or implementation-specific formatting.

The resulting canonical text is valid JSON and is encoded directly as UTF-8.

---

## 12. UTF-8 output

After canonical JSON text generation, the canonical representation MUST be
encoded as UTF-8 exactly once.

A conforming implementation MUST NOT:

- prepend a BOM;
- emit UTF-16/UTF-32 as the canonical byte form;
- normalize Unicode while encoding;
- transcode through a lossy replacement mode;
- add a terminating newline or NUL byte.

The exact output byte sequence is the M5-002 interoperability artifact consumed
by later digest/integrity work.

---

## 13. Determinism and semantic invariants

For any one conforming structured JSON value `V`:

```text
canonicalizeJson(V) = B
```

all conforming implementations MUST produce exactly the same byte sequence `B`.

The result depends only on the logical JSON value and RFC 8785 rules, not on:

```text
object insertion order
map/hash-table iteration order
process locale
platform newline convention
host source-code formatting
pretty-print settings
runtime memory identity
```

Two input objects that differ only in property insertion order MUST canonicalize
to the same bytes.

Two arrays with different element order MUST remain different logical values and
MUST NOT be canonicalized into the same sequence merely by sorting their elements.

Two strings that differ only by Unicode normalization form remain distinct unless
the caller normalized them before they entered M5-002.

---

## 14. Error truthfulness

Canonicalization is fail-loud.

A conforming implementation MUST NOT return canonical bytes when it cannot prove
that the input is inside the M5-002 portable domain and has been serialized using
RFC 8785 behavior.

Portable error classes are semantic categories; exact host exception types are
not protocol authority:

```text
UNSUPPORTED_VALUE
INVALID_UNICODE
NON_FINITE_NUMBER
NUMBER_DOMAIN_UNSUPPORTED
CYCLIC_STRUCTURE
```

Implementations MAY expose more diagnostic detail, but MUST NOT reinterpret one
of these failures as successful canonicalization.

The operation MUST NOT mutate the caller's logical input as a side effect of
canonicalization.

---

## 15. Relationship to M5-001 append-only storage

M5-001 establishes append-only ledger state transitions and record ownership.
M5-002 establishes deterministic canonical bytes for structured JSON values.

M5-002 MUST NOT:

- change M5-001 sequence allocation;
- change append ordering;
- add update/delete/truncate history mutation;
- redefine `APPENDED`, `NOT_APPENDED`, or `INDETERMINATE`;
- make canonical bytes a new record-identity/deduplication rule;
- rewrite already accepted historical ledger values as a migration side effect.

A later integration MAY canonicalize a record before digesting or persistence when
separately authorized, but that integration is not part of this Gate.

---

## 16. Explicit later-Gate exclusions

M5-002 MUST NOT implement or claim completion of:

```text
M5-003 record digest
M5-004 hash chain
M5-005 integrity verify CLI
M5-010 secret detector interface
M5-011 env redaction
M5-012 args/result digest by default
M5-013 source-content retention opt-in
M5-014 retention TTL
M5-015 delete/export workflow
M5-020 audit-store unavailable policy
M5-021 durable local spool
M5-022 spool reconciliation
```

In particular, this Gate MUST NOT:

```text
compute SHA-256 or another digest
format sha256:<hex>
attach digest fields to ledger records
add previous-record digest fields
construct or verify a hash chain
define signing/MAC semantics
claim tamper evidence
```

Those concerns require their own protocol-first authority and acceptance evidence.

---

## 17. Adapter and runtime separation

Canonical JSON is portable core behavior.

M5-002 MUST NOT import DeepSeek Harness concrete types, make Harness serialization
behavior protocol authority, or use Adapter-specific event objects as its public
input model.

The first implementation SHOULD follow the existing portable core architecture
and module boundaries. Exact package/file ownership is an implementation-review
decision after this protocol-first head becomes dual-green; this protocol-first
commit does not add or modify production implementation.

---

## 18. Security and robustness requirements

Canonicalization processes untrusted protocol/evidence data and MUST be treated as
an input-validation boundary.

A conforming implementation MUST:

- reject invalid Unicode rather than use lossy replacement;
- reject unsupported host values rather than execute coercion hooks;
- reject non-finite numbers;
- avoid locale-dependent key ordering/number rendering;
- bound recursion/resources according to implementation policy without returning
  false canonical success after a resource-limit failure;
- preserve the distinction between canonicalization failure and later digest or
  signature verification failure.

M5-002 does not define universal resource limits. Implementations MAY impose
finite limits, but a limit hit MUST fail loud and MUST NOT produce a partial
canonical byte sequence reported as successful.

---

## 19. Portable conformance profile

Portable corpus:

```text
fixtures/canonical-json/cases.json
profile: M5-002_CANONICAL_JSON_RFC8785_V1
cases: CJ-001..CJ-036
```

A conforming implementation projection MUST eventually cover every corpus case.

Coverage classes include:

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

The corpus is a portable requirement set during protocol-first. Executable
implementation projection is authorized only after this exact protocol-first head
is dual-green.

---

## 20. Protocol-first change boundary

The M5-002 protocol-first candidate is restricted to exactly:

```text
specs/0054-m5-canonical-json.md
fixtures/canonical-json/cases.json
docs/handoff/CURRENT.md
```

It MUST NOT include:

```text
production implementation
new runtime/package dependency
lockfile changes
Schema or Shared TCK changes
Adapter/Harness rewrites
HISTORY modification
roadmap acceptance-marker changes
workflow changes
M5-003+ artifacts
```

Only after this exact protocol-first head passes normal CI plus the exact pinned
DeepSeek Harness rc5 source-conformance may M5-002 implementation begin.

---

## 21. Acceptance rule

M5-002 may be accepted only when all of the following are true:

- M5-001 governance is closed on an exact dual-green closure-record head;
- the M5-002 protocol-first exact head is dual-green before implementation;
- every `CJ-001..CJ-036` corpus case receives executable conformance coverage;
- output bytes follow RFC 8785/JCS exactly for the defined input domain;
- invalid Unicode, non-finite numbers, unsupported host values, and cycles fail
  loud rather than being silently coerced;
- object ordering is recursive, raw-name, UTF-16-code-unit, locale-independent;
- array order and Unicode string content are preserved;
- no M5-003 digest, M5-004 hash-chain, or M5-005 integrity-CLI behavior is pulled
  into this Gate;
- no existing Schema, Shared TCK, Adapter/Harness compatibility, storage, or
  security boundary is weakened;
- normal CI and pinned Harness rc5 source/runtime conformance are green on the
  reviewed exact implementation head;
- an acceptance audit records the exact evidence before governance transition.

M5-003 remains unauthorized until M5-002 governance is separately closed.
