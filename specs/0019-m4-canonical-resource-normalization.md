# M4-003 — Canonical Resource Normalization

Status: **DRAFT NORMATIVE SPECIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-003 P0 — canonical resource normalization`  
Depends on: M1 Capability model, M4-001 document loading, M4-002 schema validation

## 1. Purpose

M4-003 defines the portable normalization boundary that MUST run before policy
matching or precedence logic consumes a resource.

The purpose of this gate is **not** to guess an operating-system path, resolve a
provider token, or implement glob matching. Its purpose is to remove ambiguity
between the two resource representations already present in v0.1:

1. an exact `CapabilityResource` carried by a `CapabilityRequest`:

   ```json
   {
     "scheme": "workspace",
     "locator": "/src/auth.ts",
     "providerIdentity": "opaque-provider-token"
   }
   ```

2. a policy resource selector stored as a string:

   ```text
   workspace://**
   hostfs://~/.ssh/**
   ```

A conforming M4-003 implementation MUST convert each accepted input into a
single deterministic structural representation or fail explicitly. It MUST NOT
silently reinterpret provider-owned or platform-specific semantics.

## 2. Authority and existing invariants

This specification preserves the following existing v0.1 authority:

- `specs/0001-safe-runtime-core.md` requires Resource Canonicalization before
  policy matching and states that filesystem authorization MUST use provider
  stable identity / containment semantics rather than parsing opaque backend
  targets;
- `specs/0002-state-machines-and-precedence.md` places subject/resource/action
  canonicalization before malformed-request rejection and rule collection;
- `schemas/v1alpha1/defs.schema.json#/$defs/resource` defines the structured
  `CapabilityResource` surface;
- `schemas/v1alpha1/capability-policy.schema.json` currently represents rule
  resources as strings;
- `packages/protocol` is a language projection only and does not override these
  specifications;
- DeepSeek Harness is compatibility evidence only and cannot define canonical
  protocol identity.

M4-003 MUST NOT modify these invariants by implementation accident.

## 3. Terminology

### 3.1 Exact resource

An **Exact Resource** is one structured `CapabilityResource`:

```text
scheme
locator
providerIdentity?   // optional, opaque adapter/provider token
```

It identifies the resource an action is requesting. It is not a policy glob.

### 3.2 Policy resource selector

A **Policy Resource Selector** is a policy `resources[]` string with the portable
outer grammar:

```text
<scheme>://<locator-pattern>
```

M4-003 parses only this outer grammar. The locator-pattern contents are kept
opaque at this gate except for portable safety/size checks. Wildcard matching and
resource specificity are deliberately later semantics.

### 3.3 Provider identity

`providerIdentity` is a provider-owned opaque token. It MAY be used by the
adapter/runtime to refer back to a target previously resolved by that provider.

The protocol core and policy-engine MUST NOT:

- parse it as a path or URI;
- apply case folding or Unicode normalization to it;
- synthesize one from `locator`;
- reconstruct `locator` from it;
- use its string prefix for containment;
- assume tokens from two provider instances share one identity namespace.

## 4. Standard resource schemes

M4-003 v0.1 accepts exactly the schemes already declared by the Capability
Resource schema:

```text
workspace
hostfs
process
network
secret
session
config
external
```

An unknown scheme MUST fail explicitly. M4-003 does not create an extension
scheme mechanism.

Scheme spelling is already canonical and MUST be lowercase. Implementations
MUST NOT silently convert an unknown or differently-cased scheme to a standard
scheme.

Examples:

```text
workspace   -> valid
hostfs      -> valid
Workspace   -> invalid
file        -> invalid
```

## 5. Portable string domain

### 5.1 Locator and locator-pattern requirements

An accepted exact `locator` or policy `locator-pattern` MUST:

1. be non-empty;
2. contain at most 4096 Unicode code points;
3. contain no C0 control character `U+0000` through `U+001F`;
4. contain no `U+007F` DELETE character.

Spaces and non-ASCII Unicode code points are not intrinsically invalid.
Leading/trailing spaces, if present, are data and MUST NOT be trimmed.

