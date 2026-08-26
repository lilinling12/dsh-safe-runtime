# Spec 0026 — M4 Built-in Filesystem Tool Classification

Status: **M4-010 normative profile**  
Scope: **tool classification only**  
Protocol authority: `@dsh-safe/protocol`  
DeepSeek Harness compatibility baseline: `0.1.0-rc.5` at `47f943859bef60e4160492346772ded9b24f765a`

## 1. Purpose

M4-010 defines the deterministic, fail-closed boundary that classifies recognized model-facing built-in filesystem tools into canonical filesystem capability effects.

The classifier answers only:

> Given an untrusted tool name and argument value, which standard filesystem capability effects can this recognized tool cause, and which unresolved filesystem operand does each effect apply to?

It does **not** authorize, resolve provider targets, canonicalize paths, inspect the filesystem, consume leases, request approval, execute tools, or manufacture a `CapabilityResource`.

DeepSeek Harness tool names are compatibility input. They MUST NOT define or rename the protocol capability vocabulary.

## 2. Authority boundaries

### 2.1 Protocol authority

The standard filesystem capabilities remain those defined by the protocol:

- `fs.read`
- `fs.stat`
- `fs.list`
- `fs.create`
- `fs.write`
- `fs.edit`
- `fs.delete`
- `fs.move`
- `fs.link`

M4-010 MUST NOT weaken or reinterpret these names to fit one Harness release.

### 2.2 Compatibility authority

Exact model-facing tool names and implementation behavior for the DSH Adapter profile MUST come from the exact pinned upstream source baseline, not package-name inference, documentation drift, or historical logs.

Changing the supported Harness baseline requires compatibility review before changing this profile.

### 2.3 Provider authority

Filesystem providers own target resolution, stable identity, containment, and execution-world semantics. The classifier MUST NOT:

- call any filesystem provider method;
- join a relative path to a guessed working directory;
- normalize `.` or `..` segments;
- interpret symlinks, junctions, drives, UNC paths, URLs, or opaque provider tokens;
- manufacture `providerIdentity`;
- treat a raw path string as containment evidence.

A classifier operand is unresolved evidence for a later provider-aware stage, never authorization input by itself.

## 3. Input contract

The classifier consumes exactly two logical inputs:

```text
toolName: string
arguments: unknown
```

No DeepSeek Harness runtime type is part of the capability-broker contract.

`arguments` is hostile runtime input even if an upstream schema normally validates it. Security-relevant fields MUST be obtained from own data properties only. Inherited values, accessors, symbol-key substitutions, and proxy failures MUST NOT manufacture trusted classifier input.

The classifier MUST NOT retain the original argument object or copy unrelated values into its output.

## 4. Output contract

A result is exactly one of:

```text
CLASSIFIED
NOT_APPLICABLE
ERROR
```

### 4.1 `CLASSIFIED`

A classified result contains a deterministic ordered list of requirements:

```text
capability: one standard fs.* capability
operand:
  source: ARGUMENT_PATH | EXECUTION_ROOT
  argumentName?: string
  rawPath?: string
  reach: EXACT | SELF_OR_DESCENDANTS
```

`ARGUMENT_PATH` means a recognized model-facing path argument supplied the operand. `rawPath` MUST preserve the accepted string exactly.

`EXECUTION_ROOT` means the pinned tool intentionally omitted an optional path and searches from its execution/session workspace root. The classifier MUST NOT guess `/`, `.`, a host cwd, or an Adapter scope value.

`EXACT` means the known effect is confined to the resolved operand itself.

`SELF_OR_DESCENDANTS` means the tool can inspect or discover the resolved operand and descendants.

### 4.2 Conservative effect envelope

Requirements represent the filesystem effect envelope known before provider state is consulted.

If a recognized tool can choose between multiple filesystem effects only after execution/provider state is known, the classifier MUST include every possible effect needed by that tool-level operation. A later provider-aware enforcement point may narrow a branch only if it has authoritative provider evidence.

Examples:

- create-or-overwrite `write` requires both `fs.create` and `fs.write` at this boundary;
- `str_replace_editor view` can read a file or recursively list a directory, so its pre-provider envelope contains both branches.

The classifier MUST NOT probe the host filesystem to narrow this envelope.

