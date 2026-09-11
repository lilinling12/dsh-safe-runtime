#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { copyFile, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HARNESS_REPOSITORY = "https://github.com/deepseek-ai/deepseek-harness.git";
const HARNESS_COMMIT = "47f943859bef60e4160492346772ded9b24f765a";
const HARNESS_VERSION = "0.1.0-rc.5";
const PINNED_PNPM = "11.7.0";
const ADAPTER_NAME = "@dsh-safe/adapter-dsh";
const ADAPTER_VERSION = "0.1.0-alpha.0";
const PROTOCOL_NAME = "@dsh-safe/protocol";
const PROTOCOL_VERSION = "0.1.0-alpha.0";
const DIRECT_PEERS = Object.freeze({
  "@deepseek-ai/cordis": "4.0.1",
  "@deepseek-ai/dsh-agent": HARNESS_VERSION,
  "@deepseek-ai/dsh-llm": HARNESS_VERSION,
  "@deepseek-ai/dsh-session": HARNESS_VERSION,
  "@deepseek-ai/dsh-tools": HARNESS_VERSION,
  "@deepseek-ai/dsh-user-approval": HARNESS_VERSION,
});
const SMOKE_SOURCE = join(REPOSITORY_ROOT, "scripts", "r1-005-external-consumer-smoke.mjs");

function commandName(name) {
  if (process.platform !== "win32") return name;
  if (name === "pnpm") return "pnpm.cmd";
  if (name === "npm") return "npm.cmd";
  return name;
}

function safeEnvironment(overrides = {}) {
  const environment = { ...process.env, ...overrides };
  delete environment.NODE_PATH;
  delete environment.NODE_OPTIONS;
  delete environment.npm_config_user_agent;
  delete environment.NPM_CONFIG_USER_AGENT;
  return environment;
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(commandName(command), args, {
      cwd: options.cwd ?? REPOSITORY_ROOT,
      env: options.env ?? process.env,
      stdio: options.capture === true ? ["ignore", "pipe", "pipe"] : "inherit",
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    if (options.capture === true) {
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
    }
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code !== 0) {
        const status = signal === null ? `exit code ${code}` : `signal ${signal}`;
        reject(new Error(`${command} ${args.join(" ")} failed with ${status}${stderr.length === 0 ? "" : `\n${stderr}`}`));
        return;
      }
      resolvePromise({ stdout, stderr });
    });
  });
}

function isInside(parent, candidate) {
  const relation = relative(resolve(parent), resolve(candidate));
  return relation === "" || (!relation.startsWith(`..${sep}`) && relation !== "..");
}

async function oneTarball(directory, label) {
  const entries = (await readdir(directory)).filter((entry) => entry.endsWith(".tgz")).sort();
  assert.equal(entries.length, 1, `${label} produced ${entries.length} tarballs; expected exactly one`);
  return join(directory, entries[0]);
}

async function allTarballs(directory, label) {
  const entries = (await readdir(directory)).filter((entry) => entry.endsWith(".tgz")).sort();
  assert(entries.length > 0, `${label} produced no tarballs`);
  return entries.map((entry) => join(directory, entry));
}

async function sha256(path) {
  const bytes = await readFile(path);
  return createHash("sha256").update(bytes).digest("hex");
}

async function readPackedManifest(tarball) {
  const result = await run("tar", ["-xOf", tarball, "package/package.json"], { capture: true });
  return JSON.parse(result.stdout);
}

function dependencySummary(manifest) {
  return {
    dependencies: manifest.dependencies ?? {},
    optionalDependencies: manifest.optionalDependencies ?? {},
    peerDependencies: manifest.peerDependencies ?? {},
  };
}

function assertNoWorkspaceLocator(manifest, label) {
  const serialized = JSON.stringify(manifest);
  assert(!serialized.includes("workspace:"), `${label} packed manifest leaked a workspace: locator`);
}

async function auditTarball(tarball, sourceAuthority) {
  const manifest = await readPackedManifest(tarball);
  assert.equal(typeof manifest.name, "string", `${tarball} has no package name`);
  assert.equal(typeof manifest.version, "string", `${tarball} has no package version`);
  assertNoWorkspaceLocator(manifest, `${manifest.name}@${manifest.version}`);
  return {
    path: tarball,
    name: manifest.name,
    version: manifest.version,
    sourceAuthority,
    archive: basename(tarball),
    sha256: await sha256(tarball),
    dependencySummary: dependencySummary(manifest),
  };
}

