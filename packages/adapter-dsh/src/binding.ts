import type { Context } from "@deepseek-ai/cordis";
import type { Agent } from "@deepseek-ai/dsh-agent";
import { CallId, createUserMessage } from "@deepseek-ai/dsh-llm";
import { SessionId } from "@deepseek-ai/dsh-session";
import type { Session, SessionEvent } from "@deepseek-ai/dsh-session";
import type { ToolExecution } from "@deepseek-ai/dsh-tools";
import type {} from "@deepseek-ai/dsh-user-approval";

import { OrderedRuntimeEventDispatcher } from "./dispatcher.js";
import { dshAdapterError } from "./errors.js";
import { DSH_RC5_FEATURES, DSH_TESTED_BASELINE } from "./feature-matrix.js";
import {
  normalizeDurableEvent,
  normalizeFinalToolResult,
  type Digest,
  type FinalToolClassification,
} from "./normalize.js";
import type {
  ApprovalDecision,
  ApprovalRequest,
  CompletionBoundaryRequest,
  CompletionSteerRequest,
  Disposable,
  HarnessRuntimeAdapter,
  ObservationSubscription,
  ToolExecutionScope,
  ToolGuardDecision,
  ToolGuardHandler,
  ToolPolicyDecision,
  ToolPolicyHandler,
  ToolPolicyRequest,
  TurnStoppingHandler,
} from "./ports.js";
import type {
  NormalizedApprovalOutcome,
  RuntimeEvent,
  RuntimeEventSink,
} from "./runtime-events.js";

export interface DshRc5AdapterOptions {
  readonly digest: Digest;
  readonly now?: () => string;
  readonly onObservationFailure?: (event: RuntimeEvent | undefined, error: unknown) => void;
}

type CorrelatedDisposition = "denied" | "cancelled";

function asDisposable(dispose: () => void): Disposable {
  return { dispose };
}

function sessionRefOf(agent: Agent): string {
  return String(agent.session.id);
}

function toolScope(exec: Readonly<ToolExecution>): ToolExecutionScope {
  const agent = exec.agent;
  if (agent === undefined) return { kind: "host" };
  return {
    kind: "agent",
    sessionRef: sessionRefOf(agent),
    agentRef: String(agent.id),
  };
}

function toolPolicyRequest(exec: Readonly<ToolExecution>): ToolPolicyRequest {
  return {
    callRef: String(exec.callId),
    rootCallRef: String(exec.rootCallId),
    toolName: exec.name,
    arguments: exec.arguments,
    scope: toolScope(exec),
  };
}

function callKey(sessionRef: string, callRef: string): string {
  return `${sessionRef}\u0000${callRef}`;
}

function normalizeApprovalOutcome(outcome: string): ApprovalDecision {
  switch (outcome) {
    case "allowed-once": return "ALLOWED_ONCE";
    case "rejected": return "REJECTED";
    case "cancelled": return "CANCELLED";
    case "unavailable": return "UNAVAILABLE";
    default:
      throw dshAdapterError(
        "HARNESS_SERVICE_UNAVAILABLE",
        `unsupported DeepSeek Harness approval outcome: ${outcome}`,
      );
  }
}

function runtimeApprovalOutcome(outcome: string): NormalizedApprovalOutcome {
  return normalizeApprovalOutcome(outcome);
}

function openTurn(session: Session): number | undefined {
  const events = session.events;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index] as SessionEvent;
    if (event.type === "turn/end") return undefined;
    if (event.type === "turn/start") return event.data.turn;
  }
  return undefined;
}

function expectedTurnRef(sessionRef: string, turn: number): string {
  return `${sessionRef}/turn:${turn}`;
}

/**
 * Bind the runtime-independent M2 ports to the documented DeepSeek Harness
 * 0.1.0-rc.5 public seams. The adapter imports service definitions only; it
 * never imports the concrete agent-loop implementation.
 */
