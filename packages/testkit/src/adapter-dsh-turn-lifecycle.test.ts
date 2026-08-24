import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

import {
  parseAdapterDshTurnLifecycleFixture,
  runAdapterDshTurnLifecycleFixture,
  type AdapterDshTurnLifecycleProjection,
  type AdapterDshTurnLifecycleSourceEvent,
} from "./adapter-dsh-turn-lifecycle.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const schemaPath = resolve(root, "schemas/v1alpha1/tck-fixture.schema.json");
const fixtureRoot = resolve(root, "fixtures/tck/valid");

const fixtureFiles = [
  "adapter-dsh-turn-lifecycle-completed.json",
  "adapter-dsh-turn-lifecycle-cancelled.json",
  "adapter-dsh-turn-lifecycle-blocked.json",
  "adapter-dsh-turn-lifecycle-failed.json",
  "adapter-dsh-turn-lifecycle-unsupported-reason.json",
] as const;

async function loadJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

function portableProjection(
  sessionRef: string,
  event: AdapterDshTurnLifecycleSourceEvent,
): AdapterDshTurnLifecycleProjection {
  const turnRef = `${sessionRef}/turn:${event.data.turn}`;
  switch (event.type) {
    case "turn/start":
      return { kind: "EVENT", event: { type: "turn.started", turnRef } };
    case "step/start":
      return {
        kind: "EVENT",
        event: {
          type: "step.started",
          turnRef,
          stepRef: `${turnRef}/step:${event.data.step}`,
        },
      };
    case "step/end":
      return { kind: "NO_EVENT" };
    case "turn/end": {
      switch (event.data.reason.kind) {
        case "completed": return { kind: "EVENT", event: { type: "turn.ended", turnRef, status: "completed" } };
        case "aborted": return { kind: "EVENT", event: { type: "turn.ended", turnRef, status: "cancelled" } };
        case "blocked": return { kind: "EVENT", event: { type: "turn.ended", turnRef, status: "blocked" } };
        case "error":
        case "max-tokens":
        case "interrupted":
          return { kind: "EVENT", event: { type: "turn.ended", turnRef, status: "failed" } };
        default:
          return { kind: "ERROR", code: "UNSUPPORTED_HARNESS_TURN_END_REASON" };
      }
    }
  }
}

async function parsedFixture(name: (typeof fixtureFiles)[number]) {
  return parseAdapterDshTurnLifecycleFixture(await loadJson(resolve(fixtureRoot, name)));
}

