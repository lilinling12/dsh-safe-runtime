import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CallId } from "@deepseek-ai/dsh-llm";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";
import { describe, expect, it } from "vitest";

import {
  parseAdapterDshDeniedBodyEntryFixture,
  runAdapterDshDeniedBodyEntryFixture,
  type AdapterDshDeniedBodyEntryObservable,
} from "../../testkit/src/adapter-dsh-denied-body-entry.js";
import { createDshRc5Adapter } from "../src/binding.js";
import { createHarnessTestScope } from "./harness-runtime.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/tck/valid/adapter-dsh-denied-body-entry.json");
const signal = new AbortController().signal;

function digest(value: unknown): string {
  return `m3-012:${JSON.stringify(value)}`;
}

describe("M3-012 exact DeepSeek Harness rc5 denied body entry", () => {
  it("proves explicit Adapter DSH denial prevents the registered tool body from running", async () => {
    const fixture = parseAdapterDshDeniedBodyEntryFixture(
      JSON.parse(await readFile(fixturePath, "utf8")),
    );
    const harness = await createHarnessTestScope();

    try {
      await harness.ctx.plugin(SystemPrompt);
      await harness.ctx.plugin(ToolRuntime);
      const ctx = await harness.inject(["tools"]);
      const adapter = createDshRc5Adapter(ctx, { digest });
      let bodyEntryCount = 0;

      ctx.tools.register(defineTool({
        name: fixture.stimulus.call.toolName,
        description: "M3-012 body-entry instrumentation probe",
        parameters: {},
        output: {
          schema: { type: "string" },
          render: (_args, value) => [{ type: "text", text: value }],
        },
        async execute() {
          bodyEntryCount += 1;
          return "executed";
        },
      }));

      // Positive control: prove the instrumentation can observe a real body
      // entry before using an unchanged counter as denial-path evidence.
      const controlResult = await ctx.tools.execute({
        signal,
        callId: CallId("m3-012-control"),
        name: fixture.stimulus.call.toolName,
        arguments: fixture.stimulus.call.arguments,
      });
      expect(controlResult.isError).toBe(false);
      expect(bodyEntryCount).toBe(1);

      let explicitDenialObserved = false;
      const registration = adapter.registerToolPolicy((request) => {
        if (request.callRef !== fixture.stimulus.call.callRef) {
          return { kind: "ALLOW" };
        }
        explicitDenialObserved = true;
        return { kind: "DENY", reason: "M3-012 explicit denial probe" };
      });

      try {
        const countBeforeDeniedCall = bodyEntryCount;
        const deniedResult = await ctx.tools.execute({
          signal,
          callId: CallId(fixture.stimulus.call.callRef),
          name: fixture.stimulus.call.toolName,
          arguments: fixture.stimulus.call.arguments,
        });

        expect(deniedResult.isError).toBe(true);
        expect(explicitDenialObserved).toBe(true);

        const projection: AdapterDshDeniedBodyEntryObservable = {
          kind: "DENIAL_BODY_ENTRY",
          callRef: fixture.stimulus.call.callRef,
          toolName: fixture.stimulus.call.toolName,
          decision: "DENIED",
          bodyEntered: bodyEntryCount !== countBeforeDeniedCall,
        };

        await expect(runAdapterDshDeniedBodyEntryFixture(fixture, () => projection))
          .resolves.toEqual({ status: "PASS" });
        expect(bodyEntryCount).toBe(countBeforeDeniedCall);
      } finally {
        await registration.dispose();
      }
    } finally {
      await harness.dispose();
    }
  });
});
