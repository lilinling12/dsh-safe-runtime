# Safe Runtime Protocol — Normative Specification

> 文档类型：Normative Specification  
> 版本：`v0.1-draft`  
> API Group：`safe-runtime.dev`  
> 目标：定义 Agent 行为授权、事务执行、验收验证与证据关联的运行时无关协议  
> 首个 Adapter：DeepSeek Harness  
> 状态：DRAFT

---

## 1. 规范语言

本文中的 **MUST、MUST NOT、REQUIRED、SHALL、SHALL NOT、SHOULD、SHOULD NOT、RECOMMENDED、MAY、OPTIONAL** 按 RFC 2119 / RFC 8174 的规范性含义解释。

中文解释：

- **MUST / 必须**：不满足即不符合协议。
- **MUST NOT / 禁止**：实现不得出现该行为。
- **SHOULD / 应当**：除非存在经过记录的合理原因，否则应遵循。
- **MAY / 可以**：可选能力。

实现不得通过降低规范语义、Validator、TCK 或安全边界来满足兼容性测试。

---

# 2. 范围

Safe Runtime Protocol（以下简称 SRP）定义四个逻辑平面：

1. **Authorization Plane**：Capability Broker。
2. **Execution Plane**：Transactional Runtime。
3. **Verification Plane**：Acceptance Engine。
4. **Evidence Plane**：AVP-compatible Evidence Ledger。

SRP 不规定：

- LLM Prompt 内容；
- Agent 的规划算法；
- 某个具体模型；
- 某个具体 Harness 实现；
- 业务领域正确性的通用判定方法；
- 数据库和远程 API 的自动事务回滚。

---

# 3. 基础安全模型

## 3.1 Trust Domains

实现 MUST 明确标注以下 Trust Domain：

| Domain | 含义 |
|---|---|
| `MODEL_UNTRUSTED` | 模型输出、Tool 参数、Subagent 请求均视为不可信输入 |
| `TOOL_MEDIATED` | 通过受 Broker 管理的 Tool Pipeline 执行 |
| `PROVIDER_MEDIATED` | 通过 Broker-aware FS/Subprocess/Network Provider 执行 |
| `HOST_PLUGIN_TRUSTED` | 同进程、可直接访问宿主能力的插件代码 |
| `PROCESS_ISOLATED` | 运行在独立进程/容器/microVM 等边界内 |
| `VERIFIER_TRUSTED` | 负责确定性检查或独立验证的组件 |
| `HUMAN_AUTHORITY` | 明确的人类授权来源 |

实现 MUST NOT 将 `HOST_PLUGIN_TRUSTED` 描述为 Zero Trust。

## 3.2 Guarantee Level

每次授权、执行、证据和 Verdict MUST 能关联一个 `GuaranteeLevel`：

```text
advisory
tool-enforced
provider-enforced
process-isolated
```

语义：

- `advisory`：仅做匹配、提示、审计，存在等价路径绕过。
- `tool-enforced`：在受控 Tool Pipeline 内不可绕过，但宿主插件仍可能旁路。
- `provider-enforced`：受控 FS/Process/Network Provider 强制执行。
- `process-isolated`：宿主权限由 OS/容器/microVM/独立进程边界限制。

未知 Level MUST 被视为最低保证级别。

---

# 4. Canonical Identity

所有跨组件实体 MUST 使用不可复用的稳定 ID：

```text
sessionRef
turnRef
stepRef
subjectRef
actionRef
approvalRef
policyRef
leaseRef
transactionRef
checkRef
claimRef
evidenceRef
verdictRef
```

ID MUST：

1. 在其作用域内唯一；
2. 不从可变显示名称推导；
3. 不包含 Secret；
4. 可序列化；
5. 可在 Sidecar Ledger 中安全引用。

---

# 5. Subject Model

`Subject` 表示“谁正在请求能力”。

```json
{
  "kind": "agent",
  "id": "agent/root",
  "parent": null,
  "sessionRef": "session:abc"
}
```

