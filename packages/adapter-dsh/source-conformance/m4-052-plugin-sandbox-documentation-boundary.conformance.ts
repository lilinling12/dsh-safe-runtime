import { readFile } from "node:fs/promises";

import corpusJson from "../../../fixtures/plugin-sandbox-documentation-boundary/cases.json" with { type: "json" };
import { describe, expect, it } from "vitest";

const PROFILE = "M4-052_PLUGIN_SANDBOX_DOCUMENTATION_BOUNDARY_V1" as const;
const CASE_COUNT = 24;

interface CorpusCase {
  readonly id: string;
  readonly requirement: string;
  readonly evidence: string;
}

interface Corpus {
  readonly profile: string;
  readonly pinnedHarness: {
    readonly version: string;
    readonly commit: string;
  };
  readonly cases: readonly CorpusCase[];
}

const CORPUS = corpusJson as Corpus;
const ROOT = new URL("../../../", import.meta.url);

function expectedIds(): readonly string[] {
  return Array.from(
    { length: CASE_COUNT },
    (_unused, index) => `PSDB-${String(index + 1).padStart(3, "0")}`,
  );
}

describe("M4-052 plugin-sandbox documentation boundary", () => {
  it("pins the exact corpus profile and Harness compatibility baseline", () => {
    expect(CORPUS.profile).toBe(PROFILE);
    expect(CORPUS.pinnedHarness).toEqual({
      version: "0.1.0-rc.5",
      commit: "47f943859bef60e4160492346772ded9b24f765a",
    });
  });

  it("contains exactly PSDB-001 through PSDB-024 once", () => {
    const ids = CORPUS.cases.map(({ id }) => id);
    expect(ids).toEqual(expectedIds());
    expect(new Set(ids).size).toBe(CASE_COUNT);
    expect(CORPUS.cases.every(({ requirement, evidence }) =>
      requirement.length > 0 && evidence.length > 0)).toBe(true);
  });

  it("makes the v0.1 non-sandbox boundary discoverable from README", async () => {
    const readme = await readFile(new URL("README.md", ROOT), "utf8");

    expect(readme).toContain(
      "DSH Safe Runtime v0.1 is not a sandbox for arbitrary in-process plugins.",
    );
    expect(readme).toContain("`tool-enforced` MUST NOT be presented as `process-isolated`");
    expect(readme).toContain("future process-isolated Plugin Host is tracked as M14");
    expect(readme).toContain(
      "Tool-level policy MUST NOT be described as isolation of arbitrary in-process plugins.",
    );
  });

  it("keeps the technical non-claim explicit in architecture", async () => {
    const architecture = await readFile(
      new URL("docs/architecture.md", ROOT),
      "utf8",
    );

    expect(architecture).toContain("### 7.2.1 v0.1 Plugin Sandbox Non-Claim");
    expect(architecture).toContain("不是 arbitrary in-process Plugin 的 sandbox");
    expect(architecture).toContain("tool-enforced => process-isolated");
    expect(architecture).toContain("M4-050");
    expect(architecture).toContain("M4-051");
    expect(architecture).toContain("真正的 process-isolated Plugin Host 明确属于未来 M14");
  });

  it("preserves the existing PEP-TOOL and future-M14 authority boundaries", async () => {
    const architecture = await readFile(
      new URL("docs/architecture.md", ROOT),
      "utf8",
    );
    const roadmap = await readFile(new URL("docs/roadmap.md", ROOT), "utf8");

    expect(architecture).toContain("只治理进入 Tool Pipeline 的行为");
    expect(architecture).toContain("宿主 Plugin 直接调用 Node API 不受此边界约束");
    expect(architecture).toContain("不能宣称 `process-isolated`");
    expect(roadmap).toContain("# M14 — Process-isolated Plugin Host");
    expect(roadmap).toContain("长期安全里程碑，不要提前宣称完成");
  });
});
