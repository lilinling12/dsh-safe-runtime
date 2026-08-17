import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const schemaDir = new URL("../schemas/v1alpha1/", import.meta.url).pathname;
const files = (await readdir(schemaDir)).filter(name => name.endsWith(".schema.json"));
const ids = new Set();

for (const name of files) {
  const schema = JSON.parse(await readFile(join(schemaDir, name), "utf8"));
  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    throw new Error(`${name}: must declare JSON Schema Draft 2020-12`);
  }
  if (!schema.$id) throw new Error(`${name}: missing $id`);
  if (ids.has(schema.$id)) throw new Error(`${name}: duplicate $id ${schema.$id}`);
  ids.add(schema.$id);
  if (name !== "defs.schema.json" && schema.type !== "object") {
    throw new Error(`${name}: protocol documents must be object schemas`);
  }
  if (name !== "defs.schema.json" && schema.additionalProperties !== false) {
    throw new Error(`${name}: top-level additionalProperties must be false`);
  }
}

console.log(`Schema shape: OK (${files.length} schemas)`);