允许的标准 Kind：

```text
agent
subagent
tool
plugin
system
verifier
human
service
```

Subagent MUST 有 Parent Subject。

Delegation MUST 是 **attenuating**：子 Subject 可得到父级权限的子集，MUST NOT 自动获得父级没有的权限。

---

# 6. Capability Model

## 6.1 标准 Capability Namespace

v0.1 定义：

### Filesystem

```text
fs.read
fs.stat
fs.list
fs.create
fs.write
fs.edit
fs.delete
fs.move
fs.link
```

### Process

```text
process.resolve
process.exec
process.terminal
process.signal
```

### Network

```text
net.resolve
net.connect
net.http.read
net.http.mutate
```

### Secret

```text
secret.reference
secret.use
secret.reveal
```

### External Mutation

```text
external.read
external.mutate
```

### Runtime

```text
runtime.config.read
runtime.config.write
runtime.session.read
runtime.session.mutate
runtime.plugin.mount
runtime.plugin.unmount
```

扩展 Capability MUST 使用反向域名或注册 Namespace，避免与标准 Namespace 冲突。

## 6.2 Resource

Capability MUST 作用于显式 Resource：

```json
{
  "scheme": "workspace",
  "locator": "/src/auth.ts"
}
```

标准 Resource Scheme：

```text
workspace://
hostfs://
process://
network://
secret://
session://
config://
external://
```

Resource Locator MUST NOT 包含明文 Secret。

Filesystem Adapter MUST 使用 Provider 提供的稳定身份和 containment 语义，不得通过解析 opaque backend target 构造授权判断。

---

# 7. Capability Request

```json
{
  "apiVersion": "safe-runtime.dev/v1alpha1",
  "kind": "CapabilityRequest",
  "requestId": "capreq_01",
  "subject": {
    "kind": "agent",
    "id": "agent/root"
  },
  "sessionRef": "session:abc",
  "turnRef": "turn:17",
  "actionRef": "tool:438",
  "capability": "process.exec",
  "resource": {
    "scheme": "process",
    "locator": "git"
  },
  "constraints": {
    "argv": ["push", "origin", "feature/auth"],
    "cwdWithin": "workspace://root"
  },
  "requestedLease": {
    "ttlMs": 300000,
    "maxUses": 1
  },
  "reason": "Publish requested feature branch"
}
```

Request MUST 在执行之前创建。

Request 的 `actionRef` MUST 指向实际将被执行的 Action。

---

# 8. Policy Model

## 8.1 Policy

```yaml
apiVersion: safe-runtime.dev/v1alpha1
kind: CapabilityPolicy

metadata:
  name: coding-safe

spec:
  defaultEffect: deny

  rules:
    - id: workspace-read
      effect: allow
      capabilities: [fs.read, fs.stat, fs.list]
      resources:
        - workspace://**

    - id: workspace-mutation
      effect: ask
      capabilities: [fs.create, fs.write, fs.edit, fs.delete]
      resources:
        - workspace://**
      lease:
        ttl: 10m
        maxUses: 100

    - id: deny-host-secrets
      effect: deny
      capabilities: [fs.read, secret.reveal]
      resources:
        - hostfs://~/.ssh/**
        - hostfs://~/.aws/**
        - workspace://**/*.pem
```

## 8.2 Effect

标准 Effect：

```text
allow
deny
ask
```

未知 Effect MUST 导致配置加载失败。

## 8.3 Evaluation

Policy Engine MUST：

1. 先完成 Resource Canonicalization；
2. 再匹配 Policy；
3. 再产生 Decision；
4. 决策后若 Action 参数被重写，MUST 重新评估或拒绝；
5. 未知 Capability 默认 MUST `deny`；
6. 无匹配规则时使用 `defaultEffect`；
7. 缺失 `defaultEffect` 时 MUST 按 `deny` 处理。

v0.1 冲突规则 MUST 使用 `specs/0002-state-machines-and-precedence.md` 定义的确定性顺序：

