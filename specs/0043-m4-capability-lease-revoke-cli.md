# M4-036 — Deterministic CapabilityLease Revoke CLI

Status: **DRAFT NORMATIVE SPECIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-036 P1 — revoke CLI`  
CLI conformance profile: `M4-036_LEASE_REVOKE_CLI_V1`  
Mutation authority reused unchanged: `M4-033_LEASE_REVOKE_V1`  
Depends on: M4-033 authoritative CapabilityLease revocation, M4-035 gate-local CLI conventions  
Separated from: M4-040+ PEP composition, M5 audit ledger, M10 integrated product CLI, M13 lineage, M15 distributed/multi-node storage

## 1. Purpose

M4-036 defines the minimal deterministic operator CLI projection for revoking one
already-issued CapabilityLease by exact `leaseRef`.

This Gate answers one narrow question:

> How does a trusted local operator request exactly one M4-033 revocation through
> a strict non-ambiguous command surface, while preserving M4-033 idempotency,
> fail-closed store semantics and scope boundaries?

M4-036 does **not** define a second revocation primitive. The authoritative
state-transition contract remains Spec 0040 / `M4-033_LEASE_REVOKE_V1`.

## 2. Authority reconciliation

### 2.1 M4-033 remains mutation authority

The CLI MUST project to exactly:

```text
{
  profile: "M4-033_LEASE_REVOKE_V1"
  leaseRef: <exact validated ref>
}
```

and invoke the accepted M4-033 revoke primitive once.

M4-036 MUST NOT:

- widen `LeaseRevocationStore`;
- create a second revoke store port;
- add `revoked` to the public CapabilityLease wire model;
- reinterpret `REVOKED`, `ALREADY_REVOKED`, `NOT_REVOKED`, or `FAIL_CLOSED`;
- weaken M4-033 exact identity, monotonicity, linearizability, or store-evidence
  validation.

The `M4-036_LEASE_REVOKE_CLI_V1` name identifies this command conformance profile
only. It is not a new Lease mutation request profile.

### 2.2 M4-035 provides CLI architecture precedent only

M4-035 established that M4 may define a gate-local logical command adapter without
creating a product-wide CLI package, binary, parser dependency, global config
system, or numeric process exit-code policy.

M4-036 follows the same boundary. M10 remains the owner of the eventual integrated
product CLI and may later compose the accepted M4-035/M4-036 command contracts.

## 3. Trust boundary

M4-036 is a **trusted local operator/admin command surface**.

It does not define:

- remote admin authentication;
- tenant authorization;
- RBAC;
- HTTP/RPC transport;
- user impersonation;
- SaaS control-plane exposure.

A deployment exposing revocation remotely MUST add an independent authorization
boundary. The fact that a caller can reach this command is not portable proof of
operator authorization.

## 4. Logical command grammar

The portable logical command is:

```text
lease revoke --lease-ref <exact-ref> [--json]
```

The two command words are exact lowercase ASCII tokens:

```text
lease
revoke
```

Command-local options are exactly:

```text
--lease-ref <exact-ref>   # required exactly once
--json                    # optional at most once
```

`--json` may appear before or after `--lease-ref`.

No positional Lease target syntax is portable M4-036 semantics.

### 4.1 Why `--lease-ref` is required instead of a positional target

The existing `defs.ref` domain is opaque and may legally begin with `--`.
A positional grammar would silently narrow or ambiguate the existing protocol
identity domain.

Therefore the token immediately following `--lease-ref` is consumed
**unconditionally as the ref value**, even if that token itself begins with `--`.

Example:

```text
lease revoke --lease-ref --json --json
```

means:

```text
leaseRef = "--json"
format = JSON
```

The first `--json` is the value consumed by `--lease-ref`; the second is the
format option.

This rule preserves the complete accepted ref domain without trim, prefix parsing,
special option escaping, or aliasing.

## 5. Command parsing and hostile argv boundary

A TypeScript reference adapter accepts `argv` as `unknown`.

Portable argv must be a dense array of strings with only ordinary indexed own data
properties plus `length`.

The adapter MUST fail as CLI usage error before Broker/store invocation for:

- non-array outer values;
- sparse arrays;
- accessor-backed elements;
- named or symbol array properties;
- unreadable/revoked Proxy meta-operations;
- non-string elements;
- missing command words;
- wrong command words;
- missing `--lease-ref`;
- missing value at end of argv;
- duplicate `--lease-ref`;
- duplicate `--json`;
- unknown options;
- positional target values;
- unexpected trailing positional data;
- arrays beyond the finite command grammar bound.

The portable command contains four tokens without JSON and five with JSON.
An implementation MAY use a hard argv length bound of 5 after validating a normal
array shape.

Stable CLI parser failure:

```text
CLI_USAGE_ERROR / LEASE_REVOKE_CLI_ARGUMENT_INVALID
```

No Broker or store call occurs for a CLI usage error.

## 6. Exact Lease identity

The `--lease-ref` value MUST satisfy the existing `defs.ref` domain:

```text
1..512 Unicode code points
```

It is preserved exactly.

The CLI MUST NOT apply:

```text
trim
case folding
Unicode normalization
URL decoding
prefix lookup
substring lookup
fuzzy matching
alias resolution
numeric coercion
String(value)
```

An invalid ref is a CLI usage error and MUST fail before Broker/store invocation.

M4-033 still revalidates the constructed Broker request as defense in depth.

## 7. Exactly one target; no bulk or graph mutation

M4-036 revokes exactly one supplied `leaseRef`.

The following are explicitly outside the portable command:

```text
--all
--filter
--subject
--capability
--recursive
--cascade
--descendants
--parent
--force
```

The CLI MUST NOT:

- enumerate Lease inventory before revoking;
- expand one target into multiple identities;
- traverse `parentLeaseRef`;
- discover descendants;
- revoke a parent automatically;
- revoke children automatically.

Revoking a parent through M4-036 invokes M4-033 for the parent only. M4-034/later
composition may make descendants unusable through inherited authority rules without
fabricating child revocation records.

## 8. No pre-list / no advisory precondition read

The CLI MUST NOT first call M4-035 listing or another read path to determine whether
the target appears active, unrevoked, unexpired, or unexhausted.

Such a pre-read would be stale immediately and would not add authority to M4-033.

One valid command therefore performs:

```text
parse argv
-> validate exact leaseRef
-> construct M4-033 input
-> invoke M4-033 once
-> render result
```

The authoritative M4-033 store remains the only lifecycle mutation dependency.

## 9. TTL and usage are not revoke preconditions

M4-036 MUST NOT reject a target merely because it is:

- expired-looking;
- not-yet-active-looking;
- exhausted;
- otherwise carrying preserved TTL/usage evidence.

M4-033 revocation is an independent lifecycle fact.

The CLI does not read or mutate:

```text
issuedAt
expiresAt
maxUses
remainingUses
```

and does not simulate revocation through expiry or exhaustion.

## 10. No portable reason/audit metadata

M4-033 intentionally does not define portable human reason metadata, and M5 remains
the future audit-ledger milestone.

M4-036 therefore does not accept:

```text
--reason
--ticket
--comment
--actor
--revoked-at
```

A CLI must not accept data that it cannot bind to an accepted durable audit contract.

Future operator/audit metadata may be added only through a separately specified
recording boundary and MUST NOT alter the M4-033 state-transition result.

## 11. No automatic retry

The CLI invokes the M4-033 primitive at most once per operator invocation.

It MUST NOT automatically retry:

```text
LEASE_REVOKE_STORE_UNAVAILABLE
LEASE_REVOKE_OUTCOME_UNKNOWN
LEASE_REVOKE_STORE_RESULT_INVALID
```

In particular, an ambiguous store result maps to command runtime failure even though
M4-033 permits a **later explicit caller retry** because revocation is monotonic.

An explicit second CLI invocation is a new operator invocation. It may observe
`ALREADY_REVOKED` if the first ambiguous attempt actually committed.

## 12. Broker result preservation

M4-036 preserves the accepted M4-033 result algebra exactly:

```text
REVOKED / LEASE_REVOKED

