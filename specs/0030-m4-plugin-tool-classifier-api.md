# Spec 0030 — M4 Plugin-Supplied Tool Classifier API

Status: **M4-014 normative profile**  
Scope: **deterministic in-process plugin classifier registration and composition only**  
Protocol authority: `@dsh-safe/protocol`  
Prerequisites: **M4-010 / M4-011 / M4-013 accepted and governance-closed**

## 1. Purpose

M4-014 defines the smallest deterministic API by which trusted in-process integration code can register classifiers for additional exact model-facing tool names without weakening the accepted built-in classifiers or M4-013 strict unknown-tool fallback.

The API answers two questions only:

1. which plugin classifier, if any, owns an exact non-built-in tool name;
2. if an owner exists, whether that owner can classify the invocation into one of the already accepted M4-010/M4-011 classification families.

M4-014 does **not** authorize execution. It does not create a `CapabilityRequest`, `CapabilityDecision`, `CapabilityResource`, lease, approval, receipt, guarantee, provider identity, or enforcement claim.

M4-014 also does **not** make plugin code a security boundary. Registered callbacks execute in the same process and trust domain as the caller. A host-privileged plugin can still call Node or other host APIs directly; that remains `EXPECTED_UNGOVERNED` at the current tool-enforced stage.

## 2. Authority boundaries

### 2.1 Protocol capability authority

Capability names remain protocol authority. M4-014 MUST NOT allow a plugin callback to create new portable capability semantics merely by returning an arbitrary string.

The v0.1 plugin classifier API therefore supports only the classification families already normatively defined by:

- M4-010 filesystem classification (`fs.*` requirements and unresolved filesystem operands);
- M4-011 shell/process classification (`process.exec` and its unresolved shell-process operand).

A future classifier family for network, secrets, generic process wrappers, external effects, or other capabilities requires its own normative profile before M4-014 may carry it.

### 2.2 Built-in classifier authority

The accepted M4-010 and M4-011 exact built-in names are reserved:

```text
read
read_image
write
edit
glob
grep
str_replace_editor
bash
pwsh
```

A plugin registration MUST NOT claim any reserved name.

Built-in classifiers always run before plugin lookup. A plugin cannot shadow, replace, override, downgrade, or recover from a built-in `CLASSIFIED` or `ERROR` result.

### 2.3 M4-013 fallback authority

M4-013 `STRICT_DENY_V1` remains the unknown-tool safety baseline.

M4-014 adds an exact plugin-owner stage **before** strict fallback for a new registry-aware resolver. It does not mutate the accepted M4-013 `resolveToolClassification()` API or reinterpret its built-in-only composition.

If no built-in classifier and no exact plugin owner applies, resolution remains:

```text
UNCLASSIFIED / BLOCK / NO_APPLICABLE_CLASSIFIER
```

A missing plugin, disabled integration, registration failure, classifier exception, malformed classifier result, or owner rejection MUST NOT become allow/ask or another classifier fallback.

### 2.4 DeepSeek Harness boundary

No DeepSeek Harness concrete runtime type is part of this API. Tool names are opaque model-facing strings. Harness package layout, MCP naming conventions, server names, titles, annotations, or public-name punctuation MUST NOT define plugin ownership or precedence.

## 3. Non-goals

M4-014 does not define:

- plugin discovery or module loading;
- package manifests or dependency resolution;
- remote classifier services;
- asynchronous classifier callbacks;
- hot registration/reload/watchers;
- enable/disable mutation after registry construction;
- numeric priority;
- first-wins or last-wins precedence;
- regex, glob, prefix, suffix, namespace, or fuzzy ownership matchers;
- MCP server-name parsing;
- plugin isolation, worker/process supervision, sandboxing, or capability delegation;
- subject resolution, PDP evaluation, approval, leases, receipts, guarantees, or PEP execution;
- provider target resolution or containment;
- M6 workspace transaction semantics.

Process-isolated plugin hosting remains a later security milestone and MUST NOT be implied by this API.

## 4. Terminology

### 4.1 Plugin classifier

A plugin classifier is one immutable registration consisting logically of:

```text
classifierId
ownedToolNames[]
classify(toolName, arguments)
```

The callback is invoked only after the registry has proven exact ownership of `toolName`.

### 4.2 Exact ownership

Ownership is an exact Unicode string equality relation over a declared finite tool-name set.

Ownership has no normalization:

- no trimming after validation;
- no case folding;
- no Unicode normalization;
- no prefix/suffix semantics;
- no delimiter or namespace parsing;
- no MCP/server-name inference.

### 4.3 Registry snapshot

A registry snapshot is the immutable result of validating all registrations atomically and building an exact tool-name-to-owner map.

