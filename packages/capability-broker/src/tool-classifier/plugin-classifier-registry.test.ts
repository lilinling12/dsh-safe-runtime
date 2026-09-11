import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { resolveToolClassification } from "./unknown-tool-fallback.js";
import {
  createPluginToolClassifierRegistry,
  resolveToolClassificationWithRegistry,
} from "./plugin-classifier-registry.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../../..");
const fixturePath = resolve(root, "fixtures/tool-classifier/plugin-classifier-cases.json");

interface FixtureCase {
  readonly id: string;
  readonly description: string;
  readonly operation: "BUILD_REGISTRY" | "RESOLVE" | "RESOLVE_ORDER_EQUIVALENCE";
  readonly registrations?: unknown;
  readonly registrationOrders?: unknown;
  readonly toolName?: unknown;
  readonly arguments?: unknown;
  readonly expectedInvokedClassifiers?: unknown;
  readonly expected: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fixtureCases(): readonly FixtureCase[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed["cases"])) {
    throw new Error("plugin classifier fixture must contain a cases array");
  }
  const seen = new Set<string>();
  return parsed["cases"].map((raw) => {
    if (!isRecord(raw) || typeof raw["id"] !== "string" || typeof raw["description"] !== "string"
      || (raw["operation"] !== "BUILD_REGISTRY" && raw["operation"] !== "RESOLVE" && raw["operation"] !== "RESOLVE_ORDER_EQUIVALENCE")
      || !Object.hasOwn(raw, "expected")) {
      throw new Error("malformed plugin classifier portable fixture");
    }
    if (seen.has(raw["id"])) throw new Error(`duplicate plugin classifier fixture id: ${raw["id"]}`);
    seen.add(raw["id"]);
    return {
      id: raw["id"],
      description: raw["description"],
      operation: raw["operation"],
      registrations: raw["registrations"],
      registrationOrders: raw["registrationOrders"],
      toolName: raw["toolName"],
      arguments: raw["arguments"],
      expectedInvokedClassifiers: raw["expectedInvokedClassifiers"],
      expected: raw["expected"],
    };
  });
}

function replaceTemplate(template: string, index: number, classifierIndex?: number): string {
  return template
    .replaceAll("{index}", String(index))
    .replaceAll("{classifierIndex}", String(classifierIndex ?? index));
}

function materialize(value: unknown, classifierIndex?: number): unknown {
  if (Array.isArray(value)) return value.map((item) => materialize(item, classifierIndex));
  if (!isRecord(value)) return value;

  if (isRecord(value["generatedString"])) {
    const directive = value["generatedString"];
    if (typeof directive["codePoint"] !== "string" || typeof directive["count"] !== "number") {
      throw new Error("invalid generatedString directive");
    }
    return directive["codePoint"].repeat(directive["count"]);
  }
  if (isRecord(value["generatedNames"])) {
    const directive = value["generatedNames"];
    if (typeof directive["count"] !== "number" || typeof directive["template"] !== "string") {
      throw new Error("invalid generatedNames directive");
    }
    return Array.from({ length: directive["count"] }, (_, index) =>
      replaceTemplate(directive["template"] as string, index, classifierIndex));
  }
  if (isRecord(value["generatedClassifiers"])) {
    const directive = value["generatedClassifiers"];
    if (typeof directive["count"] !== "number" || typeof directive["classifierIdTemplate"] !== "string") {
      throw new Error("invalid generatedClassifiers directive");
    }
    return Array.from({ length: directive["count"] }, (_, index) => {
      let names: unknown;
      if (typeof directive["ownedToolNameTemplate"] === "string") {
        names = [replaceTemplate(directive["ownedToolNameTemplate"], index, index)];
      } else if (isRecord(directive["generatedOwnedToolNames"])) {
        const namesDirective = directive["generatedOwnedToolNames"];
        if (typeof namesDirective["count"] !== "number" || typeof namesDirective["template"] !== "string") {
          throw new Error("invalid generatedOwnedToolNames directive");
        }
        names = Array.from({ length: namesDirective["count"] }, (_, nameIndex) =>
          replaceTemplate(namesDirective["template"] as string, nameIndex, index));
      } else {
        throw new Error("generated classifier requires owned names");
      }
      return {
        classifierId: replaceTemplate(directive["classifierIdTemplate"] as string, index, index),
        ownedToolNames: names,
        behaviors: {},
      };
    });
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, materialize(child, classifierIndex)]),
  );
}

