# Spec 0027 — M4 Built-in Shell Tool Classification

Status: **M4-011 normative profile**  
Scope: **Bash/PowerShell tool classification only**  
Protocol authority: `@dsh-safe/protocol`  
DeepSeek Harness compatibility baseline: `0.1.0-rc.5` at `47f943859bef60e4160492346772ded9b24f765a`

## 1. Purpose

M4-011 defines the deterministic, fail-closed boundary that classifies the recognized model-facing Bash and PowerShell tools into canonical process execution authority.

The classifier answers only:

> Given an untrusted exact tool name and argument value, does this recognized shell tool request process execution, and what unresolved shell-command/workdir evidence describes that request?

It does **not** authorize, parse shell syntax, resolve an executable, resolve a working directory, evaluate policy, consume a lease, request approval, execute a process, create a `CapabilityResource`, or infer nested filesystem/network/secret effects from command text.

DeepSeek Harness names and executor behavior are compatibility input. They MUST NOT define or rename the protocol capability vocabulary.

## 2. Authority boundaries

### 2.1 Protocol authority

The standard process capabilities remain those defined by the protocol:

- `process.resolve`
- `process.exec`
- `process.terminal`
- `process.signal`

M4-011 classifies the pinned model-facing `bash` and `pwsh` calls as `process.exec` only.

The other process capabilities MUST NOT be added merely because similarly named Harness methods or UI concepts exist.

### 2.2 Compatibility authority

Exact tool names, accepted model-facing arguments, command execution mode, and provider behavior for the DSH Adapter profile MUST come from the exact pinned upstream source baseline.

The accepted rc5 base bundle depends on the ordinary `@deepseek-ai/dsh-tool-bash` and `@deepseek-ai/dsh-tool-pwsh` packages. Persistent shell tools are not part of this M4-011 compatibility profile.

Changing the supported Harness baseline or bundle composition requires compatibility review before changing this profile.

### 2.3 Executor/provider authority

The shell executor/subprocess provider owns concrete executable identity, cwd resolution/defaulting, process creation, environment construction, timeout/cancellation mechanics, sandbox enforcement, and process-tree termination.

The classifier MUST NOT:

- call `ctx.shell`, `ctx.subprocess`, or any process provider;
- translate Harness `ctx.shell.resolve()` into protocol `process.resolve`;
- infer the concrete Bash/PowerShell executable locator from a model request;
- resolve a relative `workdir` against host/session state;
- substitute host `process.cwd()` for an omitted workdir;
- parse or execute the command string;
- manufacture process provider identity or containment evidence.

A classifier operand is unresolved evidence for a later provider-aware enforcement stage, never a canonical process resource or authorization result.

## 3. Input contract

The classifier consumes exactly two logical inputs:

```text
toolName: string
arguments: unknown
```

No DeepSeek Harness runtime type is part of the capability-broker contract.

`arguments` is hostile runtime input even if an upstream schema normally validates it. Security-relevant fields MUST be read from own data properties only. Inherited values, accessors, symbol-key substitutions, and proxy failures MUST NOT manufacture trusted input.

For M4-011 the security-relevant fields are:

- `command`;
- optional `workdir`;
- optional `run_in_background`.

The classifier MUST NOT enumerate, spread, stringify, recursively clone, or retain the caller's argument graph. Display metadata (`description`), timeout configuration, sandbox escalation metadata, justification text, and unrelated fields do not alter the M4-011 capability classification and MUST NOT be inspected merely to produce the result.

## 4. Output contract

A result is exactly one of:

```text
CLASSIFIED
NOT_APPLICABLE
ERROR
```

### 4.1 `CLASSIFIED`

A classified shell result contains exactly one ordered requirement:

```text
capability: process.exec
operand:
  source: SHELL_COMMAND
  dialect: BASH | POWERSHELL
  rawCommand: string
  executionMode: FOREGROUND | BACKGROUND
  workdir:
    source: ARGUMENT_WORKDIR | EXECUTION_ROOT
    argumentName?: workdir
    rawWorkdir?: string
```

`rawCommand` MUST preserve the accepted command string exactly. It is opaque shell-language input, not an argv array.

`ARGUMENT_WORKDIR` means an explicit model-facing `workdir` argument supplied unresolved cwd evidence. `rawWorkdir` MUST be preserved exactly.

`EXECUTION_ROOT` means no model-facing workdir was supplied. It does not mean `/`, `.`, `process.cwd()`, a session cwd, a sandbox root, or any other concrete provider path.

`FOREGROUND` means the recognized call follows the pinned foreground `ctx.shell.run(...)` path. `BACKGROUND` means it follows the pinned job-owned `ctx.shell.start(...)` path. The mode is evidence/constraint material only; both remain `process.exec` authority.

