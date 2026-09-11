# Spec 0029 — M4-013 Unknown-Tool Fallback Resolution

Status: **M4-013 normative profile**  
Scope: **fixed current classifier composition + fail-closed unknown-tool fallback only**  
Portable fallback profile: `STRICT_DENY_V1`  
DeepSeek Harness compatibility baseline: `0.1.0-rc.5` at `47f943859bef60e4160492346772ded9b24f765a`

## 1. Purpose

M4-013 closes the security gap intentionally left by M4-010 and M4-011:
`NOT_APPLICABLE` is not an authorization result, so a tool that no accepted
capability classifier recognizes must not fall through to execution.

This Gate defines the deterministic current classifier resolver and the portable
v0.1 unknown-tool fallback profile.

It answers only:

> For the current accepted built-in classifier set, is this call classified,
> rejected by the owning classifier, or still unclassified; and if it remains
> unclassified, what mandatory fail-closed disposition applies?

M4-013 does **not** perform policy/PDP evaluation, create a CapabilityRequest or
CapabilityDecision, resolve a resource, invoke approval, consume a lease, assign
a guarantee, execute a tool, register an enforcement hook, or define a generic
plugin-classifier registry.

`BLOCK` in this specification is therefore a required pre-execution disposition,
not evidence that runtime enforcement has already occurred. M4-040+ owns the
actual `tools/pre-execute` enforcement integration.

## 2. Authority and reconciliation

### 2.1 Safe-runtime protocol authority

`specs/0001-safe-runtime-core.md` §8.3 requires unknown Capability to default to
`deny`. A tool call that has no trustworthy capability classification cannot
produce a conforming allow/ask decision because no valid CapabilityRequest with
known capability/resource semantics exists yet.

M4-013 therefore MUST NOT synthesize a wildcard or catch-all capability merely to
send an unknown tool into the PDP.

In particular, M4-013 MUST NOT invent names such as:

```text
tool.*
unknown.execute
plugin.execute
external.mutate
```

as a surrogate capability for an unclassified tool.

### 2.2 Accepted classifier authority

M4-010 and M4-011 define three classifier states:

```text
CLASSIFIED
NOT_APPLICABLE
ERROR
```

For both classifier families:

- `CLASSIFIED` is conservative capability-effect classification only;
- `ERROR` is a recognized tool whose required classification input is malformed
  or unreadable and is already fail-closed;
- `NOT_APPLICABLE` means only that this classifier does not own the exact tool
  name.

M4-013 MUST preserve an owning classifier's `CLASSIFIED` or `ERROR` result. It
MUST NOT convert an `ERROR` into unknown-tool fallback and MUST NOT interpret one
classifier's `NOT_APPLICABLE` as proof that all classifiers are exhausted.

### 2.3 MCP metadata authority

M4-012 classifies MCP `ToolAnnotations` only as:

```text
authority: ADVISORY_ONLY
trust: UNVERIFIED_SERVER
```

That evidence is not a capability classification and MUST NOT turn an otherwise
unclassified tool into allow, ask, read-only, idempotent, or safe execution.

Even if a future Adapter seam makes M4-012 evidence available at call time,
M4-013's `STRICT_DENY_V1` fallback remains `BLOCK` until an authorized classifier
actually produces the tool's capability requirements.

### 2.4 MCP protocol compatibility evidence

MCP `2025-11-25` treats calls to unknown tools as protocol errors and states that
ToolAnnotations from untrusted servers must not drive tool-use decisions.
M4-013 does not rely on the remote server to provide that protection: an
unclassified model-facing call is blocked before safe-runtime can claim it is
covered by capability policy.

References:

- `https://modelcontextprotocol.io/specification/2025-11-25/server/tools`
- `https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations`

### 2.5 Engineering references, not protocol authority

M4-013 follows the mature authorization property used by systems such as Cedar
and OPA: absence of an explicit grant does not become permission.

- Cedar authorization defaults to Deny when no permit policy is satisfied:
  `https://docs.cedarpolicy.com/auth/authorization.html`.
