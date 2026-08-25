import { createCapabilityPolicySchemaValidator } from "./capability-policy-schema-validator.js";
import { loadPolicyDocument } from "./policy-document-loader.js";
import {
  POLICY_RELOAD_MAX_EPOCH,
  type CapabilityPolicyHotReloadStore,
  type PolicyHotReloadActiveState,
  type PolicyHotReloadEmptyState,
  type PolicyHotReloadState,
  type PolicyReloadFailure,
  type PolicyReloadFailureReason,
  type PolicyReloadRequest,
  type PolicyReloadResourceFailureReason,
  type PolicyReloadResult,
  type PolicyReloadSuccess,
} from "./policy-hot-reload-types.js";
import type { ValidatedPolicyDocument } from "./policy-schema-types.js";
import { normalizePolicyResourceSelector } from "./resource-normalizer.js";
import { validateCanonicalPolicyResourcePattern } from "./resource-pattern.js";
import type { TrustedCapabilityPolicySchemaGraph } from "./trusted-policy-schema.js";

const EMPTY_STATE: PolicyHotReloadEmptyState = Object.freeze({
  status: "EMPTY",
  epoch: 0,
});

interface StoreOptions {
  readonly maxEpoch: number;
}

const DEFAULT_STORE_OPTIONS: StoreOptions = Object.freeze({
  maxEpoch: POLICY_RELOAD_MAX_EPOCH,
});

/**
 * Create the single-isolate M4-009 activation store. The trusted schema graph is
 * compiled exactly once here; reload() never accepts a caller-provided validator
 * or hook that could execute inside the publication critical section.
 */
export function createCapabilityPolicyHotReloadStore(
  graph: TrustedCapabilityPolicySchemaGraph,
): CapabilityPolicyHotReloadStore {
  return createCapabilityPolicyHotReloadStoreInternal(graph, DEFAULT_STORE_OPTIONS);
}

/**
 * Package-internal test seam for epoch exhaustion. It is deliberately not
 * exported from index.ts and does not change the portable maximum.
 */
export function createCapabilityPolicyHotReloadStoreForTest(
  graph: TrustedCapabilityPolicySchemaGraph,
  maxEpoch: number,
): CapabilityPolicyHotReloadStore {
  if (!Number.isSafeInteger(maxEpoch) || maxEpoch < 1 || maxEpoch > POLICY_RELOAD_MAX_EPOCH) {
    throw new RangeError("maxEpoch must be a positive safe integer within the portable bound.");
  }
  return createCapabilityPolicyHotReloadStoreInternal(
    graph,
    Object.freeze({ maxEpoch }),
  );
}

function createCapabilityPolicyHotReloadStoreInternal(
  graph: TrustedCapabilityPolicySchemaGraph,
  options: StoreOptions,
): CapabilityPolicyHotReloadStore {
  const validatePolicy = createCapabilityPolicySchemaValidator(graph);
  let activeRecord: PolicyHotReloadState = EMPTY_STATE;

  return Object.freeze({
    read(): PolicyHotReloadState {
      return activeRecord;
    },

    reload(requestInput: unknown): PolicyReloadResult {
      const request = materializeReloadRequest(requestInput);
      if (request === undefined) {
        return reloadFailure(
          "REQUEST",
          "POLICY_RELOAD_REQUEST_INVALID",
        );
      }

      try {
        const loaded = loadPolicyDocument(request);
        if (!loaded.ok) {
          return reloadFailure("LOAD", loaded.reason);
        }

        const validated = validatePolicy(loaded.value);
        if (!validated.ok) {
          return schemaFailure(validated.issues);
        }

        const resourceFailure = preflightPolicyResources(validated.value);
        if (resourceFailure !== undefined) {
          return resourceFailure;
        }

        if (activeRecord.epoch >= options.maxEpoch) {
          return reloadFailure("STATE", "POLICY_RELOAD_EPOCH_EXHAUSTED");
        }

        const nextEpoch = activeRecord.epoch + 1;
        const nextRecord: PolicyHotReloadActiveState = Object.freeze({
          status: "ACTIVE",
          epoch: nextEpoch,
          policy: validated.value,
        });
        const success: PolicyReloadSuccess = Object.freeze({
          ok: true,
          status: "SWAPPED",
          epoch: nextEpoch,
        });

        // M4-009 linearization point. Every candidate object and the success
        // result already exist, so readers can observe only the complete old or
        // complete new immutable record reference.
        activeRecord = nextRecord;
        return success;
      } catch {
        return reloadFailure("STATE", "POLICY_RELOAD_INTERNAL_FAILURE");
      }
    },
  });
}