```text
explicit deny
  > more-specific resource
  > higher explicit priority
  > ask
  > allow
  > default deny
```

实现不得自定义另一套优先级并仍声称满足 v0.1 Core Conformance。

---

# 9. Capability Decision

```json
{
  "decisionId": "capdec_01",
  "requestId": "capreq_01",
  "effect": "ask",
  "policyRef": "policy:coding-safe",
  "matchedRuleRefs": ["rule:workspace-mutation"],
  "guaranteeLevel": "tool-enforced",
  "reasonCode": "HUMAN_APPROVAL_REQUIRED"
}
```

Decision MUST 是不可变记录。

Decision MUST NOT 存储明文 Secret。

---

# 10. Approval Bridge

当 Decision 为 `ask` 时：

1. Runtime MUST 调用当前 Runtime Adapter 的 Approval Port；
2. Approval MUST 关联原 Action；
3. 只有明确的 One-shot Allow 才能开放该请求；
4. rejected / cancelled / unavailable / timeout MUST Fail Closed；
5. Approval 不得自动扩大 Request 的 Resource / Constraint；
6. Approval 结果 MUST 生成 Authorization Provenance。

对 DeepSeek Harness Adapter：

```text
allowed-once → allow
rejected     → deny
cancelled    → deny
unavailable  → deny
```

---

# 11. Capability Lease

Lease 用于避免对等价、受限的连续操作重复审批。

```json
{
  "leaseRef": "lease_01",
  "subjectRef": "agent/root",
  "capability": "fs.write",
  "constraints": {
    "resourceWithin": "workspace://src/**"
  },
  "issuedAt": "2026-08-17T03:00:00Z",
  "expiresAt": "2026-08-17T03:10:00Z",
  "maxUses": 100,
  "remainingUses": 100,
  "authorizationRef": "approval:abc",
  "delegation": "attenuating"
}
```

Lease MUST：

- 有明确 TTL 或 Turn-bound Lifetime；
- 有 Subject；
- 有 Capability；
- 有 Resource Constraint；
- 可被撤销；
- 在过期或耗尽后立即失效；
- 不允许 Child Subject 扩大权限；
- 不得包含 Secret 值。

Lease 校验 MUST 发生在 Action 执行之前。

---

# 12. Policy Enforcement Point（PEP）

v0.1 PEP 至少包括：

```text
PEP-TOOL      Tool pre-execution
PEP-FS        Filesystem provider
PEP-PROCESS   Subprocess provider
PEP-NET       Network proxy/provider
PEP-SECRET    Secret broker
```

一个部署 MUST 对外声明它实际启用了哪些 PEP。

如果某 Capability 没有可执行的 PEP，实现 MUST：

- 将其标记为 `advisory`，或
- Fail Closed。

实现 MUST NOT 把声明型 Policy 当成已经完成的底层 Enforcement。

---

# 13. Audit Receipt

每个受治理 Action MUST 产生 Receipt。v1alpha1 wire shape 与
`schemas/v1alpha1/capability-receipt.schema.json` 一致：

```json
{
  "apiVersion": "safe-runtime.dev/v1alpha1",
  "kind": "CapabilityReceipt",
  "receiptRef": "receipt_01",
  "requestRef": "capreq_01",
  "decisionRef": "capdec_01",
  "leaseRef": "lease_01",
  "effect": "allowed",
  "guaranteeLevel": "tool-enforced",
  "resourceDigest": "sha256:...",
  "argumentDigest": "sha256:...",
  "resultDigest": "sha256:...",
  "observedAt": "2026-08-17T03:05:00Z"
}
```

Receipt 通过 `requestRef` 关联对应的 `CapabilityRequest`；实际 Action
身份由该 Request 的 `actionRef` 关联，不在 Receipt 中重复定义第二个
action identity field。

Receipt MUST 在 Redaction 后持久化。

---

# 14. Transaction Model

## 14.1 v1 Transaction Scope

v1 REQUIRED Scope：

```text
workspace-filesystem-effects
```

v1 不承诺自动回滚：

