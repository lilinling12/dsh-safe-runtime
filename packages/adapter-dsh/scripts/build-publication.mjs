#!/usr/bin/env node

import { lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import {
  discoverScopedPackages,
  projectScopedPackages,
} from "./project-pinned-harness-workspace.mjs";

const HARNESS_REPOSITORY = "https://github.com/deepseek-ai/deepseek-harness.git";
const HARNESS_COMMIT = "47f943859bef60e4160492346772ded9b24f765a";
const PINNED_PNPM = "11.7.0";
const DEEPSEEK_SCOPE = "@deepseek-ai";
const EXPECTED_RUNTIME_EXPORTS = [
  "DshAdapterError",
  "createDshRc5Adapter",
  "createDshRc5Plugin",
];

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const adapterDirectory = resolve(scriptDirectory, "..");
const repositoryRoot = resolve(adapterDirectory, "../..");
const protocolDirectory = resolve(repositoryRoot, "packages/protocol");
const projectionScopeDirectory = resolve(repositoryRoot, "node_modules", DEEPSEEK_SCOPE);

function commandName(name) {
  return process.platform === "win32" && name === "pnpm" ? "pnpm.cmd" : name;
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(commandName(command), args, {
      cwd: options.cwd ?? repositoryRoot,
      env: process.env,
      stdio: options.capture ? ["ignore", "pipe", "inherit"] : "inherit",
      shell: false,
    });

    let stdout = "";
    if (options.capture && child.stdout !== null) {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
    }

    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code !== 0) {
        reject(new Error(
          `${command} ${args.join(" ")} failed with ${signal === null ? `exit code ${code}` : `signal ${signal}`}`,
        ));
        return;
      }
      resolvePromise(stdout.trim());
    });
  });
}

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function removeOwnedProjection(ownedProjection) {
  for (const entry of ownedProjection.reverse()) {
    if (!(await exists(entry.destination))) continue;
    const actual = await realpath(entry.destination);
    if (actual !== entry.source) {
      throw new Error(
        `refusing to clean projection ${entry.destination}; it no longer resolves to exact pinned source ${entry.source}`,
      );
    }
    await rm(entry.destination, { recursive: true, force: false });
  }
}

async function assertRuntimeRoot() {
  const entry = resolve(adapterDirectory, "dist/index.js");
  const declaration = resolve(adapterDirectory, "dist/index.d.ts");
  if (!(await exists(entry))) throw new Error("publication build did not emit dist/index.js");
  if (!(await exists(declaration))) throw new Error("publication build did not emit dist/index.d.ts");

  const module = await import(`${pathToFileURL(entry).href}?build=${Date.now()}`);
  const actual = Object.keys(module).sort();
  const expected = [...EXPECTED_RUNTIME_EXPORTS].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`unexpected built runtime export surface: ${JSON.stringify(actual)}`);
  }
}

async function main() {
  const pnpmVersion = await run("pnpm", ["--version"], { capture: true });
  if (pnpmVersion !== PINNED_PNPM) {
    throw new Error(`publication build requires pnpm ${PINNED_PNPM}, received ${pnpmVersion}`);
  }

  const temporaryRoot = await mkdtemp(join(tmpdir(), "dsh-safe-r1-004-"));
  const harnessRoot = join(temporaryRoot, "deepseek-harness");
  const ownedProjection = [];

  try {
    await run("git", ["init", harnessRoot]);
    await run("git", ["remote", "add", "origin", HARNESS_REPOSITORY], { cwd: harnessRoot });
    await run("git", ["fetch", "--depth=1", "origin", HARNESS_COMMIT], { cwd: harnessRoot });
    await run("git", ["checkout", "--detach", "FETCH_HEAD"], { cwd: harnessRoot });

    const checkedOutCommit = await run("git", ["rev-parse", "HEAD"], {
      cwd: harnessRoot,
      capture: true,
    });
    if (checkedOutCommit !== HARNESS_COMMIT) {
      throw new Error(`pinned Harness checkout drifted to ${checkedOutCommit}`);
    }

    // The registry no longer resolves the exact rc5 package coordinate used by
    // the accepted Adapter baseline. Build types from the exact upstream source
    // commit instead of silently broadening compatibility to a newer release.
    await run("pnpm", ["install", "--frozen-lockfile"], { cwd: harnessRoot });
    await run("pnpm", ["run", "build:lib:host"], { cwd: harnessRoot });

    const packages = await discoverScopedPackages(harnessRoot, { scope: DEEPSEEK_SCOPE });
    for (const pkg of packages) {
      const destination = join(projectionScopeDirectory, pkg.leaf);
      if (!(await exists(destination))) {
        ownedProjection.push({ destination, source: pkg.directory });
      }
    }

    await projectScopedPackages({
      sourceRoot: harnessRoot,
      consumerRoots: [repositoryRoot],
      scope: DEEPSEEK_SCOPE,
    });

    await run("pnpm", ["--filter", "@dsh-safe/protocol", "build"], {
      cwd: protocolDirectory,
    });
    await rm(resolve(adapterDirectory, "dist"), { recursive: true, force: true });
    await run("pnpm", [
      "--filter",
      "@dsh-safe/adapter-dsh",
      "exec",
      "tsc",
      "-p",
      "tsconfig.publish.json",
    ]);
    await assertRuntimeRoot();
  } finally {
    await removeOwnedProjection(ownedProjection);
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
});
