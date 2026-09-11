# M4-009 — CapabilityPolicy Hot Reload with Atomic Swap

> Status: DRAFT NORMATIVE M4 PROFILE  
> Milestone: `M4 — Capability Broker v0.1`  
> Gate: `M4-009 P1 — policy hot reload with atomic swap`

This specification defines how a runtime prepares and atomically publishes a new
CapabilityPolicy snapshot without exposing a partially processed policy or
losing the last known-good active snapshot.

M4-009 is deliberately an **activation/state-management boundary**, not a file
watcher, policy evaluator, PDP, approval router, lease manager, or distributed
configuration system.

## 1. Authority and reconciliation

M4-009 refines only the hot-reload boundary established by the accepted M4
contracts:

1. `specs/0017-m4-capability-policy-document-loader.md`;
2. `specs/0018-m4-capability-policy-schema-validation.md`;
3. `specs/0019-m4-canonical-resource-normalization.md`;
4. `specs/0020-m4-deterministic-rule-ordering.md`;
5. `specs/0024-m4-capability-policy-diagnostics.md`;
6. `schemas/v1alpha1/capability-policy.schema.json`.

M4-005/M4-006/M4-007 remain downstream request/effect semantics and MUST NOT be
executed merely because a policy is reloaded. M4-020+ remains unauthorized.

DeepSeek Harness remains Adapter compatibility evidence only and does not define
reload or atomicity semantics.

## 2. Design goals

M4-009 MUST provide:

- preparation of a candidate from caller-supplied JSON/YAML source;
- reuse of accepted M4-001 and M4-002 rather than a second parser/validator;
- request-independent resource-selector activation preflight using accepted
  M4-003/M4-004 semantics;
- atomic publication of one immutable active snapshot record;
- retention of the last known-good snapshot after every rejected candidate;
- monotonic local epochs for observable snapshot identity;
- deterministic failure stage/reason/path information without copying policy
  source or sensitive field contents;
- snapshot isolation for readers that already acquired an older active record.

M4-009 MUST NOT provide:

- filesystem watching, polling, debounce or retry scheduling;
- network/config-service fetching;
- full policy applicability evaluation;
- subject resolution;
- capability classification;
- arbitrary constraint interpretation;
- lease lookup/consumption;
- approval routing;
- decision/receipt/provenance construction;
- guarantee assignment;
- cross-process, distributed or durable consensus;
- policy-content deduplication based on an implicit equality rule;
- Adapter/Harness enforcement.

## 3. Source boundary

The portable reload request is:

```text
PolicyReloadRequest {
  format: string
  source: string
}
```

M4-009 does not validate the supported-format vocabulary itself. `format` remains a
string so the accepted M4-001 loader stays the sole authority for whether a format is
supported and can return `POLICY_DOCUMENT_FORMAT_UNSUPPORTED` unchanged.

The TypeScript projection MAY accept `unknown` at its public runtime boundary,
but it MUST materialize exactly these two own data properties without invoking
getters. Unexpected own string fields, symbol fields, inherited required fields,
or accessor-backed required fields are invalid reload input.

M4-009 always uses the accepted M4-001 default source/depth/container budgets. It
does not expose a per-reload limit override that can silently turn the hot-reload
path into a less-bounded parser profile.

A source reference, filesystem path, URL, watch handle or transport token is not
part of portable M4-009 identity and MUST NOT be synthesized into result output.

## 4. Store state

A hot-reload store has exactly one of two observable states:

```text
EMPTY {
  status: "EMPTY"
  epoch: 0
}

ACTIVE {
  status: "ACTIVE"
  epoch: integer in [1, 9007199254740991]
  policy: immutable M4-002 validated snapshot
}
```

`epoch` is local process/store identity only. It is not a protocol policy
version, digest, authorization receipt, durable sequence number or distributed
clock.

The store starts `EMPTY`. M4-009 MUST NOT fabricate an implicit default policy.
Consumers MUST NOT interpret `EMPTY` as authorization success.

## 5. Candidate preparation pipeline

A reload candidate MUST be fully prepared before active state changes.

The exact v0.1 sequence is:

```text
reload request boundary
  -> M4-001 load with accepted default budgets
  -> M4-002 schema validation
  -> source-order resource activation preflight
       -> M4-003 normalizePolicyResourceSelector()
       -> M4-004 accepted lexical pattern syntax validation
  -> build immutable next ACTIVE record
  -> atomic publish
```

No active-state mutation may occur before the final publish step.

### 5.1 M4-001 load

M4-009 MUST call the accepted loader. It MUST NOT content-sniff, parse JSON/YAML
again, insert defaults, repair syntax, or fall back from one format to another.

A load failure rejects the candidate and preserves active state exactly.

### 5.2 M4-002 schema validation

The successfully loaded value MUST pass the accepted trusted Draft 2020-12
CapabilityPolicy validator.

Schema-invalid input rejects the candidate and preserves active state exactly.
M4-009 does not coerce values, remove fields or insert `defaultEffect`.

