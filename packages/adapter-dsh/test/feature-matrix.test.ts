import { describe, expect, it } from "vitest";

import { DshAdapterError } from "../src/errors.js";
import {
  DSH_RC5_FEATURES,
  requireAdapterFeatures,
} from "../src/feature-matrix.js";

describe("DeepSeek Harness adapter feature gate", () => {
  it("accepts requirements that the tested baseline explicitly supports", () => {
    expect(() => requireAdapterFeatures(DSH_RC5_FEATURES, [
      "toolsPreExecute",
      "toolsFinalResultObserver",
      "approvalFailClosed",
      "agentTurnStopping",
      "filesystemProviderSeam",
      "subprocessProviderSeam",
    ])).not.toThrow();
  });

  it("fails closed when a requested security feature is explicitly unavailable", () => {
    let failure: unknown;

    try {
      requireAdapterFeatures(DSH_RC5_FEATURES, ["sandboxUniversalNetworkBoundary"]);
    } catch (error: unknown) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(DshAdapterError);
    expect(failure).toMatchObject({
      code: "UNSUPPORTED_ADAPTER_FEATURES",
      message:
        "required DeepSeek Harness adapter features are unavailable: sandboxUniversalNetworkBoundary",
    });
  });

  it("reports every unavailable prerequisite in caller-declared order", () => {
    let failure: unknown;

    try {
      requireAdapterFeatures(DSH_RC5_FEATURES, [
        "toolsArgumentRewrite",
        "toolsRestrictionIsAuthorityBoundary",
        "externalCustomSessionEventsStable",
      ]);
    } catch (error: unknown) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(DshAdapterError);
    expect(failure).toMatchObject({
      code: "UNSUPPORTED_ADAPTER_FEATURES",
      message:
        "required DeepSeek Harness adapter features are unavailable: toolsArgumentRewrite, toolsRestrictionIsAuthorityBoundary, externalCustomSessionEventsStable",
    });
  });
});
