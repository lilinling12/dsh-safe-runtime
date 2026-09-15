import {
  LEASE_TTL_PROFILE,
  type LeaseTtlEvaluationResult,
  type LeaseTtlFailure,
  type LeaseTtlFailureReason,
  type LeaseTtlStage,
} from "./lease-ttl-types.js";

const INPUT_KEYS = new Set(["profile", "issuedAt", "expiresAt", "observedAt"]);
const RFC3339_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/;

interface ParsedInstant {
  readonly utcSecond: number;
  readonly leapSecond: boolean;
  readonly fraction: string;
}

type DataRead =
  | { readonly status: "DATA"; readonly value: unknown }
  | { readonly status: "MISSING" | "ACCESSOR" | "UNREADABLE" };

type Comparison = -1 | 0 | 1;

/**
 * Evaluate only the M4-030 time-window validity of an existing CapabilityLease.
 *
 * The function is intentionally synchronous and side-effect free. It never
 * reads host wall clock, parses via `Date`, consumes usage, checks revocation,
 * follows delegation, or turns time eligibility into authorization.
 */
export function evaluateCapabilityLeaseTtl(input: unknown): LeaseTtlEvaluationResult {
  if (!isRecord(input)) return fail("INPUT", "LEASE_TTL_INPUT_INVALID");

  const keys = ownKeys(input);
  if (keys === undefined || !hasExactRequiredKeys(keys, INPUT_KEYS)) {
    return fail("INPUT", "LEASE_TTL_INPUT_INVALID");
  }

  const profile = readData(input, "profile");
  if (profile.status !== "DATA" || profile.value !== LEASE_TTL_PROFILE) {
    return fail("INPUT", "LEASE_TTL_PROFILE_INVALID");
  }

  const issuedAtRead = readData(input, "issuedAt");
  if (issuedAtRead.status !== "DATA" || typeof issuedAtRead.value !== "string") {
    return fail("TIME", "LEASE_TTL_ISSUED_AT_INVALID");
  }
  const issuedAt = parseInstant(issuedAtRead.value);
  if (issuedAt === undefined) return fail("TIME", "LEASE_TTL_ISSUED_AT_INVALID");

  const expiresAtRead = readData(input, "expiresAt");
  if (expiresAtRead.status !== "DATA" || typeof expiresAtRead.value !== "string") {
    return fail("TIME", "LEASE_TTL_EXPIRES_AT_INVALID");
  }
  const expiresAt = parseInstant(expiresAtRead.value);
  if (expiresAt === undefined) return fail("TIME", "LEASE_TTL_EXPIRES_AT_INVALID");

  const observedAtRead = readData(input, "observedAt");
  if (observedAtRead.status !== "DATA" || typeof observedAtRead.value !== "string") {
    return fail("TIME", "LEASE_TTL_OBSERVED_AT_INVALID");
  }
  const observedAt = parseInstant(observedAtRead.value);
  if (observedAt === undefined) return fail("TIME", "LEASE_TTL_OBSERVED_AT_INVALID");

  if (compareInstant(issuedAt, expiresAt) >= 0) {
    return fail("TIME", "LEASE_TTL_WINDOW_INVALID");
  }

  if (compareInstant(observedAt, issuedAt) < 0) {
    return Object.freeze({
      status: "TIME_INELIGIBLE",
      reasonCode: "LEASE_TTL_NOT_YET_ACTIVE",
    });
  }

  if (compareInstant(observedAt, expiresAt) >= 0) {
    return Object.freeze({
      status: "TIME_INELIGIBLE",
      reasonCode: "LEASE_TTL_EXPIRED",
    });
  }

  return Object.freeze({ status: "TIME_ELIGIBLE", reasonCode: "LEASE_TTL_ACTIVE" });
}

/**
 * Parse the repository's accepted RFC3339-compatible timestamp lexical domain
 * into a deterministic ordering representation. Integer UTC seconds stay far
 * below Number's exact-integer limit for the four-digit year domain, while the
 * fractional component remains an exact digit string and is never rounded.
 */
