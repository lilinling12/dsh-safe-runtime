# Spec 0003: DeepSeek Harness Adapter Contract

Status: DRAFT
Milestone: M2
Tested Harness baseline: `0.1.0-rc.5` / commit `47f943859bef60e4160492346772ded9b24f765a`

## 1. Purpose

The DeepSeek Harness adapter translates Harness-specific lifecycle facts and control seams into runtime-independent safe-runtime ports. Harness is an adapter, never the protocol authority.

## 2. Normative boundaries

The adapter MUST:

1. preserve the distinction between durable facts and live interception events;
2. treat `tools/result` as the final authoritative live tool outcome;
3. correlate durable `tool/call` / `tool/result` with normalized action records without claiming execution success from `tool/call` alone;
4. fail closed when a required Harness capability is missing;
5. report the strongest guarantee actually enforced, never the guarantee requested by configuration;
6. keep Harness concrete event payloads inside `packages/adapter-dsh`;
7. avoid dependence on the concrete `dsh-agent-loop` implementation;
8. treat `ctx.tools.restrict()` as visibility composition, not authorization;
9. treat `ctx.sandbox` as process/filesystem-effect confinement according to the provider contract, not as a universal network security boundary.

## 3. Normalized lifecycle

The minimum normalized runtime event vocabulary for M2 is:

```text
session.started
turn.started
step.started
tool.requested
tool.completed
approval.decided
model.request.failed
turn.completion_requested
turn.ended
```

`tool.requested` represents intent only. `tool.completed` represents an observed final outcome.

## 4. Tool policy port

The adapter exposes a tool-policy port at the Harness pre-dispatch boundary.

A policy decision is one of:

```text
ALLOW
DENY
ASK
```

The port MUST NOT expose argument rewrite semantics because Harness `tools/pre-execute` does not offer argument rewriting in the tested baseline.

A monotonic hard-deny installation MAY additionally use `ctx.tools.guard()` when the policy must not be reopened by later reorderable listeners.

## 5. Approval port

The adapter maps Harness approval outcomes as follows:

```text
allowed-once -> ALLOWED_ONCE
rejected     -> REJECTED
cancelled    -> CANCELLED
unavailable  -> UNAVAILABLE
```

Only `ALLOWED_ONCE` authorizes the requested action. All other outcomes fail closed.

## 6. Completion steering port

The adapter MAY intercept `agent/turn-stopping` to prevent final closure or inject another step through supported agent mechanisms. It MUST cap retry/steering loops at the caller-defined acceptance budget.

## 7. Feature detection

Compatibility is capability-based, not version-branch based. The adapter MUST publish a feature matrix and refuse guarantees whose prerequisite feature is absent.

## 8. Correlation

Harness process-local execution tokens are opaque and MUST NOT be persisted. Durable correlation uses stable session/turn/step/call identifiers and adapter-generated references. Process-local tokens may be used only while the process is alive.

## 9. Persistence

Until external custom durable session-event registration is proven stable across the supported Harness range, safe-runtime domain evidence remains in a sidecar ledger keyed to Harness durable event references.

## 10. M2 acceptance criteria

M2 is complete only when:

- the tested Harness baseline is pinned;
- the feature matrix is machine-readable;
- normalized runtime event types compile without Harness imports;
- adapter ports compile without Harness concrete payload leakage;
- positive and negative conformance fixtures exist;
- unsupported features produce explicit `UNSUPPORTED`, never silent success;
- a compatibility note documents every asserted Harness seam.
