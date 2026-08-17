# DSH Safe Runtime — Production Architecture Design

> 文档类型：Production Architecture / System Design  
> 状态：Draft for implementation  
> 版本：v0.1  
> 目标：把 Capability Broker、Transactional Workspace、Acceptance/AVP 设计为长期可演进的统一基础设施。

---

# 1. 设计目标

系统的核心目标不是“阻止几个危险命令”，而是形成以下闭环：

```text
Request Action
     ↓
Normalize Capability
     ↓
Authorize
     ↓
Execute in Controlled World
     ↓
Observe Authoritative Result
     ↓
Verify Against Contract
     ↓
Commit / Rollback
     ↓
Emit Replayable Evidence
```

生产级目标：

- 安全语义清晰；
- 默认 Fail Closed；
- 可证明的权限衰减；
- Workspace 副作用事务化；
- 验收结果可重放；
- Crash 可恢复；
- 多 Session 并发；
- 兼容 DeepSeek Harness 快速演进；
- 默认隐私保护；
- 可扩展到独立进程 Plugin Host。

---

# 2. DeepSeek Harness 架构适配

DeepSeek Harness 当前提供三个关键扩展层：

```text
Durable session events
Live interception events
Replaceable capability seams
```

设计必须分别使用，而不能混淆。

## 2.1 Durable Facts

用于 Evidence / Replay：

```text
turn/*
step/*
assistant/*
tool/call
tool/result
approval/*
```

## 2.2 Live Interception

用于控制：

```text
agent/pre-step
agent/request
tools/pre-execute
tools/execute
tools/post-execute
tools/result
agent/turn-stopping
```

## 2.3 Capability Seam

用于改变执行世界：

```text
ctx.fs
ctx.subprocess
ctx.sandbox
ctx.approval
ctx.subagents
ctx.workflowEngine
```

特别是：

```text
ctx.fs + ctx.subprocess
```

必须作为同一 execution world 设计。

---

# 3. 总体架构

```text
┌─────────────────────────────────────────────────────────────┐
│                    DeepSeek Harness                         │
│                                                             │
│  Agent Loop / Tools / Sessions / Subagents / Workflow       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   adapter-dsh                               │
│  event normalization | feature detection | approval bridge  │
└───────────────┬──────────────────────┬──────────────────────┘
                │                      │
                ▼                      ▼
┌─────────────────────────┐   ┌───────────────────────────────┐
│   Capability Broker     │   │   Evidence Observation       │
│ PDP + PEP orchestration │   │ tools/result/session events   │
└────────────┬────────────┘   └──────────────┬────────────────┘
             │                               │
             ▼                               │
┌────────────────────────────────────────────┴────────────────┐
│          Transactional Execution Runtime                    │
│  TxCoordinator                                              │
│  TransactionalFsProvider                                    │
│  TransactionalSubprocessProvider                            │
│  Sandbox bridge                                             │
│  External Effect classifier                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Acceptance Engine                          │
│ contract loader | deterministic checks | retry/steer budget │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              AVP / Evidence Ledger                          │
│ claim → evidence → check → verdict → proof bundle           │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
           COMMIT                    ROLLBACK
```

---

# 4. 包结构

```text
packages/
├── protocol/
│   ├── capability/
│   ├── transaction/
│   ├── acceptance/
│   ├── evidence/
│   ├── errors/
│   └── canonical-json/
│
├── adapter-dsh/
│   ├── event-map/
│   ├── tool-policy/
│   ├── approval/
│   ├── fs/
│   ├── subprocess/
│   ├── sandbox/
│   ├── session/
│   └── feature-detection/
│
├── policy-engine/
│   ├── parser/
│   ├── canonicalization/
│   ├── matcher/
│   ├── precedence/
│   └── diagnostics/
│
├── capability-broker/
│   ├── pdp/
│   ├── pep/
│   ├── classifier/
│   ├── leases/
│   ├── delegation/
│   ├── receipts/
│   └── cordis-plugin/
│
├── workspace-tx/
│   ├── coordinator/
│   ├── backend/
│   ├── diff/
│   ├── commit/
│   ├── rollback/
│   ├── recovery/
│   └── external-effects/
│
├── acceptance-engine/
├── avp-bridge/
├── storage/
├── cli/
└── testkit/
```

