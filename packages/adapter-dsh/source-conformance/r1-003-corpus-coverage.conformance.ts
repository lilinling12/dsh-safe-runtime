import corpusJson from "../../../fixtures/dsh-plugin-bootstrap/cases.json" with { type: "json" };
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const PROFILE = "R1-003_DSH_PLUGIN_BOOTSTRAP_V1" as const;
const CASE_COUNT = 32;

type EvidenceKind =
  | "PREDECESSOR_GATE"
  | "GOVERNANCE"
  | "REAL_RC5_RUNTIME"
  | "PINNED_RC5_TYPECHECK"
  | "SOURCE_CONFORMANCE"
  | "STATIC_BOUNDARY";

interface CorpusCase {
  readonly id: string;
  readonly class: string;
  readonly requirement: string;
}

interface Corpus {
  readonly profile: string;
  readonly gate: string;
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
  { id: "DPB-001", kind: "PREDECESSOR_GATE", source: "R1-002 governance exact-head dual-green authority in Spec 0057 and handoff" },
  { id: "DPB-002", kind: "GOVERNANCE", source: "PR #3 remains Draft/Open; R1-004+ and merge remain outside this implementation delta" },
  { id: "DPB-003", kind: "SOURCE_CONFORMANCE", source: "public-api.conformance.ts: curated createDshRc5Plugin package-root surface" },
  { id: "DPB-004", kind: "REAL_RC5_RUNTIME", source: "r1-003-plugin-bootstrap.conformance.ts: native ctx.plugin(plugin) mounting" },
  { id: "DPB-005", kind: "REAL_RC5_RUNTIME", source: "r1-003-plugin-bootstrap.conformance.ts: factory-before-mount body execution" },
  { id: "DPB-006", kind: "SOURCE_CONFORMANCE", source: "r1-003-plugin-bootstrap.conformance.ts: accessor, symbol and revoked Proxy rejection" },
  { id: "DPB-007", kind: "REAL_RC5_RUNTIME", source: "r1-003-plugin-bootstrap.conformance.ts: nested Adapter accessor remains INVALID_ADAPTER_OPTIONS" },
  { id: "DPB-008", kind: "REAL_RC5_RUNTIME", source: "r1-003-plugin-bootstrap.conformance.ts: detached HANDLER identity" },
  { id: "DPB-009", kind: "REAL_RC5_RUNTIME", source: "r1-003-plugin-bootstrap.conformance.ts: omitted default deny plus source snapshot equivalence" },
  { id: "DPB-010", kind: "REAL_RC5_RUNTIME", source: "r1-003-plugin-bootstrap.conformance.ts: policy deny and monotonic deny stable reason" },
  { id: "DPB-011", kind: "PINNED_RC5_TYPECHECK", source: "plugin.ts feature preflight over exact pinned AdapterFeatureMatrix" },
  { id: "DPB-012", kind: "REAL_RC5_RUNTIME", source: "r1-003-plugin-bootstrap.conformance.ts: prepended ALLOW cannot bypass monotonic default deny" },
  { id: "DPB-013", kind: "REAL_RC5_RUNTIME", source: "r1-003-plugin-bootstrap.conformance.ts: exact HANDLER invocation" },
  { id: "DPB-014", kind: "REAL_RC5_RUNTIME", source: "r1-003-plugin-bootstrap.conformance.ts plus M4-040: HANDLER ALLOW delegates" },
  { id: "DPB-015", kind: "REAL_RC5_RUNTIME", source: "R1-003 HANDLER denial plus accepted M4-040 handler rejection fail-closed conformance" },
  { id: "DPB-016", kind: "STATIC_BOUNDARY", source: "plugin.ts contains no requestApproval call; native ASK runtime is separately exercised" },
  { id: "DPB-017", kind: "REAL_RC5_RUNTIME", source: "r1-003-plugin-bootstrap.conformance.ts: exactly one native approval/request for reached ASK" },
  { id: "DPB-018", kind: "REAL_RC5_RUNTIME", source: "r1-003-plugin-bootstrap.conformance.ts: agent-less ASK no approval request/body entry" },
  { id: "DPB-019", kind: "REAL_RC5_RUNTIME", source: "r1-003-plugin-bootstrap.conformance.ts: explicit monotonicGuard invoked once" },
  { id: "DPB-020", kind: "STATIC_BOUNDARY", source: "plugin.ts registers no derived guard in HANDLER without monotonicGuard" },
  { id: "DPB-021", kind: "SOURCE_CONFORMANCE", source: "plugin.ts: one Adapter construction followed by feature preflight/registration transaction" },
  { id: "DPB-022", kind: "SOURCE_CONFORMANCE", source: "plugin.ts: post-construction activation failure awaits Adapter rollback" },
  { id: "DPB-023", kind: "REAL_RC5_RUNTIME", source: "r1-003-plugin-bootstrap.conformance.ts: Fiber-owned async disposer reaches terminal disposal" },
  { id: "DPB-024", kind: "REAL_RC5_RUNTIME", source: "r1-003-plugin-bootstrap.conformance.ts: old handler removed and root remains usable" },
  { id: "DPB-025", kind: "REAL_RC5_RUNTIME", source: "r1-003-plugin-bootstrap.conformance.ts: independent remount state" },
  { id: "DPB-026", kind: "STATIC_BOUNDARY", source: "plugin.ts source audit: no execution-root/provider/workspace/hostfs/executable/workdir composition" },
  { id: "DPB-027", kind: "STATIC_BOUNDARY", source: "plugin.ts reuses R1-002 Adapter/Cordis lifecycle and defines no duplicate subsystem" },
  { id: "DPB-028", kind: "STATIC_BOUNDARY", source: "Spec 0057 same-process security/non-sandbox boundary remains normative" },
  { id: "DPB-029", kind: "SOURCE_CONFORMANCE", source: "public-api.conformance.ts exact runtime allowlist and negative M2 imports" },
  { id: "DPB-030", kind: "STATIC_BOUNDARY", source: "implementation delta leaves package publication metadata and Loader UX unchanged" },
  { id: "DPB-031", kind: "REAL_RC5_RUNTIME", source: "Harness workflow pins 0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a" },
  { id: "DPB-032", kind: "PREDECESSOR_GATE", source: "implementation commit descends directly from fa89e3993c812aafa0325fab6b33dc339d7323dc" },
]);