```text
database writes
HTTP mutations
remote APIs
email/message sending
cloud resource mutation
arbitrary external side effects
```

这些 Side Effect MUST 被分类为：

```text
transactional
compensatable
external-nontransactional
```

## 14.2 Transaction State Machine

```text
NEW
 ↓
PREPARING
 ↓
ACTIVE
 ↓
VERIFYING
 ├─ checks fail ───────────────→ ROLLING_BACK → ROLLED_BACK
 ├─ abort ─────────────────────→ ROLLING_BACK → ROLLED_BACK
 └─ checks pass
        ↓
    PREPARING_COMMIT
        ├─ stale host state → CONFLICTED
        └─ ready
             ↓
          COMMITTING
             ├─ success → COMMITTED
             └─ crash/fault → RECOVERY_REQUIRED
```

终态：

```text
COMMITTED
ROLLED_BACK
CONFLICTED
ABORTED
FAILED
```

`RECOVERY_REQUIRED` 不是成功终态。

## 14.3 Transaction Invariants

事务 MUST：

1. 在 Host Workspace 之外执行修改；
2. 保证 Subprocess 的 `cwd` 指向 Transaction World；
3. 使 Tool FS 与 Subprocess 看到同一 Logical Workspace；
4. 不允许通过 Symbolic Link 逃出允许边界；
5. Commit 前验证 Host Base Version；
6. Host 已变化时不得静默覆盖；
7. 未完成 Verification 时不得自动 Commit；
8. Crash 后必须能够确定事务状态；
9. 事务日志必须先于不可逆 Commit Step 持久化；
10. Rollback 后 Host Workspace 应与事务开始前等价，除非明确记录 `external-nontransactional` Effect。

---

# 15. Workspace Snapshot

每个 Transaction MUST 有：

```json
{
  "transactionRef": "tx_01",
  "workspaceRef": "workspace:repo",
  "baseRevision": "opaque",
  "startedAt": "...",
  "backend": "shadow-copy",
  "state": "ACTIVE"
}
```

文件 Base State 应记录：

```text
target identity
existence
opaque version
content digest
mode metadata（若 backend 支持）
```

不得把 Provider 的 Opaque Version 当作时间戳、inode 或路径解析。

---

# 16. Transaction Filesystem Semantics

Transactional FS MUST 实现：

```text
resolve
contains
stat/lstat
read
list
create/write/edit
delete
move（若声明支持）
processPath
fileUrl
```

若底层 Runtime Adapter 不支持某 Mutation Primitive，Transactional Provider MAY 通过自己的 execution-world backend 提供该能力，但 MUST：

- 不绕过 Transaction Boundary；
- 不直接修改 Host Workspace；
- 在 Capability Broker 中分类该 Action；
- 在 TCK 中验证。

---

# 17. Transaction Subprocess Semantics

Subprocess MUST：

1. 运行在与 Transaction FS 相同的 execution world；
2. 使用 Transaction Workspace 的 process coordinate；
3. 应用相同 Capability / Sandbox Policy；
4. 捕获 exit code、signal、runtime classification；
5. 在取消时终止完整 managed process tree；
6. 不允许通过未声明 Host Path 注入绕出 Shadow Workspace；
7. 对环境变量执行 Secret Scrubbing。

Shell 重定向、编译器生成文件、测试缓存等写入，只要发生在 Transaction World 内，都属于事务可观察结果。

---

# 18. Commit Protocol

v1 的跨文件 Commit 定义为 **crash-recoverable commit**，而不是对任意外部观察者提供全局瞬时原子性。

Commit MUST 分为：

```text
PREPARE
VALIDATE
JOURNAL
APPLY
FINALIZE
```

### PREPARE

生成确定性 `CommitPlan`。

### VALIDATE

对所有受影响 Host Target 校验：

```text
currentVersion == baseVersion
```

若不相等：

```text
COMMIT_CONFLICT
```

### JOURNAL

在 Host 修改前持久化：

```text
commit plan
base digests
backup references
intended target versions
transaction id
```

