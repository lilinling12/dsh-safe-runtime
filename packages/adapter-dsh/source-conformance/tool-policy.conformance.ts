import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CallId } from "@deepseek-ai/dsh-llm";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";

import { createDshRc5Adapter } from "../src/binding.js";
import {
  createHarnessTestScope,
  type HarnessTestScope,
} from "./harness-runtime.js";

const signal = new AbortController().signal;

function digest(value: unknown): string {
  return `test:${JSON.stringify(value)}`;
}

async function setup(harness: HarnessTestScope) {
  await harness.ctx.plugin(SystemPrompt);
  await harness.ctx.plugin(ToolRuntime);
  const ctx = await harness.inject(["tools"]);
  const adapter = createDshRc5Adapter(ctx, { digest });
  return { ctx, adapter };
}

describe("DeepSeek Harness rc5 real ToolRuntime binding", () => {
  let harness: HarnessTestScope;

  beforeEach(async () => {
    harness = await createHarnessTestScope();
  });

  afterEach(async () => {
    await harness.dispose();
  });

  it("maps DENY to a real pre-execute denial and never invokes the body", async () => {
    const { ctx, adapter } = await setup(harness);
    let bodyCalls = 0;

    ctx.tools.register(defineTool({
      name: "mutate",
      description: "test mutation",
      parameters: {},
      output: {
        schema: { type: "string" },
        render: (_args, value) => [{ type: "text", text: value }],
      },
      async execute() {
        bodyCalls += 1;
        return "executed";
      },
    }));

    adapter.registerToolPolicy(() => ({ kind: "DENY", reason: "blocked by test policy" }));

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("deny-1"),
      name: "mutate",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(bodyCalls).toBe(0);
  });

  it("fails closed when the async policy handler throws", async () => {
    const { ctx, adapter } = await setup(harness);
    let bodyCalls = 0;

    ctx.tools.register(defineTool({
      name: "dangerous",
      description: "test policy failure",
      parameters: {},
      output: {
        schema: { type: "string" },
        render: (_args, value) => [{ type: "text", text: value }],
      },
      async execute() {
        bodyCalls += 1;
        return "executed";
      },
    }));

    adapter.registerToolPolicy(() => {
      throw new Error("policy backend unavailable");
    });

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("deny-on-error"),
      name: "dangerous",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(bodyCalls).toBe(0);
  });

  it("maps ASK to Harness fail-closed behavior when no approval service is mounted", async () => {
    const { ctx, adapter } = await setup(harness);
    let bodyCalls = 0;

    ctx.tools.register(defineTool({
      name: "approval-required",
      description: "test ask",
      parameters: {},
      output: {
        schema: { type: "string" },
        render: (_args, value) => [{ type: "text", text: value }],
      },
      async execute() {
        bodyCalls += 1;
        return "executed";
      },
    }));

    adapter.registerToolPolicy(() => ({ kind: "ASK", reason: "requires approval" }));

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("ask-unavailable"),
      name: "approval-required",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(bodyCalls).toBe(0);
  });

  it("restores ordinary execution after the policy registration is disposed", async () => {
    const { ctx, adapter } = await setup(harness);
    let bodyCalls = 0;

    ctx.tools.register(defineTool({
      name: "reversible-policy",
      description: "test disposal",
      parameters: {},
      output: {
        schema: { type: "string" },
        render: (_args, value) => [{ type: "text", text: value }],
      },
      async execute() {
        bodyCalls += 1;
        return "executed";
      },
    }));

    const registration = adapter.registerToolPolicy(() => ({ kind: "DENY", reason: "temporary" }));
    const denied = await ctx.tools.execute({
      signal,
      callId: CallId("dispose-denied"),
      name: "reversible-policy",
      arguments: {},
    });
    expect(denied.isError).toBe(true);
    expect(bodyCalls).toBe(0);

    await registration.dispose();

    const allowed = await ctx.tools.execute({
      signal,
      callId: CallId("dispose-allowed"),
      name: "reversible-policy",
      arguments: {},
    });
    expect(allowed.isError).toBe(false);
    expect(bodyCalls).toBe(1);
  });

  it("maps a throwing monotonic guard to a final denial", async () => {
    const { ctx, adapter } = await setup(harness);
    let bodyCalls = 0;

    ctx.tools.register(defineTool({
      name: "guarded",
      description: "test guard",
      parameters: {},
      output: {
        schema: { type: "string" },
        render: (_args, value) => [{ type: "text", text: value }],
      },
      async execute() {
        bodyCalls += 1;
        return "executed";
      },
    }));

    adapter.registerMonotonicToolGuard?.(() => {
      throw new Error("guard evaluator failed");
    });

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("guard-fail-closed"),
      name: "guarded",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(bodyCalls).toBe(0);
  });
});
