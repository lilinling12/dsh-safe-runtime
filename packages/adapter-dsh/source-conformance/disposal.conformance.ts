import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { agentEvents } from "@deepseek-ai/dsh-agent";
import { CallId } from "@deepseek-ai/dsh-llm";
import SessionStore, { SessionId } from "@deepseek-ai/dsh-session";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";

import { createDshRc5Adapter } from "../src/binding.js";
import type { RuntimeEvent } from "../src/runtime-events.js";
import {
  createAgentFixture,
  createHarnessTestScope,
  type HarnessTestScope,
} from "./harness-runtime.js";

const signal = new AbortController().signal;

function digest(value: unknown): string {
  return `test:${JSON.stringify(value)}`;
}

async function setupToolRuntime(harness: HarnessTestScope) {
  await harness.ctx.plugin(SystemPrompt);
  await harness.ctx.plugin(ToolRuntime);
  const ctx = await harness.inject(["tools"]);
  return { ctx, adapter: createDshRc5Adapter(ctx, { digest }) };
}

describe("DeepSeek Harness rc5 adapter disposal", () => {
  let harness: HarnessTestScope;

  beforeEach(async () => {
    harness = await createHarnessTestScope();
  });

  afterEach(async () => {
    await harness.dispose();
  });

  it("stops observing future delivery after disposal while the durable runtime remains live", async () => {
    await harness.ctx.plugin(SessionStore);
    const ctx = await harness.inject(["sessions"]);
    const adapter = createDshRc5Adapter(ctx, { digest });
    const observed: RuntimeEvent[] = [];
    const subscription = adapter.observe({
      accept(event) {
        observed.push(event);
      },
    });

    const session = ctx.sessions.create(SessionId("observer-disposal"));
    session.append("turn/start", { turn: 1 });
    await subscription.drain();
    expect(observed.map((event) => event.type)).toEqual(["turn.started"]);

    await subscription.dispose();
    await subscription.dispose();

    const postDispose = session.append("step/start", { turn: 1, step: 1 });
    await subscription.drain();

    expect(postDispose.type).toBe("step/start");
    expect(session.events.at(-1)?.type).toBe("step/start");
    expect(observed.map((event) => event.type)).toEqual(["turn.started"]);
  });

  it("drains already accepted asynchronous evidence before observation disposal resolves", async () => {
    await harness.ctx.plugin(SessionStore);
    const ctx = await harness.inject(["sessions"]);
    const adapter = createDshRc5Adapter(ctx, { digest });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let settled = 0;

    const subscription = adapter.observe({
      async accept() {
        await gate;
        settled += 1;
      },
    });

    const session = ctx.sessions.create(SessionId("observer-drain"));
    session.append("turn/start", { turn: 1 });

    let disposed = false;
    const disposing = Promise.resolve(subscription.dispose()).then(() => {
      disposed = true;
    });
    await Promise.resolve();
    expect(disposed).toBe(false);
    expect(settled).toBe(0);

    release();
    await disposing;
    expect(disposed).toBe(true);
    expect(settled).toBe(1);
  });

  it("removes an isolated tool policy after disposal while ToolRuntime remains usable", async () => {
    const { ctx, adapter } = await setupToolRuntime(harness);
    let bodyCalls = 0;

    ctx.tools.register(defineTool({
      name: "disposable-policy",
      description: "M3-016 policy disposal probe",
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

    const registration = adapter.registerToolPolicy(() => ({
      kind: "DENY",
      reason: "M3-016 isolated policy",
    }));

    const before = await ctx.tools.execute({
      signal,
      callId: CallId("disposal-policy-before"),
      name: "disposable-policy",
      arguments: {},
    });
    expect(before.isError).toBe(true);
    expect(bodyCalls).toBe(0);

    await registration.dispose();

    const after = await ctx.tools.execute({
      signal,
      callId: CallId("disposal-policy-after"),
      name: "disposable-policy",
      arguments: {},
    });
    expect(after.isError).toBe(false);
    expect(bodyCalls).toBe(1);
  });

  it("removes the exact monotonic guard after disposal while ToolRuntime remains usable", async () => {
    const { ctx, adapter } = await setupToolRuntime(harness);
    let bodyCalls = 0;

    ctx.tools.register(defineTool({
      name: "disposable-guard",
      description: "M3-016 guard disposal probe",
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

    const registerGuard = adapter.registerMonotonicToolGuard;
    if (registerGuard === undefined) {
      throw new Error("pinned rc5 adapter does not expose monotonic tool guard registration");
    }
    const registration = registerGuard(() => ({
      kind: "DENY",
      reason: "M3-016 isolated guard",
    }));

    const before = await ctx.tools.execute({
      signal,
      callId: CallId("disposal-guard-before"),
      name: "disposable-guard",
      arguments: {},
    });
    expect(before.isError).toBe(true);
    expect(bodyCalls).toBe(0);

    await registration.dispose();

    const after = await ctx.tools.execute({
      signal,
      callId: CallId("disposal-guard-after"),
      name: "disposable-guard",
      arguments: {},
    });
    expect(after.isError).toBe(false);
    expect(bodyCalls).toBe(1);
  });

  it("removes only the registered turn-stopping handler and leaves the public event seam live", async () => {
    await harness.ctx.plugin(SessionStore);
    const ctx = await harness.inject(["sessions"]);
    const adapter = createDshRc5Adapter(ctx, { digest });
    const session = ctx.sessions.create(SessionId("turn-stopping-disposal"));
    const agent = createAgentFixture(ctx, session);
    const dispatch = agentEvents(ctx, agent);
    let adapterHandlerCalls = 0;
    let independentHandlerCalls = 0;

    ctx.on("agent/turn-stopping", () => {
      independentHandlerCalls += 1;
    });
    const registration = adapter.registerTurnStopping(async () => {
      adapterHandlerCalls += 1;
    });

    await dispatch.serial("agent/turn-stopping", { turn: 1, signal });
    expect(adapterHandlerCalls).toBe(1);
    expect(independentHandlerCalls).toBe(1);

    await registration.dispose();

    await dispatch.serial("agent/turn-stopping", { turn: 2, signal });
    expect(adapterHandlerCalls).toBe(1);
    expect(independentHandlerCalls).toBe(2);
  });
});
