import corpusJson from "../../../fixtures/equivalent-shell-spelling-negative-boundary/cases.json" with { type: "json" };
import { describe, expect, it } from "vitest";

const PROFILE = "M4-051_EQUIVALENT_SHELL_SPELLING_NEGATIVE_BOUNDARY_V1" as const;
const CASE_COUNT = 24;

type EvidenceKind =
  | "REAL_RUNTIME"
  | "PINNED_RC5_SOURCE"
  | "EXISTING_AUTHORITY"
  | "REPOSITORY_SOURCE"
  | "STATIC_ARCHITECTURE"
  | "GATE_PROCESS";

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

interface EvidenceRecord {
  readonly id: string;
  readonly kind: EvidenceKind;
  readonly source: string;
}

const EVIDENCE: readonly EvidenceRecord[] = Object.freeze([
  { id: "ESSM-001", kind: "EXISTING_AUTHORITY", source: "Spec 0027 sections 4.1/4.3: accepted bash/pwsh calls remain process.exec and rawCommand is opaque" },
  { id: "ESSM-002", kind: "STATIC_ARCHITECTURE", source: "Spec 0051 sections 2.2/11 distinguish nested-effect matcher incompleteness from process.exec ToolRuntime governance" },
  { id: "ESSM-003", kind: "REPOSITORY_SOURCE", source: "docs/architecture.md PEP-TOOL/PEP-PROCESS explicitly warns equivalent shell spelling may bypass string matching and forbids Shell String as sole security semantic" },
  { id: "ESSM-004", kind: "REAL_RUNTIME", source: "m4-051-equivalent-shell-spelling-negative-boundary.conformance.ts implements the Gate-local exact substring oracle only" },
  { id: "ESSM-005", kind: "REAL_RUNTIME", source: "real witness fixes MATCH_LITERAL before reference/alternative evaluation" },
  { id: "ESSM-006", kind: "REAL_RUNTIME", source: "real witness asserts reference and alternative raw command strings are distinct" },
  { id: "ESSM-007", kind: "REAL_RUNTIME", source: "same fixed matcher yields MATCH for reference and NO_MATCH for alternative" },
  { id: "ESSM-008", kind: "REAL_RUNTIME", source: "real witness uses a unique temporary root and proves sentinel absence independently before both executions" },
  { id: "ESSM-009", kind: "REAL_RUNTIME", source: "real witness uses fixed m4-051-benign-shell-witness bytes only" },
  { id: "ESSM-010", kind: "REAL_RUNTIME", source: "reference Bash spelling succeeds and yields exact expected sentinel bytes" },
  { id: "ESSM-011", kind: "REAL_RUNTIME", source: "after target reset, alternative Bash spelling succeeds and yields the same exact sentinel bytes" },
  { id: "ESSM-012", kind: "REAL_RUNTIME", source: "effect equivalence is asserted from independent post-execution bytes, not command-text similarity" },
  { id: "ESSM-013", kind: "REAL_RUNTIME", source: "coherent witness classifies exactly EXPECTED_STRING_MATCHER_BYPASS" },
  { id: "ESSM-014", kind: "STATIC_ARCHITECTURE", source: "Spec 0051 section 6 keeps the Gate-local classification outside policy and GuaranteeLevel vocabularies" },
  { id: "ESSM-015", kind: "STATIC_ARCHITECTURE", source: "Spec 0051 section 10 forbids turning NO_MATCH into policy or authorization facts" },
  { id: "ESSM-016", kind: "EXISTING_AUTHORITY", source: "accepted M4-011 plus M4-040/M4-041 retain process.exec and ToolRuntime control authority independently of nested matcher evidence" },
  { id: "ESSM-017", kind: "STATIC_ARCHITECTURE", source: "Spec 0051 section 6.2 defines external shell/target unavailability as ENVIRONMENT_UNSUPPORTED rather than DENY" },
  { id: "ESSM-018", kind: "GATE_PROCESS", source: "Spec 0051 acceptance requires at least one supported exact-head EXPECTED_STRING_MATCHER_BYPASS witness" },
  { id: "ESSM-019", kind: "REAL_RUNTIME", source: "classification regressions reject identical commands, matcher contradictions, pre-existing target and mismatched effect bytes" },
  { id: "ESSM-020", kind: "REPOSITORY_SOURCE", source: "M4-051 executable delta adds source-conformance only and no production matcher/parser/canonicalizer" },
  { id: "ESSM-021", kind: "STATIC_ARCHITECTURE", source: "Spec 0051 section 9 explicitly refuses a shell-parser completeness claim" },
  { id: "ESSM-022", kind: "EXISTING_AUTHORITY", source: "Spec 0050 section 12 and Spec 0051 section 2.3 keep direct-host and shell-string negative boundaries distinct" },
  { id: "ESSM-023", kind: "PINNED_RC5_SOURCE", source: "Harness workflow/profile remain pinned to 0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a for Harness-specific claims" },
  { id: "ESSM-024", kind: "GATE_PROCESS", source: "Spec 0051 protocol-first boundary and current source-conformance-only executable scope preserve later-Gate separation" },
]);

const CORPUS = corpusJson as Corpus;

function expectedIds(): readonly string[] {
  return Array.from(
    { length: CASE_COUNT },
    (_unused, index) => `ESSM-${String(index + 1).padStart(3, "0")}`,
  );
}

describe("M4-051 equivalent shell spelling negative-boundary corpus coverage", () => {
  it("pins the exact profile and Harness baseline", () => {
    expect(CORPUS.profile).toBe(PROFILE);
    expect(CORPUS.pinnedHarness).toEqual({
      version: "0.1.0-rc.5",
      commit: "47f943859bef60e4160492346772ded9b24f765a",
    });
  });

  it("contains exactly ESSM-001 through ESSM-024", () => {
    const ids = CORPUS.cases.map(({ id }) => id);
    expect(ids).toEqual(expectedIds());
    expect(new Set(ids).size).toBe(CASE_COUNT);
  });

  it("binds every requirement exactly once to explicit evidence", () => {
    const corpusIds = CORPUS.cases.map(({ id }) => id);
    const evidenceIds = EVIDENCE.map(({ id }) => id);
    expect(evidenceIds).toEqual(corpusIds);
    expect(new Set(evidenceIds).size).toBe(CASE_COUNT);
    expect(EVIDENCE.every(({ source }) => source.length > 0)).toBe(true);
  });

  it("grounds matcher asymmetry and measured-effect equivalence in the same real witness", () => {
    expect(EVIDENCE.filter(({ kind }) => kind === "REAL_RUNTIME").map(({ id }) => id))
      .toEqual([
        "ESSM-004",
        "ESSM-005",
        "ESSM-006",
        "ESSM-007",
        "ESSM-008",
        "ESSM-009",
        "ESSM-010",
        "ESSM-011",
        "ESSM-012",
        "ESSM-013",
        "ESSM-019",
      ]);
  });
});
