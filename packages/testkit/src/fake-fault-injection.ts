import type { TckJsonValue } from "./tck-contract.js";

export const FAKE_FAULT_ERROR_CODES = [
  "FAKE_FAULT_INVALID_CONFIG",
  "FAKE_FAULT_INVALID_PROBE",
  "FAKE_FAULT_UNKNOWN_POINT",
  "FAKE_FAULT_UNEXPECTED_PROBE",
  "FAKE_FAULT_SCRIPT_EXHAUSTED",
] as const;

export type FakeFaultErrorCode = (typeof FAKE_FAULT_ERROR_CODES)[number];

export class FakeFaultInjectionError extends Error {
  readonly code: FakeFaultErrorCode;

  constructor(code: FakeFaultErrorCode, message: string) {
    super(message);
    this.name = "FakeFaultInjectionError";
    this.code = code;
  }
}

export interface FakeFaultProbe {
  readonly pointRef: string;
  readonly context: TckJsonValue;
}

export interface FakeFaultDescriptor {
  readonly faultRef: string;
  readonly faultCode: string;
  readonly detail?: TckJsonValue;
}

export type FakeFaultDirective =
  | { readonly kind: "NO_FAULT" }
  | { readonly kind: "INJECT_FAULT"; readonly fault: Readonly<FakeFaultDescriptor> };

export interface FakeFaultObservation {
  readonly ordinal: number;
  readonly probe: Readonly<FakeFaultProbe>;
  readonly directive: FakeFaultDirective;
}

type ParsedScriptEntry = Readonly<{
  probe: Readonly<FakeFaultProbe>;
  directive: FakeFaultDirective;
}>;

function isOrdinaryRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) && Object.getOwnPropertySymbols(value).length === 0;
}

function requireRecord(
  value: unknown,
  label: string,
  code: FakeFaultErrorCode,
): Record<string, unknown> {
  if (!isOrdinaryRecord(value)) {
    throw new FakeFaultInjectionError(code, `${label} must be an ordinary object`);
  }
  return value;
}

function requireArray(
  value: unknown,
  label: string,
  code: FakeFaultErrorCode,
): readonly unknown[] {
  if (!Array.isArray(value) || Object.keys(value).length !== value.length) {
    throw new FakeFaultInjectionError(code, `${label} must be a dense array`);
  }
  return value;
}

function requireNonEmptyString(
  value: unknown,
  label: string,
  code: FakeFaultErrorCode,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FakeFaultInjectionError(code, `${label} must be a non-empty string`);
  }
  return value;
}

function validateExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
  code: FakeFaultErrorCode,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new FakeFaultInjectionError(code, `${label} contains unsupported or missing fields`);
  }
}

function validateAllowedKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
  code: FakeFaultErrorCode,
): void {
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      throw new FakeFaultInjectionError(code, `${label} is missing ${key}`);
    }
  }
  const allowed = new Set([...required, ...optional]);
  if (Object.keys(value).some(key => !allowed.has(key))) {
    throw new FakeFaultInjectionError(code, `${label} contains unsupported fields`);
  }
}

/**
 * Validate, clone, and freeze caller-provided JSON in one traversal.
 *
 * Direct TypeScript callers are not constrained by JSON parsing, so rejecting
 * cycles, sparse arrays, symbol-keyed objects, non-finite numbers, and exotic
 * prototypes is part of keeping the portable contract honest rather than an
 * implementation convenience.
 */
function cloneJson(
  value: unknown,
  label: string,
  code: FakeFaultErrorCode,
  ancestors = new WeakSet<object>(),
): TckJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new FakeFaultInjectionError(code, `${label} must contain finite JSON numbers`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) {
      throw new FakeFaultInjectionError(code, `${label} must contain dense JSON arrays`);
    }
    if (ancestors.has(value)) {
      throw new FakeFaultInjectionError(code, `${label} must not contain cycles`);
    }
    ancestors.add(value);
    const copy = Object.freeze(value.map((entry, index) => cloneJson(entry, `${label}[${index}]`, code, ancestors)));
    ancestors.delete(value);
    return copy;
  }
  if (isOrdinaryRecord(value)) {
    if (ancestors.has(value)) {
      throw new FakeFaultInjectionError(code, `${label} must not contain cycles`);
    }
    ancestors.add(value);
    const entries = Object.entries(value).map(([key, entry]) => [
      key,
      cloneJson(entry, `${label}.${key}`, code, ancestors),
    ] as const);
    ancestors.delete(value);
    return Object.freeze(Object.fromEntries(entries)) as TckJsonValue;
  }
  throw new FakeFaultInjectionError(code, `${label} must be portable JSON`);
}

function parseProbe(
  value: unknown,
  code: FakeFaultErrorCode,
  label = "fault probe",
): Readonly<FakeFaultProbe> {
  const record = requireRecord(value, label, code);
  validateExactKeys(record, ["context", "pointRef"], label, code);
  return Object.freeze({
    pointRef: requireNonEmptyString(record.pointRef, `${label}.pointRef`, code),
    context: cloneJson(record.context, `${label}.context`, code),
  });
}

