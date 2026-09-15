# Spec 0031 — M4 Subject Resolution

Status: **M4-020 normative profile**  
Scope: **deterministic Subject identity/context resolution only**  
Protocol authority: `specs/0001-safe-runtime-core.md`, `specs/0002-state-machines-and-precedence.md`, `schemas/v1alpha1/defs.schema.json`  
Prerequisite: **M4-014 governance closed**

## 1. Purpose

M4-020 defines the deterministic fail-closed boundary that converts an untrusted protocol `Subject` value plus the authoritative request/session context into immutable subject evidence suitable for later policy evaluation.

M4-020 exists because Core §5 defines a Subject as the identity requesting capability and Core §8.3 requires subject canonicalization before policy matching, while the protocol schema currently leaves several runtime-only ambiguity and hostile-JavaScript cases unspecified.

M4-020 answers only:

1. whether the supplied Subject is a valid v0.1 protocol subject;
2. whether its optional subject-local session reference is consistent with the authoritative request session;
3. what detached immutable Subject identity/context may be handed to later policy evaluation.

M4-020 does **not** decide whether a policy rule matches that Subject and does **not** authorize anything.

## 2. Existing protocol authority

The standard `SubjectKind` vocabulary remains exactly:

```text
agent
subagent
tool
plugin
system
verifier
human
service
```

A Subject has protocol fields:

```text
kind
id
parent?
sessionRef?
```

The canonical-identity rules in Core §4 remain authority:

- identity references are stable and non-secret;
- they are not derived from mutable display names;
- they are serializable and safe to reference in evidence.

M4-020 does not invent a second identity namespace, hash-derived identity, display-name mapping, Harness session identity, package identity or provider identity.

## 3. Normative schema correction: subagent parent

Core §5 states:

```text
Subagent MUST have Parent Subject.
```

The current v0.1 `defs.schema.json` structurally requires the `parent` property for `kind: subagent`, but its conditional branch still permits `null`. That is broader than the Core normative requirement.

M4-020 resolves the conflict in favor of the existing Core requirement:

- `kind: subagent` MUST contain an own `parent` data property;
- that `parent` MUST be a non-empty protocol reference string;
- `null` is not a Parent Subject and MUST be rejected for a subagent.

The v0.1 schema MUST be corrected so a subagent `parent` is a string in the conditional `then` branch. This is a normative bug fix, not a new delegation feature.

For non-subagent kinds, the existing protocol shape remains unchanged: `parent` MAY be omitted, MAY be `null`, or MAY be a non-empty reference string. M4-020 does not assign lineage semantics to those values.

## 4. Request/session context

A `CapabilityRequest` already requires a top-level `sessionRef`; `Subject.sessionRef` is optional.

M4-020 treats the request-level session reference as the authoritative request context for subject resolution.

Resolver input is logically:

```text
subject: unknown
requestSessionRef: unknown
```

The resolver MUST NOT accept a second caller-selected precedence rule for the two session values.

### 4.1 Effective session reference

Resolution is deterministic:

1. validate `requestSessionRef` as a protocol reference;
2. validate the Subject;
3. if `subject.sessionRef` is absent, resolved `sessionRef` is `requestSessionRef`;
4. if `subject.sessionRef` is present, it MUST be a valid protocol reference and MUST equal `requestSessionRef` exactly;
5. mismatch MUST fail closed.

No trimming, case folding, Unicode normalization, prefix matching or alias lookup is allowed.

This rule prevents one capability request from presenting two conflicting session identities while preserving the protocol's optional Subject-local field.

## 5. Protocol reference profile

For M4-020, `id`, non-null `parent`, `sessionRef`, and `requestSessionRef` use the existing v0.1 `defs.schema.json#/$defs/ref` structural bounds:

```text
primitive string
minimum UTF-16/JSON string length: 1
maximum protocol length: 512 Unicode code points for runtime validation
```

The runtime implementation MUST bound its Unicode traversal and MUST NOT materialize an input-sized code-point array solely to enforce the limit.

M4-020 deliberately does not make whitespace-only references invalid because the existing v0.1 schema only requires `minLength: 1`; tightening that lexical rule would be a separate protocol change.

Accepted strings are preserved exactly.

## 6. Subject input shape

A runtime Subject MUST be a non-null, non-array object with only these own string-keyed protocol fields:

```text
kind
id
parent
sessionRef
```

Required fields:

```text
kind
id
```

Additional rules:

- `kind` and `id` MUST be own data properties;
- `parent`, when present, MUST be an own data property;
- `sessionRef`, when present, MUST be an own data property;
- accessor-backed normative fields MUST NOT be invoked;
- inherited normative fields MUST NOT manufacture identity;
- unexpected own string keys MUST fail closed;
- own symbol keys MUST fail closed;
- sparse/array subjects are invalid;
- descriptor/own-key inspection failures MUST fail closed;
- no coercion through `String()`, `valueOf`, `toString` or Symbol conversion is permitted.

