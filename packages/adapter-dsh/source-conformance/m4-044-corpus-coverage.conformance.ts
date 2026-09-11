import corpusJson from "../../../fixtures/approval-subsystem-uniqueness/cases.json" with { type: "json" };
import { describe, expect, it } from "vitest";

const PROFILE = "M4-044_APPROVAL_SUBSYSTEM_UNIQUENESS_V1" as const;
const CASE_COUNT = 24;

type EvidenceKind =
  | "REAL_RC5_RUNTIME"
  | "PINNED_RC5_SOURCE"
  | "EXISTING_CONFORMANCE"
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
  { id: "DAU-001", kind: "STATIC_ARCHITECTURE", source: "Spec 0048 + accepted M4-023/M4-042 authority separation" },
  { id: "DAU-002", kind: "STATIC_ARCHITECTURE", source: "Spec 0048 duplicate-owner definition" },
  { id: "DAU-003", kind: "EXISTING_CONFORMANCE", source: "M4-023 approval-routing tests: allow/deny short-circuit without provider" },
  { id: "DAU-004", kind: "EXISTING_CONFORMANCE", source: "M4-023 approval-routing tests: ask invokes one supplied port" },
  { id: "DAU-005", kind: "REPOSITORY_SOURCE", source: "capability-broker approval-routing.ts + accepted M4-023 tests" },
  { id: "DAU-006", kind: "REPOSITORY_SOURCE", source: "capability-broker package.json/import surface: no adapter-dsh or DeepSeek Harness dependency" },
  { id: "DAU-007", kind: "REAL_RC5_RUNTIME", source: "m4-044-approval-subsystem-uniqueness.conformance.ts: native ASK reaches one approval request before explicit standalone call" },
  { id: "DAU-008", kind: "PINNED_RC5_SOURCE", source: "pinned ToolRuntime.serviceAsk -> ctx.approval.request plus M4-042 runtime evidence" },
  { id: "DAU-009", kind: "REAL_RC5_RUNTIME", source: "m4-044-approval-subsystem-uniqueness.conformance.ts: native ASK leaves shared ApprovalService count at one" },
  { id: "DAU-010", kind: "REAL_RC5_RUNTIME", source: "m4-044-approval-subsystem-uniqueness.conformance.ts: same native ASK creates one service-owned audit pair" },
  { id: "DAU-011", kind: "REAL_RC5_RUNTIME", source: "m4-044-approval-subsystem-uniqueness.conformance.ts: one execution proves exactly-one native ownership before explicit standalone invocation" },
  { id: "DAU-012", kind: "REPOSITORY_SOURCE", source: "adapter-dsh binding.ts: explicit requestApproval resolves ctx.get(approval) and invokes that same service" },
  { id: "DAU-013", kind: "REAL_RC5_RUNTIME", source: "m4-044-approval-subsystem-uniqueness.conformance.ts: explicit requestApproval adds exactly one second call/pair without ToolRuntime pre-execute or body entry" },
  { id: "DAU-014", kind: "EXISTING_CONFORMANCE", source: "approval.conformance.ts: absent approval service returns UNAVAILABLE without fabricating audit" },
  { id: "DAU-015", kind: "REAL_RC5_RUNTIME", source: "M4-044 correlated audit pairs and distinct approval ids; pinned ApprovalService.request owns identity and lifecycle" },
  { id: "DAU-016", kind: "STATIC_ARCHITECTURE", source: "Spec 0048 section 9 + accepted M4-023 opaque requestRef/actionRef correlation boundary" },
  { id: "DAU-017", kind: "EXISTING_CONFORMANCE", source: "M4-023/M4-042 rejection, cancellation and unavailable tests: no secondary provider retry" },
  { id: "DAU-018", kind: "REPOSITORY_SOURCE", source: "approval-routing.ts and binding.ts: ALLOWED_ONCE is returned without a remembered grant or approval-decision cache" },
  { id: "DAU-019", kind: "REPOSITORY_SOURCE", source: "testkit fake-approval.ts and production import graph: fake approval remains test infrastructure" },
  { id: "DAU-020", kind: "REPOSITORY_SOURCE", source: "adapter-dsh package/import surface: no @dsh-safe/testkit production dependency" },
  { id: "DAU-021", kind: "REPOSITORY_SOURCE", source: "binding.ts/capability-broker approval-routing source audit: no second approval decision cache, queue, fallback or durable lifecycle" },
  { id: "DAU-022", kind: "GATE_PROCESS", source: "Spec 0048 protocol-first rule and exact-head dual-green prerequisite" },
  { id: "DAU-023", kind: "PINNED_RC5_SOURCE", source: "feature-matrix.ts and Harness workflow pin 0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a" },
  { id: "DAU-024", kind: "STATIC_ARCHITECTURE", source: "Spec 0048 Gate separation: M4-045/M4-050+/M5/PR merge remain untouched" },
]);

const CORPUS = corpusJson as Corpus;

function expectedIds(): readonly string[] {
  return Array.from(
    { length: CASE_COUNT },
    (_unused, index) => `DAU-${String(index + 1).padStart(3, "0")}`,
  );
}

describe("M4-044 approval subsystem uniqueness corpus coverage", () => {
  it("pins the exact profile and Harness baseline", () => {
    expect(CORPUS.profile).toBe(PROFILE);
    expect(CORPUS.pinnedHarness).toEqual({
      version: "0.1.0-rc.5",
      commit: "47f943859bef60e4160492346772ded9b24f765a",
    });
  });

  it("contains exactly DAU-001 through DAU-024 with no duplicate or missing case", () => {
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

  it("keeps repository/source claims separate from executable runtime ownership proof", () => {
    expect(EVIDENCE.filter(({ kind }) => kind === "REAL_RC5_RUNTIME").map(({ id }) => id))
      .toEqual(["DAU-007", "DAU-009", "DAU-010", "DAU-011", "DAU-013", "DAU-015"]);
  });
});
