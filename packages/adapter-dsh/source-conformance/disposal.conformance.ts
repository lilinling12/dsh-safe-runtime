import { afterEach, describe, expect, it } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import SessionStore, { SessionId } from "@deepseek-ai/dsh-session";

import { createDshRc5Adapter } from "../src/binding.js";
import type { RuntimeEvent } from "../src/runtime-events.js";

function digest(value: unknown): string {
  return `test:${JSON.stringify(value)}`;
}

describe("DeepSeek Harness rc5 adapter disposal", () => {
  const contexts: Context[] = [];

  afterEach(async () => {
    while (contexts.length > 0) {
      const ctx = contexts.pop();
      if (ctx !== undefined) await ctx.dispose();
    }
  });

  it("stops observing durable session events after disposal and tolerates repeated disposal", async () => {
    const ctx = new Context();
    contexts.push(ctx);
    await ctx.plugin(SessionStore);
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

    session.append("step/start", { turn: 1, step: 1 });
    await subscription.drain();
    expect(observed.map((event) => event.type)).toEqual(["turn.started"]);
  });

  it("drains already accepted asynchronous evidence before disposal resolves", async () => {
    const ctx = new Context();
    contexts.push(ctx);
    await ctx.plugin(SessionStore);
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
    const disposing = subscription.dispose().then(() => { disposed = true; });
    await Promise.resolve();
    expect(disposed).toBe(false);
    expect(settled).toBe(0);

    release();
    await disposing;
    expect(disposed).toBe(true);
    expect(settled).toBe(1);
  });
});
