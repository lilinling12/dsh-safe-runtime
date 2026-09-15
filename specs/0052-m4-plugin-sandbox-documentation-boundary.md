# M4-052 — v0.1 Plugin-Sandbox Documentation Boundary Contract

Status: **DRAFT NORMATIVE SPECIFICATION — PROTOCOL-FIRST / NOT ACCEPTED**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-052 P0 — document that v0.1 is not plugin sandbox`  
Conformance profile: `M4-052_PLUGIN_SANDBOX_DOCUMENTATION_BOUNDARY_V1`  
Pinned Harness compatibility baseline: `0.1.0-rc.5` / `47f943859bef60e4160492346772ded9b24f765a`  
Depends on: accepted M4-040/M4-041 ToolRuntime controls, governance-closed M4-050 direct-host negative boundary, governance-closed M4-051 shell-string negative boundary  
Separated from: M6 workspace transaction, M12 network/provider enforcement, M14 process-isolated plugin host, M17 security review, M19 full Security Model / Known Limitations documentation

## 1. Purpose

M4-052 freezes the public security wording required for Capability Broker v0.1:

```text
v0.1 is not a plugin sandbox
```

The statement is a product/security boundary, not a new enforcement mechanism.
It exists to prevent users and maintainers from upgrading tool-level policy,
negative-boundary evidence, or future architecture intent into an isolation
claim that the current implementation does not provide.

A conforming M4-052 implementation MUST make the limitation discoverable without
claiming that documentation itself changes runtime behavior.

## 2. Existing authority

### 2.1 README boundary

The current README already requires:

```text
Tool-level policy MUST NOT be described as isolation of arbitrary in-process plugins.
```

M4-052 strengthens discoverability of that existing rule by requiring an explicit
v0.1 plugin-sandbox non-claim. It MUST NOT weaken or replace the existing
non-negotiable boundary.

### 2.2 Architecture PEP-TOOL boundary

The current architecture states that PEP-TOOL:

- governs only behavior that enters the Tool Pipeline;
- may be bypassed by equivalent shell spellings if string matching is treated as
  nested-effect authority;
- does not constrain a host plugin that directly invokes Node APIs;
- supports a `tool-enforced` guarantee only and MUST NOT be described as
  `process-isolated`.

M4-052 documents these facts; it does not create stronger enforcement.

### 2.3 M4-050 direct-host evidence

M4-050 proves a host-privileged in-process direct Node filesystem mutation can
occur outside the accepted Harness ToolRuntime mediation seams and must be
reported truthfully as `EXPECTED_UNGOVERNED` when the evidence is coherent.

M4-052 MUST retain that negative fact. It MUST NOT describe the current plugin
execution model as filesystem-isolated, process-isolated, host-isolated, or
sandboxed merely because ordinary tool calls are governed.

### 2.4 M4-051 shell-string evidence

M4-051 proves only that raw shell command spelling cannot be the sole authority
for inferred nested effects. Recognized shell calls remain `process.exec`.

M4-052 MUST preserve that distinction. The plugin-sandbox non-claim MUST NOT be
rewritten into the false statement that every shell call is ungoverned.

### 2.5 M14 owns process-isolated plugin hosting

The roadmap explicitly reserves process-isolated plugin hosting for M14, including:

```text
isolated worker
no host environment inheritance
no host cwd access
resource limits
crash isolation
brokered fs/process/network RPC
security milestone converting the direct-fs negative witness toward DENIED
```

M4-052 MUST NOT claim any M14 item is already implemented.

## 3. Required public wording

At minimum, a conforming documentation implementation MUST state, in a
user-discoverable top-level surface, the semantic equivalent of:

```text
DSH Safe Runtime v0.1 is not a sandbox for arbitrary in-process plugins.
```

The wording MAY be editorially improved, but it MUST retain all of these facts:

1. scope is v0.1/current in-process plugin execution;
2. arbitrary in-process plugin code is not process-isolated from the host;
3. tool-policy/ToolRuntime mediation applies only when execution reaches the
   governed seams;
4. direct host APIs can exist outside those seams;
5. future process isolation belongs to a later architecture milestone, currently
   M14;
6. no documentation wording upgrades `tool-enforced` to `process-isolated`.

A vague phrase such as “security is limited” is insufficient.

## 4. Required technical explanation

The architecture-facing documentation MUST keep the following model explicit:

```text
model/tool action
  -> recognized ToolRuntime/tool seam
  -> Capability Broker / guard / approval
  -> tool-enforced boundary