### 5.3 Resource activation preflight

After M4-002 succeeds, every `spec.rules[i].resources[j]` entry MUST be checked in
numeric source order:

1. apply the accepted M4-003 policy-selector normalizer;
2. if normalization succeeds, apply the accepted M4-004 lexical pattern syntax
   validator/compiler profile.

The first failure in this traversal rejects the whole candidate. The rejection
records only its stable reason code and RFC 6901 path:

```text
/spec/rules/<i>/resources/<j>
```

This preflight is request-independent: every resource selector must be a valid
canonical selector/pattern before it can safely participate in any future
request evaluation.

M4-009 MUST reuse the accepted M4-003/M4-004 implementation seams. It MUST NOT
maintain a second selector or `*`/`**` parser.

### 5.4 What activation preflight does not validate

M4-009 MUST NOT invent policy-wide semantics that are not yet owned by an
accepted gate.

In particular it does not reject a schema-valid policy merely because M4-008
would report:

- duplicate rule IDs;
- redundant deny priority;
- redundant zero priority;
- an empty rule set.

M4-008 diagnostics are operator feedback and remain non-authoritative. A caller
may diagnose a validated snapshot separately, but diagnostics success/failure or
severity is not the atomic-swap decision procedure.

M4-009 likewise does not interpret subjects, capabilities, constraints,
delegation or lease semantics beyond M4-002 schema validity.

## 6. Atomic publication

After the entire candidate pipeline succeeds, the implementation MUST construct
the complete next immutable active record before publication:

```text
nextEpoch = currentEpoch + 1
nextRecord = frozen { status: "ACTIVE", epoch: nextEpoch, policy: candidate }
successResult = frozen { ok: true, status: "SWAPPED", epoch: nextEpoch }
```

Only then may the store perform one logical publication operation:

```text
activeRecord = nextRecord
```

That assignment/exchange is the M4-009 linearization point.

A conforming implementation MUST ensure that a reader observes either:

- the complete previous active record; or
- the complete next active record.

A reader MUST NOT observe a new epoch with an old policy, an old epoch with a new
policy, a temporary `EMPTY` state during replacement, or any partially prepared
candidate.

The TypeScript reference implementation is scoped to one JavaScript isolate and
MUST publish one frozen record reference synchronously. Cross-worker,
cross-process and distributed atomicity are outside M4-009.

## 7. Snapshot isolation

Reading active state returns an immutable snapshot handle.

A successful later swap:

- MUST NOT mutate the policy contained in an older handle;
- MUST NOT rewrite the older handle's epoch;
- MUST NOT revoke or repoint an older handle;
- MUST NOT require an in-flight caller to switch snapshots mid-operation.

This enables a later PDP to acquire one policy snapshot and use that same
immutable snapshot for one complete evaluation. M4-009 itself does not perform
that evaluation.

## 8. Last-known-good preservation

Every rejected reload MUST preserve the exact previously published active record
reference and epoch.

This includes failures at:

- reload request materialization;
- M4-001 loading;
- M4-002 schema validation;
- M4-003 selector normalization;
- M4-004 pattern syntax validation;
- trusted/internal preparation before publication;
- epoch exhaustion.

If the store is `EMPTY`, a rejected first reload leaves it `EMPTY` at epoch 0.

A reload implementation MUST NOT clear the old policy first and then attempt to
load/validate the replacement.

## 9. Epoch semantics

Epochs are monotonically increasing local safe integers.

- initial `EMPTY` epoch is 0;
- first successful swap publishes epoch 1;
- every later successful swap increments exactly once;
- rejected reloads do not increment;
- reloading byte-for-byte or semantically identical policy content still counts
  as a successful explicit activation and increments the epoch;
- M4-009 performs no hidden content digest/equality deduplication.

If the active epoch is `9007199254740991`, a candidate that would otherwise be
accepted MUST be rejected before publication with:

```text
POLICY_RELOAD_EPOCH_EXHAUSTED
```

The active record remains unchanged.

## 10. Portable reload result

### 10.1 Success

```text
PolicyReloadSuccess {
  status: "SWAPPED"
  epoch: integer
}
```

The TypeScript projection MAY add `ok: true`.

### 10.2 Rejection

```text
PolicyReloadFailure {
  status: "RELOAD_REJECTED"
  stage: "REQUEST" | "LOAD" | "SCHEMA" | "RESOURCE" | "STATE"
  reasonCode: string
  instancePath?: string
  issues?: M4-002 portable schema issues
}
```

The TypeScript projection MAY add `ok: false`.

Rules:

- `REQUEST` uses `POLICY_RELOAD_REQUEST_INVALID`;
- `LOAD` preserves the exact accepted M4-001 failure reason code but omits
  loader free-form detail;
- `SCHEMA` uses `POLICY_SCHEMA_INVALID` and may preserve the detached/frozen
  M4-002 portable issue list;
