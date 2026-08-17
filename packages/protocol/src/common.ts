export type GuaranteeLevel =
  | "advisory"
  | "tool-enforced"
  | "provider-enforced"
  | "process-isolated";

export type SubjectKind =
  | "agent"
  | "subagent"
  | "tool"
  | "plugin"
  | "system"
  | "verifier"
  | "human"
  | "service";

export interface Subject {
  readonly kind: SubjectKind;
  readonly id: string;
  readonly parent?: string | null;
  readonly sessionRef?: string;
}

export type ResourceScheme =
  | "workspace"
  | "hostfs"
  | "process"
  | "network"
  | "secret"
  | "session"
  | "config"
  | "external";

export interface CapabilityResource {
  readonly scheme: ResourceScheme;
  readonly locator: string;
  /** Adapter/provider identity. Opaque to the protocol core. */
  readonly providerIdentity?: string;
}

export interface AuthorizationRef {
  readonly kind: "policy" | "approval" | "lease" | "system";
  readonly ref: string;
}

export type Digest = `${"sha256" | "sha512"}:${string}`;
