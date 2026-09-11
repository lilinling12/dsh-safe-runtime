#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { Context } from "@deepseek-ai/cordis";
import { Inbox } from "@deepseek-ai/dsh-agent";
import { CallId } from "@deepseek-ai/dsh-llm";
import SessionStore, { SessionId } from "@deepseek-ai/dsh-session";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";
import ApprovalService from "@deepseek-ai/dsh-user-approval";
import * as AdapterPackage from "@dsh-safe/adapter-dsh";

const {
  createDshRc5Adapter,
  createDshRc5Plugin,
  DshAdapterError,
} = AdapterPackage;

const DIRECT_PEERS = Object.freeze({
  "@deepseek-ai/cordis": "4.0.1",
  "@deepseek-ai/dsh-agent": "0.1.0-rc.5",
  "@deepseek-ai/dsh-llm": "0.1.0-rc.5",
  "@deepseek-ai/dsh-session": "0.1.0-rc.5",
  "@deepseek-ai/dsh-tools": "0.1.0-rc.5",
  "@deepseek-ai/dsh-user-approval": "0.1.0-rc.5",
});

const EXPECTED_RUNTIME_EXPORTS = Object.freeze([
  "DshAdapterError",
  "createDshRc5Adapter",
  "createDshRc5Plugin",
]);
const signal = new AbortController().signal;

function digest(value) {
  return `r1-005:${JSON.stringify(value)}`;
}

function isInside(parent, candidate) {
  const relation = relative(resolve(parent), resolve(candidate));
  return relation === "" || (!relation.startsWith(`..${sep}`) && relation !== "..");
}

function packagePath(root, name) {
  return resolve(root, "node_modules", ...name.split("/"), "package.json");
}

async function assertInstalledResolution() {
  const consumerRoot = resolve(process.cwd());
  const repositoryRoot = resolve(process.env.DSH_SAFE_REPOSITORY_ROOT ?? "");
  const harnessRoot = resolve(process.env.DSH_HARNESS_SOURCE_ROOT ?? "");
  assert(repositoryRoot !== consumerRoot, "consumer must not be the safe-runtime repository");
  assert(harnessRoot !== consumerRoot, "consumer must not be the Harness source checkout");
  assert(!isInside(repositoryRoot, consumerRoot), "consumer must be outside safe-runtime repository");
  assert(!isInside(harnessRoot, consumerRoot), "consumer must be outside Harness source checkout");

  const packageNames = ["@dsh-safe/adapter-dsh", "@dsh-safe/protocol", ...Object.keys(DIRECT_PEERS)];
  for (const name of packageNames) {
    const entryUrl = import.meta.resolve(name);
    const entryPath = fileURLToPath(entryUrl);
    assert(isInside(consumerRoot, entryPath), `${name} did not resolve from consumer tree: ${entryPath}`);
    assert(entryPath.includes(`${sep}node_modules${sep}`), `${name} did not resolve from node_modules`);
    assert(!isInside(repositoryRoot, entryPath), `${name} resolved from safe-runtime source tree`);
    assert(!isInside(harnessRoot, entryPath), `${name} resolved from Harness source tree`);
    assert(!entryPath.includes(`${sep}src${sep}`), `${name} resolved a source path: ${entryPath}`);
  }

  const adapterManifest = JSON.parse(await readFile(packagePath(consumerRoot, "@dsh-safe/adapter-dsh"), "utf8"));
  assert.equal(adapterManifest.name, "@dsh-safe/adapter-dsh");
  assert.equal(adapterManifest.version, "0.1.0-alpha.0");
  assert.equal(adapterManifest.private, undefined);
  assert.equal(adapterManifest.dependencies?.["@dsh-safe/protocol"], "0.1.0-alpha.0");
  for (const [name, version] of Object.entries(DIRECT_PEERS)) {
    assert.equal(adapterManifest.peerDependencies?.[name], version, `Adapter peer contract drifted for ${name}`);
    const installed = JSON.parse(await readFile(packagePath(consumerRoot, name), "utf8"));
    assert.equal(installed.name, name);
    assert.equal(installed.version, version, `installed direct peer version drifted for ${name}`);
  }

  const protocolManifest = JSON.parse(await readFile(packagePath(consumerRoot, "@dsh-safe/protocol"), "utf8"));
  assert.equal(protocolManifest.version, "0.1.0-alpha.0");

  assert.deepEqual(Object.keys(AdapterPackage).sort(), [...EXPECTED_RUNTIME_EXPORTS].sort());
  assert.equal(typeof createDshRc5Adapter, "function");
  assert.equal(typeof createDshRc5Plugin, "function");
  assert.equal(typeof DshAdapterError, "function");
}

