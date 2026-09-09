import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFile, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageCheckRoot = join(repositoryRoot, ".tmp", "testkit-package-check");
const protocolRoot = join(repositoryRoot, "packages", "protocol");
const testkitRoot = join(repositoryRoot, "packages", "testkit");
const protocolPackRoot = join(packageCheckRoot, "protocol");
const testkitPackRoot = join(packageCheckRoot, "testkit");
const pnpmExecutable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";

function fail(message) {
  throw new Error(`testkit package check: ${message}`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: repositoryRoot,
    stdio: "inherit",
    ...options,
  });
}

function parseOctal(buffer, start, length) {
  const raw = buffer.subarray(start, start + length).toString("utf8").replace(/\0.*$/u, "").trim();
  return raw.length === 0 ? 0 : Number.parseInt(raw, 8);
}

function archivePaths(tarballPath) {
  const archive = gunzipSync(requireFile(tarballPath));
  const paths = new Set();
  let offset = 0;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/u, "");
    const prefix = header.subarray(345, 500).toString("utf8").replace(/\0.*$/u, "");
    const path = prefix.length === 0 ? name : `${prefix}/${name}`;
    const normalized = path.startsWith("package/") ? path.slice("package/".length) : path;
    if (normalized.length > 0) paths.add(normalized);
    const size = parseOctal(header, 124, 12);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return paths;
}

function requireFile(path) {
  return execFileSync(process.execPath, ["-e", "process.stdout.write(require('node:fs').readFileSync(process.argv[1]))", path]);
}

