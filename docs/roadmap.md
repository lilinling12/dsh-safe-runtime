# DSH Safe Runtime — Detailed Implementation TODO & Roadmap

> 版本：v0.1 planning baseline  
> 原则：先协议、后 Schema、再 TCK、再 Reference Runtime；不通过削弱规则来满足 CI。

---

# 1. 优先级

```text
P0 = 阻塞后续架构或安全正确性
P1 = Beta 必须
P2 = Ready/生产增强
P3 = 长期
```

状态：

```text
TODO
IN_PROGRESS
BLOCKED
REVIEW
DONE
```

每个 Epic 必须有：

```text
Spec
Schema
Fixtures
TCK
Implementation
Docs
Acceptance evidence
```

---

# M0 — Repository / Governance Foundation

目标：建立不会被后续实现反向污染的治理基础。

## M0.1 Repository

- [ ] `M0-001 P0` 创建 `dsh-safe-runtime` monorepo。 **IN_PROGRESS：结构/License 已完成；等待联网环境生成并提交 pnpm lockfile 后完成 fresh-clone gate。**
  - 输出：根目录、workspace config、license、CODEOWNERS。
  - 验收：fresh clone 可安装、构建、测试。

- [x] `M0-002 P0` 建立 package boundary。
  - `protocol`
  - `adapter-dsh`
  - `policy-engine`
  - `capability-broker`
  - `workspace-tx`
  - `acceptance-engine`
  - `avp-bridge`
  - `testkit`

- [x] `M0-003 P0` 建立规范目录：
  ```text
  specs/
  schemas/
  fixtures/
  rfcs/
  adrs/
  ```

- [x] `M0-004 P0` 引入 Architecture Rule：
  - `protocol` 禁止依赖 `@deepseek-ai/*`；
  - Core package 不得 import `adapter-dsh` 的 concrete types；
  - Adapter 可依赖 Protocol，反向禁止。

- [ ] `M0-005 P1` 建立 changeset / release note 机制。

## M0.2 Governance

- [x] `M0-010 P0` 定义 maturity：
  ```text
  DRAFT → SPECIFIED → SCHEMA_COMPLETE → TCK_COMPLETE →
  REFERENCE_IMPLEMENTED → ACCEPTANCE_AUDITED → READY
  ```

- [x] `M0-011 P0` 写 `CONTRIBUTING.md`。
- [x] `M0-012 P0` 写 RFC/AEP 模板。
- [x] `M0-013 P0` 写 ADR 模板。
- [x] `M0-014 P0` 规定 Normative Change 必须同步：
  - spec
  - schema
  - fixtures
  - tck
  - changelog

- [x] `M0-015 P0` CI 添加 “implementation must not redefine spec” 检查流程文档。

### M0 DoD

- [ ] Repo fresh clone build green（等待联网 bootstrap + lockfile）。
- [x] Package layering 静态检查有效。
- [x] Normative workflow 有文档。
- [x] 不存在 Harness 类型泄漏到 protocol。

---

# M1 — Normative Protocol + JSON Schema

目标：在实现前冻结 v0.1 领域语义。

## M1.1 Capability

- [x] `M1-001 P0` 定义 `Subject` schema。
- [x] `M1-002 P0` 定义 `CapabilityResource` schema。
- [x] `M1-003 P0` 定义标准 capability namespace。
- [x] `M1-004 P0` 定义 `CapabilityRequest`。
- [x] `M1-005 P0` 定义 `CapabilityDecision`。
- [x] `M1-006 P0` 定义 `CapabilityLease`。
- [x] `M1-007 P0` 定义 `CapabilityReceipt`。
- [x] `M1-008 P0` 定义 `GuaranteeLevel`。
- [x] `M1-009 P0` 定义 delegation attenuation。
- [x] `M1-010 P0` 定义 conflict/precedence。
- [x] `M1-011 P0` 定义 default-deny。
- [x] `M1-012 P0` 定义 approval fail-closed mapping。

## M1.2 Transaction

- [x] `M1-020 P0` 定义 `WorkspaceTransaction`。
- [x] `M1-021 P0` 定义状态机。
- [x] `M1-022 P0` 定义 `FileDelta`。
- [x] `M1-023 P0` 定义 `CommitPlan`。
- [x] `M1-024 P0` 定义 `CommitResult`。
- [x] `M1-025 P0` 定义 `RecoveryRecord`。
- [x] `M1-026 P0` 定义 external effect classification。
- [x] `M1-027 P0` 明确 v1 rollback scope 仅 workspace filesystem。

