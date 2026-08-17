import type { Digest, GuaranteeLevel } from "./common.js";
import type { CheckStatus, VerdictStatus } from "./acceptance.js";

export interface Claim {
  readonly claimRef: string;
  readonly kind: "completion" | "test-result" | "state-change" | "constraint" | "custom";
  readonly statement: string;
  readonly evidenceRefs: readonly string[];
}

export interface Evidence {
  readonly evidenceRef: string;
  readonly kind:
    | "tool-request"
    | "tool-result"
    | "command-execution"
    | "file-state"
    | "file-mutation"
    | "authorization"
    | "model-error"
    | "delegation"
    | "custom";
  readonly source: {
    readonly adapter: string;
    readonly eventRef: string;
  };
  readonly digest: Digest;
  readonly payloadRef?: string;
  readonly observedAt: string;
}

export interface VerificationCheck {
  readonly checkRef: string;
  readonly status: CheckStatus;
  readonly evidenceRefs: readonly string[];
  readonly message?: string;
}

export interface VerificationVerdict {
  readonly verdictRef: string;
  readonly status: VerdictStatus;
  readonly checkRefs: readonly string[];
  readonly reason?: string;
}

export interface EvidenceEpisode {
  readonly apiVersion: "safe-runtime.dev/v1alpha1";
  readonly kind: "EvidenceEpisode";
  readonly episodeRef: string;
  readonly adapter: {
    readonly name: string;
    readonly version: string;
    readonly guaranteeLevel?: GuaranteeLevel;
  };
  readonly session: {
    readonly sessionRef: string;
    readonly turnRefs?: readonly string[];
  };
  readonly task: {
    readonly taskRef: string;
    readonly description: string;
    readonly contractDigest?: Digest;
  };
  readonly claims: readonly Claim[];
  readonly evidence: readonly Evidence[];
  readonly checks: readonly VerificationCheck[];
  readonly verdict: VerificationVerdict;
}

export interface EvidenceRetentionProfile {
  readonly apiVersion: "safe-runtime.dev/v1alpha1";
  readonly kind: "EvidenceRetentionProfile";
  readonly metadata: { readonly name: string };
  readonly spec: {
    readonly rawPrompt: false;
    readonly rawSource: boolean;
    readonly rawStdout: boolean;
    readonly rawStderr: boolean;
    readonly environment: false;
    readonly secrets: false;
    readonly defaultTtlSeconds: number;
    readonly blobEncryptionRequired?: boolean;
  };
}
