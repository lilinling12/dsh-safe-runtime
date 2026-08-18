# Spec 0004: Shared TCK Foundation

Status: DRAFT  
Milestone: M3  
Scope: language-independent test fixture envelope, runner contract, deterministic seed/time semantics

## 1. Purpose

The Shared TCK validates normative safe-runtime behavior without requiring a TypeScript runtime, DeepSeek Harness packages, or any reference implementation internals.

The TCK is a consumer of normative specifications. It MUST NOT define protocol semantics that are absent from higher-authority specs.

## 2. Portability boundary

A conforming TCK fixture MUST be serializable as ordinary JSON data and MUST NOT require:

- TypeScript type names or private module paths;
- JavaScript functions, classes, symbols, `undefined`, `BigInt`, or host object identity;
- DeepSeek Harness event/package names unless the profile being tested is explicitly adapter-specific;
- wall-clock time, ambient randomness, host locale, host timezone, or filesystem iteration order;
- implementation-specific stack traces or exception class names.

A non-TypeScript dummy implementation MUST be able to consume the same fixture unchanged.

## 3. Fixture envelope

Every shared TCK case is one object with the following top-level fields:

```text
apiVersion
id
profile
description
determinism
stimulus
expect
```

Unknown top-level fields are rejected.

### 3.1 `apiVersion`

For M3 the only accepted value is:

```text
safe-runtime.dev/tck-fixture/v1alpha1
```

A runner MUST reject an unsupported fixture version before invoking the implementation under test.

### 3.2 `id`

`id` is a stable case identifier for reporting and selection. It is metadata only and MUST NOT influence execution semantics.

### 3.3 `profile`

M3 defines the following profile names:

```text
AUTH
TX
VERIFY
EVIDENCE
ADAPTER_DSH
FULL
```

A runner MAY execute a subset of profiles, but it MUST report an unsupported requested profile explicitly and MUST NOT convert that condition to PASS.

### 3.4 `description`

Human-readable non-normative explanation. It MUST NOT alter execution.

### 3.5 `determinism`

Every fixture MUST declare deterministic execution inputs:

```text
seed
clock.startUnixMs
clock.tickMs
```

`seed` is an unsigned integer in the inclusive range `0..4294967295`.

`clock.startUnixMs` is a non-negative safe JSON integer representing Unix epoch milliseconds.

`clock.tickMs` is a positive safe JSON integer. The runner exposes a logical clock whose initial value is `startUnixMs`; every explicit logical-clock advance increments it by exactly `tickMs` unless the fixture stimulus carries a higher-authority domain-specific time value.

A fixture MUST NOT require the runner to read the host wall clock.

The seed defines the deterministic pseudo-random input stream available to the implementation under test. The exact PRNG algorithm is runner-contract material, not protocol semantics; therefore a test that depends on a particular pseudo-random sequence MUST provide the generated values explicitly in `stimulus` until a shared PRNG algorithm is normatively adopted.

### 3.6 `stimulus`

`stimulus` is profile-owned JSON input. The shared envelope deliberately treats it as opaque JSON data. Profile specifications/TCK modules define its semantic shape.

The envelope does not permit executable code inside `stimulus`.

### 3.7 `expect`

`expect` is the expected observable result owned by the selected profile. It is opaque JSON at the envelope layer.

A runner MUST compare only the observables declared by the relevant TCK profile. It MUST NOT fail a case because of unspecified implementation-private state.

## 4. Runner contract

A Shared TCK runner MUST implement the following phases in order:

1. parse JSON;
2. validate the fixture envelope against the published JSON Schema;
3. verify `apiVersion` and requested profile support;
4. initialize deterministic seed and logical clock inputs;
5. invoke the selected profile adapter for the implementation under test;
6. collect declared observables;
7. compare declared observables with `expect` using profile-defined semantics;
8. emit one machine-readable case result.

Invalid fixture data MUST fail before step 5.

The runner MUST NOT mutate the fixture object and MUST treat the same fixture bytes plus the same implementation version/configuration as the same test input.

## 5. Case result contract

The implementation-specific runner API is intentionally not standardized in M3-001. However, every runner report MUST distinguish at least:

```text
PASS
FAIL
UNSUPPORTED
ERROR
```

Meanings:

- `PASS`: all declared expectations were satisfied;
- `FAIL`: the implementation ran and contradicted one or more normative expectations;
- `UNSUPPORTED`: the requested profile/capability is explicitly unsupported under rules that permit unsupported reporting;
- `ERROR`: the runner or implementation could not complete the case in a way that yields a normative verdict.

`UNSUPPORTED` and `ERROR` MUST NOT be coerced to `PASS`.

A separately versioned machine-readable runner-result schema MAY be added after the fixture envelope is accepted; it MUST preserve these distinctions.

## 6. Deterministic comparison rules

Unless a profile specification states otherwise:

- JSON object member order is insignificant;
- JSON array order is significant;
- numbers compare by JSON numeric value, not source spelling;
- missing and explicit `null` are distinct;
- extra observable fields are ignored only when the profile declares them non-normative; otherwise the profile MUST define exact or subset comparison explicitly;
- textual diagnostics are non-normative unless a profile explicitly defines a stable machine-readable code.

## 7. Security and fail-closed requirements

The runner MUST NOT:

- execute code embedded in a fixture;
- interpret arbitrary fixture strings as filesystem paths, shell commands, module names, or URLs unless the active profile explicitly defines that field;
- silently skip an unknown profile, operation, expectation operator, or fixture version;
- use host time/randomness to make a case pass;
- weaken an expected denial/error into success because the implementation lacks a feature.

Unknown semantics fail explicitly.

## 8. Versioning

The fixture `$id` and `apiVersion` are versioned independently from a runner implementation version.

Within `v1alpha1`, an incompatible change to required fields, field meaning, profile meaning, deterministic semantics, or comparison semantics requires a new fixture version. Optional additive metadata is permitted only when old runners can reject or ignore it according to an explicitly documented compatibility rule.

## 9. M3-001 / M3-002 / M3-003 acceptance criteria

This foundation is complete only when:

- `M3-001`: a Draft 2020-12 schema exists for the envelope and has positive/negative fixtures;
- `M3-002`: the runner lifecycle and PASS/FAIL/UNSUPPORTED/ERROR distinction are documented independently of TypeScript;
- `M3-003`: seed and logical-clock semantics are explicit and host-time-independent;
- the repository's TypeScript testkit validates the schema as one implementation of the contract;
- no DeepSeek Harness concrete package path appears in the shared fixture schema;
- a future non-TypeScript runner can implement the contract from this spec and schema alone.

Fake approval/tool/fs/subprocess and fault-injection semantics remain later M3 work and MUST NOT be inferred from this envelope.