---

# 5. Protocol Core

`protocol` 必须是最稳定的一层。

它只能依赖：

```text
JSON Schema
canonical serialization
small utility types
no Harness runtime imports
```

禁止：

```text
import '@deepseek-ai/dsh-agent-loop'
import Harness concrete event types
import node:fs in protocol semantics
```

协议层必须可以被其他语言重新实现。

---

# 6. adapter-dsh

Adapter 是整个项目抵抗 Harness Breaking Change 的关键。

## 6.1 职责

```text
Harness Event → RuntimeEvent
Harness ToolExecution → CapabilityRequest
Harness Approval → AuthorizationDecision
Harness FS target → ResourceIdentity
Harness Subprocess → ExecutionPort
Harness turn-stopping → CompletionSteerPort
```

## 6.2 Feature Detection

启动时必须探测：

```text
pre-execute availability
final tools/result
guard semantics
approval outcomes
session replay
fs opaque target semantics
fs version guards
subprocess same-world path semantics
sandbox enforcement metadata
custom durable event support
```

探测失败时：

```text
adapter capability = false
```

核心不得假装支持。

## 6.3 Compatibility Matrix

每个 Release 必须发布：

| DSH Range | Adapter | Status |
|---|---|---|
| tested RC N | supported | green |
| tested RC N-1 | supported | green |
| older | best-effort / unsupported | explicit |

CI 应最少测试当前支持版本和前一支持版本。

---

# 7. Capability Broker Architecture

Capability Broker 分离 PDP 和 PEP。

```text
                    ┌─────────────┐
CapabilityRequest → │     PDP     │ → Decision
                    └──────┬──────┘
                           │
                 ┌─────────┴──────────┐
                 ▼                    ▼
              Policy              Lease Store
                 │                    │
                 └─────────┬──────────┘
                           ▼
                     Approval Bridge
                           │
                           ▼
                     Final Decision
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
        PEP-TOOL         PEP-FS         PEP-PROCESS
```

## 7.1 PDP

Policy Decision Point：

- Resource canonicalization；
- Subject identity；
- Policy matching；
- Lease matching；
- Delegation constraints；
- Approval request；
- deterministic decision；
- Decision Receipt。

PDP 不执行实际操作。

## 7.2 PEP-TOOL

DeepSeek Harness v0.1 的首个 Enforcement Point：

```text
tools/pre-execute
ctx.tools.guard()
```

用途：

- 早期拒绝；
- `ask` 路由；
- Action Classification；
- Lease Consume；
- 审计。

限制：

- 只治理进入 Tool Pipeline 的行为；
- 等价 Shell 拼写可能绕过字符串级 Matcher；
- 宿主 Plugin 直接调用 Node API 不受此边界约束。

因此 PEP-TOOL Guarantee = `tool-enforced`，不能宣称 `process-isolated`。

## 7.3 PEP-FS

v0.2 进入 Provider-aware Enforcement：

```text
resolve target
canonical containment
capability = fs.*
policy decision
mutation
receipt
```

所有 FS Action 在 Provider 层按 canonical target 决策，而不是依赖 Tool Name。

## 7.4 PEP-PROCESS

Process Request 规范化：

```json
{
  "capability": "process.exec",
  "executable": "/usr/bin/git",
  "argv": ["push", "origin", "feature/auth"],
  "cwd": "workspace://root",
  "envRefs": ["secret://github-token"]
}
```

禁止用 Shell String 作为唯一安全语义。

## 7.5 PEP-NET

Network Enforcement 不能只靠 SandboxMode。

