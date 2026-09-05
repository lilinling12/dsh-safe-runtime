/**
 * Package-internal primitives for inspecting untrusted tool argument objects.
 *
 * Classifiers must use bounded descriptor reads instead of normal property
 * access, enumeration, spreading, or serialization. This prevents inherited
 * values and accessors from manufacturing authority, and converts hostile Proxy
 * operations into explicit fail-closed outcomes.
 */

export type ArgumentRecordInspection =
  | { readonly status: "RECORD"; readonly value: object }
  | { readonly status: "INVALID" }
  | { readonly status: "UNREADABLE" };

export type OwnDataPropertyResult =
  | { readonly status: "MISSING" }
  | { readonly status: "VALUE"; readonly value: unknown }
  | { readonly status: "UNREADABLE" };

const ARGUMENT_RECORD_INVALID: ArgumentRecordInspection = Object.freeze({
  status: "INVALID",
});

const ARGUMENT_RECORD_UNREADABLE: ArgumentRecordInspection = Object.freeze({
  status: "UNREADABLE",
});

const MISSING: OwnDataPropertyResult = Object.freeze({
  status: "MISSING",
});

const UNREADABLE: OwnDataPropertyResult = Object.freeze({
  status: "UNREADABLE",
});

/**
 * Inspects whether an untrusted value is a non-null, non-array object without
 * allowing revoked Proxies to escape as host exceptions.
 *
 * `Array.isArray()` normally does not execute user code, but ECMAScript requires
 * it to throw for a revoked Proxy. Preserve that distinction as UNREADABLE so a
 * security boundary can report a stable fail-closed diagnostic instead of
 * crashing out of the classifier.
 */
export function inspectArgumentRecord(value: unknown): ArgumentRecordInspection {
  if (typeof value !== "object" || value === null) {
    return ARGUMENT_RECORD_INVALID;
  }

  let isArray: boolean;
  try {
    isArray = Array.isArray(value);
  } catch {
    return ARGUMENT_RECORD_UNREADABLE;
  }

  if (isArray) {
    return ARGUMENT_RECORD_INVALID;
  }

  return Object.freeze({
    status: "RECORD",
    value,
  });
}

/**
 * Compatibility predicate used by existing built-in classifiers.
 *
 * Unreadable values are conservatively treated as non-records. Classifiers that
 * need to distinguish invalid shape from hostile runtime unreadability should
 * use {@link inspectArgumentRecord} directly.
 */
export function isArgumentRecord(value: unknown): value is object {
  return inspectArgumentRecord(value).status === "RECORD";
}

/**
 * Reads one known own data property without invoking accessors or traversing
 * prototype state. Proxy descriptor failures are treated as unreadable input.
 */
export function readOwnDataProperty(
  target: object,
  key: string,
): OwnDataPropertyResult {
  let descriptor: PropertyDescriptor | undefined;

  try {
    descriptor = Object.getOwnPropertyDescriptor(target, key);
  } catch {
    return UNREADABLE;
  }

  if (descriptor === undefined) {
    return MISSING;
  }

  if (!("value" in descriptor)) {
    return UNREADABLE;
  }

  return Object.freeze({
    status: "VALUE",
    value: descriptor.value,
  });
}