async function createScope() {
  const root = new Context();
  let child;
  const scopeFiber = await root.plugin(function R1005ExternalConsumerScope(ctx) {
    child = ctx;
  });
  assert(child !== undefined, "Cordis child scope did not expose its Context");

  async function inject(dependencies) {
    let consumer;
    const handle = child.inject(dependencies, function R1005ExternalConsumerInjection(ctx) {
      consumer = ctx;
    });
    const fiber = await handle;
    assert(consumer !== undefined, "Cordis injection did not expose its Context");
    return { ctx: consumer, fiber };
  }

  return {
    root,
    ctx: child,
    scopeFiber,
    inject,
    async dispose() {
      await scopeFiber.dispose();
      assert.equal(scopeFiber.uid, null, "Cordis test scope did not reach terminal disposal");
    },
  };
}

async function setupTools(scope) {
  await scope.ctx.plugin(SystemPrompt);
  await scope.ctx.plugin(ToolRuntime);
  return (await scope.inject(["tools"])).ctx;
}

async function setupApproval(scope) {
  await scope.ctx.plugin(SessionStore);
  await scope.ctx.plugin(SystemPrompt);
  await scope.ctx.plugin(ApprovalService, { policy: "ask" });
  await scope.ctx.plugin(ToolRuntime);
  return (await scope.inject(["sessions", "approval", "tools"])).ctx;
}

function createOpenAgent(ctx, sessionRef) {
  const session = ctx.sessions.create(SessionId(sessionRef));
  session.append("turn/start", { turn: 1 });
  const inbox = new Inbox(session, {
    inserted() {},
    discarded() {},
    claimed() {},
  });
  return {
    session,
    agent: {
      id: session.id,
      options: {},
      session,
      inbox,
      status: "idle",
      ctx,
      cancel() {},
      async whenIdle() {},
      async runMaintenance(task) {
        return task(new AbortController().signal);
      },
      send() {},
      followup() {},
      steer() {},
      inject() {},
    },
  };
}

