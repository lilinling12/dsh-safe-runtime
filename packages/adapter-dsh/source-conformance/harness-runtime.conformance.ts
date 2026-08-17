import { describe, expect, it } from "vitest";

import { createHarnessTestScope } from "./harness-runtime.js";

describe("source-conformance Cordis lifecycle fixture", () => {
  it("owns effects in a disposable child fiber and makes teardown idempotent", async () => {
    const scope = await createHarnessTestScope();
    let cleanupCalls = 0;

    try {
      scope.ctx.effect(() => () => {
        cleanupCalls += 1;
      }, "source-conformance/lifecycle");

      expect(scope.ctx).not.toBe(scope.root);
      expect(scope.ctx.root).toBe(scope.root);
      expect(scope.ctx.fiber).toBe(scope.fiber);
      expect(scope.fiber.uid).not.toBeNull();
      expect(scope.disposed).toBe(false);

      const firstDisposal = scope.dispose();
      const joinedDisposal = scope.dispose();
      expect(joinedDisposal).toBe(firstDisposal);

      await firstDisposal;
      expect(scope.disposed).toBe(true);
      expect(scope.fiber.uid).toBeNull();
      expect(cleanupCalls).toBe(1);

      await scope.dispose();
      expect(cleanupCalls).toBe(1);
    } finally {
      await scope.dispose();
    }
  });

  it("cascades disposal into nested service/plugin fibers", async () => {
    const scope = await createHarnessTestScope();
    let nestedCleanupCalls = 0;

    try {
      const nested = await scope.ctx.plugin(function NestedConformancePlugin(ctx) {
        ctx.effect(() => () => {
          nestedCleanupCalls += 1;
        }, "source-conformance/nested-cleanup");
      });

      expect(nested.uid).not.toBeNull();
      await scope.dispose();

      expect(scope.disposed).toBe(true);
      expect(nested.uid).toBeNull();
      expect(nestedCleanupCalls).toBe(1);
    } finally {
      await scope.dispose();
    }
  });
});
