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
adapter["files"] = ["dist"]
adapter["scripts"] = {
    "build": "node -e \"require('node:fs').rmSync('dist',{recursive:true,force:true})\" && tsc -p tsconfig.publish.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "prepack": "pnpm run build",
}
adapter["devDependencies"] = {
    "@types/node": "22.19.0",
    **PEERS,
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

checker = r'''import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
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

function run(executable, args, options = {}) {
  try {
    return execFileSync(executable, args, {
      cwd: options.cwd ?? repositoryRoot,
      encoding: "utf8",
      stdio: options.capture === true ? ["ignore", "pipe", "pipe"] : "inherit",
      maxBuffer: 16 * 1024 * 1024,
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
  return new Set(
    raw.split(/\r?\n/u)
      .map(path => path.trim())
      .filter(path => path.length > 0 && !path.endsWith("/"))
      .map(normalizeArchivePath),
  );
}

function assertArchive(paths) {
  for (const required of ["package.json", "LICENSE", "dist/index.js", "dist/index.d.ts"]) {
    assert(paths.has(required), `packed adapter missing ${required}`);
  }
  for (const path of paths) {
    assert(!path.startsWith("src/"), `packed adapter leaked source ${path}`);
    assert(!path.startsWith("source-conformance/"), `packed adapter leaked conformance ${path}`);
    assert(!path.startsWith("fixtures/"), `packed adapter leaked fixture ${path}`);
    assert(!path.startsWith(".github/"), `packed adapter leaked workflow content ${path}`);
    assert(!path.startsWith("node_modules/"), `packed adapter leaked node_modules ${path}`);
    assert(!path.includes("coverage/"), `packed adapter leaked coverage ${path}`);
    assert(!path.endsWith(".tsbuildinfo"), `packed adapter leaked build cache ${path}`);
    assert(!/\.test\.[cm]?[jt]sx?$/u.test(path), `packed adapter leaked test file ${path}`);
    assert(!/\.conformance\.[cm]?[jt]sx?$/u.test(path), `packed adapter leaked conformance file ${path}`);
  }
}

function assertManifest(manifest) {
  assert.equal(manifest.name, "@dsh-safe/adapter-dsh");
  assert.equal(manifest.version, "0.1.0-alpha.0");
  assert.equal(manifest.private, undefined, "packed adapter must not remain private");
  assert.equal(manifest.type, "module");
  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.types, "./dist/index.d.ts");
  assert.deepEqual(manifest.files, ["dist"]);
  assert.deepEqual(manifest.exports, {
    ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
  });
  assert.deepEqual(manifest.engines, { node: "^22.19.0 || >=24.0.0" });
  assert.deepEqual(manifest.peerDependencies, expectedPeers);
  assert.equal(manifest.dependencies?.["@dsh-safe/protocol"], "0.1.0-alpha.0");
  for (const specifier of Object.values(manifest.dependencies ?? {})) {
    assert.equal(typeof specifier, "string");
    assert(!specifier.startsWith("workspace:"), `packed manifest leaked ${specifier}`);
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
}

async function main() {
  await rm(packageCheckRoot, { recursive: true, force: true });
  await mkdir(packRoot, { recursive: true });
  await mkdir(unpackRoot, { recursive: true });

  run(pnpmExecutable, ["run", "build"], { cwd: adapterRoot });
  run(pnpmExecutable, ["pack", "--pack-destination", packRoot], { cwd: adapterRoot });

  const tarball = await oneTarball(packRoot);
  const paths = archivePaths(tarball);
  assertArchive(paths);
  run(tarExecutable, ["-xzf", tarball, "-C", unpackRoot]);

  const packageRoot = join(unpackRoot, "package");
  const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
  assertManifest(manifest);

  const publicModule = await import(`${pathToFileURL(join(packageRoot, "dist", "index.js")).href}?r1-004=${Date.now()}`);
  assert.equal(typeof publicModule.createDshRc5Adapter, "function");
  assert.equal(typeof publicModule.createDshRc5Plugin, "function");
  assert.equal(typeof publicModule.DshAdapterError, "function");
  assert.deepEqual(
    Object.keys(publicModule).sort(),
    ["DshAdapterError", "createDshRc5Adapter", "createDshRc5Plugin"],
    "packed runtime root exposed unexpected values",
  );

  const declaration = await readFile(join(packageRoot, "dist", "index.d.ts"), "utf8");
  for (const required of ["createDshRc5Adapter", "createDshRc5Plugin", "DshAdapterError"]) {
    assert(declaration.includes(required), `packed declaration root missing ${required}`);
  }
  for (const forbidden of ["HarnessRuntimeAdapter", "FilesystemPort", "SubprocessPort"]) {
    assert(!declaration.includes(forbidden), `packed declaration root leaked ${forbidden}`);
  }

  console.log(`Adapter package artifact verified: ${paths.size} packed files.`);
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

run("pnpm", "install", "--lockfile-only")
run("pnpm", "install", "--frozen-lockfile")
run("pnpm", "check:all")

changed = run("git", "diff", "--name-only", BASE, capture=True).splitlines()
allowed = {
    "package.json",
    "packages/adapter-dsh/LICENSE",
    "packages/adapter-dsh/package.json",
    "packages/adapter-dsh/tsconfig.publish.json",
    "pnpm-lock.yaml",
    "scripts/check-adapter-dsh-package.mjs",
}
if set(changed) != allowed:
    raise RuntimeError(f"unexpected R1-004 implementation file set: {changed}")
run("git", "diff", "--check", BASE)

lock_diff = run("git", "diff", BASE, "--", "pnpm-lock.yaml", capture=True)
if "packages/adapter-dsh:" not in lock_diff:
    raise RuntimeError("lockfile delta does not update adapter importer")

run("git", "config", "user.name", "github-actions[bot]")
run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
run("git", "add", *sorted(allowed))
run("git", "commit", "-m", "feat(r1-004): make adapter package artifact publishable")
run("git", "push", "origin", f"HEAD:refs/heads/{RESULT_BRANCH}")
print(run("git", "rev-parse", "HEAD", capture=True))
