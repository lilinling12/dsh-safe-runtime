import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const schemaDir = new URL("../schemas/v1alpha1/", import.meta.url).pathname;
const baseline = await readFile(join(schemaDir, "baseline.sha256"), "utf8");
const failures = [];
for (const line of baseline.trim().split(/\r?\n/)) {
  const match = /^([a-f0-9]{64})\s+(.+\.schema\.json)$/.exec(line.trim());
  if (!match) throw new Error(`Malformed baseline line: ${line}`);
  const [, expected, file] = match;
  const actual = createHash("sha256").update(await readFile(join(schemaDir, file))).digest("hex");
  if (actual !== expected) failures.push(`${file}: expected ${expected}, got ${actual}`);
}
if (failures.length) {
  console.error("Schema baseline changed. A normative change must update spec/fixtures/TCK and then refresh baseline:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("Schema compatibility baseline: OK");
