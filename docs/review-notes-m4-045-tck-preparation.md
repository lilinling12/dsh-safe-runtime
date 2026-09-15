# M4-045 Executable TCK Preparation

Status: **TEST INFRASTRUCTURE / SOURCE PREREQUISITES — NOT PRIVACY ACCEPTANCE**  
Date: `2026-09-06`  
Parent: `e8b85751a4fe2333248f03f9afc44e4b094faf76`  
Authority: Spec 0049 and corpus `M4-045_DSH_AUDIT_ADMISSION_V1`

## Deliverable

The test-only oracle in Adapter source-conformance validates closed audit events
against independently supplied expectations, rejecting arbitrary extra fields,
invalid enums/time, wrong digest values and missing correlation. It also checks
immutable delivery summaries, explicit failure counts, fixed ordered diagnostics
and incomplete status. It does not project source facts, provide an audit sink or
certify a record merely because its strings look like digests.

The normal Vitest suite tests the oracle with authored records and deliberately
defective observations. Authored placeholder identity digests exercise structure;
they are not presented as correlated producer output. Expected digest bytes in
DAV-001..008 are checked using Web Crypto independently of the Node crypto
operation that originally authored the fixture hashes. The helper hashes already
authored canonical bytes; it is deliberately not a second JCS implementation.

DAL-001..006 generate the exact inclusive depth/value/byte limits and one-over
cases. DAI-001..016 provide unsupported JavaScript values, including an accessor,
cycles, sparse/extended arrays and a revoked Proxy. The generic digest assertion
can be connected to the future owned encoder. Tests currently prove that an
always-accepting candidate fails these negative expectations; they do not prove
that a production encoder rejects the inputs, because none exists yet.

The pinned Harness test uses real SessionStore, AgentRegistry and ToolRuntime,
a registered agent fixture, a native tool/call record, raw policy input, body,
post-execute rewrite and definition finalization. It observes the exact returned
final object and demonstrates that the ordinary Digest callback still carries
a synthetic canary. Ordinary events fail the new audit shape oracle.
This establishes source prerequisites only, not a completed audit privacy path.

## Evidence boundaries

| Requirements | Preparation supplied | Still required for acceptance |
| --- | --- | --- |
| DAP-003/005/006/014/032 | Real pinned source capture and unchanged ordinary channel/control input; exact final object after two stages. | Owned audit digests, callback isolation and canary absence from actual audit output. |
| DAP-004/009/010/012/013/016/017 | Closed event oracle and defective-output tests; independently authored domain/session digest vectors. | All actual emitted event types, metadata substitution and real source joins. |
| DAP-018/019/020/021/022 | Canonical bytes, unsupported inputs and inclusive encoder-limit cases. | Bind the production encoder; prove canonicalization, atomic rejection and no source coercion. |
| DAP-024/025/027/028 | Safe summary oracle rejects fabricated success, invalid diagnostics and count overflow. | Actual projection/hash/sink failure, capacity, ordering and sticky incomplete state. |
| DAP-001/002/007/008/011/015/023/026 | Candidate contract retained. | Owned path, entire failure source, correlation across subscribers, atomicity and disposal/drain. |
| DAP-029/030/031/033/034/035/036 | Existing authority and non-claims retained; partial-witness IDs checked. | Source review, compatibility witnesses, complete evidence map and final acceptance/governance. |

Rows describe partial preparation, not a checklist of accepted requirements.
A passing oracle self-test or negative ordinary-event test cannot be cited as
real-runtime privacy acceptance. There are no skipped/todo production assertions,
no fake producer replacing production, and no tests asserting the future
observeAudit method must stay absent.

## Next binding work

First bind DAL/DAI/DAV cases and output assertions to the owned encoder/projection
with executable failing tests, then implement the minimum path that passes them.
Add actual audit-subscriber tests for raw digest isolation, metadata substitution,
final-result authority, concurrent ordinary/audit subscriptions, ordered delivery,
capacity, failure and disposal. These tests must precede their production changes.
Complete the evidence map with actual witnesses, not this preparation table.

No production source, portable Schema, dependency/lockfile, workflow or roadmap
acceptance marker changes in this step. The new source-conformance files are
included by the existing strict pinned-source typecheck and runtime glob.
Normal CI plus pinned Harness must be green on the same published head before
this preparation is used as the implementation baseline. PR #3 remains Draft;
M4-045 is unaccepted and later Gates/merge are outside this step.
