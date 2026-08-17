import { afterEach, describe, expect, it } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import AgentRegistry, { agentEvents, type Agent } from "@deepseek-ai/dsh-agent";
import SessionStore, { SessionId } from "@deepseek-ai/dsh-session";

import { createDshRc5Adapter } from "../src/binding.js";

function digest(value: unknown): string {
  return `test:${JSON.stringify(value)}`;
}

async function setupAgent(sessionRef: string) {
  const ctx = new Context();
  await ctx.plugin(SessionStore);
  await ctx.plugin(AgentRegistry);

  const session = ctx.sessions.create(SessionId(sessionRef));
  session.append("turn/start", { turn: 1 });
  const agent = {
    id: session.id,
    session,
  } as unknown as Agent;
  ctx.agents.register(agent);

  return {
    ctx,
    agent,
    adapter: createDshRc5Adapter(ctx, { digest }),
  };
}

describe("DeepSeek Harness rc5 turn-stopping binding", () => {
  const contexts: Context[] = [];

  afterEach(async () => {
    while (contexts.length > 0) {
      const ctx = contexts.pop();
      if (ctx !== undefined) await ctx.dispose();
    }
  });

  it("awaits safe-runtime completion work inside Harness's serial stop boundary", async () => {
    const { ctx, agent, adapter } = await setupAgent("turn-stop-await");
    contexts.push(ctx);

    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let entered = false;
    let completed = false;

    adapter.registerTurnStopping(async (request) => {
      entered = true;
      expect(request.sessionRef).toBe("turn-stop-await");
      expect(request.turnRef).toBe("turn-stop-await/turn:1");
      expect(request.signal.aborted).toBe(false);
      await gate;
      completed = true;
    });

    const signal = new AbortController().signal;
    let settled = false;
    const dispatch = agentEvents(ctx, agent)
      .serial("agent/turn-stopping", { turn: 1, signal })
      .then(() => { settled = true; });

    await Promise.resolve();
    expect(entered).toBe(true);
    expect(settled).toBe(false);
    expect(completed).toBe(false);

    release();
    await dispatch;
    expect(completed).toBe(true);
    expect(settled).toBe(true);
  });

  it("removes the serial completion hook when its registration is disposed", async () => {
    const { ctx, agent, adapter } = await setupAgent("turn-stop-dispose");
    contexts.push(ctx);
    let calls = 0;

    const registration = adapter.registerTurnStopping(() => {
      calls += 1;
    });

    const signal = new AbortController().signal;
    await agentEvents(ctx, agent).serial("agent/turn-stopping", { turn: 1, signal });
    expect(calls).toBe(1);

    await registration.dispose();
    await agentEvents(ctx, agent).serial("agent/turn-stopping", { turn: 1, signal });
    expect(calls).toBe(1);
  });

  it("propagates completion-gate failure instead of silently allowing turn closure", async () => {
    const { ctx, agent, adapter } = await setupAgent("turn-stop-failure");
    contexts.push(ctx);

    adapter.registerTurnStopping(() => {
      throw new Error("acceptance gate unavailable");
    });

    const signal = new AbortController().signal;
    await expect(
      agentEvents(ctx, agent).serial("agent/turn-stopping", { turn: 1, signal }),
    ).rejects.toThrow("acceptance gate unavailable");
  });
});