## M1.3 Acceptance

- [x] `M1-030 P0` 定义 `AcceptanceContract`。
- [x] `M1-031 P0` 定义 check type registry。
- [x] `M1-032 P0` 定义 `CheckResult`。
- [x] `M1-033 P0` 定义 retry/steer budget。
- [x] `M1-034 P0` 定义 Verdict enum。
- [x] `M1-035 P0` 定义 `BLOCKED` 与 `ERROR` 区别。

## M1.4 Evidence

- [x] `M1-040 P0` 定义 Claim。
- [x] `M1-041 P0` 定义 Evidence。
- [x] `M1-042 P0` 定义 EvidenceRef。
- [x] `M1-043 P0` 定义 canonical digest。
- [x] `M1-044 P0` 定义 tamper behavior。
- [x] `M1-045 P0` 定义 privacy/redaction profile。
- [x] `M1-046 P0` 定义 `claim → evidence → check → verdict` 关系。

## M1.5 Schemas

- [x] `M1-050 P0` Draft 2020-12 schemas。
- [x] `M1-051 P0` `additionalProperties: false` 用于关键协议对象。
- [x] `M1-052 P0` 提供 valid/invalid fixtures。
- [x] `M1-053 P0` Schema lint。
- [x] `M1-054 P0` Schema compatibility check。

### M1 DoD

- [ ] Spec Review 完成。
- [x] 所有 P0 Schema 有 positive/negative fixture。
- [x] 没有 Reference Implementation 才能理解的隐式规则。
- [x] Protocol 可被非 TypeScript 实现。

---

# M2 — Harness Adapter Baseline

目标：让后续核心不直接依赖 Harness RC。

状态：**ACCEPTED — P0 COMPLETE**。权威验收记录见 `docs/acceptance/m2-acceptance-audit.md`；P1 延后项保持未勾选，不因里程碑验收而伪装为已实现。

## M2.1 Current Harness Recon

- [x] `M2-001 P0` 固定首个 tested Harness commit / package range。
- [x] `M2-002 P0` 记录：
  - turn flow；
  - tool pipeline；
  - approval semantics；
  - fs target/version；
  - subprocess same-world；
  - sandbox enforcement；
  - subagent/workflow seams。

- [x] `M2-003 P0` 建立 Feature Matrix。

## M2.2 Runtime Event Mapping

- [x] `M2-010 P0` `turn/start → turn.started`。
- [x] `M2-011 P0` `step/start → step.started`。**Spec 0003 的 M2 minimum vocabulary 不定义 `step.ended`，不得凭规划文字额外发明。**
- [x] `M2-012 P0` `tool/call → tool.requested`。
- [x] `M2-013 P0` `tools/result → tool.completed`。
- [x] `M2-014 P0` approval mapping。
- [x] `M2-015 P0` `agent/request-error` mapping。
- [x] `M2-016 P0` `agent/turn-stopping → completion.requested`。
- [ ] `M2-017 P1` subagent lineage mapping。 **DEFERRED：M2 仅完成 exact-source reconnaissance，不把 Harness lineage 直接提升为 portable protocol 语义。**

## M2.3 Adapter Ports

- [x] `M2-020 P0` Tool policy registration port。
- [x] `M2-021 P0` Approval port。
- [x] `M2-022 P0` Completion steering port。
- [x] `M2-023 P0` FS port。
- [x] `M2-024 P0` Subprocess port。
- [ ] `M2-025 P1` Sandbox metadata port。 **DEFERRED/PARTIAL：provider facts 已记录，但不推导更强 sandbox guarantee。**

## M2.4 Sidecar

- [x] `M2-030 P0` 不依赖 custom durable SessionEvent。
- [x] `M2-031 P0` 建 Sidecar correlation。
- [x] `M2-032 P0` Session event ref/digest。
- [ ] `M2-033 P1` Replay reconciliation。 **DEFERRED。**

### M2 DoD

- [x] 首个 accepted Harness baseline (`0.1.0-rc.5`) exact-source adapter gate green。**当前不存在更早的 accepted baseline；一旦后续接受新 baseline，current + previous supported baseline 必须同时保持 green。**
- [x] Feature 缺失可明确 fail。
- [x] Core 不 import Harness concrete event。
- [x] M2 adapter/source-conformance ordering evidence green。**language-neutral Event Order TCK 属于 M3，不回填伪造成 M2 deliverable。**