There is no partial-success registry.

## 5. Portable limits

The v0.1 profile defines explicit finite bounds so registry construction cannot require unbounded work from untrusted JavaScript shapes:

```text
MAX_PLUGIN_CLASSIFIERS = 128
MAX_PLUGIN_TOOL_NAMES_PER_CLASSIFIER = 128
MAX_PLUGIN_TOOL_CLAIMS = 1024
MAX_CLASSIFIER_ID_CODE_POINTS = 128
MAX_TOOL_NAME_CODE_POINTS = 256
```

A bound is measured in Unicode code points, not UTF-16 code units.

Validation MUST stop once a bound is exceeded; implementations MUST NOT materialize an input-sized code-point array solely to count it.

## 6. Registration contract

A registration contains exactly these logical fields:

```text
classifierId: string
ownedToolNames: list<string>
classify: synchronous classifier callback
```

### 6.1 `classifierId`

`classifierId` MUST:

- be a primitive string;
- contain at least one non-whitespace character;
- contain at most `MAX_CLASSIFIER_ID_CODE_POINTS` Unicode code points;
- be unique in the registry.

The accepted value is preserved exactly. It is an operational identity only and has no authorization precedence.

### 6.2 `ownedToolNames`

`ownedToolNames` MUST:

- be a finite ordinary dense list;
- contain at least one entry;
- contain no more than `MAX_PLUGIN_TOOL_NAMES_PER_CLASSIFIER` entries;
- contain only primitive strings;
- contain names with at least one non-whitespace character;
- contain names with at most `MAX_TOOL_NAME_CODE_POINTS` Unicode code points;
- contain no duplicate exact name inside one registration;
- contain no reserved built-in name;
- contain no exact name owned by another registration.

The registry MUST reject the whole candidate if any ownership conflict exists.

### 6.3 Callback

`classify` MUST be a callable synchronous callback.

The registry retains only the callback reference, copied primitive `classifierId`, and copied primitive owned tool names needed for operation. It MUST NOT retain the caller's registration object or `ownedToolNames` array.

Registration-time accessors, inherited security-relevant fields, exotic array properties, proxy/descriptor failures, or malformed callbacks MUST fail registry construction rather than execute hidden getters or create partial state.

## 7. Deterministic ownership and conflict policy

M4-014 has no dynamic precedence algorithm.

The only valid ownership state for a non-built-in tool name is:

```text
zero owners -> no plugin applies
one owner   -> invoke that owner
>1 owners   -> registry construction is invalid
```

The following are forbidden as conflict resolution mechanisms:

- registration order;
- array order across classifiers;
- numeric priority;
- lexical classifier ID;
- package name;
- MCP server name;
- callback probing;
- first successful classifier;
- last successful classifier.

This prevents authorization-relevant behavior from changing because plugins were loaded in a different order.

## 8. Registry construction result

Registry construction returns exactly one of:

```text
READY
ERROR
```

A `READY` registry is immutable and represents the complete validated snapshot.

Stable construction error reasons are:

```text
PLUGIN_REGISTRY_INVALID
PLUGIN_REGISTRY_LIMIT_EXCEEDED
PLUGIN_CLASSIFIER_ID_INVALID
PLUGIN_CLASSIFIER_ID_DUPLICATE
PLUGIN_TOOL_NAMES_INVALID
PLUGIN_TOOL_NAME_INVALID
PLUGIN_TOOL_NAME_DUPLICATE
PLUGIN_TOOL_NAME_RESERVED
PLUGIN_TOOL_OWNERSHIP_CONFLICT
PLUGIN_CLASSIFIER_CALLBACK_INVALID
PLUGIN_REGISTRY_INPUT_UNREADABLE
```

Error results MUST NOT echo callback source, arbitrary registration fields, arguments, secrets, exception stacks, or plugin-provided objects.

## 9. Plugin callback contract

The broker invokes a plugin callback with exactly:

```text
toolName: the exact owned primitive string
arguments: the original opaque invocation value
```

The broker MUST NOT pre-clone, enumerate, stringify, recursively traverse, or normalize `arguments` merely to invoke a plugin classifier.

A callback is trusted in-process integration code and may inspect the arguments it owns. The broker's security guarantee is therefore about **which callback is selected**, not about sandboxing callback behavior.

### 9.1 Callback outcome

An owning callback returns exactly one of:

```text
CLASSIFIED
REJECTED
```

It does not return `NOT_APPLICABLE`: exact applicability was already established by registry ownership.

`REJECTED` means the owner cannot safely classify this invocation. The broker maps it to a fail-closed classification error and MUST NOT try another classifier.

