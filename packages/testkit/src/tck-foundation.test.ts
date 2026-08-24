import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, test } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const schemaPath = resolve(root, "schemas/v1alpha1/tck-fixture.schema.json");
const fixtureRoot = resolve(root, "fixtures/tck");

async function loadJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

describe("M3 shared TCK foundation contract", () => {
  test("accepts the portable deterministic fixture envelope", async () => {
    const schema = await loadJson(schemaPath);
    const fixture = await loadJson(resolve(fixtureRoot, "valid/foundation-auth.json"));
    const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);

    expect(validate(fixture), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  test.each([
    "invalid/missing-clock-tick.json",
    "invalid/unknown-top-level-field.json",
  ])("rejects %s before implementation dispatch", async relativePath => {
    const schema = await loadJson(schemaPath);
    const fixture = await loadJson(resolve(fixtureRoot, relativePath));
    const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);

    expect(validate(fixture)).toBe(false);
    expect(validate.errors).not.toHaveLength(0);
  });

  test("keeps the shared fixture schema independent of concrete Harness packages", async () => {
    const schemaText = await readFile(schemaPath, "utf8");

    expect(schemaText).not.toContain("@deepseek-ai/");
    expect(schemaText).not.toContain("dsh-agent-loop");
  });

  test("requires explicit host-independent deterministic inputs", async () => {
    const fixture = await loadJson(resolve(fixtureRoot, "valid/foundation-auth.json"));

    expect(fixture).toMatchObject({
      determinism: {
        seed: expect.any(Number),
        clock: {
          startUnixMs: expect.any(Number),
          tickMs: expect.any(Number),
        },
      },
    });
  });
});