### 4.3 `NOT_APPLICABLE`

`NOT_APPLICABLE` means only that this classifier does not recognize the exact tool name.

It does not mean allow, deny, safe, or read-only. Unknown-tool policy belongs to M4-013.

Case folding, fuzzy matching, prefixes, and undocumented aliases are forbidden.

### 4.4 `ERROR`

After an exact recognized tool name is selected, malformed or unreadable security-relevant input MUST return `ERROR`; it MUST NOT fall through as `NOT_APPLICABLE`.

Stable M4-010 reasons are:

- `FS_TOOL_ARGUMENTS_INVALID`
- `FS_TOOL_PATH_INVALID`
- `FS_TOOL_COMMAND_INVALID`
- `FS_TOOL_INPUT_UNREADABLE`

Errors MUST NOT echo file content, replacement text, search patterns, arbitrary arguments, exception stacks, or secret-bearing values.

## 5. Path operands

For a required recognized path field, the classifier MUST:

1. require an own data property;
2. require a string;
3. reject a string whose `trim()` length is zero;
4. preserve the original accepted string exactly in `rawPath`.

For an optional search `path`, omission maps to `EXECUTION_ROOT`; an explicitly supplied blank/non-string value is an error.

The classifier MUST NOT otherwise normalize or reinterpret path syntax. Upstream tool-specific path validity (for example an absolute-path requirement) remains the upstream tool validator/provider concern; capability classification stays conservative and side-effect free.

## 6. DeepSeek Harness rc.5 built-in filesystem profile

This section is a compatibility mapping, not protocol authority.

Pinned source:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

The pinned CLI base composition includes `dsh-tool-fs`, `dsh-tool-fs-search`, and `dsh-tool-str-replace-editor`. M4-010 covers their model-facing filesystem effects. Bash and PowerShell remain M4-011.

### 6.1 `read`

Operand: required `file_path`, `EXACT`.

Ordered effect envelope:

1. `fs.stat`
2. `fs.read`

Pinned implementation evidence: path resolution is followed by the shared regular-file target helper (`ctx.fs.stat`) and then `ctx.fs.readText`.

### 6.2 `read_image`

Operand: required `file_path`, `EXACT`.

Ordered effect envelope:

1. `fs.stat`
2. `fs.read`

Pinned implementation evidence: the shared regular-file helper performs `ctx.fs.stat`, then the tool performs `ctx.fs.readBytes`.

Attachment persistence after the read is not redefined as an invented filesystem protocol capability.

### 6.3 `write`

Operand: required `file_path`, `EXACT`.

Ordered effect envelope:

1. `fs.create`
2. `fs.write`

Pinned implementation evidence: `ctx.fs.writeText` may report create or update. Pre-execution classification cannot safely select one branch without provider state.

### 6.4 `edit`

Operand: required `file_path`, `EXACT`.

Ordered effect envelope:

1. `fs.edit`

Pinned implementation evidence: the tool invokes provider `ctx.fs.editText` directly and does not perform a separate stat/read/write sequence.

### 6.5 `glob`

Operand:

- supplied non-blank `path` -> `ARGUMENT_PATH`, `SELF_OR_DESCENDANTS`;
- omitted `path` -> `EXECUTION_ROOT`, `SELF_OR_DESCENDANTS`.

Ordered effect envelope:

1. `fs.list`

The pinned implementation uses a fixed packaged ripgrep argv through `ctx.subprocess` and deliberately does not inject `ctx.fs`. `fs.list` here expresses the model-facing filesystem discovery authority. It does not claim provider-level FS mediation.

The fixed internal subprocess substrate does not turn the model's `glob` request into a user-selected `process.exec` capability. Process enforcement remains a separate execution seam.

### 6.6 `grep`

Operand:

- supplied non-blank `path` -> `ARGUMENT_PATH`, `SELF_OR_DESCENDANTS`;
- omitted `path` -> `EXECUTION_ROOT`, `SELF_OR_DESCENDANTS`.

Ordered effect envelope:

1. `fs.read`

The pinned implementation searches file contents with a fixed packaged ripgrep subprocess. This is model-facing filesystem authority classification, not provider-level mediation.

### 6.7 `str_replace_editor`

Required security-relevant fields:

