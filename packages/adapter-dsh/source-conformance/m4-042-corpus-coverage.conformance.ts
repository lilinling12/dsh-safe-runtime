import corpusJson from "../../../fixtures/dsh-approval-routing/cases.json" with { type: "json" };
import { describe, expect, it } from "vitest";

const PROFILE = "M4-042_DSH_NATIVE_APPROVAL_ROUTING_V1" as const;
const CASE_COUNT = 32;

type EvidenceKind =
  | "REAL_RC5_RUNTIME"
  | "PINNED_RC5_SOURCE"
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

/** Bind every portable requirement to direct runtime/source evidence or an explicit non-claim. */
const EVIDENCE: readonly EvidenceRecord[] = Object.freeze([
  { id: "DAPR-001", kind: "PINNED_RC5_SOURCE", source: "feature-matrix.ts + Spec 0046 pinned baseline" },
  { id: "DAPR-002", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: ALLOW no approval" },
  { id: "DAPR-003", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: DENY no approval/body" },
  { id: "DAPR-004", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: ASK reason omission" },
  { id: "DAPR-005", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: exact ASK reason" },
  { id: "DAPR-006", kind: "PINNED_RC5_SOURCE", source: "deepseek-harness ToolRuntime.serviceAsk + real ASK runtime path" },
  { id: "DAPR-007", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: exactly one approval/request" },
  { id: "DAPR-008", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: exact agent identity" },
  { id: "DAPR-009", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: exact toolName/callId" },
  { id: "DAPR-010", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: reason/signal projection" },
  { id: "DAPR-011", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: allowed-once proceeds" },
  { id: "DAPR-012", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: allowed-once then guard deny" },
  { id: "DAPR-013", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: ordinary body entry after allowed-once" },
  { id: "DAPR-014", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: rejected no body" },
  { id: "DAPR-015", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: cancellation wins over late allow" },
  { id: "DAPR-016", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: no-answer unavailable audit pair" },
  { id: "DAPR-017", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: throwing answerer unavailable" },
  { id: "DAPR-018", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: malformed answer unavailable" },
  { id: "DAPR-019", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: service absent fail closed" },
  { id: "DAPR-020", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: agent-less ASK fail closed" },
  { id: "DAPR-021", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: asked/decided shared id" },
  { id: "DAPR-022", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: native audit correlation fields" },
  { id: "DAPR-023", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: normalized approval.decided" },
  { id: "DAPR-024", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: never policy before answerer" },
  { id: "DAPR-025", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: open-turn precondition" },
  { id: "DAPR-026", kind: "PINNED_RC5_SOURCE", source: "deepseek-harness ApprovalService.request audit append failure contract" },
  { id: "DAPR-027", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: earlier waterfall termination" },
  { id: "DAPR-028", kind: "REAL_RC5_RUNTIME", source: "m4-042-native-approval-routing.conformance.ts: outer listener replaces downstream ASK" },
  { id: "DAPR-029", kind: "STATIC_ARCHITECTURE", source: "Spec 0046 + accepted M4-023: actionRef is not Harness callId" },
  { id: "DAPR-030", kind: "STATIC_ARCHITECTURE", source: "binding.ts + Spec 0046: standalone requestApproval is not called from registerToolPolicy ASK" },
  { id: "DAPR-031", kind: "STATIC_ARCHITECTURE", source: "Spec 0046: M4-043/044/045 and Lease/Receipt/Guarantee remain separate Gates" },
  { id: "DAPR-032", kind: "STATIC_ARCHITECTURE", source: "Spec 0046: ToolRuntime approval seam is not complete host-effect coverage" },
]);

const CORPUS = corpusJson as Corpus;

function expectedIds(): readonly string[] {
  return Array.from(
    { length: CASE_COUNT },
    (_unused, index) => `DAPR-${String(index + 1).padStart(3, "0")}`,
  );
}

describe("M4-042 portable corpus evidence coverage", () => {
  it("pins the exact profile and Harness baseline", () => {
    expect(CORPUS.profile).toBe(PROFILE);
    expect(CORPUS.pinnedHarness).toEqual({
      version: "0.1.0-rc.5",
      commit: "47f943859bef60e4160492346772ded9b24f765a",
    });
  });

  it("contains exactly DAPR-001 through DAPR-032 with no duplicate or missing case", () => {
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

  it("keeps architecture limitations distinct from executable approval evidence", () => {
    expect(EVIDENCE.filter(({ kind }) => kind === "STATIC_ARCHITECTURE").map(({ id }) => id))
      .toEqual(["DAPR-029", "DAPR-030", "DAPR-031", "DAPR-032"]);
  });
});