The resolver MAY use implementation-private descriptor helpers, but behavior must be equivalent to this profile.

## 7. Subject-kind rules

### 7.1 Standard kind only

`kind` MUST be exactly one standard `SubjectKind` string.

Unknown, case-changed or alias kinds fail closed. Examples:

```text
Agent      -> invalid
sub_agent  -> invalid
worker     -> invalid
```

### 7.2 Identifier

`id` MUST be a valid protocol reference under §5 and is preserved exactly.

M4-020 does not infer the kind from the ID. An ID such as `agent/root` remains opaque identity text; the `/` has no namespace semantics in this Gate.

### 7.3 Parent

For `subagent`:

```text
parent: REQUIRED non-empty reference string
```

For every other standard kind:

```text
parent: omitted | null | non-empty reference string
```

M4-020 validates only the supplied parent reference value. It does not prove that the parent exists, is active, belongs to the same session, or is authorized to delegate.

Parent existence/lineage and delegation attenuation remain separate later concerns.

## 8. Resolution result

Resolution returns exactly one of:

```text
RESOLVED
ERROR
```

A successful result is logically:

```text
status: RESOLVED
subject:
  kind: SubjectKind
  id: string
  parent?: string | null
  sessionRef: string
```

Properties:

- `sessionRef` is always materialized from the authoritative request context;
- an explicitly supplied subject-local equal `sessionRef` does not change output semantics;
- omitted `parent` remains omitted for non-subagent kinds rather than being rewritten to `null`;
- accepted strings are copied primitive values;
- output and nested Subject object are immutable;
- no caller-owned object reference is retained.

M4-020 does not emit `subjectRef` as a concatenated/generated string. Downstream components that need a ledger reference must use protocol-defined identity/evidence mechanisms rather than inventing a collision-prone serialization here.

## 9. Stable error reasons

M4-020 defines these portable failures:

```text
SUBJECT_REQUEST_SESSION_INVALID
SUBJECT_INPUT_INVALID
SUBJECT_INPUT_UNREADABLE
SUBJECT_FIELDS_INVALID
SUBJECT_KIND_INVALID
SUBJECT_ID_INVALID
SUBJECT_PARENT_INVALID
SUBJECT_SESSION_REF_INVALID
SUBJECT_SESSION_MISMATCH
```

Mapping:

- invalid/oversized `requestSessionRef` -> `SUBJECT_REQUEST_SESSION_INVALID`;
- non-object/null/array Subject -> `SUBJECT_INPUT_INVALID`;
- descriptor/ownKeys/revoked-Proxy failure -> `SUBJECT_INPUT_UNREADABLE`;
- unexpected own string/symbol fields or missing required own fields -> `SUBJECT_FIELDS_INVALID` unless a more specific normative field error below applies;
- unsupported kind -> `SUBJECT_KIND_INVALID`;
- invalid/oversized id -> `SUBJECT_ID_INVALID`;
- invalid parent shape, including subagent omission/null -> `SUBJECT_PARENT_INVALID`;
- present invalid/oversized subject sessionRef -> `SUBJECT_SESSION_REF_INVALID`;
- valid subject sessionRef unequal to authoritative requestSessionRef -> `SUBJECT_SESSION_MISMATCH`.

Errors MUST contain bounded stable metadata only and MUST NOT echo attacker-controlled identity/session strings, arbitrary object fields, getter source, exception values or stacks.

## 10. Deterministic inspection order

To make hostile-runtime failures portable and prevent one implementation from touching more attacker-controlled state than another, the runtime resolution order is:

```text
1. requestSessionRef primitive/bound validation
2. Subject record/array readability check
3. Subject own-key set readability and allowed-key check
4. kind own data-property read + validation
5. id own data-property read + validation
6. parent own data-property read + kind-specific validation
7. sessionRef own data-property read + validation
8. exact session consistency check
9. detached immutable result construction
```

After a stage fails, later stages MUST NOT be inspected.

## 11. No policy-selector semantics in M4-020

`CapabilityPolicy.spec.rules[].subjects` already exists structurally as an optional array of strings, but the current Core/schema do not define a portable selector grammar or matching algorithm for those strings.

M4-020 MUST NOT silently invent one.

In particular M4-020 does not define:

- `kind:id` syntax;
- wildcard subject selectors;
- prefix/namespace matching;
- parent/descendant matching;
- session selectors;
- role/group/team selectors;
- Harness agent/subagent names as selectors.

M4-021 policy evaluation owns the rule-subject matching profile and must define it protocol-first before consuming `subjects[]` for authorization.

This separation prevents a normalization helper from becoming a hidden PDP.

## 12. No authentication or directory lookup claim

A structurally resolved Subject is identity evidence supplied to the broker boundary; M4-020 does not authenticate the actor.

It does not query:

- DeepSeek Harness session stores;
- plugin registries;
- operating-system users;
- IAM/SSO directories;
- service accounts;
- human identity providers;
- parent subject registries.

