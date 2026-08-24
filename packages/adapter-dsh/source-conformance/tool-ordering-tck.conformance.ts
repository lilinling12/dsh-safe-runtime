import { CallId } from "@deepseek-ai/dsh-llm";
import SessionStore, { SessionId } from "@deepseek-ai/dsh-session";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";
import { describe, expect, it } from "vitest";

import { createDshRc5Adapter } from "../src/binding.js";
import type { RuntimeEvent } from "../src/runtime-events.js";
import {
  createAgentFixture,
  createHarnessTestScope,
} from "./harness-runtime.js";

function digest(value: unknown): string {
  return `m3-011:${JSON.stringify(value)}`;
}

describe("M3-011 exact DeepSeek Harness rc5 tool ordering", () => {
  it("observes a real durable tool/call before the correlated live tools/result", async () => {
    const harness = await createHarnessTestScope();
    let subscription: ReturnType<ReturnType<typeof createDshRc5Adapter>["observe"]> | undefined;

    try {
      await harness.ctx.plugin(SessionStore);
      await harness.ctx.plugin(SystemPrompt);
      await harness.ctx.plugin(ToolRuntime);

      // One injected consumer owns both source seams. This avoids proving an
      // ordering property by manually merging observations from unrelated test
      // contexts, which would bypass the adapter's real dispatcher boundary.
      const ctx = await harness.inject(["sessions", "tools"]);
      const session = ctx.sessions.create(SessionId("m3-011-real-tool-ordering"));
      const agent = createAgentFixture(ctx, session);
      const observed: RuntimeEvent[] = [];

      ctx.tools.register(defineTool({
        name: "ordering-probe",
        description: "exercise the public rc5 request/completion ordering seams",
        parameters: {},
        output: {
          schema: { type: "string" },
          render: (_args, value) => [{ type: "text", text: value }],
        },
        async execute() {
          return "completed";
        },
      }));

      const adapter = createDshRc5Adapter(ctx, {
        digest,
        now: () => "2026-08-19T03:20:00.000Z",
      });
      subscription = adapter.observe({
        async accept(event) {
          // Async acceptance exercises OrderedRuntimeEventDispatcher instead of
          // relying on synchronous listener coincidence for the ordering proof.
          await Promise.resolve();
          observed.push(event);
        },
      });

      const callId = CallId("m3-011-call-1");
      session.append("turn/start", { turn: 1 });
      session.append("step/start", { turn: 1, step: 0 });
      session.append("tool/call", {
        turn: 1,
        step: 0,
        callId,
        name: "ordering-probe",
        arguments: "{}",
      });

      const result = await ctx.tools.execute({
        signal: new AbortController().signal,
        callId,
        name: "ordering-probe",
        arguments: {},
        agent,
      });
      await subscription.drain();

      expect(result.isError).toBe(false);
      const toolEvents = observed.filter(
        (event) => event.type === "tool.requested" || event.type === "tool.completed",
      );
      expect(toolEvents.map((event) => ({
        type: event.type,
        callRef: event.callRef,
        toolName: event.toolName,
      }))).toEqual([
        {
          type: "tool.requested",
          callRef: "m3-011-call-1",
          toolName: "ordering-probe",
        },
        {
          type: "tool.completed",
          callRef: "m3-011-call-1",
          toolName: "ordering-probe",
        },
      ]);
      expect(toolEvents).toHaveLength(2);
    } finally {
      await subscription?.dispose();
      await harness.dispose();
    }
  });
});
