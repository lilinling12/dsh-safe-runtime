export const TCK_FIXTURE_API_VERSION = "safe-runtime.dev/tck-fixture/v1alpha1" as const;

export const TCK_PROFILES = [
  "AUTH",
  "TX",
  "VERIFY",
  "EVIDENCE",
  "ADAPTER_DSH",
  "FULL",
] as const;

export const TCK_RUNNER_STATUSES = [
  "PASS",
  "FAIL",
  "UNSUPPORTED",
  "ERROR",
] as const;

export type TckProfile = (typeof TCK_PROFILES)[number];
export type TckRunnerStatus = (typeof TCK_RUNNER_STATUSES)[number];

export type TckJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly TckJsonValue[]
  | { readonly [key: string]: TckJsonValue };

export interface TckDeterminism {
  readonly seed: number;
  readonly clock: {
    readonly startUnixMs: number;
    readonly tickMs: number;
  };
}

/**
 * TypeScript projection of Spec 0004 / tck-fixture.schema.json.
 * The spec and JSON Schema are authoritative; this type must follow them and
 * must never introduce TypeScript-only fixture semantics.
 */
export interface TckFixtureV1Alpha1 {
  readonly apiVersion: typeof TCK_FIXTURE_API_VERSION;
  readonly id: string;
  readonly profile: TckProfile;
  readonly description: string;
  readonly determinism: TckDeterminism;
  readonly stimulus: TckJsonValue;
  readonly expect: TckJsonValue;
}
