import type { Context } from "@deepseek-ai/cordis";
import { CallId, type ContentBlock } from "@deepseek-ai/dsh-llm";
import SessionStore, { SessionId } from "@deepseek-ai/dsh-session";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, {
  defineTool,
  type ToolExecution,
  type ToolExecutionResult,
} from "@deepseek-ai/dsh-tools";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDshRc5Adapter } from "../src/binding.js";
import {
  DSH_RC5_FEATURES,
  DSH_TESTED_BASELINE,
  requireAdapterFeatures,
} from "../src/feature-matrix.js";
import type { RuntimeEvent, ToolCompletedEvent } from "../src/runtime-events.js";
import {
  createAgentFixture,
  createHarnessTestScope,
  type HarnessTestScope,
} from "./harness-runtime.js";

function digest(value: unknown): string {
  return `m4-043:${JSON.stringify(value)}`;
}

function completedEvent(observed: readonly RuntimeEvent[], callRef: string): ToolCompletedEvent {
  const event = observed.find(
    (candidate): candidate is ToolCompletedEvent =>
      candidate.type === "tool.completed" && candidate.callRef === callRef,
  );
  if (event === undefined) {
    throw new Error(`missing tool.completed for ${callRef}`);
  }
  return event;
}

async function setupRuntime(harness: HarnessTestScope) {
  await harness.ctx.plugin(SessionStore);
  await harness.ctx.plugin(SystemPrompt);
  await harness.ctx.plugin(ToolRuntime);
  const sessionCtx = await harness.inject(["sessions"]);
  const toolCtx: Context = await harness.inject(["tools"]);
  return { sessionCtx, toolCtx };
}

function createAgent(
  sessionCtx: Awaited<ReturnType<HarnessTestScope["inject"]>>,
  toolCtx: Context,
  sessionRef: string,
) {
  const session = sessionCtx.sessions.create(SessionId(sessionRef));
  return { session, agent: createAgentFixture(toolCtx, session) };
}

function registerStringTool(
  ctx: Context,
  options: {
    readonly name: string;
    readonly execute: () => string | Promise<string>;
    readonly finalizeContent?: (
      exec: Readonly<ToolExecution>,
      result: Readonly<ToolExecutionResult>,
    ) => ContentBlock[] | undefined;
  },
): void {
  ctx.tools.register(defineTool({
    name: options.name,
    description: `M4-043 source-conformance tool ${options.name}`,
    parameters: {},
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }],
    },
    execute: async () => options.execute(),
    ...(options.finalizeContent === undefined
      ? {}
      : { finalizeContent: options.finalizeContent }),
  }));
}