ALREADY_REVOKED / LEASE_ALREADY_REVOKED

NOT_REVOKED / LEASE_REVOKE_NOT_FOUND

FAIL_CLOSED / INPUT|STORE / <M4-033 reason>
```

The CLI does not translate a failure into success and does not collapse
`NOT_REVOKED` into `ALREADY_REVOKED`.

## 13. Logical command result classes

M4-036 defines command-local logical classes only:

```text
SUCCESS
NOT_FOUND
CLI_USAGE_ERROR
RUNTIME_FAILURE
```

Mapping:

```text
M4-033 REVOKED          -> SUCCESS
M4-033 ALREADY_REVOKED  -> SUCCESS
M4-033 NOT_REVOKED      -> NOT_FOUND
M4-033 FAIL_CLOSED      -> RUNTIME_FAILURE
parser/ref failure      -> CLI_USAGE_ERROR
```

`ALREADY_REVOKED` is command success because the requested permanent target state is
already true, while the exact broker result remains visible.

`NOT_FOUND` is not success because no authoritative Lease identity was proven or
revoked.

M4-036 does not define numeric process exit codes. M10 owns product-wide exit-code
policy.

## 14. Output formats

Default format is human-oriented text.

`--json` selects structured JSON.

### 14.1 Human output

The v1 human output is intentionally minimal and does not echo the target ref.

Exact forms are:

```text
REVOKED<TAB>LEASE_REVOKED

