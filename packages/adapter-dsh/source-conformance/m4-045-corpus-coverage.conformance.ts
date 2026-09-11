import corpus from "../../../fixtures/dsh-audit-admission/cases.json" with { type: "json" };
import vectors from "../../../fixtures/dsh-audit-admission/digest-vectors.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { AUDIT_LIMITS, AUDIT_PROFILE } from "./m4-045-audit-contract.js";

// This is prerequisite traceability, never a substitute for producer witnesses.
const SOURCE_PREREQUISITES = ["DAP-003", "DAP-005", "DAP-006", "DAP-014", "DAP-032"];
const ORACLE_SELF_TESTS = [
  "DAP-004", "DAP-005", "DAP-009", "DAP-010", "DAP-012", "DAP-013",
  "DAP-016", "DAP-017", "DAP-018", "DAP-019", "DAP-020", "DAP-021",
  "DAP-022", "DAP-024", "DAP-025", "DAP-027", "DAP-028",
];

describe("M4-045 protocol/TCK prerequisite traceability", () => {
  it("pins the profile, 36 contiguous requirements and exact Harness baseline", () => {
    expect(corpus.profile).toBe(AUDIT_PROFILE);
    expect(corpus.status).toBe("REQUIREMENT_CORPUS_NOT_EXECUTABLE_ACCEPTANCE");
    expect(corpus.pinnedHarness).toEqual({
      version: "0.1.0-rc.5", commit: "47f943859bef60e4160492346772ded9b24f765a",
    });
    expect(corpus.cases.map((entry) => entry.id)).toEqual(
      Array.from({ length: 36 }, (_, index) => `DAP-${String(index + 1).padStart(3, "0")}`),
    );
  });

  it("keeps authored vectors and generator limits pinned to Spec 0049", () => {
    expect(vectors.profile).toBe(AUDIT_PROFILE);
    expect(vectors.vectors.map((entry) => entry.id)).toEqual(
      Array.from({ length: 8 }, (_, index) => `DAV-${String(index + 1).padStart(3, "0")}`),
    );
    expect(AUDIT_LIMITS).toEqual({
      depth: 64, values: 65_536, bytes: 1_048_576, outstanding: 1_024,
    });
  });

  it("requires valid partial-witness IDs and does not label prerequisite coverage as acceptance", () => {
    const ids = corpus.cases.map((entry) => entry.id);
    for (const group of [SOURCE_PREREQUISITES, ORACLE_SELF_TESTS]) {
      expect(new Set(group).size).toBe(group.length);
      expect(group.every((id) => ids.includes(id))).toBe(true);
    }
    // End-to-end ownership, ordered delivery/disposal and full review witnesses
    // remain to be bound to the producer, including those with oracle self-tests.
    expect(SOURCE_PREREQUISITES).not.toContain("DAP-015");
    expect(ORACLE_SELF_TESTS).not.toContain("DAP-026");
    expect(corpus.cases.every((entry) => entry.requirement.length > 0
      && entry.scenario.length > 0 && entry.expected.length > 0)).toBe(true);
  });
});