长期建议：

```text
Agent Tool
  ↓
Network Broker / HTTP Proxy
  ↓
DNS/Host/Method/Path Policy
  ↓
Credential Injection
  ↓
Remote Service
```

对不经过 Broker 的网络活动：

- 在 process-isolated 模式中由 Network Namespace/eBPF/Proxy enforce；
- 在当前模式中必须标记为 Ungoverned/Advisory。

---

# 8. Secret Broker

Secret 设计必须遵循：

```text
reference > use > reveal
```

Agent 默认只应该得到：

```text
secret://github/publish-token
```

而不是明文。

最佳模式：

```text
Tool asks to call GitHub
  ↓
Broker authorizes secret.use
  ↓
Network/Process Provider injects secret
  ↓
Plugin/model never sees raw value
```

`secret.reveal` 应是独立高风险 Capability。

Audit 中只记录 Secret Ref，不记录值。

---

# 9. Lease Store

推荐数据字段：

```text
lease_id
subject_ref
capability
resource_constraint_json
constraint_digest
authorization_ref
issued_at
expires_at
max_uses
remaining_uses
revoked_at
parent_lease_ref
```

并发 Consume MUST 原子。

SQLite：

```sql
UPDATE lease
SET remaining_uses = remaining_uses - 1
WHERE lease_id = ?
  AND remaining_uses > 0
  AND expires_at > CURRENT_TIMESTAMP
  AND revoked_at IS NULL;
```

更新 0 行即失效。

Enterprise Store 应使用等价 Compare-and-Set。

---

# 10. Transactional Runtime

## 10.1 为什么不能只做 Undo

Tool-level snapshot 无法完整覆盖：

```bash
echo x > file
rm file
mvn test
pnpm build
codegen
formatter
compiler
```

因此 Transaction 必须把 Subprocess 本身放进 Shadow Execution World。

## 10.2 Backend Abstraction

```ts
interface TransactionBackend {
  prepare(workspace: WorkspaceRef): Promise<TxWorkspace>
  diff(tx: TxWorkspace): Promise<FileDelta[]>
  destroy(tx: TxWorkspace): Promise<void>
  recover(record: RecoveryRecord): Promise<RecoveryResult>
}
```

第一阶段建议同时定义三个 Backend Profile：

### `shadow-copy`

跨平台基线。

优点：

- 语义简单；
- 最容易验证；
- Shell 写入自然隔离。

缺点：

- 大仓库成本高。

必须有大小/文件数限制和显式拒绝。

### `reflink`

检测支持 CoW clone 时使用。

不支持则回退 `shadow-copy`。

### `overlay-linux`

Linux 高性能后端。

需要明确 Kernel/Privilege Requirement。

不允许为了性能自动降低隔离语义。

---

# 11. Shadow Workspace

推荐目录：

```text
~/.dsh-safe/
├── tx/
│   └── tx_01/
│       ├── workspace/
│       ├── meta/
│       │   ├── transaction.json
│       │   ├── base-index.jsonl
│       │   ├── diff.jsonl
│       │   └── effects.jsonl
│       └── journal/
│           └── commit.jsonl
├── audit/
├── evidence/
└── blobs/
```

目录权限必须 owner-only。

Secret-bearing Snapshot 应允许 encrypted-at-rest。

---

# 12. Path Security

必须防止：

```text
../ escape
symlink escape
junction escape
hardlink surprises
case-insensitive aliasing
Windows drive alias
UNC path bypass
```

授权判断应基于 Runtime Provider 的 canonical identity/contains，而不是字符串前缀。

`startsWith(workspacePath)` 不得作为生产级边界判断。

---

# 13. Transaction + Subprocess

所有命令必须使用 Transaction CWD：

```text
Host:
  /repo

Transaction:
  ~/.dsh-safe/tx/tx_01/workspace

subprocess.cwd =
  transaction.processPath(workspaceRoot)
```