---

# M3 — Shared TCK Foundation

目标：先验证语义，再开始复杂 Runtime。

状态：**ACCEPTED**。权威验收记录见 `docs/acceptance/m3-acceptance-audit.md`；验收以 portable specs/schemas/fixtures、独立可打包 TCK、外部非 workspace consumer 和 exact-head CI/compatibility evidence为依据，不以 Harness 作为协议权威。

## M3.1 Test Harness

- [x] `M3-001 P0` language-independent fixture format。
- [x] `M3-002 P0` test runner contract。
- [x] `M3-003 P0` deterministic seed/time。
- [x] `M3-004 P0` fake approval。 **DONE：Spec 0005 + portable fixtures + deterministic TypeScript projection；head `cc59a5db...` CI #79 PASS。**
- [x] `M3-005 P0` fake tool runtime。 **DONE：Spec 0006 + portable RESULT/ERROR/DENIED fixtures + deterministic TypeScript projection；head `d5cc3415...` CI #81 PASS。**
- [x] `M3-006 P0` fake fs/subprocess。 **DONE：Spec 0007 + portable explicit-fact fixtures + deterministic fake execution world；head `de5d4e0c...` CI #86 PASS（81 tests，oxlint 0/0）。**
- [x] `M3-007 P0` fault injection interface。 **DONE：Spec 0008 + portable deterministic probe/directive fixtures + TypeScript projection；head `494e08de...` CI #91 PASS（89 tests，oxlint 0/0）。**

## M3.2 Adapter TCK

- [x] `M3-010 P0` turn lifecycle。 **DONE：Spec 0009 + 5 portable ADAPTER_DSH fixtures + generic evaluator + adapter projection + exact rc5 runtime conformance；head `728f44e...` CI #99 PASS / source-conformance #58 PASS（115 tests，oxlint 0/0）。**
- [x] `M3-011 P0` tool ordering。
- [x] `M3-012 P0` denied call never enters body。
- [x] `M3-013 P0` final result mapping。
- [x] `M3-014 P0` approval unavailable。
- [x] `M3-015 P0` cancellation。
- [x] `M3-016 P0` disposal。
- [x] `M3-017 P1` replay reconciliation。

### M3 DoD

- [x] TCK 可单独发布。
- [x] Reference Runtime 之外的 dummy implementation 能运行。
- [x] Fixture 不包含 TypeScript-only 语义。

最终验收 remediation implementation head：`e6522a18760268b56b09f9ac5d9c822671c41666`；normal CI #218 与 exact Harness rc5 source-conformance #177 均 PASS。下一个且唯一新授权的工程 Gate 是 `M4-001 P0`，仍须 protocol/spec-first。

---

# M4 — Capability Broker v0.1

目标：实现诚实的 `tool-enforced` Capability Broker。

## M4.1 Policy Engine

- [x] `M4-001 P0` YAML/JSON loader。 **ACCEPTED：Spec 0017 + portable fixtures + bounded duplicate-aware JSON/YAML loader；accepted implementation head `9443d907...`，CI #248 / Harness #192 PASS；验收记录 `docs/acceptance/m4-001-acceptance-audit.md`。**
- [ ] `M4-002 P0` schema validation。
- [ ] `M4-003 P0` canonical resource normalization。
- [ ] `M4-004 P0` deterministic rule ordering。
- [ ] `M4-005 P0` deny/ask/allow。
- [ ] `M4-006 P0` default deny。
- [ ] `M4-007 P0` explain API。
- [ ] `M4-008 P1` policy diagnostics。
- [ ] `M4-009 P1` policy hot reload with atomic swap。

## M4.2 Tool Classifier

- [ ] `M4-010 P0` classify built-in FS tools。
- [ ] `M4-011 P0` classify Bash/PowerShell。
- [ ] `M4-012 P0` classify known MCP metadata。
- [ ] `M4-013 P0` unknown tool → fail closed/profile decision。
- [ ] `M4-014 P1` plugin-supplied classifier API。

## M4.3 PDP

