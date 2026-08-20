import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import {
  AdapterDshDisposalFixtureError,
  parseAdapterDshDisposalFixture,
  runAdapterDshDisposalFixture,
  type AdapterDshDisposalObservable,
  type AdapterDshDisposalStimulus,
} from "./adapter-dsh-disposal.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixtureRoot = resolve(root, "fixtures/tck/valid");
const fixtureNames = [
  "adapter-dsh-disposal-observation.json",
  "adapter-dsh-disposal-tool-policy.json",
  "adapter-dsh-disposal-monotonic-guard.json",
  "adapter-dsh-disposal-turn-stopping.json",
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
  return parseAdapterDshDisposalFixture(await loadRaw(name));
}

function sourceFact(raw: JsonRecord): JsonRecord {
  return record(record(raw.stimulus, "stimulus").sourceFact, "sourceFact");
}

function projectFromSource(stimulus: AdapterDshDisposalStimulus): AdapterDshDisposalObservable {
  const source = stimulus.sourceFact;
  if (!source.disposeCompleted) throw new Error("unreachable: parsed source lacks disposal completion");
  if (source.kind === "OBSERVATION_SUBSCRIPTION") {
    return {
      kind: "DISPOSAL_COMPLETED",
      resourceKind: source.kind,
      acceptedBeforeDisposeSettled: source.acceptedBeforeDispose,
      effectsAfterDispose: [],
      repeatDispose: "IDEMPOTENT",
      externalRuntime: "REMAINS_LIVE",
    };
  }
  return {
    kind: "DISPOSAL_COMPLETED",
    resourceKind: source.kind,
    effectBeforeDispose: "OBSERVED",
    effectAfterDispose: "ABSENT",
    externalRuntime: "REMAINS_LIVE",
  };
}