An Adapter or later trusted identity binding may establish that runtime evidence corresponds to a protocol Subject. That binding must not be inferred merely from a matching display string.

## 13. DeepSeek Harness compatibility boundary

DeepSeek Harness `0.1.0-rc.5` at commit
`47f943859bef60e4160492346772ded9b24f765a` remains compatibility evidence only.

M4-020 MUST NOT promote Harness `SessionId`, provider names, agent names, subagent run IDs, workflow sequence values, `parentSession`, `delegationDepth`, or other concrete runtime fields into portable Subject semantics without a separate normative mapping.

Existing M2 reconnaissance may inform a future Adapter binding, but M4-020 core resolution imports no concrete Harness type.

## 14. Delegation boundary

Core requires delegation to be attenuating, but M4-020 does not evaluate grants or prove attenuation.

A valid `subagent.parent` reference proves only that a parent reference was supplied. It does not prove:

- parent existence;
- parent ownership of a capability;
- child capability subset;
- resource containment;
- TTL/max-use attenuation;
- constraint attenuation;
- guarantee inheritance.

Those checks remain with later lease/delegation and policy Gates.

## 15. Privacy and retention

The resolver MUST retain no caller-owned Subject container.

It may return only detached protocol identity strings required by the resolved Subject. It MUST NOT capture:

- arbitrary extra properties;
- prototype state;
- accessors/functions;
- runtime tokens;
- tool arguments;
- environment values;
- Harness objects.

Errors MUST not echo rejected subject/session values.

## 16. Portable fixture requirements

Before production implementation, M4-020 MUST publish language-independent fixtures covering at least:

1. root agent with omitted Subject sessionRef inherits request session;
2. root agent with exactly equal Subject sessionRef;
3. subagent with parent;
4. non-subagent explicit null parent preserved;
5. non-subagent explicit string parent preserved without assigning lineage semantics;
6. all standard Subject kinds;
7. unknown/case-changed kind rejection;
8. empty and oversized id rejection;
9. subagent missing parent rejection;
10. subagent null parent rejection;
11. empty/oversized parent rejection;
12. invalid/oversized request session rejection;
13. invalid/oversized Subject sessionRef rejection;
14. exact session mismatch rejection;
15. session comparison remains case-sensitive and normalization-free;
16. whitespace-only refs retain existing schema-compatible behavior;
17. unexpected field rejection.

TypeScript runtime-only tests MUST additionally cover inherited fields, accessors without getter execution, symbols, arrays, descriptor failures, ownKeys failures, revoked Proxies, deterministic inspection order, input non-mutation, output detachment, recursive freezing and no rejected-value leakage.

## 17. Reference implementation requirements

The TypeScript reference implementation MUST:

1. live in `@dsh-safe/policy-engine` because M4-020 is the first PDP preparation primitive;
2. depend on protocol `Subject` vocabulary but import no concrete `adapter-dsh` or Harness type;
3. expose one narrow subject-resolution function rather than a full PDP object;
4. use bounded primitive/descriptor inspection;
5. return detached recursively immutable success values;
6. return stable fail-closed errors;
7. perform no policy rule selection/effect resolution;
8. perform no filesystem/process/network/provider operation;
9. perform no lease, approval, receipt or guarantee assignment;
10. preserve accepted M4-001 through M4-014 behavior unchanged.

## 18. Schema/TCK synchronization requirement

Because M4-020 corrects the existing subagent-parent schema mismatch, protocol-first work must synchronize:

- this Spec 0031;
- `defs.schema.json` conditional subagent-parent constraint;
- at least one schema-invalid `subagent.parent: null` CapabilityRequest fixture;
- schema compatibility baseline;
- M4-020 portable subject-resolution corpus.

No schema or baseline Gate may be disabled to land this correction.

## 19. Acceptance criteria

M4-020 is acceptable only when:

- Spec 0031 and portable fixtures land before production implementation;
- Core and schema agree that a subagent has a non-null parent reference;
- request-session ambiguity fails closed;
- runtime Subject inputs cannot gain identity through prototypes/accessors/coercion;
- no subject selector grammar is invented early;
- no Harness concrete identity becomes protocol authority;
- no authentication, delegation, PDP decision, approval, lease, receipt, guarantee or PEP claim is introduced;
- all portable fixtures are consumed directly by production tests;
- hostile-runtime tests pass under strict TypeScript;
- exact protocol-first and implementation heads each reach normal CI plus exact pinned Harness source-conformance dual-green.

## 20. Future gates

After M4-020 governance closes, M4-021 may define full policy evaluation, including the previously unspecified semantics of optional policy `subjects[]` selectors.

M4-020 does not authorize M4-021 early. M4-022+ lease lookup, M4-023 approval routing, M4-024 receipt, M4-025 guarantee assignment, M4-040+ PEP and M6 remain separate Gates.