export function createDshRc5Adapter(
  ctx: Context,
  options: DshRc5AdapterOptions,
): HarnessRuntimeAdapter {
  const now = options.now ?? (() => new Date().toISOString());
  const dispositions = new Map<string, CorrelatedDisposition>();
  const approvalCalls = new Map<string, { sessionRef: string; callRef?: string }>();
  let liveSequence = 0;

  const nextLiveRef = (sessionRef: string, kind: string): string =>
    `${sessionRef}/live:${kind}:${++liveSequence}`;

  // Internal classification is independent of optional evidence subscribers.
  ctx.on("session/event", (session, event) => {
    const sessionRef = String(session.id);
    if (event.type === "approval/asked") {
      approvalCalls.set(String(event.data.id), {
        sessionRef,
        ...(event.data.callId === undefined ? {} : { callRef: String(event.data.callId) }),
      });
      return;
    }
    if (event.type !== "approval/decided") return;
    const approvalRef = String(event.data.id);
    const correlated = approvalCalls.get(approvalRef);
    approvalCalls.delete(approvalRef);
    if (correlated?.callRef === undefined) return;
    const key = callKey(correlated.sessionRef, correlated.callRef);
    switch (event.data.outcome) {
      case "allowed-once": break;
      case "cancelled": dispositions.set(key, "cancelled"); break;
      case "rejected":
      case "unavailable":
        dispositions.set(key, "denied");
        break;
    }
  });

  const requireLiveAgent = (sessionRef: string): Agent => {
    const agent = ctx.agents.get(SessionId(sessionRef));
    if (agent === undefined) {
      throw dshAdapterError(
        "HARNESS_AGENT_NOT_LIVE",
        `DeepSeek Harness agent/session ${sessionRef} is not live`,
      );
    }
    return agent;
  };

  const registerToolPolicy = (handler: ToolPolicyHandler): Disposable => {
    const dispose = ctx.on("tools/pre-execute", async (exec, next) => {
      const request = toolPolicyRequest(exec);
      let decision: ToolPolicyDecision;
      try {
        decision = await handler(request);
      } catch {
        decision = { kind: "DENY", reason: "safe-runtime policy evaluation failed closed" };
      }

      switch (decision.kind) {
        case "ALLOW":
          return next();
        case "DENY":
          if (request.scope.kind === "agent") {
            dispositions.set(callKey(request.scope.sessionRef, request.callRef), "denied");
          }
          return { kind: "deny", reason: decision.reason };
        case "ASK":
          return decision.reason === undefined
            ? { kind: "ask" }
            : { kind: "ask", reason: decision.reason };
      }
    });
    return asDisposable(dispose);
  };

  const registerMonotonicToolGuard = (handler: ToolGuardHandler): Disposable => {
    const dispose = ctx.tools.guard((exec) => {
      const request = toolPolicyRequest(exec);
      let decision: ToolGuardDecision;
      try {
        decision = handler(request);
      } catch {
        decision = { kind: "DENY", reason: "safe-runtime monotonic guard failed closed" };
      }
      if (decision.kind === "ALLOW") return undefined;
      if (request.scope.kind === "agent") {
        dispositions.set(callKey(request.scope.sessionRef, request.callRef), "denied");
      }
      return decision.reason;
    });
    return asDisposable(dispose);
  };

  const observe = (sink: RuntimeEventSink): ObservationSubscription => {
    const dispatcher = new OrderedRuntimeEventDispatcher(
      sink,
      ({ event, error }) => options.onObservationFailure?.(event, error),
    );
    const observedApprovals = new Map<string, string | undefined>();
    const disposers: Array<() => void> = [];
    const report = (event: RuntimeEvent): void => dispatcher.enqueue(event);
    const reportFailure = (error: unknown): void => options.onObservationFailure?.(undefined, error);

    disposers.push(ctx.on("agent/session-start", ({ agent, source }) => {
      const sessionRef = sessionRefOf(agent);
      report({
        type: "session.started",
        eventRef: nextLiveRef(sessionRef, "session-started"),
        sessionRef,
        observedAt: now(),
        source,
      });
    }));

    disposers.push(ctx.on("session/event", (session, event) => {
      const sessionRef = String(session.id);
      try {
        switch (event.type) {
          case "turn/start":
          case "turn/end":
          case "step/start":
          case "tool/call":
            report(normalizeDurableEvent(sessionRef, event, options.digest));
            return;
          case "approval/asked":
            observedApprovals.set(
              String(event.data.id),
              event.data.callId === undefined ? undefined : String(event.data.callId),
            );
            return;
          case "approval/decided": {
            const approvalRef = String(event.data.id);
            const callRef = observedApprovals.get(approvalRef);
            observedApprovals.delete(approvalRef);
            report({
              type: "approval.decided",
              eventRef: `${sessionRef}/seq:${event.seq}`,
              sessionRef,
              observedAt: new Date(event.time).toISOString(),
              approvalRef,
              ...(callRef === undefined ? {} : { callRef }),
              outcome: runtimeApprovalOutcome(event.data.outcome),
            });
            return;
          }
          default:
            return;
        }
      } catch (error: unknown) {
        reportFailure(error);
      }
    }));

    disposers.push(ctx.on("tools/result", (exec, result) => {
      const agent = exec.agent;
      if (agent === undefined) return;
      const sessionRef = sessionRefOf(agent);
      const key = callKey(sessionRef, String(exec.callId));
      const disposition = dispositions.get(key);
      dispositions.delete(key);
      const classification: FinalToolClassification = disposition === "denied"
        ? { policyDenied: true }
        : disposition === "cancelled"
          ? { policyCancelled: true }
          : {};
      try {
        report(normalizeFinalToolResult(
          sessionRef,
          exec,
          result,
          options.digest(result),
          now(),
          classification,
          nextLiveRef(sessionRef, "tool-result"),
        ));
      } catch (error: unknown) {
        reportFailure(error);
      }
    }));

    disposers.push(ctx.on("agent/request-error", async ({ agent, turn, step, failure }, next) => {
      const sessionRef = sessionRefOf(agent);
      report({
        type: "model.request.failed",
        eventRef: nextLiveRef(sessionRef, "request-error"),
        sessionRef,
        observedAt: now(),
        turnRef: expectedTurnRef(sessionRef, turn),
        stepRef: `${sessionRef}/turn:${turn}/step:${step}`,
        failureClass: failure.code,
        failureDigest: options.digest(failure),
      });
      return next();
    }));

    disposers.push(ctx.on("agent/turn-stopping", ({ agent, turn }) => {
      const sessionRef = sessionRefOf(agent);
      report({
        type: "turn.completion_requested",
        eventRef: nextLiveRef(sessionRef, "turn-stopping"),
        sessionRef,
        observedAt: now(),
        turnRef: expectedTurnRef(sessionRef, turn),
      });
    }));

    let disposed = false;
    return {
      drain: () => dispatcher.drain(),
      async dispose() {
        if (disposed) return;
        disposed = true;
        for (let index = disposers.length - 1; index >= 0; index -= 1) {
          disposers[index]?.();
        }
        dispatcher.close();
        await dispatcher.drain();
      },
    };
  };

  const registerTurnStopping = (handler: TurnStoppingHandler): Disposable => {
    const dispose = ctx.on("agent/turn-stopping", async ({ agent, turn, signal }) => {
      const sessionRef = sessionRefOf(agent);
      const request: CompletionBoundaryRequest = {
        sessionRef,
        turnRef: expectedTurnRef(sessionRef, turn),
        signal,
      };
      await handler(request);
    });
    return asDisposable(dispose);
  };

  const requestApproval = async (request: ApprovalRequest): Promise<ApprovalDecision> => {
    const approval = ctx.get("approval");
    if (approval === undefined) return "UNAVAILABLE";
    const agent = requireLiveAgent(request.sessionRef);
    const outcome = await approval.request({
      agent,
      toolName: request.toolName,
      ...(request.callRef === undefined ? {} : { callId: CallId(request.callRef) }),
      ...(request.reason === undefined ? {} : { reason: request.reason }),
      ...(request.signal === undefined ? {} : { signal: request.signal }),
    });
    return normalizeApprovalOutcome(outcome);
  };

  const steerCompletion = async (request: CompletionSteerRequest): Promise<void> => {
    const agent = requireLiveAgent(request.sessionRef);
    const turn = openTurn(agent.session);
    if (turn === undefined || expectedTurnRef(request.sessionRef, turn) !== request.turnRef) {
      throw dshAdapterError(
        "HARNESS_AGENT_NOT_LIVE",
        `completion steering requires the matching open Harness turn ${request.turnRef}`,
      );
    }
    agent.steer(createUserMessage({
      content: [{
        type: "text",
        text: `Safe-runtime verification requires another step (retry ${request.retryOrdinal}): ${request.reason}`,
      }],
      source: { kind: "plugin", plugin: "dsh-safe-runtime" },
    }));
  };

  return Object.freeze({
    adapterName: "deepseek-harness" as const,
    adapterVersion: "0.1.0-alpha.0",
    harnessVersion: DSH_TESTED_BASELINE.version,
    harnessCommit: DSH_TESTED_BASELINE.commit,
    features: DSH_RC5_FEATURES,
    observe,
    registerToolPolicy,
    registerMonotonicToolGuard,
    registerTurnStopping,
    requestApproval,
    steerCompletion,
  });
}
