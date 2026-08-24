# Spec 0008: M3 Deterministic Fault Injection Test Service

Status: DRAFT  
Milestone: M3-007  
Scope: language-independent deterministic fault-injection control for Shared TCK tests

## 1. Purpose

M3-007 defines a portable fault-injection **test service** that lets Shared TCK
scenarios decide, deterministically and explicitly, whether a named test probe
should continue without injection or expose a scripted fault descriptor.

The service exists to test failure paths without depending on wall-clock races,
ambient randomness, operating-system faults, real process failures, real
filesystem failures, network failures, or DeepSeek Harness internals.

This specification does **not** define production fault handling, exception
classes, crash semantics, timeout semantics, retry policy, cancellation policy,
rollback behavior, recovery journals, or runtime lifecycle events.

## 2. Authority boundary

A fault-injection directive is test-control data only.

A conforming implementation MUST preserve these distinctions:

- `NO_FAULT` means only that this test probe requests no injected fault;
- `INJECT_FAULT` means only that this test probe exposes the scripted fault
  descriptor;
- neither directive is an ordinary tool/runtime success, denial, business error,
  process exit, filesystem result, acceptance verdict, or protocol event;
- the fake MUST NOT silently translate a fault directive into one of those
  ordinary outcomes;
- the portable service MUST NOT throw, crash, sleep, kill a process, mutate a
  filesystem, access a network, or otherwise enact the fault itself merely
  because `INJECT_FAULT` was returned.

A later TCK scenario may explicitly define how a component under test consumes a
fault descriptor. M3-007 itself only makes fault selection deterministic and
observable.

## 3. Declared injection points

A fault plan declares the complete set of injection points that may be probed:

```json
{
  "points": [
    "tool.before-body",
    "subprocess.before-spawn"
  ]
}
```

Each point is a non-empty opaque string.

The string is an identifier only. M3-007 does not infer lifecycle, ordering,
security, timing, or runtime semantics from its spelling.

Duplicate declared points are invalid configuration. A scripted entry referring
to an undeclared point is also invalid configuration.

At runtime, probing a point not present in the declared set fails explicitly with:

```text
FAKE_FAULT_UNKNOWN_POINT
```

The fake MUST NOT create injection points on demand.

## 4. Portable probe

A probe is ordinary JSON:

```json
{
  "pointRef": "tool.before-body",
  "context": {
    "callRef": "call-1"
  }
}
```

A probe has exactly:

```text
pointRef
context
```

`pointRef` is a non-empty string. `context` may be any JSON value.

Probe context is inert matching data. It MUST NOT be interpreted as a command,
path, environment lookup, executable request, network request, protocol event,
or authorization request by this service.

Unknown probe fields are rejected.

## 5. Fault directives

Portable directives are exactly:

```text
NO_FAULT
INJECT_FAULT
```

### 5.1 NO_FAULT

```json
{
  "kind": "NO_FAULT"
}
```

`NO_FAULT` has no additional fields.

It does not prove the surrounding operation will succeed. It means only that
this fault service contributes no injected fault at the current probe.

### 5.2 INJECT_FAULT

```json
{
  "kind": "INJECT_FAULT",
  "fault": {
    "faultRef": "fault-io-1",
    "faultCode": "TEST_IO_FAILURE",
    "detail": {
      "reason": "scripted"
    }
  }
}
```

`faultRef` and `faultCode` are non-empty opaque strings. `detail` is optional and
may be any JSON value.

The descriptor intentionally carries no built-in `throw`, `crash`, `timeout`,
`signal`, `rollback`, or retry semantics. Those concepts belong to the component
or later TCK contract that explicitly consumes the descriptor.

Unknown directive or fault fields are rejected.

## 6. Ordered script

The fake is configured with an ordered script:

```json
{
  "points": ["tool.before-body"],
  "script": [
    {
      "probe": {
        "pointRef": "tool.before-body",
        "context": { "callRef": "call-1" }
      },
      "directive": {
        "kind": "NO_FAULT"
      }
    },
    {
      "probe": {
        "pointRef": "tool.before-body",
        "context": { "callRef": "call-2" }
      },
      "directive": {
        "kind": "INJECT_FAULT",
        "fault": {
          "faultRef": "fault-1",
          "faultCode": "TEST_FAILURE"
        }
      }
    }
  ]
}
```

Repeated probes and repeated point identifiers are allowed in the script because
order is explicit. The next successful probe consumes exactly one script entry.

The fake compares the validated runtime probe with the next scripted probe using
structural JSON equality that is independent of object-key order.