- OPA documents `default allow := false` as the standard default-deny access
  control pattern:
  `https://www.openpolicyagent.org/docs/policy-reference/keywords/default`.

These references inform engineering practice only. If they conflict with
safe-runtime normative semantics, safe-runtime protocol/spec authority wins.

## 3. Current classifier set

M4-013 composes exactly the already governance-closed built-in classifier set.
It does not discover classifiers dynamically.

### 3.1 Built-in filesystem classifier

From M4-010, exact names are:

```text
read
read_image
write
edit
glob
grep
str_replace_editor
```

### 3.2 Built-in shell classifier

From M4-011, exact names are:

```text
bash
pwsh
```

The two accepted name sets are disjoint.

This disjointness is a normative invariant for the fixed M4-013 resolver. Adding
an overlapping built-in name MUST be treated as a normative classifier change;
it MUST NOT silently create first-match authorization precedence.

### 3.3 Explicit exclusions

The current classifier set does not include:

- an MCP capability classifier;
- arbitrary plugin tools;
- prefix/fuzzy/alias matching;
- a dynamic classifier registry;
- user-supplied classifier callbacks.

M4-014 owns the generic/plugin classifier API and its precedence/conflict rules.

## 4. Conceptual operation

The portable semantics are represented by:

```text
resolveToolClassification(
  profile: unknown,
  toolName: unknown,
  arguments: unknown
) -> ToolClassificationResolution
```

The TypeScript API MAY use a different argument order if that is more idiomatic,
but it MUST preserve the behavior and inspection order defined here.

The resolver is a composition boundary over the existing M4-010/M4-011
classifiers. It MUST reuse those accepted classifiers rather than copy their
name/argument/capability logic into a third classifier implementation.

## 5. Fallback profile

The only portable v0.1 fallback profile is exactly:

```text
STRICT_DENY_V1
```

Profile selection MUST be explicit. There is no implicit default profile in this
Gate.

Any other runtime value, including:

```text
missing / undefined
null
allow
ask
ALLOW
STRICT_DENY
strict_deny_v1
object / array / number / boolean
```

is invalid configuration and MUST fail closed with:

```text
ERROR {
  reason: UNKNOWN_TOOL_PROFILE_INVALID
}
```

The resolver MUST validate the fallback profile before tool-name classification.
If the profile is invalid, it MUST return the profile error without inspecting
tool arguments.

M4-013 intentionally does not define an `ALLOW_UNKNOWN` or `ASK_UNKNOWN` profile.
Approval cannot safely compensate for missing capability/resource semantics, and
an allow fallback would contradict the v0.1 unknown-capability default-deny
boundary.

A future profile with materially different semantics requires an explicit
normative change; it MUST NOT be introduced as an implementation-only enum value.

## 6. Tool-name boundary

After the profile is validated, `toolName` MUST be a primitive, non-empty string.

M4-013 does not otherwise impose a global tool-name grammar because safe-runtime
may bridge multiple tool ecosystems. In particular, the resolver MUST NOT:

- trim the tool name;
- case-fold it;
- Unicode-normalize it;
- split it on `_`, `.`, `:`, `/`, or another separator;
- infer a namespace from a prefix;
- parse a model-facing MCP name back into server/raw-tool identity.

A non-string or empty string MUST return:

```text
ERROR {
  reason: TOOL_NAME_INVALID
}
```

and MUST NOT inspect tool arguments.

Whitespace-only and other unusual non-empty strings are not normalized into a
known name; they proceed as opaque exact names and therefore normally reach the
strict unclassified fallback.

## 7. Deterministic resolver algorithm

A conforming implementation MUST perform these stages in order:

1. validate `profile` as exact primitive string `STRICT_DENY_V1`;
2. otherwise return `UNKNOWN_TOOL_PROFILE_INVALID` without inspecting tool
   arguments;
3. validate `toolName` as a primitive non-empty string;
4. otherwise return `TOOL_NAME_INVALID` without inspecting tool arguments;
5. invoke the accepted M4-010 built-in filesystem classifier with the exact tool
   name and original argument value;
6. if its result is `CLASSIFIED` or `ERROR`, return that result without invoking
   unknown-tool fallback;