async function walk(root, base = root) {
  const entries = await readdir(root, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  const paths = new Set();
  for (const entry of entries) {
    const absolute = join(root, entry.name);
    const rel = relative(base, absolute).split(sep).join("/");
    if (entry.isDirectory()) {
      paths.add(`${rel}/`);
      const nested = await walk(absolute, base);
      for (const path of nested) paths.add(path);
    } else if (entry.isFile()) {
      paths.add(rel);
    }
  }
  return paths;
}

async function oneTarball(directory, label) {
  const files = (await readdir(directory)).filter(file => file.endsWith(".tgz"));
  assert.equal(files.length, 1, `${label} must produce exactly one tarball`);
  return join(directory, files[0]);
}

async function assertCanonicalAssets() {
  const testkitRoot = join(repositoryRoot, "packages", "testkit");
  const canonicalManifest = JSON.parse(await readFile(join(repositoryRoot, "fixtures", "manifest.json"), "utf8"));
  if (!isRecord(canonicalManifest) || !Array.isArray(canonicalManifest.cases)) {
    fail("canonical fixture manifest has unexpected shape");
  }
  const expectedCases = canonicalManifest.cases.filter(
    entry => isRecord(entry) && typeof entry.path === "string" && entry.path.startsWith("tck/"),
  );
  const generatedManifest = JSON.parse(await readFile(join(testkitRoot, "assets", "manifest.json"), "utf8"));
  if (!isRecord(generatedManifest) || !Array.isArray(generatedManifest.cases)) {
    fail("generated testkit manifest has unexpected shape");
  }
  assert.deepEqual(generatedManifest.cases, expectedCases, "generated testkit manifest diverged from canonical TCK cases");

  const sourceSchema = await readFile(join(repositoryRoot, "schemas", "v1alpha1", "tck-fixture.schema.json"));
  const generatedSchema = await readFile(join(testkitRoot, "assets", "schemas", "v1alpha1", "tck-fixture.schema.json"));
  assert.equal(Buffer.compare(sourceSchema, generatedSchema), 0, "generated fixture schema diverged from canonical schema");

  for (const entry of expectedCases) {
    if (!isRecord(entry) || typeof entry.path !== "string") fail("unexpected canonical TCK case shape");
    const segments = entry.path.split("/");
    const source = await readFile(join(repositoryRoot, "fixtures", ...segments));
    const generated = await readFile(join(testkitRoot, "assets", ...segments));
    assert.equal(Buffer.compare(source, generated), 0, `generated fixture diverged: ${entry.path}`);
  }
  return expectedCases;
}

function assertPackedArtifact(paths, expectedCases) {
  const required = new Set([
    "package.json",
    "dist/index.js",
    "dist/index.d.ts",
    "assets/manifest.json",
    "assets/schemas/v1alpha1/tck-fixture.schema.json",
    ...expectedCases.map(entry => `assets/${entry.path}`),
  ]);
  for (const path of required) assert(paths.has(path), `packed testkit is missing ${path}`);
  for (const path of paths) {
    assert(!path.startsWith("src/"), `packed testkit leaked source file ${path}`);
    assert(!path.includes("source-conformance"), `packed testkit leaked conformance internal ${path}`);
    assert(!path.includes("node_modules/"), `packed testkit leaked node_modules content ${path}`);
    assert(!path.endsWith(".tsbuildinfo"), `packed testkit leaked build cache ${path}`);
    assert(!path.includes(".assets-staging-"), `packed testkit leaked staging asset ${path}`);
    assert(!/\.test\.[cm]?[jt]s$/u.test(path), `packed testkit leaked test source ${path}`);
  }
}

async function writeConsumerCheck(consumerRoot) {
  const source = String.raw`
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
  const turnRef = sessionRef + "/turn:" + event.data.turn;
  switch (event.type) {
    case "turn/start":
      return { kind: "EVENT", event: { type: "turn.started", turnRef } };
    case "step/start":
      return {
        kind: "EVENT",
        event: {
          type: "step.started",
          stepRef: turnRef + "/step:" + event.data.step,
          turnRef,
        },
      };
    case "turn/end":
      return { kind: "EVENT", event: { type: "turn.ended", turnRef, outcome: event.data.outcome } };
    default:
      return { kind: "NO_EVENT" };
  }
}

const packageRoot = resolve(fileURLToPath(new URL(".", import.meta.resolve("@dsh-safe/testkit"))), "..");
const manifestUrl = tckPackageManifestUrl();
const schemaUrl = tckPackageFixtureSchemaUrl();
const assetRootUrl = tckPackageAssetRootUrl();
assert.equal(manifestUrl.protocol, "file:");
assert.equal(schemaUrl.protocol, "file:");
assert.equal(assetRootUrl.protocol, "file:");
assert.equal(resolve(fileURLToPath(assetRootUrl)), resolve(packageRoot, "assets"));

const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
const schema = JSON.parse(await readFile(schemaUrl, "utf8"));
assert.equal(manifest.apiVersion, "safe-runtime.dev/test-fixtures/v1alpha1");
assert.equal(schema.$id, "https://safe-runtime.dev/schemas/v1alpha1/tck-fixture.schema.json");
assert.equal(manifest.cases.length, 44);

const paths = new Set();
async function walk(root, base = root) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const absolute = resolve(root, entry.name);
    const path = relative(base, absolute).split(sep).join("/");
    if (entry.isDirectory()) {
      paths.add(path + "/");
      await walk(absolute, base);
    } else if (entry.isFile()) {
      paths.add(path);
    }
  }
}
await walk(fileURLToPath(assetRootUrl));
for (const entry of manifest.cases) assert(paths.has(entry.path), "installed asset missing: " + entry.path);

const casePath = "tck/valid/adapter-dsh-turn-lifecycle-completed.json";
assert(paths.has(casePath), "installed manifest is missing the dummy-consumer fixture");
const fixtureValue = JSON.parse(await readFile(new URL(casePath, assetRootUrl), "utf8"));
const fixture = parseAdapterDshTurnLifecycleFixture(fixtureValue);
assert.deepEqual(await runAdapterDshTurnLifecycleFixture(fixture, project), { status: "PASS" });
assert.deepEqual(
  await runAdapterDshTurnLifecycleFixture(fixture, (sessionRef, event) => event.type === "step/start" ? { kind: "NO_EVENT" } : project(sessionRef, event)),
  { status: "FAIL", code: "ADAPTER_DSH_TURN_LIFECYCLE_EVENTS_MISMATCH" },
);
assert.deepEqual(
  await runAdapterDshTurnLifecycleFixture(fixture, () => { throw new Error("dummy implementation failure"); }),
  { status: "ERROR", code: "ADAPTER_DSH_TURN_LIFECYCLE_IMPLEMENTATION_ERROR" },
);

const installedFiles = await walk(packageRoot);
for (const path of installedFiles) {
  assert(!path.startsWith("src/"), "installed package leaked source file " + path);
  assert(!path.includes("source-conformance"), "installed package leaked conformance internal " + path);
  assert(!path.endsWith(".tsbuildinfo"), "installed package leaked build cache " + path);
  assert(!path.includes(".assets-staging-"), "installed package leaked staging file " + path);
  assert(!/\.test\.[cm]?[jt]s$/.test(path), "installed package leaked test source " + path);
}
console.log("External dummy consumer passed " + manifest.cases.length + " installed TCK asset checks.");
`;
  await writeFile(join(consumerRoot, "consumer-check.mjs"), source.trimStart(), "utf8");
}

async function runPackageCheck() {
  await rm(packageCheckRoot, { recursive: true, force: true });
  await mkdir(protocolPackRoot, { recursive: true });
  await mkdir(testkitPackRoot, { recursive: true });

  run(pnpmExecutable, ["run", "build"], { cwd: protocolRoot });
  run(pnpmExecutable, ["pack", "--pack-destination", protocolPackRoot], { cwd: protocolRoot });

  // Deliberately build testkit once before pack. pnpm pack invokes prepack, so
  // this verifies that build -> rebuild -> pack is idempotent and that stale
  // TypeScript build metadata can never suppress the publishable dist output.
  run(pnpmExecutable, ["run", "build"], { cwd: testkitRoot });
  run(pnpmExecutable, ["pack", "--pack-destination", testkitPackRoot], { cwd: testkitRoot });

  const protocolTarball = await oneTarball(protocolPackRoot, "protocol pack");
  const testkitTarball = await oneTarball(testkitPackRoot, "testkit pack");
  const expectedCases = await assertCanonicalAssets();
  assertPackedArtifact(archivePaths(testkitTarball), expectedCases);

  const consumerRoot = await mkdtemp(join(tmpdir(), "dsh-safe-tck-consumer-"));
  assert(relative(repositoryRoot, consumerRoot).split(sep)[0] === "..", "dummy consumer must be outside repository");

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
    await writeConsumerCheck(consumerRoot);

    run(npmExecutable, ["install", "--offline", "--ignore-scripts", "--package-lock=false", "--no-audit", "--no-fund"], { cwd: consumerRoot });
    execFileSync(process.execPath, ["consumer-check.mjs"], {
      cwd: consumerRoot,
      env: { ...process.env, DSH_SAFE_REPOSITORY_ROOT: repositoryRoot },
      stdio: "inherit",
    });
  } finally {
    await rm(consumerRoot, { recursive: true, force: true });
  }

  console.log("Packed @dsh-safe/testkit artifact and external non-workspace dummy consumer: OK");
}

await runPackageCheck();