function parseFaultDescriptor(value: unknown, label: string): Readonly<FakeFaultDescriptor> {
  const code = "FAKE_FAULT_INVALID_CONFIG" as const;
  const record = requireRecord(value, label, code);
  validateAllowedKeys(record, ["faultCode", "faultRef"], ["detail"], label, code);
  const base = {
    faultRef: requireNonEmptyString(record.faultRef, `${label}.faultRef`, code),
    faultCode: requireNonEmptyString(record.faultCode, `${label}.faultCode`, code),
  };
  return Object.freeze(Object.hasOwn(record, "detail")
    ? { ...base, detail: cloneJson(record.detail, `${label}.detail`, code) }
    : base);
}

function parseDirective(value: unknown, label: string): FakeFaultDirective {
  const code = "FAKE_FAULT_INVALID_CONFIG" as const;
  const record = requireRecord(value, label, code);
  if (record.kind === "NO_FAULT") {
    validateExactKeys(record, ["kind"], label, code);
    return Object.freeze({ kind: "NO_FAULT" });
  }
  if (record.kind === "INJECT_FAULT") {
    validateExactKeys(record, ["fault", "kind"], label, code);
    return Object.freeze({
      kind: "INJECT_FAULT",
      fault: parseFaultDescriptor(record.fault, `${label}.fault`),
    });
  }
  throw new FakeFaultInjectionError(code, `${label}.kind is unsupported`);
}

function stableJson(value: TckJsonValue): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key] as TckJsonValue)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function probeKey(probe: Readonly<FakeFaultProbe>): string {
  return stableJson({ pointRef: probe.pointRef, context: probe.context });
}

function cloneProbe(probe: Readonly<FakeFaultProbe>): Readonly<FakeFaultProbe> {
  return Object.freeze({
    pointRef: probe.pointRef,
    context: cloneJson(probe.context, "fault probe context", "FAKE_FAULT_INVALID_PROBE"),
  });
}

function cloneDirective(directive: FakeFaultDirective): FakeFaultDirective {
  if (directive.kind === "NO_FAULT") {
    return Object.freeze({ kind: "NO_FAULT" });
  }
  const fault = directive.fault;
  return Object.freeze({
    kind: "INJECT_FAULT",
    fault: Object.freeze({
      faultRef: fault.faultRef,
      faultCode: fault.faultCode,
      ...(fault.detail === undefined
        ? {}
        : { detail: cloneJson(fault.detail, "fault detail", "FAKE_FAULT_INVALID_CONFIG") }),
    }),
  });
}

/**
 * Deterministic TypeScript projection of Spec 0008.
 *
 * This service selects test directives only. It deliberately never throws the
 * scripted fault, sleeps, terminates processes, mutates files, or touches host
 * state: enacting a failure here would silently turn test-control data into
 * production-like runtime semantics that M3-007 does not authorize.
 */
export class FakeFaultInjectionService {
  readonly #points: ReadonlySet<string>;
  readonly #script: readonly ParsedScriptEntry[];
  readonly #observations: FakeFaultObservation[] = [];
  #cursor = 0;

  constructor(configValue: unknown) {
    const code = "FAKE_FAULT_INVALID_CONFIG" as const;
    const config = requireRecord(configValue, "fault config", code);
    validateExactKeys(config, ["points", "script"], "fault config", code);

    const points = new Set<string>();
    for (const [index, rawPoint] of requireArray(config.points, "fault points", code).entries()) {
      const point = requireNonEmptyString(rawPoint, `fault point ${index}`, code);
      if (points.has(point)) {
        throw new FakeFaultInjectionError(code, `duplicate fault point: ${point}`);
      }
      points.add(point);
    }
    this.#points = points;

    this.#script = Object.freeze(requireArray(config.script, "fault script", code).map((rawEntry, index) => {
      const entry = requireRecord(rawEntry, `fault script entry ${index}`, code);
      validateExactKeys(entry, ["directive", "probe"], `fault script entry ${index}`, code);
      const probe = parseProbe(entry.probe, code, `fault script entry ${index}.probe`);
      if (!points.has(probe.pointRef)) {
        throw new FakeFaultInjectionError(code, `fault script entry ${index} references undeclared point`);
      }
      return Object.freeze({
        probe,
        directive: parseDirective(entry.directive, `fault script entry ${index}.directive`),
      });
    }));
  }

  probe(probeValue: unknown): FakeFaultDirective {
    const probe = parseProbe(probeValue, "FAKE_FAULT_INVALID_PROBE");
    if (!this.#points.has(probe.pointRef)) {
      throw new FakeFaultInjectionError("FAKE_FAULT_UNKNOWN_POINT", `unknown fault point: ${probe.pointRef}`);
    }

    const scripted = this.#script[this.#cursor];
    if (scripted === undefined) {
      throw new FakeFaultInjectionError("FAKE_FAULT_SCRIPT_EXHAUSTED", "fault script is exhausted");
    }
    if (probeKey(probe) !== probeKey(scripted.probe)) {
      throw new FakeFaultInjectionError("FAKE_FAULT_UNEXPECTED_PROBE", "fault probe does not match the next scripted probe");
    }

    const directive = cloneDirective(scripted.directive);
    this.#observations.push(Object.freeze({
      ordinal: this.#cursor + 1,
      probe: cloneProbe(probe),
      directive,
    }));
    this.#cursor += 1;
    return cloneDirective(directive);
  }

  observations(): readonly Readonly<FakeFaultObservation>[] {
    return this.#observations.map(observation => Object.freeze({
      ordinal: observation.ordinal,
      probe: cloneProbe(observation.probe),
      directive: cloneDirective(observation.directive),
    }));
  }

  remaining(): number {
    return this.#script.length - this.#cursor;
  }
}
