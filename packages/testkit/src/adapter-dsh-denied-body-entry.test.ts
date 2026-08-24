import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import {
  AdapterDshDeniedBodyEntryFixtureError,
  parseAdapterDshDeniedBodyEntryFixture,
  runAdapterDshDeniedBodyEntryFixture,
  type AdapterDshDeniedBodyEntryObservable,
} from "./adapter-dsh-denied-body-entry.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/tck/valid/adapter-dsh-denied-body-entry.json");

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} is not an object`);
  }
  return value as JsonRecord;
}

async function loadRawFixture(): Promise<JsonRecord> {
  return record(JSON.parse(await readFile(fixturePath, "utf8")), "fixture");
}

async function loadFixture() {
  return parseAdapterDshDeniedBodyEntryFixture(await loadRawFixture());
}

function expectedProjection(): AdapterDshDeniedBodyEntryObservable {
  return {
    kind: "DENIAL_BODY_ENTRY",
    callRef: "deny-1",
    toolName: "mutate",
    decision: "DENIED",
    bodyEntered: false,
  };
}

async function expectInvalid(mutate: (fixture: JsonRecord) => void): Promise<void> {
  const fixture = await loadRawFixture();
  mutate(fixture);
  expect(() => parseAdapterDshDeniedBodyEntryFixture(fixture))
    .toThrow(AdapterDshDeniedBodyEntryFixtureError);
}

describe("M3-012 Adapter DSH denied body-entry portable profile", () => {
  it("passes explicit denial evidence with no body entry", async () => {
    const fixture = await loadFixture();
    await expect(runAdapterDshDeniedBodyEntryFixture(fixture, expectedProjection))
      .resolves.toEqual({ status: "PASS" });
  });

  it("fails when a valid denied projection proves the body was entered", async () => {
    const fixture = await loadFixture();
    await expect(runAdapterDshDeniedBodyEntryFixture(fixture, () => ({
      ...expectedProjection(),
      bodyEntered: true,
    }))).resolves.toEqual({
      status: "FAIL",
      code: "ADAPTER_DSH_DENIED_BODY_ENTRY_MISMATCH",
    });
  });

  it("does not derive the expected oracle from implementation evidence", async () => {
    const raw = await loadRawFixture();
    record(raw.expect, "expect").toolName = "different-tool";
    expect(() => parseAdapterDshDeniedBodyEntryFixture(raw))
      .toThrow(AdapterDshDeniedBodyEntryFixtureError);
  });

  it("classifies implementation exceptions as ERROR rather than denial proof", async () => {
    const fixture = await loadFixture();
    await expect(runAdapterDshDeniedBodyEntryFixture(fixture, () => {
      throw new Error("runtime failed before producing evidence");
    })).resolves.toEqual({
      status: "ERROR",
      code: "ADAPTER_DSH_DENIED_BODY_ENTRY_IMPLEMENTATION_ERROR",
    });
  });

  it("classifies malformed projection output as ERROR", async () => {
    const fixture = await loadFixture();
    const malformed = () => ({
      kind: "DENIAL_BODY_ENTRY",
      callRef: "deny-1",
      toolName: "mutate",
      bodyEntered: false,
    }) as unknown as AdapterDshDeniedBodyEntryObservable;

    await expect(runAdapterDshDeniedBodyEntryFixture(fixture, malformed)).resolves.toEqual({
      status: "ERROR",
      code: "ADAPTER_DSH_DENIED_BODY_ENTRY_IMPLEMENTATION_ERROR",
    });
  });

  it("rejects unsupported policy decisions before invoking the implementation", async () => {
    const raw = await loadRawFixture();
    record(record(raw.stimulus, "stimulus").policy, "policy").decision = "ALLOW";
    const project = vi.fn(expectedProjection);

    expect(() => parseAdapterDshDeniedBodyEntryFixture(raw))
      .toThrow(AdapterDshDeniedBodyEntryFixtureError);
    expect(project).not.toHaveBeenCalled();
  });

  it("rejects unknown fields", async () => {
    await expectInvalid((fixture) => {
      record(fixture.stimulus, "stimulus").unexpected = true;
    });
  });

  it("rejects cyclic direct-call arguments", async () => {
    const raw = await loadRawFixture();
    const cyclic: JsonRecord = {};
    cyclic.self = cyclic;
    record(record(raw.stimulus, "stimulus").call, "call").arguments = cyclic;
    expect(() => parseAdapterDshDeniedBodyEntryFixture(raw))
      .toThrow(AdapterDshDeniedBodyEntryFixtureError);
  });

  it("rejects sparse and decorated direct-call arrays", async () => {
    const raw = await loadRawFixture();
    const sparse: unknown[] = [];
    sparse.length = 2;
    sparse[1] = "value";
    record(record(raw.stimulus, "stimulus").call, "call").arguments = sparse;
    expect(() => parseAdapterDshDeniedBodyEntryFixture(raw))
      .toThrow(AdapterDshDeniedBodyEntryFixtureError);

    const decorated = ["value"] as unknown[] & { extra?: string };
    decorated.extra = "not-json";
    const rawDecorated = await loadRawFixture();
    record(record(rawDecorated.stimulus, "stimulus").call, "call").arguments = decorated;
    expect(() => parseAdapterDshDeniedBodyEntryFixture(rawDecorated))
      .toThrow(AdapterDshDeniedBodyEntryFixtureError);
  });

  it("keeps portable artifacts free of concrete Harness package paths", async () => {
    const paths = [
      resolve(root, "specs/0011-m3-adapter-dsh-denied-body-entry-tck.md"),
      fixturePath,
      resolve(here, "adapter-dsh-denied-body-entry.ts"),
    ];
    for (const path of paths) {
      const source = await readFile(path, "utf8");
      expect(source).not.toContain("@deepseek-ai/");
      expect(source).not.toContain("dsh-agent-loop");
    }
  });
});
