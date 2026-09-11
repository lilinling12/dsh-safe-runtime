import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  APPEND_OUTCOME_KINDS,
  InMemoryAppendOnlyAuditStore,
  classifyAppendPublication,
  type AuditRecord,
} from "./append-only-store.js";

const PROFILE = "M5-001_APPEND_ONLY_AUDIT_STORE_V1";
const PINNED_HARNESS = Object.freeze({
  version: "0.1.0-rc.5",
  commit: "47f943859bef60e4160492346772ded9b24f765a",
});
const CASE_IDS = Object.freeze(
  Array.from({ length: 28 }, (_, index) => `AOS-${String(index + 1).padStart(3, "0")}`),
);

function record(label: string): AuditRecord {
  return {
    type: "test.audit",
    label,
    nested: { values: [1, true, null, label] },
  };
}

describe("M5-001 append-only audit store", () => {
  it("pins the complete portable requirement corpus", async () => {
    const corpusPath = resolve(process.cwd(), "fixtures/append-only-audit-store/cases.json");
    const corpus = JSON.parse(await readFile(corpusPath, "utf8")) as {
      profile: string;
      pinnedHarness: { version: string; commit: string };
      cases: { id: string }[];
    };

    expect(corpus.profile).toBe(PROFILE);
    expect(corpus.pinnedHarness).toEqual(PINNED_HARNESS);
    expect(corpus.cases.map(({ id }) => id)).toEqual(CASE_IDS);
    expect(new Set(corpus.cases.map(({ id }) => id)).size).toBe(28);
  });

  it("appends only at the tail and preserves immutable history", async () => {
    const store = new InMemoryAppendOnlyAuditStore();
    const firstInput = record("first");
    const secondInput = record("second");

    await expect(store.append(firstInput)).resolves.toEqual({ kind: "APPENDED", sequence: 0 });
    const prefix = store.snapshot();
    await expect(store.append(secondInput)).resolves.toEqual({ kind: "APPENDED", sequence: 1 });
    const after = store.snapshot();

    expect(prefix).toHaveLength(1);
    expect(after).toHaveLength(2);
    expect(after[0]).toBe(prefix[0]);
    expect(after.map(({ sequence }) => sequence)).toEqual([0, 1]);
    expect(after.map(({ record: stored }) => stored.label)).toEqual(["first", "second"]);
    expect(after.every(Object.isFrozen)).toBe(true);
    expect(after.every(({ record: stored }) => Object.isFrozen(stored))).toBe(true);
  });

  it("isolates stored history from caller and snapshot mutation aliases", async () => {
    const store = new InMemoryAppendOnlyAuditStore();
    const mutable = {
      type: "test.audit",
      nested: { values: ["before"] },
    } as unknown as AuditRecord;

    await expect(store.append(mutable)).resolves.toEqual({ kind: "APPENDED", sequence: 0 });
    (mutable.nested as { values: string[] }).values[0] = "after";

    const first = store.snapshot();
    expect((first[0]?.record.nested as { readonly values: readonly string[] }).values).toEqual(["before"]);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0]?.record.nested)).toBe(true);
    expect(Object.isFrozen((first[0]?.record.nested as { values: readonly string[] }).values)).toBe(true);

    expect(() => {
      (first as unknown as { sequence: number }[]).push({ sequence: 99 });
    }).toThrow();
    expect(() => {
      ((first[0]?.record.nested as { values: string[] }).values)[0] = "rewrite";
    }).toThrow();

    expect((store.snapshot()[0]?.record.nested as { readonly values: readonly string[] }).values).toEqual([
      "before",
    ]);
  });

  it("preserves hostile own property names as opaque data without prototype mutation", async () => {
    const store = new InMemoryAppendOnlyAuditStore();
    const input = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(input, "__proto__", {
      value: { polluted: "no" },
      enumerable: true,
      writable: true,
      configurable: true,
    });
    input.constructor = "opaque-constructor";
    input.prototype = "opaque-prototype";

    await expect(store.append(input as AuditRecord)).resolves.toEqual({ kind: "APPENDED", sequence: 0 });

    const stored = store.snapshot()[0]?.record;
    expect(stored).toBeDefined();
    expect(Object.getPrototypeOf(stored)).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(stored, "__proto__")).toBe(true);
    expect(stored?.["__proto__"]).toEqual({ polluted: "no" });
    expect(stored?.constructor).toBe("opaque-constructor");
    expect(stored?.prototype).toBe("opaque-prototype");
    expect(({} as { polluted?: string }).polluted).toBeUndefined();
  });

  it("allows duplicate payload occurrences without inventing deduplication", async () => {
    const store = new InMemoryAppendOnlyAuditStore();
    const duplicate = record("duplicate");

    const [first, second] = await Promise.all([store.append(duplicate), store.append(duplicate)]);

    expect(first).toEqual({ kind: "APPENDED", sequence: 0 });
    expect(second).toEqual({ kind: "APPENDED", sequence: 1 });
    expect(store.snapshot()).toHaveLength(2);
    expect(store.snapshot()[0]?.record).toEqual(store.snapshot()[1]?.record);
  });

  it("serializes overlapping appends into one gap-free observable total order", async () => {
    const store = new InMemoryAppendOnlyAuditStore();
    const attempts = Array.from({ length: 64 }, (_, index) => store.append(record(`r-${index}`)));
    const outcomes = await Promise.all(attempts);
    const snapshot = store.snapshot();

    expect(outcomes.map((outcome) => outcome.kind)).toEqual(Array.from({ length: 64 }, () => "APPENDED"));
    expect(outcomes.map((outcome) => outcome.kind === "APPENDED" ? outcome.sequence : -1)).toEqual(
      Array.from({ length: 64 }, (_, index) => index),
    );
    expect(snapshot.map(({ sequence }) => sequence)).toEqual(Array.from({ length: 64 }, (_, index) => index));
  });

  it("keeps ordering authority scoped to each independent ledger", async () => {
    const left = new InMemoryAppendOnlyAuditStore();
    const right = new InMemoryAppendOnlyAuditStore();

    await Promise.all([left.append(record("left")), right.append(record("right"))]);

    expect(left.snapshot().map(({ sequence }) => sequence)).toEqual([0]);
    expect(right.snapshot().map(({ sequence }) => sequence)).toEqual([0]);
  });

  it("has append as its only portable mutation surface", () => {
    const store = new InMemoryAppendOnlyAuditStore() as unknown as Record<string, unknown>;
    for (const forbidden of ["update", "replace", "delete", "truncate", "insert", "move", "clear"]) {
      expect(forbidden in store).toBe(false);
    }
    expect(typeof store.append).toBe("function");
    expect(typeof store.snapshot).toBe("function");
  });

  it("classifies publication truthfully without collapsing ambiguity", () => {
    expect(APPEND_OUTCOME_KINDS).toEqual(["APPENDED", "NOT_APPENDED", "INDETERMINATE"]);
    expect(classifyAppendPublication({ kind: "PUBLISHED", sequence: 7 })).toEqual({
      kind: "APPENDED",
      sequence: 7,
    });
    expect(classifyAppendPublication({ kind: "NOT_PUBLISHED", reason: "rejected" })).toEqual({
      kind: "NOT_APPENDED",
      reason: "rejected",
    });
    expect(classifyAppendPublication({ kind: "UNKNOWN", reason: "ack-lost" })).toEqual({
      kind: "INDETERMINATE",
      reason: "ack-lost",
    });
    expect(() => classifyAppendPublication({ kind: "PUBLISHED", sequence: -1 })).toThrow(RangeError);
  });

  it("returns NOT_APPENDED without partial state for invalid caller data", async () => {
    const store = new InMemoryAppendOnlyAuditStore();
    const invalid = { nested: { callable: () => "not structured data" } } as unknown as AuditRecord;

    await expect(store.append(invalid)).resolves.toEqual({
      kind: "NOT_APPENDED",
      reason: "INVALID_RECORD",
    });
    expect(store.snapshot()).toEqual([]);
  });

  it("does not pull canonicalization, digests, hash chains, Harness, or database bindings into M5-001", async () => {
    const sourcePath = resolve(process.cwd(), "packages/storage/src/append-only-store.ts");
    const packagePath = resolve(process.cwd(), "packages/storage/package.json");
    const source = await readFile(sourcePath, "utf8");
    const packageJson = await readFile(packagePath, "utf8");

    expect(source).not.toMatch(/sha(?:256|512)|previousRecordDigest|hashChain|canonicalJson/i);
    expect(source).not.toContain("@deepseek-ai/");
    expect(source).not.toMatch(/from\s+["']node:fs(?:\/promises)?["']/);
    expect(source).not.toMatch(/from\s+["'](?:better-sqlite3|sqlite3|pg|postgres)["']/i);
    expect(packageJson).not.toContain("dependencies");
  });
});
