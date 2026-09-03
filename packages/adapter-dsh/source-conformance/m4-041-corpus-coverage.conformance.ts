import corpusJson from "../../../fixtures/dsh-monotonic-tool-guard/cases.json" with { type: "json" };
import { describe, expect, it } from "vitest";

const PROFILE = "M4-041_DSH_MONOTONIC_TOOL_GUARD_V1" as const;
const CASE_COUNT = 32;

type EvidenceKind =
  | "REAL_RC5_RUNTIME"
  | "NORMAL_CI_RUNTIME"
  | "PINNED_RC5_SOURCE_TEST"
  | "STATIC_ARCHITECTURE";

interface CorpusCase {
  readonly id: string;
  readonly scenario: string;
}

interface Corpus {
  readonly profile: string;
  readonly pinnedHarness: {
    readonly version: string;
    readonly commit: string;
  };
  readonly cases: readonly CorpusCase[];
}

interface EvidenceRecord {
  readonly id: string;
  readonly kind: EvidenceKind;
  readonly source: string;
}

/**
 * Keep portable cases bound to their strongest direct evidence without
 * pretending architecture non-claims are executable runtime assertions.
 */
const EVIDENCE: readonly EvidenceRecord[] = Object.freeze([
  { id: "DMGR-001", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: explicit feature requirement" },
  { id: "DMGR-002", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: host projection" },
  { id: "DMGR-003", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: agent projection" },
  { id: "DMGR-004", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: nested root identity" },
  { id: "DMGR-005", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: exact frozen arguments reference" },
  { id: "DMGR-006", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: ALLOW abstention reaches body" },
  { id: "DMGR-007", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: exact DENY prevents body" },
  { id: "DMGR-008", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: empty-string denial remains denial" },
  { id: "DMGR-009", kind: "REAL_RC5_RUNTIME", source: "tool-policy.conformance.ts plus monotonic-tool-guard evaluator: throwing handler fail closed" },
  { id: "DMGR-010", kind: "NORMAL_CI_RUNTIME", source: "monotonic-tool-guard.test.ts: null result" },
  { id: "DMGR-011", kind: "NORMAL_CI_RUNTIME", source: "monotonic-tool-guard.test.ts: non-object results" },
  { id: "DMGR-012", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: Promise result fail closed without await" },
  { id: "DMGR-013", kind: "NORMAL_CI_RUNTIME", source: "monotonic-tool-guard.test.ts: missing kind" },
  { id: "DMGR-014", kind: "NORMAL_CI_RUNTIME", source: "monotonic-tool-guard.test.ts: unknown kind" },
  { id: "DMGR-015", kind: "NORMAL_CI_RUNTIME", source: "monotonic-tool-guard.test.ts: non-string DENY reason" },
  { id: "DMGR-016", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: accessor kind not invoked" },
  { id: "DMGR-017", kind: "NORMAL_CI_RUNTIME", source: "monotonic-tool-guard.test.ts: accessor reason not invoked" },
  { id: "DMGR-018", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: revoked Proxy fail closed" },
  { id: "DMGR-019", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: pre-execute ALLOW cannot reopen guard DENY" },
  { id: "DMGR-020", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: prepended pre-execute ALLOW cannot bypass guard DENY" },
  { id: "DMGR-021", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: multiple guard monotonic composition" },
  { id: "DMGR-022", kind: "PINNED_RC5_SOURCE_TEST", source: "deepseek-harness@47f94385 packages/core/tools/tests/scoped.spec.ts: scoped guard isolation" },
  { id: "DMGR-023", kind: "PINNED_RC5_SOURCE_TEST", source: "deepseek-harness@47f94385 packages/core/tools/tests/scoped.spec.ts: scoped guard excludes subject-less calls" },
  { id: "DMGR-024", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: plain-context host guard denial" },
  { id: "DMGR-025", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: duplicate disposal independence" },
  { id: "DMGR-026", kind: "REAL_RC5_RUNTIME", source: "m4-041-monotonic-tool-guard.conformance.ts: complete registration disposal" },
  { id: "DMGR-027", kind: "STATIC_ARCHITECTURE", source: "ports.ts + Spec 0045: ToolGuardDecision domain is ALLOW/DENY only and binding does not request approval" },
  { id: "DMGR-028", kind: "STATIC_ARCHITECTURE", source: "Spec 0045: monotonic ToolRuntime guard is not complete host-effect enforcement" },
  { id: "DMGR-029", kind: "STATIC_ARCHITECTURE", source: "Spec 0045: guard ALLOW means abstain, not final CapabilityDecision authorization" },
  { id: "DMGR-030", kind: "STATIC_ARCHITECTURE", source: "Spec 0045: classifier/PDP aggregation explicitly out of scope" },
  { id: "DMGR-031", kind: "STATIC_ARCHITECTURE", source: "Spec 0003 + Spec 0045: tools/result remains authoritative final outcome" },
  { id: "DMGR-032", kind: "PINNED_RC5_SOURCE_TEST", source: "deepseek-harness@47f94385 live guard iteration behavior is compatibility-only, explicitly excluded from portable dependency" },
]);

const CORPUS = corpusJson as Corpus;

function expectedIds(): readonly string[] {
  return Array.from(
    { length: CASE_COUNT },
    (_unused, index) => `DMGR-${String(index + 1).padStart(3, "0")}`,
  );
}

describe("M4-041 portable corpus evidence coverage", () => {
  it("pins the exact profile and Harness source baseline", () => {
    expect(CORPUS.profile).toBe(PROFILE);
    expect(CORPUS.pinnedHarness).toEqual({
      version: "0.1.0-rc.5",
      commit: "47f943859bef60e4160492346772ded9b24f765a",
    });
  });

  it("contains exactly DMGR-001 through DMGR-032 with no duplicate or missing case", () => {
    const ids = CORPUS.cases.map(({ id }) => id);
    expect(ids).toEqual(expectedIds());
    expect(new Set(ids).size).toBe(CASE_COUNT);
  });

  it("binds every portable case exactly once to explicit evidence", () => {
    const corpusIds = CORPUS.cases.map(({ id }) => id);
    const evidenceIds = EVIDENCE.map(({ id }) => id);
    expect(evidenceIds).toEqual(corpusIds);
    expect(new Set(evidenceIds).size).toBe(CASE_COUNT);
    expect(EVIDENCE.every(({ source }) => source.length > 0)).toBe(true);
  });

  it("keeps architecture limitations distinct from executable enforcement evidence", () => {
    expect(EVIDENCE.filter(({ kind }) => kind === "STATIC_ARCHITECTURE").map(({ id }) => id))
      .toEqual(["DMGR-027", "DMGR-028", "DMGR-029", "DMGR-030", "DMGR-031"]);
  });
});
