import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import {
  AdapterDshApprovalUnavailableFixtureError,
  parseAdapterDshApprovalUnavailableFixture,
  runAdapterDshApprovalUnavailableFixture,
  type AdapterDshApprovalUnavailableObservable,
} from "./adapter-dsh-approval-unavailable.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixtureRoot = resolve(root, "fixtures/tck/valid");
const fixtureNames = [
  "adapter-dsh-approval-unavailable-service-absent.json",
  "adapter-dsh-approval-unavailable-service-decision.json",
] as const;

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} is not an object`);
  }
  return value as JsonRecord;
}

async function loadRaw(name: (typeof fixtureNames)[number]): Promise<JsonRecord> {
  return record(JSON.parse(await readFile(resolve(fixtureRoot, name), "utf8")), "fixture");
}

async function load(name: (typeof fixtureNames)[number]) {
  return parseAdapterDshApprovalUnavailableFixture(await loadRaw(name));
}

function projection(audit: "NONE" | "DURABLE_PAIR"): AdapterDshApprovalUnavailableObservable {
  return { kind: "APPROVAL_UNAVAILABLE", decision: "UNAVAILABLE", audit };
}

describe("M3-014 Adapter DSH approval unavailable portable profile", () => {
  it("passes both explicit unavailable source forms", async () => {
    const absent = await load(fixtureNames[0]);
    const decided = await load(fixtureNames[1]);

    await expect(runAdapterDshApprovalUnavailableFixture(absent, () => projection("NONE")))
      .resolves.toEqual({ status: "PASS" });
    await expect(runAdapterDshApprovalUnavailableFixture(decided, () => projection("DURABLE_PAIR")))
      .resolves.toEqual({ status: "PASS" });
  });

  it("reports a valid but wrong audit shape as FAIL", async () => {
    const fixture = await load(fixtureNames[0]);
    await expect(runAdapterDshApprovalUnavailableFixture(fixture, () => projection("DURABLE_PAIR")))
      .resolves.toEqual({
        status: "FAIL",
        code: "ADAPTER_DSH_APPROVAL_UNAVAILABLE_MISMATCH",
      });
  });

  it("reports implementation exceptions as ERROR", async () => {
    const fixture = await load(fixtureNames[0]);
    await expect(runAdapterDshApprovalUnavailableFixture(fixture, () => {
      throw new Error("implementation failed");
    })).resolves.toEqual({
      status: "ERROR",
      code: "ADAPTER_DSH_APPROVAL_UNAVAILABLE_IMPLEMENTATION_ERROR",
    });
  });

  it("reports malformed implementation projections as ERROR", async () => {
    const fixture = await load(fixtureNames[0]);
    const malformed = () => ({
      kind: "APPROVAL_UNAVAILABLE",
      decision: "UNAVAILABLE",
    }) as unknown as AdapterDshApprovalUnavailableObservable;
    await expect(runAdapterDshApprovalUnavailableFixture(fixture, malformed)).resolves.toEqual({
      status: "ERROR",
      code: "ADAPTER_DSH_APPROVAL_UNAVAILABLE_IMPLEMENTATION_ERROR",
    });
  });

  it.each(["REJECTED", "CANCELLED", "ALLOWED_ONCE"])(
    "rejects %s masquerading as unavailable before implementation invocation",
    async (decision) => {
      const raw = await loadRaw(fixtureNames[1]);
      record(record(raw.stimulus, "stimulus").sourceFact, "sourceFact").decision = decision;
      const project = vi.fn(() => projection("DURABLE_PAIR"));
      expect(() => parseAdapterDshApprovalUnavailableFixture(raw))
        .toThrow(AdapterDshApprovalUnavailableFixtureError);
      expect(project).not.toHaveBeenCalled();
    },
  );

  it("rejects decision/audit fields on SERVICE_ABSENT", async () => {
    const raw = await loadRaw(fixtureNames[0]);
    const source = record(record(raw.stimulus, "stimulus").sourceFact, "sourceFact");
    source.decision = "UNAVAILABLE";
    source.audit = "DURABLE_PAIR";
    expect(() => parseAdapterDshApprovalUnavailableFixture(raw))
      .toThrow(AdapterDshApprovalUnavailableFixtureError);
  });

  it("rejects an expectation that fabricates a durable pair for an absent service", async () => {
    const raw = await loadRaw(fixtureNames[0]);
    record(raw.expect, "expect").audit = "DURABLE_PAIR";
    expect(() => parseAdapterDshApprovalUnavailableFixture(raw))
      .toThrow(AdapterDshApprovalUnavailableFixtureError);
  });

  it("rejects unknown profile-owned fields", async () => {
    const raw = await loadRaw(fixtureNames[0]);
    record(raw.stimulus, "stimulus").abort = true;
    expect(() => parseAdapterDshApprovalUnavailableFixture(raw))
      .toThrow(AdapterDshApprovalUnavailableFixtureError);
  });

  it("rejects cyclic direct-call input", async () => {
    const raw = await loadRaw(fixtureNames[0]);
    const cyclic: JsonRecord = {};
    cyclic.self = cyclic;
    record(raw.stimulus, "stimulus").sourceFact = cyclic;
    expect(() => parseAdapterDshApprovalUnavailableFixture(raw))
      .toThrow(AdapterDshApprovalUnavailableFixtureError);
  });

  it("rejects sparse and decorated arrays in direct-call input", async () => {
    const rawSparse = await loadRaw(fixtureNames[0]);
    const sparse: unknown[] = [];
    sparse.length = 2;
    sparse[1] = "value";
    record(rawSparse.stimulus, "stimulus").sourceFact = sparse;
    expect(() => parseAdapterDshApprovalUnavailableFixture(rawSparse))
      .toThrow(AdapterDshApprovalUnavailableFixtureError);

    const rawDecorated = await loadRaw(fixtureNames[0]);
    const decorated = ["value"] as unknown[] & { extra?: string };
    decorated.extra = "not-json";
    record(rawDecorated.stimulus, "stimulus").sourceFact = decorated;
    expect(() => parseAdapterDshApprovalUnavailableFixture(rawDecorated))
      .toThrow(AdapterDshApprovalUnavailableFixtureError);
  });

  it("rejects exotic direct-call objects", async () => {
    const raw = await loadRaw(fixtureNames[0]);
    record(raw.stimulus, "stimulus").sourceFact = new Date();
    expect(() => parseAdapterDshApprovalUnavailableFixture(raw))
      .toThrow(AdapterDshApprovalUnavailableFixtureError);
  });

  it("keeps portable artifacts free of concrete Harness package paths", async () => {
    const paths = [
      resolve(root, "specs/0013-m3-adapter-dsh-approval-unavailable-tck.md"),
      resolve(here, "adapter-dsh-approval-unavailable.ts"),
      ...fixtureNames.map(name => resolve(fixtureRoot, name)),
    ];
    for (const path of paths) {
      const source = await readFile(path, "utf8");
      expect(source).not.toContain("@deepseek-ai/");
      expect(source).not.toContain("dsh-agent-loop");
    }
  });
});
