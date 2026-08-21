import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const protocolRoot = join(repositoryRoot, "packages", "protocol");
const testkitRoot = join(repositoryRoot, "packages", "testkit");
const packageCheckRoot = join(repositoryRoot, ".tmp", "testkit-package-check");
const protocolPackRoot = join(packageCheckRoot, "protocol");
const testkitPackRoot = join(packageCheckRoot, "testkit");
const pnpmExecutable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const tarExecutable = process.platform === "win32" ? "tar.exe" : "tar";

function fail(message) {
  throw new Error(`testkit package check: ${message}`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function command(args, options = {}) {
  try {
    return execFileSync(pnpmExecutable, args, {
      cwd: options.cwd ?? repositoryRoot,
      encoding: "utf8",
      env: options.env ?? process.env,
      stdio: options.capture === true ? ["ignore", "pipe", "pipe"] : "inherit",
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    if (error && typeof error === "object") {
      const stdout = "stdout" in error && typeof error.stdout === "string" ? error.stdout : "";
      const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr : "";
      if (stdout.length > 0) process.stderr.write(stdout);
      if (stderr.length > 0) process.stderr.write(stderr);
    }
    throw error;
  }
}

async function oneTarball(directory, label) {
  const entries = (await readdir(directory)).filter(name => name.endsWith(".tgz"));
  if (entries.length !== 1) fail(`${label} produced ${entries.length} tarballs; expected exactly one`);
  return join(directory, entries[0]);
}

function normalizedPackPath(path) {
  return path
    .replace(/^\.\//, "")
    .replace(/^package\//, "")
    .replaceAll("\\", "/");
}

function archivePaths(tarball) {
  let raw;
  try {
    raw = execFileSync(tarExecutable, ["-tzf", tarball], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    if (error && typeof error === "object") {
      const stdout = "stdout" in error && typeof error.stdout === "string" ? error.stdout : "";
      const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr : "";
      if (stdout.length > 0) process.stderr.write(stdout);
      if (stderr.length > 0) process.stderr.write(stderr);
    }
    throw error;
  }

  const paths = raw
    .split(/\r?\n/u)
    .map(path => path.trim())
    .filter(path => path.length > 0 && !path.endsWith("/"))
    .map(normalizedPackPath);
  if (paths.length === 0) fail("packed testkit archive exposed no files");
  return new Set(paths);
}

async function assertCanonicalAssets() {
  const rootManifest = JSON.parse(await readFile(join(repositoryRoot, "fixtures", "manifest.json"), "utf8"));
  const packageManifest = JSON.parse(await readFile(join(testkitRoot, "assets", "manifest.json"), "utf8"));
  if (!isRecord(rootManifest) || !Array.isArray(rootManifest.cases)) {
    fail("canonical fixture manifest is malformed");
  }
  if (!isRecord(packageManifest) || !Array.isArray(packageManifest.cases)) {
    fail("generated package manifest is malformed");
  }
  const expectedCases = rootManifest.cases.filter((entry) => {
    return isRecord(entry) && typeof entry.path === "string" && entry.path.startsWith("tck/");
  });
  assert.deepEqual(packageManifest, {
    apiVersion: rootManifest.apiVersion,
    cases: expectedCases,
  });

  const sourceSchema = await readFile(join(repositoryRoot, "schemas", "v1alpha1", "tck-fixture.schema.json"));
  const packedSchema = await readFile(join(testkitRoot, "assets", "schemas", "v1alpha1", "tck-fixture.schema.json"));
  assert.equal(Buffer.compare(sourceSchema, packedSchema), 0, "generated fixture schema diverged from canonical schema");

  for (const entry of expectedCases) {
    if (!isRecord(entry) || typeof entry.path !== "string") fail("unexpected canonical TCK case shape");
    const segments = entry.path.split("/");
    const source = await readFile(join(repositoryRoot, "fixtures", ...segments));
    const generated = await readFile(join(testkitRoot, "assets", ...segments));
    assert.equal(Buffer.compare(source, generated), 0, `generated fixture diverged: ${entry.path}`);
  }
  return expectedCases;
}

function assertPackPlan(paths, expectedCases) {
  const required = new Set([
    "package.json",
    "dist/index.js",
    "dist/index.d.ts",
    "assets/manifest.json",
    "assets/schemas/v1alpha1/tck-fixture.schema.json",
    ...expectedCases.map(entry => `assets/${entry.path}`),
  ]);
  for (const path of required) {
    assert(paths.has(path), `packed testkit is missing ${path}`);
  }
  for (const path of paths) {
    assert(!path.startsWith("src/"), `packed testkit leaked source file ${path}`);
    assert(!path.includes("source-conformance"), `packed testkit leaked conformance internal ${path}`);
    assert(!path.includes("node_modules/"), `packed testkit leaked node_modules content ${path}`);
    assert(!path.endsWith(".tsbuildinfo"), `packed testkit leaked build cache ${path}`);
    assert(!path.includes(".assets-staging-"), `packed testkit leaked staging asset ${path}`);
  }
}

async function writeConsumerCheck(consumerRoot) {
  const source = `
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { relative, resolve, sep } from "node:path";
import {
  parseAdapterDshTurnLifecycleFixture,
  runAdapterDshTurnLifecycleFixture,
  tckPackageAssetRootUrl,
  tckPackageFixtureSchemaUrl,
  tckPackageManifestUrl,
} from "@dsh-safe/testkit";

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function project(sessionRef, event) {
  const turnRef = \`\${sessionRef}/turn:\${event.data.turn}\`;
  switch (event.type) {
    case "turn/start":
      return { kind: "EVENT", event: { type: "turn.started", turnRef } };
    case "step/start":
      return {
        kind: "EVENT",
        event: {
          type: "step.started",
          turnRef,
          stepRef: \`\${turnRef}/step:\${event.data.step}\`,
        },
      };
    case "step/end":
      return { kind: "NO_EVENT" };
    case "turn/end":
      switch (event.data.reason.kind) {
        case "completed":
          return { kind: "EVENT", event: { type: "turn.ended", turnRef, status: "completed" } };
        case "aborted":
          return { kind: "EVENT", event: { type: "turn.ended", turnRef, status: "cancelled" } };
        case "blocked":
          return { kind: "EVENT", event: { type: "turn.ended", turnRef, status: "blocked" } };
        case "error":
        case "max-tokens":
        case "interrupted":
          return { kind: "EVENT", event: { type: "turn.ended", turnRef, status: "failed" } };
        default:
          return { kind: "ERROR", code: "UNSUPPORTED_HARNESS_TURN_END_REASON" };
      }
  }
}

async function walk(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = prefix.length === 0 ? entry.name : \`\${prefix}/\${entry.name}\`;
    if (entry.isDirectory()) {
      files.push(...await walk(resolve(directory, entry.name), path));
    } else {
      files.push(path);
    }
  }
  return files;
}

const repositoryRoot = resolve(process.env.DSH_SAFE_REPOSITORY_ROOT);
const entryUrl = import.meta.resolve("@dsh-safe/testkit");
const entryPath = fileURLToPath(entryUrl);
assert(entryPath.includes(\`\${sep}node_modules\${sep}\`), "testkit did not resolve from installed node_modules");
assert(!entryPath.startsWith(\`\${repositoryRoot}\${sep}\`), "testkit resolved from repository source tree");
assert(!entryPath.includes(\`\${sep}packages\${sep}testkit\${sep}src\${sep}\`), "testkit resolved a source path");

const assetRootUrl = tckPackageAssetRootUrl();
const packageRootUrl = new URL("../", entryUrl);
const packageRoot = fileURLToPath(packageRootUrl);
const assetRoot = fileURLToPath(assetRootUrl);
assert(relative(packageRoot, assetRoot).split(sep)[0] !== "..", "asset root escaped installed package");

const installedPackage = JSON.parse(await readFile(new URL("package.json", packageRootUrl), "utf8"));
assert.equal(installedPackage.private, undefined, "packed package must not remain private");
for (const specifier of Object.values(installedPackage.dependencies ?? {})) {
  assert.equal(typeof specifier, "string");
  assert(!specifier.startsWith("workspace:"), "packed manifest leaked a workspace dependency");
}

const manifest = JSON.parse(await readFile(tckPackageManifestUrl(), "utf8"));
assert(isRecord(manifest) && Array.isArray(manifest.cases) && manifest.cases.length > 0, "installed TCK manifest is empty");
const ids = new Set();
const paths = new Set();
for (const entry of manifest.cases) {
  assert(isRecord(entry) && typeof entry.id === "string" && typeof entry.path === "string", "installed manifest case is malformed");
  assert(!ids.has(entry.id), \`duplicate installed case id: \${entry.id}\`);
  assert(!paths.has(entry.path), \`duplicate installed case path: \${entry.path}\`);
  ids.add(entry.id);
  paths.add(entry.path);
  await readFile(new URL(entry.path, assetRootUrl));
}

const fixtureSchema = JSON.parse(await readFile(tckPackageFixtureSchemaUrl(), "utf8"));
assert.equal(fixtureSchema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(fixtureSchema.$id, "https://safe-runtime.dev/schema/v1alpha1/tck-fixture.schema.json");

const casePath = "tck/valid/adapter-dsh-turn-lifecycle-completed.json";
assert(paths.has(casePath), "installed manifest is missing the dummy-consumer fixture");
const fixtureValue = JSON.parse(await readFile(new URL(casePath, assetRootUrl), "utf8"));
const fixture = parseAdapterDshTurnLifecycleFixture(fixtureValue);

assert.deepEqual(
  await runAdapterDshTurnLifecycleFixture(fixture, project),
  { status: "PASS" },
  "external dummy implementation did not pass the portable TCK case",
);
assert.deepEqual(
  await runAdapterDshTurnLifecycleFixture(fixture, (sessionRef, event) => {
    if (event.type === "step/start") return { kind: "NO_EVENT" };
    return project(sessionRef, event);
  }),
  { status: "FAIL", code: "ADAPTER_DSH_TURN_LIFECYCLE_EVENTS_MISMATCH" },
  "external dummy mismatch did not produce FAIL",
);
assert.deepEqual(
  await runAdapterDshTurnLifecycleFixture(fixture, () => {
    throw new Error("dummy implementation failure");
  }),
  { status: "ERROR", code: "ADAPTER_DSH_TURN_LIFECYCLE_IMPLEMENTATION_ERROR" },
  "external dummy throw did not produce ERROR",
);

const installedFiles = await walk(packageRoot);
for (const path of installedFiles) {
  assert(!path.startsWith("src/"), \`installed package leaked source file \${path}\`);
  assert(!path.includes("source-conformance"), \`installed package leaked conformance internal \${path}\`);
  assert(!path.endsWith(".tsbuildinfo"), \`installed package leaked build cache \${path}\`);
  assert(!path.includes(".assets-staging-"), \`installed package leaked staging file \${path}\`);
  assert(!/\\.test\\.[cm]?[jt]s$/.test(path), \`installed package leaked test source \${path}\`);
}

console.log(\`External dummy consumer passed \${manifest.cases.length} installed TCK asset checks.\`);
`;
  await writeFile(join(consumerRoot, "consumer-check.mjs"), source.trimStart(), "utf8");
}

async function runPackageCheck() {
  await rm(packageCheckRoot, { recursive: true, force: true });
  await mkdir(protocolPackRoot, { recursive: true });
  await mkdir(testkitPackRoot, { recursive: true });

  command(["run", "build"], { cwd: protocolRoot });
  command(["pack", "--pack-destination", protocolPackRoot], { cwd: protocolRoot });
  command(["pack", "--pack-destination", testkitPackRoot], { cwd: testkitRoot });

  const protocolTarball = await oneTarball(protocolPackRoot, "protocol pack");
  const testkitTarball = await oneTarball(testkitPackRoot, "testkit pack");
  const expectedCases = await assertCanonicalAssets();
  assertPackPlan(archivePaths(testkitTarball), expectedCases);

  const consumerRoot = await mkdtemp(join(tmpdir(), "dsh-safe-tck-consumer-"));
  try {
    await copyFile(protocolTarball, join(consumerRoot, "protocol.tgz"));
    await copyFile(testkitTarball, join(consumerRoot, "testkit.tgz"));
    await writeFile(
      join(consumerRoot, "package.json"),
      `${JSON.stringify({
        name: "dsh-safe-tck-dummy-consumer",
        version: "0.0.0",
        private: true,
        type: "module",
        dependencies: {
          "@dsh-safe/protocol": "file:./protocol.tgz",
          "@dsh-safe/testkit": "file:./testkit.tgz",
        },
      }, null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      join(consumerRoot, "pnpm-workspace.yaml"),
      "overrides:\n  '@dsh-safe/protocol': 'file:./protocol.tgz'\n",
      "utf8",
    );
    await writeConsumerCheck(consumerRoot);
    command(
      ["install", "--offline", "--ignore-scripts", "--lockfile=false"],
      { cwd: consumerRoot },
    );
    execFileSync(process.execPath, ["consumer-check.mjs"], {
      cwd: consumerRoot,
      env: { ...process.env, DSH_SAFE_REPOSITORY_ROOT: repositoryRoot },
      stdio: "inherit",
    });
  } finally {
    await rm(consumerRoot, { recursive: true, force: true });
  }

  console.log("Packed @dsh-safe/testkit artifact and external dummy consumer: OK");
}

await runPackageCheck();
