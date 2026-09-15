# M4-045 Owned Audit Digest Implementation Review

Status: **PARTIAL IMPLEMENTATION — NOT M4-045 ACCEPTANCE**  
Date: `2026-09-06`  
Baseline: `039b556ce95db25a96afecab6794828cb1958ba4`  
Authority: Spec 0049 sections 4/5; existing DAV/DAL/DAI fixtures

## Scope and behavior

`packages/adapter-dsh/src/audit-digest.ts` implements the private source-digest
operation. It validates the fixed domain, constructs the documented profile/domain
envelope, canonicalizes supported data synchronously under fixed depth/value/UTF-8
limits and hashes with Node's built-in SHA-256. It returns a frozen digest result
or fixed rejection code, never a raw error or partially encoded fallback.

The encoder emits sorted object keys itself, preserving UTF-16 ordering even for
numeric-looking property names. Only primitive strings/numbers reach native JSON
serialization. Descriptor-based property reads reject accessors/non-enumerable
fields; unsupported prototypes, symbols, cycles, sparse/extended arrays, invalid
Unicode and non-JSON values are rejected. Repeated acyclic values remain supported
and count on every visit. String escape/UTF-8 cost is checked before allocating
its escaped representation. The whole canonical envelope stays within 1 MiB.

Inspection errors are classified by private sentinel identity rather than error
text. Owned hash failures have a distinct fixed code. There is no injectable
production digest callback and the module is not exported from the package index.
A test-only Vitest mock of node:crypto verifies the hash-failure path without
adding production fault-injection options.

This does not make JavaScript a sandbox: property-inspection Proxy traps can run
host code, and native own-key enumeration allocates the source key list before
it can be checked. The bounded encoding profile does not guarantee a time/memory
quota against a malicious in-process host. Hashes retain the previously documented
equality/guessing limitations.

## Test sequence and evidence

The new production-bound test suite was written first and run before the module
existed. It failed to load the absent audit-digest module; this was a missing-SUT
red run, not a claim that individual behavioral assertions had executed.

After implementation, local checks pass:

- 18 new producer tests, including DAV/DAL/DAI cases and actual source coercion,
  canonical ordering, Unicode, error containment and hash-failure assertions.
- 27 unchanged oracle self-tests: 45 tests across the two normal suites.
- 10 new encoder conformance cases plus three existing corpus checks: 13 tests
  through the pinned-conformance configuration without importing Harness locally.
- Adapter production typecheck, strict new-test typecheck and focused lint.
- Pinned pnpm 11.7.0 frozen-lockfile install and supply-chain policy check.

The existing pinned-source workflow compiles the module and executes the new
encoder conformance suite alongside real Harness tests. Its exact-head result is
required before this becomes the next implementation baseline. Running encoder
tests inside that job is not proof of observeAudit integration.

## Dependency and compatibility review

The only added direct dependency is development-only `@types/node@22.19.0`,
with transitive `undici-types@6.21.0`. Adapter tsconfig explicitly includes Node
types so TypeScript 6 can typecheck the built-in crypto import. Existing strict
flags are unchanged. pnpm updates the optional Node-type peer keys for existing
Vite/Vitest versions; no existing package version is upgraded and no runtime
package or custom crypto implementation is introduced.

The portable Schema baseline, workflow, public Adapter observation/control APIs,
Harness pin and roadmap acceptance markers remain unchanged.

## Remaining integration

Source provenance still belongs to the future owned projection at its authoritative
runtime seams. Supplying arbitrary input to this private encoder proves only a
digest computation, not trustworthy event origin or audit admission. Event field
projection, correlation across subscribers, observeAudit registration, ordered
delivery, capacity/error summaries and disposal remain unimplemented. Bind their
contract tests before production changes. Complete end-to-end privacy evidence
and acceptance/governance before closing M4-045; later Gates and PR merge remain
outside this step.
