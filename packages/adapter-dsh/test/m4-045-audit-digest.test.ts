import vectors from "../../../fixtures/dsh-audit-admission/digest-vectors.json" with { type: "json" };
import { afterEach, describe, expect, it, vi } from "vitest";
import { computeAuditDigest } from "../src/audit-digest.js";
import {
  auditDigestBoundaryCases, auditDigestUnsupportedCases,
} from "../source-conformance/m4-045-audit-digest-cases.js";
import {
  AUDIT_PROFILE, assertDigestProbe, digestCanonicalEnvelope,
} from "../source-conformance/m4-045-audit-contract.js";

const CANARY = "M4_045_SYNTHETIC_SECRET_CANARY";
const fault = vi.hoisted(() => ({ fail: false, calls: 0 }));
vi.mock("node:crypto", async (original) => {
  const module = await original<typeof import("node:crypto")>();
  return {
    ...module,
    createHash: (...args: Parameters<typeof module.createHash>) => {
      fault.calls += 1;
      if (fault.fail) throw new Error(CANARY);
      return module.createHash(...args);
    },
  };
});
afterEach(() => { fault.fail = false; fault.calls = 0; });

describe("M4-045 owned production audit encoder", () => {
  it.each(vectors.vectors)("DAP-018 matches independent canonical source vector $id", (vector) => {
    assertDigestProbe(computeAuditDigest, vector.domain, vector.input, {
      kind: "digest", value: vector.expectedDigest,
    });
  });

  it("DAP-022 enforces all inclusive encoding limits against the actual producer", async () => {
    for (const entry of await auditDigestBoundaryCases()) {
      assertDigestProbe(computeAuditDigest, entry.domain, entry.source, entry.expected);
    }
  });

  it("DAP-019/020/021 rejects each unsupported input before hashing", () => {
    for (const entry of auditDigestUnsupportedCases()) {
      assertDigestProbe(computeAuditDigest, entry.domain, entry.source, entry.expected);
    }
    expect(fault.calls).toBe(0);
  });

  it("DAP-018 sorts UTF-16 keys recursively, including numeric-looking keys, and preserves array order", async () => {
    const source = { "2": "two", "10": "ten", z: [{ b: 2, a: 1 }], "😀": "face", "\ufffd": "replacement" };
    const canonical = '["' + AUDIT_PROFILE + '","result/final-json",{"10":"ten","2":"two","z":[{"a":1,"b":2}],"😀":"face","�":"replacement"}]';
    expect(computeAuditDigest("result/final-json", source)).toEqual({
      kind: "digest", value: await digestCanonicalEnvelope(canonical),
    });
    expect(source.z[0]).toEqual({ b: 2, a: 1 });
    expect(computeAuditDigest("result/final-json", [1, 2]))
      .not.toEqual(computeAuditDigest("result/final-json", [2, 1]));
  });

  it("DAP-019 preserves Unicode without normalization and handles scalar escapes/numbers exactly", async () => {
    const source = [null, true, false, -0, 1e30, 1e-7, "\b\t\n\f\r\u000f", "é", "e\u0301"];
    const canonical = '["' + AUDIT_PROFILE + '","result/final-json",[null,true,false,0,1e+30,1e-7,"\\b\\t\\n\\f\\r\\u000f","é","é"]]';
    expect(computeAuditDigest("result/final-json", source)).toEqual({
      kind: "digest", value: await digestCanonicalEnvelope(canonical),
    });
    expect(computeAuditDigest("metadata/tool-name", "é"))
      .not.toEqual(computeAuditDigest("metadata/tool-name", "e\u0301"));
    expect(computeAuditDigest("result/final-json", { ["\udfff"]: "bad" }))
      .toEqual({ kind: "rejected", code: "AUDIT_INPUT_UNSUPPORTED" });
  });

  it("DAP-020 never calls source getters, toJSON or toString", () => {
    let calls = 0;
    const poison = () => { calls += 1; throw new Error(CANARY); };
    for (const source of [
      Object.defineProperty({}, "field", { enumerable: true, get: poison }),
      { toJSON: poison }, { toString: poison },
      Object.defineProperty([null], "0", { enumerable: true, get: poison }),
    ]) {
      expect(computeAuditDigest("result/final-json", source))
        .toEqual({ kind: "rejected", code: "AUDIT_INPUT_UNSUPPORTED" });
    }
    expect(calls).toBe(0);
  });

  it("DAP-021 accepts repeated acyclic data and null prototypes without mutating source", () => {
    const shared = Object.freeze({ a: 1 });
    const nullPrototype = Object.create(null) as Record<string, unknown>;
    nullPrototype["__proto__"] = "data";
    nullPrototype["shared"] = [shared, shared];
    expect(computeAuditDigest("result/final-json", nullPrototype))
      .toEqual(computeAuditDigest("result/final-json", {
        ["__proto__"]: "data", shared: [{ a: 1 }, { a: 1 }],
      }));
    expect(Object.getPrototypeOf(nullPrototype)).toBeNull();
  });

  it("DAP-022 counts UTF-8 bytes and escaped strings, not UTF-16 length", () => {
    expect(computeAuditDigest("result/final-json", "😀".repeat(262_144)))
      .toEqual({ kind: "rejected", code: "AUDIT_LIMIT_EXCEEDED" });
    expect(computeAuditDigest("result/final-json", "\u0000".repeat(174_763)))
      .toEqual({ kind: "rejected", code: "AUDIT_LIMIT_EXCEEDED" });
  });

  it("DAP-024 contains inspection/hash errors and exposes no raw fallback", () => {
    const source = new Proxy({}, { ownKeys() { throw CANARY; } });
    expect(computeAuditDigest("result/final-json", source))
      .toEqual({ kind: "rejected", code: "AUDIT_INPUT_UNSUPPORTED" });
    fault.fail = true;
    const result = computeAuditDigest("result/final-json", { token: CANARY });
    expect(result).toEqual({ kind: "rejected", code: "AUDIT_DIGEST_FAILED" });
    expect(Object.isFrozen(result)).toBe(true);
    expect(JSON.stringify(result)).not.toContain(CANARY);
  });

  it("rejects unknown domain values without coercion and never hashes malformed data", () => {
    for (const domain of [CANARY, "__proto__", "resultDigest"]) {
      expect(computeAuditDigest(domain, {})).toEqual({ kind: "rejected", code: "AUDIT_INPUT_INVALID" });
    }
    expect(fault.calls).toBe(0);
  });

  it("DAP-005/007/012 preserves domain/whitespace distinction and hashes source instead of relaying digest-shaped strings", () => {
    const input = "sha256:" + "a".repeat(64);
    const result = computeAuditDigest("arguments/raw-string", input);
    expect(result.kind).toBe("digest");
    expect(result).not.toEqual({ kind: "digest", value: input });
    expect(computeAuditDigest("identity/call", ["a", "b"]))
      .not.toEqual(computeAuditDigest("identity/approval", ["a", "b"]));
    expect(computeAuditDigest("arguments/raw-string", "{}"))
      .not.toEqual(computeAuditDigest("arguments/raw-string", "{ }"));
    expect(Object.isFrozen(result)).toBe(true);
  });
});