const CORPUS = corpusJson as Corpus;

function expectedIds(): readonly string[] {
  return Array.from(
    { length: CASE_COUNT },
    (_unused, index) => `DPB-${String(index + 1).padStart(3, "0")}`,
  );
}

describe("R1-003 plugin bootstrap corpus evidence coverage", () => {
  it("pins the exact profile, case set and Harness source baseline", () => {
    expect(CORPUS.profile).toBe(PROFILE);
    expect(CORPUS.pinnedHarness).toEqual({
      version: "0.1.0-rc.5",
      commit: "47f943859bef60e4160492346772ded9b24f765a",
    });
    const ids = CORPUS.cases.map(({ id }) => id);
    expect(ids).toEqual(expectedIds());
    expect(new Set(ids).size).toBe(CASE_COUNT);
  });

  it("binds every DPB case exactly once to explicit evidence", () => {
    const corpusIds = CORPUS.cases.map(({ id }) => id);
    const evidenceIds = EVIDENCE.map(({ id }) => id);
    expect(evidenceIds).toEqual(corpusIds);
    expect(new Set(evidenceIds).size).toBe(CASE_COUNT);
    expect(EVIDENCE.every(({ source }) => source.length > 0)).toBe(true);
  });

  it("keeps native-runtime facts distinct from static architecture boundaries", () => {
    expect(EVIDENCE.filter(({ kind }) => kind === "REAL_RC5_RUNTIME").length).toBeGreaterThan(0);
    expect(EVIDENCE.filter(({ kind }) => kind === "STATIC_BOUNDARY").map(({ id }) => id))
      .toEqual(["DPB-016", "DPB-020", "DPB-026", "DPB-027", "DPB-028", "DPB-030"]);
  });

  it("contains no premature approval or resource-authority composition in plugin source", async () => {
    const source = await readFile(new URL("../src/plugin.ts", import.meta.url), "utf8");
    expect(source).not.toContain(".requestApproval(");
    expect(source).not.toContain("CapabilityPolicy");
    expect(source).not.toContain("EXECUTION_ROOT");
    expect(source).not.toContain("workspace://");
    expect(source).not.toContain("hostfs://");
  });
});