The 4096-code-point limit aligns the normalization boundary with the current
structured resource schema's locator bound while also bounding policy selector
locators, whose current M1 schema is intentionally less specific.

### 5.2 Operations explicitly forbidden

Generic M4-003 normalization MUST NOT perform any of the following on locator
or locator-pattern strings:

- Unicode NFC/NFD/NFKC/NFKD normalization;
- locale-sensitive or locale-insensitive case folding;
- percent decoding or URL decoding;
- environment-variable expansion;
- `~` home-directory expansion;
- slash/backslash conversion;
- repeated-separator collapse;
- `.` or `..` path resolution;
- symlink, junction, reparse-point, mount, hardlink, or realpath resolution;
- drive-letter or UNC rewriting;
- DNS resolution;
- URL host canonicalization;
- executable lookup;
- secret dereference.

Those operations can collapse distinct provider resources or import
platform-specific semantics into a portable protocol layer.

## 6. Exact resource normalization

### 6.1 Input

```text
CapabilityResource {
  scheme: ResourceScheme
  locator: string
  providerIdentity?: string
}
```

The caller SHOULD normally provide a value that already passed the applicable
CapabilityRequest schema boundary. The normalizer nevertheless MUST fail closed
when called with an invalid runtime value rather than relying solely on static
language types.

### 6.2 Output

Success returns a detached immutable-equivalent value with this portable shape:

```text
CanonicalResource {
  scheme: ResourceScheme
  locator: string
  providerIdentity?: string
}
```

The output MUST preserve accepted `locator` and `providerIdentity` code points
exactly. Canonicalization at this layer is therefore **structural and
rejecting**, not lossy text rewriting.

Repeated normalization of an accepted canonical resource MUST be idempotent:

```text
normalize(normalize(x)) == normalize(x)
```

where equality means equality of the portable fields above.

### 6.3 Provider identity validation

When `providerIdentity` is present it MUST:

1. be non-empty;
2. contain at most 4096 Unicode code points;
3. contain no C0 control character or `U+007F`.

Its contents MUST otherwise be preserved exactly.

Absence of `providerIdentity` is valid at this gate because the v0.1 structured
schema makes it optional and some tool-level resources are logical rather than
provider-resolved.

M4-003 success with no provider identity MUST NOT later be misreported as proof
of provider-enforced containment.

## 7. Policy resource selector normalization

### 7.1 Outer grammar

A policy selector MUST contain the literal delimiter `://` and MUST be parsed at
its **first** occurrence:

```text
<scheme>://<locator-pattern>
```

The scheme part MUST be one exact standard resource scheme from section 4. The
locator-pattern part MUST satisfy section 5.

Parsing at the first delimiter is normative so locator-patterns for schemes such
as `network` or `external` may themselves contain `://` without ambiguous outer
scheme parsing.

Examples:

```text
workspace://**
  -> scheme = workspace
  -> locatorPattern = **

hostfs://~/.ssh/**
  -> scheme = hostfs
  -> locatorPattern = ~/.ssh/**

network://https://example.invalid/api
  -> scheme = network
  -> locatorPattern = https://example.invalid/api
```

### 7.2 Output

Success returns:

```text
CanonicalResourceSelector {
  scheme: ResourceScheme
  locatorPattern: string
}
```

The locator-pattern MUST be preserved code-point-for-code-point after validation.
The output is structural and MUST NOT store a second, independently normalized
copy of the source string that could diverge.

Repeated normalization of the canonical pair serialized back as
`scheme + "://" + locatorPattern` MUST be idempotent.

### 7.3 Wildcards are not interpreted in M4-003

Existing Core examples contain `*` and `**`, but M4-003 MUST NOT define or
execute wildcard matching, recursive containment, or specificity ranking.

At this gate:

- `*` is ordinary locator-pattern data;
- `**` is ordinary locator-pattern data;
- no matcher is invoked;
- no selector is declared more specific than another.

The later gate that defines matching/specificity MUST do so normatively and with
portable fixtures before implementation. It MUST consume M4-003 canonical
selector structures rather than reparsing raw policy strings independently.