对 DeepSeek Harness：

- 通过 `ctx.fs.processPath()` 获取同 execution world 坐标；
- 通过 `ctx.subprocess` 执行；
- 不在 Core 中直接 `child_process.spawn()`。

---

# 14. External Effect Classifier

每次 Action 都分类：

```text
PURE_READ
TX_WORKSPACE_MUTATION
COMPENSATABLE_EXTERNAL
NON_TRANSACTIONAL_EXTERNAL
UNKNOWN
```

UNKNOWN 默认拒绝或要求显式 Approval。

例如：

| Action | Class |
|---|---|
| `git diff` | PURE_READ |
| `pnpm test` | TX_WORKSPACE_MUTATION（可能写 cache/build） |
| 修改 workspace 文件 | TX_WORKSPACE_MUTATION |
| `git push` | NON_TRANSACTIONAL_EXTERNAL |
| 发邮件 | NON_TRANSACTIONAL_EXTERNAL |
| 创建云资源 | NON_TRANSACTIONAL_EXTERNAL |

Acceptance 前原则上应阻止不可逆 External Mutation，除非 Contract 明确允许。

---

# 15. Commit Engine

## 15.1 Prepare Diff

生成：

```json
{
  "path": "src/auth.ts",
  "kind": "modify",
  "baseVersion": "opaque",
  "baseDigest": "sha256:...",
  "txDigest": "sha256:..."
}
```

Diff 排序必须稳定。

## 15.2 Conflict Check

Commit 之前，对每个 Host Target 重新 Stat。

若：

```text
currentVersion != baseVersion
```

立即：

```text
TX_COMMIT_CONFLICT
```

不得尝试自动覆盖。

## 15.3 Journal

先写：

```text
COMMIT_PREPARED
BACKUP_CREATED
TARGET_APPLY_STARTED
TARGET_APPLIED
...
COMMIT_FINALIZED
```

每条记录带 Sequence + Checksum。

## 15.4 Crash Semantics

如果 Process Crash：

- 下次启动扫描未终结 Journal；
- 判断已应用目标；
- 完成 Forward Recovery 或 Rollback；
- 在恢复成功前 Transaction 不得成为成功终态。

---

# 16. Multi-file Atomicity

普通文件系统无法给任意外部 Reader 提供真正的多文件瞬时原子 Commit。

因此产品必须准确描述：

> `crash-recoverable, conflict-checked multi-file commit`

而不是：

> `globally atomic multi-file transaction`

如果未来通过 Mount Namespace / Overlay Switch / Container Snapshot 实现更强语义，可以增加新的 Guarantee Profile。

---

# 17. Acceptance Engine

组件：

```text
ContractLoader
CheckRegistry
CheckScheduler
EvidenceCollector
VerdictEngine
RetryBudget
SteeringBridge
```

## 17.1 Check 安全

Acceptance Command 自身也是 Agent Runtime Action。

它必须通过：

```text
Capability Broker
Transactional Subprocess
Sandbox Policy
```

不能因为它是“测试命令”就绕过安全层。

## 17.2 Required Check

只有：

```text
status = PASS
evidence valid = true
freshness valid = true
```

才能满足 Required Check。

Old/Cached Evidence 不能默认复用。

---

# 18. Freshness

Evidence 必须有 Freshness Scope：

```text
transactionRef
turnRef
workspaceDigest
commandDigest
observedAt
```

例如上一次运行的测试成功，不得自动证明当前 Workspace 的测试成功。

推荐：

```text
evidence.workspaceDigest == currentTxWorkspaceDigest
```

或 Check 自己声明有效的 Freshness Rule。

---

# 19. AVP Bridge

AVP Bridge 只负责协议转换：

```text
RuntimeEvent
CapabilityReceipt
TransactionEffect
AcceptanceCheckResult
      ↓
AVP Episode
```

它不应该重新定义 Capability 或 Transaction 语义。

建议 Evidence Sidecar：

