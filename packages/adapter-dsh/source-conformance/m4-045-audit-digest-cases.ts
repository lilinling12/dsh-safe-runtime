import {
  AUDIT_LIMITS, AUDIT_PROFILE, digestCanonicalEnvelope,
  type AuditDigestProbe,
} from "./m4-045-audit-contract.js";

export interface AuditDigestCase {
  readonly id: string;
  readonly domain: string;
  readonly source: unknown;
  readonly expected: ReturnType<AuditDigestProbe>;
}

// These are authored input generators, not a canonicalizer or audit producer.
export async function auditDigestBoundaryCases(): Promise<readonly AuditDigestCase[]> {
  const domain = "result/final-json";
  const envelope = (canonical: string): string =>
    `["${AUDIT_PROFILE}","${domain}",${canonical}]`;
  const valid = async (id: string, source: unknown, canonical: string): Promise<AuditDigestCase> => ({
    id, domain, source,
    expected: { kind: "digest", value: await digestCanonicalEnvelope(envelope(canonical)) },
  });
  const limited = (id: string, source: unknown): AuditDigestCase => ({
    id, domain, source, expected: { kind: "rejected", code: "AUDIT_LIMIT_EXCEEDED" },
  });
  const nested = (count: number): unknown => {
    let result: unknown = 0;
    for (let index = 0; index < count; index += 1) result = [result];
    return result;
  };
  // Envelope, profile, domain and source array consume four visited values.
  const nodes = AUDIT_LIMITS.values - 4;
  const emptyStringEnvelopeBytes = new TextEncoder().encode(envelope('""')).length;
  const stringLength = AUDIT_LIMITS.bytes - emptyStringEnvelopeBytes;
  return Promise.all([
    valid("DAL-001", nested(63), "[".repeat(63) + "0" + "]".repeat(63)),
    limited("DAL-002", nested(64)),
    valid("DAL-003", Array.from({ length: nodes }, () => null), "[" + Array.from({ length: nodes }, () => "null").join(",") + "]"),
    limited("DAL-004", Array.from({ length: nodes + 1 }, () => null)),
    valid("DAL-005", "x".repeat(stringLength), '"' + "x".repeat(stringLength) + '"'),
    limited("DAL-006", "x".repeat(stringLength + 1)),
  ]);
}

export function auditDigestUnsupportedCases(): readonly AuditDigestCase[] {
  const cycle: unknown[] = [];
  cycle.push(cycle);
  const sparse: unknown[] = [];
  sparse.length = 1;
  const extended = Object.assign([null], { extra: "M4_045_SYNTHETIC_SECRET_CANARY" });
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  const sources: readonly unknown[] = [
    undefined, 1n, () => "unused", NaN, Infinity, "\ud800", cycle,
    sparse, extended, { [Symbol("secret")]: "secret" },
    new Date(0), new Error("M4_045_SYNTHETIC_SECRET_CANARY"),
    Object.defineProperty({}, "hidden", { value: "secret", enumerable: false }),
    Object.defineProperty({}, "get", { enumerable: true, get() { throw new Error("must not be read"); } }),
    { toJSON() { throw new Error("must not be called"); } },
    revoked.proxy,
  ];
  return sources.map((source, index) => ({
    id: `DAI-${String(index + 1).padStart(3, "0")}`,
    domain: "result/final-json", source,
    expected: { kind: "rejected", code: "AUDIT_INPUT_UNSUPPORTED" },
  }));
}
