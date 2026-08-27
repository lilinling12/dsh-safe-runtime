# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-27`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M2 / M3: **ACCEPTED / MERGED**
- M4-001 through M4-009: **ACCEPTED / GOVERNANCE CLOSED**
- M4-009 final governance head: `d0db84efccad8139b42881a32792e4c75aacfde7`
- M4-009 final governance CI: **PASS — CI #348 / run `32823098144`**
- M4-009 final governance Harness: **PASS — #290 / run `32823098142`**
- M4-010 implementation boundary: **ACCEPTED**
- Accepted M4-010 implementation head: `4be1fffc452358acf6a1af4dff5d849ea7868ec8`
- M4-010 acceptance audit: `docs/acceptance/m4-010-acceptance-audit.md`
- M4-010 accepted-head CI: **PASS — CI #351 / run `33036068127`**
- M4-010 accepted-head Harness: **PASS — #293 / run `33036068108`**
- M4-010 acceptance-record head: `1222c9f903e1d6be42633f7e63e8a0d54cbaff2c`
- M4-010 acceptance-record CI: **PASS — CI #352 / run `33036276956`**
- M4-010 acceptance-record Harness: **PASS — #294 / run `33036276974`**
- M4-010 final governance closure: **PENDING THIS GOVERNANCE HEAD DUAL-GREEN**
- M4-011+, M4-020+ and M6: **NOT AUTHORIZED until final M4-010 governance dual-green**

Live GitHub state overrides this file.

## Accepted compatibility baseline

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness APIs/runtime behavior MUST NOT define Core protocol capability semantics,
provider containment, policy/PDP semantics or later classifier fallback policy.

## M4-009 final closure

Final governance head:

```text
d0db84efccad8139b42881a32792e4c75aacfde7
```

- CI #348 / run `32823098144`: PASS;
- Harness #290 / run `32823098142`: PASS.

This formally authorized M4-010.

## M4-010 accepted normative boundary

Normative profile:

```text
specs/0026-m4-builtin-filesystem-tool-classification.md
```

Portable corpus:

```text
fixtures/tool-classifier/builtin-fs-cases.json
```

The protocol-first head is:

```text
dffcc0ef99b445d70cd680bc15df6b1d076e2562
```

It passed:

- CI #349 / run `32942835039`;
- Harness #291 / run `32942835195`.

The classifier is deliberately narrower than authorization. It records a
conservative filesystem effect envelope and an unresolved operand. It does not
create a `CapabilityResource`, resolve provider targets, evaluate policy or
execute tools.

## M4-010 accepted implementation

Accepted implementation head:

```text
4be1fffc452358acf6a1af4dff5d849ea7868ec8
```

Exact built-in rc5 surface covered by this Gate:

```text
read
read_image
write
edit
glob
grep
str_replace_editor
```

The canonical `fs.*` names come from `@dsh-safe/protocol`; the pinned Harness
source supplies compatibility facts about model-facing tool behavior only.

The accepted mappings are conservative pre-provider-state envelopes. In
particular:

- `write` requires both possible `fs.create` and `fs.write` effects;
- `str_replace_editor view` covers stat/read/list because target type is provider
  state;
- `str_replace_editor str_replace|insert` records stat/read/write because pinned
  rc5 implements them through `stat`, `readText` and `writeText`;
- omitted `glob`/`grep` path becomes unresolved `EXECUTION_ROOT`, never a guessed
  `/`, `.`, host cwd or Adapter scope.

## Provider / resource boundary

M4-010 performs no IO and never invokes a provider. Raw accepted paths are copied
without path normalization and remain unresolved operands.

Therefore classification does not prove containment, stable provider identity,
symlink/junction behavior, execution-world identity or resource authorization.
Those responsibilities remain behind the provider-aware enforcement boundary.

`glob` and `grep` are subprocess-backed in pinned rc5. Their M4-010 result records
model-facing filesystem discovery/read authority; it does not claim provider FS
mediation and does not broaden this Gate into M4-011 process/shell classification.

## Fail-closed runtime hardening

The public classifier accepts untrusted `arguments: unknown` and reads only known
own data properties with bounded descriptor inspection.

Accepted tests prove:

- inherited path/command values cannot manufacture authority;
- accessors are rejected without getter execution;
- unrelated accessors and attacker-controlled own-key enumeration are not used;
- symbol-only substitution is rejected;
- arrays fail closed;
- proxy descriptor failures become `FS_TOOL_INPUT_UNREADABLE`;
- unknown exact tools return `NOT_APPLICABLE` without touching hostile arguments;
- accepted classifications are deeply frozen and detached from later caller
  mutation.

