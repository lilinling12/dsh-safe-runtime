import corpusJson from "../../../fixtures/direct-host-fs-negative-boundary/cases.json" with { type: "json" };
import { describe, expect, it } from "vitest";

const PROFILE = "M4-050_DIRECT_HOST_FS_NEGATIVE_BOUNDARY_V1" as const;
const CASE_COUNT = 24;

type EvidenceKind =
  | "REAL_RC5_RUNTIME"
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
  { id: "DHFS-001", kind: "EXISTING_AUTHORITY", source: "Spec 0045 section 15/21: direct Node fs is outside M4-041 complete-coverage claim" },
  { id: "DHFS-002", kind: "REAL_RC5_RUNTIME", source: "m4-050-direct-host-fs-negative-boundary.conformance.ts uses node:fs directly and never invokes ctx.tools.execute or Adapter fs ports" },
  { id: "DHFS-003", kind: "REAL_RC5_RUNTIME", source: "real witness creates a unique test-owned temporary root and proves sentinel absence before mutation" },
  { id: "DHFS-004", kind: "STATIC_ARCHITECTURE", source: "Spec 0050 safe-test-target and no-secret-bearing-proof requirements" },
  { id: "DHFS-005", kind: "REAL_RC5_RUNTIME", source: "real witness writes fixed benign bytes and reads the exact bytes back from the same sentinel" },
  { id: "DHFS-006", kind: "REAL_RC5_RUNTIME", source: "same measured witness has zero raw tools/pre-execute and zero tools/result observations" },
  { id: "DHFS-007", kind: "REAL_RC5_RUNTIME", source: "same measured witness has zero safe-runtime registerToolPolicy handler invocations" },
  { id: "DHFS-008", kind: "REAL_RC5_RUNTIME", source: "same measured witness has zero safe-runtime monotonic guard handler invocations" },
  { id: "DHFS-009", kind: "REAL_RC5_RUNTIME", source: "registered witness tool body remains unentered and no tools/result is emitted" },
  { id: "DHFS-010", kind: "REAL_RC5_RUNTIME", source: "coherent real evidence classifies exactly EXPECTED_UNGOVERNED" },
  { id: "DHFS-011", kind: "STATIC_ARCHITECTURE", source: "Spec 0050 keeps EXPECTED_UNGOVERNED outside CapabilityDecision/GuaranteeLevel vocabularies" },
  { id: "DHFS-012", kind: "STATIC_ARCHITECTURE", source: "Spec 0050 forbids retrospective CapabilityRequest/Decision/Receipt/Lease/approval fabrication" },
  { id: "DHFS-013", kind: "STATIC_ARCHITECTURE", source: "Spec 0050 environment-unsupported classification boundary" },
  { id: "DHFS-014", kind: "GATE_PROCESS", source: "Spec 0050 acceptance requires at least one supported exact-head EXPECTED_UNGOVERNED witness" },
  { id: "DHFS-015", kind: "REAL_RC5_RUNTIME", source: "real witness classification regressions reject pre-existing sentinel, byte mismatch and ToolRuntime contradiction" },
  { id: "DHFS-016", kind: "REPOSITORY_SOURCE", source: "M4-050 implementation delta is source-conformance only; no node:fs interception or production isolation hook is added" },
  { id: "DHFS-017", kind: "GATE_PROCESS", source: "Spec 0050 requires no speculative production rewrite absent a false-claim defect" },
  { id: "DHFS-018", kind: "REAL_RC5_RUNTIME", source: "measured witness intentionally calls node:fs directly rather than Adapter filesystem ports" },
  { id: "DHFS-019", kind: "STATIC_ARCHITECTURE", source: "Spec 0050 excludes shell/subprocess equivalence and preserves M4-051/M6 separation" },
  { id: "DHFS-020", kind: "STATIC_ARCHITECTURE", source: "Spec 0050 plus accepted M4-025/M4-041 boundaries prohibit complete filesystem enforcement overclaim" },
  { id: "DHFS-021", kind: "REPOSITORY_SOURCE", source: "roadmap keeps M14 process-isolated plugin host unimplemented while M4 remains in-process" },
  { id: "DHFS-022", kind: "EXISTING_AUTHORITY", source: "Spec 0049 audit admission owns accepted Harness source facts and does not intercept arbitrary direct host fs calls" },
  { id: "DHFS-023", kind: "PINNED_RC5_SOURCE", source: "Harness workflow and profile remain pinned to 0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a" },
  { id: "DHFS-024", kind: "GATE_PROCESS", source: "Spec 0050 protocol-first boundary and current two-file source-conformance implementation scope" },
]);

const CORPUS = corpusJson as Corpus;

function expectedIds(): readonly string[] {
  return Array.from(
    { length: CASE_COUNT },
    (_unused, index) => `DHFS-${String(index + 1).padStart(3, "0")}`,
  );
}

describe("M4-050 direct host fs negative-boundary corpus coverage", () => {
  it("pins the exact profile and Harness baseline", () => {
    expect(CORPUS.profile).toBe(PROFILE);
    expect(CORPUS.pinnedHarness).toEqual({
      version: "0.1.0-rc.5",
      commit: "47f943859bef60e4160492346772ded9b24f765a",
    });
  });

  it("contains exactly DHFS-001 through DHFS-024", () => {
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

  it("keeps the actual bypass classification grounded in the same real runtime witness", () => {
    expect(EVIDENCE.filter(({ kind }) => kind === "REAL_RC5_RUNTIME").map(({ id }) => id))
      .toEqual([
        "DHFS-002",
        "DHFS-003",
        "DHFS-005",
        "DHFS-006",
        "DHFS-007",
        "DHFS-008",
        "DHFS-009",
        "DHFS-010",
        "DHFS-015",
        "DHFS-018",
      ]);
  });
});