- `command`
- `path`

Accepted command strings are exactly:

- `view`
- `create`
- `str_replace`
- `insert`

No alias or case folding is allowed.

#### `view`

Operand: `path`, `SELF_OR_DESCENDANTS`.

Ordered effect envelope:

1. `fs.stat`
2. `fs.read`
3. `fs.list`

Pinned implementation evidence: it stats the resolved target, then either reads a regular file or recursively calls `ctx.fs.listDir` for a directory (bounded by the upstream tool to two levels). Target type is provider state, so M4-010 cannot narrow the pre-provider branch.

#### `create`

Operand: `path`, `EXACT`.

Ordered effect envelope:

1. `fs.stat`
2. `fs.create`

Pinned implementation evidence: it stats to require absence, then calls `ctx.fs.writeText` with `createIfAbsent`. `fs.create` expresses authority to introduce the new resource; `fs.write` is not added merely because the provider primitive carries initial content.

#### `str_replace`

Operand: `path`, `EXACT`.

Ordered effect envelope:

1. `fs.stat`
2. `fs.read`
3. `fs.write`

Pinned implementation evidence: it stats the target, reads the complete text, then persists replacement content through `ctx.fs.writeText` with a version-checked replace intent. This real read/write access MUST NOT be hidden behind the model-facing command name.

#### `insert`

Operand: `path`, `EXACT`.

Ordered effect envelope:

1. `fs.stat`
2. `fs.read`
3. `fs.write`

Pinned implementation evidence: it stats the target, reads the complete text, constructs the inserted content, and persists through version-checked `ctx.fs.writeText`.

## 7. Hostile runtime requirements

JSON fixtures cannot encode prototype/accessor/proxy attacks, so production tests MUST additionally cover:

- inherited `file_path`, `path`, or `command`;
- accessor-backed security fields without executing getters;
- accessor-backed unrelated properties without executing them;
- symbol-only substitutions;
- array arguments;
- proxy descriptor failures;
- missing required security fields on a recognized tool;
- exact unknown names remaining `NOT_APPLICABLE`.

Implementations MUST inspect only bounded known fields. They MUST NOT clone, stringify, spread, enumerate, or recursively traverse an attacker-controlled argument graph.

## 8. Determinism and immutability

For the same accepted own-data inputs, classification MUST return the same status, reason, operand values, and ordered effect envelope.

Successful results and nested values MUST be immutable from the caller's perspective. Mutating the original argument object after return MUST NOT alter the result.

No clock, randomness, locale ordering, filesystem state, environment state, or Harness singleton state may affect output.

## 9. Non-goals

M4-010 does not implement:

- Bash/PowerShell classification (M4-011);
- known MCP metadata classification (M4-012);
- unknown-tool fallback/profile decisions (M4-013);
- plugin classifier API (M4-014);
- policy evaluation, lease lookup, approval routing, or decision receipts (M4-020+);
- `tools/pre-execute` enforcement (M4-040+);
- provider-level canonical containment;
- plugin sandbox or process-isolation guarantees.

## 10. Portable conformance corpus

`fixtures/tool-classifier/builtin-fs-cases.json` is the portable M4-010 corpus.

A conforming implementation MUST reproduce every case exactly and MUST also pass hostile-runtime tests that cannot be represented in JSON.

The corpus deliberately contains JSON-only stable values. Functions, getters, proxies, exceptions, `undefined`, and object identity are package-test concerns.

## 11. Acceptance conditions

M4-010 implementation acceptance requires all of the following:

- this spec and the portable corpus land before production implementation;
- the exact rc.5 mapping is reviewed against commit `47f943859bef60e4160492346772ded9b24f765a`;
- no `@deepseek-ai/*` dependency enters protocol or capability-broker core;
- no schema, validator, TCK, TypeScript strictness, frozen lockfile, conformance check, or security guarantee is weakened;
- classifier performs no IO/provider calls;
- recognized malformed calls fail closed;
- unknown calls remain non-authoritative `NOT_APPLICABLE` until M4-013;
- operands remain unresolved and cannot masquerade as canonical provider resources;
- portable corpus and hostile-runtime tests pass under strict TypeScript;
- normal CI and exact pinned Harness source-conformance are green at the accepted implementation head.
