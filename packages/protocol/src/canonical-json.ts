export type CanonicalJsonErrorCode =
  | "CYCLIC_STRUCTURE"
  | "INVALID_UNICODE"
  | "NON_FINITE_NUMBER"
  | "UNSUPPORTED_VALUE";

/**
 * Canonicalization failure for values that are outside the M5-002 structured
 * JSON domain. The error path is diagnostic only and is not protocol identity.
 */
export class CanonicalJsonError extends Error {
  public readonly code: CanonicalJsonErrorCode;
  public readonly path: string;

  public constructor(code: CanonicalJsonErrorCode, path: string, message: string) {
    super(`${code} at ${path}: ${message}`);
    this.name = "CanonicalJsonError";
    this.code = code;
    this.path = path;
  }
}

function fail(
  code: CanonicalJsonErrorCode,
  path: string,
  message: string,
): never {
  throw new CanonicalJsonError(code, path, message);
}

function propertyPath(parent: string, key: string): string {
  return `${parent}[${JSON.stringify(key)}]`;
}

function assertUnicodeScalarString(value: string, path: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        fail("INVALID_UNICODE", path, "lone high surrogate is not valid I-JSON text");
      }
      index += 1;
      continue;
    }
    if (unit >= 0xdc00 && unit <= 0xdfff) {
      fail("INVALID_UNICODE", path, "lone low surrogate is not valid I-JSON text");
    }
  }
}

function serializeString(value: string, path: string): string {
  assertUnicodeScalarString(value, path);
  const encoded = JSON.stringify(value);
  if (encoded === undefined) {
    return fail("UNSUPPORTED_VALUE", path, "string serialization failed");
  }
  return encoded;
}

function serializeNumber(value: number, path: string): string {
  if (!Number.isFinite(value)) {
    return fail("NON_FINITE_NUMBER", path, "NaN and Infinity are outside the JCS domain");
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) {
    return fail("UNSUPPORTED_VALUE", path, "number serialization failed");
  }
  return encoded;
}

function ownDescriptors(value: object, path: string): PropertyDescriptorMap {
  try {
    return Object.getOwnPropertyDescriptors(value);
  } catch {
    return fail("UNSUPPORTED_VALUE", path, "object descriptors are not safely observable");
  }
}

function objectPrototype(value: object, path: string): object | null {
  try {
    return Object.getPrototypeOf(value) as object | null;
  } catch {
    return fail("UNSUPPORTED_VALUE", path, "object prototype is not safely observable");
  }
}

function rejectSymbolProperties(descriptors: PropertyDescriptorMap, path: string): void {
  if (Object.getOwnPropertySymbols(descriptors).length !== 0) {
    fail("UNSUPPORTED_VALUE", path, "symbol-keyed properties are not JSON object members");
  }
}

function assertDataProperty(
  descriptor: PropertyDescriptor | undefined,
  path: string,
): asserts descriptor is PropertyDescriptor & { value: unknown } {
  if (descriptor === undefined) {
    fail("UNSUPPORTED_VALUE", path, "missing own data property");
  }
  if (!("value" in descriptor) || descriptor.get !== undefined || descriptor.set !== undefined) {
    fail("UNSUPPORTED_VALUE", path, "accessor properties are outside the structured JSON domain");
  }
  if (descriptor.enumerable !== true) {
    fail("UNSUPPORTED_VALUE", path, "non-enumerable properties are outside the structured JSON domain");
  }
}

function isCanonicalArrayIndex(key: string, length: number): boolean {
  if (key === "") return false;
  const numeric = Number(key);
  return Number.isInteger(numeric)
    && numeric >= 0
    && numeric < length
    && String(numeric) === key;
}

function serializeArray(
  value: readonly unknown[],
  path: string,
  ancestors: Set<object>,
): string {
  const descriptors = ownDescriptors(value, path);
  rejectSymbolProperties(descriptors, path);

  for (const key of Object.keys(descriptors)) {
    if (key === "length") continue;
    if (!isCanonicalArrayIndex(key, value.length)) {
      fail("UNSUPPORTED_VALUE", propertyPath(path, key), "arrays may contain only indexed JSON elements");
    }
  }

  const parts: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const elementPath = `${path}[${index}]`;
    const descriptor = descriptors[String(index)];
    assertDataProperty(descriptor, elementPath);
    parts.push(serializeValue(descriptor.value, elementPath, ancestors));
  }
  return `[${parts.join(",")}]`;
}

function serializeObject(
  value: object,
  path: string,
  ancestors: Set<object>,
): string {
  const prototype = objectPrototype(value, path);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("UNSUPPORTED_VALUE", path, "only ordinary or null-prototype JSON objects are supported");
  }

  const descriptors = ownDescriptors(value, path);
  rejectSymbolProperties(descriptors, path);
  const names = Object.keys(descriptors);

  for (const name of names) {
    const memberPath = propertyPath(path, name);
    assertUnicodeScalarString(name, memberPath);
    assertDataProperty(descriptors[name], memberPath);
  }

  // ECMAScript default string sorting compares UTF-16 code units, exactly the
  // ordering required by RFC 8785 section 3.2.3. Locale collation is forbidden.
  names.sort();

  const parts: string[] = [];
  for (const name of names) {
    const memberPath = propertyPath(path, name);
    const descriptor = descriptors[name];
    assertDataProperty(descriptor, memberPath);
    parts.push(
      `${serializeString(name, memberPath)}:${serializeValue(descriptor.value, memberPath, ancestors)}`,
    );
  }
  return `{${parts.join(",")}}`;
}

function serializeValue(value: unknown, path: string, ancestors: Set<object>): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return serializeNumber(value, path);
    case "string":
      return serializeString(value, path);
    case "undefined":
    case "function":
    case "symbol":
    case "bigint":
      return fail("UNSUPPORTED_VALUE", path, `${typeof value} is not a JSON value`);
    case "object":
      break;
  }

  const objectValue = value as object;
  if (ancestors.has(objectValue)) {
    return fail("CYCLIC_STRUCTURE", path, "cyclic JSON structure is not canonicalizable");
  }

  ancestors.add(objectValue);
  try {
    return Array.isArray(objectValue)
      ? serializeArray(objectValue, path, ancestors)
      : serializeObject(objectValue, path, ancestors);
  } finally {
    ancestors.delete(objectValue);
  }
}

function utf8Encode(value: string): Uint8Array {
  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    let codePoint = value.charCodeAt(index);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
      const low = value.charCodeAt(index + 1);
      codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (low - 0xdc00);
      index += 1;
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
}

/**
 * Return the RFC 8785 canonical JSON text for one already-structured JSON
 * value. Raw JSON parsing, digesting, hashing and persistence are intentionally
 * outside M5-002.
 */
export function canonicalizeJsonText(value: unknown): string {
  return serializeValue(value, "$", new Set<object>());
}

/** Return the exact UTF-8 bytes of RFC 8785 canonical JSON, with no BOM/newline. */
export function canonicalizeJson(value: unknown): Uint8Array {
  return utf8Encode(canonicalizeJsonText(value));
}
