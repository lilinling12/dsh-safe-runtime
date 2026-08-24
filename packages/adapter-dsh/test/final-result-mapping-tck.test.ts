import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  parseAdapterDshFinalResultMappingFixture,
  runAdapterDshFinalResultMappingFixture,
  type AdapterDshFinalResultMappingObservable,
  type AdapterDshFinalResultMappingStimulus,
} from "../../testkit/src/adapter-dsh-final-result-mapping.js";
import {
  normalizeFinalToolResult,
  type HarnessToolResultSnapshot,
} from "../src/normalize.js";
import type { ToolCompletedEvent } from "../src/runtime-events.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixtureRoot = resolve(root, "fixtures/tck/valid");

const fixtures = [
  "adapter-dsh-final-result-success.json",
  "adapter-dsh-final-result-error.json",
  "adapter-dsh-final-result-error-code.json",
] as const;

async function loadFixture(name: (typeof fixtures)[number]) {
  return parseAdapterDshFinalResultMappingFixture(
    JSON.parse(await readFile(resolve(fixtureRoot, name), "utf8")),
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function harnessResultOf(
  result: AdapterDshFinalResultMappingStimulus["sourceObservation"]["result"],
): HarnessToolResultSnapshot {
  if (!result.isError) return { isError: false };

  const error = result.error;
  const info = isRecord(error) ? error.info : undefined;
  const code = isRecord(info) && typeof info.code === "string" ? info.code : undefined;

  return {
    isError: true,
    ...(code === undefined ? {} : { error: { info: { code } } }),
  };
}

function portableFinalResult(event: ToolCompletedEvent): AdapterDshFinalResultMappingObservable {
  if (event.outcome !== "success" && event.outcome !== "error") {
    throw new Error(`M3-013 received out-of-scope final outcome ${event.outcome}`);
  }

  return {
    type: "tool.completed",
    callRef: event.callRef,
    toolName: event.toolName,
    outcome: event.outcome,
    resultDigest: event.resultDigest,
    ...(event.errorCode === undefined ? {} : { errorCode: event.errorCode }),
  };
}

/**
 * Bind the portable M3-013 source fact directly to the production final-result
 * normalizer. The Shared TCK supplies the authoritative digest as source data;
 * this test intentionally does not invent a digest algorithm or policy/cancel
 * classification that belongs to another gate.
 */
function projectAdapterFinalResult(
  stimulus: AdapterDshFinalResultMappingStimulus,
): AdapterDshFinalResultMappingObservable {
  const source = stimulus.sourceObservation;
  return portableFinalResult(normalizeFinalToolResult(
    stimulus.sessionRef,
    source.execution,
    harnessResultOf(source.result),
    source.resultDigest,
    source.observedAt,
  ));
}

describe("M3-013 Adapter DSH final-result mapping conformance", () => {
  it.each(fixtures)("passes portable fixture %s through current production mapping", async (name) => {
    const fixture = await loadFixture(name);
    await expect(runAdapterDshFinalResultMappingFixture(fixture, projectAdapterFinalResult))
      .resolves.toEqual({ status: "PASS" });
  });

  it("keeps policy denial and cancellation outside the M3-013 projection", async () => {
    for (const name of fixtures) {
      const fixture = await loadFixture(name);
      expect(fixture.expect.event.outcome).not.toBe("denied");
      expect(fixture.expect.event.outcome).not.toBe("cancelled");
      expect(fixture.expect.event.errorCode).not.toBe("ABORTED");
      expect(fixture.expect.event.errorCode).not.toBe("ABORTED_BEFORE_DISPATCH");
    }
  });
});