describe("M3-010 Adapter DSH turn lifecycle Shared TCK", () => {
  it.each(fixtureFiles)("keeps %s inside the generic Shared TCK envelope", async (name) => {
    const schema = await loadJson(schemaPath);
    const fixture = await loadJson(resolve(fixtureRoot, name));
    const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);

    expect(validate(fixture), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(() => parseAdapterDshTurnLifecycleFixture(fixture)).not.toThrow();
  });

  it.each(fixtureFiles)("executes the portable semantics for %s", async (name) => {
    const fixture = await parsedFixture(name);
    await expect(runAdapterDshTurnLifecycleFixture(fixture, portableProjection))
      .resolves.toEqual({ status: "PASS" });
  });

  it("keeps Harness step/end as source-only evidence instead of inventing step.ended", async () => {
    const fixture = await parsedFixture("adapter-dsh-turn-lifecycle-completed.json");
    const sourceTypes: string[] = [];
    const projectedTypes: string[] = [];

    const result = await runAdapterDshTurnLifecycleFixture(fixture, (sessionRef, event) => {
      sourceTypes.push(event.type);
      const projection = portableProjection(sessionRef, event);
      if (projection.kind === "EVENT") projectedTypes.push(projection.event.type);
      return projection;
    });

    expect(result).toEqual({ status: "PASS" });
    expect(sourceTypes).toContain("step/end");
    expect(projectedTypes).toEqual(["turn.started", "step.started", "turn.ended"]);
    expect(projectedTypes).not.toContain("step.ended");
  });

  it("fails when normalized lifecycle evidence is missing or reordered", async () => {
    const fixture = await parsedFixture("adapter-dsh-turn-lifecycle-completed.json");
    let suppressStep = true;

    const missing = await runAdapterDshTurnLifecycleFixture(fixture, (sessionRef, event) => {
      if (event.type === "step/start" && suppressStep) {
        suppressStep = false;
        return { kind: "NO_EVENT" };
      }
      return portableProjection(sessionRef, event);
    });
    expect(missing).toEqual({ status: "FAIL", code: "ADAPTER_DSH_TURN_LIFECYCLE_EVENTS_MISMATCH" });

    const reordered = await runAdapterDshTurnLifecycleFixture(fixture, (sessionRef, event) => {
      const projection = portableProjection(sessionRef, event);
      if (projection.kind === "EVENT" && projection.event.type === "turn.started") {
        return {
          kind: "EVENT",
          event: {
            type: "step.started",
            turnRef: projection.event.turnRef,
            stepRef: `${projection.event.turnRef}/step:0`,
          },
        };
      }
      if (projection.kind === "EVENT" && projection.event.type === "step.started") {
        return { kind: "EVENT", event: { type: "turn.started", turnRef: projection.event.turnRef } };
      }
      return projection;
    });
    expect(reordered).toEqual({ status: "FAIL", code: "ADAPTER_DSH_TURN_LIFECYCLE_EVENTS_MISMATCH" });
  });

  it("requires the expected adapter error at the exact source ordinal", async () => {
    const fixture = await parsedFixture("adapter-dsh-turn-lifecycle-unsupported-reason.json");
    const wrongOrdinal = await runAdapterDshTurnLifecycleFixture(fixture, (sessionRef, event) => {
      if (event.type === "turn/start") {
        return { kind: "ERROR", code: "UNSUPPORTED_HARNESS_TURN_END_REASON" };
      }
      return portableProjection(sessionRef, event);
    });

    expect(wrongOrdinal).toEqual({ status: "FAIL", code: "UNEXPECTED_ADAPTER_DSH_TURN_LIFECYCLE_ERROR" });
  });

  it("reports an implementation exception as runner ERROR rather than a passing expected fault", async () => {
    const fixture = await parsedFixture("adapter-dsh-turn-lifecycle-unsupported-reason.json");
    const result = await runAdapterDshTurnLifecycleFixture(fixture, () => {
      throw new Error("implementation exploded");
    });

    expect(result).toEqual({ status: "ERROR", code: "ADAPTER_DSH_TURN_LIFECYCLE_IMPLEMENTATION_ERROR" });
  });

  it("rejects malformed lifecycle grammar before invoking an implementation", async () => {
    const fixture = structuredClone(await loadJson(resolve(fixtureRoot, "adapter-dsh-turn-lifecycle-completed.json"))) as {
      stimulus: { sourceEvents: Array<{ type: string; seq: number; data: { step?: number } }> };
    };
    fixture.stimulus.sourceEvents[2]!.data.step = 99;

    expect(() => parseAdapterDshTurnLifecycleFixture(fixture)).toThrow(/matching step\/end/);
  });

  it("rejects non-increasing source sequence evidence instead of sorting it", async () => {
    const fixture = structuredClone(await loadJson(resolve(fixtureRoot, "adapter-dsh-turn-lifecycle-completed.json"))) as {
      stimulus: { sourceEvents: Array<{ seq: number }> };
    };
    fixture.stimulus.sourceEvents[2]!.seq = fixture.stimulus.sourceEvents[1]!.seq;

    expect(() => parseAdapterDshTurnLifecycleFixture(fixture)).toThrow(/strictly increasing/);
  });

  it("rejects unknown profile fields and direct cyclic values fail closed", async () => {
    const fixture = structuredClone(await loadJson(resolve(fixtureRoot, "adapter-dsh-turn-lifecycle-completed.json"))) as Record<string, unknown>;
    fixture.unreviewed = true;
    expect(() => parseAdapterDshTurnLifecycleFixture(fixture)).toThrow(/exactly/);

    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => parseAdapterDshTurnLifecycleFixture(cyclic)).toThrow(/cyclic/);
  });

  it("contains no concrete Harness package path in portable M3-010 fixtures", async () => {
    for (const name of fixtureFiles) {
      const text = await readFile(resolve(fixtureRoot, name), "utf8");
      expect(text).not.toContain("@deepseek-ai/");
      expect(text).not.toContain("dsh-agent-loop");
    }
  });
});
