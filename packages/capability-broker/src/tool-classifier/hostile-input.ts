/**
 * Package-internal primitives for inspecting untrusted tool argument objects.
 *
 * Classifiers must use bounded descriptor reads instead of normal property
 * access, enumeration, spreading, or serialization. This prevents inherited
 * values and accessors from manufacturing authority, and converts hostile Proxy
 * descriptor traps into explicit fail-closed outcomes.
 */

export type OwnDataPropertyResult =
  | { readonly status: "MISSING" }
  | { readonly status: "VALUE"; readonly value: unknown }
  | { readonly status: "UNREADABLE" };

const MISSING: OwnDataPropertyResult = Object.freeze({
  status: "MISSING",
});

const UNREADABLE: OwnDataPropertyResult = Object.freeze({
  status: "UNREADABLE",
});

/**
 * Returns true only for non-null, non-array objects accepted as tool argument
 * records. Prototype shape is intentionally irrelevant.
 */
export function isArgumentRecord(value: unknown): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
