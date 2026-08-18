# Spec 0005: M3 Fake Approval Test Service

Status: DRAFT  
Milestone: M3-004  
Scope: language-independent fake approval semantics for Shared TCK profile tests

## 1. Purpose

The M3 fake approval service is deterministic test infrastructure. It exists so
Shared TCK profiles can exercise approval-dependent behavior without a user
interface, DeepSeek Harness runtime, network service, or reference runtime.

This specification does **not** define a production authorization protocol. It
projects only approval outcomes already established by higher-authority safe
runtime specifications into a portable fake service.

## 2. Authority boundary

The fake MUST NOT:

- redefine capability policy, leases, or authorization precedence;
- treat DeepSeek Harness APIs or package types as portable protocol semantics;
- infer approval from host state, wall-clock time, randomness, environment
  variables, or callbacks embedded in fixtures;
- silently authorize when its script is malformed or exhausted.

Only the consumer of the fake decides how an approval outcome affects the
normative operation being tested. The fake itself only returns a scripted
outcome and records the observable request/outcome pair.

## 3. Decision vocabulary

The portable fake uses exactly these outcomes:

```text
ALLOWED_ONCE
REJECTED
CANCELLED
UNAVAILABLE
```

`ALLOWED_ONCE` is the only outcome that may authorize the requested action under
existing approval semantics. `REJECTED`, `CANCELLED`, and `UNAVAILABLE` remain
fail-closed outcomes.

The fake MUST NOT invent broader values such as `ALLOWED_ALWAYS` or convert an
unknown value to `ALLOWED_ONCE`.

## 4. Script model

A fake instance receives an ordered JSON array of decision values before the
first request.

For each request:

1. validate the portable request shape;
2. consume exactly one decision from the head of the remaining script;
3. append one observation containing the one-based request ordinal, the request,
   and the consumed decision;
4. return that decision unchanged.

Script order is normative test behavior. No request may consume zero or more
than one scripted decision.

A request is ordinary JSON data:

```json
{
  "requestRef": "approval-1",
  "actionRef": "action-1",
  "reason": "optional human-readable context"
}
```

`requestRef` and `actionRef` MUST be non-empty strings. `reason` is optional and
non-normative; when present it MUST be a string. Unknown request fields are
rejected by a conforming profile projection rather than becoming hidden
semantics.

## 5. Exhaustion and malformed input

Script exhaustion is a test-infrastructure error, not an approval decision.
A conforming fake MUST report the stable machine-readable code:

```text
FAKE_APPROVAL_SCRIPT_EXHAUSTED
```

It MUST NOT translate exhaustion to `UNAVAILABLE`, because `UNAVAILABLE` is an
intentional simulated approval outcome.

Malformed script values fail before they can authorize an action. TypeScript
exception class names and stack traces are implementation-private and are not
portable observables.

## 6. Observations

The observable log is ordered and contains only:

```text
ordinal
request
decision
```

The `decision` field above is the exact scripted decision. Implementations MAY
store additional private bookkeeping, but profile comparison MUST ignore it
unless a later normative contract explicitly promotes it.

Reading observations MUST NOT expose mutable internal state that can alter future
fake behavior.

## 7. Determinism

Given the same validated script and request sequence, the fake MUST return the
same decisions and observations independent of host time, locale, timezone,
randomness, scheduling, filesystem state, or network state.

The M3-003 seed/logical clock remain available to the surrounding runner, but
M3-004 approval decisions do not consume either input.

## 8. Deferred behavior

M3-004 deliberately does not define:

- real user interaction or approval persistence;
- AbortSignal or platform cancellation mechanics;
- approval leases or remembered approvals;
- tool execution;
- filesystem/subprocess behavior;
- fault injection scheduling;
- DeepSeek Harness binding details.

Those belong to later M3 scenarios or later runtime milestones.

## 9. Acceptance criteria

M3-004 is complete only when:

- this language-independent contract exists before the implementation;
- portable JSON fixtures cover ordered decisions and explicit exhaustion;
- `@dsh-safe/testkit` provides one TypeScript implementation without importing
  `@deepseek-ai/*` or `packages/adapter-dsh` concrete types;
- conformance proves FIFO consumption, exact decision preservation, immutable
  observation exposure, and fail-closed script exhaustion;
- frozen install and repository `pnpm check:all` remain green.