- [ ] `M4-020 P0` Subject resolution。
- [ ] `M4-021 P0` policy evaluation。
- [ ] `M4-022 P0` lease lookup。
- [ ] `M4-023 P0` approval routing。
- [ ] `M4-024 P0` decision receipt。
- [ ] `M4-025 P0` guarantee level。

## M4.4 Lease

- [ ] `M4-030 P0` TTL。
- [ ] `M4-031 P0` maxUses。
- [ ] `M4-032 P0` atomic consume。
- [ ] `M4-033 P0` revoke。
- [ ] `M4-034 P0` parent-child attenuation。
- [ ] `M4-035 P1` lease listing CLI。
- [ ] `M4-036 P1` revoke CLI。

## M4.5 DSH Plugin

- [ ] `M4-040 P0` register `tools/pre-execute`。
- [ ] `M4-041 P0` use `ctx.tools.guard()` for hard invariant where required。
- [ ] `M4-042 P0` route ask to `ctx.approval`。
- [ ] `M4-043 P0` observe authoritative `tools/result`。
- [ ] `M4-044 P0` no duplicate approval subsystem。
- [ ] `M4-045 P0` no raw secret in audit。

## M4.6 Negative Boundary Tests

- [ ] `M4-050 P0` direct Node fs bypass → `EXPECTED_UNGOVERNED`。
- [ ] `M4-051 P0` equivalent shell spelling bypass string matcher test。
- [ ] `M4-052 P0` document that v0.1 is not plugin sandbox。

### M4 DoD

- [ ] default deny verified。
- [ ] approval unavailable verified deny。
- [ ] lease expiry/maxUse tested。
- [ ] child cannot amplify。
- [ ] action rewrite after decision rejected/re-evaluated。
- [ ] audit redaction tested。
- [ ] security boundary documented without overclaim。

---

# M5 — Audit Ledger + Privacy

## M5.1 Ledger

- [ ] `M5-001 P0` append-only store。
- [ ] `M5-002 P0` canonical JSON。
- [ ] `M5-003 P0` record digest。
- [ ] `M5-004 P1` hash chain。
- [ ] `M5-005 P1` integrity verify CLI。

## M5.2 Redaction

- [ ] `M5-010 P0` secret detector interface。
- [ ] `M5-011 P0` env redaction。
- [ ] `M5-012 P0` args/result digest by default。
- [ ] `M5-013 P0` source content opt-in。
- [ ] `M5-014 P1` retention TTL。
- [ ] `M5-015 P1` delete/export workflow。

## M5.3 Failure

- [ ] `M5-020 P0` audit store unavailable policy。
- [ ] `M5-021 P1` durable local spool。
- [ ] `M5-022 P1` spool reconciliation。

---

# M6 — Workspace Transaction v0.1

目标：真正覆盖 Shell 写入的 Workspace Filesystem Transaction。

## M6.1 Coordinator

- [ ] `M6-001 P0` transaction state machine。
- [ ] `M6-002 P0` begin。
- [ ] `M6-003 P0` verify transition。
- [ ] `M6-004 P0` commit transition。
- [ ] `M6-005 P0` rollback transition。
- [ ] `M6-006 P0` crash recovery state。

## M6.2 Portable Shadow Backend

- [ ] `M6-010 P0` workspace inventory。
- [ ] `M6-011 P0` explicit workspace limit。
- [ ] `M6-012 P0` safe copy。
- [ ] `M6-013 P0` preserve required metadata。
- [ ] `M6-014 P0` ignore unsafe sockets/devices。
- [ ] `M6-015 P0` temp owner-only permission。
- [ ] `M6-016 P1` reflink detection。
- [ ] `M6-017 P1` optimized copy strategy。

## M6.3 Transaction FS Provider

- [ ] `M6-020 P0` resolve。
- [ ] `M6-021 P0` processPath。
- [ ] `M6-022 P0` contains。
- [ ] `M6-023 P0` stat/lstat。
- [ ] `M6-024 P0` read/list。
- [ ] `M6-025 P0` write/edit。
- [ ] `M6-026 P0` create/delete。
- [ ] `M6-027 P1` move。
- [ ] `M6-028 P0` all mutation stays shadow-side。

## M6.4 Transaction Subprocess

- [ ] `M6-030 P0` cwd points to tx world。
- [ ] `M6-031 P0` resolve executable safely。
- [ ] `M6-032 P0` env scrubbing。
- [ ] `M6-033 P0` process tree termination。
- [ ] `M6-034 P0` shell redirection test。
- [ ] `M6-035 P0` build/codegen mutation test。