`NOT_APPLICABLE` is not allow/deny. Unknown-tool fallback remains M4-013.

## Accepted implementation evidence

At `4be1fffc452358acf6a1af4dff5d849ea7868ec8`:

- normal CI #351 / run `33036068127`: PASS;
- exact Harness rc5 source-conformance #293 / run `33036068108`: PASS;
- frozen install: PASS;
- supply-chain policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- 38 test files / 572 tests: PASS;
- M4-010 classifier suite: 34 PASS;
- M4-009 hot reload: 25 + 3 hardening PASS;
- M4-008 diagnostics: 33 PASS;
- M4-007 explanation: 33 PASS;
- M4-006 default deny: 35 PASS;
- M4-005 effect resolution: 32 PASS;
- M4-004 rule ordering: 19 PASS;
- M4-003 normalization: 38 + 2 PASS;
- M4-002 schema validation: 6 PASS;
- M4-001 loader: 18 PASS;
- oxlint: 0 warnings / 0 errors on 119 files;
- Shared TCK packed artifact + external consumer: 44 assets PASS;
- Harness steps 6–11: PASS.

Initial implementation head `80d29a7a3a4a8b714a29b950181c54fe2cb3eb2e`
passed Harness #292 but CI #350 failed strict TypeScript with TS2307 because the
new broker consumer imported protocol declarations exposed from `dist/` while
workspace typecheck itself is no-emit. This was fixed narrowly by building the
protocol workspace dependency before broker no-emit typecheck. The protocol type
reference was preserved; frozen lockfile, strictness and CI gates were not
changed.

## Acceptance-record verification

Implementation acceptance was recorded on:

```text
1222c9f903e1d6be42633f7e63e8a0d54cbaff2c
```

That head itself reached exact-head dual-green before this governance record was
prepared:

- normal CI #352 / run `33036276956`: PASS;
- exact Harness rc5 source-conformance #294 / run `33036276974`: PASS.

This satisfies the prerequisite for final M4-010 governance. It does not, by
itself, authorize M4-011; the governance head containing the HISTORY/roadmap
closure must also reach exact-head dual-green.

## Current gate

`docs/acceptance/m4-010-acceptance-audit.md` records **M4-010 ACCEPTED AT
IMPLEMENTATION BOUNDARY**.

This governance change is intentionally limited to operational/governance state:

1. append M4-010 acceptance evidence to `docs/handoff/HISTORY.md`;
2. mark only M4-010 accepted in `docs/roadmap.md`;
3. update this handoff snapshot with the verified acceptance-record evidence;
4. make no production code, schema, TCK, dependency, lockfile or security-boundary
   change;
5. require exact-head normal CI + Harness rc5 dual-green on the resulting
   governance commit before authorizing M4-011.

Until this final governance head is dual-green:

```text
M4-010 implementation: ACCEPTED
M4-010 acceptance-record head: DUAL-GREEN
M4-010 governance: PENDING FINAL GOVERNANCE-HEAD DUAL-GREEN
M4-011+: NOT AUTHORIZED
M4-020+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- Specs/schemas/TCK remain semantic authority.
- Harness remains Adapter compatibility evidence only.
- M4-001 through M4-009 remain closed authorities for their accepted concerns.
- M4-010 is filesystem tool classification only.
- Bash/PowerShell classification remains M4-011.
- Known MCP metadata classification remains M4-012.
- Unknown-tool fallback/profile policy remains M4-013.
- Plugin classifier API remains M4-014.
- Subject resolution/full policy evaluation remain M4-020/M4-021.
- Approval remains M4-023.
- Decision receipt/provenance remains M4-024.
- Guarantee assignment remains M4-025.
- Provider-aware containment and execution remain separate enforcement concerns.
- Never weaken schemas, validators, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, compatibility evidence, or
  fail-closed behavior for CI.

## Resume instruction

On the next session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #3 live head/base and exact-head workflows;
3. live GitHub state overrides this snapshot;
4. if this final M4-010 governance head is dual-green, treat M4-010 governance as
   closed and authorize only M4-011 as the next protocol-first Gate;
5. otherwise inspect the exact current-head failure before editing;
6. do not start M4-012+, M4-020+ or M6 early.
