import { afterEach, beforeEach, describe, expect, it } from "vitest";
import AgentRegistry, { agentEvents, type Agent } from "@deepseek-ai/dsh-agent";
import SessionStore, { SessionId } from "@deepseek-ai/dsh-session";

import { createDshRc5Adapter } from "../src/binding.js";
import { DshAdapterError } from "../src/errors.js";
import {
  createHarnessTestScope,
  type HarnessTestScope,
} from "./harness-runtime.js";

function digest(value: unknown): string {
  return `test:${JSON.stringify(value)}`;
}

async function setupAgent(
  harness: HarnessTestScope,
  sessionRef: string,
  onSteer: (message: unknown) => void = () => undefined,
) {
  await harness.ctx.plugin(SessionStore);
  await harness.ctx.plugin(AgentRegistry);
  const ctx = await harness.inject(["sessions", "agents"]);

  const session = ctx.sessions.create(SessionId(sessionRef));
  session.append("turn/start", { turn: 1 });
  const agent = {
    id: session.id,
    session,
    steer(message: unknown) {
      onSteer(message);
    },
  } as unknown as Agent;
  ctx.agents.register(agent);

  return {
    ctx,
    agent,
    adapter: createDshRc5Adapter(ctx, { digest }),
  };
}

describe("DeepSeek Harness rc5 turn-stopping binding", () => {
  let harness: HarnessTestScope;

  beforeEach(async () => {
    harness = await createHarnessTestScope();
  });

  afterEach(async () => {
    await harness.dispose();
  });

  it("awaits safe-runtime completion work inside Harness's serial stop boundary", async () => {
    const { ctx, agent, adapter } = await setupAgent(harness, "turn-stop-await");

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
    const { ctx, agent, adapter } = await setupAgent(harness, "turn-stop-dispose");
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
    const { ctx, agent, adapter } = await setupAgent(harness, "turn-stop-failure");

    adapter.registerTurnStopping(() => {
      throw new Error("acceptance gate unavailable");
    });

    const signal = new AbortController().signal;
    await expect(
      agentEvents(ctx, agent).serial("agent/turn-stopping", { turn: 1, signal }),
    ).rejects.toThrow("acceptance gate unavailable");
  });

  it("allows completion steering at the caller-defined retry budget boundary", async () => {
    const steered: unknown[] = [];
    const { adapter } = await setupAgent(
      harness,
      "steer-budget-boundary",
      (message) => steered.push(message),
    );

    await adapter.steerCompletion({
      sessionRef: "steer-budget-boundary",
      turnRef: "steer-budget-boundary/turn:1",
      reason: "required checks still fail",
      retryOrdinal: 2,
      maxRetries: 2,
    });

    expect(steered).toHaveLength(1);
  });

  it("fails closed before Harness steering when the caller-defined budget is exhausted", async () => {
    const steered: unknown[] = [];
    const { adapter } = await setupAgent(
      harness,
      "steer-budget-exhausted",
      (message) => steered.push(message),
    );

    let failure: unknown;
    try {
      await adapter.steerCompletion({
        sessionRef: "steer-budget-exhausted",
        turnRef: "steer-budget-exhausted/turn:1",
        reason: "required checks still fail",
        retryOrdinal: 3,
        maxRetries: 2,
      });
    } catch (error: unknown) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(DshAdapterError);
    expect(failure).toMatchObject({
      code: "COMPLETION_STEER_BUDGET_EXHAUSTED",
      message: "completion steering retry 3 exceeds caller budget 2",
    });
    expect(steered).toHaveLength(0);
  });

  it.each([
    { retryOrdinal: 0, maxRetries: 2 },
    { retryOrdinal: 1, maxRetries: -1 },
    { retryOrdinal: Number.NaN, maxRetries: 2 },
  ])("rejects malformed completion steering budgets: %j", async (request) => {
    const steered: unknown[] = [];
    const { adapter } = await setupAgent(
      harness,
      `steer-invalid-${String(request.retryOrdinal)}-${String(request.maxRetries)}`,
      (message) => steered.push(message),
    );

    await expect(adapter.steerCompletion({
      sessionRef: `steer-invalid-${String(request.retryOrdinal)}-${String(request.maxRetries)}`,
      turnRef: `steer-invalid-${String(request.retryOrdinal)}-${String(request.maxRetries)}/turn:1`,
      reason: "required checks still fail",
      ...request,
    })).rejects.toMatchObject({ code: "INVALID_COMPLETION_STEER_REQUEST" });
    expect(steered).toHaveLength(0);
  });
});