function registrationsFromFixture(
  raw: unknown,
  invoked: string[],
): readonly { classifierId: string; ownedToolNames: readonly string[]; classify: (name: string, args: unknown) => unknown }[] {
  const materialized = materialize(raw);
  if (!Array.isArray(materialized)) throw new Error("fixture registrations must materialize to an array");
  return materialized.map((registration) => {
    if (!isRecord(registration) || typeof registration["classifierId"] !== "string" || !Array.isArray(registration["ownedToolNames"])) {
      throw new Error("invalid materialized fixture registration");
    }
    const classifierId = registration["classifierId"];
    const names = registration["ownedToolNames"];
    const behaviors = isRecord(registration["behaviors"]) ? registration["behaviors"] : {};
    return {
      classifierId,
      ownedToolNames: names as readonly string[],
      classify(name: string): unknown {
        invoked.push(classifierId);
        const behavior = behaviors[name];
        if (!isRecord(behavior) || behavior["kind"] !== "RETURN") {
          throw new Error("portable fixture invoked a classifier without RETURN behavior");
        }
        return materialize(behavior["value"]);
      },
    };
  });
}

const cases = fixtureCases();

describe("M4-014 portable plugin classifier corpus", () => {
  test("fixture corpus has the reviewed breadth", () => {
    expect(cases).toHaveLength(27);
  });

  for (const fixture of cases) {
    test(`${fixture.id}: ${fixture.description}`, () => {
      if (fixture.operation === "BUILD_REGISTRY") {
        const invoked: string[] = [];
        const result = createPluginToolClassifierRegistry(registrationsFromFixture(fixture.registrations, invoked));
        expect(result).toEqual(materialize(fixture.expected));
        expect(invoked).toEqual([]);
        return;
      }

      if (fixture.operation === "RESOLVE") {
        const invoked: string[] = [];
        const registry = createPluginToolClassifierRegistry(registrationsFromFixture(fixture.registrations, invoked));
        expect(registry.status).toBe("READY");
        const result = resolveToolClassificationWithRegistry(registry, fixture.toolName, materialize(fixture.arguments));
        expect(result).toEqual(materialize(fixture.expected));
        expect(invoked).toEqual(materialize(fixture.expectedInvokedClassifiers));
        return;
      }

      const orders = materialize(fixture.registrationOrders);
      if (!Array.isArray(orders)) throw new Error("order-equivalence fixture requires registrationOrders");
      const observed: unknown[] = [];
      for (const order of orders) {
        const invoked: string[] = [];
        const registry = createPluginToolClassifierRegistry(registrationsFromFixture(order, invoked));
        expect(registry.status).toBe("READY");
        observed.push(resolveToolClassificationWithRegistry(registry, fixture.toolName, materialize(fixture.arguments)));
        expect(invoked).toEqual(materialize(fixture.expectedInvokedClassifiers));
      }
      expect(observed).toEqual(orders.map(() => materialize(fixture.expected)));
    });
  }
});

