import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import {
  AdapterDshCancellationFixtureError,
  parseAdapterDshCancellationFixture,
  runAdapterDshCancellationFixture,
  type AdapterDshCancellationObservable,
  type AdapterDshCancellationStimulus,
} from "./adapter-dsh-cancellation.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixtureRoot = resolve(root, "fixtures/tck/valid");
const fixtureNames = [
  "adapter-dsh-cancellation-approval.json",
  "adapter-dsh-cancellation-before-dispatch.json",
  "adapter-dsh-cancellation-after-entry.json",
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
  return parseAdapterDshCancellationFixture(await loadRaw(name));
}

function projectFromSource(stimulus: AdapterDshCancellationStimulus): AdapterDshCancellationObservable {
  if (stimulus.sourceFact.kind === "APPROVAL_DECISION") {
    return {
      kind: "APPROVAL_CANCELLATION",
      decision: stimulus.sourceFact.decision,
      audit: stimulus.sourceFact.audit,
    };
  }
  return {
    kind: "TOOL_CANCELLATION",
    callRef: stimulus.sourceFact.execution.callId,
    toolName: stimulus.sourceFact.execution.name,
    outcome: "cancelled",
    resultDigest: stimulus.sourceFact.resultDigest,
    errorCode: stimulus.sourceFact.result.error.info.code,
  };
}

