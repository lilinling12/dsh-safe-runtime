import { describe, expect, test } from "vitest";

import { runLeaseRevokeCommand } from "./lease-revoke-cli.js";
import type { LeaseRevocationStore } from "./lease-revoke-types.js";

describe("M4-036 revoke CLI privacy and hostile argv hardening", () => {
  test("runtime failure envelope does not retain the target leaseRef", async () => {
    const target = `lease:secret:${String.fromCodePoint(0x1b)}[31m`;
    const result = await runLeaseRevokeCommand(
      ["lease", "revoke", "--lease-ref", target],
      { revokeOne() { return { status: "OUTCOME_UNKNOWN" }; } },
    );

    expect(result).toEqual({
      status: "RUNTIME_FAILURE",
      format: "HUMAN",
      result: {
        status: "FAIL_CLOSED",
        stage: "STORE",
        reasonCode: "LEASE_REVOKE_OUTCOME_UNKNOWN",
      },
      output: "FAIL_CLOSED\tSTORE\tLEASE_REVOKE_OUTCOME_UNKNOWN",
    });
    expect(JSON.stringify(result)).not.toContain(target);
    expect(JSON.stringify(result)).not.toContain("leaseRef");
  });

  test("not-found envelope does not retain the target leaseRef", async () => {
    const target = "lease:not-found-secret";
    const result = await runLeaseRevokeCommand(
      ["lease", "revoke", "--lease-ref", target, "--json"],
      { revokeOne() { return { status: "NOT_FOUND" }; } },
    );

    expect(result).toEqual({
      status: "NOT_FOUND",
      format: "JSON",
      result: { status: "NOT_REVOKED", reasonCode: "LEASE_REVOKE_NOT_FOUND" },
      output: JSON.stringify({ status: "NOT_REVOKED", reasonCode: "LEASE_REVOKE_NOT_FOUND" }),
    });
    expect(JSON.stringify(result)).not.toContain(target);
    expect(JSON.stringify(result)).not.toContain("leaseRef");
  });

  test("rejects sparse argv before touching the store", async () => {
    const argv = ["lease", "revoke", "--lease-ref", "lease:x"];
    delete argv[2];
    let storeCalls = 0;

    const result = await runLeaseRevokeCommand(argv, {
      revokeOne() {
        storeCalls += 1;
        return { status: "NOT_FOUND" };
      },
    });

    expect(result).toEqual({ status: "CLI_USAGE_ERROR", reasonCode: "LEASE_REVOKE_CLI_ARGUMENT_INVALID" });
    expect(storeCalls).toBe(0);
  });

  test("rejects revoked Proxy argv before touching the store", async () => {
    const { proxy, revoke } = Proxy.revocable(["lease", "revoke", "--lease-ref", "lease:x"], {});
    revoke();
    let storeCalls = 0;

    const result = await runLeaseRevokeCommand(proxy, {
      revokeOne() {
        storeCalls += 1;
        return { status: "NOT_FOUND" };
      },
    });

    expect(result).toEqual({ status: "CLI_USAGE_ERROR", reasonCode: "LEASE_REVOKE_CLI_ARGUMENT_INVALID" });
    expect(storeCalls).toBe(0);
  });

  test("one operator invocation reaches the store at most once", async () => {
    let storeCalls = 0;
    const store: LeaseRevocationStore = {
      revokeOne() {
        storeCalls += 1;
        return { status: "OUTCOME_UNKNOWN" };
      },
    };

    const result = await runLeaseRevokeCommand(
      ["lease", "revoke", "--lease-ref", "lease:once"],
      store,
    );

    expect(result.status).toBe("RUNTIME_FAILURE");
    expect(storeCalls).toBe(1);
  });
});