describe("M4-014 hostile registration boundaries", () => {
  test("registration accessors are not executed", () => {
    let getterCalls = 0;
    const registration = Object.defineProperties({}, {
      classifierId: { enumerable: true, get() { getterCalls += 1; return "evil"; } },
      ownedToolNames: { enumerable: true, value: ["evil_tool"] },
      classify: { enumerable: true, value: () => ({ status: "REJECTED" }) },
    });
    expect(createPluginToolClassifierRegistry([registration])).toEqual({
      status: "ERROR", reason: "PLUGIN_REGISTRY_INPUT_UNREADABLE",
    });
    expect(getterCalls).toBe(0);
  });

  test("inherited security-relevant registration fields are rejected", () => {
    const registration = Object.create({ classifierId: "inherited" }) as Record<string, unknown>;
    registration["ownedToolNames"] = ["tool"];
    registration["classify"] = () => ({ status: "REJECTED" });
    expect(createPluginToolClassifierRegistry([registration])).toEqual({
      status: "ERROR", reason: "PLUGIN_REGISTRY_INVALID",
    });
  });

  test("sparse, named and symbol-bearing registration arrays fail closed", () => {
    const sparse = new Array(1);
    expect(createPluginToolClassifierRegistry(sparse)).toEqual({ status: "ERROR", reason: "PLUGIN_REGISTRY_INVALID" });

    const named: unknown[] & { extra?: boolean } = [];
    named.extra = true;
    expect(createPluginToolClassifierRegistry(named)).toEqual({ status: "ERROR", reason: "PLUGIN_REGISTRY_INVALID" });

    const symbol = Symbol("extra");
    const symbolBearing: unknown[] & Record<PropertyKey, unknown> = [] as unknown[] & Record<PropertyKey, unknown>;
    symbolBearing[symbol] = true;
    expect(createPluginToolClassifierRegistry(symbolBearing)).toEqual({ status: "ERROR", reason: "PLUGIN_REGISTRY_INVALID" });
  });

  test("revoked registration proxy is converted to stable unreadable error", () => {
    const revocable = Proxy.revocable({}, {});
    revocable.revoke();
    expect(createPluginToolClassifierRegistry([revocable.proxy])).toEqual({
      status: "ERROR", reason: "PLUGIN_REGISTRY_INPUT_UNREADABLE",
    });
  });

  test("registry detaches name arrays and ignores later caller mutation", () => {
    const names = ["owned"];
    const registry = createPluginToolClassifierRegistry([{
      classifierId: "stable",
      ownedToolNames: names,
      classify: () => ({ status: "REJECTED" }),
    }]);
    expect(registry.status).toBe("READY");
    names[0] = "changed";
    expect(resolveToolClassificationWithRegistry(registry, "owned", {})).toEqual({
      status: "ERROR", reason: "PLUGIN_CLASSIFIER_REJECTED",
    });
    expect(resolveToolClassificationWithRegistry(registry, "changed", {})).toEqual({
      status: "UNCLASSIFIED", profile: "STRICT_DENY_V1", disposition: "BLOCK", reason: "NO_APPLICABLE_CLASSIFIER",
    });
  });
});