```

is not equivalent to:

```text
arbitrary in-process plugin code
  -> OS/process boundary
  -> all host filesystem/network/process/secret effects brokered
  -> process-isolated sandbox
```

The first model exists in v0.1 for reached seams. The second is not currently
implemented.

## 5. In-process plugin threat boundary

For M4-052 documentation purposes, an **in-process plugin** is code executing in
the same host process/address-space trust domain as the Harness/runtime and able,
subject to ordinary host/OS permissions, to invoke host language/runtime APIs.

This definition is documentation-local. It MUST NOT create a new portable
protocol type or wire enum.

The documentation MUST NOT imply that Capability Broker policy can mediate an
effect it never observes or receives through an accepted PEP/provider seam.

## 6. Guarantee vocabulary integrity

M4-052 MUST preserve existing guarantee semantics.

Allowed factual wording includes:

```text
tool-enforced for reached ToolRuntime controls
EXPECTED_UNGOVERNED for the accepted M4-050 direct-host witness
process-isolated as a future M14 target
```

Forbidden overclaims include:

```text
v0.1 plugins are sandboxed
all plugin effects are governed
all Node APIs are intercepted
tool policy isolates plugin processes
tool-enforced == process-isolated
Capability Broker alone creates OS isolation
M4-051 string matching prevents equivalent nested effects
```

M4-052 does not change any GuaranteeLevel enum.

## 7. Documentation surfaces

The post-protocol documentation implementation MUST remain small.

Required surfaces:

1. `README.md` — concise, prominent product/security non-claim for users who do
   not read the full architecture;
2. `docs/architecture.md` — precise technical explanation tied to PEP-TOOL,
   M4-050/M4-051, and future M14.

M4-052 MUST NOT create a pretend-complete M19 Security Model, Threat Model,
Operator Guide, or Known Limitations system merely to close this Gate.

If a future accepted documentation architecture introduces those canonical
surfaces, later work may migrate the statement without changing this security
meaning.

## 8. Documentation consistency

The repository MUST NOT contain a current v0.1 claim that contradicts the
non-sandbox boundary.

Conformance review MUST distinguish:

- historical text describing future goals;
- accepted guarantee terminology;
- current product claims;
- test/evidence classifications.

A future-roadmap statement such as “可扩展到独立进程 Plugin Host” is not a
current isolation claim when clearly framed as future intent.

## 9. No runtime implementation in this Gate

M4-052 MUST NOT add or change production runtime enforcement.

In particular, it MUST NOT add:

```text
worker/process spawning
Node API monkey patches
module-loader interception
filesystem syscall interception
network namespace/eBPF policy
container sandboxing
seccomp/AppContainer/sandbox-exec rules
host environment scrubbing
brokered plugin RPC
new Capability protocol wire types
new GuaranteeLevel values
```

Those mechanisms require separately accepted architecture and implementation
Gates.

## 10. No false remediation

The documentation MUST NOT recommend unsafe substitutes for process isolation.

The following are not equivalent to a plugin sandbox when used alone:

```text
tool name allowlists
rawCommand substring/regex matchers
JavaScript/TypeScript conventions
README promises
try/catch wrappers
ordinary process user permissions without a defined isolation profile
```

M4-052 records the limitation rather than hiding it behind a lexical or social
control.

## 11. Relationship to M6

M6 owns workspace transaction semantics, including a shadow execution world and
subprocess filesystem rollback behavior.

Even after M6, workspace transactionality is not automatically equivalent to a
plugin sandbox. M4-052 MUST NOT promise that future rollback alone isolates all
host process/network/secret effects.

## 12. Relationship to M12

M12 owns provider/network broker enforcement. Network policy that applies only to
brokered traffic does not, by itself, make arbitrary same-process plugin code a
sandboxed workload.

M4-052 MUST NOT pre-claim M12 network isolation.

## 13. Relationship to M14

M14 is the explicit security milestone for a process-isolated Plugin Host.

M4-052 documentation SHOULD point readers to M14 as the future boundary without
promising an implementation date or treating roadmap intent as accepted runtime
evidence.

The present truthful progression is:

```text
v0.1 reached ToolRuntime controls
  + explicit negative boundaries
  + honest non-sandbox documentation
  -> later M14 isolated plugin host
