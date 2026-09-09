import { Context } from "@deepseek-ai/cordis";
import { describe, expect, it } from "vitest";

import {
  createDshRc5Adapter,
  DshAdapterError,
  type ApprovalRequest,
  type DshRc5AdapterOptions,
} from "../src/index.js";

const digest = (value: unknown): string => `digest:${String(value)}`;

function expectAdapterError(error: unknown, code: DshAdapterError["code"]): void {
  expect(error).toBeInstanceOf(DshAdapterError);
  expect((error as DshAdapterError).code).toBe(code);
}

describe("R1-002 public DeepSeek Adapter API", () => {
  it("rejects invalid options before touching Harness", () => {
    const ctx = new Context();

    expect(() => createDshRc5Adapter(
      ctx,
      {} as DshRc5AdapterOptions,
    )).toThrowError(DshAdapterError);

    try {
      createDshRc5Adapter(ctx, {} as DshRc5AdapterOptions);
    } catch (error: unknown) {
      expectAdapterError(error, "INVALID_ADAPTER_OPTIONS");
    }
  });

  it("owns child registrations and exposes one concurrent-safe aggregate dispose", async () => {
    const ctx = new Context();
    const adapter = createDshRc5Adapter(ctx, { digest });
    const observation = adapter.observe({ accept() {} });
    const policy = adapter.registerToolPolicy(() => ({ kind: "DENY", reason: "test" }));

    const first = adapter.dispose();
    const second = adapter.dispose();
    expect(second).toBe(first);
    await first;

    // Parent disposal owns child resources, while child handles remain safely
    // idempotent for callers that retain them.
    await observation.dispose();
    await policy.dispose();

    // Caller-owned Harness Context remains usable after Adapter teardown.
    const disposeIndependentListener = ctx.on("session/event", () => {});
    disposeIndependentListener();

    expect(() => adapter.observe({ accept() {} })).toThrowError(DshAdapterError);
    try {
      adapter.observe({ accept() {} });
    } catch (error: unknown) {
      expectAdapterError(error, "ADAPTER_DISPOSED");
    }

    const disposedRequest: ApprovalRequest = {
      sessionRef: "disposed-session" as ApprovalRequest["sessionRef"],
      toolName: "test",
    };
    expect(() => adapter.requestApproval(disposedRequest)).toThrowError(DshAdapterError);
    try {
      adapter.requestApproval(disposedRequest);
    } catch (error: unknown) {
      expectAdapterError(error, "ADAPTER_DISPOSED");
    }
  });

  it("rolls back partial construction registrations", () => {
    const ctx = new Context();
    let registrations = 0;
    let active = 0;

    const failingContext = new Proxy(ctx, {
      get(target, property) {
        if (property === "on") {
          return (...args: unknown[]): (() => void) => {
            registrations += 1;
            if (registrations === 4) {
              throw new Error("synthetic registration failure");
            }
            const method = Reflect.get(target, property, target);
            if (typeof method !== "function") throw new TypeError("Context.on unavailable");
            const raw = Reflect.apply(method, target, args) as () => void;
            active += 1;
            let live = true;
            return () => {
              if (!live) return;
              live = false;
              active -= 1;
              raw();
            };
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as Context;

    expect(() => createDshRc5Adapter(failingContext, { digest }))
      .toThrowError("synthetic registration failure");
    expect(active).toBe(0);
  });

  it("does not expose the internal deterministic clock through public options", () => {
    const options: DshRc5AdapterOptions = { digest };
    expect(options).toEqual({ digest });

    // This negative type assertion protects the Alpha public options contract.
    // @ts-expect-error `now` is a package-private source-conformance seam.
    const invalid: DshRc5AdapterOptions = { digest, now: () => "2026-09-09T00:00:00.000Z" };
    expect(invalid.digest).toBe(digest);
  });
});
