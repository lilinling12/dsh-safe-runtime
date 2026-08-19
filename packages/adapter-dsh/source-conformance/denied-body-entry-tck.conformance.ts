import { CallId } from "@deepseek-ai/dsh-llm";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";
import { describe, expect, it } from "vitest";

import { createDshRc5Adapter } from "../src/binding.js";
import { createHarnessTestScope } from "./harness-runtime.js";

const signal = new AbortController().signal;

interface DeniedBodyEntryCase {
  readonly id: "TCK-ADAPTER-DSH-DENIED-BODY-ENTRY-001";
  readonly stimulus: {
    readonly operation: "denied-body-entry";
    readonly call: {
      readonly callRef: string;
      readonly toolName: string;
      readonly arguments: unknown;
    };
    readonly policy: {
      readonly decision: "DENY";
    };
  };
  readonly expect: {
    readonly kind: "DENIAL_BODY_ENTRY";
    readonly callRef: string;
    readonly toolName: string;
    readonly decision: "DENIED";
    readonly bodyEntered: false;
  };
}

// The JSON fixture itself is parsed and validated by the generic testkit. Exact
// source conformance replays the same operative case in-package so compiling
// against the pinned Harness does not require Node ambient types or a test-only
// dependency on testkit implementation source.
const portableCase = {
  id: "TCK-ADAPTER-DSH-DENIED-BODY-ENTRY-001",
  stimulus: {
    operation: "denied-body-entry",
    call: {
      callRef: "deny-1",
      toolName: "mutate",
      arguments: { value: 1 },
    },
    policy: { decision: "DENY" },
  },
  expect: {
    kind: "DENIAL_BODY_ENTRY",
    callRef: "deny-1",
    toolName: "mutate",
    decision: "DENIED",
    bodyEntered: false,
  },
} as const satisfies DeniedBodyEntryCase;

function digest(value: unknown): string {
  return `m3-012:${JSON.stringify(value)}`;
}

describe("M3-012 exact DeepSeek Harness rc5 denied body entry", () => {
  it("proves explicit Adapter DSH denial prevents the registered tool body from running", async () => {
    const harness = await createHarnessTestScope();

    try {
      await harness.ctx.plugin(SystemPrompt);
      await harness.ctx.plugin(ToolRuntime);
      const ctx = await harness.inject(["tools"]);
      const adapter = createDshRc5Adapter(ctx, { digest });
      let bodyEntryCount = 0;

      ctx.tools.register(defineTool({
        name: portableCase.stimulus.call.toolName,
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

      // Positive control proves the counter can observe a real body entry before
      // an unchanged value is used as denial-path evidence.
      const controlResult = await ctx.tools.execute({
        signal,
        callId: CallId("m3-012-control"),
        name: portableCase.stimulus.call.toolName,
        arguments: portableCase.stimulus.call.arguments,
      });
      expect(controlResult.isError).toBe(false);
      expect(bodyEntryCount).toBe(1);

      let explicitDenialObserved = false;
      adapter.registerToolPolicy((request) => {
        expect(request.callRef).toBe(portableCase.stimulus.call.callRef);
        expect(request.toolName).toBe(portableCase.stimulus.call.toolName);
        explicitDenialObserved = true;
        return {
          kind: portableCase.stimulus.policy.decision,
          reason: "M3-012 explicit denial probe",
        };
      });

      const countBeforeDeniedCall = bodyEntryCount;
      const deniedResult = await ctx.tools.execute({
        signal,
        callId: CallId(portableCase.stimulus.call.callRef),
        name: portableCase.stimulus.call.toolName,
        arguments: portableCase.stimulus.call.arguments,
      });

      expect(deniedResult.isError).toBe(true);
      expect(explicitDenialObserved).toBe(true);

      const projection = {
        kind: "DENIAL_BODY_ENTRY" as const,
        callRef: portableCase.stimulus.call.callRef,
        toolName: portableCase.stimulus.call.toolName,
        decision: "DENIED" as const,
        bodyEntered: bodyEntryCount !== countBeforeDeniedCall,
      };

      expect(projection).toEqual(portableCase.expect);
      expect(bodyEntryCount).toBe(countBeforeDeniedCall);
    } finally {
      await harness.dispose();
    }
  });
});