## M6.5 Path Security

- [ ] `M6-040 P0` `../` escape。
- [ ] `M6-041 P0` symlink outside workspace。
- [ ] `M6-042 P0` junction/reparse-point Windows。
- [ ] `M6-043 P0` case-insensitive path alias。
- [ ] `M6-044 P1` hardlink edge cases。
- [ ] `M6-045 P0` no string-prefix containment。

## M6.6 Diff

- [ ] `M6-050 P0` create。
- [ ] `M6-051 P0` modify。
- [ ] `M6-052 P0` delete。
- [ ] `M6-053 P0` binary bounded behavior。
- [ ] `M6-054 P0` stable ordering。
- [ ] `M6-055 P1` rename detection optional。

### M6 DoD

- [ ] Shell 写入可 rollback。
- [ ] Delete 可 rollback。
- [ ] Host workspace 在 tx active 时不变。
- [ ] Subprocess 只看到 tx workspace。
- [ ] path escape TCK green。
- [ ] large workspace 会 fail loud，不静默退化。

---

# M7 — Commit / Rollback / Recovery

## M7.1 Base Version Capture

- [ ] `M7-001 P0` capture opaque host version。
- [ ] `M7-002 P0` capture existence。
- [ ] `M7-003 P0` capture digest。
- [ ] `M7-004 P0` no interpretation of opaque version。

## M7.2 Commit Plan

- [ ] `M7-010 P0` deterministic plan。
- [ ] `M7-011 P0` validate scope。
- [ ] `M7-012 P0` validate forbidden paths。
- [ ] `M7-013 P0` verify current host version。
- [ ] `M7-014 P0` stale → conflict。

## M7.3 Journal

- [ ] `M7-020 P0` fsync journal before host mutation。
- [ ] `M7-021 P0` sequence/checksum。
- [ ] `M7-022 P0` backup record。
- [ ] `M7-023 P0` per-target apply state。
- [ ] `M7-024 P0` finalization marker。

## M7.4 Apply

- [ ] `M7-030 P0` atomic single-file replacement。
- [ ] `M7-031 P0` safe create。
- [ ] `M7-032 P0` safe delete。
- [ ] `M7-033 P0` permission handling。
- [ ] `M7-034 P1` file timestamp policy。

## M7.5 Fault Injection

- [ ] `M7-040 P0` crash before journal。
- [ ] `M7-041 P0` crash after journal。
- [ ] `M7-042 P0` crash after first file。
- [ ] `M7-043 P0` disk full。
- [ ] `M7-044 P0` permission denied。
- [ ] `M7-045 P0` host edit during commit。
- [ ] `M7-046 P0` recovery idempotency。

### M7 DoD

- [ ] no silent half-commit。
- [ ] all crash points produce deterministic recovery。
- [ ] conflict never overwrites human edit。
- [ ] product docs use “crash-recoverable”，不使用虚假 global atomic。

---

# M8 — Acceptance Engine v0.1

## M8.1 Contract

- [ ] `M8-001 P0` load/validate YAML/JSON。
- [ ] `M8-002 P0` stable contract digest。
- [ ] `M8-003 P0` required/optional check。
- [ ] `M8-004 P0` retry budget。

## M8.2 Check Registry

- [ ] `M8-010 P0` command。
- [ ] `M8-011 P0` workspace-diff。
- [ ] `M8-012 P0` file-exists。
- [ ] `M8-013 P0` file-absent。
- [ ] `M8-014 P0` content-rule。
- [ ] `M8-015 P0` no-secret-added。
- [ ] `M8-016 P0` required-evidence。

## M8.3 Command Runner

- [ ] `M8-020 P0` via transactional subprocess。
- [ ] `M8-021 P0` via capability broker。
- [ ] `M8-022 P0` timeout。
- [ ] `M8-023 P0` output bound。
- [ ] `M8-024 P0` exit classification。
- [ ] `M8-025 P0` evidence digest。

## M8.4 Freshness

- [ ] `M8-030 P0` tx/workspace digest binding。
- [ ] `M8-031 P0` stale check result invalidation。
- [ ] `M8-032 P1` cache only with explicit freshness key。

## M8.5 Completion Gate

