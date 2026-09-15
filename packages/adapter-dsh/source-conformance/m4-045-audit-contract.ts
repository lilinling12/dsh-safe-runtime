// Test-only oracle. Never imported by production. Expected values must come
// from independently authored source evidence, not from the observed output.
export const AUDIT_PROFILE = "M4-045_DSH_AUDIT_ADMISSION_V1" as const;
export const AUDIT_LIMITS = Object.freeze({
  depth: 64, values: 65_536, bytes: 1_048_576, outstanding: 1_024,
});
export const AUDIT_CODES = [
  "AUDIT_INPUT_INVALID", "AUDIT_INPUT_UNSUPPORTED", "AUDIT_LIMIT_EXCEEDED",
  "AUDIT_DIGEST_FAILED", "AUDIT_SINK_FAILED",
] as const;
export type AuditDiagnosticCode = typeof AUDIT_CODES[number];

export interface AuditDeliverySummary {
  readonly delivered: number;
  readonly projectionRejected: number;
  readonly deliveryFailed: number;
  readonly countsExact: boolean;
  readonly status: "COMPLETE" | "INCOMPLETE";
  readonly diagnostics: readonly AuditDiagnosticCode[];
}
export interface AuditObservationSubscription {
  drain(): Promise<AuditDeliverySummary>;
  dispose(): Promise<AuditDeliverySummary>;
}

const FIELDS = {
  "session.started": { required: ["source"], optional: [] },
  "turn.started": { required: ["turnKey"], optional: [] },
  "step.started": { required: ["turnKey", "stepKey"], optional: [] },
  "tool.requested": {
    required: ["callKey", "toolNameDigest", "argumentsDigest"],
    optional: ["turnKey", "stepKey", "rootCallKey"],
  },
  "tool.completed": {
    required: ["callKey", "toolNameDigest", "resultDigest", "outcome"],
    optional: ["errorCodeDigest"],
  },
  "approval.decided": { required: ["approvalKey", "outcome"], optional: ["callKey"] },
  "model.request.failed": {
    required: ["turnKey", "stepKey", "failureClassDigest", "failureDigest"], optional: [],
  },
  "turn.completion_requested": { required: ["turnKey"], optional: [] },
  "turn.ended": { required: ["turnKey", "status"], optional: [] },
} as const;
export type AuditEventType = keyof typeof FIELDS;
export const AUDIT_EVENT_TYPES = Object.keys(FIELDS) as AuditEventType[];
export type ExpectedAuditEvent = Readonly<Record<string, string>>;

function requireContract(condition: boolean): asserts condition {
  if (!condition) throw new Error("M4_045_AUDIT_CONTRACT_MISMATCH");
}

function ownData(value: unknown): Record<string, unknown> {
  try {
    requireContract(typeof value === "object" && value !== null && !Array.isArray(value));
    const prototype: unknown = Object.getPrototypeOf(value);
    requireContract(prototype === Object.prototype || prototype === null);
    requireContract(Object.isFrozen(value));
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of Reflect.ownKeys(value)) {
      requireContract(typeof key === "string");
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      requireContract(descriptor !== undefined && "value" in descriptor && descriptor.enumerable === true);
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    throw new Error("M4_045_AUDIT_CONTRACT_MISMATCH");
  }
}

function eventData(value: unknown, canaries: readonly string[]): Record<string, unknown> {
  const data = ownData(value);
  const type = data["type"];
  requireContract(typeof type === "string" && Object.hasOwn(FIELDS, type));
  const fields = FIELDS[type as AuditEventType];
  const required = ["profile", "type", "eventKey", "sessionKey", "observedAt", ...fields.required];
  const allowed: readonly string[] = [...required, ...fields.optional];
  requireContract(required.every((key) => Object.hasOwn(data, key)));
  requireContract(Object.keys(data).every((key) => allowed.includes(key)));
  requireContract(data["profile"] === AUDIT_PROFILE);
  for (const [key, field] of Object.entries(data)) {
    requireContract(typeof field === "string");
    requireContract(canaries.every((canary) => canary.length > 0 && !field.includes(canary)));
    if (key.endsWith("Key") || key.endsWith("Digest")) {
      requireContract(/^sha256:[a-f0-9]{64}$/.test(field));
    }
  }
  const time = data["observedAt"] as string;
  const epoch = Date.parse(time);
  requireContract(Number.isFinite(epoch) && new Date(epoch).toISOString() === time);
  if (type === "session.started") {
    requireContract(["startup", "resume", "clear", "compact"].includes(data["source"] as string));
  } else if (type === "tool.completed") {
    requireContract(["success", "error", "denied", "cancelled"].includes(data["outcome"] as string));
  } else if (type === "approval.decided") {
    requireContract(["ALLOWED_ONCE", "REJECTED", "CANCELLED", "UNAVAILABLE"].includes(data["outcome"] as string));
  } else if (type === "turn.ended") {
    requireContract(["completed", "failed", "blocked", "cancelled"].includes(data["status"] as string));
  }
  return data;
}