### 9.2 `CLASSIFIED` family

A plugin `CLASSIFIED` outcome declares exactly one family:

```text
FILESYSTEM
SHELL_PROCESS
```

`FILESYSTEM` requirements MUST conform to the accepted M4-010 `CLASSIFIED` requirement grammar.

`SHELL_PROCESS` requirements MUST conform to the accepted M4-011 `CLASSIFIED` requirement grammar.

The broker MUST validate and detach the returned classification before exposing it. Accessor-backed fields, inherited fields, sparse/named/symbol arrays, unsupported capabilities, malformed operands, proxy failures, or mutable caller-owned nested values MUST NOT become accepted classification evidence.

The normalized broker result uses the already accepted M4-010/M4-011 `CLASSIFIED` semantic shapes. The plugin-only `family` discriminator is registration-boundary input and does not create a third authorization model.

### 9.3 No new capability vocabulary by callback

A callback MUST NOT classify a requirement outside its declared supported family.

Examples that MUST fail closed in M4-014 v0.1 include plugin results that attempt to introduce:

```text
network.http
secret.use
external.api.write
an arbitrary custom capability string
an invented provider identity
an already-materialized CapabilityResource
```

Those capability families require later normative work.

## 10. Callback failure mapping

Once exact plugin ownership is selected, the owner is authoritative for classification of that tool name.

The broker MUST NOT hide owner failure by falling through to strict unknown-tool handling or another plugin.

Stable invocation failure reasons are:

```text
PLUGIN_CLASSIFIER_REJECTED
PLUGIN_CLASSIFIER_THROWN
PLUGIN_CLASSIFIER_RESULT_INVALID
PLUGIN_CLASSIFIER_ASYNC_UNSUPPORTED
```

Mapping:

- callback returns `REJECTED` -> `ERROR / PLUGIN_CLASSIFIER_REJECTED`;
- callback throws synchronously -> `ERROR / PLUGIN_CLASSIFIER_THROWN`;
- callback returns a Promise/thenable -> `ERROR / PLUGIN_CLASSIFIER_ASYNC_UNSUPPORTED`;
- callback returns any malformed/unsupported result -> `ERROR / PLUGIN_CLASSIFIER_RESULT_INVALID`.

Broker errors MUST NOT include the thrown value, stack, callback source, raw arguments, plugin-returned object, or secret-bearing values.

## 11. Registry-aware resolution algorithm

M4-014 defines a new registry-aware resolver. The accepted M4-013 resolver remains unchanged.

Given:

```text
toolName
arguments
registry
```

the registry-aware resolver MUST execute these stages in this exact order:

1. validate `toolName` using the accepted primitive/non-blank/bounded rule;
2. invoke M4-010 built-in filesystem classifier;
3. if result is `CLASSIFIED` or `ERROR`, return it unchanged;
4. invoke M4-011 built-in shell classifier;
5. if result is `CLASSIFIED` or `ERROR`, return it unchanged;
6. perform exact plugin-owner lookup using only `toolName`;
7. if an owner exists, invoke exactly that callback and validate its result;
8. if no owner exists, return M4-013 strict fallback `UNCLASSIFIED / BLOCK / NO_APPLICABLE_CLASSIFIER`.

Consequences:

- plugins cannot shadow built-ins;
- built-in `ERROR` cannot degrade to plugin classification;
- unrelated plugins never inspect arguments;
- no callback probing determines precedence;
- no owner means arguments remain opaque to plugin callbacks;
- strict fallback remains the terminal state.

## 12. Tool-name validation

For registry-aware invocation, `toolName` MUST be:

- a primitive string;
- non-blank under `trim()`;
- at most `MAX_TOOL_NAME_CODE_POINTS` Unicode code points.

Invalid tool names return the accepted fail-closed tool-name error before built-in dispatch, plugin lookup, or callback invocation.

The original accepted string is used for exact comparison; it is not replaced with the trimmed value.

## 13. Immutability and reference retention

A `READY` registry MUST be immutable from the caller's perspective.

The implementation MUST:

- copy accepted primitive IDs and tool names;
- not retain the registration object or caller-owned name arrays;
- intentionally retain only callback function references needed to invoke owners;
- expose no mutable internal ownership map;
- return detached recursively immutable successful classification results;
- never mutate invocation arguments.

The registry may use implementation-private maps/indexes, but lookup behavior must remain semantically equivalent to exact ownership defined here.

## 14. Ordering, concurrency, and mutation

The v0.1 registry is construction-time immutable.

M4-014 defines no API for:

- registering after construction;
- unregistering;
- replacing a callback;
- changing ownership;
- mutating priority;
- live reload.