## 8. Provider-backed filesystem boundary

For `workspace` and `hostfs`, portable locator normalization is **not**
filesystem target canonicalization.

When stronger authorization depends on actual filesystem identity or
containment, an implementation MUST use the active provider/runtime's canonical
resolution and containment operations. It MUST NOT replace those operations with
text comparisons over:

```text
locator
providerIdentity
displayPath
processPath
```

In particular:

```text
child.locator.startsWith(parent.locator)
```

MUST NOT be treated as provider-enforced filesystem containment.

An adapter MAY attach the provider's already-resolved opaque token to the
structured resource as `providerIdentity`, but M4-003 only preserves that token;
it does not validate provider ownership or containment.

A provider adapter MUST prevent callers from manufacturing a provider target
merely by guessing the opaque identity string. The accepted M2 operational
filesystem port already follows this rule by retaining the provider target in an
adapter-local map.

## 9. Scheme-specific semantics deliberately deferred

The following are not portable M4-003 semantics:

### workspace / hostfs

- host realpath;
- symlink/junction resolution;
- case sensitivity;
- separator rules;
- root/drive/UNC interpretation;
- provider containment.

### process

- executable resolution;
- PATH lookup;
- shell parsing;
- argument normalization.

### network

- DNS resolution;
- IDNA normalization;
- URL parsing;
- host/default-port equivalence;
- method/path policy.

### secret

- secret lookup;
- provider name expansion;
- secret value access.

### session / config / external

- deployment-specific naming;
- backend identifiers;
- external API identity equivalence.

Future scheme-specific specifications MAY add stronger canonical forms, but they
MUST preserve this gate's no-guessing and no-silent-equivalence requirements.

## 10. Result contract

### 10.1 Success

Exact-resource normalization succeeds with:

```text
{
  ok: true,
  resource: CanonicalResource
}
```

Selector normalization succeeds with:

```text
{
  ok: true,
  selector: CanonicalResourceSelector
}
```

The returned value MUST be detached from mutable caller-owned containers.
Reference implementations SHOULD expose it as immutable/frozen where the
language supports that without changing portable semantics.

### 10.2 Failure

Failure MUST be explicit:

```text
{
  ok: false,
  reason: <portable reason>,
  field: <portable field discriminator>
}
```

Portable reasons:

```text
RESOURCE_INPUT_INVALID
RESOURCE_SCHEME_UNSUPPORTED
RESOURCE_LOCATOR_INVALID
RESOURCE_PROVIDER_IDENTITY_INVALID
RESOURCE_SELECTOR_SYNTAX_INVALID
RESOURCE_LIMIT_EXCEEDED
```

Portable fields:

```text
resource
scheme
locator
providerIdentity
selector
locatorPattern
```

Implementations MAY attach non-portable diagnostics for operators, but portable
fixtures MUST compare only the portable contract unless a later specification
promotes additional fields.

### 10.3 Failure classification

The following mapping is normative:

| Condition | Reason | Field |
| --- | --- | --- |
| input is not the expected object/string domain | `RESOURCE_INPUT_INVALID` | `resource` or `selector` |
| scheme is absent, differently cased, unknown, or not a string | `RESOURCE_SCHEME_UNSUPPORTED` | `scheme` |
| selector has no `://` delimiter | `RESOURCE_SELECTOR_SYNTAX_INVALID` | `selector` |
| selector delimiter leaves an empty locator-pattern | `RESOURCE_LOCATOR_INVALID` | `locatorPattern` |
| exact locator is empty | `RESOURCE_LOCATOR_INVALID` | `locator` |
| locator contains forbidden control code points | `RESOURCE_LOCATOR_INVALID` | `locator` |
| locator-pattern contains forbidden control code points | `RESOURCE_LOCATOR_INVALID` | `locatorPattern` |
| provider identity is empty or contains forbidden controls | `RESOURCE_PROVIDER_IDENTITY_INVALID` | `providerIdentity` |
| locator / pattern / provider identity exceeds the portable limit | `RESOURCE_LIMIT_EXCEEDED` | affected field |

