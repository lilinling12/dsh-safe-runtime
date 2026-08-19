import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parseAdapterDshTurnLifecycleFixture } from "./adapter-dsh-turn-lifecycle.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(
  root,
  "fixtures/tck/valid/adapter-dsh-turn-lifecycle-completed.json",
);

async function validFixture(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(fixturePath, "utf8")) as Record<string, unknown>;
}

describe("M3-010 direct-call portable JSON boundary", () => {
  it("rejects sparse arrays that JSON fixtures cannot represent without changing meaning", async () => {
    const fixture = await validFixture() as {
      stimulus: { sourceEvents: unknown[] };
    };
    const sparse = new Array<unknown>(fixture.stimulus.sourceEvents.length + 1);
    sparse[1] = fixture.stimulus.sourceEvents[0];
    fixture.stimulus.sourceEvents = sparse;

    expect(() => parseAdapterDshTurnLifecycleFixture(fixture)).toThrow(/dense JSON arrays/);
  });

  it("rejects array symbol properties instead of creating TypeScript-only fixture state", async () => {
    const fixture = await validFixture() as {
      stimulus: { sourceEvents: unknown[] };
    };
    const marker = Symbol("non-json");
    Object.defineProperty(fixture.stimulus.sourceEvents, marker, {
      enumerable: true,
      value: "hidden-from-json",
    });

    expect(() => parseAdapterDshTurnLifecycleFixture(fixture)).toThrow(/symbol properties/);
  });
});