```text
~/.dsh-safe/evidence/
└── episode_01/
    ├── episode.json
    ├── evidence.jsonl
    ├── receipts.jsonl
    ├── blobs/
    └── verdict.json
```

---

# 20. False-success Detection

典型场景：

```text
Agent:
  "All tests pass."

Authoritative execution:
  pnpm test
  exitCode = 1
```

结果必须：

```text
claim = completion success
evidence = contradictory
check = FAIL
verdict = FAILED
classification = CLAIM_CONTRADICTED
```

不能因为 Agent 最终文本更晚出现就覆盖工具事实。

---

# 21. Subagent Design

## 21.1 Identity

每个 Subagent 必须有：

```text
subjectRef
parentSubjectRef
delegationRef
leaseRefs
transactionRef
```

## 21.2 Capability Inheritance

默认：

```text
inheritByDefault = false
```

若允许继承：

```text
child capability ⊆ parent delegated capability
```

## 21.3 Transaction Inheritance

长期支持三种模式：

```text
shared
child-branch
none
```

推荐长期默认 `child-branch`，验证后 Merge 到 Parent Transaction。

v0.1 可先只实现 `shared` 或 `none`，但必须显式声明，不得隐式行为。

---

# 22. Workflow Integration

Workflow 启动 Child Agent 时应传播：

```text
subject lineage
capability delegation
transaction lineage
evidence lineage
acceptance scope
```

不得把 Workflow Child 当成无法关联的黑盒 Process。

---

# 23. Storage Architecture

## 23.1 Local Mode

推荐 SQLite WAL：

```text
policies
leases
receipts
transactions
transaction_files
commit_journal
checks
evidence_index
recovery_records
```

Blob：

```text
filesystem or object store
content-addressed by digest
```

## 23.2 Team Mode

推荐：

```text
PostgreSQL → structured state
Object Storage → large blobs
KMS → encryption keys
OTel → metrics/traces
```

但 Protocol 不依赖具体数据库。

---

# 24. Audit Ledger

Audit Record 必须 Append-only 语义。

建议 Hash Chain：

```text
record_n.hash =
  SHA256(
    canonical(record_n_without_hash)
    || record_(n-1).hash
  )
```

目的：

- 检测离线篡改；
- 支持 Proof Bundle；
- 不是区块链。

高安全部署可周期性将 Checkpoint 签名或发送到外部 WORM Store。

---

# 25. Privacy / Redaction

Redaction Pipeline：

```text
Raw Runtime Fact
   ↓
Classifier
   ↓
Secret detector
   ↓
Policy redaction
   ↓
Digest / Reference substitution
   ↓
Persist
```

默认 Sensitive Class：

```text
secret
credential
prompt
source-content
environment
network-body
tool-arguments
tool-result
```

Storage 必须支持 Retention TTL 和 Delete Workflow。

---

# 26. Observability

指标至少包括：

```text
capability_requests_total
capability_denied_total
capability_approval_total
lease_active
lease_denied_total

tx_active
tx_commit_total
tx_rollback_total
tx_conflict_total
tx_recovery_required_total
tx_prepare_seconds
tx_commit_seconds

acceptance_checks_total
acceptance_failed_total
acceptance_blocked_total
false_success_detected_total

adapter_semantic_mismatch_total
audit_write_failure_total
```

安全关键 Audit 写入失败默认应 Fail Closed，除非 Deployment Policy 明确允许降级且标记不可验证。

---

# 27. SLO 建议

v1 Beta 建议目标：

```text
PDP local decision p95 < 10ms
Lease lookup p95 < 5ms
Audit append p95 < 20ms
No lost committed audit receipts
No silent commit conflict
Recovery scan on startup deterministic
```

Workspace Prepare 的延迟取决于 Backend/Repo 大小，因此应按 backend 单独定义，不给一个虚假的统一数字。

---

# 28. Failure Domains

## 28.1 Policy Store Down