function addArtifact(artifacts, artifact) {
  const existing = artifacts.get(artifact.name);
  if (existing !== undefined) {
    assert.equal(existing.version, artifact.version, `conflicting packed versions for ${artifact.name}`);
    assert.equal(existing.sha256, artifact.sha256, `duplicate packed identity has different bytes: ${artifact.name}`);
    return;
  }
  artifacts.set(artifact.name, artifact);
}

async function cloneExactHarness(harnessRoot) {
  await run("git", ["init", harnessRoot]);
  await run("git", ["remote", "add", "origin", HARNESS_REPOSITORY], { cwd: harnessRoot });
  await run("git", ["fetch", "--depth=1", "origin", HARNESS_COMMIT], { cwd: harnessRoot });
  await run("git", ["checkout", "--detach", "FETCH_HEAD"], { cwd: harnessRoot });
  const result = await run("git", ["rev-parse", "HEAD"], { cwd: harnessRoot, capture: true });
  assert.equal(result.stdout.trim(), HARNESS_COMMIT, "pinned Harness checkout drifted");
}

async function packSafeRuntimeArtifacts(temporaryRoot, safeRuntimeHead) {
  const protocolPack = join(temporaryRoot, "protocol-pack");
  const adapterPack = join(temporaryRoot, "adapter-pack");
  await mkdir(protocolPack, { recursive: true });
  await mkdir(adapterPack, { recursive: true });

  await run("pnpm", ["--filter", PROTOCOL_NAME, "build"]);
  await run("pnpm", ["--filter", PROTOCOL_NAME, "pack", "--pack-destination", protocolPack]);

  // R1-004 owns the publication graph and exact-source compile authority. R1-005
  // consumes that build path unchanged, then tests only the resulting archive.
  await run("pnpm", ["--filter", ADAPTER_NAME, "build"]);
  await run("pnpm", ["--filter", ADAPTER_NAME, "pack", "--pack-destination", adapterPack]);

  const protocolTarball = await oneTarball(protocolPack, "protocol pack");
  const adapterTarball = await oneTarball(adapterPack, "Adapter pack");
  const protocol = await auditTarball(protocolTarball, `safe-runtime@${safeRuntimeHead}`);
  const adapter = await auditTarball(adapterTarball, `safe-runtime@${safeRuntimeHead}`);

  assert.equal(protocol.name, PROTOCOL_NAME);
  assert.equal(protocol.version, PROTOCOL_VERSION);
  assert.equal(adapter.name, ADAPTER_NAME);
  assert.equal(adapter.version, ADAPTER_VERSION);
  const adapterManifest = await readPackedManifest(adapterTarball);
  assert.deepEqual(adapterManifest.peerDependencies, DIRECT_PEERS, "Adapter packed peer contract drifted");
  assert.equal(adapterManifest.dependencies?.[PROTOCOL_NAME], PROTOCOL_VERSION);
  for (const lifecycle of ["preinstall", "install", "postinstall"]) {
    assert.equal(adapterManifest.scripts?.[lifecycle], undefined, `Adapter install lifecycle is forbidden: ${lifecycle}`);
  }

  return { protocol, adapter };
}

async function packHarnessArtifacts(temporaryRoot, harnessRoot) {
  const dshPack = join(temporaryRoot, "harness-dsh-pack");
  const vendorPack = join(temporaryRoot, "harness-vendor-pack");
  const landlockPack = join(temporaryRoot, "harness-landlock-pack");
  await mkdir(dshPack, { recursive: true });
  await mkdir(vendorPack, { recursive: true });
  await mkdir(landlockPack, { recursive: true });

  await run("pnpm", ["install", "--frozen-lockfile"], { cwd: harnessRoot });
  await run("pnpm", ["run", "release:verify", "--family", "dsh"], {
    cwd: harnessRoot,
    env: safeEnvironment({ RELEASE_PUBLISH: "false" }),
  });
  await run("pnpm", ["run", "build"], { cwd: harnessRoot });
  await run("pnpm", ["run", "release:pack", "--family", "dsh", "--out", dshPack], { cwd: harnessRoot });
  await run("pnpm", ["run", "release:pack", "--family", "vendor", "--out", vendorPack], { cwd: harnessRoot });
  await run("pnpm", ["--dir", "native/landlock-run", "run", "build:ts"], { cwd: harnessRoot });
  await run("pnpm", [
    "--dir",
    "native/landlock-run/packages/entry",
    "pack",
    "--pack-destination",
    landlockPack,
  ], { cwd: harnessRoot });

  const artifacts = [];
  for (const [directory, label] of [
    [dshPack, "Harness dsh family"],
    [vendorPack, "Harness vendor family"],
    [landlockPack, "Harness Landlock entry"],
  ]) {
    for (const tarball of await allTarballs(directory, label)) {
      artifacts.push(await auditTarball(tarball, `deepseek-harness@${HARNESS_COMMIT}`));
    }
  }
  return artifacts;
}

