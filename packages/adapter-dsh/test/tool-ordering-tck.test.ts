import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  parseAdapterDshToolOrderingFixture,
  runAdapterDshToolOrderingFixture,
  type AdapterDshToolOrderingObservable,
  type AdapterDshToolOrderingProjection,
  type AdapterDshToolOrderingSourceObservation,
} from "../../testkit/src/adapter-dsh-tool-ordering.js";
import { normalizeDurableEvent, normalizeFinalToolResult } from "../src/normalize.js";
import type { RuntimeEvent } from "../src/runtime-events.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixtureRoot = resolve(root, "fixtures/tck/valid");

const fixtures = [
  "adapter-dsh-tool-ordering-single.json",
  "adapter-dsh-tool-ordering-parallel-model-order.json",
  "adapter-dsh-tool-ordering-barrier.json",
] as const;

const digest = (value: unknown): string => `m3-011:${JSON.stringify(value)}`;

async function loadFixture(name: (typeof fixtures)[number]) {
  return parseAdapterDshToolOrderingFixture(
    JSON.parse(await readFile(resolve(fixtureRoot, name), "utf8")),
  );
}

function portableOrderingEvent(event: RuntimeEvent): AdapterDshToolOrderingObservable {
  switch (event.type) {
    case "tool.requested":
      return { type: event.type, callRef: event.callRef, toolName: event.toolName };
    case "tool.completed":
      return { type: event.type, callRef: event.callRef, toolName: event.toolName };
    default:
      throw new Error(`M3-011 received out-of-scope normalized event ${event.type}`);
  }
}

/**
 * Project the two accepted Harness evidence seams through production mapping.
 * Durable request evidence and live final-result evidence intentionally remain
 * separate inputs; making them look like one Harness event family would erase
 * the boundary M3-011 is supposed to verify.
 */
function projectAdapterToolOrdering(
  sessionRef: string,
  observation: AdapterDshToolOrderingSourceObservation,
): AdapterDshToolOrderingProjection {
  const normalized = observation.source === "session/event"
    ? normalizeDurableEvent(sessionRef, observation, digest)
    : normalizeFinalToolResult(
        sessionRef,
        observation.execution,
        observation.result,
        observation.resultDigest,
        observation.observedAt,
      );
  return { kind: "EVENT", event: portableOrderingEvent(normalized) };
}

describe("M3-011 Adapter DSH tool ordering conformance", () => {
  it.each(fixtures)("passes portable fixture %s through current production mapping", async (name) => {
    const fixture = await loadFixture(name);
    await expect(runAdapterDshToolOrderingFixture(fixture, projectAdapterToolOrdering))
      .resolves.toEqual({ status: "PASS" });
  });

  it("keeps final-result authority fields outside the M3-011 portable oracle", async () => {
    const fixture = await loadFixture("adapter-dsh-tool-ordering-single.json");
    const completed = fixture.expect.events.find((event) => event.type === "tool.completed");

    expect(completed).toEqual({
      type: "tool.completed",
      callRef: "call-a",
      toolName: "read",
    });
    expect(completed).not.toHaveProperty("outcome");
    expect(completed).not.toHaveProperty("resultDigest");
  });
});