When multiple defects are present, implementations MUST apply deterministic
validation order:

```text
input domain
→ selector outer syntax (selector API only)
→ scheme
→ locator / locatorPattern
→ providerIdentity
→ success
```

The first failure in this order is the portable result.

## 11. Security invariants

A conforming implementation MUST satisfy all of the following:

1. **No hidden trim.** Whitespace is never silently removed.
2. **No hidden decode.** Percent/URL encoding is never silently decoded.
3. **No host-path inference.** Generic normalization never calls host realpath or
   equivalent APIs.
4. **Opaque provider token.** `providerIdentity` is never parsed or manufactured
   from locator text.
5. **No string-prefix containment claim.** Text prefix comparison cannot become
   provider-enforced containment.
6. **No secret dereference.** Normalization never resolves a SecretRef or embeds a
   secret value.
7. **No policy decision.** Success means only that a canonical resource structure
   exists; it does not mean allow/deny/ask.
8. **No action rewrite.** M4-003 does not mutate tool arguments or execution
   targets.
9. **No Harness authority inversion.** Harness target/display/process-path
   implementation details remain adapter compatibility facts.
10. **No M4-004+ semantics.** Rule ordering, specificity, effect precedence,
    default deny, lease, approval, classifier, and PEP behavior remain later gates.

## 12. Portable fixture requirements

Before M4-003 implementation is accepted, language-independent fixtures MUST
cover at least:

### Exact resources — valid

- `workspace` locator with a leading slash;
- non-ASCII locator preserved exactly;
- locator containing ordinary spaces preserved exactly;
- optional opaque `providerIdentity` preserved exactly;
- repeated normalization is idempotent.

### Exact resources — invalid

- unknown scheme;
- differently-cased standard scheme;
- empty locator;
- locator containing newline / NUL;
- locator over the portable length limit;
- empty provider identity;
- provider identity containing a control character;
- provider identity over the portable length limit.

### Policy selectors — valid

- `workspace://**`;
- `hostfs://~/.ssh/**`;
- selector whose locator-pattern contains another `://`;
- non-ASCII locator-pattern preserved exactly;
- ordinary spaces preserved exactly.

### Policy selectors — invalid

- missing `://` delimiter;
- empty scheme;
- unknown scheme;
- differently-cased standard scheme;
- empty locator-pattern;
- control character in locator-pattern;
- locator-pattern over the portable length limit.

Fixtures MUST NOT assert wildcard matching, filesystem containment, path alias
resolution, or rule specificity in M4-003.

## 13. Reference implementation constraints

The TypeScript reference implementation SHOULD live in
`packages/policy-engine`, because M4-003 is the policy-engine canonicalization
boundary.

It MUST:

- contain no DeepSeek Harness imports;
- contain no `node:fs`, `node:path`, DNS, URL-normalization, or executable lookup
  dependency for generic resource normalization;
- use no `any` escape hatch;
- preserve strict TypeScript settings;
- return detached values;
- expose deterministic portable failures;
- keep provider identity opaque;
- avoid implementing matcher/order/effect semantics.

A small internal helper for counting Unicode code points and rejecting portable
control characters is acceptable. Its behavior MUST be covered by portable
fixtures rather than assumed from JavaScript UTF-16 string length.

## 14. Acceptance gate

M4-003 is acceptable only when all of the following are true:

1. this normative contract is present and reviewed;
2. portable fixtures cover section 12;
3. a strict TypeScript projection passes those fixtures;
4. repeat normalization is deterministic/idempotent;
5. no host/provider-specific path interpretation enters `policy-engine`;
6. no M4-004+ matching/ordering/evaluation behavior is introduced;
7. normal exact-head CI passes;
8. exact Harness rc5 source-conformance remains green as compatibility evidence;
9. no existing schema, validator, TCK, strictness, frozen-lockfile,
   architecture, or security gate is weakened.

Only after M4-003 acceptance and final governance-head dual-green may M4-004 be
considered for authorization.
