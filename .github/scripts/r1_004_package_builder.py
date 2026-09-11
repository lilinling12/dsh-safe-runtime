from __future__ import annotations

import json
import subprocess
from pathlib import Path

BASE = "3ce15c7796bd32ecebcb220207fad3ccd03b7834"
RESULT_BRANCH = "tmp/r1-004-package-result-20260911"
PEERS = {
    "@deepseek-ai/cordis": "4.0.1",
    "@deepseek-ai/dsh-agent": "0.1.0-rc.5",
    "@deepseek-ai/dsh-llm": "0.1.0-rc.5",
    "@deepseek-ai/dsh-session": "0.1.0-rc.5",
    "@deepseek-ai/dsh-tools": "0.1.0-rc.5",
    "@deepseek-ai/dsh-user-approval": "0.1.0-rc.5",
}


def run(*args: str, capture: bool = False) -> str:
    completed = subprocess.run(
        args,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )
    return completed.stdout.strip() if capture else ""


adapter_package_path = Path("packages/adapter-dsh/package.json")
adapter = json.loads(adapter_package_path.read_text(encoding="utf-8"))
if adapter.get("name") != "@dsh-safe/adapter-dsh" or adapter.get("version") != "0.1.0-alpha.0":
    raise RuntimeError("unexpected adapter package identity/version")
if adapter.get("private") is not True:
    raise RuntimeError("R1-004 expected adapter package to still be private at entry")
if adapter.get("peerDependencies") != PEERS:
    raise RuntimeError("unexpected R1-004 peer baseline")
if adapter.get("devDependencies") != {"@types/node": "22.19.0"}:
    raise RuntimeError("unexpected adapter development dependency baseline")

adapter.pop("private")
adapter["description"] = "DeepSeek Harness rc5 adapter and native Cordis plugin bootstrap for DSH Safe Runtime."
adapter["repository"] = {
    "type": "git",
    "url": "git+https://github.com/lilinling12/dsh-safe-runtime.git",
    "directory": "packages/adapter-dsh",
}
adapter["keywords"] = [
    "deepseek-harness",
    "cordis",
    "ai-agent",
    "agent-runtime",
    "adapter",
]
adapter["engines"] = {"node": "^22.19.0 || >=24.0.0"}
adapter["exports"] = {
    ".": {
        "types": "./dist/index.d.ts",
        "import": "./dist/index.js",
    }
}
adapter["types"] = "./dist/index.d.ts"
adapter["files"] = ["dist", "LICENSE"]
adapter["scripts"] = {
    "build": "node scripts/build-publish-package.mjs",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "prepack": "pnpm run build",
}
adapter_package_path.write_text(json.dumps(adapter, indent=2) + "\n", encoding="utf-8")