7. only if it returns `NOT_APPLICABLE`, invoke the accepted M4-011 built-in shell
   classifier with the exact same inputs;
8. if its result is `CLASSIFIED` or `ERROR`, return that result without invoking
   unknown-tool fallback;
9. only if both accepted classifiers return `NOT_APPLICABLE`, return the
   `STRICT_DENY_V1` unclassified result from §8.

The filesystem-then-shell order is deterministic composition for the current
reviewed disjoint name sets. It is not a general classifier precedence policy.
M4-014 MUST define explicit generic precedence/conflict semantics before dynamic
or overlapping classifiers can be introduced.

## 8. Unknown-tool result

When both current classifiers return `NOT_APPLICABLE`, M4-013 returns exactly the
portable fallback meaning:

```text
UNCLASSIFIED {
  profile: STRICT_DENY_V1
  disposition: BLOCK
  reason: NO_APPLICABLE_CLASSIFIER
}
```

A TypeScript projection SHOULD use:

```text
{
  status: "UNCLASSIFIED",
  profile: "STRICT_DENY_V1",
  disposition: "BLOCK",
  reason: "NO_APPLICABLE_CLASSIFIER"
}
```

This result means:

- no classifier in the current accepted set produced trustworthy capability
  requirements;
- the call MUST NOT continue as though it were allowed;
- no CapabilityRequest/Decision is fabricated;
- no approval request is fabricated;
- no claim is made that runtime enforcement has already happened.

The result MUST NOT include or echo:

- the unknown tool name;
- arbitrary arguments;
- MCP server names/raw names;
- descriptions or schemas;
- annotations;
- exception stacks;
- secret-bearing values.

This keeps the fallback privacy-preserving and prevents attacker-controlled tool
identifiers from becoming implicit audit payloads before the later receipt/
provenance Gate defines redaction rules.

## 9. Recognized errors are not fallback

If an accepted classifier recognizes the exact name and returns `ERROR`, M4-013
MUST preserve that error result.

Examples:

```text
read + missing file_path
  -> FS_TOOL_PATH_INVALID
  -> NOT NO_APPLICABLE_CLASSIFIER

bash + blank command
  -> SHELL_TOOL_COMMAND_INVALID
  -> NOT NO_APPLICABLE_CLASSIFIER
```

This prevents malformed recognized calls from being reclassified as generic
unknown tools and losing their stable diagnostics.

Every classifier/fallback `ERROR` remains fail-closed. M4-013 does not turn an
error into a successful deny decision; later orchestration/enforcement must keep
the error distinct while refusing execution.

## 10. Unknown arguments remain untouched

For a tool name that neither current classifier owns, both M4-010 and M4-011
already return `NOT_APPLICABLE` before inspecting the argument graph.

M4-013 fallback MUST preserve this property. It MUST NOT inspect, enumerate,
clone, spread, stringify, recursively traverse, or retain unknown-tool arguments.

Therefore an unknown tool with any of the following still reaches the same
strict fallback without argument inspection:

- `null`;
- array;
- deeply nested object;
- accessor-bearing object;
- revoked Proxy;
- object containing annotation-looking fields;
- object containing secret-looking values.

JSON fixtures cover portable shapes; runtime tests MUST prove getter/proxy cases
that JSON cannot encode.

## 11. MCP public names and metadata

M4-013 MUST treat an opaque name such as:

```text
mcp__server__tool
```

exactly like any other non-recognized string in the current classifier set.

It MUST NOT:

- parse `mcp__` as a trusted routing prefix;
- recover raw MCP identity from the public name;
- call M4-012 based on name shape;
- infer capabilities from tool description, schemas, annotations, or name text;
- grant an exception because a metadata hint says read-only/non-destructive/
  idempotent/closed-world.

The pinned rc5 MCP bridge identity/metadata limitations recorded by M4-012 remain
compatibility evidence and are not bypassed by M4-013.

## 12. Determinism and immutability

For identical primitive profile/name values and accepted classifier inputs, the
resolver MUST produce the same result.

The resolver MUST NOT depend on:

- host time;
- randomness;
- locale;
- environment variables;
- filesystem/network/process state;
- MCP server availability;
- Harness singleton state;
- registry iteration order.

The TypeScript reference implementation MUST return frozen new M4-013
`UNCLASSIFIED` and resolver-owned `ERROR` results. Existing M4-010/M4-011
classified/error results already satisfy their own immutability contracts and
M4-013 MUST NOT weaken them.

## 13. Non-goals

M4-013 does not implement:

- generic/plugin-supplied classifier registration (M4-014);
- plugin precedence or duplicate-name resolution (M4-014);
- MCP capability inference;
- trust establishment for MCP metadata;
- name/description/schema-based capability inference;
- CapabilityRequest creation;
- subject resolution/full PDP evaluation (M4-020/M4-021);
- lease lookup (M4-022);
- approval routing (M4-023);
- decision receipts/provenance (M4-024);
- guarantee assignment (M4-025);
- `tools/pre-execute` PEP registration/enforcement (M4-040+);
- provider containment or process isolation;
- M4-050+ negative-boundary tests ahead of their Gate;
- M6 workspace transaction behavior.

## 14. Portable conformance corpus

`fixtures/tool-classifier/unknown-tool-fallback-cases.json` is the portable
M4-013 corpus.

It MUST cover at least:

### Existing classifier preservation

- recognized filesystem classification is preserved;
- recognized shell classification is preserved;
- recognized filesystem malformed input preserves its M4-010 error;
- recognized shell malformed input preserves its M4-011 error.

### Strict fallback

- ordinary unknown name -> `UNCLASSIFIED / STRICT_DENY_V1 / BLOCK`;
- shell aliases/case variants remain unknown;
- filesystem case variants remain unknown;
- MCP-public-name-looking string remains opaque and blocked;
- unknown calls with null/array/nested argument values still produce the same
  fallback rather than argument-validation errors.

### Invalid configuration/input

- missing/null/case-changed/allow/ask/object/array profile values fail closed as
  `UNKNOWN_TOOL_PROFILE_INVALID`;
- invalid profile wins before known-tool argument inspection;
- non-string/empty tool names fail closed as `TOOL_NAME_INVALID`.

Runtime-only tests MUST additionally prove:

- invalid profile returns before any argument getter/proxy is touched;
- invalid tool name returns before any argument getter/proxy is touched;
- unknown exact name does not execute argument getters;
- unknown exact name does not trigger argument `ownKeys` traps;
- revoked Proxy arguments for an unknown name do not throw and still fallback;
- recognized revoked-Proxy arguments preserve the owning classifier's stable
  fail-closed error;
- new M4-013 results are frozen;
- no attacker-controlled argument/name object is retained.

## 15. Acceptance conditions

M4-013 implementation is authorized only after this spec and portable corpus
reach exact-head normal CI plus exact pinned Harness rc5 source-conformance
dual-green.

Implementation acceptance additionally requires all of the following:

1. the resolver reuses accepted M4-010 and M4-011 classifiers rather than
   duplicating their classification logic;
2. only `STRICT_DENY_V1` is accepted as portable fallback profile;
3. invalid profile/tool-name states fail closed before argument inspection;
4. recognized `CLASSIFIED` and `ERROR` results are preserved;
5. only the all-`NOT_APPLICABLE` current path reaches `UNCLASSIFIED / BLOCK`;
6. unknown-tool arguments remain completely uninspected;
7. MCP model-facing names are not parsed and M4-012 hints cannot reduce the
   fallback;
8. no synthetic capability/resource/request/decision/approval/lease/guarantee is
   created;
9. no dynamic registry or plugin classifier API is pulled forward from M4-014;
10. no runtime enforcement claim is made before M4-040+;
11. strict TypeScript and zero-warning lint remain green;
12. no schema, validator, TCK, frozen-lockfile, supply-chain, architecture,
    compatibility, protocol-authority, or fail-closed requirement is weakened;
13. exact-head normal CI and pinned Harness source-conformance are green at the
    accepted implementation and governance heads.

M4-014+, M4-020+, M4-040+, and M6 remain unauthorized by M4-013 acceptance
alone.
