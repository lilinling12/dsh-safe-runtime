import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import {
  AdapterDshFinalResultMappingFixtureError,
  parseAdapterDshFinalResultMappingFixture,
  runAdapterDshFinalResultMappingFixture,
  type AdapterDshFinalResultMappingObservable,
} from "./adapter-dsh-final-result-mapping.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const successFixturePath = resolve(root, "fixtures/tck/valid/adapter-dsh-final-result-success.json");
const errorFixturePath = resolve(root, "fixtures/tck/valid/adapter-dsh-final-result-error.json");
const errorCodeFixturePath = resolve(root, "fixtures/tck/valid/adapter-dsh-final-result-error-code.json");

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} is not an object`);
  }
  return value as JsonRecord;
}

async function loadRaw(path: string): Promise<JsonRecord> {
  return record(JSON.parse(await readFile(path, "utf8")), "fixture");
}

async function load(path: string) {
  return parseAdapterDshFinalResultMappingFixture(await loadRaw(path));
}

function successProjection(): AdapterDshFinalResultMappingObservable {
  return {
    type: "tool.completed",
    callRef: "final-success-1",
    toolName: "read",
    outcome: "success",
    resultDigest: "fixture:post-final-result",
  };
}

function errorProjection(): AdapterDshFinalResultMappingObservable {
  return {
    type: "tool.completed",
    callRef: "final-error-1",
    toolName: "read",
    outcome: "error",
    resultDigest: "fixture:generic-error-result",
  };
}

function errorCodeProjection(): AdapterDshFinalResultMappingObservable {
  return {
    type: "tool.completed",
    callRef: "final-error-code-1",
    toolName: "write",
    outcome: "error",
    resultDigest: "fixture:generic-error-code-result",
    errorCode: "TOOL_FAILED",
  };
}

function source(raw: JsonRecord): JsonRecord {
  return record(record(raw.stimulus, "stimulus").sourceObservation, "sourceObservation");
}

function result(raw: JsonRecord): JsonRecord {
  return record(source(raw).result, "result");
}

async function expectInvalid(
  path: string,
  mutate: (fixture: JsonRecord) => void,
): Promise<void> {
  const raw = await loadRaw(path);
  mutate(raw);
  expect(() => parseAdapterDshFinalResultMappingFixture(raw))
    .toThrow(AdapterDshFinalResultMappingFixtureError);
}

describe("M3-013 Adapter DSH final-result mapping portable profile", () => {
  it("passes authoritative success mapping", async () => {
    const fixture = await load(successFixturePath);
    await expect(runAdapterDshFinalResultMappingFixture(fixture, successProjection))
      .resolves.toEqual({ status: "PASS" });
  });

  it("passes generic error mapping without an error code", async () => {
    const fixture = await load(errorFixturePath);
    await expect(runAdapterDshFinalResultMappingFixture(fixture, errorProjection))
      .resolves.toEqual({ status: "PASS" });
  });

  it("passes generic error mapping while preserving a non-cancellation error code", async () => {
    const fixture = await load(errorCodeFixturePath);
    await expect(runAdapterDshFinalResultMappingFixture(fixture, errorCodeProjection))
      .resolves.toEqual({ status: "PASS" });
  });

  it("reports FAIL for a valid projection with the wrong final outcome", async () => {
    const fixture = await load(errorFixturePath);
    await expect(runAdapterDshFinalResultMappingFixture(fixture, () => ({
      ...errorProjection(),
      outcome: "success",
    }))).resolves.toEqual({
      status: "FAIL",
      code: "ADAPTER_DSH_FINAL_RESULT_MAPPING_MISMATCH",
    });
  });

  it("reports FAIL for a valid projection with the wrong authoritative digest", async () => {
    const fixture = await load(successFixturePath);
    await expect(runAdapterDshFinalResultMappingFixture(fixture, () => ({
      ...successProjection(),
      resultDigest: "fixture:body-value-not-authoritative",
    }))).resolves.toEqual({
      status: "FAIL",
      code: "ADAPTER_DSH_FINAL_RESULT_MAPPING_MISMATCH",
    });
  });

  it("reports ERROR when the implementation throws", async () => {
    const fixture = await load(successFixturePath);
    await expect(runAdapterDshFinalResultMappingFixture(fixture, () => {
      throw new Error("adapter failed before projecting a final fact");
    })).resolves.toEqual({
      status: "ERROR",
      code: "ADAPTER_DSH_FINAL_RESULT_MAPPING_IMPLEMENTATION_ERROR",
    });
  });

  it("reports ERROR for malformed implementation projection output", async () => {
    const fixture = await load(successFixturePath);
    const malformed = () => ({
      ...successProjection(),
      unexpected: true,
    }) as unknown as AdapterDshFinalResultMappingObservable;

    await expect(runAdapterDshFinalResultMappingFixture(fixture, malformed)).resolves.toEqual({
      status: "ERROR",
      code: "ADAPTER_DSH_FINAL_RESULT_MAPPING_IMPLEMENTATION_ERROR",
    });
  });

  it("rejects cancellation codes before invoking the implementation", async () => {
    const raw = await loadRaw(errorCodeFixturePath);
    record(record(result(raw).error, "error").info, "info").code = "ABORTED";
    const project = vi.fn(errorCodeProjection);

    expect(() => parseAdapterDshFinalResultMappingFixture(raw))
      .toThrow(AdapterDshFinalResultMappingFixtureError);
    expect(project).not.toHaveBeenCalled();
  });

  it("rejects non-authoritative source seams", async () => {
    await expectInvalid(successFixturePath, (raw) => {
      source(raw).source = "session/event";
    });
  });

  it("rejects contradictory success results carrying error payloads", async () => {
    await expectInvalid(successFixturePath, (raw) => {
      result(raw).error = { info: { code: "TOOL_FAILED" } };
    });
  });

  it("rejects malformed generic error info and empty codes", async () => {
    await expectInvalid(errorCodeFixturePath, (raw) => {
      record(result(raw).error, "error").info = "not-an-object";
    });
    await expectInvalid(errorCodeFixturePath, (raw) => {
      record(record(result(raw).error, "error").info, "info").code = "";
    });
  });

  it("rejects unknown profile-owned source fields", async () => {
    await expectInvalid(successFixturePath, (raw) => {
      source(raw).unexpected = true;
    });
  });

  it("rejects cyclic, sparse, and decorated direct-call portable values", async () => {
    const cyclicRaw = await loadRaw(successFixturePath);
    const cyclic: JsonRecord = {};
    cyclic.self = cyclic;
    record(source(cyclicRaw).execution, "execution").arguments = cyclic;
    expect(() => parseAdapterDshFinalResultMappingFixture(cyclicRaw))
      .toThrow(AdapterDshFinalResultMappingFixtureError);

    const sparseRaw = await loadRaw(successFixturePath);
    const sparse: unknown[] = [];
    sparse.length = 2;
    sparse[1] = "value";
    result(sparseRaw).content = sparse;
    expect(() => parseAdapterDshFinalResultMappingFixture(sparseRaw))
      .toThrow(AdapterDshFinalResultMappingFixtureError);

    const decoratedRaw = await loadRaw(successFixturePath);
    const decorated = ["value"] as unknown[] & { extra?: string };
    decorated.extra = "not-json";
    result(decoratedRaw).content = decorated;
    expect(() => parseAdapterDshFinalResultMappingFixture(decoratedRaw))
      .toThrow(AdapterDshFinalResultMappingFixtureError);
  });

  it("rejects exotic object values from direct language callers", async () => {
    const raw = await loadRaw(successFixturePath);
    record(source(raw).execution, "execution").arguments = new Date(0);
    expect(() => parseAdapterDshFinalResultMappingFixture(raw))
      .toThrow(AdapterDshFinalResultMappingFixtureError);
  });

  it("keeps expectation correlation normative without passing oracle data to the projector", async () => {
    const raw = await loadRaw(successFixturePath);
    record(record(raw.expect, "expect").event, "event").resultDigest = "fixture:invented-by-oracle";
    expect(() => parseAdapterDshFinalResultMappingFixture(raw))
      .toThrow(AdapterDshFinalResultMappingFixtureError);

    const fixture = await load(successFixturePath);
    const project = vi.fn((stimulus) => {
      expect(stimulus).toBe(fixture.stimulus);
      expect(stimulus).not.toHaveProperty("expect");
      return successProjection();
    });
    await expect(runAdapterDshFinalResultMappingFixture(fixture, project))
      .resolves.toEqual({ status: "PASS" });
    expect(project).toHaveBeenCalledTimes(1);
  });

  it("keeps portable artifacts free of concrete Harness package paths", async () => {
    const paths = [
      resolve(root, "specs/0012-m3-adapter-dsh-final-result-mapping-tck.md"),
      successFixturePath,
      errorFixturePath,
      errorCodeFixturePath,
      resolve(here, "adapter-dsh-final-result-mapping.ts"),
    ];
    for (const path of paths) {
      const text = await readFile(path, "utf8");
      expect(text).not.toContain("@deepseek-ai/");
      expect(text).not.toContain("dsh-agent-loop");
    }
  });
});