describe("M4-043 pinned rc5 authoritative tools/result ownership", () => {
  let harness: HarnessTestScope;

  beforeEach(async () => {
    harness = await createHarnessTestScope();
  });

  afterEach(async () => {
    await harness.dispose();
  });

  it("pins the exact final-result observer feature contract and fails explicitly without it", () => {
    expect(DSH_TESTED_BASELINE).toEqual({
      version: "0.1.0-rc.5",
      commit: "47f943859bef60e4160492346772ded9b24f765a",
    });
    expect(() => requireAdapterFeatures(DSH_RC5_FEATURES, ["toolsFinalResultObserver"]))
      .not.toThrow();
    expect(() => requireAdapterFeatures(
      { ...DSH_RC5_FEATURES, toolsFinalResultObserver: false },
      ["toolsFinalResultObserver"],
    )).toThrow(/toolsFinalResultObserver/);
  });

  it("observes and returns the exact post-execute and definition-finalized object", async () => {
    const { sessionCtx, toolCtx } = await setupRuntime(harness);
    const { agent } = createAgent(sessionCtx, toolCtx, "m4-043-final-object-session");
    const adapter = createDshRc5Adapter(toolCtx, { digest });
    const observed: RuntimeEvent[] = [];
    let rawResult: unknown;
    let rawExecutionFrozen = false;
    let rawResultFrozen = false;

    const subscription = adapter.observe({
      accept(event) {
        observed.push(event);
      },
    });
    toolCtx.on("tools/result", (exec, result) => {
      rawResult = result;
      rawExecutionFrozen = Object.isFrozen(exec);
      rawResultFrozen = Object.isFrozen(result);
    });

    registerStringTool(toolCtx, {
      name: "m4_043_final_object",
      execute: () => "body-value",
      finalizeContent: () => [{ type: "text", text: "definition-final" }],
    });
    toolCtx.on("tools/post-execute", () => Promise.resolve({
      kind: "accept" as const,
      content: [{ type: "text" as const, text: "post-execute" }],
    }));

    const result = await toolCtx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-043-final-object"),
      name: "m4_043_final_object",
      arguments: {},
      agent,
    });
    await subscription.drain();

    expect(result.isError).toBe(false);
    expect(result.content).toEqual([{ type: "text", text: "definition-final" }]);
    expect(rawResult).toBe(result);
    expect(rawExecutionFrozen).toBe(true);
    expect(rawResultFrozen).toBe(true);

    const completed = completedEvent(observed, "m4-043-final-object");
    expect(observed.filter((event) => event.type === "tool.completed")).toHaveLength(1);
    expect(completed.sessionRef).toBe("m4-043-final-object-session");
    expect(completed.toolName).toBe("m4_043_final_object");
    expect(completed.outcome).toBe("success");
    expect(completed.resultDigest).toBe(digest(result));
    expect(completed.resultDigest).not.toBe(digest("body-value"));

    await subscription.dispose();
  });

  it("treats a post-execute block as final error authority instead of earlier body success", async () => {
    const { sessionCtx, toolCtx } = await setupRuntime(harness);
    const { agent } = createAgent(sessionCtx, toolCtx, "m4-043-post-block-session");
    const adapter = createDshRc5Adapter(toolCtx, { digest });
    const observed: RuntimeEvent[] = [];
    let rawResult: unknown;
    let bodyCalls = 0;

    const subscription = adapter.observe({ accept: (event) => { observed.push(event); } });
    toolCtx.on("tools/result", (_exec, result) => { rawResult = result; });
    registerStringTool(toolCtx, {
      name: "m4_043_post_block",
      execute: () => {
        bodyCalls += 1;
        return "body-success";
      },
    });
    toolCtx.on("tools/post-execute", () => Promise.resolve({
      kind: "block" as const,
      feedback: [{ type: "text" as const, text: "post policy blocked" }],
    }));

    const result = await toolCtx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-043-post-block"),
      name: "m4_043_post_block",
      arguments: {},
      agent,
    });
    await subscription.drain();

    expect(bodyCalls).toBe(1);
    expect(result.isError).toBe(true);
    expect(rawResult).toBe(result);
    const completed = completedEvent(observed, "m4-043-post-block");
    expect(completed.outcome).toBe("error");
    expect(completed.resultDigest).toBe(digest(result));

    await subscription.dispose();
  });

  it("turns definition finalization failure into the authoritative final error", async () => {
    const { sessionCtx, toolCtx } = await setupRuntime(harness);
    const { agent } = createAgent(sessionCtx, toolCtx, "m4-043-finalizer-failure-session");
    const adapter = createDshRc5Adapter(toolCtx, { digest });
    const observed: RuntimeEvent[] = [];
    let rawResult: unknown;
    let bodyCalls = 0;

    const subscription = adapter.observe({ accept: (event) => { observed.push(event); } });
    toolCtx.on("tools/result", (_exec, result) => { rawResult = result; });
    registerStringTool(toolCtx, {
      name: "m4_043_finalizer_failure",
      execute: () => {
        bodyCalls += 1;
        return "body-success";
      },
      finalizeContent: () => {
        throw new Error("definition finalizer failed");
      },
    });

    const result = await toolCtx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-043-finalizer-failure"),
      name: "m4_043_finalizer_failure",
      arguments: {},
      agent,
    });
    await subscription.drain();

    expect(bodyCalls).toBe(1);
    expect(result.isError).toBe(true);
    expect(rawResult).toBe(result);
    const completed = completedEvent(observed, "m4-043-finalizer-failure");
    expect(completed.outcome).toBe("error");
    expect(completed.resultDigest).toBe(digest(result));
    expect(completed.resultDigest).not.toBe(digest("body-success"));

    await subscription.dispose();
  });

  it("maps a real body throw from the same authoritative tools/result object", async () => {
    const { sessionCtx, toolCtx } = await setupRuntime(harness);
    const { agent } = createAgent(sessionCtx, toolCtx, "m4-043-body-error-session");
    const adapter = createDshRc5Adapter(toolCtx, { digest });
    const observed: RuntimeEvent[] = [];
    let rawResult: unknown;

    const subscription = adapter.observe({ accept: (event) => { observed.push(event); } });
    toolCtx.on("tools/result", (_exec, result) => { rawResult = result; });
    registerStringTool(toolCtx, {
      name: "m4_043_body_error",
      execute: () => {
        throw new Error("body failed");
      },
    });

    const result = await toolCtx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-043-body-error"),
      name: "m4_043_body_error",
      arguments: {},
      agent,
    });
    await subscription.drain();

    expect(result.isError).toBe(true);
    expect(rawResult).toBe(result);
    const completed = completedEvent(observed, "m4-043-body-error");
    expect(completed.outcome).toBe("error");
    expect(completed.resultDigest).toBe(digest(result));

    await subscription.dispose();
  });

  it("uses policy disposition only to classify the authoritative denial result", async () => {
    const { sessionCtx, toolCtx } = await setupRuntime(harness);
    const { agent } = createAgent(sessionCtx, toolCtx, "m4-043-denied-session");
    const adapter = createDshRc5Adapter(toolCtx, { digest });
    const observed: RuntimeEvent[] = [];
    let rawResult: unknown;
    let bodyCalls = 0;

    const subscription = adapter.observe({ accept: (event) => { observed.push(event); } });
    toolCtx.on("tools/result", (_exec, result) => { rawResult = result; });
    registerStringTool(toolCtx, {
      name: "m4_043_denied",
      execute: () => {
        bodyCalls += 1;
        return "must-not-run";
      },
    });
    adapter.registerToolPolicy(() => ({ kind: "DENY", reason: "policy denied" }));

    const result = await toolCtx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-043-denied"),
      name: "m4_043_denied",
      arguments: {},
      agent,
    });
    await subscription.drain();

    expect(bodyCalls).toBe(0);
    expect(result.isError).toBe(true);
    expect(rawResult).toBe(result);
    const completed = completedEvent(observed, "m4-043-denied");
    expect(completed.outcome).toBe("denied");
    expect(completed.resultDigest).toBe(digest(result));

    await subscription.dispose();
  });

  it("does not synthesize session-scoped completion for an agent-less native result", async () => {
    const { toolCtx } = await setupRuntime(harness);
    const adapter = createDshRc5Adapter(toolCtx, { digest });
    const observed: RuntimeEvent[] = [];
    let rawResultCalls = 0;

    const subscription = adapter.observe({ accept: (event) => { observed.push(event); } });
    toolCtx.on("tools/result", () => { rawResultCalls += 1; });
    registerStringTool(toolCtx, {
      name: "m4_043_agentless",
      execute: () => "host-result",
    });

    const result = await toolCtx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-043-agentless"),
      name: "m4_043_agentless",
      arguments: {},
    });
    await subscription.drain();

    expect(result.isError).toBe(false);
    expect(rawResultCalls).toBe(1);
    expect(observed.filter((event) => event.type === "tool.completed")).toEqual([]);

    await subscription.dispose();
  });

  it("contains synchronous and asynchronous raw tools/result observer failures", async () => {
    const cases: readonly {
      readonly suffix: string;
      readonly install: (ctx: Context) => void;
    }[] = [
      {
        suffix: "sync",
        install: (ctx) => {
          ctx.on("tools/result", () => {
            throw new Error("sync observer failure");
          });
        },
      },
      {
        suffix: "async",
        install: (ctx) => {
          // The typed ctx.on() contract keeps tools/result observers synchronous.
          // DATR-023 targets ToolRuntime's raw thenable-containment path instead.
          ctx.events.on("tools/result", async () => {
            throw new Error("async observer failure");
          });
        },
      },
    ];

    for (const observerCase of cases) {
      const localHarness = await createHarnessTestScope();
      try {
        const { sessionCtx, toolCtx } = await setupRuntime(localHarness);
        const { agent } = createAgent(
          sessionCtx,
          toolCtx,
          `m4-043-observer-${observerCase.suffix}-session`,
        );
        observerCase.install(toolCtx);
        registerStringTool(toolCtx, {
          name: `m4_043_observer_${observerCase.suffix}`,
          execute: () => "final-value",
        });

        const result = await toolCtx.tools.execute({
          signal: new AbortController().signal,
          callId: CallId(`m4-043-observer-${observerCase.suffix}`),
          name: `m4_043_observer_${observerCase.suffix}`,
          arguments: {},
          agent,
        });
        await Promise.resolve();

        expect(result.isError).toBe(false);
        expect(result.content).toEqual([{ type: "text", text: "final-value" }]);
      } finally {
        await localHarness.dispose();
      }
    }
  });

  it("reports Adapter digest failure as observation failure without mutating ToolRuntime result", async () => {
    const { sessionCtx, toolCtx } = await setupRuntime(harness);
    const { agent } = createAgent(sessionCtx, toolCtx, "m4-043-adapter-failure-session");
    const observed: RuntimeEvent[] = [];
    const failures: unknown[] = [];
    const adapter = createDshRc5Adapter(toolCtx, {
      digest() {
        throw new Error("digest failed");
      },
      onObservationFailure(_event, error) {
        failures.push(error);
      },
    });
    const subscription = adapter.observe({ accept: (event) => { observed.push(event); } });
    registerStringTool(toolCtx, {
      name: "m4_043_adapter_failure",
      execute: () => "final-value",
    });

    const result = await toolCtx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-043-adapter-failure"),
      name: "m4_043_adapter_failure",
      arguments: {},
      agent,
    });
    await subscription.drain();

    expect(result.isError).toBe(false);
    expect(result.content).toEqual([{ type: "text", text: "final-value" }]);
    expect(failures).toHaveLength(1);
    expect(observed.filter((event) => event.type === "tool.completed")).toEqual([]);

    await subscription.dispose();
  });

  it("stops future tools/result delivery after the Adapter observation subscription is disposed", async () => {
    const { sessionCtx, toolCtx } = await setupRuntime(harness);
    const { agent } = createAgent(sessionCtx, toolCtx, "m4-043-disposal-session");
    const observed: RuntimeEvent[] = [];
    const adapter = createDshRc5Adapter(toolCtx, { digest });
    const subscription = adapter.observe({ accept: (event) => { observed.push(event); } });
    registerStringTool(toolCtx, {
      name: "m4_043_disposal",
      execute: () => "final-value",
    });

    await toolCtx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-043-before-disposal"),
      name: "m4_043_disposal",
      arguments: {},
      agent,
    });
    await subscription.drain();
    expect(completedEvent(observed, "m4-043-before-disposal").outcome).toBe("success");

    await subscription.dispose();
    await toolCtx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId("m4-043-after-disposal"),
      name: "m4_043_disposal",
      arguments: {},
      agent,
    });

    expect(observed.some(
      (event) => event.type === "tool.completed" && event.callRef === "m4-043-after-disposal",
    )).toBe(false);
  });
});
