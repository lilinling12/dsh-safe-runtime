import { mkdtemp, mkdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  discoverScopedPackages,
  projectScopedPackages,
} from "../scripts/project-pinned-harness-workspace.mjs";

const roots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "dsh-safe-projection-"));
  roots.push(root);
  return root;
}

async function createPackage(
  sourceRoot: string,
  relativeDirectory: string,
  name: string,
  version = "0.1.0-rc.5",
): Promise<string> {
  const directory = join(sourceRoot, relativeDirectory);
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "package.json"),
    `${JSON.stringify({ name, version }, null, 2)}\n`,
    "utf8",
  );
  return directory;
}

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root !== undefined) await rm(root, { recursive: true, force: true });
  }
});

describe("pinned Harness workspace projection", () => {
  it("discovers scoped packages deterministically and ignores node_modules", async () => {
    const source = await tempRoot();
    await createPackage(source, "packages/zeta", "@deepseek-ai/zeta");
    await createPackage(source, "packages/alpha", "@deepseek-ai/alpha");
    await createPackage(source, "node_modules/@deepseek-ai/registry-copy", "@deepseek-ai/registry-copy");
    await createPackage(source, "packages/other", "@other/something");

    const packages = await discoverScopedPackages(source);

    expect(packages.map((pkg) => pkg.name)).toEqual([
      "@deepseek-ai/alpha",
      "@deepseek-ai/zeta",
    ]);
    expect(packages.every((pkg) => pkg.version === "0.1.0-rc.5")).toBe(true);
    expect(packages.every((pkg) => /^[a-f0-9]{64}$/.test(pkg.packageJsonSha256))).toBe(true);
  });

  it("rejects duplicate package names instead of choosing by traversal order", async () => {
    const source = await tempRoot();
    await createPackage(source, "packages/one", "@deepseek-ai/duplicate");
    await createPackage(source, "vendor/two", "@deepseek-ai/duplicate");

    await expect(discoverScopedPackages(source)).rejects.toMatchObject({
      code: "DUPLICATE_PACKAGE_NAME",
    });
  });

  it("projects exact source packages into every consumer and is idempotent", async () => {
    const source = await tempRoot();
    const consumerA = await tempRoot();
    const consumerB = await tempRoot();
    const alpha = await createPackage(source, "packages/alpha", "@deepseek-ai/alpha");
    const beta = await createPackage(source, "vendor/beta", "@deepseek-ai/beta");

    const first = await projectScopedPackages({
      sourceRoot: source,
      consumerRoots: [consumerA, consumerB],
    });
    expect(first.packageCount).toBe(2);
    expect(first.consumers).toEqual([
      { root: consumerA, created: 2, verified: 0 },
      { root: consumerB, created: 2, verified: 0 },
    ]);

    expect(await realpath(join(consumerA, "node_modules/@deepseek-ai/alpha"))).toBe(await realpath(alpha));
    expect(await realpath(join(consumerB, "node_modules/@deepseek-ai/beta"))).toBe(await realpath(beta));

    const second = await projectScopedPackages({
      sourceRoot: source,
      consumerRoots: [consumerA, consumerB],
    });
    expect(second.consumers).toEqual([
      { root: consumerA, created: 0, verified: 2 },
      { root: consumerB, created: 0, verified: 2 },
    ]);
  });

  it("fails closed when a destination resolves to a different package", async () => {
    const source = await tempRoot();
    const consumer = await tempRoot();
    const conflicting = await tempRoot();
    await createPackage(source, "packages/alpha", "@deepseek-ai/alpha");
    await createPackage(conflicting, "foreign", "@deepseek-ai/foreign");

    const destinationDirectory = join(consumer, "node_modules/@deepseek-ai");
    await mkdir(destinationDirectory, { recursive: true });
    await symlink(
      join(conflicting, "foreign"),
      join(destinationDirectory, "alpha"),
      process.platform === "win32" ? "junction" : "dir",
    );

    await expect(projectScopedPackages({
      sourceRoot: source,
      consumerRoots: [consumer],
    })).rejects.toMatchObject({
      code: "CONFLICTING_EXISTING_DESTINATION",
    });
  });
});
