import type { Context } from "@deepseek-ai/cordis";
import { Inbox, type Agent } from "@deepseek-ai/dsh-agent";
import { CallId } from "@deepseek-ai/dsh-llm";
import SessionStore, { SessionId, type Session } from "@deepseek-ai/dsh-session";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";
import { describe, expect, it } from "vitest";

import { createDshRc5Adapter } from "../src/binding.js";
import type { RuntimeEvent, ToolCompletedEvent } from "../src/runtime-events.js";
import { createHarnessTestScope } from "./harness-runtime.js";

function digest(value: unknown): string {
  return `test:${JSON.stringify(value)}`;
}

/**
 * Build the smallest complete public Agent handle needed to exercise an
 * agent-scoped ToolRuntime call without loading the concrete agent loop.
 *
 * The fixture deliberately satisfies the full public Agent interface instead
 * of type-casting a partial object. Session and Inbox are real pinned-Harness
 * objects; driver methods are inert because this conformance test drives only
 * ToolRuntime.execute().
 */
function createAgentFixture(ctx: Context, session: Session): Agent {
  const inbox = new Inbox(session, {
    inserted() {},
    discarded() {},
    claimed() {},
  });

  return {
    id: session.id,
    options: {},
    session,
    inbox,
    status: "idle",
    ctx,
    cancel() {},
    async whenIdle(): Promise<void> {},
    async runMaintenance<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> {
      return task(new AbortController().signal);
    },
    send() {},
    followup() {},
    steer() {},
    inject() {},
  };
}

describe("DeepSeek Harness rc5 authoritative final tool result", () => {
  it("observes the materialized tools/result outcome rather than the tool body result", async () => {
    const harness = await createHarnessTestScope();
    let subscription: ReturnType<ReturnType<typeof createDshRc5Adapter>["observe"]> | undefined;

    try {
      await harness.ctx.plugin(SessionStore);
      await harness.ctx.plugin(SystemPrompt);
      await harness.ctx.plugin(ToolRuntime);

      const sessionCtx = await harness.inject(["sessions"]);
      const toolCtx = await harness.inject(["tools"]);
      const session = sessionCtx.sessions.create(SessionId("tool-result-authority"));
      const agent = createAgentFixture(toolCtx, session);
      const observed: RuntimeEvent[] = [];
      let harnessResultDigest: string | undefined;

      toolCtx.tools.register(defineTool({
        name: "authoritative-result",
        description: "exercise the final-result observation boundary",
        parameters: {},
        output: {
          schema: { type: "string" },
          render: (_args, value) => [{ type: "text", text: value }],
        },
        async execute() {
          return "body-value";
        },
      }));

      // Prove the authoritative boundary is after the post-execute waterfall:
      // the body returns "body-value", but the final model-facing content is
      // replaced before ToolRuntime materializes and emits `tools/result`.
      toolCtx.on("tools/post-execute", async () => ({
        kind: "accept",
        content: [{ type: "text", text: "post-final" }],
      }));
      toolCtx.on("tools/result", (_exec, result) => {
        harnessResultDigest = digest(result);
      });

      const adapter = createDshRc5Adapter(toolCtx, { digest });
      subscription = adapter.observe({
        accept(event) {
          observed.push(event);
        },
      });

      const result = await toolCtx.tools.execute({
        signal: new AbortController().signal,
        callId: CallId("authoritative-result-1"),
        name: "authoritative-result",
        arguments: {},
        agent,
      });
      await subscription.drain();

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([{ type: "text", text: "post-final" }]);
      expect(harnessResultDigest).toBe(digest(result));

      const completed = observed.find(
        (event): event is ToolCompletedEvent => event.type === "tool.completed",
      );
      if (completed === undefined) {
        throw new Error("adapter did not observe the pinned Harness tools/result event");
      }

      expect(observed.filter((event) => event.type === "tool.completed")).toHaveLength(1);
      expect(completed.callRef).toBe("authoritative-result-1");
      expect(completed.toolName).toBe("authoritative-result");
      expect(completed.outcome).toBe("success");
      expect(completed.resultDigest).toBe(digest(result));
      expect(completed.resultDigest).toBe(harnessResultDigest);
    } finally {
      await subscription?.dispose();
      await harness.dispose();
    }
  });
});