默认：

```text
deny new privileged actions
existing non-expired lease behavior configurable
```

高安全模式：全部 deny。

## 28.2 Audit Store Down

高安全模式：

```text
fail closed
```

普通本地模式 MAY 使用 durable local spool，但必须标记未上传状态。

## 28.3 Approval Channel Down

```text
deny
```

## 28.4 Transaction Backend Down

```text
do not mutate host
```

## 28.5 Acceptance Engine Error

```text
ERROR / BLOCKED
never VERIFIED
```

---

# 29. Security Threat Model

## 29.1 威胁

考虑：

- Prompt Injection；
- Model 产生危险 Tool 参数；
- Subagent 权限放大；
- MCP Tool 被攻陷；
- Tool Result 恶意诱导；
- Secret Exfiltration；
- Workspace Path Escape；
- Symlink/Hardlink Attack；
- Shell 等价操作绕过 Matcher；
- Audit Tampering；
- Replay Attack；
- Lease Reuse；
- Concurrent Human Edit；
- Plugin 直接使用 Host Node API；
- Crash Mid-commit。

## 29.2 不可信输入

以下全部按 Untrusted：

```text
LLM text
tool arguments
MCP metadata
remote tool results
workspace files
repository config
AGENTS.md
skills
subagent output
network response
```

---

# 30. Process-isolated Plugin Host（长期）

这是 Capability Broker 走向真正 Zero Trust 的关键里程碑。

目标架构：

```text
Harness Host
   │
   ▼
Plugin Supervisor
   │  brokered RPC only
   ▼
Isolated Plugin Process
   ├── delegated fs RPC
   ├── delegated process RPC
   ├── delegated network RPC
   └── no raw host credential
```

插件进程不得自动继承 Host：

```text
cwd
environment secrets
filesystem
network
Unix socket
credential agent
```

所有 Capability 通过 Broker RPC 获取。

---

# 31. Isolation Backend

长期按平台支持：

```text
Linux: namespaces + seccomp + landlock/bwrap/container
macOS: sandbox-exec successor/container/VM boundary
Windows: AppContainer/Job Object/restricted token/container
Remote: container/microVM/E2B-like runtime
```

不要把 `node:vm` 当安全边界。

---

# 32. Network Isolation

Process-isolated Profile 才能较可靠地实现：

```text
default deny egress
DNS allowlist
host/port allowlist
HTTP proxy
TLS SNI policy
credential injection
request audit
```

普通 in-process Plugin 无法由 Tool Hook 完整控制。

---

# 33. Deployment Profiles

## `developer`

```text
tool-enforced broker
shadow-copy tx
local SQLite
interactive approval
```

## `ci`

```text
deny-by-default
approval=never
transaction required
deterministic acceptance
no external mutation before verify
```

## `enterprise`

```text
provider-enforced
central policy
signed policy bundle
PostgreSQL
KMS
external audit
secret broker
network proxy
```

## `isolated`

```text
process-isolated plugin host
network namespace
brokered secrets
transactional workspace
```

---

# 34. Policy Supply Chain

Policy Bundle 应包含：

```text
policy
schema version
issuer
createdAt
digest
signature
compatibility range
```

Enterprise 模式 SHOULD 验证签名。

Policy 变更必须产生 Audit Event。

---

# 35. CLI

建议：

```bash
dsh-safe doctor
dsh-safe policy validate policy.yaml
dsh-safe policy explain --action <...>
dsh-safe leases list
dsh-safe leases revoke <id>

dsh-safe tx list
dsh-safe tx inspect <id>
dsh-safe tx diff <id>
dsh-safe tx commit <id>
dsh-safe tx rollback <id>
dsh-safe tx recover

dsh-safe verify <contract>
dsh-safe evidence inspect <episode>
dsh-safe evidence verify <episode>

dsh-safe compatibility
dsh-safe tck run
```

---

# 36. Doctor

