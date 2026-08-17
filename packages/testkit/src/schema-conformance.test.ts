import { readdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, test } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");
const schemaDir = join(root, "schemas/v1alpha1");
const fixtureRoot = join(root, "fixtures");

async function loadJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function buildAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  for (const file of await readdir(schemaDir)) {
    if (!file.endsWith(".schema.json")) continue;
    ajv.addSchema(await loadJson(join(schemaDir, file)));
  }
  return ajv;
}

const cases = [
  ["capability/valid/request-process-git.json", "capability-request.schema.json", true],
  ["capability/invalid/request-missing-action-ref.json", "capability-request.schema.json", false],
  ["capability/valid/policy-default-deny.json", "capability-policy.schema.json", true],
  ["capability/invalid/policy-default-allow.json", "capability-policy.schema.json", false],
  ["decision/valid/allow.json", "capability-decision.schema.json", true],
  ["decision/invalid/unknown-guarantee.json", "capability-decision.schema.json", false],
  ["lease/valid/one-shot.json", "capability-lease.schema.json", true],
  ["lease/invalid/missing-authorization.json", "capability-lease.schema.json", false],
  ["receipt/valid/allowed.json", "capability-receipt.schema.json", true],
  ["receipt/invalid/bad-digest.json", "capability-receipt.schema.json", false],
  ["transaction/valid/active-workspace-tx.json", "workspace-transaction.schema.json", true],
  ["transaction/invalid/external-scope.json", "workspace-transaction.schema.json", false],
  ["commit/valid/plan.json", "commit-plan.schema.json", true],
  ["commit/invalid/plan-missing-base-version.json", "commit-plan.schema.json", false],
  ["commit/valid/result.json", "commit-result.schema.json", true],
  ["commit/invalid/result-invalid-status.json", "commit-result.schema.json", false],
  ["recovery/valid/pending.json", "recovery-record.schema.json", true],
  ["recovery/invalid/unknown-strategy.json", "recovery-record.schema.json", false],
  ["acceptance/valid/coding-contract.json", "acceptance-contract.schema.json", true],
  ["acceptance/invalid/command-without-command.json", "acceptance-contract.schema.json", false],
  ["check-result/valid/pass.json", "check-result.schema.json", true],
  ["check-result/invalid/unknown-status.json", "check-result.schema.json", false],
  ["acceptance-verdict/valid/verified.json", "acceptance-verdict.schema.json", true],
  ["acceptance-verdict/invalid/lowercase-status.json", "acceptance-verdict.schema.json", false],
  ["evidence/valid/verified-episode.json", "evidence-episode.schema.json", true],
  ["evidence/invalid/evidence-missing-digest.json", "evidence-episode.schema.json", false],
  ["retention/valid/default-safe.json", "evidence-retention-profile.schema.json", true],
  ["retention/invalid/secrets-enabled.json", "evidence-retention-profile.schema.json", false],
] as const;

describe("v1alpha1 schema fixtures", async () => {
  const ajv = await buildAjv();
  for (const [fixture, schemaName, expected] of cases) {
    test(`${basename(fixture)} => ${expected ? "valid" : "invalid"}`, async () => {
      const schemaId = `https://safe-runtime.dev/schema/v1alpha1/${schemaName}`;
      const validate = ajv.getSchema(schemaId);
      expect(validate, `schema not registered: ${schemaId}`).toBeDefined();
      const instance = await loadJson(join(fixtureRoot, fixture));
      const actual = validate!(instance);
      expect(actual, JSON.stringify(validate!.errors, null, 2)).toBe(expected);
    });
  }
});