No host scheduler, timestamp, random draw, counter outside the script, or
ambient process/filesystem/network state may choose a directive.

## 7. Unexpected probes and exhaustion

If a valid declared probe does not structurally match the next scripted probe,
fail with:

```text
FAKE_FAULT_UNEXPECTED_PROBE
```

The mismatch MUST NOT consume the script entry and MUST NOT append a successful
observation.

If no script entry remains, fail with:

```text
FAKE_FAULT_SCRIPT_EXHAUSTED
```

Exhaustion MUST NOT fabricate a `NO_FAULT` directive, an injected fault, or an
observation.

This fail-closed behavior prevents test order drift from being mistaken for a
real fault-selection result.

## 8. Observations

Each successfully matched probe appends one ordered observation:

```text
ordinal
probe
directive
```

`ordinal` is one-based and corresponds to successful script consumption.

Failed malformed, unknown, unexpected, or exhausted probes append no successful
observation.

Observation reads MUST return defensive immutable copies. Mutating caller-owned
input after evaluation, or mutating a previously returned observation/directive,
MUST NOT alter future fake behavior or recorded evidence.

## 9. Errors

Portable fake-service error codes are:

```text
FAKE_FAULT_INVALID_CONFIG
FAKE_FAULT_INVALID_PROBE
FAKE_FAULT_UNKNOWN_POINT
FAKE_FAULT_UNEXPECTED_PROBE
FAKE_FAULT_SCRIPT_EXHAUSTED
```

### 9.1 Invalid configuration

`FAKE_FAULT_INVALID_CONFIG` covers at least:

- malformed top-level config;
- unknown config fields;
- duplicate declared points;
- malformed script entries;
- unknown directive kinds;
- malformed fault descriptors;
- script entries referring to undeclared points;
- non-JSON/cyclic test values passed directly by an implementation API.

Configuration MUST be validated before the service becomes usable.

### 9.2 Invalid probe

`FAKE_FAULT_INVALID_PROBE` covers malformed runtime probes, including unknown
fields and non-JSON/cyclic contexts.

Malformed probes MUST NOT consume the script.

## 10. Shared TCK fixture projection

M3-007 fixtures use profile `FULL` and these operation names:

```text
fault-injection.sequence
fault-injection.unexpected-probe
fault-injection.script-exhausted
```

The generic envelope remains defined by Spec 0004. This specification defines
only the profile-specific semantics above.

## 11. Relationship to M3-005 and M3-006

M3-007 is intentionally independent from existing fakes:

- `FakeToolRuntime` does not gain hidden injected behavior;
- `FakeFilesystem`, `FakeSubprocess`, and `FakeExecutionWorld` do not gain hidden
  fault hooks or host effects;
- a test that wants to combine these services must probe the fault service
  explicitly and define the composition in its own later TCK scenario.

This prevents fault injection from becoming an invisible second control plane.

## 12. Determinism

Given the same validated point declarations, script, and probe sequence, a
conforming implementation MUST produce the same directives, errors, remaining
script count, and observations independent of:

- wall clock;
- timezone/locale;
- random source;
- event-loop or thread scheduling;
- filesystem state;
- process state;
- environment variables;
- network state;
- DeepSeek Harness implementation details.

M3-003 seed/logical-clock values remain available to the surrounding TCK runner,
but M3-007 consumes neither.

## 13. Deferred behavior

M3-007 deliberately does not define:

- automatic exception throwing;
- process termination or signals;
- latency, sleeps, or timeouts;
- partial writes or filesystem corruption;
- network packet/error simulation;
- retries/backoff;
- cancellation scheduling;
- workspace rollback or recovery;
- crash-recovery journals;
- capability/approval policy;
- Adapter DSH event injection or lifecycle hooks;
- production observability semantics.

Those concerns belong to later profile-specific TCK work or later runtime
milestones.

## 14. Acceptance criteria

M3-007 is complete only when:

- this language-independent contract exists before implementation;
- portable fixtures cover no-fault vs injected-fault distinction, unexpected
  probe non-consumption, and explicit script exhaustion;
- `@dsh-safe/testkit` provides one deterministic TypeScript projection without
  importing `@deepseek-ai/*` or adapter concrete types;
- configuration and runtime probes reject unknown/malformed/non-JSON input;
- unknown points, mismatches, and exhaustion fail explicitly without consuming
  scripted state or fabricating observations;
- returned directives and observations are defensive immutable snapshots;
- existing M3-005/M3-006 behavior remains unchanged;
- frozen install and repository `pnpm check:all` remain green with zero lint
  warnings/errors.