- [ ] `M8-040 P0` integrate `agent/turn-stopping`。
- [ ] `M8-041 P0` required fail → steer。
- [ ] `M8-042 P0` max retry。
- [ ] `M8-043 P0` exhausted → BLOCKED/FAILED。
- [ ] `M8-044 P0` no infinite loop。
- [ ] `M8-045 P0` user cancel。

### M8 DoD

- [ ] agent text cannot override failed check。
- [ ] acceptance command denied → BLOCKED/ERROR。
- [ ] missing evidence → INCOMPLETE。
- [ ] all required pass → VERIFIED。

---

# M9 — AVP / Evidence Bridge

## M9.1 Ledger

- [ ] `M9-001 P0` Episode。
- [ ] `M9-002 P0` Claim。
- [ ] `M9-003 P0` Evidence。
- [ ] `M9-004 P0` Check。
- [ ] `M9-005 P0` Verdict。
- [ ] `M9-006 P0` Proof Bundle。

## M9.2 Harness Mapping

- [ ] `M9-010 P0` tool intent。
- [ ] `M9-011 P0` authoritative tool outcome。
- [ ] `M9-012 P0` approval。
- [ ] `M9-013 P0` fs mutations。
- [ ] `M9-014 P0` tx state。
- [ ] `M9-015 P0` acceptance result。
- [ ] `M9-016 P1` subagent lineage。

## M9.3 False Success

- [ ] `M9-020 P0` success claim + failed command。
- [ ] `M9-021 P0` success claim + missing required check。
- [ ] `M9-022 P0` stale test result。
- [ ] `M9-023 P0` tampered evidence。
- [ ] `M9-024 P0` same evidence → same deterministic verdict。

## M9.4 Privacy

- [ ] `M9-030 P0` default digest only。
- [ ] `M9-031 P0` raw blob opt-in。
- [ ] `M9-032 P0` secret never raw。
- [ ] `M9-033 P1` proof export policy。

---

# M10 — Integrated Safe Runtime Beta

目标：形成用户可用的一体化路径。

## M10.1 Orchestration

- [ ] `M10-001 P0` Capability → Tx → Acceptance → Commit。
- [ ] `M10-002 P0` Deny → no mutation。
- [ ] `M10-003 P0` Verify Fail → rollback。
- [ ] `M10-004 P0` Verify Pass → explicit commit。
- [ ] `M10-005 P1` configurable auto-commit after verified。
- [ ] `M10-006 P0` external effect before verify blocked by default。

## M10.2 CLI

- [ ] `M10-010 P1` doctor。
- [ ] `M10-011 P1` policy validate/explain。
- [ ] `M10-012 P1` lease list/revoke。
- [ ] `M10-013 P1` tx inspect/diff。
- [ ] `M10-014 P1` tx commit/rollback。
- [ ] `M10-015 P1` tx recover。
- [ ] `M10-016 P1` evidence verify。
- [ ] `M10-017 P1` compatibility。

## M10.3 Example

- [ ] `M10-020 P0` demo repo。
- [ ] `M10-021 P0` demo：Agent 尝试修改源码。
- [ ] `M10-022 P0` demo：Approval Lease。
- [ ] `M10-023 P0` demo：测试失败自动 rollback。
- [ ] `M10-024 P0` demo：测试通过 commit。
- [ ] `M10-025 P0` demo：人类并发编辑 → commit conflict。
- [ ] `M10-026 P0` demo：Agent 声称成功但 test failed → false-success verdict。

---

# M11 — Provider-aware Enforcement

## M11.1 FS PEP

- [ ] `M11-001 P0` canonical target policy。
- [ ] `M11-002 P0` fs.read/write/delete enforcement。
- [ ] `M11-003 P0` resource containment。
- [ ] `M11-004 P0` Guarantee = provider-enforced。

## M11.2 Process PEP

- [ ] `M11-010 P0` executable canonicalization。
- [ ] `M11-011 P0` cwd scope。
- [ ] `M11-012 P0` env ref。
- [ ] `M11-013 P0` signal/terminal capabilities。
- [ ] `M11-014 P0` no unclassified spawn。

## M11.3 Sandbox Composition

- [ ] `M11-020 P0` sandbox enforcement full/partial exposed。
- [ ] `M11-021 P0` required-full deployment rejects partial。
- [ ] `M11-022 P0` network not misreported as sandboxed。

---

# M12 — Secret + Network Broker

## M12.1 Secret

