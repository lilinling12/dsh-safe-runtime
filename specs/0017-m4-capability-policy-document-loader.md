# M4-001 — Capability Policy YAML/JSON Document Loader

> Document type: Normative Specification  
> Milestone: `M4 — Capability Broker v0.1`  
> Gate: `M4-001 P0 — YAML/JSON loader`  
> API group inherited from Core: `safe-runtime.dev/v1alpha1`

## 1. Purpose

This specification defines the **document loading boundary only** for Capability
Broker policy input.

The loader converts UTF-8 JSON or YAML source text into a detached,
JSON-compatible in-memory value while preserving the distinction between parsing
and policy validation.

Existing CapabilityPolicy semantics remain defined by
`specs/0001-safe-runtime-core.md` and the repository's normative schema. This
loader MUST NOT redefine policy evaluation semantics.

## 2. Non-goals

M4-001 does **not** perform or imply:

- CapabilityPolicy JSON Schema validation (`M4-002`);
- canonical resource normalization (`M4-003`);
- deterministic policy-rule ordering (`M4-004`);
- allow / deny / ask evaluation (`M4-005`);
- default-deny evaluation (`M4-006`);
- lease issuance or consumption;
- approval routing;
- DeepSeek Harness integration;
- filesystem containment or Workspace Transaction behavior.

A document that parses successfully is **not** thereby a valid or authorized
CapabilityPolicy.

## 3. Loader input contract

A loader request consists of:

```text
format: JSON | YAML
source: UTF-8 text
sourceRef: optional opaque diagnostic reference
```

`format` MUST be explicit. The loader MUST NOT select policy semantics from a
filename extension and MUST NOT use content sniffing to silently reinterpret a
request declared as another format.

`sourceRef`, when present, is diagnostic metadata only. It MUST NOT affect the
parsed value.

## 4. Loader output contract

On success, the loader returns exactly one detached JSON-compatible value:

```text
null
boolean
finite number
string
array of JSON-compatible values
object with string keys and JSON-compatible values
```

The loader MUST NOT return functions, symbols, bigint values, dates, class
instances, cyclic graphs, shared-reference graphs, non-finite numbers, or other
host-language-only values.

The result MUST be detached from parser-internal mutable structures. Mutating the
returned value MUST NOT mutate parser state or any later load result.

## 5. JSON loading

For `format = JSON`:

1. the complete source MUST contain exactly one JSON value;
2. trailing non-whitespace content MUST fail;
3. malformed syntax MUST fail;
4. duplicate object member names MUST fail rather than acquiring hidden
   last-write-wins precedence;
5. non-finite numeric values are not valid JSON and MUST fail;
6. successful parsing MUST NOT perform policy schema validation.

Because ordinary host `JSON.parse` APIs may silently accept duplicate keys, an
implementation claiming M4-001 conformance MUST use a parsing strategy that can
reject duplicates before information is lost.

## 6. YAML loading

For `format = YAML`, the accepted syntax is intentionally constrained to a safe,
portable JSON-compatible subset.

A conforming loader MUST:

1. accept exactly one YAML document;
2. reject multiple documents, including otherwise-empty additional documents;
3. reject anchors and aliases;
4. reject merge keys;
5. reject explicit/custom tags;
6. reject duplicate mapping keys;
7. reject mappings whose keys are not strings;
8. reject scalars that materialize outside the JSON value domain;
9. reject cyclic or shared-reference graphs;
10. reject non-finite numbers;
11. return ordinary detached arrays/objects/scalars only.

These restrictions are parser-safety and portability requirements. They are not
CapabilityPolicy schema validation.

## 7. Failure contract

Loading failure MUST be explicit and MUST NOT return a partial document.

The portable failure reasons for M4-001 are:

```text
POLICY_DOCUMENT_FORMAT_UNSUPPORTED
POLICY_DOCUMENT_SYNTAX_INVALID
POLICY_DOCUMENT_DUPLICATE_KEY
POLICY_DOCUMENT_MULTIPLE_DOCUMENTS
POLICY_DOCUMENT_YAML_ALIAS_FORBIDDEN
POLICY_DOCUMENT_YAML_TAG_FORBIDDEN
POLICY_DOCUMENT_YAML_MERGE_FORBIDDEN
POLICY_DOCUMENT_NON_STRING_KEY
POLICY_DOCUMENT_NON_JSON_VALUE
POLICY_DOCUMENT_LIMIT_EXCEEDED
```

Implementations MAY attach non-authoritative diagnostic detail such as line,
column, parser message, or `sourceRef`. Such diagnostics MUST NOT change the
portable reason code.

Unknown/unsupported declared formats MUST fail with
`POLICY_DOCUMENT_FORMAT_UNSUPPORTED`; they MUST NOT fall back to JSON or YAML.

## 8. Resource limits

The loader is an untrusted-input boundary and MUST enforce explicit finite
limits before or during parsing.

At minimum an implementation MUST bound:

- source byte length;
- nesting depth;
- total container entries.

The implementation MAY expose configurable limits, but defaults MUST be finite.
When a configured limit is exceeded, loading MUST fail with
`POLICY_DOCUMENT_LIMIT_EXCEEDED` and MUST NOT return a partial value.

These limits are denial-of-service protections, not policy authorization rules.

## 9. Determinism

For the same declared format, source text, and loader limits, a conforming loader
MUST produce the same JSON-compatible value or the same portable failure reason.

The loader MUST NOT use:

- wall-clock time;
- randomness;
- environment variables;
- filesystem state other than the caller-supplied source;
- network state;
- DeepSeek Harness runtime state

to decide parsing success or output.

## 10. Security boundary

The loader handles untrusted configuration text. It MUST NOT execute constructors,
custom tag handlers, scripts, template expressions, environment interpolation,
filesystem includes, network includes, or arbitrary code while parsing.

Successful loading does not grant any capability. Authorization begins only after
later gates validate and evaluate the parsed document.

## 11. Required M4-001 evidence

Before M4-001 is accepted, repository evidence MUST prove at least:

1. JSON CapabilityPolicy text loads into a detached JSON-compatible value;
2. YAML representing the same ordinary data shape loads successfully;
3. malformed JSON/YAML fails explicitly;
4. duplicate keys fail for both JSON and YAML;
5. YAML multi-document input fails;
6. YAML aliases/anchors fail;
7. YAML custom tags fail;
8. non-string YAML mapping keys fail;
9. unsupported format fails without fallback;
10. parser safety limits fail closed;
11. loader tests do not perform M4-002 schema validation or later policy
    evaluation.

## 12. Compatibility authority

DeepSeek Harness is not an authority for this document format. No Harness API,
parser behavior, package type, or runtime event may redefine M4-001 semantics.
