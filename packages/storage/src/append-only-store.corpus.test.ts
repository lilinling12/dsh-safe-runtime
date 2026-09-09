import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  InMemoryAppendOnlyAuditStore,
  classifyAppendPublication,
  type AuditRecord,
} from "./append-only-store.js";

const CASE_IDS = Object.freeze(
  Array.from({ length: 28 }, (_, index) => `AOS-${String(index + 1).padStart(3, "0")}`),
);

function record(label: string): AuditRecord {
  return { type: "corpus.audit", label, nested: { values: [label] } };
}

async function sourceText(): Promise<string> {
  return readFile(resolve(process.cwd(), "packages/storage/src/append-only-store.ts"), "utf8");
}

async function verifyCase(id: string): Promise<void> {
  switch (id) {
    case "AOS-001": {
      const store = new InMemoryAppendOnlyAuditStore();
      await expect(store.append(record("one"))).resolves.toEqual({ kind: "APPENDED", sequence: 0 });
      expect(store.snapshot()).toHaveLength(1);
      return;
    }
    case "AOS-002": {
      const store = new InMemoryAppendOnlyAuditStore();
      await store.append(record("a"));
      await store.append(record("b"));
      expect(store.snapshot().map(({ record: value }) => value.label)).toEqual(["a", "b"]);
      return;
    }
    case "AOS-003": {
      const store = new InMemoryAppendOnlyAuditStore();
      await store.append(record("a"));
      const prefix = store.snapshot()[0];
      await store.append(record("b"));
      expect(store.snapshot()[0]).toBe(prefix);
      return;
    }
    case "AOS-004":
    case "AOS-005": {
      const store = new InMemoryAppendOnlyAuditStore();
      await Promise.all(Array.from({ length: 8 }, (_, index) => store.append(record(String(index)))));
      expect(store.snapshot().map(({ sequence }) => sequence)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      return;
    }
    case "AOS-006": {
      const store = new InMemoryAppendOnlyAuditStore();
      await store.append(record("single"));
      expect(store.snapshot()).toHaveLength(1);
      return;
    }
    case "AOS-007": {
      const store = new InMemoryAppendOnlyAuditStore();
      const duplicate = record("same");
      await store.append(duplicate);
      await store.append(duplicate);
      expect(store.snapshot()).toHaveLength(2);
      expect(store.snapshot()[0]?.sequence).not.toBe(store.snapshot()[1]?.sequence);
      return;
    }
    case "AOS-008":
    case "AOS-009":
    case "AOS-010":
    case "AOS-011":
    case "AOS-012": {
      const store = new InMemoryAppendOnlyAuditStore() as unknown as Record<string, unknown>;
      const forbidden: Readonly<Record<string, string>> = Object.freeze({
        "AOS-008": "update",
        "AOS-009": "replace",
        "AOS-010": "delete",
        "AOS-011": "truncate",
        "AOS-012": "move",
      });
      expect(forbidden[id] in store).toBe(false);
      if (id === "AOS-011") expect("clear" in store).toBe(false);
      if (id === "AOS-012") expect("insert" in store).toBe(false);
      return;
    }
    case "AOS-013": {
      expect(classifyAppendPublication({ kind: "PUBLISHED", sequence: 3 })).toEqual({
        kind: "APPENDED",
        sequence: 3,
      });
      return;
    }
    case "AOS-014": {
      expect(classifyAppendPublication({ kind: "NOT_PUBLISHED", reason: "rejected" })).toEqual({
        kind: "NOT_APPENDED",
        reason: "rejected",
      });
      return;
    }
    case "AOS-015": {
      const store = new InMemoryAppendOnlyAuditStore();
      const invalid = { callable: () => undefined } as unknown as AuditRecord;
      await expect(store.append(invalid)).resolves.toEqual({ kind: "NOT_APPENDED", reason: "INVALID_RECORD" });
      expect(store.snapshot()).toEqual([]);
      return;
    }
    case "AOS-016": {
      expect(classifyAppendPublication({ kind: "UNKNOWN", reason: "ack-lost" })).toEqual({
        kind: "INDETERMINATE",
        reason: "ack-lost",
      });
      return;
    }
    case "AOS-017": {
      const store = new InMemoryAppendOnlyAuditStore() as unknown as Record<string, unknown>;
      expect("retry" in store).toBe(false);
      expect(classifyAppendPublication({ kind: "UNKNOWN", reason: "unknown" }).kind).toBe("INDETERMINATE");
      return;
    }
    case "AOS-018": {
      expect(classifyAppendPublication({ kind: "NOT_PUBLISHED", reason: "dropped" }).kind).toBe("NOT_APPENDED");
      expect(classifyAppendPublication({ kind: "UNKNOWN", reason: "uncertain" }).kind).not.toBe("APPENDED");
      return;
    }
    case "AOS-019": {
      const store = new InMemoryAppendOnlyAuditStore();
      const input = { nested: { values: ["before"] } } as unknown as AuditRecord;
      await store.append(input);
      (input.nested as { values: string[] }).values[0] = "after";
      expect((store.snapshot()[0]?.record.nested as { readonly values: readonly string[] }).values).toEqual(["before"]);
      return;
    }
    case "AOS-020": {
      const store = new InMemoryAppendOnlyAuditStore();
      await store.append(record("frozen"));
      const snapshot = store.snapshot();
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot[0]?.record)).toBe(true);
      return;
    }
    case "AOS-021": {
      const store = new InMemoryAppendOnlyAuditStore();
      const outcomes = await Promise.all([store.append(record("a")), store.append(record("b"))]);
      expect(outcomes).toEqual([
        { kind: "APPENDED", sequence: 0 },
        { kind: "APPENDED", sequence: 1 },
      ]);
      return;
    }
    case "AOS-022": {
      const store = new InMemoryAppendOnlyAuditStore();
      const first = await store.append(record("first"));
      const second = await store.append(record("second"));
      expect(first).toEqual({ kind: "APPENDED", sequence: 0 });
      expect(second).toEqual({ kind: "APPENDED", sequence: 1 });
      return;
    }
    case "AOS-023": {
      const left = new InMemoryAppendOnlyAuditStore();
      const right = new InMemoryAppendOnlyAuditStore();
      await Promise.all([left.append(record("left")), right.append(record("right"))]);
      expect(left.snapshot()[0]?.sequence).toBe(0);
      expect(right.snapshot()[0]?.sequence).toBe(0);
      return;
    }
    case "AOS-024": {
      const left = new InMemoryAppendOnlyAuditStore();
      const right = new InMemoryAppendOnlyAuditStore();
      const invalid = { callable: () => undefined } as unknown as AuditRecord;
      await left.append(invalid);
      await right.append(record("right"));
      expect(left.snapshot()).toEqual([]);
      expect(right.snapshot()).toHaveLength(1);
      return;
    }
    case "AOS-025": {
      expect(await sourceText()).not.toMatch(/canonicalJson/i);
      return;
    }
    case "AOS-026": {
      expect(await sourceText()).not.toMatch(/sha(?:256|512)|previousRecordDigest|hashChain/i);
      return;
    }
    case "AOS-027": {
      const source = await sourceText();
      expect(source).not.toContain("@deepseek-ai/");
      expect(source).not.toContain("SidecarEvidenceRecord");
      expect(source).not.toContain("SidecarEvidenceSink");
      return;
    }
    case "AOS-028": {
      const spec = await readFile(resolve(process.cwd(), "specs/0053-m5-append-only-audit-store.md"), "utf8");
      for (const requiredPath of [
        "specs/0053-m5-append-only-audit-store.md",
        "fixtures/append-only-audit-store/cases.json",
        "docs/handoff/CURRENT.md",
      ]) {
        expect(spec).toContain(requiredPath);
      }
      expect(spec).toContain("It MUST NOT include production implementation");
      expect(spec).toContain("protocol-first commit MUST be restricted to exactly");
      return;
    }
    default:
      throw new Error(`unmapped M5-001 corpus case: ${id}`);
  }
}

describe("M5-001 portable corpus executable projection", () => {
  it.each(CASE_IDS)("executes %s exactly through the conformance switch", async (id) => {
    await verifyCase(id);
  });
});
