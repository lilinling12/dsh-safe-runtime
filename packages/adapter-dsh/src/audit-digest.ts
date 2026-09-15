import { createHash } from "node:crypto";

const PROFILE = "M4-045_DSH_AUDIT_ADMISSION_V1";
const MAX_DEPTH = 64;
const MAX_VALUES = 65_536;
const MAX_BYTES = 1_048_576;
const DOMAINS = new Set([
  "arguments/raw-string", "result/final-json", "failure/source-json",
  "metadata/tool-name", "metadata/error-code", "metadata/failure-class",
  "identity/session", "identity/event", "identity/turn", "identity/step",
  "identity/call", "identity/approval",
]);

type RejectionCode =
  | "AUDIT_INPUT_INVALID"
  | "AUDIT_INPUT_UNSUPPORTED"
  | "AUDIT_LIMIT_EXCEEDED"
  | "AUDIT_DIGEST_FAILED";
export type AuditDigestResult =
  | { readonly kind: "digest"; readonly value: string }
  | { readonly kind: "rejected"; readonly code: RejectionCode };

// Private sentinels distinguish owned limit failures from arbitrary exceptions.
// Source code cannot manufacture these references through error messages.
const UNSUPPORTED = Object.freeze({});
const LIMIT = Object.freeze({});

function canonicalEnvelope(domain: string, source: unknown): string {
  const parts: string[] = [];
  const ancestors = new Set<object>();
  let values = 0;
  let bytes = 0;

  function append(text: string, size = text.length): void {
    if (bytes + size > MAX_BYTES) throw LIMIT;
    bytes += size;
    parts.push(text);
  }

  function quoted(text: string): void {
    // Count JSON escapes and UTF-8 without first allocating an unbounded escaped
    // string. JCS rejects lone surrogates rather than replacing them during UTF-8.
    let size = 2;
    for (let index = 0; index < text.length; index += 1) {
      const unit = text.charCodeAt(index);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const next = text.charCodeAt(index + 1);
        if (!(next >= 0xdc00 && next <= 0xdfff)) throw UNSUPPORTED;
        index += 1;
        size += 4;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) {
        throw UNSUPPORTED;
      } else if (unit < 0x20) {
        size += [8, 9, 10, 12, 13].includes(unit) ? 2 : 6;
      } else if (unit === 0x22 || unit === 0x5c) {
        size += 2;
      } else {
        size += unit < 0x80 ? 1 : unit < 0x800 ? 2 : 3;
      }
      if (bytes + size > MAX_BYTES) throw LIMIT;
    }
    // Only an already checked primitive string reaches JSON.stringify: source
    // object getters/toJSON are never used to obtain a supported representation.
    append(JSON.stringify(text), size);
  }

  function readData(object: object, key: string): unknown {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      throw UNSUPPORTED;
    }
    return descriptor.value;
  }

  function visit(value: unknown, depth: number): void {
    values += 1;
    if (values > MAX_VALUES) throw LIMIT;
    if (value === null) { append("null"); return; }
    switch (typeof value) {
      case "string": quoted(value); return;
      case "boolean": append(value ? "true" : "false"); return;
      case "number":
        if (!Number.isFinite(value)) throw UNSUPPORTED;
        append(JSON.stringify(value));
        return;
      case "object": break;
      default: throw UNSUPPORTED;
    }
    if (depth > MAX_DEPTH) throw LIMIT;
    if (ancestors.has(value)) throw UNSUPPORTED;
    const isArray = Array.isArray(value);
    const prototype: unknown = Object.getPrototypeOf(value);
    if (isArray ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
      throw UNSUPPORTED;
    }
    ancestors.add(value);
    try {
      const keys = Reflect.ownKeys(value);
      if (isArray) {
        const descriptor = Object.getOwnPropertyDescriptor(value, "length");
        const length: unknown = descriptor?.value;
        if (!Number.isSafeInteger(length) || (length as number) < 0) throw UNSUPPORTED;
        const count = length as number;
        if (count > MAX_VALUES - values) throw LIMIT;
        if (keys.length !== count + 1 || keys.some((key) => typeof key !== "string")) throw UNSUPPORTED;
        append("[");
        for (let index = 0; index < count; index += 1) {
          if (index > 0) append(",");
          visit(readData(value, String(index)), depth + 1);
        }
        append("]");
      } else {
        if (keys.length > MAX_VALUES - values) throw LIMIT;
        if (keys.some((key) => typeof key !== "string")) throw UNSUPPORTED;
        // Default string sort uses UTF-16 code units. Emitting keys ourselves
        // avoids JSON.stringify's numeric-property reordering.
        const names = (keys as string[]).sort();
        append("{");
        for (let index = 0; index < names.length; index += 1) {
          if (index > 0) append(",");
          const key = names[index]!;
          const field = readData(value, key);
          quoted(key);
          append(":");
          visit(field, depth + 1);
        }
        append("}");
      }
    } finally {
      ancestors.delete(value);
    }
  }

  visit([PROFILE, domain, source], 1);
  return parts.join("");
}

/**
 * Package-internal source digest, not an audit admission API or record projector.
 * The caller must capture the authoritative source and select the specified
 * domain. No supplied digest string or callback establishes that provenance.
 */
export function computeAuditDigest(domain: string, source: unknown): AuditDigestResult {
  if (typeof domain !== "string" || !DOMAINS.has(domain)) {
    return Object.freeze({ kind: "rejected", code: "AUDIT_INPUT_INVALID" });
  }
  let canonical: string;
  try {
    canonical = canonicalEnvelope(domain, source);
  } catch (error: unknown) {
    return Object.freeze({
      kind: "rejected",
      code: error === LIMIT ? "AUDIT_LIMIT_EXCEEDED" : "AUDIT_INPUT_UNSUPPORTED",
    });
  }
  try {
    return Object.freeze({
      kind: "digest",
      value: "sha256:" + createHash("sha256").update(canonical, "utf8").digest("hex"),
    });
  } catch {
    return Object.freeze({ kind: "rejected", code: "AUDIT_DIGEST_FAILED" });
  }
}
