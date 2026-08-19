import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CallId } from "@deepseek-ai/dsh-llm";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";
import { describe, expect, it } from "vitest";

import { createDshRc5Adapter } from "../src/binding.js";
import { createHarnessTestScope } from "./harness-runtime.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const fixturePath = resolve(root, "fixtures/tck/valid/adapter-dsh-denied-body-entry.json");
const signal = new AbortController().signal;

interface DeniedBodyEntryFixture {
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

function digest(value: unknown): string {
  return `m3-012:${JSON.stringify(value)}`;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function parseFixture(value: unknown): DeniedBodyEntryFixture {
  // Full portable-fixture validation belongs to @dsh-safe/testkit. This exact
  // source-conformance test narrows only the fields needed to drive public rc5
  // APIs, keeping Harness compatibility evidence inside the adapter package's
  // TypeScript root rather than importing testkit implementation source.
  const fixture = requireRecord(value, "fixture");
  if (fixture.apiVersion !== "safe-runtime.dev/tck-fixture/v1alpha1") {
    throw new TypeError("fixture.apiVersion must be safe-runtime.dev/tck-fixture/v1alpha1");
  }
  if (fixture.profile !== "ADAPTER_DSH") {
    throw new TypeError("fixture.profile must be ADAPTER_DSH");
  }

  const stimulus = requireRecord(fixture.stimulus, "fixture.stimulus");
  if (stimulus.operation !== "denied-body-entry") {
    throw new TypeError("fixture.stimulus.operation must be denied-body-entry");
  }

  const call = requireRecord(stimulus.call, "fixture.stimulus.call");
  const callRef = requireNonEmptyString(call.callRef, "fixture.stimulus.call.callRef");
  const toolName = requireNonEmptyString(call.toolName, "fixture.stimulus.call.toolName");

  const policy = requireRecord(stimulus.policy, "fixture.stimulus.policy");
  if (policy.decision !== "DENY") {
    throw new TypeError("fixture.stimulus.policy.decision must be DENY");
  }

  const expected = requireRecord(fixture.expect, "fixture.expect");
  if (expected.kind !== "DENIAL_BODY_ENTRY") {
    throw new TypeError("fixture.expect.kind must be DENIAL_BODY_ENTRY");
  }
  if (expected.decision !== "DENIED") {
    throw new TypeError("fixture.expect.decision must be DENIED");
  }
  if (expected.bodyEntered !== false) {
    throw new TypeError("fixture.expect.bodyEntered must be false");
  }
  const expectedCallRef = requireNonEmptyString(expected.callRef, "fixture.expect.callRef");
  const expectedToolName = requireNonEmptyString(expected.toolName, "fixture.expect.toolName");
  if (expectedCallRef !== callRef || expectedToolName !== toolName) {
    throw new TypeError("fixture expectation must correlate to stimulus.call");
  }

  return {
    stimulus: {
      operation: "denied-body-entry",
      call: {
        callRef,
        toolName,
        arguments: call.arguments,
      },
      policy: { decision: "DENY" },
    },
    expect: {
      kind: "DENIAL_BODY_ENTRY",
      callRef: expectedCallRef,
      toolName: expectedToolName,
      decision: "DENIED",
      bodyEntered: false,
    },
  };
}

describe("M3-012 exact DeepSeek Harness rc5 denied body entry", () => {
  it("proves explicit Adapter DSH denial prevents the registered tool body from running", async () => {
    const fixture = parseFixture(JSON.parse(await readFile(fixturePath, "utf8")));
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

      // Positive control proves the counter can observe a real body entry before
      // an unchanged value is used as denial-path evidence.
      const controlResult = await ctx.tools.execute({
        signal,
        callId: CallId("m3-012-control"),
        name: fixture.stimulus.call.toolName,
        arguments: fixture.stimulus.call.arguments,
      });
      expect(controlResult.isError).toBe(false);
      expect(bodyEntryCount).toBe(1);

      let explicitDenialObserved = false;
      adapter.registerToolPolicy((request) => {
        expect(request.callRef).toBe(fixture.stimulus.call.callRef);
        expect(request.toolName).toBe(fixture.stimulus.call.toolName);
        explicitDenialObserved = true;
        return { kind: "DENY", reason: "M3-012 explicit denial probe" };
      });

      const countBeforeDeniedCall = bodyEntryCount;
      const deniedResult = await ctx.tools.execute({
        signal,
        callId: CallId(fixture.stimulus.call.callRef),
        name: fixture.stimulus.call.toolName,
        arguments: fixture.stimulus.call.arguments,
      });

      expect(deniedResult.isError).toBe(true);
      expect(explicitDenialObserved).toBe(true);

      const projection = {
        kind: "DENIAL_BODY_ENTRY" as const,
        callRef: fixture.stimulus.call.callRef,
        toolName: fixture.stimulus.call.toolName,
        decision: "DENIED" as const,
        bodyEntered: bodyEntryCount !== countBeforeDeniedCall,
      };

      expect(projection).toEqual(fixture.expect);
      expect(bodyEntryCount).toBe(countBeforeDeniedCall);
    } finally {
      await harness.dispose();
    }
  });
});