### APPLY

单文件发布 SHOULD 使用目标文件系统支持的 Atomic Replace。

### FINALIZE

所有项目完成后：

```text
state = COMMITTED
```

发生崩溃时 MUST 进入 Recovery，而不是猜测 Commit 已完成。

---

# 19. Rollback Protocol

Active Transaction 的普通 Rollback 仅需删除/销毁 Shadow Execution World。

Commit 中断后的 Recovery Rollback MUST 依据 Journal 和 Backup 恢复。

恢复操作 MUST 是 Idempotent。

---

# 20. External Effects

每个 External Effect MUST 产生：

```json
{
  "kind": "external-nontransactional",
  "capability": "external.mutate",
  "resourceRef": "external:github/repo/...",
  "reversible": false,
  "receiptRef": "..."
}
```

若 Acceptance Contract 要求“失败时不得产生外部副作用”，Runtime MUST 在 Verification 前禁止这些 Effect。

---

# 21. Acceptance Contract

```yaml
apiVersion: safe-runtime.dev/v1alpha1
kind: AcceptanceContract

metadata:
  name: repository-change

spec:
  completionPolicy: all-required

  checks:
    - id: unit-tests
      type: command
      required: true
      command: [pnpm, test, --run]
      expect:
        exitCode: 0

    - id: workspace-scope
      type: workspace-diff
      required: true
      allow:
        - src/**
        - tests/**
      deny:
        - .env
        - "**/*.pem"

    - id: no-secret
      type: rule
      required: true
      rule: no-secret-added

  onFailure:
    action: steer
    maxRetries: 2
    afterExhaustion: blocked
```

---

# 22. Acceptance Check Types

v0.1 标准 Check：

```text
command
workspace-diff
file-exists
file-absent
content-rule
no-secret-added
required-evidence
custom-deterministic
```

`custom-llm` MAY 支持，但 MUST：

- 明确标记为 Non-deterministic；
- 不得独占最终 Verdict；
- 其输出只能作为 Evidence 或辅助信号，除非 Contract 明确声明风险。

---

# 23. Acceptance State Machine

```text
PENDING
  ↓
READY
  ↓
VERIFYING
  ├─ required fail → FAILED
  ├─ check error   → ERROR/BLOCKED
  ├─ missing       → INCOMPLETE
  └─ all required pass
          ↓
       VERIFIED
```

允许 Steering 时：

```text
VERIFYING
  → FAILED_ATTEMPT
  → STEERED
  → RETRYING
  → VERIFYING
```

Retry MUST 有显式 Budget。

不得无限重试。

---

# 24. Verdict

标准 Verdict：

```text
VERIFIED
FAILED
INCOMPLETE
INVALID
BLOCKED
ERROR
```

定义：

- `VERIFIED`：所有 Required Check 有有效 Evidence 且通过。
- `FAILED`：至少一个 Required Check 明确失败。
- `INCOMPLETE`：缺失 Required Evidence/Check。
- `INVALID`：Evidence 被篡改、Contract 无效、引用不一致。
- `BLOCKED`：策略/授权/运行环境阻止必要 Check。
- `ERROR`：Verifier 自身失败，不能解释为通过。

---

# 25. Evidence Model

Evidence MUST 区分：

```text
intent
execution
observation
authorization
verification
```

示例：

```text
tool/call          = intent
final tool result  = execution outcome
filesystem state   = observation
approval decision  = authorization
acceptance result  = verification
```

Assistant 文本：

```text
"All tests pass."
```

仅是 Claim，不是 Evidence。

---

# 26. Claim → Evidence → Check → Verdict

```json
{
  "claim": {
    "id": "claim:complete",
    "statement": "Required implementation and tests are complete"
  },
  "evidenceRefs": [
    "ev:workspace-diff",
    "ev:test"
  ],
  "checkRefs": [
    "check:unit-tests",
    "check:scope"
  ],
  "verdictRef": "verdict:01"
}
```

