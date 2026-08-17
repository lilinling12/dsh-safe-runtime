import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const violations = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (/\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/.test(entry.name)) files.push(path);
  }
  return files;
}

const protocolDir = join(root, "packages/protocol");
for (const file of await walk(protocolDir)) {
  const text = await readFile(file, "utf8");
  if (text.includes("@deepseek-ai/")) {
    violations.push(`${relative(root, file)} imports or references @deepseek-ai/*`);
  }
  if (text.includes("adapter-dsh")) {
    violations.push(`${relative(root, file)} depends on adapter-dsh`);
  }
}

for (const packageName of [
  "policy-engine",
  "capability-broker",
  "workspace-tx",
  "acceptance-engine",
  "avp-bridge",
]) {
  const dir = join(root, "packages", packageName);
  for (const file of await walk(dir)) {
    const text = await readFile(file, "utf8");
    if (/from\s+["']@dsh-safe\/adapter-dsh["']/.test(text)) {
      violations.push(`${relative(root, file)} imports concrete adapter-dsh types`);
    }
  }
}

if (violations.length > 0) {
  console.error("Architecture boundary violations:\n" + violations.map(v => `- ${v}`).join("\n"));
  process.exit(1);
}

console.log("Architecture boundaries: OK");
