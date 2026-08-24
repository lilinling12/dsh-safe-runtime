import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceManifestPath = join(repositoryRoot, "fixtures", "manifest.json");
const sourceTckRoot = join(repositoryRoot, "fixtures", "tck");
const sourceSchemaPath = join(
  repositoryRoot,
  "schemas",
  "v1alpha1",
  "tck-fixture.schema.json",
);
const packageRoot = join(repositoryRoot, "packages", "testkit");
const targetRoot = join(packageRoot, "assets");
const stagingRoot = join(packageRoot, `.assets-staging-${process.pid}`);

function fail(message) {
  throw new Error(`testkit package assets: ${message}`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  return value;
}

function requireSafeFixturePath(value, label) {
  const path = requireNonEmptyString(value, label);
  if (
    path.includes("\\")
    || path.startsWith("/")
    || path.split("/").some(segment => segment === "" || segment === "." || segment === "..")
  ) {
    fail(`${label} must be a normalized repository-relative POSIX path`);
  }
  return path;
}

function requireManifestCase(value, index) {
  if (!isRecord(value)) fail(`manifest case ${index} must be an object`);
  const keys = Object.keys(value).sort();
  const expectedKeys = ["expected", "id", "path", "schema"];
  if (
    keys.length !== expectedKeys.length
    || keys.some((key, keyIndex) => key !== expectedKeys[keyIndex])
  ) {
    fail(`manifest case ${index} must contain exactly id, path, schema, expected`);
  }
  const expected = requireNonEmptyString(value.expected, `manifest case ${index}.expected`);
  if (expected !== "valid" && expected !== "invalid") {
    fail(`manifest case ${index}.expected must be valid or invalid`);
  }
  return {
    id: requireNonEmptyString(value.id, `manifest case ${index}.id`),
    path: requireSafeFixturePath(value.path, `manifest case ${index}.path`),
    schema: requireNonEmptyString(value.schema, `manifest case ${index}.schema`),
    expected,
  };
}

async function discoverFixtureFiles(directory, relativeDirectory = "tck") {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  const files = [];
  for (const entry of entries) {
    const sourcePath = join(directory, entry.name);
    const fixturePath = `${relativeDirectory}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...await discoverFixtureFiles(sourcePath, fixturePath));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      fail(`unexpected non-JSON fixture asset: ${fixturePath}`);
    }
    files.push(fixturePath);
  }
  return files;
}

async function copyCanonicalFile(sourcePath, targetPath) {
  const sourceRelative = relative(repositoryRoot, sourcePath);
  if (sourceRelative.startsWith(`..${sep}`) || sourceRelative === "..") {
    fail(`source escaped repository root: ${sourcePath}`);
  }
  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(sourcePath, targetPath);
}

async function prepareAssets() {
  const manifestValue = JSON.parse(await readFile(sourceManifestPath, "utf8"));
  if (!isRecord(manifestValue)) fail("fixtures/manifest.json must be an object");
  if (manifestValue.apiVersion !== "safe-runtime.dev/test-fixtures/v1alpha1") {
    fail("fixtures/manifest.json apiVersion is unsupported");
  }
  if (!Array.isArray(manifestValue.cases)) fail("fixtures/manifest.json cases must be an array");

  const tckCases = manifestValue.cases
    .map((value, index) => requireManifestCase(value, index))
    .filter(manifestCase => manifestCase.path.startsWith("tck/"));
  if (tckCases.length === 0) fail("fixtures/manifest.json contains no registered TCK cases");

  const ids = new Set();
  const registeredPaths = new Set();
  for (const manifestCase of tckCases) {
    if (manifestCase.schema !== "tck-fixture.schema.json") {
      fail(`TCK case ${manifestCase.id} must use tck-fixture.schema.json`);
    }
    if (ids.has(manifestCase.id)) fail(`duplicate TCK case id: ${manifestCase.id}`);
    if (registeredPaths.has(manifestCase.path)) {
      fail(`duplicate TCK fixture path: ${manifestCase.path}`);
    }
    ids.add(manifestCase.id);
    registeredPaths.add(manifestCase.path);
  }

  const discoveredPaths = await discoverFixtureFiles(sourceTckRoot);
  const unregistered = discoveredPaths.filter(path => !registeredPaths.has(path));
  const missing = [...registeredPaths].filter(path => !discoveredPaths.includes(path));
  if (unregistered.length > 0) {
    fail(`unregistered canonical TCK fixtures: ${unregistered.join(", ")}`);
  }
  if (missing.length > 0) {
    fail(`manifest references missing TCK fixtures: ${missing.join(", ")}`);
  }

  await rm(stagingRoot, { recursive: true, force: true });
  await mkdir(stagingRoot, { recursive: true });
  try {
    for (const manifestCase of tckCases) {
      await copyCanonicalFile(
        join(repositoryRoot, "fixtures", ...manifestCase.path.split("/")),
        join(stagingRoot, ...manifestCase.path.split("/")),
      );
    }
    await copyCanonicalFile(
      sourceSchemaPath,
      join(stagingRoot, "schemas", "v1alpha1", "tck-fixture.schema.json"),
    );
    await writeFile(
      join(stagingRoot, "manifest.json"),
      `${JSON.stringify({ apiVersion: manifestValue.apiVersion, cases: tckCases }, null, 2)}\n`,
      "utf8",
    );

    await rm(targetRoot, { recursive: true, force: true });
    await rename(stagingRoot, targetRoot);
  } catch (error) {
    await rm(stagingRoot, { recursive: true, force: true });
    throw error;
  }

  console.log(`Prepared @dsh-safe/testkit assets (${tckCases.length} registered fixtures).`);
}

await prepareAssets();
