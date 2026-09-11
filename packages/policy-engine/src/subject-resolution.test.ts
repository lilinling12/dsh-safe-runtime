import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { resolveSubject } from "./subject-resolution.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/subject-resolution/cases.json");

interface FixtureCase {
  readonly id: string;
  readonly description: string;
  readonly subject: unknown;
  readonly requestSessionRef: unknown;
  readonly expected: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function materializeFixtureValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(materializeFixtureValue);
  if (!isRecord(value)) return value;

  const keys = Object.keys(value);
  if (keys.length === 1 && keys[0] === "$fixtureString") {
    const directive = value["$fixtureString"];
    if (!isRecord(directive)
      || Object.keys(directive).length !== 2
      || typeof directive["repeat"] !== "string"
      || [...directive["repeat"]].length !== 1
      || !Number.isInteger(directive["count"])
      || (directive["count"] as number) < 0
      || (directive["count"] as number) > 513) {
      throw new Error("invalid $fixtureString directive");
    }
    return directive["repeat"].repeat(directive["count"] as number);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, materializeFixtureValue(child)]),
  );
}

function fixtureCases(): readonly FixtureCase[] {
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed["cases"])) {
    throw new Error("subject-resolution fixture must contain a cases array");
  }

  const seen = new Set<string>();
  return parsed["cases"].map((raw) => {
    if (!isRecord(raw)
      || typeof raw["id"] !== "string"
      || typeof raw["description"] !== "string"
      || !Object.hasOwn(raw, "subject")
      || !Object.hasOwn(raw, "requestSessionRef")
      || !Object.hasOwn(raw, "expected")) {
      throw new Error("malformed subject-resolution portable fixture");
    }
    if (seen.has(raw["id"])) throw new Error(`duplicate subject-resolution fixture id: ${raw["id"]}`);
    seen.add(raw["id"]);
    return {
      id: raw["id"],
      description: raw["description"],
      subject: raw["subject"],
      requestSessionRef: raw["requestSessionRef"],
      expected: raw["expected"],
    };
  });
}

const cases = fixtureCases();

describe("M4-020 portable Subject-resolution corpus", () => {
  test("fixture corpus has the reviewed breadth", () => {
    expect(cases).toHaveLength(30);
  });

  for (const fixture of cases) {
    test(`${fixture.id}: ${fixture.description}`, () => {
      expect(resolveSubject(
        materializeFixtureValue(fixture.subject),
        materializeFixtureValue(fixture.requestSessionRef),
      )).toEqual(materializeFixtureValue(fixture.expected));
    });
  }
});