一个成功 Claim 若被权威执行 Evidence 反驳，MUST NOT 返回 `VERIFIED`。

---

# 27. Evidence Integrity

Evidence SHOULD 使用：

```text
sha256 digest
canonical JSON
content-addressed blob
source event reference
observedAt
adapter identity
```

若 Digest 校验失败：

```text
Verdict = INVALID
```

---

# 28. Evidence Privacy

默认持久化 SHOULD 包含：

```text
event type
resource identity/digest
arguments digest
result digest
exit code
timing
policy/lease refs
check result
```

默认 MUST NOT 持久化：

```text
raw secret
complete environment
complete prompt
complete source file
complete stdout/stderr
authorization credential
```

原始内容保留必须由 Retention Policy 明确允许。

---

# 29. Runtime Adapter Contract

核心 Protocol MUST 通过 Adapter 与 Harness 连接：

```ts
interface RuntimeAdapter {
  readonly name: string
  readonly version: string
  readonly capabilities: AdapterCapabilities

  observe(sink: RuntimeEventSink): Disposable

  registerToolPolicy(handler: ToolPolicyHandler): Disposable

  requestApproval(req: ApprovalRequest): Promise<ApprovalDecision>

  steerCompletion(req: CompletionSteerRequest): Promise<void>

  filesystem?: TransactionalFilesystemPort
  subprocess?: TransactionalSubprocessPort
}
```

Core MUST NOT Import：

```text
concrete Harness agent-loop package
Harness internal event payload types
Harness private SessionEventMap internals
specific RC-only paths
```

---

# 30. Adapter Feature Detection

Adapter MUST 提供 Feature Matrix：

```json
{
  "tools.preExecute": true,
  "tools.finalResult": true,
  "tools.monotonicGuard": true,
  "approval.failClosed": true,
  "session.durableReplay": true,
  "session.customEventRegistration": false,
  "fs.opaqueTargets": true,
  "fs.versionGuards": true,
  "subprocess.sameWorld": true,
  "sandbox.fileEffects": true,
  "sandbox.networkIsolation": false
}
```

Core MUST 根据 Feature 判断能否提供 Guarantee。

不得只根据 Runtime Version 字符串猜测能力。

---

# 31. DeepSeek Harness Mapping Profile

当前 DSH Adapter SHOULD 映射：

| SRP 语义 | DSH Extension Point |
|---|---|
| `turn.started` | durable `turn/start` |
| `tool.requested` | durable `tool/call` |
| `tool.policy` | `tools/pre-execute` |
| hard invariant | `ctx.tools.guard()` |
| execution wrapper | `tools/execute` |
| authoritative tool result | `tools/result` |
| FS observation | `fs/observed` |
| FS mutation guard | `fs/write-intent`, `fs/edit-intent` |
| human authorization | `ctx.approval` + approval events |
| completion request | `agent/turn-stopping` |
| transaction FS | `ctx.fs` provider |
| transaction process | `ctx.subprocess` provider |
| file-effect confinement | `ctx.sandbox` |
| subagent identity | `ctx.subagents` |
| orchestration | `ctx.workflowEngine` |

---

# 32. Persistence

Protocol Core MUST 定义 Storage Port，而不是绑定 Harness Persistence。

推荐 Logical Store：

```text
PolicyStore
LeaseStore
AuditLedger
TransactionJournal
EvidenceLedger
BlobStore
RecoveryStore
```

Local Profile MAY 使用 SQLite/WAL。

Team/Enterprise Profile MAY 使用 PostgreSQL/Object Storage。

无论后端如何变化，数据语义 MUST 保持一致。

---

# 33. Cancellation / Disposal

所有长生命周期操作 MUST 支持 Cancellation。

Plugin Dispose 时 MUST：

- 停止新请求；
- 撤销临时 Lease；
- 终止受管 Process；
- Flush Audit；
- 关闭 Storage；
- 对 Active Transaction 标记 Recovery-required 或安全 Rollback；
- 解除 Hook / Listener；
- 不留下无法识别的锁。