describe("M3-015 Adapter DSH cancellation portable profile", () => {
  it("passes all three explicit cancellation source cases", async () => {
    for (const name of fixtureNames) {
      const fixture = await load(name);
      await expect(runAdapterDshCancellationFixture(fixture, projectFromSource))
        .resolves.toEqual({ status: "PASS" });
    }
  });

  it.each(["REJECTED", "UNAVAILABLE", "ALLOWED_ONCE"])(
    "rejects approval %s masquerading as cancellation before implementation invocation",
    async (decision) => {
      const raw = await loadRaw(fixtureNames[0]);
      record(record(raw.stimulus, "stimulus").sourceFact, "sourceFact").decision = decision;
      const project = vi.fn(projectFromSource);
      expect(() => parseAdapterDshCancellationFixture(raw)).toThrow(AdapterDshCancellationFixtureError);
      expect(project).not.toHaveBeenCalled();
    },
  );

  it.each(["TOOL_FAILED", "TOOL_DENIED", "ABORTED_LATE", "request aborted"])(
    "rejects non-authoritative tool cancellation code %s",
    async (code) => {
      const raw = await loadRaw(fixtureNames[1]);
      const source = record(record(raw.stimulus, "stimulus").sourceFact, "sourceFact");
      const result = record(source.result, "result");
      const error = record(result.error, "error");
      record(error.info, "info").code = code;
      expect(() => parseAdapterDshCancellationFixture(raw)).toThrow(AdapterDshCancellationFixtureError);
    },
  );

  it("rejects successful final evidence carrying an accepted cancellation code", async () => {
    const raw = await loadRaw(fixtureNames[2]);
    const source = record(record(raw.stimulus, "stimulus").sourceFact, "sourceFact");
    record(source.result, "result").isError = false;
    expect(() => parseAdapterDshCancellationFixture(raw)).toThrow(AdapterDshCancellationFixtureError);
  });

  it("rejects final-result call correlation mismatch", async () => {
    const raw = await loadRaw(fixtureNames[1]);
    const source = record(record(raw.stimulus, "stimulus").sourceFact, "sourceFact");
    record(source.execution, "execution").callId = "other-call";
    expect(() => parseAdapterDshCancellationFixture(raw)).toThrow(AdapterDshCancellationFixtureError);
  });

  it("rejects final-result tool-name correlation mismatch", async () => {
    const raw = await loadRaw(fixtureNames[1]);
    const source = record(record(raw.stimulus, "stimulus").sourceFact, "sourceFact");
    record(source.execution, "execution").name = "other-tool";
    expect(() => parseAdapterDshCancellationFixture(raw)).toThrow(AdapterDshCancellationFixtureError);
  });

  it("requires callRef for final tool-result cancellation", async () => {
    const raw = await loadRaw(fixtureNames[1]);
    delete record(record(raw.stimulus, "stimulus").request, "request").callRef;
    expect(() => parseAdapterDshCancellationFixture(raw)).toThrow(AdapterDshCancellationFixtureError);
  });

  it("rejects an expectation that rewrites authoritative cancellation evidence", async () => {
    const raw = await loadRaw(fixtureNames[2]);
    record(raw.expect, "expect").errorCode = "ABORTED_BEFORE_DISPATCH";
    expect(() => parseAdapterDshCancellationFixture(raw)).toThrow(AdapterDshCancellationFixtureError);
  });

  it("reports a valid but wrong projection as FAIL", async () => {
    const fixture = await load(fixtureNames[2]);
    await expect(runAdapterDshCancellationFixture(fixture, stimulus => {
      const observed = projectFromSource(stimulus);
      if (observed.kind !== "TOOL_CANCELLATION") return observed;
      return { ...observed, resultDigest: "fixture:wrong-result" };
    })).resolves.toEqual({ status: "FAIL", code: "ADAPTER_DSH_CANCELLATION_MISMATCH" });
  });

  it("reports implementation exceptions as ERROR", async () => {
    const fixture = await load(fixtureNames[0]);
    await expect(runAdapterDshCancellationFixture(fixture, () => {
      throw new Error("implementation failed");
    })).resolves.toEqual({ status: "ERROR", code: "ADAPTER_DSH_CANCELLATION_IMPLEMENTATION_ERROR" });
  });

  it("reports malformed implementation projections as ERROR", async () => {
    const fixture = await load(fixtureNames[1]);
    const malformed = () => ({
      kind: "TOOL_CANCELLATION",
      callRef: "cancel-before-dispatch-1",
      toolName: "mutate",
      outcome: "cancelled",
      resultDigest: "fixture:cancel-before-dispatch-result",
    }) as unknown as AdapterDshCancellationObservable;
    await expect(runAdapterDshCancellationFixture(fixture, malformed)).resolves.toEqual({
      status: "ERROR",
      code: "ADAPTER_DSH_CANCELLATION_IMPLEMENTATION_ERROR",
    });
  });

  it("does not use expectation data as a cancellation oracle", async () => {
    const fixture = await load(fixtureNames[1]);
    const project = vi.fn((stimulus: AdapterDshCancellationStimulus) => projectFromSource(stimulus));
    await runAdapterDshCancellationFixture(fixture, project);
    expect(project).toHaveBeenCalledTimes(1);
    expect(project).toHaveBeenCalledWith(fixture.stimulus);
  });

  it("rejects unknown profile-owned fields", async () => {
    const raw = await loadRaw(fixtureNames[0]);
    record(raw.stimulus, "stimulus").timeoutMs = 1;
    expect(() => parseAdapterDshCancellationFixture(raw)).toThrow(AdapterDshCancellationFixtureError);
  });

  it("rejects cyclic direct-call input", async () => {
    const raw = await loadRaw(fixtureNames[1]);
    const cyclic: JsonRecord = {};
    cyclic.self = cyclic;
    const source = record(record(raw.stimulus, "stimulus").sourceFact, "sourceFact");
    record(source.execution, "execution").arguments = cyclic;
    expect(() => parseAdapterDshCancellationFixture(raw)).toThrow(AdapterDshCancellationFixtureError);
  });

  it("rejects sparse and decorated arrays in direct-call input", async () => {
    const rawSparse = await loadRaw(fixtureNames[1]);
    const sparse: unknown[] = [];
    sparse.length = 2;
    sparse[1] = "value";
    const sparseSource = record(record(rawSparse.stimulus, "stimulus").sourceFact, "sourceFact");
    record(sparseSource.execution, "execution").arguments = sparse;
    expect(() => parseAdapterDshCancellationFixture(rawSparse)).toThrow(AdapterDshCancellationFixtureError);

    const rawDecorated = await loadRaw(fixtureNames[1]);
    const decorated = ["value"] as unknown[] & { extra?: string };
    decorated.extra = "not-json";
    const decoratedSource = record(record(rawDecorated.stimulus, "stimulus").sourceFact, "sourceFact");
    record(decoratedSource.execution, "execution").arguments = decorated;
    expect(() => parseAdapterDshCancellationFixture(rawDecorated)).toThrow(AdapterDshCancellationFixtureError);
  });

  it("rejects exotic objects and non-finite numbers in direct-call input", async () => {
    const exotic = await loadRaw(fixtureNames[1]);
    const exoticSource = record(record(exotic.stimulus, "stimulus").sourceFact, "sourceFact");
    record(exoticSource.execution, "execution").arguments = new Date();
    expect(() => parseAdapterDshCancellationFixture(exotic)).toThrow(AdapterDshCancellationFixtureError);

    const nonFinite = await loadRaw(fixtureNames[1]);
    const numericSource = record(record(nonFinite.stimulus, "stimulus").sourceFact, "sourceFact");
    record(numericSource.execution, "execution").arguments = { value: Number.NaN };
    expect(() => parseAdapterDshCancellationFixture(nonFinite)).toThrow(AdapterDshCancellationFixtureError);
  });

  it("keeps portable artifacts free of concrete Harness package paths", async () => {
    const paths = [
      resolve(root, "specs/0014-m3-adapter-dsh-cancellation-tck.md"),
      resolve(here, "adapter-dsh-cancellation.ts"),
      ...fixtureNames.map(name => resolve(fixtureRoot, name)),
    ];
    for (const path of paths) {
      const source = await readFile(path, "utf8");
      expect(source).not.toContain("@deepseek-ai/");
      expect(source).not.toContain("dsh-agent-loop");
    }
  });
});