### 4.2 Why only `process.exec`

M4-011 MUST NOT add:

- `process.resolve`: pinned `ShellExecutor.resolve()` fills/caps execution settings such as cwd and timeout; it does not represent a model request to resolve an executable identity. The actual Bash executable is fixed by the executor (`bash -c`), while the PowerShell executable is resolved from provider configuration.
- `process.terminal`: the pinned foreground execution uses collected stdio. A terminal-shaped UI card is presentation and does not prove PTY/terminal authority.
- `process.signal`: executor timeout/abort and background-handle cleanup are implementation lifecycle mechanics. The model-facing `bash`/`pwsh` call does not itself request an independent signal operation. Separate job-control tools remain separate classification work.

A future protocol or provider boundary may require additional process capabilities for a different tool surface. That change must be explicit and cannot be inferred from names in this Harness profile.

### 4.3 Shell command opacity

The classifier MUST NOT parse, tokenize, normalize, rewrite, emulate, or pattern-match shell command text to infer nested effects.

For example, all of the following still classify only as one shell `process.exec` request at M4-011:

```text
cat ./secret.txt
curl https://example.test
rm -rf ./generated
node -e "..."
Get-Content .\secret.txt
Remove-Item .\generated -Recurse
```

This is an intentional honesty boundary. `process.exec` permission by itself does not prove that filesystem, network, secret, or other effects caused by the spawned process are provider-mediated. Sandbox/provider enforcement and later negative-boundary tests own those guarantees.

### 4.4 `NOT_APPLICABLE`

`NOT_APPLICABLE` means only that this classifier does not recognize the exact tool name.

M4-011 recognizes exactly:

```text
bash
pwsh
```

Names are case-sensitive. No alias, case folding, prefix, fuzzy match, `powershell`, `sh`, persistent-tool inference, or platform fallback is allowed.

`NOT_APPLICABLE` does not mean allow, deny, safe, or read-only. Unknown-tool fallback belongs to M4-013.

### 4.5 `ERROR`

After an exact recognized tool name is selected, malformed or unreadable security-relevant input MUST return `ERROR`; it MUST NOT fall through as `NOT_APPLICABLE`.

Stable M4-011 reasons are:

- `SHELL_TOOL_ARGUMENTS_INVALID`
- `SHELL_TOOL_COMMAND_INVALID`
- `SHELL_TOOL_WORKDIR_INVALID`
- `SHELL_TOOL_BACKGROUND_INVALID`
- `SHELL_TOOL_INPUT_UNREADABLE`

Errors MUST NOT echo command text, cwd values, descriptions, environment data, justification text, exception stacks, or arbitrary caller values.

## 5. Command and workdir operands

### 5.1 Command

For `command`, the classifier MUST:

1. require an own data property;
2. require a string;
3. reject a string whose `trim()` length is zero;
4. preserve the original accepted string exactly in `rawCommand`.

No additional command normalization is allowed.

### 5.2 Workdir

For optional `workdir`:

- omission maps to unresolved `EXECUTION_ROOT`;
- if present, it MUST be an own data-property string whose `trim()` length is non-zero;
- accepted text MUST be preserved exactly in `rawWorkdir`;
- relative, absolute, POSIX, Windows, UNC-looking, dot-segment, or Unicode forms MUST NOT be normalized by the classifier.

Actual cwd resolution/defaulting remains executor/provider authority.

### 5.3 Background mode

For optional `run_in_background`:

- omission maps to `FOREGROUND`;
- `false` maps to `FOREGROUND`;
- `true` maps to `BACKGROUND`;
- any explicitly supplied non-boolean value is `SHELL_TOOL_BACKGROUND_INVALID`.

Whether a deployment enables background jobs is upstream composition/runtime policy. Classification records the model's explicit execution-lifetime intent without claiming that execution will succeed.

## 6. DeepSeek Harness rc.5 shell profile

Pinned source:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

The pinned base bundle directly depends on the ordinary Bash and PowerShell tool packages and their sandbox-capable executor families.

### 6.1 `bash`

Exact tool name: `bash`.

Model-facing execution-relevant fields:

```text
command: string (required)
workdir?: string
run_in_background?: boolean
```

Other pinned fields (`description`, `timeoutMs`, `sandbox_permissions`, `justification`) do not change the M4-011 canonical process capability/operand.

Foreground source path:

```text
ctx.shell.run(ctx.shell.resolve(request))
```

Background source path:

```text
jobs.start(... ctx.shell.start(ctx.shell.resolve(request)) ...)
```

The local Bash executor maps a resolved spec to:

```text
bash -c <raw command>
```

