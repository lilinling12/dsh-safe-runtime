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

interface SubjectIdentityBase {
  readonly id: string;
  readonly sessionRef?: string;
}

/**
 * A subagent always carries a concrete parent subject reference.
 *
 * This is the TypeScript projection of Core §5 and the M4-020 schema correction;
 * `null` is not a Parent Subject and must not be represented as a valid
 * subagent identity.
 */
export interface SubagentSubject extends SubjectIdentityBase {
  readonly kind: "subagent";
  readonly parent: string;
}

/**
 * Core v0.1 does not assign lineage semantics to `parent` for non-subagent
 * subjects. Preserve the existing optional/null protocol surface until a later
 * lineage/delegation profile narrows it normatively.
 */
export interface NonSubagentSubject extends SubjectIdentityBase {
  readonly kind: Exclude<SubjectKind, "subagent">;
  readonly parent?: string | null;
}

export type Subject = SubagentSubject | NonSubagentSubject;

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