---

# 34. Concurrency

系统 MUST 支持并发 Session。

Lease 必须按 Subject / Session 隔离。

Transaction 默认 MUST 对同一 Host Workspace 的 Commit 进行序列化或冲突检测。

不同 Transaction 对同一文件产生竞争时：

```text
first valid commit wins
later stale commit → CONFLICTED
```

不得 last-write-wins 静默覆盖。

---

# 35. Error Model

标准错误码：

```text
CAP_UNKNOWN
CAP_DENIED
CAP_APPROVAL_REQUIRED
CAP_APPROVAL_UNAVAILABLE
CAP_LEASE_EXPIRED
CAP_LEASE_EXHAUSTED
CAP_RESOURCE_INVALID
CAP_ENFORCEMENT_UNAVAILABLE

TX_PREPARE_FAILED
TX_PATH_ESCAPE
TX_PROCESS_ESCAPE
TX_COMMIT_CONFLICT
TX_COMMIT_FAILED
TX_ROLLBACK_FAILED
TX_RECOVERY_REQUIRED

VERIFY_CHECK_FAILED
VERIFY_CHECK_ERROR
VERIFY_EVIDENCE_MISSING
VERIFY_EVIDENCE_INVALID
VERIFY_RETRY_EXHAUSTED

ADAPTER_UNSUPPORTED
ADAPTER_SEMANTIC_MISMATCH
STORAGE_UNAVAILABLE
INTERNAL_INVARIANT_VIOLATION
```

Unknown Internal Error MUST NOT 被映射为 Success。

---

# 36. Security Invariants

任何符合实现 MUST 满足：

1. Unknown Capability → deny。
2. Approval unavailable → deny。
3. Child delegation 不得扩大权限。
4. Tool Result Error 不得转换成成功 Evidence。
5. Required Check Missing 不得 `VERIFIED`。
6. Failed Required Check 不得 `VERIFIED`。
7. Commit Conflict 不得静默覆盖。
8. Shadow Workspace 外写入必须被拒绝、分类为 External Effect，或明确降低 Guarantee。
9. Raw Secret 不得进入默认 Audit/Evidence。
10. Adapter 不支持 Required Semantic 时不得 Silent Degrade。
11. Transaction 未验证通过不得 Auto Commit。
12. Recovery 未完成不得把事务标记为 COMMITTED/ROLLED_BACK。
13. In-process Plugin Bypass 必须在安全声明和 TCK 中明确暴露，直到 Process Isolation 真正存在。

---

# 37. Versioning

Schema 使用：

```text
safe-runtime.dev/v1alpha1
safe-runtime.dev/v1beta1
safe-runtime.dev/v1
```

Breaking Change 必须：

- 提升 API Version；
- 提供 Migration Note；
- 更新 TCK；
- 更新 Adapter Compatibility Matrix；
- 不得仅修改 Reference Runtime 来重定义既有规范。

---

# 38. Conformance Levels

```text
SRP-AUTH
SRP-TX
SRP-VERIFY
SRP-EVIDENCE
SRP-FULL
```

插件可只实现部分 Profile。

`SRP-FULL` 必须同时通过四层 TCK。

---

# 39. Ready Gate

任何版本标记 `READY` 前必须完成：

```text
Normative Spec complete
JSON Schema complete
Validator complete
Language-independent fixtures
TCK pass
Reference Runtime pass
Threat-model review
Failure injection
Compatibility matrix
Privacy review
Acceptance audit
Release reproducibility
```

---

# 40. 明确非目标

v0.1 明确不解决：

- 任意 JavaScript Plugin 的完整 OS 隔离；
- 自动回滚任意 SaaS/数据库/支付/API Side Effect；
- 用 LLM 自评替代 Deterministic Verification；
- 通用 Enterprise IAM；
- 全部云厂商 Secret Broker；
- 全部 OS 的高性能 Overlay Backend；
- 任意 Runtime 的正式支持。

这些能力应在后续版本中通过独立 RFC 引入。