function parseInstant(value: string): ParsedInstant | undefined {
  const match = RFC3339_PATTERN.exec(value);
  if (match === null) return undefined;

  const year = decimal(match[1]);
  const month = decimal(match[2]);
  const day = decimal(match[3]);
  const hour = decimal(match[4]);
  const minute = decimal(match[5]);
  const second = decimal(match[6]);
  if (
    year === undefined
    || month === undefined
    || day === undefined
    || hour === undefined
    || minute === undefined
    || second === undefined
    || month < 1
    || month > 12
    || day < 1
    || day > daysInMonth(year, month)
    || hour > 23
    || minute > 59
    || second > 60
  ) {
    return undefined;
  }

  const sign = match[8];
  let offsetSeconds = 0;
  if (sign !== undefined) {
    const offsetHour = decimal(match[9]);
    const offsetMinute = decimal(match[10]);
    if (
      (sign !== "+" && sign !== "-")
      || offsetHour === undefined
      || offsetMinute === undefined
      || offsetHour > 23
      || offsetMinute > 59
    ) {
      return undefined;
    }
    const magnitude = (offsetHour * 60 * 60) + (offsetMinute * 60);
    offsetSeconds = sign === "-" ? -magnitude : magnitude;
  }

  const dayIndex = daysBeforeYear(year) + daysBeforeMonth(year, month) + (day - 1);
  const localSecond = (dayIndex * 86_400) + (hour * 3_600) + (minute * 60) + second;

  return Object.freeze({
    utcSecond: localSecond - offsetSeconds,
    leapSecond: second === 60,
    fraction: match[7] ?? "",
  });
}

/**
 * Compare two parsed instants. A leap second shares the following nominal UTC
 * second as its integer ordering position but sorts before the ordinary `:00`
 * position at that second, matching Spec 0037's `:59 < :60 < next :00` rule.
 */
function compareInstant(left: ParsedInstant, right: ParsedInstant): Comparison {
  if (left.utcSecond < right.utcSecond) return -1;
  if (left.utcSecond > right.utcSecond) return 1;

  if (left.leapSecond !== right.leapSecond) {
    return left.leapSecond ? -1 : 1;
  }

  return compareFraction(left.fraction, right.fraction);
}

/** Compare decimal fractions exactly without padding, numeric conversion or precision loss. */
function compareFraction(left: string, right: string): Comparison {
  const width = Math.max(left.length, right.length);
  for (let index = 0; index < width; index += 1) {
    const leftDigit = index < left.length ? left.charCodeAt(index) - 48 : 0;
    const rightDigit = index < right.length ? right.charCodeAt(index) - 48 : 0;
    if (leftDigit < rightDigit) return -1;
    if (leftDigit > rightDigit) return 1;
  }
  return 0;
}

/** Number of Gregorian days in complete years `[0, year)`. */
function daysBeforeYear(year: number): number {
  return (year * 365)
    + Math.floor((year + 3) / 4)
    - Math.floor((year + 99) / 100)
    + Math.floor((year + 399) / 400);
}

function daysBeforeMonth(year: number, month: number): number {
  const leapAdjustment = isLeapYear(year) && month > 2 ? 1 : 0;
  switch (month) {
    case 1: return 0;
    case 2: return 31;
    case 3: return 59 + leapAdjustment;
    case 4: return 90 + leapAdjustment;
    case 5: return 120 + leapAdjustment;
    case 6: return 151 + leapAdjustment;
    case 7: return 181 + leapAdjustment;
    case 8: return 212 + leapAdjustment;
    case 9: return 243 + leapAdjustment;
    case 10: return 273 + leapAdjustment;
    case 11: return 304 + leapAdjustment;
    case 12: return 334 + leapAdjustment;
    default: return 0;
  }
}

function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function decimal(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    const digit = value.charCodeAt(index) - 48;
    if (digit < 0 || digit > 9) return undefined;
    result = (result * 10) + digit;
  }
  return result;
}

function fail(stage: LeaseTtlStage, reasonCode: LeaseTtlFailureReason): LeaseTtlFailure {
  return Object.freeze({ status: "FAIL_CLOSED", stage, reasonCode });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null) return false;
  try {
    return !Array.isArray(value);
  } catch {
    return false;
  }
}

function ownKeys(value: object): readonly PropertyKey[] | undefined {
  try {
    return Reflect.ownKeys(value);
  } catch {
    return undefined;
  }
}

function hasExactRequiredKeys(
  keys: readonly PropertyKey[],
  required: ReadonlySet<string>,
): boolean {
  return keys.length === required.size
    && keys.every(key => typeof key === "string" && required.has(key));
}

function readData(value: object, key: PropertyKey): DataRead {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) return { status: "MISSING" };
    if (!("value" in descriptor)) return { status: "ACCESSOR" };
    return { status: "DATA", value: descriptor.value };
  } catch {
    return { status: "UNREADABLE" };
  }
}