The model does not choose a separate executable locator or argv vector through this tool contract.

### 6.2 `pwsh`

Exact tool name: `pwsh`.

The model-facing execution-relevant fields mirror `bash`.

Foreground and background use the same `ctx.shell.run/ctx.shell.start` split.

The local PowerShell executor owns the executable path and invokes it with provider-owned flags followed by `-Command` and the command payload. The concrete executable is therefore provider/configuration state, not model-provided process identity.

### 6.3 Sandbox escalation metadata

The pinned tools may expose `sandbox_permissions` plus `justification` when a confining executor is mounted. Upstream resolves that request through its approval seam before execution.

M4-011 does not reinterpret those Harness-specific fields as new standard process capabilities, approval decisions, or guarantee levels. Approval routing belongs to M4-023 and guarantee assignment to M4-025. Adapter/executor sandbox facts remain compatibility/enforcement evidence, not classifier authority.

## 7. Hostile runtime requirements

JSON fixtures cannot encode prototype/accessor/proxy attacks, so production tests MUST additionally cover:

- inherited `command`, `workdir`, or `run_in_background`;
- accessor-backed security fields without executing getters;
- accessor-backed unrelated fields without executing them;
- symbol-only substitutions;
- array arguments;
- proxy descriptor failures for each inspected security field;
- exact unknown names with hostile arguments remaining `NOT_APPLICABLE` without argument inspection;
- caller mutation after return not changing classified output;
- nested classified output being immutable.

Implementations MUST inspect only the bounded known fields needed for the selected recognized tool.

## 8. Determinism and immutability

For the same accepted own-data inputs, classification MUST return the same status, reason, dialect, command, workdir, execution mode, and ordered capability requirement.

Successful results and nested values MUST be immutable from the caller's perspective. The result MUST be detached from later caller mutation.

No clock, randomness, locale ordering, shell parser, filesystem state, environment state, platform probe, process table, Harness singleton, or provider lookup may affect classification output.

## 9. Package/implementation architecture

M4-011 extends the existing capability-broker classifier family without creating the future M4-014 plugin classifier API.

The reference implementation SHOULD keep domain classifiers separate internally:

```text
tool-classifier/
  hostile-input.ts
  builtin-filesystem.ts
  builtin-shell.ts
```

Security-sensitive hostile-input property inspection SHOULD be shared through a package-internal primitive rather than duplicated. It MUST NOT become a public extensibility framework or acquire Harness dependencies.

Existing package-root public exports MUST remain stable when internal files are reorganized.

## 10. Non-goals

M4-011 does not implement:

- shell-language parsing or executable extraction;
- nested filesystem/network/secret effect inference;
- persistent shell/session classification;
- job-output/job-kill classification;
- known MCP metadata classification (M4-012);
- unknown-tool fallback/profile decisions (M4-013);
- plugin-supplied classifier API (M4-014);
- subject resolution, full PDP, leases, approval routing, receipts, or guarantee assignment (M4-020+);
- tools/pre-execute enforcement (M4-040+);
- provider-aware process/resource canonicalization;
- plugin sandbox or kernel/process isolation claims;
- the M4-050+ negative-boundary tests ahead of their gate.

## 11. Portable conformance corpus

`fixtures/tool-classifier/builtin-shell-cases.json` is the portable M4-011 corpus.

A conforming implementation MUST reproduce every case exactly and MUST also pass hostile-runtime tests that cannot be represented in JSON.

The corpus contains JSON-only stable values. Functions, getters, proxies, exceptions, `undefined`, and object identity are package-test concerns.

## 12. Acceptance conditions

M4-011 implementation acceptance requires all of the following:

- this spec and portable corpus land before production implementation;
- exact Bash/PowerShell mapping is reviewed against commit `47f943859bef60e4160492346772ded9b24f765a` and the pinned base-bundle composition;
- protocol `process.*` names remain semantic authority;
- classifier emits only `process.exec` for the accepted rc5 shell calls and documents why `process.resolve`, `process.terminal`, and `process.signal` are not implied;
- command text is opaque and no nested-effect claim is manufactured;
- executable/cwd identities remain unresolved/provider-owned;
- no `@deepseek-ai/*` dependency enters protocol or capability-broker core;
- no schema, validator, TCK, TypeScript strictness, frozen lockfile, architecture rule, compatibility check, or security guarantee is weakened;
- classifier performs no IO/provider/shell calls;
- recognized malformed calls fail closed;
- unknown calls remain non-authoritative `NOT_APPLICABLE` until M4-013;
- portable corpus and hostile-runtime tests pass under strict TypeScript;
- normal CI and exact pinned Harness source-conformance are green at the accepted implementation head.