function registerStringTool(ctx, name, onBody) {
  return ctx.tools.register(defineTool({
    name,
    description: `R1-005 external consumer tool ${name}`,
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

async function executeTool(ctx, name, agent) {
  return ctx.tools.execute({
    signal,
    callId: CallId(`r1-005-${name}`),
    name,
    arguments: {},
    ...(agent === undefined ? {} : { agent }),
  });
}

async function smokeAllow() {
  const scope = await createScope();
  try {
    const ctx = await setupApproval(scope);
    let policyCalls = 0;
    let approvalCalls = 0;
    let bodyCalls = 0;
    ctx.on("approval/request", () => {
      approvalCalls += 1;
      return Promise.resolve("rejected");
    });
    registerStringTool(ctx, "r1_005_allow", () => { bodyCalls += 1; });
    const fiber = await ctx.plugin(createDshRc5Plugin({
      adapter: { digest },
      policy: {
        mode: "HANDLER",
        handler: () => {
          policyCalls += 1;
          return { kind: "ALLOW" };
        },
      },
    }));
    const result = await executeTool(ctx, "r1_005_allow");
    assert.equal(result.isError, false);
    assert.equal(policyCalls, 1);
    assert.equal(approvalCalls, 0);
    assert.equal(bodyCalls, 1);
    await fiber.dispose();
  } finally {
    await scope.dispose();
  }
}

async function smokeDeny() {
  const scope = await createScope();
  try {
    const ctx = await setupApproval(scope);
    let policyCalls = 0;
    let approvalCalls = 0;
    let bodyCalls = 0;
    ctx.on("approval/request", () => {
      approvalCalls += 1;
      return Promise.resolve("allowed-once");
    });
    registerStringTool(ctx, "r1_005_deny", () => { bodyCalls += 1; });
    const fiber = await ctx.plugin(createDshRc5Plugin({
      adapter: { digest },
      policy: {
        mode: "HANDLER",
        handler: () => {
          policyCalls += 1;
          return { kind: "DENY", reason: "external consumer deny" };
        },
      },
    }));
    const result = await executeTool(ctx, "r1_005_deny");
    assert.equal(result.isError, true);
    assert.equal(policyCalls, 1);
    assert.equal(approvalCalls, 0);
    assert.equal(bodyCalls, 0);
    await fiber.dispose();
  } finally {
    await scope.dispose();
  }
}

async function smokeAsk(outcome, expectedBodyCalls) {
  const scope = await createScope();
  try {
    const ctx = await setupApproval(scope);
    const { agent } = createOpenAgent(ctx, `r1-005-${outcome}`);
    let policyCalls = 0;
    let approvalCalls = 0;
    let bodyCalls = 0;
    ctx.on("approval/request", () => {
      approvalCalls += 1;
      return Promise.resolve(outcome);
    });
    const toolName = `r1_005_ask_${outcome.replaceAll("-", "_")}`;
    registerStringTool(ctx, toolName, () => { bodyCalls += 1; });
    const fiber = await ctx.plugin(createDshRc5Plugin({
      adapter: { digest },
      policy: {
        mode: "HANDLER",
        handler: () => {
          policyCalls += 1;
          return { kind: "ASK", reason: `external consumer ${outcome}` };
        },
      },
    }));
    const result = await executeTool(ctx, toolName, agent);
    assert.equal(policyCalls, 1);
    assert.equal(approvalCalls, 1);
    assert.equal(bodyCalls, expectedBodyCalls);
    assert.equal(result.isError, expectedBodyCalls === 0);
    await fiber.dispose();
  } finally {
    await scope.dispose();
  }
}

async function smokeDefaultDenyAndDisposal() {
  const scope = await createScope();
  try {
    const ctx = await setupTools(scope);
    let bodyCalls = 0;
    registerStringTool(ctx, "r1_005_default_deny", () => { bodyCalls += 1; });

    const fiber = await ctx.plugin(createDshRc5Plugin({ adapter: { digest } }));
    const denied = await executeTool(ctx, "r1_005_default_deny");
    assert.equal(denied.isError, true);
    assert.equal(bodyCalls, 0);

    await fiber.dispose();
    assert.equal(fiber.uid, null, "plugin Fiber did not reach terminal disposal");

    const afterDispose = await executeTool(ctx, "r1_005_default_deny");
    assert.equal(afterDispose.isError, false);
    assert.equal(bodyCalls, 1, "disposed plugin left a stale denial registration");

    const independentDispose = scope.root.on("session/event", () => {});
    independentDispose();
  } finally {
    await scope.dispose();
  }
}

async function smokeRequiredFeatures() {
  const scope = await createScope();
  try {
    const ctx = await setupApproval(scope);
    const adapter = createDshRc5Adapter(ctx, { digest });
    assert.equal(adapter.harnessVersion, "0.1.0-rc.5");
    assert.equal(adapter.harnessCommit, "47f943859bef60e4160492346772ded9b24f765a");
    assert.equal(adapter.features.toolsPreExecute, true);
    assert.equal(adapter.features.toolsMonotonicGuard, true);
    await adapter.dispose();
  } finally {
    await scope.dispose();
  }
}

await assertInstalledResolution();
await smokeAllow();
await smokeDeny();
await smokeAsk("allowed-once", 1);
await smokeAsk("rejected", 0);
await smokeAsk("cancelled", 0);
await smokeAsk("unavailable", 0);
await smokeDefaultDenyAndDisposal();
await smokeRequiredFeatures();

process.stdout.write("R1-005 installed Adapter external runtime smoke PASS.\n");