describe("M3-016 Adapter DSH disposal portable profile", () => {
  it("passes all four closed disposal resource cases", async () => {
    for (const name of fixtureNames) {
      const fixture = await load(name);
      await expect(runAdapterDshDisposalFixture(fixture, projectFromSource))
        .resolves.toEqual({ status: "PASS" });
    }
  });

  it("rejects unknown disposal resource kinds before implementation invocation", async () => {
    const raw = await loadRaw(fixtureNames[1]);
    sourceFact(raw).kind = "UNKNOWN_REGISTRATION";
    const project = vi.fn(projectFromSource);
    expect(() => parseAdapterDshDisposalFixture(raw)).toThrow(AdapterDshDisposalFixtureError);
    expect(project).not.toHaveBeenCalled();
  });

  it("rejects resource-specific field pollution across disposal kinds", async () => {
    const policy = await loadRaw(fixtureNames[1]);
    sourceFact(policy).repeatDispose = true;
    expect(() => parseAdapterDshDisposalFixture(policy)).toThrow(AdapterDshDisposalFixtureError);

    const observation = await loadRaw(fixtureNames[0]);
    sourceFact(observation).effectBeforeDispose = "DENY";
    expect(() => parseAdapterDshDisposalFixture(observation)).toThrow(AdapterDshDisposalFixtureError);
  });

  it("does not standardize repeat disposal for policy, guard, or turn-stopping registrations", async () => {
    for (const name of fixtureNames.slice(1)) {
      const raw = await loadRaw(name);
      sourceFact(raw).repeatDispose = true;
      expect(() => parseAdapterDshDisposalFixture(raw)).toThrow(AdapterDshDisposalFixtureError);
    }
  });

  it("requires an observation positive-control effect before disposal", async () => {
    const raw = await loadRaw(fixtureNames[0]);
    sourceFact(raw).acceptedBeforeDispose = [];
    expect(() => parseAdapterDshDisposalFixture(raw)).toThrow(AdapterDshDisposalFixtureError);
  });

  it.each([
    [fixtureNames[1], "effectBeforeDispose"],
    [fixtureNames[2], "effectBeforeDispose"],
    [fixtureNames[3], "effectBeforeDispose"],
  ] as const)("requires a registration positive control before disposal for %s", async (name, field) => {
    const raw = await loadRaw(name);
    delete sourceFact(raw)[field];
    expect(() => parseAdapterDshDisposalFixture(raw)).toThrow(AdapterDshDisposalFixtureError);
  });

  it("requires explicit source-side disposal completion for every resource kind", async () => {
    for (const name of fixtureNames) {
      const raw = await loadRaw(name);
      delete sourceFact(raw).disposeCompleted;
      const project = vi.fn(projectFromSource);
      expect(() => parseAdapterDshDisposalFixture(raw)).toThrow(AdapterDshDisposalFixtureError);
      expect(project).not.toHaveBeenCalled();
    }
  });

  it("rejects false disposal completion instead of treating invocation intent as completion", async () => {
    const raw = await loadRaw(fixtureNames[0]);
    sourceFact(raw).disposeCompleted = false;
    expect(() => parseAdapterDshDisposalFixture(raw)).toThrow(AdapterDshDisposalFixtureError);
  });

  it("requires an explicit post-disposal source probe for every resource kind", async () => {
    const observation = await loadRaw(fixtureNames[0]);
    sourceFact(observation).probedAfterDispose = [];
    expect(() => parseAdapterDshDisposalFixture(observation)).toThrow(AdapterDshDisposalFixtureError);

    for (const name of fixtureNames.slice(1)) {
      const raw = await loadRaw(name);
      delete sourceFact(raw).probeAfterDispose;
      expect(() => parseAdapterDshDisposalFixture(raw)).toThrow(AdapterDshDisposalFixtureError);
    }
  });

  it("rejects observation expectations that drop already accepted work", async () => {
    const raw = await loadRaw(fixtureNames[0]);
    record(raw.expect, "expect").acceptedBeforeDisposeSettled = [];
    expect(() => parseAdapterDshDisposalFixture(raw)).toThrow(AdapterDshDisposalFixtureError);
  });

  it("rejects observation expectations that pre-authorize post-disposal effects", async () => {
    const raw = await loadRaw(fixtureNames[0]);
    record(raw.expect, "expect").effectsAfterDispose = ["after-1"];
    expect(() => parseAdapterDshDisposalFixture(raw)).toThrow(AdapterDshDisposalFixtureError);
  });

  it("requires source and expectation resource kinds to correlate", async () => {
    const raw = await loadRaw(fixtureNames[1]);
    record(raw.expect, "expect").resourceKind = "MONOTONIC_TOOL_GUARD_REGISTRATION";
    expect(() => parseAdapterDshDisposalFixture(raw)).toThrow(AdapterDshDisposalFixtureError);
  });

  it("does not use expectation data as a disposal oracle", async () => {
    const fixture = await load(fixtureNames[0]);
    const project = vi.fn((stimulus: AdapterDshDisposalStimulus) => projectFromSource(stimulus));
    await runAdapterDshDisposalFixture(fixture, project);
    expect(project).toHaveBeenCalledTimes(1);
    expect(project).toHaveBeenCalledWith(fixture.stimulus);
  });

  it("cannot manufacture disposal proof from expectation when source completion is missing", async () => {
    const raw = await loadRaw(fixtureNames[1]);
    delete sourceFact(raw).disposeCompleted;
    const project = vi.fn(() => record(raw.expect, "expect") as unknown as AdapterDshDisposalObservable);
    expect(() => parseAdapterDshDisposalFixture(raw)).toThrow(AdapterDshDisposalFixtureError);
    expect(project).not.toHaveBeenCalled();
  });

  it("reports a structurally valid post-disposal observation leak as FAIL", async () => {
    const fixture = await load(fixtureNames[0]);
    await expect(runAdapterDshDisposalFixture(fixture, stimulus => {
      const observed = projectFromSource(stimulus);
      if (observed.resourceKind !== "OBSERVATION_SUBSCRIPTION") return observed;
      return { ...observed, effectsAfterDispose: ["after-1"] };
    })).resolves.toEqual({ status: "FAIL", code: "ADAPTER_DSH_DISPOSAL_MISMATCH" });
  });

  it("reports a structurally valid wrong registration resource as FAIL", async () => {
    const fixture = await load(fixtureNames[1]);
    await expect(runAdapterDshDisposalFixture(fixture, () => ({
      kind: "DISPOSAL_COMPLETED",
      resourceKind: "MONOTONIC_TOOL_GUARD_REGISTRATION",
      effectBeforeDispose: "OBSERVED",
      effectAfterDispose: "ABSENT",
      externalRuntime: "REMAINS_LIVE",
    }))).resolves.toEqual({ status: "FAIL", code: "ADAPTER_DSH_DISPOSAL_MISMATCH" });
  });

  it("reports implementation exceptions as ERROR", async () => {
    const fixture = await load(fixtureNames[2]);
    await expect(runAdapterDshDisposalFixture(fixture, () => {
      throw new Error("implementation failed");
    })).resolves.toEqual({ status: "ERROR", code: "ADAPTER_DSH_DISPOSAL_IMPLEMENTATION_ERROR" });
  });

  it("reports malformed implementation projections as ERROR", async () => {
    const fixture = await load(fixtureNames[0]);
    const malformed = () => ({
      kind: "DISPOSAL_COMPLETED",
      resourceKind: "OBSERVATION_SUBSCRIPTION",
      acceptedBeforeDisposeSettled: ["before-1"],
      repeatDispose: "IDEMPOTENT",
      externalRuntime: "REMAINS_LIVE",
    }) as unknown as AdapterDshDisposalObservable;
    await expect(runAdapterDshDisposalFixture(fixture, malformed)).resolves.toEqual({
      status: "ERROR",
      code: "ADAPTER_DSH_DISPOSAL_IMPLEMENTATION_ERROR",
    });
  });

  it("rejects decorated and sparse source arrays", async () => {
    const decoratedRaw = await loadRaw(fixtureNames[0]);
    const decorated = ["before-1"] as string[] & { extra?: string };
    decorated.extra = "not-json";
    sourceFact(decoratedRaw).acceptedBeforeDispose = decorated;
    expect(() => parseAdapterDshDisposalFixture(decoratedRaw)).toThrow(AdapterDshDisposalFixtureError);

    const sparseRaw = await loadRaw(fixtureNames[0]);
    const sparse: unknown[] = [];
    sparse.length = 2;
    sparse[1] = "after-1";
    sourceFact(sparseRaw).probedAfterDispose = sparse;
    expect(() => parseAdapterDshDisposalFixture(sparseRaw)).toThrow(AdapterDshDisposalFixtureError);
  });

  it("rejects cyclic and exotic direct-call input", async () => {
    const cyclicRaw = await loadRaw(fixtureNames[1]);
    const cyclic: JsonRecord = {};
    cyclic.self = cyclic;
    record(record(cyclicRaw.stimulus, "stimulus").request, "request").resourceRef = cyclic;
    expect(() => parseAdapterDshDisposalFixture(cyclicRaw)).toThrow(AdapterDshDisposalFixtureError);

    const exoticRaw = await loadRaw(fixtureNames[2]);
    record(record(exoticRaw.stimulus, "stimulus").request, "request").resourceRef = new Date();
    expect(() => parseAdapterDshDisposalFixture(exoticRaw)).toThrow(AdapterDshDisposalFixtureError);
  });

  it("rejects non-finite direct-call values before disposal semantics", async () => {
    const raw = await loadRaw(fixtureNames[3]);
    record(raw.determinism, "determinism").seed = Number.NaN;
    expect(() => parseAdapterDshDisposalFixture(raw)).toThrow(AdapterDshDisposalFixtureError);
  });

  it("rejects unknown profile-owned fields", async () => {
    const raw = await loadRaw(fixtureNames[0]);
    record(raw.stimulus, "stimulus").timeoutMs = 1;
    expect(() => parseAdapterDshDisposalFixture(raw)).toThrow(AdapterDshDisposalFixtureError);
  });

  it("keeps portable disposal artifacts free of concrete Harness package paths", async () => {
    const paths = [
      resolve(root, "specs/0015-m3-adapter-dsh-disposal-tck.md"),
      resolve(here, "adapter-dsh-disposal.ts"),
      ...fixtureNames.map(name => resolve(fixtureRoot, name)),
    ];
    for (const path of paths) {
      const source = await readFile(path, "utf8");
      expect(source).not.toContain("@deepseek-ai/");
      expect(source).not.toContain("dsh-agent-loop");
    }
  });
});
