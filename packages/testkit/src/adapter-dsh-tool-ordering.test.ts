import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import {
  AdapterDshToolOrderingFixtureError,
  parseAdapterDshToolOrderingFixture,
  runAdapterDshToolOrderingFixture,
  type AdapterDshToolOrderingProjection,
  type AdapterDshToolOrderingSourceObservation,
} from "./adapter-dsh-tool-ordering.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixtureRoot = resolve(root, "fixtures/tck/valid");

const fixtures = [
  "adapter-dsh-tool-ordering-single.json",
  "adapter-dsh-tool-ordering-parallel-model-order.json",
  "adapter-dsh-tool-ordering-barrier.json",
] as const;

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} is not an object`);
  }
  return value as JsonRecord;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array`);
  return value;
}

async function loadRawFixture(name: (typeof fixtures)[number]): Promise<JsonRecord> {
  return record(JSON.parse(await readFile(resolve(fixtureRoot, name), "utf8")), name);
}

async function loadFixture(name: (typeof fixtures)[number]) {
  return parseAdapterDshToolOrderingFixture(await loadRawFixture(name));
}

function observationsOf(fixture: JsonRecord): unknown[] {
  return array(record(fixture.stimulus, "stimulus").sourceObservations, "sourceObservations");
}

function requestData(observation: unknown): JsonRecord {
  return record(record(observation, "observation").data, "observation.data");
}

function resultExecution(observation: unknown): JsonRecord {
  return record(record(observation, "observation").execution, "observation.execution");
}

function portableProjection(
  _sessionRef: string,
  observation: AdapterDshToolOrderingSourceObservation,
): AdapterDshToolOrderingProjection {
  if (observation.source === "session/event") {
    return {
      kind: "EVENT",
      event: {
        type: "tool.requested",
        callRef: observation.data.callId,
        toolName: observation.data.name,
      },
    };
  }
  return {
    kind: "EVENT",
    event: {
      type: "tool.completed",
      callRef: observation.execution.callId,
      toolName: observation.execution.name,
    },
  };
}

async function expectInvalid(
  mutate: (fixture: JsonRecord) => void,
  base: (typeof fixtures)[number] = "adapter-dsh-tool-ordering-parallel-model-order.json",
): Promise<void> {
  const fixture = await loadRawFixture(base);
  mutate(fixture);
  expect(() => parseAdapterDshToolOrderingFixture(fixture))
    .toThrow(AdapterDshToolOrderingFixtureError);
}

