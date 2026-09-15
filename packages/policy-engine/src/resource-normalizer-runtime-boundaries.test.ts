import { describe, expect, test } from "vitest";
import { normalizeCapabilityResource } from "./resource-normalizer.js";

describe("M4-003 runtime object boundaries", () => {
  test("an own providerIdentity with undefined value is invalid, not absent", () => {
    expect(
      normalizeCapabilityResource({
        scheme: "workspace",
        locator: "/src/auth.ts",
        providerIdentity: undefined,
      }),
    ).toEqual({
      ok: false,
      reason: "RESOURCE_PROVIDER_IDENTITY_INVALID",
      field: "providerIdentity",
    });
  });

  test("inherited resource fields never become authorization input", () => {
    const inheritedOnly = Object.create({
      scheme: "workspace",
      locator: "/src/auth.ts",
      providerIdentity: "opaque:inherited",
    }) as object;

    expect(normalizeCapabilityResource(inheritedOnly)).toEqual({
      ok: false,
      reason: "RESOURCE_SCHEME_UNSUPPORTED",
      field: "scheme",
    });

    const ownRequiredInheritedProvider = Object.create({
      providerIdentity: "opaque:inherited",
    }) as Record<string, unknown>;
    ownRequiredInheritedProvider["scheme"] = "workspace";
    ownRequiredInheritedProvider["locator"] = "/src/auth.ts";

    expect(normalizeCapabilityResource(ownRequiredInheritedProvider)).toEqual({
      ok: true,
      resource: {
        scheme: "workspace",
        locator: "/src/auth.ts",
      },
    });
  });
});
