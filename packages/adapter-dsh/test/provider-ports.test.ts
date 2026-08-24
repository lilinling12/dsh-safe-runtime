import { describe, expect, it } from "vitest";

import {
  createFilesystemPort,
  createSubprocessPort,
  DshAdapterError,
  type FilesystemProvider,
  type SubprocessProvider,
  type SubprocessProviderHandle,
  type SubprocessProviderSpawnSpec,
} from "../src/index.js";

interface FakeTarget {
  readonly targetKey: string;
  readonly displayPath: string;
  readonly internalPath: string;
}

function fakeFilesystem(): FilesystemProvider<FakeTarget> {
  const target = (path: string): FakeTarget => ({
    targetKey: `opaque:${path}`,
    displayPath: `workspace:${path}`,
    internalPath: `/execution${path}`,
  });

  return {
    async resolve(path) {
      return target(path);
    },
    async stat(resolved) {
      return {
        version: `version:${resolved.targetKey}`,
        type: "file",
        size: 7,
      };
    },
    contains(parent, child) {
      return child.internalPath.startsWith(parent.internalPath);
    },
    async readText(resolved) {
      return `read:${resolved.internalPath}`;
    },
    processPath(resolved) {
      return resolved.internalPath;
    },
  };
}

describe("operational filesystem port", () => {
  it("preserves provider identity as opaque data while retaining operational access", async () => {
    const port = createFilesystemPort(fakeFilesystem());
    const parent = await port.resolve("/workspace");
    const child = await port.resolve("/workspace/file.txt");

    expect(port.mediation).toBe("provider-service");
    expect(port.isolation).toBe("not-asserted");
    expect(child).toEqual({
      providerIdentity: "opaque:/workspace/file.txt",
      displayPath: "workspace:/workspace/file.txt",
    });
    expect(await port.stat(child)).toEqual({
      version: "version:opaque:/workspace/file.txt",
      type: "file",
      size: 7,
    });
    expect(port.contains(parent, child)).toBe(true);
    expect(await port.readText(child)).toBe("read:/execution/workspace/file.txt");
    expect(port.processPath(child)).toBe("/execution/workspace/file.txt");
  });

  it("rejects a caller-manufactured target instead of treating an opaque identity as a path", () => {
    const port = createFilesystemPort(fakeFilesystem());
    let failure: unknown;

    try {
      port.processPath({
        providerIdentity: "opaque:/guessed",
        displayPath: "workspace:/guessed",
      });
    } catch (error: unknown) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(DshAdapterError);
    expect(failure).toMatchObject({ code: "UNKNOWN_FILESYSTEM_TARGET" });
  });
});

function output(text: string) {
  return {
    readFrom(fromByte: number) {
      return {
        text: text.slice(fromByte),
        nextOffset: text.length,
        lossy: false,
      };
    },
  };
}

function fakeHandle(): SubprocessProviderHandle {
  return {
    pid: 42,
    collected: {
      stdout: output("stdout"),
      stderr: output("stderr"),
    },
    done: Promise.resolve({ exitCode: 0, signal: null }),
    terminate() {},
    async waitForExit() {
      return true;
    },
  };
}

describe("operational subprocess port", () => {
  it("maps a bounded collected-output request onto the provider spawn seam", async () => {
    let captured: SubprocessProviderSpawnSpec | undefined;
    const provider: SubprocessProvider<SubprocessProviderHandle> = {
      async resolveExecutable(command) {
        return `/bin/${command}`;
      },
      spawn(spec) {
        captured = spec;
        return fakeHandle();
      },
    };
    const port = createSubprocessPort(provider);

    expect(port.mediation).toBe("provider-service");
    expect(port.isolation).toBe("not-asserted");
    expect(port.executionWorld).toBe("shared-with-filesystem");
    expect(await port.resolveExecutable("node")).toBe("/bin/node");

    const execution = port.spawn({
      argv: ["/bin/node", "script.mjs"],
      cwd: "/workspace",
      env: { EXPLICIT: "yes" },
      graceMs: 1_000,
      stdin: "payload",
      stdoutMaxBytes: 4_096,
      stderrMaxBytes: 2_048,
    });

    expect(captured).toEqual({
      argv: ["/bin/node", "script.mjs"],
      cwd: "/workspace",
      stdio: {
        stdin: { data: "payload" },
        stdout: { maxBytes: 4_096 },
        stderr: { maxBytes: 2_048 },
      },
      graceMs: 1_000,
      env: { EXPLICIT: "yes" },
    });
    expect(execution.pid).toBe(42);
    expect(execution.readStdout(3)).toEqual({
      text: "out",
      nextOffset: 6,
      lossy: false,
    });
    expect(execution.readStderr(0).text).toBe("stderr");
    await expect(execution.done).resolves.toEqual({ exitCode: 0, signal: null });
    await expect(execution.waitForExit()).resolves.toBe(true);
  });

  it("fails closed when a provider violates the requested collected-output contract", () => {
    const provider: SubprocessProvider<SubprocessProviderHandle> = {
      async resolveExecutable(command) {
        return command;
      },
      spawn() {
        return {
          ...fakeHandle(),
          collected: {},
        };
      },
    };
    const port = createSubprocessPort(provider);

    expect(() => port.spawn({
      argv: ["node"],
      cwd: "/workspace",
      graceMs: 1_000,
      stdoutMaxBytes: 1_024,
      stderrMaxBytes: 1_024,
    })).toThrowError(expect.objectContaining({ code: "INCONSISTENT_PROVIDER_RESULT" }));
  });
});