- `RESOURCE` preserves the accepted M4-003/M4-004 failure reason and includes the
  exact resource `instancePath`;
- `STATE` uses `POLICY_RELOAD_EPOCH_EXHAUSTED` or
  `POLICY_RELOAD_INTERNAL_FAILURE`.

A rejected result MUST NOT contain source text, resource strings, subjects,
constraints, lease contents, host paths, stack traces, exception messages or
library-specific error objects.

## 11. Determinism

For the same current epoch and same reload request under the same accepted schema
configuration:

- candidate acceptance/rejection is deterministic;
- resource preflight failure selection is deterministic by rule index then
  resource index;
- successful next epoch is deterministic;
- no host time, randomness, locale, environment variable, filesystem state,
  network state, DNS or Harness behavior participates.

## 12. Failure and exception safety

Before the linearization point, an unexpected internal/trusted processing
failure MUST leave active state unchanged and return/fail closed as
`POLICY_RELOAD_INTERNAL_FAILURE` without exposing the exception object.

The implementation MUST prepare both the next active record and success result
before publishing the pointer so ordinary result construction cannot create a
known split state after publication.

M4-009 makes no claim about recovery from process termination, out-of-memory
termination or hardware failure during a machine instruction. Durable crash
recovery belongs outside this in-memory P1 boundary.

## 13. JavaScript/TypeScript runtime hardening

The TypeScript reference implementation MUST:

- create/compile the accepted trusted M4-002 validator once at store creation;
- expose no caller-supplied validation callback in the reload critical section;
- inspect reload request fields with own data-property descriptors;
- reject accessor-backed/inherited/missing required request fields without
  executing getters;
- reject unexpected own string/symbol request fields;
- keep source data candidate-local and never store it in the active record;
- store the complete active tuple in one frozen object reference;
- return frozen read/result wrappers;
- reuse the recursively frozen M4-002 policy snapshot without mutating it;
- execute reload synchronously with no `await` or externally supplied hook
  between candidate preparation and publication;
- perform no filesystem watch/read, network, process, clock, randomness, locale
  or Harness operation.

## 14. Portable fixture requirements

Language-independent fixtures MUST cover at least:

- initial state is `EMPTY` epoch 0;
- first valid JSON activation -> epoch 1;
- first valid YAML activation -> epoch 1;
- second valid activation -> epoch 2 and new policy active;
- invalid reload after success retains the previous active policy/epoch;
- invalid first reload keeps `EMPTY` epoch 0;
- unsupported format preserves exact M4-001 reason;
- JSON/YAML syntax failure preserves M4-001 reason;
- schema-invalid candidate preserves M4-002 failure and old state;
- unsupported/differently-cased resource scheme rejects at `RESOURCE` with exact
  JSON Pointer;
- invalid embedded/triple `**` rejects at `RESOURCE` with exact JSON Pointer;
- when multiple resource selectors fail, the first source-order failure wins;
- a duplicate-rule-ID warning does not itself block activation;
- redundant-priority diagnostics do not block activation;
- empty-rule policy can activate because the schema permits it;
- identical-content explicit reload increments epoch rather than silently
  deduplicating it;
- subject/constraint/lease fields that pass M4-002 do not acquire M4-020+
  semantics during reload.

TypeScript-specific tests MUST additionally cover accessor/inherited/symbol
reload requests, old-handle snapshot isolation, frozen active/result objects,
state preservation after revoked/proxy-like runtime failures where applicable,
epoch exhaustion through an internal test seam, and proof that no candidate
source string is retained in the active record.

## 15. M4-009 acceptance boundary

M4-009 can be accepted only when one exact implementation head proves:

1. this profile and portable fixtures exist before production implementation;
2. M4-001 and M4-002 are reused, not reimplemented;
3. every resource selector is preflighted with accepted M4-003/M4-004 semantics;
4. M4-008 diagnostics never become an activation-authority substitute;
5. rejected candidates preserve the exact last-known-good record and epoch;
6. successful publication is one complete immutable active-record swap;
7. old snapshot handles remain immutable and stable after later swaps;
8. no temporary `EMPTY` or partially prepared candidate is observable;
9. epochs increment only for successful explicit activations and are bounded;
10. no implicit policy-content deduplication is introduced;
11. no M4-020+ subject/evaluation/lease/approval/receipt/guarantee semantics are
    implemented early;
12. no filesystem watcher, network fetcher, clock/random dependency or Harness
    dependency enters policy-engine;
13. runtime accessors/prototypes/symbol fields cannot become reload input;
14. output does not disclose policy source or sensitive field contents;
15. schemas, validators, M4-001..008 behavior, strict TypeScript, frozen install,
    supply-chain policy, architecture boundaries and Shared TCK remain intact;
16. exact-head normal CI and exact Harness rc5 source-conformance are both green.

After implementation acceptance, the governance head recording M4-009 must
itself reach exact-head normal-CI + Harness dual-green before any later M4 gate
is authorized.