describe("M4-014 hostile invocation and result boundaries", () => {
  test("unowned tools do not expose hostile arguments to unrelated callbacks", () => {
    let callbackCalls = 0;
    let descriptorCalls = 0;
    const argumentsValue = new Proxy({}, {
      getOwnPropertyDescriptor() { descriptorCalls += 1; throw new Error("must remain opaque"); },
      ownKeys() { throw new Error("must remain opaque"); },
    });
    const registry = createPluginToolClassifierRegistry([{
      classifierId: "other",
      ownedToolNames: ["other_tool"],
      classify: () => { callbackCalls += 1; return { status: "REJECTED" }; },
    }]);
    expect(resolveToolClassificationWithRegistry(registry, "unknown_tool", argumentsValue)).toEqual({
      status: "UNCLASSIFIED", profile: "STRICT_DENY_V1", disposition: "BLOCK", reason: "NO_APPLICABLE_CLASSIFIER",
    });
    expect(callbackCalls).toBe(0);
    expect(descriptorCalls).toBe(0);
  });

  test("owner throws are sanitized and do not fall through", () => {
    const registry = createPluginToolClassifierRegistry([{
      classifierId: "thrower",
      ownedToolNames: ["owned"],
      classify: () => { throw new Error("secret stack data"); },
    }]);
    expect(resolveToolClassificationWithRegistry(registry, "owned", { secret: "value" })).toEqual({
      status: "ERROR", reason: "PLUGIN_CLASSIFIER_THROWN",
    });
  });

  test("native Promise and own thenable results are rejected as async", () => {
    const promiseRegistry = createPluginToolClassifierRegistry([{
      classifierId: "promise",
      ownedToolNames: ["promise_tool"],
      classify: () => Promise.resolve({ status: "REJECTED" }),
    }]);
    expect(resolveToolClassificationWithRegistry(promiseRegistry, "promise_tool", {})).toEqual({
      status: "ERROR", reason: "PLUGIN_CLASSIFIER_ASYNC_UNSUPPORTED",
    });

    const thenableRegistry = createPluginToolClassifierRegistry([{
      classifierId: "thenable",
      ownedToolNames: ["thenable_tool"],
      classify: () => ({ then() { /* intentionally never called */ } }),
    }]);
    expect(resolveToolClassificationWithRegistry(thenableRegistry, "thenable_tool", {})).toEqual({
      status: "ERROR", reason: "PLUGIN_CLASSIFIER_ASYNC_UNSUPPORTED",
    });
  });

  test("result accessors are not executed", () => {
    let getterCalls = 0;
    const registry = createPluginToolClassifierRegistry([{
      classifierId: "accessor-result",
      ownedToolNames: ["owned"],
      classify: () => Object.defineProperty({}, "status", {
        enumerable: true,
        get() { getterCalls += 1; return "REJECTED"; },
      }),
    }]);
    expect(resolveToolClassificationWithRegistry(registry, "owned", {})).toEqual({
      status: "ERROR", reason: "PLUGIN_CLASSIFIER_RESULT_INVALID",
    });
    expect(getterCalls).toBe(0);
  });

  test("classified plugin results are detached and recursively frozen", () => {
    const operand = { source: "ARGUMENT_PATH", argumentName: "path", rawPath: "before.txt", reach: "EXACT" };
    const requirement = { capability: "fs.read", operand };
    const requirements = [requirement];
    const raw = { status: "CLASSIFIED", family: "FILESYSTEM", requirements };
    const registry = createPluginToolClassifierRegistry([{
      classifierId: "detached",
      ownedToolNames: ["owned"],
      classify: () => raw,
    }]);
    const result = resolveToolClassificationWithRegistry(registry, "owned", {});
    operand.rawPath = "after.txt";
    requirements.splice(0, 1);

    expect(result).toEqual({
      status: "CLASSIFIED",
      requirements: [{
        capability: "fs.read",
        operand: { source: "ARGUMENT_PATH", argumentName: "path", rawPath: "before.txt", reach: "EXACT" },
      }],
    });
    expect(Object.isFrozen(result)).toBe(true);
    if (result.status === "CLASSIFIED") {
      expect(Object.isFrozen(result.requirements)).toBe(true);
      expect(Object.isFrozen(result.requirements[0])).toBe(true);
      expect(Object.isFrozen(result.requirements[0]?.operand)).toBe(true);
    }
  });

  test("forged registry handles are rejected", () => {
    expect(resolveToolClassificationWithRegistry(Object.freeze({ status: "READY" }), "unknown", {})).toEqual({
      status: "ERROR", reason: "PLUGIN_REGISTRY_INVALID",
    });
  });

  test("M4-014 stricter invocation validation does not mutate accepted M4-013 behavior", () => {
    expect(resolveToolClassification("STRICT_DENY_V1", "   ", {})).toEqual({
      status: "UNCLASSIFIED", profile: "STRICT_DENY_V1", disposition: "BLOCK", reason: "NO_APPLICABLE_CLASSIFIER",
    });
    const registry = createPluginToolClassifierRegistry([]);
    expect(resolveToolClassificationWithRegistry(registry, "   ", {})).toEqual({
      status: "ERROR", reason: "TOOL_NAME_INVALID",
    });
  });
});