Path("packages/adapter-dsh/tsconfig.publish.json").write_text(
    json.dumps(
        {
            "extends": "../../tsconfig.base.json",
            "compilerOptions": {
                "types": ["node"],
                "rootDir": "src",
                "outDir": "dist",
                "declaration": True,
                "declarationMap": False,
                "sourceMap": False,
                "noEmit": False,
            },
            "include": ["src/**/*.ts"],
            "exclude": [],
        },
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)

root_license = Path("LICENSE").read_bytes()
Path("packages/adapter-dsh/LICENSE").write_bytes(root_license)

build_helper = r'''#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const harnessCommit = "47f943859bef60e4160492346772ded9b24f765a";
const harnessRepository = "https://github.com/deepseek-ai/deepseek-harness.git";
const adapterRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(adapterRoot, "..", "..");
const harnessRoot = join(repositoryRoot, ".tmp", "adapter-dsh-publish-harness-rc5");
const projectionManifest = join(repositoryRoot, ".tmp", "adapter-dsh-publish-harness-projection.json");
const projectedScope = join(adapterRoot, "node_modules", "@deepseek-ai");
const pnpmExecutable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const gitExecutable = process.platform === "win32" ? "git.exe" : "git";

function run(executable, args, cwd = repositoryRoot, capture = false) {
  try {
    return execFileSync(executable, args, {
      cwd,
      encoding: "utf8",
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    if (error && typeof error === "object") {
      if (typeof error.stdout === "string") process.stderr.write(error.stdout);
      if (typeof error.stderr === "string") process.stderr.write(error.stderr);
    }
    throw error;
  }
}

await rm(projectedScope, { recursive: true, force: true });
await rm(harnessRoot, { recursive: true, force: true });
await rm(resolve(adapterRoot, "dist"), { recursive: true, force: true });
await mkdir(harnessRoot, { recursive: true });

run(gitExecutable, ["init", "--quiet"], harnessRoot);
run(gitExecutable, ["remote", "add", "origin", harnessRepository], harnessRoot);
run(gitExecutable, ["fetch", "--quiet", "--depth=1", "origin", harnessCommit], harnessRoot);
run(gitExecutable, ["checkout", "--quiet", "--detach", "FETCH_HEAD"], harnessRoot);
const actualCommit = run(gitExecutable, ["rev-parse", "HEAD"], harnessRoot, true).trim();
if (actualCommit !== harnessCommit) {
  throw new Error(`pinned Harness checkout mismatch: ${actualCommit}`);
}

run(pnpmExecutable, ["install", "--frozen-lockfile"], harnessRoot);
run(pnpmExecutable, ["run", "build:lib:host"], harnessRoot);
run(pnpmExecutable, ["--filter", "@dsh-safe/protocol", "run", "build"], repositoryRoot);
run(
  process.execPath,
  [
    "packages/adapter-dsh/scripts/project-pinned-harness-workspace.mjs",
    "--source-root",
    harnessRoot,
    "--consumer-root",
    adapterRoot,
    "--manifest",
    projectionManifest,
  ],
  repositoryRoot,
);
run(
  pnpmExecutable,
  ["exec", "tsc", "-p", "packages/adapter-dsh/tsconfig.publish.json"],
  repositoryRoot,
);
'''
Path("packages/adapter-dsh/scripts/build-publish-package.mjs").write_text(
    build_helper,
    encoding="utf-8",
)

checker = r'''import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, posix, relative, resolve, sep } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const adapterRoot = join(repositoryRoot, "packages", "adapter-dsh");
const packageCheckRoot = join(repositoryRoot, ".tmp", "adapter-dsh-package-check");
const packRoot = join(packageCheckRoot, "pack");
const unpackRoot = join(packageCheckRoot, "unpacked");
const pnpmExecutable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const tarExecutable = process.platform === "win32" ? "tar.exe" : "tar";
const expectedPeers = Object.freeze({
  "@deepseek-ai/cordis": "4.0.1",
  "@deepseek-ai/dsh-agent": "0.1.0-rc.5",
  "@deepseek-ai/dsh-llm": "0.1.0-rc.5",
  "@deepseek-ai/dsh-session": "0.1.0-rc.5",
  "@deepseek-ai/dsh-tools": "0.1.0-rc.5",
  "@deepseek-ai/dsh-user-approval": "0.1.0-rc.5",
});
const expectedCaseIds = new Set(Array.from({ length: 36 }, (_, index) => `ADPKG-${String(index + 1).padStart(3, "0")}`));

function run(executable, args, options = {}) {
  try {
    return execFileSync(executable, args, {
      cwd: options.cwd ?? repositoryRoot,
      encoding: "utf8",
      stdio: options.capture === true ? ["ignore", "pipe", "pipe"] : "inherit",
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    if (error && typeof error === "object") {
      if (typeof error.stdout === "string") process.stderr.write(error.stdout);
      if (typeof error.stderr === "string") process.stderr.write(error.stderr);
    }
    throw error;
  }
}

function normalizeArchivePath(path) {
  return path.replace(/^\.\//u, "").replace(/^package\//u, "").replaceAll("\\", "/");
}

async function oneTarball(directory) {
  const entries = (await readdir(directory)).filter(name => name.endsWith(".tgz"));
  assert.equal(entries.length, 1, "adapter pack must produce exactly one tarball");
  return join(directory, entries[0]);
}

function archivePaths(tarball) {
  const raw = run(tarExecutable, ["-tzf", tarball], { capture: true });
  const paths = raw
    .split(/\r?\n/u)
    .map(path => path.trim())
    .filter(path => path.length > 0 && !path.endsWith("/"))
    .map(normalizeArchivePath);
  assert(paths.length > 0, "packed adapter archive is empty");
  return new Set(paths);
}

function packageName(specifier) {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0];
}

function moduleSpecifiers(source) {
  const result = new Set();
  for (const pattern of [
    /(?:from\s+|import\s*\(\s*)["']([^"']+)["']/gu,
    /import\s+["']([^"']+)["']/gu,
  ]) {
    for (const match of source.matchAll(pattern)) result.add(match[1]);
  }
  return result;
}

function assertArchive(paths) {
  for (const required of ["package.json", "LICENSE", "dist/index.js", "dist/index.d.ts"]) {
    assert(paths.has(required), `packed adapter missing ${required}`);
  }
  for (const path of paths) {
    const allowed = path === "package.json"
      || path === "LICENSE"
      || (/^dist\/.+\.(?:js|d\.ts)$/u.test(path));
    assert(allowed, `packed adapter contains non-allowlisted file ${path}`);
    assert(!path.endsWith(".map"), `packed adapter leaked source/declaration map ${path}`);
    assert(!path.endsWith(".tsbuildinfo"), `packed adapter leaked build cache ${path}`);
  }
}

function assertManifest(manifest) {
  assert.equal(manifest.name, "@dsh-safe/adapter-dsh");
  assert.equal(manifest.version, "0.1.0-alpha.0");
  assert.equal(manifest.private, undefined, "packed adapter must not remain private");
  assert.equal(manifest.type, "module");
  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.types, "./dist/index.d.ts");
  assert.deepEqual(manifest.files, ["dist", "LICENSE"]);
  assert.deepEqual(manifest.exports, {
    ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
  });
  assert.deepEqual(manifest.engines, { node: "^22.19.0 || >=24.0.0" });
  assert.deepEqual(manifest.peerDependencies, expectedPeers);
  assert.equal(manifest.dependencies?.["@dsh-safe/protocol"], "0.1.0-alpha.0");
  for (const specifier of Object.values(manifest.dependencies ?? {})) {
    assert.equal(typeof specifier, "string");
    assert(!/^(?:workspace|link|file):/u.test(specifier), `packed manifest leaked local dependency ${specifier}`);
  }
  for (const forbidden of ["preinstall", "install", "postinstall"]) {
    assert.equal(manifest.scripts?.[forbidden], undefined, `adapter package must not define ${forbidden}`);
  }
  assert.deepEqual(manifest.repository, {
    type: "git",
    url: "git+https://github.com/lilinling12/dsh-safe-runtime.git",
    directory: "packages/adapter-dsh",
  });
  assert.equal(typeof manifest.description, "string");
  assert(manifest.description.length > 0);
  assert(Array.isArray(manifest.keywords) && manifest.keywords.length > 0);
  const metadataText = `${manifest.description} ${manifest.keywords.join(" ")}`.toLowerCase();
  for (const overclaim of ["plugin sandbox", "process isolation", "zero trust", "complete mediation"]) {
    assert(!metadataText.includes(overclaim), `package metadata overclaims ${overclaim}`);
  }
}

async function assertModuleClosure(packageRoot, paths, manifest) {
  const external = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]);
  for (const path of paths) {
    if (!path.startsWith("dist/") || (!path.endsWith(".js") && !path.endsWith(".d.ts"))) continue;
    const source = await readFile(join(packageRoot, ...path.split("/")), "utf8");
    assert(!source.includes(repositoryRoot), `${path} leaked repository absolute path`);
    assert(!source.includes("workspace:"), `${path} leaked workspace protocol`);
    for (const specifier of moduleSpecifiers(source)) {
      if (specifier.startsWith("node:")) continue;
      if (specifier.startsWith(".")) {
        const resolved = posix.normalize(posix.join(posix.dirname(path), specifier));
        if (path.endsWith(".js")) {
          assert(paths.has(resolved), `${path} runtime import missing from archive: ${specifier}`);
        } else {
          const declarationTarget = resolved.endsWith(".js") ? resolved.slice(0, -3) + ".d.ts" : resolved;
          assert(paths.has(declarationTarget) || paths.has(resolved), `${path} declaration import missing from archive: ${specifier}`);
        }
        continue;
      }
      assert(external.has(packageName(specifier)), `${path} references undeclared external package ${specifier}`);
    }
  }
}

async function assertCorpus() {
  const corpus = JSON.parse(await readFile(join(repositoryRoot, "fixtures", "adapter-dsh-package", "cases.json"), "utf8"));
  assert.equal(corpus.profile, "R1-004_ADAPTER_DSH_PACKAGE_V1");
  assert(Array.isArray(corpus.cases));
  const actual = new Set(corpus.cases.map(entry => entry?.id));
  assert.deepEqual(actual, expectedCaseIds, "R1-004 package corpus IDs drifted");
}

async function main() {
  await assertCorpus();
  await rm(packageCheckRoot, { recursive: true, force: true });
  await mkdir(packRoot, { recursive: true });
  await mkdir(unpackRoot, { recursive: true });

  run(pnpmExecutable, ["pack", "--pack-destination", packRoot], { cwd: adapterRoot });

  const tarball = await oneTarball(packRoot);
  const paths = archivePaths(tarball);
  assertArchive(paths);
  run(tarExecutable, ["-xzf", tarball, "-C", unpackRoot]);

  const packageRoot = join(unpackRoot, "package");
  const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
  assertManifest(manifest);
  await assertModuleClosure(packageRoot, paths, manifest);

  const rootLicense = await readFile(join(repositoryRoot, "LICENSE"));
  const packedLicense = await readFile(join(packageRoot, "LICENSE"));
  assert.equal(Buffer.compare(rootLicense, packedLicense), 0, "packed Adapter license diverged from repository license");

  const publicModule = await import(`${pathToFileURL(join(adapterRoot, "dist", "index.js")).href}?r1-004=${Date.now()}`);
  assert.deepEqual(
    Object.keys(publicModule).sort(),
    ["DshAdapterError", "createDshRc5Adapter", "createDshRc5Plugin"],
    "built runtime root exposed unexpected values",
  );
  assert.equal(typeof publicModule.createDshRc5Adapter, "function");
  assert.equal(typeof publicModule.createDshRc5Plugin, "function");
  assert.equal(typeof publicModule.DshAdapterError, "function");

  const declaration = await readFile(join(packageRoot, "dist", "index.d.ts"), "utf8");
  for (const required of ["createDshRc5Adapter", "createDshRc5Plugin", "DshAdapterError"]) {
    assert(declaration.includes(required), `packed declaration root missing ${required}`);
  }
  for (const forbidden of ["HarnessRuntimeAdapter", "FilesystemPort", "SubprocessPort"]) {
    assert(!declaration.includes(forbidden), `packed declaration root leaked ${forbidden}`);
  }

  const outside = await mkdtemp(join(tmpdir(), "dsh-safe-adapter-artifact-evidence-"));
  try {
    assert(relative(repositoryRoot, outside).split(sep)[0] === "..", "artifact evidence directory must be outside repository");
  } finally {
    await rm(outside, { recursive: true, force: true });
  }

  console.log(`Adapter package artifact verified: ${paths.size} packed files; external installation intentionally deferred to R1-005.`);
}

await main();
'''
Path("scripts/check-adapter-dsh-package.mjs").write_text(checker, encoding="utf-8")

root_package_path = Path("package.json")
root = json.loads(root_package_path.read_text(encoding="utf-8"))
old_check_all = root["scripts"].get("check:all")
expected_check_all = "pnpm check:boundaries && pnpm check:schemas && pnpm check:schema-baseline && pnpm typecheck && pnpm test && pnpm lint && pnpm check:testkit-package"
if old_check_all != expected_check_all:
    raise RuntimeError(f"unexpected root check:all: {old_check_all}")
root["scripts"]["check:adapter-dsh-package"] = "node scripts/check-adapter-dsh-package.mjs"
root["scripts"]["check:all"] = old_check_all + " && pnpm check:adapter-dsh-package"
root_package_path.write_text(json.dumps(root, indent=2) + "\n", encoding="utf-8")

run("pnpm", "install", "--frozen-lockfile")
run("pnpm", "check:all")

changed = run("git", "diff", "--name-only", BASE, capture=True).splitlines()
allowed = {
    "package.json",
    "packages/adapter-dsh/LICENSE",
    "packages/adapter-dsh/package.json",
    "packages/adapter-dsh/scripts/build-publish-package.mjs",
    "packages/adapter-dsh/tsconfig.publish.json",
    "scripts/check-adapter-dsh-package.mjs",
}
if set(changed) != allowed:
    raise RuntimeError(f"unexpected R1-004 implementation file set: {changed}")
run("git", "diff", "--check", BASE)

if subprocess.run(["git", "diff", "--quiet", BASE, "--", "pnpm-lock.yaml"]).returncode != 0:
    raise RuntimeError("R1-004 unexpectedly changed pnpm-lock.yaml")

run("git", "config", "user.name", "github-actions[bot]")
run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
run("git", "add", *sorted(allowed))
run("git", "commit", "-m", "feat(r1-004): make adapter package artifact publishable")
run("git", "push", "origin", f"HEAD:refs/heads/{RESULT_BRANCH}")
print(run("git", "rev-parse", "HEAD", capture=True))
