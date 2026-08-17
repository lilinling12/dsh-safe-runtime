import type {
  AuthorizationRef,
  CapabilityResource,
  Digest,
  GuaranteeLevel,
  Subject,
} from "./common.js";

export type StandardCapability =
  | "fs.read"
  | "fs.stat"
  | "fs.list"
  | "fs.create"
  | "fs.write"
  | "fs.edit"
  | "fs.delete"
  | "fs.move"
  | "fs.link"
  | "process.resolve"
  | "process.exec"
  | "process.terminal"
  | "process.signal"
  | "net.resolve"
  | "net.connect"
  | "net.http.read"
  | "net.http.mutate"
  | "secret.reference"
  | "secret.use"
  | "secret.reveal"
  | "external.read"
  | "external.mutate"
  | "runtime.config.read"
  | "runtime.config.write"
  | "runtime.session.read"
  | "runtime.session.mutate"
  | "runtime.plugin.mount"
  | "runtime.plugin.unmount";

export type CapabilityName = StandardCapability | (string & {});

export interface RequestedLease {
  readonly ttlMs?: number;
  readonly maxUses?: number;
}

export interface CapabilityRequest {
  readonly apiVersion: "safe-runtime.dev/v1alpha1";
  readonly kind: "CapabilityRequest";
  readonly requestId: string;
  readonly subject: Subject;
  readonly sessionRef: string;
  readonly turnRef?: string;
  readonly actionRef: string;
  readonly capability: CapabilityName;
  readonly resource: CapabilityResource;
  readonly constraints?: Readonly<Record<string, unknown>>;
  readonly requestedLease?: RequestedLease;
  readonly reason?: string;
}

export type CapabilityDecisionEffect = "allow" | "deny" | "ask";

export interface CapabilityDecision {
  readonly apiVersion: "safe-runtime.dev/v1alpha1";
  readonly kind: "CapabilityDecision";
  readonly decisionId: string;
  readonly requestId: string;
  readonly effect: CapabilityDecisionEffect;
  readonly guaranteeLevel: GuaranteeLevel;
  readonly policyRef?: string;
  readonly matchedRuleRefs?: readonly string[];
  readonly reasonCode?: string;
  readonly reason?: string;
  readonly decidedAt: string;
}

export interface CapabilityLease {
  readonly apiVersion: "safe-runtime.dev/v1alpha1";
  readonly kind: "CapabilityLease";
  readonly leaseRef: string;
  readonly subjectRef: string;
  readonly parentLeaseRef?: string;
  readonly capability: CapabilityName;
  readonly resource: CapabilityResource;
  readonly constraints?: Readonly<Record<string, unknown>>;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly maxUses: number;
  readonly remainingUses: number;
  readonly authorization: AuthorizationRef;
}

export interface CapabilityReceipt {
  readonly apiVersion: "safe-runtime.dev/v1alpha1";
  readonly kind: "CapabilityReceipt";
  readonly receiptRef: string;
  readonly requestRef: string;
  readonly decisionRef: string;
  readonly leaseRef?: string;
  readonly effect: "allowed" | "denied" | "approval-required" | "error";
  readonly guaranteeLevel: GuaranteeLevel;
  readonly resourceDigest?: Digest;
  readonly argumentDigest?: Digest;
  readonly resultDigest?: Digest;
  readonly observedAt: string;
}
