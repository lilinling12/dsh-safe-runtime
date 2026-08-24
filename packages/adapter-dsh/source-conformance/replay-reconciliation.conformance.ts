import { afterEach, beforeEach, describe, expect, it } from "vitest";
import AgentRegistry from "@deepseek-ai/dsh-agent";
import { CallId, createMessage } from "@deepseek-ai/dsh-llm";
import SessionStore, {
  Session,
  SessionId,
  TOOL_OUTCOME_UNKNOWN,
  interruptedTurnClosers,
  type SessionEvent,
} from "@deepseek-ai/dsh-session";
import ApprovalService, { type ApprovalOutcome } from "@deepseek-ai/dsh-user-approval";

import { createDshRc5Adapter } from "../src/binding.js";
import {
  createSidecarEvidenceRecord,
  reconcileReplayEvidence,
  type ReplayDurableFact,
} from "../src/index.js";
import type { RuntimeEvent } from "../src/runtime-events.js";
import {
  createAgentFixture,
  createHarnessTestScope,
  type HarnessTestScope,
} from "./harness-runtime.js";

function digest(value: unknown): string {
  return `test:${JSON.stringify(value)}`;
}

function durableFact(sessionRef: string, event: Readonly<SessionEvent>): ReplayDurableFact {
  return {
    sessionRef,
    durableSequence: event.seq,
    durableEventRef: `${sessionRef}/seq:${event.seq}`,
    eventDigest: digest(event),
  };
}

