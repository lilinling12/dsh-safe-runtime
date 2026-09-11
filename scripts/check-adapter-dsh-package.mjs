#!/usr/bin/env node

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const PACKAGE_NAME = "@dsh-safe/adapter-dsh";
const EXPECTED_VERSION = "0.1.0-alpha.0";
const EXPECTED_ENGINE = "^22.19.0 || >=24.0.0";
const EXPECTED_RUNTIME_EXPORTS = [
  "DshAdapterError",
  "createDshRc5Adapter",
  "createDshRc5Plugin",
];
const EXPECTED_PEERS = {
  "@deepseek-ai/cordis": "4.0.1",
  "@deepseek-ai/dsh-agent": "0.1.0-rc.5",
  "@deepseek-ai/dsh-llm": "0.1.0-rc.5",
  "@deepseek-ai/dsh-session": "0.1.0-rc.5",
  "@deepseek-ai/dsh-tools": "0.1.0-rc.5",
  "@deepseek-ai/dsh-user-approval": "0.1.0-rc.5",
};

function commandName(name) {
  return process.platform === "win32" && name === "pnpm" ? "pnpm.cmd" : name;
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(commandName(command), args, {
      cwd: options.cwd ?? ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code !== 0) {
        reject(new Error(
          `${command} ${args.join(" ")} failed with ${signal === null ? `exit code ${code}` : `signal ${signal}`}\n${stderr}`,
        ));
        return;
      }
      resolvePromise({ stdout, stderr });
    });
  });
}

function fail(message) {
  throw new Error(message);
}

async function assertRuntimeRoot() {
  const entry = resolve(ROOT, "packages/adapter-dsh/dist/index.js");
  const module = await import(`${pathToFileURL(entry).href}?audit=${Date.now()}`);
  const actual = Object.keys(module).sort();
  const expected = [...EXPECTED_RUNTIME_EXPORTS].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`unexpected built runtime export surface: ${JSON.stringify(actual)}`);
  }
}

function auditManifest(manifest) {
  if (manifest.name !== PACKAGE_NAME) fail(`unexpected package name: ${manifest.name}`);
  if (manifest.version !== EXPECTED_VERSION) fail(`unexpected package version: ${manifest.version}`);
  if ("private" in manifest) fail("packed manifest must not contain private");
  if (manifest.type !== "module") fail(`unexpected module type: ${manifest.type}`);
  if (manifest.license !== "MIT") fail(`unexpected license: ${manifest.license}`);
  if (manifest.engines?.node !== EXPECTED_ENGINE) fail(`unexpected Node engine: ${manifest.engines?.node}`);
  if (typeof manifest.description !== "string" || manifest.description.length === 0) fail("description is required");
  if (manifest.repository?.url !== "git+https://github.com/lilinling12/dsh-safe-runtime.git") fail("repository URL drifted");
  if (manifest.repository?.directory !== "packages/adapter-dsh") fail("repository directory drifted");
  if (!Array.isArray(manifest.keywords) || manifest.keywords.length === 0) fail("focused keywords are required");

  const exportKeys = Object.keys(manifest.exports ?? {});
  if (JSON.stringify(exportKeys) !== JSON.stringify(["."])) fail(`unexpected public subpaths: ${JSON.stringify(exportKeys)}`);
  if (manifest.exports?.["."]?.types !== "./dist/index.d.ts") fail("declaration export target drifted");
  if (manifest.exports?.["."]?.import !== "./dist/index.js") fail("ESM export target drifted");
  if (JSON.stringify(manifest.files) !== JSON.stringify(["dist"])) fail(`unexpected files allowlist: ${JSON.stringify(manifest.files)}`);

  if (JSON.stringify(manifest.peerDependencies) !== JSON.stringify(EXPECTED_PEERS)) {
    fail(`peer baseline drifted: ${JSON.stringify(manifest.peerDependencies)}`);
  }
  const protocol = manifest.dependencies?.["@dsh-safe/protocol"];
  if (typeof protocol !== "string" || protocol.length === 0 || protocol.startsWith("workspace:")) {
    fail(`packed protocol dependency is not registry-installable: ${protocol}`);
  }
  for (const name of ["preinstall", "install", "postinstall"]) {
    if (manifest.scripts?.[name] !== undefined) fail(`install-time script is forbidden: ${name}`);
  }
}

function auditFiles(files) {
  const required = [
    "package/package.json",
    "package/dist/index.js",
    "package/dist/index.d.ts",
  ];
  for (const file of required) {
    if (!files.includes(file)) fail(`missing packed file: ${file}`);
  }

  const forbidden = [
    /^package\/src\//,
    /^package\/source-conformance\//,
    /^package\/fixtures\//,
    /^package\/coverage\//,
    /^package\/node_modules\//,
    /^package\/.github\//,
    /(?:^|\/)\.env(?:\.|$)/,
    /\.tsbuildinfo$/,
    /(?:^|\/)(?:credentials?|secrets?|tokens?|private[-_]?keys?)(?:\.|\/|$)/i,
    /\.log$/i,
  ];
  for (const file of files) {
    for (const pattern of forbidden) {
      if (pattern.test(file)) fail(`forbidden packed content: ${file}`);
    }
  }
}

async function main() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "dsh-safe-adapter-pack-"));
  try {
    await run("pnpm", ["--filter", PACKAGE_NAME, "build"]);
    await assertRuntimeRoot();

    const packResult = await run("pnpm", [
      "--filter",
      PACKAGE_NAME,
      "pack",
      "--pack-destination",
      temporaryRoot,
    ]);
    const candidates = packResult.stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.endsWith(".tgz"));
    if (candidates.length !== 1) fail(`expected one tarball path, received ${JSON.stringify(candidates)}`);

    const tarball = resolve(ROOT, candidates[0]);
    if (!basename(tarball).endsWith(".tgz")) fail(`unexpected tarball path: ${tarball}`);
    const listResult = await run("tar", ["-tzf", tarball]);
    const files = listResult.stdout.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).sort();
    auditFiles(files);

    const manifestResult = await run("tar", ["-xOf", tarball, "package/package.json"]);
    auditManifest(JSON.parse(manifestResult.stdout));

    process.stdout.write(`R1-004 Adapter package audit PASS (${files.length} packed files).\n`);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
});
