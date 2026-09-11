import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Context } from "@deepseek-ai/cordis";
import { CallId } from "@deepseek-ai/dsh-llm";
import SessionStore, { SessionId } from "@deepseek-ai/dsh-session";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";

import { createDshRc5Adapter } from "../src/binding.js";
import {
  DSH_RC5_FEATURES,
  requireAdapterFeatures,
} from "../src/feature-matrix.js";
import { MONOTONIC_TOOL_GUARD_FAIL_CLOSED_REASON } from "../src/monotonic-tool-guard.js";
import type { ToolGuardHandler, ToolPolicyRequest } from "../src/ports.js";
import {
  createAgentFixture,
  createHarnessTestScope,
  type HarnessTestScope,
} from "./harness-runtime.js";

const signal = new AbortController().signal;

function digest(value: unknown): string {
  return `m4-041:${JSON.stringify(value)}`;
}

async function setupTools(harness: HarnessTestScope) {
  await harness.ctx.plugin(SystemPrompt);
  await harness.ctx.plugin(ToolRuntime);
  const ctx = await harness.inject(["tools"]);
  return { ctx, adapter: createDshRc5Adapter(ctx, { digest }) };
}

async function setupToolsAndSessions(harness: HarnessTestScope) {
  await harness.ctx.plugin(SessionStore);
  await harness.ctx.plugin(SystemPrompt);
  await harness.ctx.plugin(ToolRuntime);
  const ctx = await harness.inject(["sessions", "tools"]);
  return { ctx, adapter: createDshRc5Adapter(ctx, { digest }) };
}

function registerStringTool(ctx: Context, name: string, onBody?: () => void): void {
  ctx.tools.register(defineTool({
    name,
    description: `M4-041 source-conformance tool ${name}`,
    parameters: {},
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }],
    },
    async execute() {
      onBody?.();
      return "executed";
    },
  }));
}

function resultText(result: Awaited<ReturnType<Context["tools"]["execute"]>>): string {
  const first = result.content[0];
  return first?.type === "text" ? first.text : JSON.stringify(result.content);
}

