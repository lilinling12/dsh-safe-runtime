import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Context } from "@deepseek-ai/cordis";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";

import { createDshRc5Adapter } from "../src/binding.js";
import {
  createHarnessTestScope,
  type HarnessTestScope,
} from "./harness-runtime.js";

const EXPECTED_BYTES = Buffer.from("m4-050-benign-direct-host-fs-witness\n", "utf8");

type BoundaryClassification =
  | "EXPECTED_UNGOVERNED"
  | "ENVIRONMENT_UNSUPPORTED"
  | "INVALID_EVIDENCE";

interface DirectHostFsEvidence {
  readonly sentinelExistsBefore: boolean;
  readonly directHostMutationAttempted: boolean;
  readonly directHostMutationSucceeded: boolean;
  readonly sentinelBytesAfter: Buffer;
  readonly rawPreExecuteCalls: number;
  readonly safeRuntimePolicyCalls: number;
  readonly safeRuntimeGuardCalls: number;
  readonly toolBodyCalls: number;
  readonly toolResultCalls: number;
}

function digest(value: unknown): string {
  return `m4-050:${JSON.stringify(value)}`;
}

function classifyBoundary(evidence: DirectHostFsEvidence): BoundaryClassification {
  const exactBytes = evidence.sentinelBytesAfter.equals(EXPECTED_BYTES);
  const bypassedToolRuntime =
    evidence.rawPreExecuteCalls === 0
    && evidence.safeRuntimePolicyCalls === 0
    && evidence.safeRuntimeGuardCalls === 0
    && evidence.toolBodyCalls === 0
    && evidence.toolResultCalls === 0;

  return !evidence.sentinelExistsBefore
    && evidence.directHostMutationAttempted
    && evidence.directHostMutationSucceeded
    && exactBytes
    && bypassedToolRuntime
    ? "EXPECTED_UNGOVERNED"
    : "INVALID_EVIDENCE";
}

async function setupTools(harness: HarnessTestScope) {
  await harness.ctx.plugin(SystemPrompt);
  await harness.ctx.plugin(ToolRuntime);
  const ctx = await harness.inject(["tools"]);
  return { ctx, adapter: createDshRc5Adapter(ctx, { digest }) };
}

function registerWitnessTool(ctx: Context, onBody: () => void): void {
  ctx.tools.register(defineTool({
    name: "m4_050_control_surface_witness",
    description: "M4-050 control-surface witness; the direct host write must not execute this tool",
    parameters: {},
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }],
    },
    async execute() {
      onBody();
      return "unexpected tool execution";
    },
  }));
}

async function sentinelExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("M4-050 pinned rc5 direct host filesystem negative boundary", () => {
  let harness: HarnessTestScope;
  const roots = new Set<string>();

  beforeEach(async () => {
    harness = await createHarnessTestScope();
  });

  afterEach(async () => {
    await harness.dispose();
    await Promise.all(Array.from(roots, async (root) => {
      await rm(root, { recursive: true, force: true });
      roots.delete(root);
    }));
  });

  it("proves one benign direct node:fs mutation is EXPECTED_UNGOVERNED rather than a governed tool decision", async () => {
    const { ctx, adapter } = await setupTools(harness);
    const root = await mkdtemp(join(tmpdir(), "dsh-m4-050-"));
    roots.add(root);
    const sentinel = join(root, "sentinel.txt");

    let rawPreExecuteCalls = 0;
    let safeRuntimePolicyCalls = 0;
    let safeRuntimeGuardCalls = 0;
    let toolBodyCalls = 0;
    let toolResultCalls = 0;

    registerWitnessTool(ctx, () => { toolBodyCalls += 1; });

    ctx.on("tools/pre-execute", async (_exec, next) => {
      rawPreExecuteCalls += 1;
      return next();
    });
    ctx.on("tools/result", () => {
      toolResultCalls += 1;
    });

    adapter.registerToolPolicy(() => {
      safeRuntimePolicyCalls += 1;
      return { kind: "DENY", reason: "M4-050 policy must not be reached by direct host fs" };
    });
    adapter.registerMonotonicToolGuard?.(() => {
      safeRuntimeGuardCalls += 1;
      return { kind: "DENY", reason: "M4-050 guard must not be reached by direct host fs" };
    });

    const before = await sentinelExists(sentinel);

    // This is intentionally the measured bypass: a host-privileged Node API call,
    // not ctx.tools.execute(), an Adapter filesystem port, or a subprocess.
    let directHostMutationSucceeded = false;
    await writeFile(sentinel, EXPECTED_BYTES, { flag: "wx" });
    directHostMutationSucceeded = true;

    const after = await readFile(sentinel);
    const evidence: DirectHostFsEvidence = Object.freeze({
      sentinelExistsBefore: before,
      directHostMutationAttempted: true,
      directHostMutationSucceeded,
      sentinelBytesAfter: after,
      rawPreExecuteCalls,
      safeRuntimePolicyCalls,
      safeRuntimeGuardCalls,
      toolBodyCalls,
      toolResultCalls,
    });

    expect(evidence.sentinelExistsBefore).toBe(false);
    expect(evidence.directHostMutationSucceeded).toBe(true);
    expect(evidence.sentinelBytesAfter).toEqual(EXPECTED_BYTES);
    expect(evidence.rawPreExecuteCalls).toBe(0);
    expect(evidence.safeRuntimePolicyCalls).toBe(0);
    expect(evidence.safeRuntimeGuardCalls).toBe(0);
    expect(evidence.toolBodyCalls).toBe(0);
    expect(evidence.toolResultCalls).toBe(0);
    expect(classifyBoundary(evidence)).toBe("EXPECTED_UNGOVERNED");
  });

  it("fails classification when provenance or ToolRuntime non-participation evidence is contradictory", () => {
    const baseline: DirectHostFsEvidence = {
      sentinelExistsBefore: false,
      directHostMutationAttempted: true,
      directHostMutationSucceeded: true,
      sentinelBytesAfter: Buffer.from(EXPECTED_BYTES),
      rawPreExecuteCalls: 0,
      safeRuntimePolicyCalls: 0,
      safeRuntimeGuardCalls: 0,
      toolBodyCalls: 0,
      toolResultCalls: 0,
    };

    expect(classifyBoundary({ ...baseline, sentinelExistsBefore: true }))
      .toBe("INVALID_EVIDENCE");
    expect(classifyBoundary({ ...baseline, sentinelBytesAfter: Buffer.from("different", "utf8") }))
      .toBe("INVALID_EVIDENCE");
    expect(classifyBoundary({ ...baseline, safeRuntimeGuardCalls: 1 }))
      .toBe("INVALID_EVIDENCE");
    expect(classifyBoundary({ ...baseline, toolResultCalls: 1 }))
      .toBe("INVALID_EVIDENCE");
  });
});
