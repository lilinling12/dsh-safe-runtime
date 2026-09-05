import corpusJson from "../../../fixtures/dsh-authoritative-tool-result/cases.json" with { type: "json" };
import { describe, expect, it } from "vitest";

const PROFILE = "M4-043_DSH_AUTHORITATIVE_TOOL_RESULT_V1" as const;
const CASE_COUNT = 32;

type EvidenceKind =
  | "REAL_RC5_RUNTIME"
  | "PINNED_RC5_SOURCE"
  | "EXISTING_CONFORMANCE"
  | "STATIC_ARCHITECTURE";

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
  { id: "DATR-001", kind: "PINNED_RC5_SOURCE", source: "feature-matrix.ts + Spec 0047 exact baseline" },
  { id: "DATR-002", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: explicit toolsFinalResultObserver requirement" },
  { id: "DATR-003", kind: "PINNED_RC5_SOURCE", source: "pinned ToolRuntime finishScheduledExecution/notifyResult + real runtime path" },
  { id: "DATR-004", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: body value differs from final observed result" },
  { id: "DATR-005", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: post-execute replacement precedes final authority" },
  { id: "DATR-006", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: definition finalizeContent wins before tools/result" },
  { id: "DATR-007", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: raw tools/result object identity equals returned object" },
  { id: "DATR-008", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: normalized digest equals digest(final result), not body value" },
  { id: "DATR-009", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: one final success completion" },
  { id: "DATR-010", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: body throw final error authority" },
  { id: "DATR-011", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: post-execute block overrides earlier body success" },
  { id: "DATR-012", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: finalizeContent throw becomes final error" },
  { id: "DATR-013", kind: "STATIC_ARCHITECTURE", source: "Spec 0047: policy/approval/body-entry intent is not execution success" },
  { id: "DATR-014", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: policy disposition classifies but digest still uses exact final result" },
  { id: "DATR-015", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: one active subscription emits one completion" },
  { id: "DATR-016", kind: "EXISTING_CONFORMANCE", source: "M3-013/M3-017 tool-result and replay-reconciliation conformance" },
  { id: "DATR-017", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: exact session/call/tool correlation" },
  { id: "DATR-018", kind: "STATIC_ARCHITECTURE", source: "Spec 0047 + runtime event surface: no actionRef/Subject synthesis" },
  { id: "DATR-019", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: agent-less result produces no session completion" },
  { id: "DATR-020", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: execution frozen before tools/result" },
  { id: "DATR-021", kind: "PINNED_RC5_SOURCE", source: "pinned ToolRuntime notifyResult emit-style callback contract" },
  { id: "DATR-022", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: synchronous observer throw contained" },
  { id: "DATR-023", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: asynchronous observer rejection contained" },
  { id: "DATR-024", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: Adapter digest failure reports observation failure only" },
  { id: "DATR-025", kind: "REAL_RC5_RUNTIME", source: "m4-043-authoritative-tool-result.conformance.ts: subscription disposal stops future delivery" },
  { id: "DATR-026", kind: "STATIC_ARCHITECTURE", source: "Spec 0047 + accepted M3-017: replay remains distinct from live authority" },
  { id: "DATR-027", kind: "STATIC_ARCHITECTURE", source: "Spec 0047: digest algorithm remains host-defined" },
  { id: "DATR-028", kind: "STATIC_ARCHITECTURE", source: "Spec 0047: result observation does not authorize raw persistence or bypass M4-045" },
  { id: "DATR-029", kind: "STATIC_ARCHITECTURE", source: "Spec 0047: success does not prove every external effect occurred/traversed ToolRuntime" },
  { id: "DATR-030", kind: "STATIC_ARCHITECTURE", source: "Spec 0047: failure does not prove external rollback or absence of side effects" },
  { id: "DATR-031", kind: "STATIC_ARCHITECTURE", source: "Spec 0047: no provider/process isolation or complete tool-enforced claim" },
  { id: "DATR-032", kind: "STATIC_ARCHITECTURE", source: "Spec 0047: M4-044/045/later Gates and PR merge remain separate" },
]);

const CORPUS = corpusJson as Corpus;

function expectedIds(): readonly string[] {
  return Array.from(
    { length: CASE_COUNT },
    (_unused, index) => `DATR-${String(index + 1).padStart(3, "0")}`,
  );
}

describe("M4-043 portable corpus evidence coverage", () => {
  it("pins the exact profile and Harness baseline", () => {
    expect(CORPUS.profile).toBe(PROFILE);
    expect(CORPUS.pinnedHarness).toEqual({
      version: "0.1.0-rc.5",
      commit: "47f943859bef60e4160492346772ded9b24f765a",
    });
  });

  it("contains exactly DATR-001 through DATR-032 with no duplicate or missing case", () => {
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

  it("keeps architecture non-claims distinct from executable final-result evidence", () => {
    expect(EVIDENCE.filter(({ kind }) => kind === "STATIC_ARCHITECTURE").map(({ id }) => id))
      .toEqual([
        "DATR-013",
        "DATR-018",
        "DATR-026",
        "DATR-027",
        "DATR-028",
        "DATR-029",
        "DATR-030",
        "DATR-031",
        "DATR-032",
      ]);
  });
});
