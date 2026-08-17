export type AcceptanceCheckType =
  | "command"
  | "workspace-diff"
  | "rule"
  | "external";

export interface AcceptanceCheck {
  readonly id: string;
  readonly type: AcceptanceCheckType;
  readonly required: boolean;
  readonly command?: readonly string[];
  readonly timeoutMs?: number;
  readonly expect?: Readonly<Record<string, unknown>>;
  readonly allow?: readonly string[];
  readonly deny?: readonly string[];
  readonly rule?: string;
}

export interface AcceptanceContract {
  readonly apiVersion: "safe-runtime.dev/v1alpha1";
  readonly kind: "AcceptanceContract";
  readonly metadata: { readonly name: string };
  readonly spec: {
    readonly completionPolicy: "all-required" | "any-required";
    readonly checks: readonly AcceptanceCheck[];
    readonly onFailure: {
      readonly action: "steer" | "block" | "report";
      readonly maxRetries: number;
      readonly afterExhaustion: "blocked" | "failed";
    };
  };
}

export type CheckStatus = "pass" | "fail" | "error" | "skipped";
export type VerdictStatus =
  | "verified"
  | "failed"
  | "incomplete"
  | "invalid"
  | "blocked"
  | "error";

export interface CheckResult {
  readonly apiVersion: "safe-runtime.dev/v1alpha1";
  readonly kind: "CheckResult";
  readonly checkResultRef: string;
  readonly checkRef: string;
  readonly status: CheckStatus;
  readonly evidenceRefs: readonly string[];
  readonly message?: string;
  readonly startedAt: string;
  readonly completedAt: string;
}

export interface AcceptanceVerdict {
  readonly apiVersion: "safe-runtime.dev/v1alpha1";
  readonly kind: "AcceptanceVerdict";
  readonly verdictRef: string;
  readonly status: Uppercase<VerdictStatus>;
  readonly requiredCheckRefs: readonly string[];
  readonly checkResultRefs: readonly string[];
  readonly reasonCode?: string;
  readonly reason?: string;
  readonly decidedAt: string;
}