describe("DeepSeek Harness rc5 replay reconciliation", () => {
  let harness: HarnessTestScope;

  beforeEach(async () => {
    harness = await createHarnessTestScope();
  });

  afterEach(async () => {
    await harness.dispose();
  });

  it("reconciles a real seeded snapshot with intentional live overlap and a contiguous tail", async () => {
    await harness.ctx.plugin(SessionStore);
    const ctx = await harness.inject(["sessions"]);

    const seedSource = Session.create(SessionId("replay-seed-source"));
    seedSource.append("turn/start", { turn: 1 });
    seedSource.append("turn/end", { turn: 1, reason: { kind: "completed" } });
    const seed = seedSource.events;

    const liveEvents: SessionEvent[] = [];
    ctx.on("session/event", (session, event) => {
      if (String(session.id) === "replay-overlap-real") liveEvents.push(event);
    });

    const session = ctx.sessions.create(SessionId("replay-overlap-real"), { seed });

    // Constructor replay and its durable end-seed marker precede store attachment,
    // so neither may masquerade as a live publication.
    expect(liveEvents).toEqual([]);
    expect(session.firstLiveSeq).toBe(seed.length);
    expect(session.events[session.firstLiveSeq]?.type).toBe("session/end-seed");
    expect(session.seq).toBe(seed.length + 1);

    const overlapping = session.append("turn/start", { turn: 2 });
    expect(liveEvents.map(event => event.seq)).toEqual([overlapping.seq]);

    // Snapshot after listener registration and the first live append. The first
    // live fact is now intentionally present in both channels.
    const snapshot = session.events;
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(snapshot.at(-1)?.seq).toBe(overlapping.seq);

    const tail = session.append("turn/end", { turn: 2, reason: { kind: "completed" } });
    expect(liveEvents.map(event => event.seq)).toEqual([overlapping.seq, tail.seq]);

    const overlappingRef = `${session.id}/seq:${overlapping.seq}`;
    const sidecar = createSidecarEvidenceRecord(
      {
        sessionRef: String(session.id),
        adapterEventRef: overlappingRef,
        durableSequence: overlapping.seq,
        turnRef: `${session.id}/turn:2`,
      },
      {
        evidenceRef: "evidence:replay-overlap-real",
        source: {
          adapter: "deepseek-harness",
          eventRef: overlappingRef,
        },
        digest: "digest:evidence:replay-overlap-real",
      },
    );

    const result = reconcileReplayEvidence({
      sessionRef: String(session.id),
      snapshot: snapshot.map(event => durableFact(String(session.id), event)),
      live: liveEvents.map(event => durableFact(String(session.id), event)),
      sidecar: [sidecar],
    });

    expect(result.kind).toBe("REPLAY_RECONCILED");
    if (result.kind !== "REPLAY_RECONCILED") throw new Error("unexpected replay conflict");
    expect(result.nextDurableSequence).toBe(tail.seq + 1);
    expect(result.durableFacts.map(fact => fact.durableSequence)).toEqual(
      Array.from({ length: tail.seq + 1 }, (_entry, index) => index),
    );
    expect(result.durableFacts.filter(fact => fact.durableSequence === overlapping.seq)).toHaveLength(1);
    expect(result.evidence).toEqual([sidecar]);
  });

  it("preserves a real durable approval pair and its sidecar anchor across reconstruction", async () => {
    await harness.ctx.plugin(SessionStore);
    await harness.ctx.plugin(AgentRegistry);
    await harness.ctx.plugin(ApprovalService);
    const ctx = await harness.inject(["sessions", "agents", "approval"]);
    const session = ctx.sessions.create(SessionId("replay-approval-real"));
    session.append("turn/start", { turn: 1 });
    ctx.agents.register(createAgentFixture(ctx, session));
    ctx.on("approval/request", () => Promise.resolve<ApprovalOutcome>("allowed-once"));

    const adapter = createDshRc5Adapter(ctx, { digest });
    await expect(adapter.requestApproval({
      sessionRef: String(session.id),
      callRef: "call:replay-approval-real",
      toolName: "write",
      reason: "replay durable approval proof",
    })).resolves.toBe("ALLOWED_ONCE");
    session.append("turn/end", { turn: 1, reason: { kind: "completed" } });

    const originalAsked = session.events.find(event => event.type === "approval/asked");
    const originalDecided = session.events.find(event => event.type === "approval/decided");
    if (originalAsked?.type !== "approval/asked" || originalDecided?.type !== "approval/decided") {
      throw new Error("real approval audit pair was not persisted");
    }
    expect(originalAsked.data.callId).toBe(CallId("call:replay-approval-real"));
    expect(originalDecided.data.id).toBe(originalAsked.data.id);

    const reconstructed = Session.create(session.id, session.events);
    expect(reconstructed.firstLiveSeq).toBe(session.events.length);
    const replayedAsked = reconstructed.events.find(event => event.seq === originalAsked.seq);
    const replayedDecided = reconstructed.events.find(event => event.seq === originalDecided.seq);
    expect(replayedAsked?.type).toBe("approval/asked");
    expect(replayedDecided?.type).toBe("approval/decided");
    if (replayedAsked?.type !== "approval/asked" || replayedDecided?.type !== "approval/decided") {
      throw new Error("reconstructed approval audit pair is missing");
    }
    expect(replayedDecided.data.id).toBe(replayedAsked.data.id);
    expect(replayedDecided.data.outcome).toBe("allowed-once");

    const decidedRef = `${reconstructed.id}/seq:${replayedDecided.seq}`;
    const sidecar = createSidecarEvidenceRecord(
      {
        sessionRef: String(reconstructed.id),
        adapterEventRef: decidedRef,
        durableSequence: replayedDecided.seq,
        callRef: "call:replay-approval-real",
      },
      {
        evidenceRef: `evidence:approval:${String(replayedDecided.data.id)}`,
        source: { adapter: "deepseek-harness", eventRef: decidedRef },
        digest: "digest:evidence:approval-replay",
      },
    );

    const result = reconcileReplayEvidence({
      sessionRef: String(reconstructed.id),
      snapshot: reconstructed.events.map(event => durableFact(String(reconstructed.id), event)),
      live: [],
      sidecar: [sidecar],
    });
    expect(result.kind).toBe("REPLAY_RECONCILED");
    if (result.kind !== "REPLAY_RECONCILED") throw new Error("unexpected approval replay conflict");
    expect(result.evidence).toEqual([sidecar]);
    expect(result.durableFacts[replayedAsked.seq]?.durableEventRef)
      .toBe(`${reconstructed.id}/seq:${replayedAsked.seq}`);
    expect(result.durableFacts[replayedDecided.seq]?.durableEventRef).toBe(decidedRef);
  });

  it("keeps crash-repair TOOL_OUTCOME_UNKNOWN as opaque durable history, not live tool.completed authority", async () => {
    await harness.ctx.plugin(SessionStore);
    const ctx = await harness.inject(["sessions"]);

    const callId = CallId("call:crash-outcome-unknown");
    const interrupted: SessionEvent[] = [
      { type: "turn/start", seq: 0, time: 0, data: { turn: 1 } },
      { type: "step/start", seq: 1, time: 1, data: { turn: 1, step: 1 } },
      {
        type: "assistant/message",
        seq: 2,
        time: 2,
        data: {
          turn: 1,
          step: 1,
          message: createMessage({
            role: "assistant",
            content: [{
              type: "tool-call",
              id: callId,
              name: "mutate",
              arguments: "{}",
            }],
            source: { kind: "model", provider: "test", model: "test" },
          }),
        },
        surfaceOp: "append",
      },
      {
        type: "tool/call",
        seq: 3,
        time: 3,
        data: {
          turn: 1,
          step: 1,
          callId,
          name: "mutate",
          arguments: "{}",
        },
      },
    ];
    const closers = interruptedTurnClosers(interrupted);
    expect(closers.map(event => event.type)).toEqual(["tool/result", "step/end", "turn/end"]);
    const repairedToolResult = closers[0];
    expect(repairedToolResult?.type).toBe("tool/result");
    if (repairedToolResult?.type !== "tool/result") {
      throw new Error("crash repair did not synthesize a tool result");
    }
    expect(repairedToolResult.data.error?.code).toBe(TOOL_OUTCOME_UNKNOWN);

    const repairedLog = [...interrupted, ...closers];
    // Public Session construction validates that the repaired prefix is itself
    // acceptable durable replay input before the adapter sees it.
    const detached = Session.create(SessionId("replay-crash-detached"), repairedLog);
    expect(detached.events[repairedToolResult.seq]?.type).toBe("tool/result");

    const observed: RuntimeEvent[] = [];
    const adapter = createDshRc5Adapter(ctx, { digest });
    const observation = adapter.observe({ accept: event => { observed.push(event); } });
    const live = ctx.sessions.create(SessionId("replay-crash-live"), { seed: repairedLog });
    await observation.drain();

    // Seed/recovery history is not a live publication channel. In particular,
    // the synthetic durable tool/result cannot manufacture M3-013 final-result
    // authority or a normalized tool.completed event.
    expect(observed).toEqual([]);
    expect(observed.some(event => event.type === "tool.completed")).toBe(false);

    const result = reconcileReplayEvidence({
      sessionRef: String(live.id),
      snapshot: live.events.map(event => durableFact(String(live.id), event)),
      live: [],
      sidecar: [],
    });
    expect(result.kind).toBe("REPLAY_RECONCILED");
    if (result.kind !== "REPLAY_RECONCILED") throw new Error("unexpected crash replay conflict");
    expect(result.durableFacts[repairedToolResult.seq]?.durableSequence).toBe(repairedToolResult.seq);

    // A later ordinary live durable event still reaches the observer, proving
    // absence above came from the replay/live authority boundary rather than a
    // dead observation pipeline.
    live.append("turn/start", { turn: 2 });
    await observation.drain();
    expect(observed.map(event => event.type)).toEqual(["turn.started"]);
    expect(observed.some(event => event.type === "tool.completed")).toBe(false);
    await observation.dispose();
  });
});
