export const TCK_APPROVAL_DECISIONS = [
  "ALLOWED_ONCE",
  "REJECTED",
  "CANCELLED",
  "UNAVAILABLE",
] as const;

export type TckApprovalDecision = (typeof TCK_APPROVAL_DECISIONS)[number];

export interface FakeApprovalRequest {
  readonly requestRef: string;
  readonly actionRef: string;
  readonly reason?: string;
}

export interface FakeApprovalObservation {
  readonly ordinal: number;
  readonly request: Readonly<FakeApprovalRequest>;
  readonly decision: TckApprovalDecision;
}

export const FAKE_APPROVAL_ERROR_CODES = [
  "FAKE_APPROVAL_INVALID_SCRIPT",
  "FAKE_APPROVAL_INVALID_REQUEST",
  "FAKE_APPROVAL_SCRIPT_EXHAUSTED",
] as const;

export type FakeApprovalErrorCode = (typeof FAKE_APPROVAL_ERROR_CODES)[number];

export class FakeApprovalError extends Error {
  readonly code: FakeApprovalErrorCode;

  constructor(code: FakeApprovalErrorCode, message: string) {
    super(message);
    this.name = "FakeApprovalError";
    this.code = code;
  }
}

function isApprovalDecision(value: unknown): value is TckApprovalDecision {
  return typeof value === "string" && (TCK_APPROVAL_DECISIONS as readonly string[]).includes(value);
}

function assertNonEmptyString(value: string, field: "requestRef" | "actionRef"): void {
  if (value.trim().length === 0) {
    throw new FakeApprovalError(
      "FAKE_APPROVAL_INVALID_REQUEST",
      `${field} must be a non-empty string`,
    );
  }
}

function copyRequest(request: Readonly<FakeApprovalRequest>): Readonly<FakeApprovalRequest> {
  const copy: FakeApprovalRequest = request.reason === undefined
    ? { requestRef: request.requestRef, actionRef: request.actionRef }
    : { requestRef: request.requestRef, actionRef: request.actionRef, reason: request.reason };
  return Object.freeze(copy);
}

/**
 * TypeScript projection of Spec 0005.
 *
 * This fake is deterministic test infrastructure only. It does not implement
 * authorization policy, approval persistence, Harness integration, or user UI.
 */
export class FakeApprovalService {
  readonly #script: readonly TckApprovalDecision[];
  readonly #observations: FakeApprovalObservation[] = [];
  #cursor = 0;

  constructor(script: readonly unknown[]) {
    const validated = script.map((decision, index) => {
      if (!isApprovalDecision(decision)) {
        throw new FakeApprovalError(
          "FAKE_APPROVAL_INVALID_SCRIPT",
          `approval script entry ${index} is not a supported decision`,
        );
      }
      return decision;
    });

    this.#script = Object.freeze(validated);
  }

  request(request: Readonly<FakeApprovalRequest>): TckApprovalDecision {
    assertNonEmptyString(request.requestRef, "requestRef");
    assertNonEmptyString(request.actionRef, "actionRef");
    if (request.reason !== undefined && typeof request.reason !== "string") {
      throw new FakeApprovalError(
        "FAKE_APPROVAL_INVALID_REQUEST",
        "reason must be a string when present",
      );
    }

    const decision = this.#script[this.#cursor];
    if (decision === undefined) {
      throw new FakeApprovalError(
        "FAKE_APPROVAL_SCRIPT_EXHAUSTED",
        "approval script is exhausted",
      );
    }

    const observation: FakeApprovalObservation = Object.freeze({
      ordinal: this.#cursor + 1,
      request: copyRequest(request),
      decision,
    });
    this.#observations.push(observation);
    this.#cursor += 1;
    return decision;
  }

  observations(): readonly FakeApprovalObservation[] {
    return this.#observations.map(observation => Object.freeze({
      ordinal: observation.ordinal,
      request: copyRequest(observation.request),
      decision: observation.decision,
    }));
  }
}
