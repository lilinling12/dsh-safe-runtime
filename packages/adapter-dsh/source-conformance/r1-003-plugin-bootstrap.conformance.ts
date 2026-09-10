import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Context } from "@deepseek-ai/cordis";
import { CallId } from "@deepseek-ai/dsh-llm";
import SessionStore, { SessionId } from "@deepseek-ai/dsh-session";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";
import ApprovalService, { type ApprovalOutcome } from "@deepseek-ai/dsh-user-approval";

import {
  createDshRc5Plugin,
  DshAdapterError,
  type DshRc5PluginOptions,
  type ToolGuardHandler,
  type ToolPolicyHandler,
} from "../src/index.js";
import {
  createAgentFixture,
  createHarnessTestScope,
  type HarnessTestScope,
} from "./harness-runtime.js";

const DEFAULT_DENY_REASON = "safe-runtime plugin default deny";
const signal = new AbortController().signal;

function digest(value: unknown): string {
  return `r1-003:${JSON.stringify(value)}`;
}

function resultText(result: unknown): string {
  return JSON.stringify(result);
}

function registerStringTool(ctx: Context, name: string, onBody?: () => void): void {
  ctx.tools.register(defineTool({
    name,
    description: `R1-003 source-conformance tool ${name}`,
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

async function setupTools(harness: HarnessTestScope) {
  await harness.ctx.plugin(SystemPrompt);
  await harness.ctx.plugin(ToolRuntime);
  return harness.inject(["tools"]);
}

async function setupApproval(harness: HarnessTestScope) {
  await harness.ctx.plugin(SessionStore);
  await harness.ctx.plugin(SystemPrompt);
  await harness.ctx.plugin(ApprovalService, { policy: "ask" });
  await harness.ctx.plugin(ToolRuntime);
  return harness.inject(["sessions", "approval", "tools"]);
}

function createOpenAgent(ctx: Context, sessionRef: string) {
  const session = ctx.sessions.create(SessionId(sessionRef));
  session.append("turn/start", { turn: 1 });
  return { session, agent: createAgentFixture(ctx, session) };
}

async function mount(ctx: Context, options: DshRc5PluginOptions) {
  return ctx.plugin(createDshRc5Plugin(options));
}

function expectCode(error: unknown, code: DshAdapterError["code"]): void {
  expect(error).toBeInstanceOf(DshAdapterError);
  expect((error as DshAdapterError).code).toBe(code);
}

describe("R1-003 pinned rc5 native plugin bootstrap", () => {
  let harness: HarnessTestScope;

  beforeEach(async () => {
    harness = await createHarnessTestScope();
  });

  afterEach(async () => {
    await harness.dispose();
  });

  it("creates a frozen side-effect-free native Cordis plugin object", async () => {
    const ctx = await setupTools(harness);
    let bodyCalls = 0;
    registerStringTool(ctx, "r1_003_factory_only", () => { bodyCalls += 1; });

    const plugin = createDshRc5Plugin({ adapter: { digest } });
    expect(plugin.name).toBe("@dsh-safe/adapter-dsh/rc5");
    expect(Object.isFrozen(plugin)).toBe(true);

    const beforeMount = await ctx.tools.execute({
      signal,
      callId: CallId("r1-003-before-mount"),
      name: "r1_003_factory_only",
      arguments: {},
    });
    expect(beforeMount.isError).toBe(false);
    expect(bodyCalls).toBe(1);

    const fiber = await ctx.plugin(plugin);
    const afterMount = await ctx.tools.execute({
      signal,
      callId: CallId("r1-003-after-mount"),
      name: "r1_003_factory_only",
      arguments: {},
    });
    expect(afterMount.isError).toBe(true);
    expect(bodyCalls).toBe(1);
    await fiber.dispose();
  });

  it("rejects plugin-owned hostile configuration without invoking accessors", () => {
    let outerGetterCalls = 0;
    const accessorOptions: Record<string, unknown> = {};
    Object.defineProperty(accessorOptions, "adapter", {
      enumerable: true,
      get() {
        outerGetterCalls += 1;
        return { digest };
      },
    });

    expect(() => createDshRc5Plugin(accessorOptions as unknown as DshRc5PluginOptions))
      .toThrowError(expect.objectContaining({ code: "INVALID_PLUGIN_OPTIONS" }));
    expect(outerGetterCalls).toBe(0);

    expect(() => createDshRc5Plugin({
      adapter: { digest },
      [Symbol("authority")]: true,
    } as DshRc5PluginOptions)).toThrowError(
      expect.objectContaining({ code: "INVALID_PLUGIN_OPTIONS" }),
    );

    const revoked = Proxy.revocable({ adapter: { digest } }, {});
    revoked.revoke();
    expect(() => createDshRc5Plugin(revoked.proxy as DshRc5PluginOptions))
      .toThrowError(expect.objectContaining({ code: "INVALID_PLUGIN_OPTIONS" }));
  });

  it("keeps nested Adapter validation under R1-002 and never executes nested accessors", async () => {
    const ctx = await setupTools(harness);
    let getterCalls = 0;
    const adapter: Record<string, unknown> = {};
    Object.defineProperty(adapter, "digest", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return digest;
      },
    });

    const plugin = createDshRc5Plugin({ adapter: adapter as never });
    expect(getterCalls).toBe(0);

    let failure: unknown;
    try {
      await ctx.plugin(plugin);
    } catch (error: unknown) {
      failure = error;
    }
    expectCode(failure, "INVALID_ADAPTER_OPTIONS");
    expect(getterCalls).toBe(0);
  });

  it("detaches selected mode and handler identity at factory time", async () => {
    const ctx = await setupTools(harness);
    let firstCalls = 0;
    let secondCalls = 0;
    const first: ToolPolicyHandler = () => {
      firstCalls += 1;
      return { kind: "DENY", reason: "first handler" };
    };
    const second: ToolPolicyHandler = () => {
      secondCalls += 1;
      return { kind: "ALLOW" };
    };
    const options: {
      adapter: { digest: typeof digest };
      policy: { mode: "HANDLER"; handler: ToolPolicyHandler };
    } = {
      adapter: { digest },
      policy: { mode: "HANDLER", handler: first },
    };

    const plugin = createDshRc5Plugin(options);
    options.policy.handler = second;
    registerStringTool(ctx, "r1_003_detached_handler");

    const fiber = await ctx.plugin(plugin);
    const result = await ctx.tools.execute({
      signal,
      callId: CallId("r1-003-detached-handler"),
      name: "r1_003_detached_handler",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(firstCalls).toBe(1);
    expect(secondCalls).toBe(0);
    await fiber.dispose();
  });

  it("treats omitted policy as DENY_ALL and preserves the monotonic hard veto", async () => {
    const ctx = await setupTools(harness);
    let bodyCalls = 0;
    let prependedCalls = 0;
    registerStringTool(ctx, "r1_003_default_deny", () => { bodyCalls += 1; });

    const fiber = await mount(ctx, { adapter: { digest } });

    const direct = await ctx.tools.execute({
      signal,
      callId: CallId("r1-003-default-policy"),
      name: "r1_003_default_deny",
      arguments: {},
    });
    expect(direct.isError).toBe(true);
    expect(resultText(direct)).toContain(DEFAULT_DENY_REASON);
    expect(bodyCalls).toBe(0);

    ctx.on("tools/pre-execute", () => {
      prependedCalls += 1;
      return Promise.resolve({ kind: "allow" });
    }, { prepend: true });

    const bypassAttempt = await ctx.tools.execute({
      signal,
      callId: CallId("r1-003-default-guard"),
      name: "r1_003_default_deny",
      arguments: {},
    });
    expect(bypassAttempt.isError).toBe(true);
    expect(resultText(bypassAttempt)).toContain(DEFAULT_DENY_REASON);
    expect(prependedCalls).toBe(1);
    expect(bodyCalls).toBe(0);

    await fiber.dispose();
  });

  it("preserves HANDLER ALLOW/DENY and installs an explicit monotonic guard only when supplied", async () => {
    const ctx = await setupTools(harness);
    let allowBodyCalls = 0;
    registerStringTool(ctx, "r1_003_handler_allow", () => { allowBodyCalls += 1; });

    const allowFiber = await mount(ctx, {
      adapter: { digest },
      policy: { mode: "HANDLER", handler: () => ({ kind: "ALLOW" }) },
    });
    const allowed = await ctx.tools.execute({
      signal,
      callId: CallId("r1-003-handler-allow"),
      name: "r1_003_handler_allow",
      arguments: {},
    });
    expect(allowed.isError).toBe(false);
    expect(allowBodyCalls).toBe(1);
    await allowFiber.dispose();

    let denyBodyCalls = 0;
    let guardCalls = 0;
    registerStringTool(ctx, "r1_003_handler_guard", () => { denyBodyCalls += 1; });
    const guard: ToolGuardHandler = () => {
      guardCalls += 1;
      return { kind: "DENY", reason: "explicit monotonic guard" };
    };
    const guardFiber = await mount(ctx, {
      adapter: { digest },
      policy: {
        mode: "HANDLER",
        handler: () => ({ kind: "ALLOW" }),
        monotonicGuard: guard,
      },
    });
    const denied = await ctx.tools.execute({
      signal,
      callId: CallId("r1-003-handler-guard"),
      name: "r1_003_handler_guard",
      arguments: {},
    });
    expect(denied.isError).toBe(true);
    expect(resultText(denied)).toContain("explicit monotonic guard");
    expect(guardCalls).toBe(1);
    expect(denyBodyCalls).toBe(0);
    await guardFiber.dispose();
  });

  it("routes one reached HANDLER ASK through exactly one native ApprovalService request", async () => {
    const ctx = await setupApproval(harness);
    const { agent } = createOpenAgent(ctx, "r1-003-ask-session");
    let approvalCalls = 0;
    let bodyCalls = 0;
    ctx.on("approval/request", () => {
      approvalCalls += 1;
      return Promise.resolve<ApprovalOutcome>("allowed-once");
    });
    registerStringTool(ctx, "r1_003_native_ask", () => { bodyCalls += 1; });

    const fiber = await mount(ctx, {
      adapter: { digest },
      policy: {
        mode: "HANDLER",
        handler: () => ({ kind: "ASK", reason: "native approval required" }),
      },
    });

    const result = await ctx.tools.execute({
      signal,
      callId: CallId("r1-003-native-ask"),
      name: "r1_003_native_ask",
      arguments: {},
      agent,
    });

    expect(result.isError).toBe(false);
    expect(approvalCalls).toBe(1);
    expect(bodyCalls).toBe(1);
    await fiber.dispose();
  });

  it("keeps agent-less ASK fail closed without synthesizing an approval owner", async () => {
    const ctx = await setupApproval(harness);
    let approvalCalls = 0;
    let bodyCalls = 0;
    ctx.on("approval/request", () => {
      approvalCalls += 1;
      return Promise.resolve<ApprovalOutcome>("allowed-once");
    });
    registerStringTool(ctx, "r1_003_agentless_ask", () => { bodyCalls += 1; });

    const fiber = await mount(ctx, {
      adapter: { digest },
      policy: { mode: "HANDLER", handler: () => ({ kind: "ASK" }) },
    });
    const result = await ctx.tools.execute({
      signal,
      callId: CallId("r1-003-agentless-ask"),
      name: "r1_003_agentless_ask",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(approvalCalls).toBe(0);
    expect(bodyCalls).toBe(0);
    await fiber.dispose();
  });

  it("Fiber disposal removes old handlers, preserves the root, and permits an isolated remount", async () => {
    const ctx = await setupTools(harness);
    let bodyCalls = 0;
    let firstCalls = 0;
    let secondCalls = 0;
    registerStringTool(ctx, "r1_003_remount", () => { bodyCalls += 1; });

    const firstFiber = await mount(ctx, {
      adapter: { digest },
      policy: {
        mode: "HANDLER",
        handler: () => {
          firstCalls += 1;
          return { kind: "DENY", reason: "first mount" };
        },
      },
    });
    const firstResult = await ctx.tools.execute({
      signal,
      callId: CallId("r1-003-first-mount"),
      name: "r1_003_remount",
      arguments: {},
    });
    expect(firstResult.isError).toBe(true);
    expect(firstCalls).toBe(1);

    await firstFiber.dispose();
    expect(firstFiber.uid).toBeNull();

    const independentDispose = harness.root.on("session/event", () => {});
    independentDispose();

    const between = await ctx.tools.execute({
      signal,
      callId: CallId("r1-003-between-mounts"),
      name: "r1_003_remount",
      arguments: {},
    });
    expect(between.isError).toBe(false);
    expect(bodyCalls).toBe(1);
    expect(firstCalls).toBe(1);

    const secondFiber = await mount(ctx, {
      adapter: { digest },
      policy: {
        mode: "HANDLER",
        handler: () => {
          secondCalls += 1;
          return { kind: "ALLOW" };
        },
      },
    });
    const secondResult = await ctx.tools.execute({
      signal,
      callId: CallId("r1-003-second-mount"),
      name: "r1_003_remount",
      arguments: {},
    });
    expect(secondResult.isError).toBe(false);
    expect(bodyCalls).toBe(2);
    expect(firstCalls).toBe(1);
    expect(secondCalls).toBe(1);
    await secondFiber.dispose();
  });
});