async function installAndSmoke(temporaryRoot, harnessRoot, artifacts) {
  const consumerRoot = await mkdtemp(join(tmpdir(), "dsh-safe-r1-005-consumer-"));
  assert(!isInside(REPOSITORY_ROOT, consumerRoot), "consumer must be outside safe-runtime repository");
  assert(!isInside(harnessRoot, consumerRoot), "consumer must be outside Harness source checkout");

  try {
    const dependencies = Object.fromEntries(
      [...artifacts.values()]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((artifact) => [artifact.name, pathToFileURL(artifact.path).href]),
    );
    await writeFile(join(consumerRoot, "package.json"), `${JSON.stringify({
      name: "dsh-safe-r1-005-external-consumer",
      version: "0.0.0",
      private: true,
      type: "module",
      dependencies,
    }, null, 2)}\n`, "utf8");
    await copyFile(SMOKE_SOURCE, join(consumerRoot, "consumer-smoke.mjs"));

    const environment = safeEnvironment({
      DSH_SAFE_REPOSITORY_ROOT: REPOSITORY_ROOT,
      DSH_HARNESS_SOURCE_ROOT: harnessRoot,
      DSH_HOME: join(consumerRoot, ".dsh"),
      DSH_AGENTS_HOME: join(consumerRoot, ".agents"),
      DSH_TELEMETRY_DISABLED: "1",
    });

    // Preserve the exact packed manifests' install semantics. In particular,
    // R1-005 must not suppress upstream lifecycle scripts or optional runtime
    // dependencies merely to make the evidence environment easier to install.
    await run("npm", [
      "install",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
    ], { cwd: consumerRoot, env: environment });
    await run(process.execPath, ["consumer-smoke.mjs"], { cwd: consumerRoot, env: environment });
  } finally {
    await rm(consumerRoot, { recursive: true, force: true });
  }
}

async function main() {
  const pnpmVersion = await run("pnpm", ["--version"], { capture: true });
  assert.equal(pnpmVersion.stdout.trim(), PINNED_PNPM, `R1-005 requires pnpm ${PINNED_PNPM}`);
  const head = await run("git", ["rev-parse", "HEAD"], { capture: true });
  const safeRuntimeHead = head.stdout.trim();
  assert.match(safeRuntimeHead, /^[0-9a-f]{40}$/u, "safe-runtime exact head is not a commit SHA");

  const temporaryRoot = await mkdtemp(join(tmpdir(), "dsh-safe-r1-005-"));
  const harnessRoot = join(temporaryRoot, "deepseek-harness");
  try {
    await cloneExactHarness(harnessRoot);
    const safeRuntime = await packSafeRuntimeArtifacts(temporaryRoot, safeRuntimeHead);
    const harness = await packHarnessArtifacts(temporaryRoot, harnessRoot);

    const artifacts = new Map();
    addArtifact(artifacts, safeRuntime.protocol);
    addArtifact(artifacts, safeRuntime.adapter);
    for (const artifact of harness) addArtifact(artifacts, artifact);

    for (const [name, version] of Object.entries(DIRECT_PEERS)) {
      const artifact = artifacts.get(name);
      assert(artifact !== undefined, `exact peer tarball is missing from source bridge: ${name}`);
      assert.equal(artifact.version, version, `source bridge version drifted for ${name}`);
    }

    const provenance = [...artifacts.values()]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(({ path: _path, ...entry }) => entry);
    process.stdout.write(`${JSON.stringify({
      profile: "R1-005_EXTERNAL_TARBALL_CONSUMER_V1",
      safeRuntimeHead,
      harnessCommit: HARNESS_COMMIT,
      publicRegistryInstallVerified: false,
      packageCount: provenance.length,
      packages: provenance,
    }, null, 2)}\n`);

    await installAndSmoke(temporaryRoot, harnessRoot, artifacts);
    process.stdout.write(
      `R1-005 external tarball consumer PASS (${artifacts.size} local package artifacts, exact rc5 runtime).\n`,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
});