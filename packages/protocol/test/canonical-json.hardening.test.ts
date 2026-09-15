import { describe, expect, it } from "vitest";

import {
  CanonicalJsonError,
  canonicalizeJsonText,
} from "../src/canonical-json.js";

function expectCode(code: string, operation: () => unknown): void {
  let captured: unknown;
  try {
    operation();
  } catch (error) {
    captured = error;
  }
  expect(captured).toBeInstanceOf(CanonicalJsonError);
  expect((captured as CanonicalJsonError).code).toBe(code);
}

describe("M5-002 canonical JSON host hardening", () => {
  it("rejects accessors without invoking them", () => {
    let invoked = false;
    const value = {};
    Object.defineProperty(value, "secret", {
      enumerable: true,
      get() {
        invoked = true;
        return "leak";
      },
    });

    expectCode("UNSUPPORTED_VALUE", () => canonicalizeJsonText(value));
    expect(invoked).toBe(false);
  });

  it("rejects symbol-keyed and non-enumerable object metadata", () => {
    const symbolValue: Record<string, unknown> & { [key: symbol]: unknown } = { a: 1 };
    symbolValue[Symbol("hidden")] = 2;
    expectCode("UNSUPPORTED_VALUE", () => canonicalizeJsonText(symbolValue));

    const nonEnumerable = { a: 1 };
    Object.defineProperty(nonEnumerable, "hidden", {
      configurable: true,
      enumerable: false,
      value: 2,
      writable: true,
    });
    expectCode("UNSUPPORTED_VALUE", () => canonicalizeJsonText(nonEnumerable));
  });

  it("rejects sparse arrays and custom array properties", () => {
    const sparse = new Array<unknown>(2);
    sparse[1] = "present";
    expectCode("UNSUPPORTED_VALUE", () => canonicalizeJsonText(sparse));

    const extended: unknown[] & { extra?: unknown } = [1, 2];
    extended.extra = 3;
    expectCode("UNSUPPORTED_VALUE", () => canonicalizeJsonText(extended));
  });

  it("allows repeated aliases when the graph is acyclic", () => {
    const shared = { b: 2, a: 1 };
    expect(canonicalizeJsonText({ left: shared, right: shared })).toBe(
      "{\"left\":{\"a\":1,\"b\":2},\"right\":{\"a\":1,\"b\":2}}",
    );
  });

  it("preserves an own __proto__ member as data without prototype mutation", () => {
    const value = JSON.parse('{"__proto__":{"polluted":true},"a":1}') as unknown;
    expect(canonicalizeJsonText(value)).toBe(
      "{\"__proto__\":{\"polluted\":true},\"a\":1}",
    );
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("rejects non-plain object prototypes", () => {
    const prototype = { inherited: true };
    const value = Object.create(prototype) as Record<string, unknown>;
    value.a = 1;
    expectCode("UNSUPPORTED_VALUE", () => canonicalizeJsonText(value));
  });

  it("contains hostile descriptor/prototype introspection failures", () => {
    const value = new Proxy({}, {
      getOwnPropertyDescriptor() {
        throw new Error("hostile descriptor trap");
      },
      ownKeys() {
        return ["a"];
      },
    });
    expectCode("UNSUPPORTED_VALUE", () => canonicalizeJsonText(value));

    const prototypeFailure = new Proxy({}, {
      getPrototypeOf() {
        throw new Error("hostile prototype trap");
      },
    });
    expectCode("UNSUPPORTED_VALUE", () => canonicalizeJsonText(prototypeFailure));
  });
});
