import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const PROFILE = "M4-040_DSH_PRE_EXECUTE_REGISTRATION_V1" as const;
const CASE_COUNT = 24;

type EvidenceKind =
  | "REAL_RC5_RUNTIME"
  | "EXISTING_CONFORMANCE"
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
 * M4-040 deliberately distinguishes executable Harness facts from architecture
 * non-claims. A static boundary is not promoted to runtime enforcement merely
 * so every portable case can be called a runtime test.
 */
const EVIDENCE: readonly EvidenceRecord[] = Object.freeze([
  { id: "DPER-001", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: agent projection" },
  { id: "DPER-002", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: host projection" },
  { id: "DPER-003", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: nested root identity" },
  { id: "DPER-004", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: opaque tool name" },
  { id: "DPER-005", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: frozen exact arguments reference" },
  { id: "DPER-006", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: ALLOW to downstream ALLOW" },
  { id: "DPER-007", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: ALLOW to downstream DENY" },
  { id: "DPER-008", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: ALLOW to downstream ASK" },
  { id: "DPER-009", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: DENY short-circuit" },
  { id: "DPER-010", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: ASK short-circuit" },
  { id: "DPER-011", kind: "EXISTING_CONFORMANCE", source: "binding.ts exact ASK-without-reason branch plus tool-policy.conformance.ts real ASK path" },
  { id: "DPER-012", kind: "EXISTING_CONFORMANCE", source: "tool-policy.conformance.ts: synchronous throw fails closed" },
  { id: "DPER-013", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: async rejection fails closed" },
  { id: "DPER-014", kind: "EXISTING_CONFORMANCE", source: "tool-policy.conformance.ts: registration disposal" },
  { id: "DPER-015", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: toolsPreExecute feature gate" },
  { id: "DPER-016", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: earlier waterfall short-circuit" },
  { id: "DPER-017", kind: "STATIC_ARCHITECTURE", source: "Spec 0044: reorderable waterfall is not a hard enforcement claim" },
  { id: "DPER-018", kind: "STATIC_ARCHITECTURE", source: "binding.ts: ASK returns Harness decision and does not call adapter requestApproval" },
  { id: "DPER-019", kind: "STATIC_ARCHITECTURE", source: "Spec 0003 + Spec 0044: tools/result remains authoritative final outcome" },
  { id: "DPER-020", kind: "STATIC_ARCHITECTURE", source: "Spec 0044: no multi-requirement classifier/PDP aggregation in M4-040" },
  { id: "DPER-021", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: host scope projection" },
  { id: "DPER-022", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: exact agent scope refs" },
  { id: "DPER-023", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: no turnRef synthesis" },
  { id: "DPER-024", kind: "REAL_RC5_RUNTIME", source: "m4-040-pre-execute-registration.conformance.ts: no GuaranteeLevel synthesis" },
]);

async function loadCorpus(): Promise<Corpus> {
  const url = new URL(
    "../../../fixtures/dsh-pre-execute-registration/cases.json",
    import.meta.url,
  );
  return JSON.parse(await readFile(url, "utf8")) as Corpus;
}

function expectedIds(): readonly string[] {
  return Array.from(
    { length: CASE_COUNT },
    (_unused, index) => `DPER-${String(index + 1).padStart(3, "0")}`,
  );
}

describe("M4-040 portable corpus evidence coverage", () => {
  it("pins the exact profile and Harness source baseline", async () => {
    const corpus = await loadCorpus();

    expect(corpus.profile).toBe(PROFILE);
    expect(corpus.pinnedHarness).toEqual({
      version: "0.1.0-rc.5",
      commit: "47f943859bef60e4160492346772ded9b24f765a",
    });
  });

  it("contains exactly DPER-001 through DPER-024 with no duplicate or missing case", async () => {
    const corpus = await loadCorpus();
    const ids = corpus.cases.map(({ id }) => id);

    expect(ids).toEqual(expectedIds());
    expect(new Set(ids).size).toBe(CASE_COUNT);
  });

  it("binds every portable case exactly once to an explicit evidence class", async () => {
    const corpus = await loadCorpus();
    const corpusIds = corpus.cases.map(({ id }) => id);
    const evidenceIds = EVIDENCE.map(({ id }) => id);

    expect(evidenceIds).toEqual(corpusIds);
    expect(new Set(evidenceIds).size).toBe(CASE_COUNT);
    expect(EVIDENCE.every(({ source }) => source.length > 0)).toBe(true);
  });

  it("keeps architecture non-claims visibly distinct from real rc5 runtime evidence", () => {
    const staticIds = EVIDENCE
      .filter(({ kind }) => kind === "STATIC_ARCHITECTURE")
      .map(({ id }) => id);

    expect(staticIds).toEqual([
      "DPER-017",
      "DPER-018",
      "DPER-019",
      "DPER-020",
    ]);
  });
});
