import { Context, type Fiber, type Inject } from "@deepseek-ai/cordis";

/**
 * A consumer created through Cordis's explicit service-injection API.
 *
 * The direct Fiber handle is retained for the small number of lifecycle tests
 * that need to assert Cordis ownership. Ordinary consumers should use
 * `HarnessTestScope.inject()`, which preserves the fixture's Context-only API.
 */
export interface HarnessInjectedConsumer {
  readonly ctx: Context;
  readonly fiber: Fiber;
}

/**
 * A source-conformance test scope owned by a real Cordis child plugin fiber.
 *
 * Tests deliberately do not attach effects directly to the Cordis root fiber:
 * root `fiber.dispose()` is a restart operation in the pinned Harness baseline,
 * while a child plugin fiber has true terminal disposal semantics. Disposing
 * this scope therefore tears down nested service plugins and context effects
 * through Cordis's real ownership tree.
 */
export interface HarnessTestScope {
  readonly root: Context;
  readonly ctx: Context;
  readonly fiber: Fiber;
  readonly disposed: boolean;

  /**
   * Create a nested consumer context that explicitly declares the Cordis
   * services it reads. Providers must already be mounted in this scope.
   */
  inject(dependencies: Inject): Promise<Context>;

  /**
   * Same injection path as `inject()`, but also exposes the direct Cordis Fiber
   * handle for structural lifecycle assertions. Do not use this merely to read
   * services; service access still belongs on the injected Context.
   */
  injectWithFiber(dependencies: Inject): Promise<HarnessInjectedConsumer>;

  dispose(): Promise<void>;
}

/**
 * Create one isolated Cordis ownership scope for a single conformance test.
 *
 * The returned disposer is memoized so repeated or concurrent calls join the
 * same cleanup operation. Cleanup is considered complete only after the child
 * fiber reaches Cordis's terminal disposed state (`uid === null`).
 */
export async function createHarnessTestScope(): Promise<HarnessTestScope> {
  const root = new Context();
  let childContext: Context | undefined;

  const handle = root.plugin(function DshSafeRuntimeSourceConformanceScope(ctx) {
    childContext = ctx;
  });
  const fiber = await handle;

  if (childContext === undefined) {
    await fiber.dispose();
    throw new Error("Cordis child plugin scope activated without exposing its context");
  }

  const ctx = childContext;
  let disposalTask: Promise<void> | undefined;

  async function injectWithFiber(
    dependencies: Inject,
  ): Promise<HarnessInjectedConsumer> {
    let injectedContext: Context | undefined;
    const injectedHandle = ctx.inject(
      dependencies,
      function DshSafeRuntimeSourceConformanceConsumer(consumerCtx) {
        injectedContext = consumerCtx;
      },
    );
    const injectedFiber = await injectedHandle;

    if (injectedContext === undefined) {
      await injectedFiber.dispose();
      throw new Error(
        "Cordis injected consumer activated without exposing its context",
      );
    }

    return Object.freeze({
      ctx: injectedContext,
      fiber: injectedFiber,
    });
  }

  return Object.freeze({
    root,
    ctx,
    fiber,
    get disposed() {
      return fiber.uid === null;
    },
    async inject(dependencies: Inject): Promise<Context> {
      return (await injectWithFiber(dependencies)).ctx;
    },
    injectWithFiber,
    dispose(): Promise<void> {
      disposalTask ??= Promise.resolve()
        .then(() => fiber.dispose())
        .then(() => {
          if (fiber.uid !== null) {
            throw new Error("Cordis child plugin scope did not reach terminal disposal");
          }
        });
      return disposalTask;
    },
  });
}