- [ ] `M12-001 P0` SecretRef。
- [ ] `M12-002 P0` secret.use。
- [ ] `M12-003 P0` secret.reveal separate。
- [ ] `M12-004 P0` provider injection。
- [ ] `M12-005 P0` audit no raw values。
- [ ] `M12-006 P1` Vault/KMS adapter。

## M12.2 Network

- [ ] `M12-010 P0` HTTP proxy PEP。
- [ ] `M12-011 P0` host allowlist。
- [ ] `M12-012 P0` method policy。
- [ ] `M12-013 P0` path/resource policy。
- [ ] `M12-014 P0` credential injection。
- [ ] `M12-015 P0` request/response digest。
- [ ] `M12-016 P1` DNS policy。
- [ ] `M12-017 P1` egress deny profile。

---

# M13 — Subagent / Workflow

- [ ] `M13-001 P0` child subject identity。
- [ ] `M13-002 P0` attenuation。
- [ ] `M13-003 P0` parent lease reference。
- [ ] `M13-004 P0` evidence lineage。
- [ ] `M13-005 P1` shared tx mode。
- [ ] `M13-006 P1` child branch tx mode。
- [ ] `M13-007 P1` merge verified child transaction。
- [ ] `M13-008 P1` workflow propagation。
- [ ] `M13-009 P0` child cannot access undelegated secret/network。

---

# M14 — Process-isolated Plugin Host

长期安全里程碑，不要提前宣称完成。

## M14.1 RPC Contract

- [ ] `M14-001 P0` plugin manifest。
- [ ] `M14-002 P0` requested capabilities。
- [ ] `M14-003 P0` delegated capability tokens。
- [ ] `M14-004 P0` brokered fs RPC。
- [ ] `M14-005 P0` brokered process RPC。
- [ ] `M14-006 P0` brokered network RPC。
- [ ] `M14-007 P0` secret refs only。

## M14.2 Host Supervisor

- [ ] `M14-010 P0` spawn isolated worker。
- [ ] `M14-011 P0` no host env inheritance。
- [ ] `M14-012 P0` no host cwd access。
- [ ] `M14-013 P0` resource limits。
- [ ] `M14-014 P0` kill/join。
- [ ] `M14-015 P0` crash isolation。
- [ ] `M14-016 P0` protocol version negotiation。

## M14.3 OS Backends

- [ ] `M14-020 P1` Linux。
- [ ] `M14-021 P2` macOS。
- [ ] `M14-022 P2` Windows。
- [ ] `M14-023 P2` remote/container backend。

## M14.4 Security Milestone

- [ ] `M14-030 P0` previous `EXPECTED_UNGOVERNED` direct-fs test becomes `DENIED`。
- [ ] `M14-031 P0` default deny network。
- [ ] `M14-032 P0` no secret exfil。
- [ ] `M14-033 P0` process boundary audit。

---

# M15 — Enterprise / HA

- [ ] `M15-001 P1` PostgreSQL storage adapter。
- [ ] `M15-002 P1` object store blob adapter。
- [ ] `M15-003 P1` KMS encryption。
- [ ] `M15-004 P1` signed policy bundles。
- [ ] `M15-005 P1` central policy distribution。
- [ ] `M15-006 P1` tenant isolation。
- [ ] `M15-007 P1` external WORM audit sink。
- [ ] `M15-008 P1` OTel metrics。
- [ ] `M15-009 P1` audit retention。
- [ ] `M15-010 P1` backup/restore。
- [ ] `M15-011 P1` disaster recovery。
- [ ] `M15-012 P2` multi-node lease coordination。
- [ ] `M15-013 P2` policy cache with revocation。

---

# M16 — Cross-platform Hardening

- [ ] Linux path/case/symlink tests。
- [ ] macOS case-insensitive filesystem tests。
- [ ] Windows NTFS junction/reparse tests。
- [ ] Long path tests。
- [ ] Unicode normalization tests。
- [ ] file permission tests。
- [ ] executable resolution tests。
- [ ] process tree termination tests。
- [ ] binary/large file boundaries。
- [ ] antivirus/file-lock conflict Windows。
- [ ] filesystem partial failure injection。

---

# M17 — Security Review