`doctor` 必须检查：

```text
Harness version
required extension points
adapter feature matrix
sandbox enforcement full/partial
filesystem backend
subprocess same-world
storage health
policy validity
audit writability
transaction temp permissions
recovery records
clock sanity
```

Doctor 不能只显示“OK”，应输出 Guarantee Level。

---

# 37. Configuration

```yaml
apiVersion: safe-runtime.dev/v1alpha1
kind: SafeRuntimeConfig

spec:
  mode: developer

  capability:
    policyFiles:
      - .dsh-safe/policy.yaml
    defaultEffect: deny

  transaction:
    requiredForWorkspaceMutation: true
    backend: auto
    maxWorkspaceBytes: 0   # 0 = deployment-defined
    autoCommit: false

  acceptance:
    contract: .dsh-safe/acceptance.yaml
    maxRetries: 2

  audit:
    store: sqlite
    redactByDefault: true

  evidence:
    storeRawContent: false
```

生产配置中 `maxWorkspaceBytes` 应由 Operator 给出显式值；示例中的 0 不应被解释为无限制。

---

# 38. Integration Sequence — Allow

```text
Agent
  ↓ tool/call
adapter-dsh
  ↓ CapabilityRequest
Broker/PDP
  ↓ allow
Lease consume
  ↓
Tx Runtime
  ↓ tool execute
authoritative tools/result
  ↓
Receipt + Evidence
```

---

# 39. Integration Sequence — Ask

```text
CapabilityRequest
  ↓
Policy = ask
  ↓
ctx.approval
  ├─ allowed-once → constrained Lease → execute
  └─ anything else → deny
```

---

# 40. Integration Sequence — Completion

```text
agent/turn-stopping
  ↓
Acceptance Contract
  ↓
Required checks
  ├─ fail → steer/retry within budget
  ├─ blocked/error → BLOCKED/ERROR
  └─ pass → VERIFIED
               ↓
           Tx Commit
```

建议默认先 Verdict，再 Commit。

如果某验证命令本身会修改 Workspace，它仍在同一个 Transaction 中执行。

---

# 41. Release Governance

每个重大语义变化必须：

```text
Problem statement
Historical behavior
Reconciliation
RFC/AEP
Normative Spec
Schema
TCK
Reference Implementation
Acceptance Audit
Ready
```

不得由 Reference Implementation 先做行为，再倒推规范。

---

# 42. CI Pipeline

```text
lint
typecheck
unit
schema validation
protocol fixtures
adapter contract tests
TCK
integration
fault injection
security tests
cross-platform
compatibility matrix
package provenance
reproducible pack check
```

`green CI` 不等于 Ready；Release Gate 还需要 Security / Acceptance Audit。

---

# 43. Definition of Production Ready

满足：

- 明确 Threat Model；
- Spec + Schema 一致；
- TCK 跨实现；
- Adapter 兼容矩阵；
- Fail-closed Error Path；
- Crash Recovery；
- Privacy Redaction；
- Concurrency Tests；
- Symlink/Path Escape Tests；
- Commit Conflict Tests；
- Approval Unavailable Tests；
- Evidence Tamper Tests；
- False-success Tests；
- 完整 Operator Guide；
- Known Limitations 明确；
- 不夸大 Guarantee Level。

---

# 44. 最终长期形态

```text
                    ┌──────────────────────┐
                    │   Agent Runtime      │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Capability Broker   │
                    │ PDP + PEP + Leases   │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ Transaction Runtime  │
                    │ FS + Process + Tx    │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ Acceptance Engine    │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ Evidence / AVP       │
                    └──────────┬───────────┘
                               │
                       ┌───────┴────────┐
                       ▼                ▼
                    COMMIT           ROLLBACK
```

最终产品价值不是“多一个 Agent 插件”，而是：

> **把 Agent 的权力、执行位置和完成声明全部转换成可治理、可隔离、可验证、可审计的运行时事实。**
