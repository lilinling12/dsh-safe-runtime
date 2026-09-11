import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AnySchemaObject } from "ajv";
import { describe, expect, test } from "vitest";
import {
  createCapabilityPolicyHotReloadStore,
  createCapabilityPolicyHotReloadStoreForTest,
} from "./policy-hot-reload.js";
import { createTrustedCapabilityPolicySchemaGraph } from "./trusted-policy-schema.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");

function parseSchema(relativePath: string): AnySchemaObject {
  return JSON.parse(readFileSync(resolve(root, relativePath), "utf8")) as AnySchemaObject;
}

const trustedGraph = createTrustedCapabilityPolicySchemaGraph(
  parseSchema("schemas/v1alpha1/capability-policy.schema.json"),
  parseSchema("schemas/v1alpha1/defs.schema.json"),
);

const VALID_POLICY = JSON.stringify({
  apiVersion: "safe-runtime.dev/v1alpha1",
  kind: "CapabilityPolicy",
  metadata: { name: "last-known-good" },
  spec: { defaultEffect: "deny", rules: [] },
});

const SCHEMA_INVALID_POLICY = JSON.stringify({
  apiVersion: "safe-runtime.dev/v1alpha1",
  kind: "CapabilityPolicy",
  metadata: { name: "schema-invalid" },
  spec: { rules: [] },
});

const RESOURCE_INVALID_POLICY = JSON.stringify({
  apiVersion: "safe-runtime.dev/v1alpha1",
  kind: "CapabilityPolicy",
  metadata: { name: "resource-invalid" },
  spec: {
    defaultEffect: "deny",
    rules: [
      {
        id: "bad-resource",
        effect: "allow",
        capabilities: ["fs.read"],
        resources: ["file://not-supported"],
      },
    ],
  },
});

describe("M4-009 green-after-review hardening", () => {
  test("format and source accessors are rejected without executing either getter", () => {
    for (const accessorField of ["format", "source"] as const) {
      const store = createCapabilityPolicyHotReloadStore(trustedGraph);
      let calls = 0;
      const request: Record<string, unknown> = {
        format: "JSON",
        source: VALID_POLICY,
      };
      Object.defineProperty(request, accessorField, {
        enumerable: true,
        configurable: true,
        get(): string {
          calls += 1;
          return accessorField === "format" ? "JSON" : VALID_POLICY;
        },
      });

      expect(store.reload(request)).toEqual({
        ok: false,
        status: "RELOAD_REJECTED",
        stage: "REQUEST",
        reasonCode: "POLICY_RELOAD_REQUEST_INVALID",
      });
      expect(calls).toBe(0);
      expect(store.read()).toEqual({ status: "EMPTY", epoch: 0 });
    }
  });

  test("REQUEST, LOAD, SCHEMA, and RESOURCE rejections preserve the exact active record", () => {
    const store = createCapabilityPolicyHotReloadStore(trustedGraph);
    expect(store.reload({ format: "JSON", source: VALID_POLICY })).toEqual({
      ok: true,
      status: "SWAPPED",
      epoch: 1,
    });
    const accepted = store.read();

    const rejectedRequests: readonly unknown[] = [
      { format: "JSON", source: VALID_POLICY, unexpected: true },
      { format: "JSON", source: "{" },
      { format: "JSON", source: SCHEMA_INVALID_POLICY },
      { format: "JSON", source: RESOURCE_INVALID_POLICY },
    ];
    const expectedStages = ["REQUEST", "LOAD", "SCHEMA", "RESOURCE"] as const;

    for (let index = 0; index < rejectedRequests.length; index += 1) {
      const result = store.reload(rejectedRequests[index]);
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error("Expected rejected reload");
      }
      expect(result.stage).toBe(expectedStages[index]);
      expect(store.read()).toBe(accepted);
      expect(store.read().epoch).toBe(1);
    }
  });

  test("STATE epoch exhaustion preserves the exact active record", () => {
    const store = createCapabilityPolicyHotReloadStoreForTest(trustedGraph, 1);
    expect(store.reload({ format: "JSON", source: VALID_POLICY })).toEqual({
      ok: true,
      status: "SWAPPED",
      epoch: 1,
    });
    const accepted = store.read();

    expect(store.reload({ format: "JSON", source: VALID_POLICY })).toEqual({
      ok: false,
      status: "RELOAD_REJECTED",
      stage: "STATE",
      reasonCode: "POLICY_RELOAD_EPOCH_EXHAUSTED",
    });
    expect(store.read()).toBe(accepted);
  });
});
