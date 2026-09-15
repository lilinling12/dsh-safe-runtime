import vectors from "../../../fixtures/dsh-audit-admission/digest-vectors.json" with { type: "json" };
import { describe, it } from "vitest";
import { computeAuditDigest } from "../src/audit-digest.js";
import { assertDigestProbe } from "./m4-045-audit-contract.js";
import {
  auditDigestBoundaryCases, auditDigestUnsupportedCases,
} from "./m4-045-audit-digest-cases.js";

// Runs the owned encoder in the pinned-source job. This is encoder conformance,
// not evidence that observeAudit has been integrated with the runtime yet.
describe("M4-045 production audit encoder in pinned conformance environment", () => {
  it.each(vectors.vectors)("computes DAV source vector $id using the owned encoder", (vector) => {
    assertDigestProbe(computeAuditDigest, vector.domain, vector.input, {
      kind: "digest", value: vector.expectedDigest,
    });
  });
  it("enforces DAL inclusive depth, value and UTF-8 byte limits", async () => {
    for (const entry of await auditDigestBoundaryCases()) {
      assertDigestProbe(computeAuditDigest, entry.domain, entry.source, entry.expected);
    }
  });
  it("rejects all DAI unsupported values without raw fallback", () => {
    for (const entry of auditDigestUnsupportedCases()) {
      assertDigestProbe(computeAuditDigest, entry.domain, entry.source, entry.expected);
    }
  });
});
