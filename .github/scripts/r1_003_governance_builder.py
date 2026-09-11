from __future__ import annotations

import base64
import json
import os
import subprocess
import urllib.request
from pathlib import Path

REPO = "lilinling12/dsh-safe-runtime"
BASE = "fea37f8574585813f6c6c264a9d2c548286a6a41"
CURRENT_BLOB = "4cf15d73fc213d50b5df18c9d5685dc153ee8bdd"
RESULT_BRANCH = "tmp/r1-003-governance-result-20260911"


def run(*args: str) -> str:
    completed = subprocess.run(args, check=True, text=True, capture_output=True)
    return completed.stdout.strip()


def fetch_blob(blob_sha: str) -> bytes:
    request = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/git/blobs/{blob_sha}",
        headers={
            "Authorization": f"Bearer {os.environ['GH_TOKEN']}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "r1-003-governance-builder",
        },
    )
    with urllib.request.urlopen(request) as response:
        payload = json.load(response)
    if payload.get("encoding") != "base64":
        raise RuntimeError("unexpected GitHub blob encoding")
    return base64.b64decode(payload["content"])


current = fetch_blob(CURRENT_BLOB)
Path("docs/handoff/CURRENT.md").write_bytes(current)

history_path = Path("docs/handoff/HISTORY.md")
history = history_path.read_bytes()
if not history.endswith(b"\n"):
    raise RuntimeError("HISTORY base must end with newline before append")

appendix = r'''
## 2026-09-11 — Accept R1-003 native DeepSeek plugin/bootstrap integration

R1-003 protocol-first exact head
`fa89e3993c812aafa0325fab6b33dc339d7323dc` froze Spec 0057 and the
`DPB-001` through `DPB-032` corpus before production implementation. That exact
head passed normal CI #678 / run `34425239915` and exact pinned Harness rc5
source-conformance #620 / run `34425239924`.

The final reviewed implementation/conformance head is
`bbe3f18625de565564e57073599efd66baafd826`. The package root adds the
programmatic native Cordis bootstrap `createDshRc5Plugin(options)` and only the
narrow public plugin types required by that entry. It reuses the accepted R1-002
Adapter rather than creating another plugin manager, policy runtime, approval
provider or lifecycle subsystem.

Accepted behavior includes:

- omitted policy is fail-closed `DENY_ALL`;
- `DENY_ALL` installs both tool-policy DENY and monotonic-guard DENY with the
  stable reason `safe-runtime plugin default deny`;
- required ToolRuntime features are preflighted and missing support fails
  activation rather than silently weakening the guarantee;
- HANDLER mode installs the exact supplied policy handler once and installs a
  monotonic guard only when one is explicitly supplied;
- reached ASK remains owned by the native ToolRuntime -> ApprovalService path,
  with no duplicate Adapter `requestApproval()` call;
- agent-less ASK remains fail closed;
- activation rollback awaits Adapter disposal;
- successful Cordis Fiber disposal awaits aggregate Adapter teardown;
- caller-owned Context/services/listeners remain outside plugin ownership and a
  later remount is independent.

Exact reviewed implementation evidence:

```text
bbe3f18625de565564e57073599efd66baafd826
CI #681 / run 34445638834: PASS
Harness #623 / run 34445638813: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

Acceptance audit `docs/acceptance/r1-003-plugin-bootstrap-integration.md` is at
exact audit head `fea37f8574585813f6c6c264a9d2c548286a6a41`. That exact head
passed:

```text
CI #682 / run 34446201887: PASS
Harness #624 / run 34446201886: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

The accepted boundary is deliberately programmatic and same-process. It does not
claim arbitrary in-process plugin sandboxing, process isolation, complete direct
Node filesystem/process/network/secret mediation, provider/resource identity
inference, complete Capability Broker PEP composition, external-effect rollback,
publishable package metadata, external tarball installability, bare `cordis.yml`
Loader readiness, future Harness-version compatibility, registry publication or
GitHub Release readiness.

This final governance transition is restricted to CURRENT, this append-only
HISTORY entry and only the R1-003 roadmap acceptance marker/details. It changes
no production source, source-conformance, Spec/corpus/Schema, Shared TCK,
dependency/lockfile state, Harness baseline/workflow, R1-004 implementation,
M5-003+ work, registry state, GitHub Release state or PR merge/readiness state.

The resulting governance exact head must itself reach normal CI plus exact pinned
Harness rc5 source-conformance dual-green, including step 10 and step 11. Only
after that same exact SHA is dual-green is R1-003 GOVERNANCE CLOSED and R1-004
P0 publishable-package protocol/design work newly authorized. R1-005+ remains
unauthorized; M5-003+ remains paused; PR #3 remains Open / Draft / unmerged and
merge still requires explicit user authorization.
'''.encode("utf-8")
history_path.write_bytes(history + appendix)

roadmap_path = Path("docs/roadmap.md")
roadmap = roadmap_path.read_text(encoding="utf-8")
old = "- [ ] `R1-003 P0` DeepSeek plugin/bootstrap integration。"
new = "- [x] `R1-003 P0` DeepSeek plugin/bootstrap integration。 **ACCEPTED：Spec 0057 + DPB-001..032 + native Cordis programmatic bootstrap + default-deny/ASK/disposal lifecycle conformance；final reviewed implementation head `bbe3f186...`, CI #681 / Harness #623 PASS；验收记录 `docs/acceptance/r1-003-plugin-bootstrap-integration.md` at `fea37f857...`, CI #682 / Harness #624 PASS。Package publishability remains R1-004；same-process bootstrap remains non-sandbox and does not claim complete host-effect mediation.**"
count = roadmap.count(old)
if count != 1:
    raise RuntimeError(f"expected exactly one unchecked R1-003 marker, found {count}")
roadmap_path.write_text(roadmap.replace(old, new, 1), encoding="utf-8")

run("git", "diff", "--check", BASE)
changed = run("git", "diff", "--name-only", BASE).splitlines()
expected = ["docs/handoff/CURRENT.md", "docs/handoff/HISTORY.md", "docs/roadmap.md"]
if sorted(changed) != sorted(expected):
    raise RuntimeError(f"unexpected governance file set: {changed}")

history_stats = run("git", "diff", "--numstat", BASE, "--", "docs/handoff/HISTORY.md").split()
if len(history_stats) < 2 or history_stats[1] != "0":
    raise RuntimeError(f"HISTORY is not append-only: {history_stats}")

roadmap_stats = run("git", "diff", "--numstat", BASE, "--", "docs/roadmap.md").split()
if len(roadmap_stats) < 2 or roadmap_stats[0] != "1" or roadmap_stats[1] != "1":
    raise RuntimeError(f"roadmap change is not one-line replacement: {roadmap_stats}")

run("git", "config", "user.name", "github-actions[bot]")
run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
run("git", "add", "docs/handoff/CURRENT.md", "docs/handoff/HISTORY.md", "docs/roadmap.md")
run("git", "commit", "-m", "docs(r1-003): close plugin bootstrap governance")
head = run("git", "rev-parse", "HEAD")
run("git", "push", "origin", f"HEAD:refs/heads/{RESULT_BRANCH}")
print(head)
