#!/usr/bin/env node

import {
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_SCOPE = "@deepseek-ai";
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".hg",
  ".svn",
  ".turbo",
  ".vite",
  "coverage",
  "dist",
  "lib",
  "node_modules",
]);

export class WorkspaceProjectionError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "WorkspaceProjectionError";
    this.code = code;
  }
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function isWithin(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== "..");
}

function parseScopedPackageName(name, scope) {
  if (typeof name !== "string" || !name.startsWith(`${scope}/`)) return undefined;
  const leaf = name.slice(scope.length + 1);
  if (leaf.length === 0 || leaf.includes("/") || leaf === "." || leaf === "..") {
    throw new WorkspaceProjectionError(
      "INVALID_PACKAGE_NAME",
      `invalid scoped package name ${JSON.stringify(name)}`,
    );
  }
  return leaf;
}

async function readPackageManifest(packageJsonPath, scope) {
  const raw = await readFile(packageJsonPath, "utf8");
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (cause) {
    throw new WorkspaceProjectionError(
      "INVALID_PACKAGE_JSON",
      `cannot parse ${packageJsonPath}`,
      { cause },
    );
  }

  const leaf = parseScopedPackageName(manifest.name, scope);
  if (leaf === undefined) return undefined;
  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    throw new WorkspaceProjectionError(
      "INVALID_PACKAGE_VERSION",
      `${manifest.name} must declare a non-empty version`,
    );
  }

  return {
    name: manifest.name,
    leaf,
    version: manifest.version,
    directory: dirname(packageJsonPath),
    packageJsonSha256: sha256(raw),
  };
}

/**
 * Discover every package in an exact source checkout that belongs to `scope`.
 *
 * The walk intentionally does not follow directory symlinks and skips build or
 * dependency output. A duplicate package name is an integrity error: choosing
 * one by traversal order would make the conformance environment ambiguous.
 */
export async function discoverScopedPackages(sourceRoot, options = {}) {
  const scope = options.scope ?? DEFAULT_SCOPE;
  const root = await realpath(resolve(sourceRoot));
  const packages = new Map();

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (entry.name === "package.json" && entry.isFile()) {
        const discovered = await readPackageManifest(join(directory, entry.name), scope);
        if (discovered === undefined) continue;

        const canonicalDirectory = await realpath(discovered.directory);
        if (!isWithin(root, canonicalDirectory)) {
          throw new WorkspaceProjectionError(
            "PACKAGE_OUTSIDE_SOURCE_ROOT",
            `${discovered.name} resolves outside pinned source root`,
          );
        }

        const previous = packages.get(discovered.name);
        if (previous !== undefined && previous.directory !== canonicalDirectory) {
          throw new WorkspaceProjectionError(
            "DUPLICATE_PACKAGE_NAME",
            `${discovered.name} is declared by both ${previous.directory} and ${canonicalDirectory}`,
          );
        }

        packages.set(discovered.name, {
          ...discovered,
          directory: canonicalDirectory,
          relativeDirectory: relative(root, canonicalDirectory).split(sep).join("/"),
        });
        continue;
      }

      if (!entry.isDirectory() || IGNORED_DIRECTORIES.has(entry.name)) continue;
      await visit(join(directory, entry.name));
    }
  }

  await visit(root);
  return [...packages.values()].sort((left, right) => left.name.localeCompare(right.name));
}

async function ensureExactLink(destination, expectedSource) {
  try {
    await lstat(destination);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    const type = process.platform === "win32" ? "junction" : "dir";
    const target = process.platform === "win32"
      ? expectedSource
      : relative(dirname(destination), expectedSource) || ".";
    await symlink(target, destination, type);
    return "created";
  }

  let actualSource;
  try {
    actualSource = await realpath(destination);
  } catch (cause) {
    throw new WorkspaceProjectionError(
      "BROKEN_EXISTING_DESTINATION",
      `existing projection destination cannot be resolved: ${destination}`,
      { cause },
    );
  }

  if (actualSource !== expectedSource) {
    throw new WorkspaceProjectionError(
      "CONFLICTING_EXISTING_DESTINATION",
      `refusing to replace ${destination}; it resolves to ${actualSource}, expected ${expectedSource}`,
    );
  }
  return "verified";
}