```

## 14. Required repository/source audit

Conformance MUST establish at least these repository facts:

1. README already rejects describing tool policy as arbitrary in-process plugin
   isolation;
2. architecture PEP-TOOL limits governance to Tool Pipeline behavior;
3. architecture states direct host Plugin Node APIs are outside that boundary;
4. architecture refuses `process-isolated` for PEP-TOOL;
5. M4-050 accepted evidence proves the direct-host filesystem negative boundary;
6. M4-051 accepted evidence proves only lexical nested-effect matcher
   incompleteness while retaining `process.exec`;
7. roadmap M14 remains future/unimplemented;
8. no production isolation change is included in M4-052.

Static repository review is sufficient for the documentation-specific claims;
M4-052 MUST NOT fabricate a new runtime witness when M4-050/M4-051 already own
the relevant executable negative evidence.

## 15. Pinned Harness boundary

Harness rc5 evidence remains compatibility evidence for concrete ToolRuntime
control-flow claims only.

M4-052 MUST NOT claim the pinned Harness source provides process isolation unless
an explicit future accepted contract proves that fact. The current pin remains:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

## 16. Conformance corpus

Language-neutral requirement corpus:

```text
fixtures/plugin-sandbox-documentation-boundary/cases.json
```

Profile:

```text
M4-052_PLUGIN_SANDBOX_DOCUMENTATION_BOUNDARY_V1
```

The corpus MUST cover:

- explicit v0.1 not-a-plugin-sandbox statement;
- in-process plugin scope;
- reached ToolRuntime versus arbitrary host API distinction;
- `tool-enforced` versus `process-isolated` distinction;
- M4-050 direct-host negative evidence retained;
- M4-051 shell-string boundary retained;
- future M14 ownership;
- README discoverability;
- architecture technical explanation;
- no production isolation implementation;
- no new protocol/schema/GuaranteeLevel vocabulary;
- no M6/M12/M14 premature claims;
- no claim that documentation changes runtime security;
- PR and later-Gate governance separation.

## 17. Acceptance sequence

M4-052 follows protocol-first governance:

1. publish this Spec, its requirement corpus, and CURRENT candidate state only;
2. require normal CI + exact pinned Harness rc5 source-conformance dual-green on
   that exact protocol-first head;
3. only then modify the minimum approved documentation surfaces and add the
   smallest repository/source-conformance evidence needed to bind the corpus;
4. verify no production/runtime/schema/dependency/lockfile change occurred;
5. publish an acceptance audit;
6. perform governance transition and closure only after their own exact-head
   dual-green evidence.

## 18. Explicit non-goals

M4-052 does not:

- implement a plugin sandbox;
- implement process isolation;
- intercept arbitrary Node/host APIs;
- implement provider-aware filesystem/process/network enforcement;
- implement M6 transactionality;
- implement M12 network isolation;
- implement M14 worker/RPC/supervisor/OS backends;
- complete M17 threat-model/security-review work;
- complete M19 Security Model or Known Limitations documentation;
- alter Capability protocol, Schema, TCK, GuaranteeLevel or policy semantics;
- authorize PR #3 merge;
- authorize later Gates.

## 19. Protocol-first delta boundary

The protocol-first repository delta for M4-052 is restricted to exactly:

```text
specs/0052-m4-plugin-sandbox-documentation-boundary.md
fixtures/plugin-sandbox-documentation-boundary/cases.json
docs/handoff/CURRENT.md
```

Before this exact candidate head is dual-green, M4-052 MUST NOT modify README,
architecture wording, production code, source-conformance tests, dependencies,
lockfiles, schemas, Shared TCK, HISTORY, roadmap acceptance marker, workflows, or
later-Gate artifacts.
