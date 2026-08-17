import type { Digest, Evidence } from "@dsh-safe/protocol";

import type { CorrelationRecord } from "./correlation.js";
import { dshAdapterError } from "./errors.js";

/**
 * Minimal durable correlation record written beside Harness session storage.
 * Storage, retention, hash chaining, and replay indexes belong to later
 * safe-runtime milestones; this M2 boundary only defines what may cross the
 * adapter persistence seam.
 */
export interface SidecarEvidenceRecord {
  readonly durableEventRef: string;
  readonly durableSequence: number;
  readonly sessionRef: string;
  readonly turnRef?: string;
  readonly stepRef?: string;
  readonly callRef?: string;
  readonly evidenceRef: string;
  readonly evidenceDigest: Digest;
}

export interface SidecarEvidenceSink {
  append(record: Readonly<SidecarEvidenceRecord>): void | Promise<void>;
}

function requiredNonEmpty(value: string, field: string): void {
  if (value.length === 0) {
    throw dshAdapterError(
      "INVALID_SIDECAR_EVIDENCE_CORRELATION",
      `sidecar ${field} must be a non-empty string`,
    );
  }
}

/**
 * Project a process-local correlation plus protocol evidence into the durable
 * sidecar shape. The projection is an allow-list by construction: in
 * particular, `processLocalTokenRef` is deliberately never copied.
 */
export function createSidecarEvidenceRecord(
  correlation: Readonly<CorrelationRecord>,
  evidence: Readonly<Pick<Evidence, "evidenceRef" | "source" | "digest">>,
): SidecarEvidenceRecord {
  requiredNonEmpty(correlation.sessionRef, "sessionRef");
  requiredNonEmpty(correlation.adapterEventRef, "durableEventRef");
  requiredNonEmpty(evidence.evidenceRef, "evidenceRef");

  const sequence = correlation.durableSequence;
  if (sequence === undefined || !Number.isSafeInteger(sequence) || sequence < 0) {
    throw dshAdapterError(
      "INVALID_SIDECAR_EVIDENCE_CORRELATION",
      "sidecar correlation requires a non-negative durable Harness event sequence",
    );
  }

  const expectedEventRef = `${correlation.sessionRef}/seq:${sequence}`;
  if (correlation.adapterEventRef !== expectedEventRef) {
    throw dshAdapterError(
      "INVALID_SIDECAR_EVIDENCE_CORRELATION",
      `sidecar durable event reference ${correlation.adapterEventRef} does not match ${expectedEventRef}`,
    );
  }

  if (evidence.source.adapter !== "deepseek-harness") {
    throw dshAdapterError(
      "INVALID_SIDECAR_EVIDENCE_CORRELATION",
      `sidecar evidence adapter must be deepseek-harness, received ${evidence.source.adapter}`,
    );
  }
  if (evidence.source.eventRef !== correlation.adapterEventRef) {
    throw dshAdapterError(
      "INVALID_SIDECAR_EVIDENCE_CORRELATION",
      `sidecar evidence event reference ${evidence.source.eventRef} does not match ${correlation.adapterEventRef}`,
    );
  }

  return Object.freeze({
    durableEventRef: correlation.adapterEventRef,
    durableSequence: sequence,
    sessionRef: correlation.sessionRef,
    ...(correlation.turnRef === undefined ? {} : { turnRef: correlation.turnRef }),
    ...(correlation.stepRef === undefined ? {} : { stepRef: correlation.stepRef }),
    ...(correlation.callRef === undefined ? {} : { callRef: correlation.callRef }),
    evidenceRef: evidence.evidenceRef,
    evidenceDigest: evidence.digest,
  });
}