ALREADY_REVOKED<TAB>LEASE_ALREADY_REVOKED

NOT_REVOKED<TAB>LEASE_REVOKE_NOT_FOUND

FAIL_CLOSED<TAB>INPUT<TAB><reasonCode>

FAIL_CLOSED<TAB>STORE<TAB><reasonCode>
```

No additional free-text explanation is portable output.

Not echoing `leaseRef` avoids reflecting attacker-controlled terminal control/bidi
text and avoids creating a second identity-rendering contract.

### 14.2 JSON output

JSON output serializes only the M4-033 broker result object.

Examples:

```json
{"status":"REVOKED","reasonCode":"LEASE_REVOKED"}
```

```json
{"status":"FAIL_CLOSED","stage":"STORE","reasonCode":"LEASE_REVOKE_OUTCOME_UNKNOWN"}
```

The output MUST NOT add the caller-supplied ref, stack traces, host exception text,
store diagnostics, or implementation-specific fields.

A reference renderer may reuse the M4-035 JSON escaping policy for C1/bidi controls;
the accepted M4-033 result algebra itself contains only fixed stable strings.

## 15. Failure privacy

CLI usage failures expose only:

```text
LEASE_REVOKE_CLI_ARGUMENT_INVALID
```

Runtime failures preserve stable M4-033 stage/reason codes.

Failure output MUST NOT echo:

- target `leaseRef`;
- store values;
- host/store exception text;
- stack traces;
- terminal control sequences;
- guessed remediation commands.

## 16. Deterministic observable order

The portable command order is:

```text
1. argv is a readable dense string array within the command bound
2. exact command words are lease + revoke
3. parse exact command-local options
4. require one --lease-ref and at most one --json
5. validate exact defs.ref value
6. construct exact M4-033 request
7. invoke M4-033 exactly once
8. map broker status to command-local class
9. render HUMAN or JSON output
10. return detached immutable command result
```

No store call may occur before steps 1–5 succeed.

## 17. Idempotency and concurrency meaning

M4-036 inherits M4-033 per-Lease linearizability.

Two concurrent valid CLI invocations targeting one initially active Lease and sharing
one conforming authoritative store yield the same aggregate semantics as two direct
M4-033 calls:

```text
one REVOKED
one ALREADY_REVOKED
```

Both command invocations map to `SUCCESS`.

M4-036 adds no global ordering across different Lease identities.

## 18. Parent/child composition

M4-036 never walks hierarchy.

If the exact target is a parent:

```text
parent.revoked: false -> true
```

only the parent's authoritative revocation state is written by this command.

No child `revoked` bit is fabricated.

Accepted M4-034 hierarchy-aware consume may reject descendant use when an ancestor is
revoked; that is a composition consequence, not CLI cascade behavior.

## 19. Reference implementation architecture constraint

A production M4-036 adapter SHOULD live alongside the existing gate-local M4-035 CLI
adapter or an equally one-way presentation layer.

It MUST:

- call the exported M4-033 primitive rather than reimplement revocation;
- depend on the existing `LeaseRevocationStore` port only through that primitive;
- create no reverse dependency from protocol/core packages into CLI code;
- add no CLI parsing dependency unless a separately justified implementation change
  preserves frozen reproducibility and the exact command grammar.

The protocol-first commit does not authorize production TypeScript.

## 20. Portable conformance corpus

Portable corpus:

```text
fixtures/lease-revoke-cli/cases.json
```

CLI conformance profile:

```text
M4-036_LEASE_REVOKE_CLI_V1
```

Underlying mutation profile:

```text
M4-033_LEASE_REVOKE_V1
```

The corpus covers at least:

- first revoke in human and JSON output;
- already-revoked idempotent success;
- not found distinct from success;
- exact case/whitespace identity;
- 512/513 Unicode-code-point ref boundaries;
- astral code points;
- a legal ref beginning with `--`;
- option ordering;
- missing/duplicate/unknown options;
- positional target rejection;
- bulk/cascade/force/reason rejection;
- known-not-applied, ambiguous and malformed store outcomes;
- no automatic retry;
- explicit retry after ambiguous outcome;
- exhausted/expired evidence preserved;
- parent-only revocation without child record mutation;
- no raw terminal-control target reflection;
- non-string/null argv rejection.

Portable sequence cases distinguish automatic retry from a later explicit invocation.

## 21. Explicit non-goals

M4-036 does not:

- define a new Lease mutation profile;
- change M4-033 state semantics;
- add fields to CapabilityLease;
- introduce revoke reason/audit records;
- define unrevoke/reactivate;
- consume a Lease use;
- list or search before revoke;
- perform prefix/fuzzy/alias matching;
- bulk revoke;
- cascade through parent/child identities;
- inspect TTL/usage as preconditions;
- authorize a remote caller;
- define global CLI config or executable name;
- define numeric process exit codes;
- create M10's integrated CLI;
- wire M4-040+ PEP;
- stop an already-running action;
- roll back external effects;
- change DeepSeek Harness semantics.

## 22. DeepSeek Harness boundary

DeepSeek Harness remains Adapter/source-conformance evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness command behavior, session lineage, or internal CLI conventions are not
protocol authority for M4-036.

## 23. Protocol-first Gate boundary

The M4-036 protocol-first delta MUST remain limited to exactly:

```text
specs/0043-m4-capability-lease-revoke-cli.md
fixtures/lease-revoke-cli/cases.json
docs/handoff/CURRENT.md
```

Not authorized in this protocol-first commit:

```text
production TypeScript
package.json or dependency changes
pnpm-lock.yaml
public CapabilityLease schema/type changes
M4-033 primitive/store changes
Shared TCK registration
docs/handoff/HISTORY.md
docs/roadmap.md
Adapter/Harness baseline
M4-040+
M5
M6
M10 integrated CLI implementation
M13
M15
PR #3 merge
```

Production implementation may begin only after the resulting exact protocol-first
head reaches:

1. normal repository CI PASS;
2. exact pinned DeepSeek Harness rc5 source-conformance PASS;
3. PR #3 remains Open/Draft/mergeable;
4. no review/review-thread blocker exists.

Any semantic ambiguity discovered during implementation MUST first be corrected in
Spec 0043/corpus rather than hidden in TypeScript behavior.