describe("M4-020 hostile Subject boundaries", () => {
  test("invalid request session is rejected before the Subject is touched", () => {
    let trapCalls = 0;
    const hostile = new Proxy({}, {
      ownKeys() { trapCalls += 1; throw new Error("must not be inspected"); },
      getOwnPropertyDescriptor() { trapCalls += 1; throw new Error("must not be inspected"); },
    });
    expect(resolveSubject(hostile, "")).toEqual({
      status: "ERROR",
      reason: "SUBJECT_REQUEST_SESSION_INVALID",
    });
    expect(trapCalls).toBe(0);
  });

  test("inherited identity fields cannot manufacture a Subject", () => {
    const subject = Object.create({ kind: "agent", id: "agent/inherited" }) as Record<string, unknown>;
    expect(resolveSubject(subject, "session:1")).toEqual({
      status: "ERROR",
      reason: "SUBJECT_FIELDS_INVALID",
    });
  });

  test("accessor-backed normative fields never execute getters", () => {
    for (const field of ["kind", "id", "parent", "sessionRef"] as const) {
      let getterCalls = 0;
      const base: Record<string, unknown> = {
        kind: field === "kind" ? undefined : "agent",
        id: field === "id" ? undefined : "agent/root",
      };
      if (field === "parent") base["parent"] = undefined;
      if (field === "sessionRef") base["sessionRef"] = undefined;
      Object.defineProperty(base, field, {
        enumerable: true,
        configurable: true,
        get() { getterCalls += 1; return "attacker-controlled"; },
      });

      expect(resolveSubject(base, "session:1")).toEqual({
        status: "ERROR",
        reason: "SUBJECT_FIELDS_INVALID",
      });
      expect(getterCalls).toBe(0);
    }
  });

  test("unexpected symbol fields fail closed", () => {
    const symbol = Symbol("authority");
    const subject: Record<PropertyKey, unknown> = { kind: "agent", id: "agent/root" };
    subject[symbol] = "admin";
    expect(resolveSubject(subject, "session:1")).toEqual({
      status: "ERROR",
      reason: "SUBJECT_FIELDS_INVALID",
    });
  });

  test("ownKeys and descriptor failures become stable unreadable errors", () => {
    const ownKeysFailure = new Proxy({}, {
      ownKeys() { throw new Error("secret ownKeys failure"); },
    });
    expect(resolveSubject(ownKeysFailure, "session:1")).toEqual({
      status: "ERROR",
      reason: "SUBJECT_INPUT_UNREADABLE",
    });

    for (const failingField of ["kind", "id", "parent", "sessionRef"] as const) {
      const target: Record<string, unknown> = {
        kind: "agent",
        id: "agent/root",
        parent: "agent/parent",
        sessionRef: "session:1",
      };
      const subject = new Proxy(target, {
        getOwnPropertyDescriptor(innerTarget, property) {
          if (property === failingField) throw new Error("secret descriptor failure");
          return Reflect.getOwnPropertyDescriptor(innerTarget, property);
        },
      });
      expect(resolveSubject(subject, "session:1")).toEqual({
        status: "ERROR",
        reason: "SUBJECT_INPUT_UNREADABLE",
      });
    }
  });

  test("revoked Proxy is fail-closed rather than escaping Array.isArray", () => {
    const revocable = Proxy.revocable({}, {});
    revocable.revoke();
    expect(resolveSubject(revocable.proxy, "session:1")).toEqual({
      status: "ERROR",
      reason: "SUBJECT_INPUT_UNREADABLE",
    });
  });

  test("inspection order stops after the first semantic failure", () => {
    let idDescriptorCalls = 0;
    const target = { kind: "Agent", id: "agent/root" };
    const subject = new Proxy(target, {
      getOwnPropertyDescriptor(innerTarget, property) {
        if (property === "id") {
          idDescriptorCalls += 1;
          throw new Error("id must not be inspected after invalid kind");
        }
        return Reflect.getOwnPropertyDescriptor(innerTarget, property);
      },
    });
    expect(resolveSubject(subject, "session:1")).toEqual({
      status: "ERROR",
      reason: "SUBJECT_KIND_INVALID",
    });
    expect(idDescriptorCalls).toBe(0);
  });

  test("successful result is detached and recursively immutable", () => {
    const input: Record<string, unknown> = {
      kind: "subagent",
      id: "subagent:child",
      parent: "agent/root",
    };
    const result = resolveSubject(input, "session:1");
    input["id"] = "mutated";
    input["parent"] = "mutated-parent";

    expect(result).toEqual({
      status: "RESOLVED",
      subject: {
        kind: "subagent",
        id: "subagent:child",
        parent: "agent/root",
        sessionRef: "session:1",
      },
    });
    expect(Object.isFrozen(result)).toBe(true);
    if (result.status === "RESOLVED") expect(Object.isFrozen(result.subject)).toBe(true);
  });

  test("failures do not echo attacker-controlled values", () => {
    const secret = "do-not-leak-this-value";
    const result = resolveSubject({ kind: "worker", id: secret }, "session:1");
    expect(result).toEqual({ status: "ERROR", reason: "SUBJECT_KIND_INVALID" });
    expect(JSON.stringify(result)).not.toContain(secret);
  });
});
