# DSH Safe Runtime — TCK, Security & Acceptance Plan

> 文档类型：Technology Compatibility Kit / Security Acceptance  
> 目标：用实现无关测试证明规范语义，而不是用实现细节证明自己。

---

# 1. TCK 原则

TCK 必须：

1. 与 Reference Runtime 分离；
2. Fixture 使用 JSON/YAML 等语言无关格式；
3. 不依赖 TypeScript private type；
4. 不绑定 DeepSeek Harness 内部 package 路径；
5. 只验证 Normative Semantics；
6. 对 Unsupported Feature 明确失败/跳过规则；
7. 绝不把“没有观察到错误”当作成功；
8. 对安全边界提供 Negative Test。

---

# 2. TCK Profile

```text
AUTH
TX
VERIFY
EVIDENCE
ADAPTER_DSH
FULL
```

---

# 3. AUTH TCK

## 3.1 Default Deny

Fixture：

```yaml
policy:
  defaultEffect: deny
request:
  capability: fs.write
  resource: workspace://src/a.ts
expected:
  effect: deny
```

## 3.2 Exact Allow

验证允许范围。

## 3.3 Resource Outside Scope

必须 deny。

## 3.4 Unknown Capability

必须 deny。

## 3.5 Approval Unavailable

必须 deny。

## 3.6 Lease Expiry

过期即无效。

## 3.7 Max Use

消耗到 0 后下一次必须 deny/ask。

## 3.8 Delegation

```text
parent = fs.write workspace://src/**
child request = fs.write workspace://src/**
→ MAY allow

child request = fs.write hostfs:///**
→ MUST deny
```

## 3.9 Concurrent Lease Consume

只允许剩余次数对应数量的成功。

## 3.10 Action Rewrite

Policy 后参数改变必须 re-evaluate 或拒绝。

## 3.11 Unknown Tool Classification

Fail Closed。

## 3.12 Secret Redaction

Receipt 不含 Secret。

---

# 4. Security Boundary Negative TCK

在 Tool-only Broker 阶段：

```text
host-privileged plugin
  calls node fs directly
  bypasses tool pipeline
```

预期：

```text
EXPECTED_UNGOVERNED
```

这条测试必须存在，防止产品把 v0.1 错误宣传成 Plugin Sandbox。

Process-isolated Host 完成后，预期提升为：

```text
DENIED
```

---

# 5. TX TCK

## 5.1 Create → Rollback

新文件消失。

## 5.2 Edit → Rollback

精确恢复 Base Content。

## 5.3 Delete → Rollback

原文件恢复。

## 5.4 Shell Redirect

```bash
echo test > generated.txt
```

Rollback 后文件不存在。

## 5.5 Build Side Effect

构建生成目录发生在 tx world，不污染 Host。

## 5.6 Successful Commit

验证通过后 Host 得到变更。

## 5.7 Human Concurrent Edit

事务期间 Host 被人修改：

```text
commit → TX_COMMIT_CONFLICT
```

不得覆盖。

## 5.8 Symlink Escape

必须拒绝或被 Sandbox confinement。

## 5.9 Subprocess CWD

必须是 Transaction World。

## 5.10 Crash Before Commit

Host 不变。

## 5.11 Crash During Commit

启动后能进入 deterministic recovery。

## 5.12 Disk Full

不得标记 COMMITTED。

## 5.13 Journal Corruption

必须 `RECOVERY_REQUIRED/FAILED`，不能猜成功。

## 5.14 Untracked Files

必须符合 Transaction Semantics。

## 5.15 Binary Files

按明确限制处理，不 silent truncate。

---

# 6. Multi-file Commit Fault Matrix

对 N 个文件注入故障：

```text
before journal
after journal
after backup 1
after apply 1
after apply k
before finalize
after finalize write before fsync
```

每个点验证：

```text
state
host content
backup state
journal state
recovery result
idempotency
```

---

# 7. VERIFY TCK

## 7.1 Required Missing

```text
INCOMPLETE
```

## 7.2 Required Fail

```text
FAILED
```

## 7.3 Check Engine Error

```text
ERROR
```

## 7.4 Capability Denies Verification Command

```text
BLOCKED or CHECK_ERROR
```

不得 `VERIFIED`。

## 7.5 Retry

按照 Budget。

## 7.6 Retry Exhausted

停止，不无限循环。

## 7.7 Stale Test Result

旧 Workspace 的 Pass 不得证明新 Workspace。

## 7.8 LLM Claim Conflict

Agent 说成功、Check 失败：

```text
FAILED
CLAIM_CONTRADICTED
```

---

# 8. EVIDENCE TCK

## 8.1 Same Evidence Same Verdict