/**
 * Project discovered source packages into one or more consumer roots.
 * Existing entries are accepted only when their real path is the exact pinned
 * source package. Registry copies or stale links are never overwritten.
 */
export async function projectScopedPackages({
  sourceRoot,
  consumerRoots,
  scope = DEFAULT_SCOPE,
  manifestPath,
}) {
  if (!Array.isArray(consumerRoots) || consumerRoots.length === 0) {
    throw new WorkspaceProjectionError(
      "NO_CONSUMER_ROOTS",
      "at least one consumer root is required",
    );
  }

  const canonicalSourceRoot = await realpath(resolve(sourceRoot));
  const packages = await discoverScopedPackages(canonicalSourceRoot, { scope });
  if (packages.length === 0) {
    throw new WorkspaceProjectionError(
      "NO_SCOPED_PACKAGES",
      `no ${scope} packages found under ${canonicalSourceRoot}`,
    );
  }

  const consumers = [];
  for (const consumerRoot of consumerRoots) {
    const canonicalConsumerRoot = resolve(consumerRoot);
    const scopeDirectory = join(canonicalConsumerRoot, "node_modules", scope);
    await mkdir(scopeDirectory, { recursive: true });

    let created = 0;
    let verified = 0;
    for (const pkg of packages) {
      const destination = join(scopeDirectory, pkg.leaf);
      const result = await ensureExactLink(destination, pkg.directory);
      if (result === "created") created += 1;
      else verified += 1;
    }

    consumers.push({
      root: canonicalConsumerRoot,
      created,
      verified,
    });
  }

  const manifest = {
    schemaVersion: 1,
    scope,
    sourceRoot: canonicalSourceRoot,
    packageCount: packages.length,
    packages: packages.map((pkg) => ({
      name: pkg.name,
      version: pkg.version,
      relativeDirectory: pkg.relativeDirectory,
      packageJsonSha256: pkg.packageJsonSha256,
    })),
    consumers,
  };

  if (manifestPath !== undefined) {
    const output = resolve(manifestPath);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  return manifest;
}

function parseArguments(argv) {
  const result = {
    sourceRoot: undefined,
    consumerRoots: [],
    scope: DEFAULT_SCOPE,
    manifestPath: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    switch (argument) {
      case "--source-root":
        if (value === undefined) throw new WorkspaceProjectionError("INVALID_ARGUMENT", "--source-root requires a value");
        result.sourceRoot = value;
        index += 1;
        break;
      case "--consumer-root":
        if (value === undefined) throw new WorkspaceProjectionError("INVALID_ARGUMENT", "--consumer-root requires a value");
        result.consumerRoots.push(value);
        index += 1;
        break;
      case "--scope":
        if (value === undefined) throw new WorkspaceProjectionError("INVALID_ARGUMENT", "--scope requires a value");
        result.scope = value;
        index += 1;
        break;
      case "--manifest":
        if (value === undefined) throw new WorkspaceProjectionError("INVALID_ARGUMENT", "--manifest requires a value");
        result.manifestPath = value;
        index += 1;
        break;
      default:
        throw new WorkspaceProjectionError("INVALID_ARGUMENT", `unknown argument ${JSON.stringify(argument)}`);
    }
  }

  if (result.sourceRoot === undefined) {
    throw new WorkspaceProjectionError("INVALID_ARGUMENT", "--source-root is required");
  }
  if (result.consumerRoots.length === 0) {
    throw new WorkspaceProjectionError("INVALID_ARGUMENT", "at least one --consumer-root is required");
  }
  return result;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const manifest = await projectScopedPackages(args);
  process.stdout.write(
    `Projected ${manifest.packageCount} ${manifest.scope} packages from pinned source into ${manifest.consumers.length} consumer root(s).\n`,
  );
  for (const consumer of manifest.consumers) {
    process.stdout.write(
      `- ${consumer.root}: ${consumer.created} created, ${consumer.verified} already exact\n`,
    );
  }
}

const invokedDirectly = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  main().catch((error) => {
    if (error instanceof WorkspaceProjectionError) {
      process.stderr.write(`[${error.code}] ${error.message}\n`);
    } else {
      process.stderr.write(`${error?.stack ?? error}\n`);
    }
    process.exitCode = 1;
  });
}