describe("M3-011 Adapter DSH tool ordering portable profile", () => {
  it.each(fixtures)("passes portable fixture %s against an independent projection", async (name) => {
    const fixture = await loadFixture(name);
    await expect(runAdapterDshToolOrderingFixture(fixture, portableProjection))
      .resolves.toEqual({ status: "PASS" });
  });

  it("preserves source array order when live observedAt timestamps are non-monotonic", async () => {
    const fixture = await loadFixture("adapter-dsh-tool-ordering-parallel-model-order.json");
    const live = fixture.stimulus.sourceObservations.filter(
      (observation) => observation.source === "tools/result",
    );
    expect(live).toHaveLength(2);
    expect(live[0]!.observedAt > live[1]!.observedAt).toBe(true);

    const projected: string[] = [];
    const result = await runAdapterDshToolOrderingFixture(fixture, (sessionRef, observation) => {
      const projection = portableProjection(sessionRef, observation);
      projected.push(`${projection.event.type}:${projection.event.callRef}`);
      return projection;
    });

    expect(result).toEqual({ status: "PASS" });
    expect(projected).toEqual([
      "tool.requested:call-a",
      "tool.requested:call-b",
      "tool.completed:call-a",
      "tool.completed:call-b",
    ]);
  });

  it("rejects a result before its request", async () => {
    await expectInvalid((fixture) => {
      const observations = observationsOf(fixture);
      [observations[0], observations[2]] = [observations[2], observations[0]];
    });
  });

  it("rejects duplicate requests", async () => {
    await expectInvalid((fixture) => {
      const observations = observationsOf(fixture);
      requestData(observations[1]).callId = "call-a";
    });
  });

  it("rejects duplicate results", async () => {
    await expectInvalid((fixture) => {
      const observations = observationsOf(fixture);
      resultExecution(observations[3]).callId = "call-a";
      resultExecution(observations[3]).name = "read";
    });
  });

  it("rejects incomplete batches instead of synthesizing completion", async () => {
    await expectInvalid((fixture) => {
      observationsOf(fixture).pop();
      array(record(fixture.expect, "expect").events, "expect.events").pop();
    });
  });

  it("rejects model-order completion reversal", async () => {
    await expectInvalid((fixture) => {
      const observations = observationsOf(fixture);
      [observations[2], observations[3]] = [observations[3], observations[2]];
    });
  });

  it("rejects a result whose tool name does not match its correlated request", async () => {
    await expectInvalid((fixture) => {
      resultExecution(observationsOf(fixture)[2]).name = "different-tool";
    });
  });

  it("rejects cross-step request evidence in one batch", async () => {
    await expectInvalid((fixture) => {
      requestData(observationsOf(fixture)[1]).step = 3;
    });
  });

  it("rejects cross-turn request evidence in one batch", async () => {
    await expectInvalid((fixture) => {
      requestData(observationsOf(fixture)[1]).turn = 6;
    });
  });

  it("rejects non-increasing durable request sequence evidence", async () => {
    await expectInvalid((fixture) => {
      record(observationsOf(fixture)[1], "second request").seq = 30;
    });
  });

  it("rejects outcome classification semantics outside the M3-011 success-only source shape", async () => {
    await expectInvalid((fixture) => {
      record(record(observationsOf(fixture)[2], "result").result, "result.result").isError = true;
    });
  });

  it("does not derive the expected oracle from source evidence", async () => {
    const fixture = await loadRawFixture("adapter-dsh-tool-ordering-single.json");
    const expectedEvents = array(record(fixture.expect, "expect").events, "expect.events");
    record(expectedEvents[1], "expected completed").callRef = "wrong-call";
    const parsed = parseAdapterDshToolOrderingFixture(fixture);

    await expect(runAdapterDshToolOrderingFixture(parsed, portableProjection))
      .resolves.toEqual({ status: "FAIL", code: "ADAPTER_DSH_TOOL_ORDERING_EVENTS_MISMATCH" });
  });

  it("classifies projector exceptions as infrastructure ERROR rather than PASS", async () => {
    const fixture = await loadFixture("adapter-dsh-tool-ordering-single.json");
    await expect(runAdapterDshToolOrderingFixture(fixture, () => {
      throw new Error("projection failed");
    })).resolves.toEqual({
      status: "ERROR",
      code: "ADAPTER_DSH_TOOL_ORDERING_IMPLEMENTATION_ERROR",
    });
  });

  it("rejects malformed source evidence before any projector can be invoked", async () => {
    const fixture = await loadRawFixture("adapter-dsh-tool-ordering-parallel-model-order.json");
    const observations = observationsOf(fixture);
    [observations[2], observations[3]] = [observations[3], observations[2]];
    const projector = vi.fn(portableProjection);

    expect(() => parseAdapterDshToolOrderingFixture(fixture))
      .toThrow(AdapterDshToolOrderingFixtureError);
    expect(projector).not.toHaveBeenCalled();
  });

  it("rejects cyclic direct-call execution arguments", async () => {
    const fixture = await loadRawFixture("adapter-dsh-tool-ordering-single.json");
    const cyclic: JsonRecord = {};
    cyclic.self = cyclic;
    resultExecution(observationsOf(fixture)[1]).arguments = cyclic;
    expect(() => parseAdapterDshToolOrderingFixture(fixture))
      .toThrow(AdapterDshToolOrderingFixtureError);
  });

  it("rejects sparse direct-call arrays", async () => {
    const fixture = await loadRawFixture("adapter-dsh-tool-ordering-single.json");
    const sparse: unknown[] = [];
    sparse.length = 2;
    sparse[1] = "value";
    resultExecution(observationsOf(fixture)[1]).arguments = sparse;
    expect(() => parseAdapterDshToolOrderingFixture(fixture))
      .toThrow(AdapterDshToolOrderingFixtureError);
  });

  it("rejects named and symbol properties on direct-call arrays", async () => {
    const fixture = await loadRawFixture("adapter-dsh-tool-ordering-single.json");
    const decorated = ["value"] as unknown[] & { extra?: string };
    decorated.extra = "not-json";
    Object.defineProperty(decorated, Symbol("hidden"), { value: true, enumerable: true });
    resultExecution(observationsOf(fixture)[1]).arguments = decorated;
    expect(() => parseAdapterDshToolOrderingFixture(fixture))
      .toThrow(AdapterDshToolOrderingFixtureError);
  });

  it("keeps portable artifacts free of concrete Harness package and agent-loop paths", async () => {
    const paths = [
      resolve(root, "specs/0010-m3-adapter-dsh-tool-ordering-tck.md"),
      ...fixtures.map((name) => resolve(fixtureRoot, name)),
      resolve(here, "adapter-dsh-tool-ordering.ts"),
    ];
    for (const path of paths) {
      const source = await readFile(path, "utf8");
      expect(source).not.toContain("@deepseek-ai/");
      expect(source).not.toContain("dsh-agent-loop");
    }
  });
});