Therefore concurrent reads observe one immutable registry snapshot and require no authorization-relevant mutation ordering.

A future hot plugin-registry profile must define atomic publication and conflict behavior explicitly rather than extending this API implicitly.

## 15. Security model

M4-014 preserves the current honest boundary:

```text
model-facing tool invocation
        -> deterministic tool classifier selection
        -> classification evidence
        -> later PDP/PEP stages
```

It does not create:

```text
plugin code
        -> sandboxed/untrusted execution
```

A registered callback is code already trusted to execute in the host process. If it performs direct filesystem/network/process effects while classifying, M4-014 cannot prevent them. Such behavior is outside the classifier contract and remains outside the current `tool-enforced` guarantee.

This limitation MUST remain documented and MUST NOT be represented as `provider-enforced` or `process-isolated`.

## 16. Privacy requirements

Registration and invocation errors MUST be bounded stable metadata only.

They MUST NOT echo:

- tool arguments;
- command text;
- file content;
- replacement text;
- environment values;
- secrets;
- callback source;
- thrown values or stacks;
- arbitrary plugin fields.

A classifier ID may be included in internal diagnostics only if it passed registration validation; portable result semantics do not require it.

## 17. Portable fixture requirements

Before production implementation, M4-014 MUST publish language-independent fixtures covering at least:

1. one exact plugin-owned filesystem classification;
2. one exact plugin-owned shell/process classification;
3. unknown unowned tool -> strict block;
4. case-mismatched name -> strict block;
5. built-in name claim -> registry error;
6. duplicate ownership across classifiers -> registry error;
7. duplicate name inside one classifier -> registry error;
8. duplicate classifier ID -> registry error;
9. blank/oversized classifier ID -> registry error;
10. blank/oversized plugin tool name -> registry error;
11. classifier-count / per-classifier-name / total-claim limits;
12. owner `REJECTED` -> fail-closed error;
13. malformed plugin result -> fail-closed error;
14. unsupported capability family -> fail-closed error;
15. built-in `CLASSIFIED` preserved before plugins;
16. built-in `ERROR` preserved before plugins;
17. no exact plugin owner -> no plugin callback invocation;
18. ownership independent of registration order.

TypeScript/runtime-only hostile-object regressions MUST additionally cover accessors, inherited fields, sparse/named/symbol arrays, descriptor failures, revoked proxies, callback throws, Promise/thenable return, detachment, immutability, and no unrelated-callback argument exposure.

## 18. Reference implementation requirements

The TypeScript reference implementation MUST:

1. remain inside `@dsh-safe/capability-broker`;
2. import no concrete `adapter-dsh` or DeepSeek Harness type;
3. construct an immutable registry atomically;
4. use exact tool-name lookup only;
5. reserve all accepted built-in names;
6. reject ownership conflicts instead of applying precedence;
7. invoke no plugin callback during registry construction;
8. invoke at most one plugin callback per registry-aware resolution;
9. never invoke a plugin callback for a built-in result;
10. validate/detach plugin output before returning it;
11. preserve M4-010/M4-011 built-in `CLASSIFIED`/`ERROR` as-is;
12. preserve strict block when no plugin owner exists;
13. keep the accepted M4-013 resolver API behavior unchanged;
14. return frozen results and retain no caller-owned registration container;
15. add no dependency, schema, Harness compatibility mutation, PDP, approval, lease, receipt, guarantee, PEP, or M6 behavior unless separately authorized.

## 19. Acceptance criteria

M4-014 is acceptable only when all of the following are true:

- this spec exists before production implementation;
- portable fixtures exist before production implementation;
- exact ownership and conflict semantics are deterministic and order-independent;
- built-in names cannot be shadowed;
- unrelated classifiers cannot inspect arguments;
- owner failure never falls through;
- plugin results cannot invent unsupported capability semantics;
- strict unknown-tool fallback remains terminal when no owner exists;
- accepted M4-013 API behavior is unchanged;
- hostile JavaScript boundaries fail closed;
- plugin isolation is not overclaimed;
- normal CI and exact pinned Harness source-conformance are green at the exact implementation head;
- acceptance audit reviews the implementation against this spec and the portable corpus.

## 20. Future gates

M4-014 does not authorize M4-020+ or later milestones.

Future work may define, only under separate normative Gates:

- additional classifier families;
- mutable/hot plugin registry publication;
- subject resolution and full PDP;
- leases/approval/receipt/guarantee;
- PEP integration;
- provider-aware enforcement;
- secret/network broker classification;
- process-isolated plugin hosting.

Until those Gates are accepted, the M4-014 registry is a deterministic in-process classification extension point and nothing stronger.