function materializeReloadRequest(input: unknown): PolicyReloadRequest | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return undefined;
  }

  try {
    const keys = Reflect.ownKeys(input);
    if (
      keys.length !== 2 ||
      keys.some(key => typeof key !== "string" || (key !== "format" && key !== "source"))
    ) {
      return undefined;
    }

    const format = ownDataValue(input, "format");
    const source = ownDataValue(input, "source");
    if (typeof format !== "string" || typeof source !== "string") {
      return undefined;
    }

    return Object.freeze({ format, source });
  } catch {
    return undefined;
  }
}

function ownDataValue(input: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  if (descriptor === undefined || !("value" in descriptor)) {
    return undefined;
  }
  return descriptor.value;
}

function preflightPolicyResources(
  policy: ValidatedPolicyDocument,
): PolicyReloadFailure | undefined {
  const root = requiredRecord(policy);
  const spec = requiredRecord(root["spec"]);
  const rules = requiredArray(spec["rules"]);

  for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
    const rule = requiredRecord(rules[ruleIndex]);
    const resources = requiredArray(rule["resources"]);

    for (let resourceIndex = 0; resourceIndex < resources.length; resourceIndex += 1) {
      const instancePath = `/spec/rules/${ruleIndex}/resources/${resourceIndex}`;
      const normalized = normalizePolicyResourceSelector(resources[resourceIndex]);
      if (!normalized.ok) {
        return resourceFailure(normalized.reason, instancePath);
      }

      const pattern = validateCanonicalPolicyResourcePattern(normalized.selector);
      if (!pattern.ok) {
        return resourceFailure(pattern.reason, instancePath);
      }
    }
  }

  return undefined;
}

function requiredRecord(
  value: ValidatedPolicyDocument | undefined,
): Readonly<Record<string, ValidatedPolicyDocument>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Trusted schema validator returned an unexpected record shape.");
  }
  return value;
}

function requiredArray(
  value: ValidatedPolicyDocument | undefined,
): readonly ValidatedPolicyDocument[] {
  if (!Array.isArray(value)) {
    throw new TypeError("Trusted schema validator returned an unexpected array shape.");
  }
  return value;
}

function reloadFailure(
  stage: PolicyReloadFailure["stage"],
  reasonCode: PolicyReloadFailureReason,
): PolicyReloadFailure {
  return Object.freeze({
    ok: false,
    status: "RELOAD_REJECTED",
    stage,
    reasonCode,
  });
}

function schemaFailure(
  issues: PolicyReloadFailure["issues"],
): PolicyReloadFailure {
  if (issues === undefined) {
    return reloadFailure("STATE", "POLICY_RELOAD_INTERNAL_FAILURE");
  }
  return Object.freeze({
    ok: false,
    status: "RELOAD_REJECTED",
    stage: "SCHEMA",
    reasonCode: "POLICY_SCHEMA_INVALID",
    issues,
  });
}

function resourceFailure(
  reasonCode: PolicyReloadResourceFailureReason,
  instancePath: string,
): PolicyReloadFailure {
  return Object.freeze({
    ok: false,
    status: "RELOAD_REJECTED",
    stage: "RESOURCE",
    reasonCode,
    instancePath,
  });
}
