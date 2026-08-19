import { afterEach, beforeEach, describe, expect, it } from "vitest";
import AgentRegistry from "@deepseek-ai/dsh-agent";
import SessionStore, { SessionId } from "@deepseek-ai/dsh-session";

import { createDshRc5Adapter } from "../src/binding.js";
import type { RuntimeEvent } from "../src/runtime-events.js";
import {
  createHarnessTestScope,
  type HarnessTestScope,
} from "./harness-runtime.js";

function digest(value: unknown): string {
  return `m3-010:${JSON.stringify(value)}`;
}

describe("M3-010 exact DeepSeek Harness rc5 turn lifecycle", () => {
  let harness: HarnessTestScope;

  beforeEach(async () => {
    harness = await createHarnessTestScope();
  });

  afterEach(async () => {
    await harness.dispose();
  });

  it("projects real durable turn/step brackets without fabricating step.ended", async () => {
    await harness.ctx.plugin(SessionStore);
    await harness.ctx.plugin(AgentRegistry);
    const ctx = await harness.inject(["sessions", "agents"]);
    const session = ctx.sessions.create(SessionId("m3-010-real-lifecycle"));
    const adapter = createDshRc5Adapter(ctx, {
      digest,
      now: () => "2026-08-19T02:15:00.000Z",
    });
    const observed: RuntimeEvent[] = [];
    const observation = adapter.observe({
      accept(event) {
        observed.push(event);
      },
    });

    try {
      // These are actual rc5 SessionEventMap writes. In particular, step/end is
      // source-owned durable evidence even though Spec 0003 intentionally has no
      // normalized step.ended event.
      session.append("turn/start", { turn: 1 });
      session.append("step/start", { turn: 1, step: 0 });
      session.append("step/end", { turn: 1, step: 0 });
      session.append("turn/end", { turn: 1, reason: { kind: "completed" } });

      await observation.drain();

      const lifecycle = observed.filter((event) =>
        event.type === "turn.started"
        || event.type === "step.started"
        || event.type === "turn.ended");

      expect(lifecycle.map((event) => event.type)).toEqual([
        "turn.started",
        "step.started",
        "turn.ended",
      ]);
      expect(lifecycle[0]).toMatchObject({
        type: "turn.started",
        sessionRef: "m3-010-real-lifecycle",
        turnRef: "m3-010-real-lifecycle/turn:1",
      });
      expect(lifecycle[1]).toMatchObject({
        type: "step.started",
        sessionRef: "m3-010-real-lifecycle",
        turnRef: "m3-010-real-lifecycle/turn:1",
        stepRef: "m3-010-real-lifecycle/turn:1/step:0",
      });
      expect(lifecycle[2]).toMatchObject({
        type: "turn.ended",
        sessionRef: "m3-010-real-lifecycle",
        turnRef: "m3-010-real-lifecycle/turn:1",
        status: "completed",
      });
      expect(observed.map((event) => String(event.type))).not.toContain("step.ended");
    } finally {
      await observation.dispose();
    }
  });
});