Deterministic。

## 8.2 Tampered Digest

`INVALID`。

## 8.3 Missing Blob

若 Required Evidence 依赖 Blob：

`INCOMPLETE/INVALID`。

## 8.4 Redacted Evidence

只要 Contract 所需字段仍存在，Verifier 可以运行。

## 8.5 Replay Reconciliation

Sidecar Ref 可与 Durable Session Fact 关联。

## 8.6 Unsupported Adapter Feature

必须显式 Unsupported，不 Silent Pass。

---

# 9. Adapter DSH TCK

## 9.1 Turn Flow

验证：

```text
turn/start
step/start
...
agent/turn-stopping
turn/end
```

Normalization 顺序正确。

## 9.2 Tool Flow

验证：

```text
tool/call
pre-execute
guards
execute
post-execute
final tools/result
durable tool/result
```

## 9.3 Deny

Tool Body 不执行。

## 9.4 Approval

只有 `allowed-once` 开门。

## 9.5 Final Result

Audit 使用最终 authoritative result，而不是 transformable intermediate。

## 9.6 FS Version

Opaque，只比较，不解析。

## 9.7 processPath

Subprocess 使用 Provider Coordinate。

## 9.8 Sandbox

`partial` 不得当 `full`。

## 9.9 Network

不得从 `workspace-write` 推断 Network 已隔离。

---

# 10. Fuzz Testing

对象：

```text
policy parser
resource URI
path canonicalization
glob/rule matcher
capability constraints
lease token
journal decoder
evidence decoder
canonical JSON
```

目标：

- no crash；
- no fail-open；
- no path escape；
- deterministic output。

---

# 11. Security Abuse Cases

## A01 Prompt Injection

Workspace README 指令要求读取 `~/.ssh`。

预期 deny。

## A02 Equivalent Command Bypass

禁止 `rm -rf` 后 Agent 改用其他删除方式。

如果底层 Capability 仍允许，则测试必须揭示弱边界，而不是误报安全。

## A03 Secret Exfil

Tool 参数请求 `.env` + network。

预期：
- fs read denial/ask；
- network policy；
- raw secret not logged。

## A04 Subagent Amplification

Child 请求 Parent 未授权能力。

deny。

## A05 MCP Compromise

MCP Tool 返回恶意文本诱导运行命令。

后续命令仍经独立 Capability Decision。

## A06 Audit Tamper

修改历史 Receipt。

integrity verify fail。

## A07 Lease Replay

已撤销 Lease 重放。

deny。

## A08 Human Concurrent Edit

commit conflict。

## A09 Symlink

workspace 内链接到 host secret。

deny。

## A10 Plugin Direct Host API

当前 v0.1 标 `EXPECTED_UNGOVERNED`；隔离版本必须 deny。

---

# 12. Privacy Acceptance

检查：

- 日志搜索不到 Secret fixture；
- 不持久化完整 env；
- Prompt capture 默认关；
- Source blob 默认关；
- stdout 有 size cap；
- Export 遵循 Redaction；
- Retention delete 可验证；
- Crash dump 不包含 Secret。

---

# 13. Performance Acceptance

性能不能凌驾安全。

建议基线：

```text
policy eval local p95
lease consume p95
audit append p95
adapter overhead
tx prepare by workspace size
tx diff by changed files
tx commit by file count
```

性能测试必须同时验证结果语义。

---

# 14. Compatibility Matrix Gate

每个 Release：

```text
DSH current supported
DSH previous supported
Node current LTS supported
Linux
macOS
Windows
```

若某平台只能 partial sandbox，必须在报告中明确。

---

# 15. Release Evidence Bundle

Release 应生成：

```text
release-manifest.json
spec-digest.json
schema-digests.json
tck-results.json
compatibility.json
security-known-limitations.md
sbom.spdx.json
provenance.json
```

---

# 16. Ready Acceptance Audit

独立 Reviewer 需要回答：

1. Spec 是否先于 Implementation？
2. TCK 是否验证语义而非实现？
3. Fail Closed 是否真实？
4. 是否存在 Silent Degrade？
5. Guarantee Level 是否夸大？
6. Workspace TX 是否真正覆盖 Shell 写入？
7. Crash Recovery 是否注入验证？
8. Human Concurrent Edit 是否不会被覆盖？
9. Required Check Fail 是否绝不 VERIFIED？
10. Evidence Tamper 是否可检测？
11. Secret 是否默认不落盘？
12. Harness Compatibility 是否由 Feature Detection + Test 证明？
13. Process-isolation 未完成时是否明确承认 In-process Plugin Bypass？

任一关键答案为否：

```text
NOT READY
```