- [ ] STRIDE/LINDDUN threat model。
- [ ] abuse-case catalog。
- [ ] prompt-injection test corpus。
- [ ] MCP malicious tool test。
- [ ] malicious repository config test。
- [ ] path traversal fuzz。
- [ ] policy parser fuzz。
- [ ] capability normalization fuzz。
- [ ] lease replay attack。
- [ ] evidence tamper attack。
- [ ] hash-chain break test。
- [ ] crash journal corruption test。
- [ ] external-effect bypass audit。
- [ ] secret leak scan。
- [ ] dependency/SBOM/provenance。

---

# M18 — Performance

只在语义正确后优化。

- [ ] policy matcher benchmark。
- [ ] lease CAS benchmark。
- [ ] audit append benchmark。
- [ ] shadow prepare benchmark。
- [ ] reflink backend。
- [ ] Linux overlay backend。
- [ ] large monorepo diff benchmark。
- [ ] parallel session test。
- [ ] process-heavy workload test。
- [ ] evidence digest streaming。
- [ ] avoid loading full large files where unnecessary。

性能优化不得绕开 canonical identity、audit、transaction 或 verification。

---

# M19 — Documentation

- [ ] Architecture。
- [ ] Protocol。
- [ ] Security Model。
- [ ] Threat Model。
- [ ] Operator Guide。
- [ ] Developer Guide。
- [ ] Policy Cookbook。
- [ ] Acceptance Cookbook。
- [ ] Recovery Runbook。
- [ ] Compatibility Matrix。
- [ ] Known Limitations。
- [ ] Guarantee Levels。
- [ ] FAQ：为什么不是 Zero Trust v0.1。
- [ ] FAQ：为什么不等于 Git。
- [ ] FAQ：为什么 database/API 不能自动 rollback。

---

# M20 — Release Gates

## Alpha

必须：

- [ ] M0-M4 关键 P0。
- [ ] Adapter TCK。
- [ ] Capability Broker boundary honest。
- [ ] no silent allow。

## Beta

必须：

- [ ] Workspace TX。
- [ ] Commit conflict。
- [ ] Crash recovery。
- [ ] Acceptance。
- [ ] Evidence。
- [ ] integrated demo。

## RC

必须：

- [ ] cross-platform matrix。
- [ ] security review。
- [ ] privacy review。
- [ ] compatibility tests。
- [ ] operator recovery drills。

## Ready

必须：

- [ ] all normative P0 TCK。
- [ ] acceptance audit。
- [ ] release reproducibility。
- [ ] SBOM/provenance。
- [ ] no known silent bypass in claimed guarantee level。
- [ ] all known weaker boundaries documented。

---

# 建议执行顺序

```text
Phase 0
M0 Governance
M1 Protocol
M2 Adapter
M3 TCK

Phase 1
M4 Capability Broker
M5 Audit/Privacy

Phase 2
M6 Workspace TX
M7 Commit/Recovery

Phase 3
M8 Acceptance
M9 AVP Evidence
M10 Integrated Beta

Phase 4
M11 Provider Enforcement
M12 Secret/Network
M13 Subagent/Workflow

Phase 5
M14 Isolated Plugin Host
M15 Enterprise
M16-M20 Hardening/Ready
```

---

# 最先应该实际编码的 20 个任务

如果今天开始实现，严格按以下顺序：

1. [ ] 建 monorepo/package boundary。
2. [ ] 固化 Protocol v0.1 types。
3. [ ] 建 JSON Schemas。
4. [ ] 建 valid/invalid fixtures。
5. [ ] 建 TCK runner。
6. [ ] 固定首个 Harness supported range。
7. [ ] 完成 adapter Feature Matrix。
8. [ ] 映射 `tool/call` / `tools/result`。
9. [ ] 映射 `ctx.approval`。
10. [ ] 完成 `CapabilityRequest` normalization。
11. [ ] 完成 deterministic policy engine。
12. [ ] 完成 default-deny `tools/pre-execute` PEP。
13. [ ] 完成 Lease Store。
14. [ ] 完成 redacted Receipt。
15. [ ] 加 `EXPECTED_UNGOVERNED` 安全边界测试。
16. [ ] 建 Transaction state machine。
17. [ ] 建 portable Shadow Workspace backend。
18. [ ] 将 FS + Subprocess 指向同一 Shadow World。
19. [ ] 实现 Shell-write rollback TCK。
20. [ ] 实现 conflict-checked Commit + Recovery Journal。

完成这 20 项之后，才进入 Acceptance / AVP 实现，避免 Verification 层建立在不稳定执行语义上。