/** Checks an observation against an independent expectation; does not project raw input. */
export function assertAuditEvent(
  actual: unknown,
  expected: ExpectedAuditEvent,
  canaries: readonly string[] = [],
): void {
  const expectedData = eventData(expected, canaries);
  const actualData = eventData(actual, canaries);
  requireContract(Object.keys(actualData).length === Object.keys(expectedData).length);
  for (const key of Object.keys(expectedData)) requireContract(actualData[key] === expectedData[key]);
}

function summaryData(value: unknown): Record<string, unknown> {
  const data = ownData(value);
  const keys = ["delivered", "projectionRejected", "deliveryFailed", "countsExact", "status", "diagnostics"];
  requireContract(Object.keys(data).length === keys.length && keys.every((key) => Object.hasOwn(data, key)));
  for (const key of keys.slice(0, 3)) {
    requireContract(Number.isSafeInteger(data[key]) && (data[key] as number) >= 0);
  }
  requireContract(typeof data["countsExact"] === "boolean");
  const diagnostics: unknown = data["diagnostics"];
  requireContract(Array.isArray(diagnostics) && Object.isFrozen(diagnostics));
  // Descriptors prevent a getter in a supposed closed diagnostic array being run.
  const diagnosticKeys = Reflect.ownKeys(diagnostics);
  requireContract(diagnosticKeys.length === diagnostics.length + 1);
  const codes: AuditDiagnosticCode[] = [];
  let previous = -1;
  for (let index = 0; index < diagnostics.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(diagnostics, String(index));
    requireContract(descriptor !== undefined && "value" in descriptor && descriptor.enumerable === true);
    const code: unknown = descriptor.value;
    const position = AUDIT_CODES.indexOf(code as AuditDiagnosticCode);
    requireContract(position > previous);
    previous = position;
    codes.push(code as AuditDiagnosticCode);
  }
  const incomplete = (data["projectionRejected"] as number) > 0
    || (data["deliveryFailed"] as number) > 0 || !data["countsExact"];
  requireContract(data["status"] === (incomplete ? "INCOMPLETE" : "COMPLETE"));
  requireContract(incomplete ? codes.length > 0 : codes.length === 0);
  requireContract(((data["deliveryFailed"] as number) > 0) === codes.includes("AUDIT_SINK_FAILED"));
  if ((data["projectionRejected"] as number) > 0) {
    requireContract(codes.some((code) => code !== "AUDIT_SINK_FAILED"));
  }
  if (!data["countsExact"]) {
    requireContract(codes.includes("AUDIT_LIMIT_EXCEEDED"));
    requireContract(keys.slice(0, 3).some((key) => data[key] === Number.MAX_SAFE_INTEGER));
  }
  for (const code of codes.filter((entry) => entry !== "AUDIT_SINK_FAILED")) {
    requireContract((data["projectionRejected"] as number) > 0
      || (code === "AUDIT_LIMIT_EXCEEDED" && data["countsExact"] === false));
  }
  data["diagnostics"] = codes;
  return data;
}

/** Output oracle only: ordering, queue limits and drain need a live producer witness. */
export function assertAuditSummary(actual: unknown, expected: AuditDeliverySummary): void {
  try {
    const observed = summaryData(actual);
    const wanted = summaryData(expected);
    for (const key of ["delivered", "projectionRejected", "deliveryFailed", "countsExact", "status"]) {
      requireContract(observed[key] === wanted[key]);
    }
    const left = observed["diagnostics"] as AuditDiagnosticCode[];
    const right = wanted["diagnostics"] as AuditDiagnosticCode[];
    requireContract(left.length === right.length && left.every((value, index) => value === right[index]));
  } catch {
    throw new Error("M4_045_AUDIT_CONTRACT_MISMATCH");
  }
}

/** Hash only already-authored canonical bytes; deliberately not a JCS encoder. */
export async function digestCanonicalEnvelope(canonicalEnvelope: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalEnvelope));
  return "sha256:" + Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface AuditDigestProbe {
  (domain: string, source: unknown):
    | { readonly kind: "digest"; readonly value: string }
    | { readonly kind: "rejected"; readonly code: AuditDiagnosticCode };
}

/** Shared assertion for future owned-encoder tests; callback is test-only. */
export function assertDigestProbe(
  probe: AuditDigestProbe,
  domain: string,
  source: unknown,
  expected: ReturnType<AuditDigestProbe>,
): void {
  const actual = probe(domain, source);
  requireContract(actual.kind === expected.kind);
  if (actual.kind === "digest" && expected.kind === "digest") {
    requireContract(actual.value === expected.value);
  } else if (actual.kind === "rejected" && expected.kind === "rejected") {
    requireContract(actual.code === expected.code);
  }
}