describe("M4-041 pinned rc5 monotonic tool guard", () => {
  let harness: HarnessTestScope;

  beforeEach(async () => {
    harness = await createHarnessTestScope();
  });

  afterEach(async () => {
    await harness.dispose();
  });

  it("projects exact host identity and frozen argument reference, with ALLOW as abstention", async () => {
    const { ctx, adapter } = await setupTools(harness);
    registerStringTool(ctx, "m4_041_host_allow");
    let harnessArguments: unknown;
    ctx.on("tools/pre-execute", async (exec, next) => {
      harnessArguments = exec.arguments;
      return next();
    });

    let request: Readonly<ToolPolicyRequest> | undefined;
    adapter.registerMonotonicToolGuard?.((value) => {
      request = value;
      return { kind: "ALLOW" };
    });

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("m4-041-host"),
      name: "m4_041_host_allow",
      arguments: { path: "./opaque" },
    });

    expect(result.isError).toBe(false);
    expect(request).toMatchObject({
      callRef: "m4-041-host",
      rootCallRef: "m4-041-host",
      toolName: "m4_041_host_allow",
      scope: { kind: "host" },
    });
    expect(request?.arguments).toBe(harnessArguments);
    expect(Object.isFrozen(request?.arguments)).toBe(true);
  });

  it("preserves nested root identity and exact agent scope", async () => {
    const { ctx, adapter } = await setupToolsAndSessions(harness);
    registerStringTool(ctx, "m4_041_agent_projection");
    const session = ctx.sessions.create(SessionId("m4-041-session"));
    const agent = createAgentFixture(ctx, session);
    let request: Readonly<ToolPolicyRequest> | undefined;

    adapter.registerMonotonicToolGuard?.((value) => {
      request = value;
      return { kind: "DENY", reason: "captured" };
    });

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("m4-041-child"),
      rootCallId: CallId("m4-041-root"),
      name: "m4_041_agent_projection",
      arguments: {},
      agent,
    });

    expect(result.isError).toBe(true);
    expect(request).toMatchObject({
      callRef: "m4-041-child",
      rootCallRef: "m4-041-root",
      scope: {
        kind: "agent",
        sessionRef: String(session.id),
        agentRef: String(agent.id),
      },
    });
  });

  it("keeps DENY monotonic after prepended pre-execute ALLOW and prevents body entry", async () => {
    const { ctx, adapter } = await setupTools(harness);
    let bodyCalls = 0;
    let preCalls = 0;
    registerStringTool(ctx, "m4_041_terminal_deny", () => { bodyCalls += 1; });

    adapter.registerMonotonicToolGuard?.(() => ({ kind: "DENY", reason: "terminal policy" }));
    ctx.on("tools/pre-execute", () => {
      preCalls += 1;
      return Promise.resolve({ kind: "allow" });
    }, { prepend: true });

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("m4-041-terminal-deny"),
      name: "m4_041_terminal_deny",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toContain("terminal policy");
    expect(preCalls).toBe(1);
    expect(bodyCalls).toBe(0);
  });

  it("composes multiple guards monotonically and preserves an empty-string denial", async () => {
    const { ctx, adapter } = await setupTools(harness);
    let bodyCalls = 0;
    registerStringTool(ctx, "m4_041_multiple", () => { bodyCalls += 1; });

    adapter.registerMonotonicToolGuard?.(() => ({ kind: "ALLOW" }));
    adapter.registerMonotonicToolGuard?.(() => ({ kind: "DENY", reason: "" }));

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("m4-041-multiple"),
      name: "m4_041_multiple",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(bodyCalls).toBe(0);
  });

  it("fails closed for Promise, accessor, and revoked-Proxy decisions without executing getters", async () => {
    const { ctx, adapter } = await setupTools(harness);
    const hostileCases: readonly {
      readonly suffix: string;
      readonly create: () => { readonly handler: ToolGuardHandler; readonly getterCalls: () => number };
    }[] = [
      {
        suffix: "promise",
        create: () => ({
          handler: (() => Promise.resolve({ kind: "ALLOW" })) as unknown as ToolGuardHandler,
          getterCalls: () => 0,
        }),
      },
      {
        suffix: "accessor",
        create: () => {
          let calls = 0;
          const value = {};
          Object.defineProperty(value, "kind", {
            get() {
              calls += 1;
              return "ALLOW";
            },
          });
          return {
            handler: (() => value) as unknown as ToolGuardHandler,
            getterCalls: () => calls,
          };
        },
      },
      {
        suffix: "revoked-proxy",
        create: () => {
          const revocable = Proxy.revocable({ kind: "ALLOW" }, {});
          revocable.revoke();
          return {
            handler: (() => revocable.proxy) as unknown as ToolGuardHandler,
            getterCalls: () => 0,
          };
        },
      },
    ];

    for (const hostileCase of hostileCases) {
      let bodyCalls = 0;
      const toolName = `m4_041_${hostileCase.suffix.replaceAll("-", "_")}`;
      registerStringTool(ctx, toolName, () => { bodyCalls += 1; });
      const hostile = hostileCase.create();
      const registration = adapter.registerMonotonicToolGuard?.(hostile.handler);

      const result = await ctx.tools.execute({
        signal,
        callId: CallId(`m4-041-${hostileCase.suffix}`),
        name: toolName,
        arguments: {},
      });

      expect(result.isError).toBe(true);
      expect(resultText(result)).toContain(MONOTONIC_TOOL_GUARD_FAIL_CLOSED_REASON);
      expect(bodyCalls).toBe(0);
      expect(hostile.getterCalls()).toBe(0);
      await registration?.dispose();
    }
  });

  it("disposes duplicate registrations independently", async () => {
    const { ctx, adapter } = await setupTools(harness);
    let bodyCalls = 0;
    registerStringTool(ctx, "m4_041_disposal", () => { bodyCalls += 1; });
    const first = adapter.registerMonotonicToolGuard?.(() => ({ kind: "DENY", reason: "first" }));
    const second = adapter.registerMonotonicToolGuard?.(() => ({ kind: "DENY", reason: "second" }));

    await first?.dispose();
    const stillDenied = await ctx.tools.execute({
      signal,
      callId: CallId("m4-041-one-remains"),
      name: "m4_041_disposal",
      arguments: {},
    });
    expect(stillDenied.isError).toBe(true);
    expect(bodyCalls).toBe(0);

    await second?.dispose();
    const allowed = await ctx.tools.execute({
      signal,
      callId: CallId("m4-041-all-disposed"),
      name: "m4_041_disposal",
      arguments: {},
    });
    expect(allowed.isError).toBe(false);
    expect(bodyCalls).toBe(1);
  });

  it("requires toolsMonotonicGuard explicitly instead of falling back to pre-execute", () => {
    const unavailable = Object.freeze({
      ...DSH_RC5_FEATURES,
      toolsMonotonicGuard: false,
    });

    expect(() => requireAdapterFeatures(unavailable, ["toolsMonotonicGuard"]))
      .toThrow(/required DeepSeek Harness adapter features are unavailable: toolsMonotonicGuard/);
  });
});
