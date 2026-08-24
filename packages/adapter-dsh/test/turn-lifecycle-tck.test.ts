import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  parseAdapterDshTurnLifecycleFixture,
  runAdapterDshTurnLifecycleFixture,
  type AdapterDshTurnLifecycleObservable,
  type AdapterDshTurnLifecycleProjection,
  type AdapterDshTurnLifecycleSourceEvent,
} from "../../testkit/src/adapter-dsh-turn-lifecycle.js";
import { DshAdapterError } from "../src/errors.js";
import { normalizeDurableEvent } from "../src/normalize.js";
import type { RuntimeEvent } from "../src/runtime-events.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixtureRoot = resolve(root, "fixtures/tck/valid");

const fixtures = [
  "adapter-dsh-turn-lifecycle-completed.json",
  "adapter-dsh-turn-lifecycle-cancelled.json",
  "adapter-dsh-turn-lifecycle-blocked.json",
  "adapter-dsh-turn-lifecycle-failed.json",
  "adapter-dsh-turn-lifecycle-unsupported-reason.json",
] as const;

const digest = (value: unknown): string => `tck:${JSON.stringify(value)}`;

async function loadFixture(name: (typeof fixtures)[number]) {
  return parseAdapterDshTurnLifecycleFixture(
    JSON.parse(await readFile(resolve(fixtureRoot, name), "utf8")),
  );
}

function portableLifecycleEvent(event: RuntimeEvent): AdapterDshTurnLifecycleObservable {
  switch (event.type) {
    case "turn.started":
      return { type: event.type, turnRef: event.turnRef };
    case "step.started":
      return { type: event.type, turnRef: event.turnRef, stepRef: event.stepRef };
    case "turn.ended":
      return { type: event.type, turnRef: event.turnRef, status: event.status };
    default:
      throw new Error(`M3-010 received out-of-scope normalized event ${event.type}`);
  }
}

/**
 * M3-010 treats Harness step/end as durable source evidence with no normalized
 * counterpart. Keeping that decision in this adapter-specific projection makes
 * the absence explicit; normalizeDurableEvent therefore remains limited to the
 * Spec 0003 vocabulary instead of learning a synthetic step.ended event.
 */
function projectAdapterLifecycle(
  sessionRef: string,
  event: AdapterDshTurnLifecycleSourceEvent,
): AdapterDshTurnLifecycleProjection {
  if (event.type === "step/end") return { kind: "NO_EVENT" };
  try {
    const normalized = normalizeDurableEvent(sessionRef, event, digest);
    return { kind: "EVENT", event: portableLifecycleEvent(normalized) };
  } catch (error: unknown) {
    if (error instanceof DshAdapterError) return { kind: "ERROR", code: error.code };
    throw error;
  }
}

describe("M3-010 Adapter DSH turn lifecycle conformance", () => {
  it.each(fixtures)("passes portable fixture %s through the current adapter mapping", async (name) => {
    const fixture = await loadFixture(name);
    await expect(runAdapterDshTurnLifecycleFixture(fixture, projectAdapterLifecycle))
      .resolves.toEqual({ status: "PASS" });
  });

  it("does not add step.ended to the normalized runtime vocabulary", async () => {
    const fixture = await loadFixture("adapter-dsh-turn-lifecycle-completed.json");
    const normalizedTypes: string[] = [];

    const result = await runAdapterDshTurnLifecycleFixture(fixture, (sessionRef, event) => {
      const projection = projectAdapterLifecycle(sessionRef, event);
      if (projection.kind === "EVENT") normalizedTypes.push(projection.event.type);
      return projection;
    });

    expect(result).toEqual({ status: "PASS" });
    expect(normalizedTypes).toEqual(["turn.started", "step.started", "turn.ended"]);
    expect(normalizedTypes).not.toContain("step.ended");
  });
});
