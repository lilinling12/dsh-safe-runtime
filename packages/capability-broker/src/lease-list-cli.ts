import { evaluateCapabilityLeaseTtl } from "./lease-ttl.js";
import { listCapabilityLeases } from "./lease-listing.js";
import {
  LEASE_LISTING_PROFILE,
  type LeaseInventoryStore,
  type LeaseListingFailure,
  type LeaseListingResult,
} from "./lease-listing-types.js";

export type LeaseListOutputFormat = "HUMAN" | "JSON";

export interface LeaseListClock {
  now(): unknown;
}

export type LeaseListCommandResult =
  | {
      readonly status: "SUCCESS";
      readonly format: LeaseListOutputFormat;
      readonly brokerInput: Readonly<{ profile: typeof LEASE_LISTING_PROFILE; observedAt: string }>;
      readonly result: LeaseListingResult;
      readonly output: string;
    }
  | { readonly status: "CLI_USAGE_ERROR"; readonly reasonCode: "LEASE_LIST_CLI_ARGUMENT_INVALID" }
  | {
      readonly status: "RUNTIME_FAILURE";
      readonly format: LeaseListOutputFormat;
      readonly result: LeaseListingFailure;
      readonly output: string;
    };

interface ParsedCommand {
  readonly format: LeaseListOutputFormat;
  readonly observedAt?: string;
}

/**
 * Gate-local adapter for only the M4-035 logical `lease list` command.
 *
 * No executable name, process exit code, remote transport, config discovery,
 * tenant selector or revoke behavior is defined here; M10 owns integrated CLI.
 */
export async function runLeaseListCommand(
  argv: unknown,
  store: LeaseInventoryStore,
  clock: LeaseListClock,
): Promise<LeaseListCommandResult> {
  const parsed = parseArgv(argv);
  if (parsed === undefined) return usageError();

  let observedAt = parsed.observedAt;
  if (observedAt !== undefined) {
    if (!validTimestamp(observedAt)) return usageError();
  } else {
    let clockValue: unknown;
    try { clockValue = clock.now(); } catch { return runtimeObservedAtFailure(parsed.format); }
    if (typeof clockValue !== "string" || !validTimestamp(clockValue)) {
      return runtimeObservedAtFailure(parsed.format);
    }
    observedAt = clockValue;
  }

  const brokerInput = Object.freeze({ profile: LEASE_LISTING_PROFILE, observedAt });
  const result = await listCapabilityLeases(brokerInput, store);
  if (result.status === "FAIL_CLOSED") {
    return Object.freeze({
      status: "RUNTIME_FAILURE",
      format: parsed.format,
      result,
      output: parsed.format === "JSON" ? renderLeaseListJson(result) : renderLeaseListHuman(result),
    });
  }
  return Object.freeze({
    status: "SUCCESS",
    format: parsed.format,
    brokerInput,
    result,
    output: parsed.format === "JSON" ? renderLeaseListJson(result) : renderLeaseListHuman(result),
  });
}

export function renderLeaseListJson(result: LeaseListingResult): string {
  return JSON.stringify(result).replace(
    /[\u0080-\u009f\u202a-\u202e\u2066-\u2069]/gu,
    character => unicodeEscape(character),
  );
}

export function renderLeaseListHuman(result: LeaseListingResult): string {
  if (result.status === "FAIL_CLOSED") return `FAIL_CLOSED\t${result.stage}\t${result.reasonCode}`;

  const lines = [
    "LEASE_REF\tSUBJECT_REF\tCAPABILITY\tRESOURCE\tTTL\tUSAGE\tREVOKED\tCONSTRAINTS\tPARENT\tAUTHORIZATION",
  ];
  for (const entry of result.entries) {
    const resource = `${entry.resource.scheme}://${entry.resource.locator}${
      entry.resource.providerIdentity === undefined ? "" : `#provider=${entry.resource.providerIdentity}`
    }`;
    lines.push([
      entry.leaseRef,
      entry.subjectRef,
      entry.capability,
      resource,
      entry.ttl.reasonCode,
      entry.usage.reasonCode,
      String(entry.revoked),
      entry.constraintsState,
      entry.parentLeaseRef ?? "-",
      `${entry.authorization.kind}:${entry.authorization.ref}`,
    ].map(escapeTerminalText).join("\t"));
  }
  return lines.join("\n");
}

export function escapeTerminalText(value: string): string {
  let output = "";
  for (const character of value) {
    const point = character.codePointAt(0);
    if (point === undefined) continue;
    if (character === "\\") {
      output += "\\\\";
    } else if (mustEscape(point)) {
      output += unicodeEscape(character);
    } else {
      output += character;
    }
  }
  return output;
}

function parseArgv(input: unknown): ParsedCommand | undefined {
  const argv = denseStringArray(input);
  if (argv === undefined || argv.length < 2 || argv[0] !== "lease" || argv[1] !== "list") return undefined;

  let format: LeaseListOutputFormat = "HUMAN";
  let observedAt: string | undefined;
  let seenJson = false;
  let seenObservedAt = false;
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--json") {
      if (seenJson) return undefined;
      seenJson = true;
      format = "JSON";
      continue;
    }
    if (token === "--observed-at") {
      if (seenObservedAt) return undefined;
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) return undefined;
      seenObservedAt = true;
      observedAt = value;
      index += 1;
      continue;
    }
    return undefined;
  }
  return Object.freeze({ format, ...(observedAt === undefined ? {} : { observedAt }) });
}

function denseStringArray(value: unknown): readonly string[] | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  try { if (!Array.isArray(value)) return undefined; } catch { return undefined; }

  let keys: readonly PropertyKey[];
  let lengthDescriptor: PropertyDescriptor | undefined;
  try {
    keys = Reflect.ownKeys(value);
    lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  } catch { return undefined; }
  if (
    lengthDescriptor === undefined || !("value" in lengthDescriptor)
    || typeof lengthDescriptor.value !== "number" || !Number.isSafeInteger(lengthDescriptor.value)
    || lengthDescriptor.value < 0 || lengthDescriptor.value > 16
  ) return undefined;

  const length = lengthDescriptor.value;
  let indexed = 0;
  for (const key of keys) {
    if (key === "length") continue;
    if (typeof key !== "string" || !canonicalIndex(key, length)) return undefined;
    indexed += 1;
  }
  if (indexed !== length) return undefined;

  const output: string[] = [];
  for (let index = 0; index < length; index += 1) {
    let descriptor: PropertyDescriptor | undefined;
    try { descriptor = Object.getOwnPropertyDescriptor(value, String(index)); } catch { return undefined; }
    if (descriptor === undefined || !("value" in descriptor) || typeof descriptor.value !== "string") return undefined;
    output.push(descriptor.value);
  }
  return Object.freeze(output);
}

function canonicalIndex(key: string, length: number): boolean {
  if (key === "0") return length > 0;
  if (key.length === 0 || key.charCodeAt(0) === 48) return false;
  for (let index = 0; index < key.length; index += 1) {
    const code = key.charCodeAt(index);
    if (code < 48 || code > 57) return false;
  }
  const numeric = Number(key);
  return Number.isSafeInteger(numeric) && numeric >= 0 && numeric < length && String(numeric) === key;
}

function validTimestamp(value: string): boolean {
  const probe = evaluateCapabilityLeaseTtl({
    profile: "M4-030_LEASE_TTL_V1",
    issuedAt: value,
    expiresAt: value,
    observedAt: value,
  });
  return probe.status === "FAIL_CLOSED" && probe.reasonCode === "LEASE_TTL_WINDOW_INVALID";
}

function runtimeObservedAtFailure(format: LeaseListOutputFormat): LeaseListCommandResult {
  const result = Object.freeze({
    status: "FAIL_CLOSED",
    stage: "INPUT",
    reasonCode: "LEASE_LIST_OBSERVED_AT_INVALID",
  } as const);
  return Object.freeze({
    status: "RUNTIME_FAILURE",
    format,
    result,
    output: format === "JSON" ? renderLeaseListJson(result) : renderLeaseListHuman(result),
  });
}

function usageError(): LeaseListCommandResult {
  return Object.freeze({ status: "CLI_USAGE_ERROR", reasonCode: "LEASE_LIST_CLI_ARGUMENT_INVALID" });
}

function mustEscape(point: number): boolean {
  return point <= 0x1f
    || (point >= 0x7f && point <= 0x9f)
    || (point >= 0x202a && point <= 0x202e)
    || (point >= 0x2066 && point <= 0x2069);
}

function unicodeEscape(character: string): string {
  const point = character.codePointAt(0) ?? 0;
  return point <= 0xffff
    ? `\\u${point.toString(16).padStart(4, "0")}`
    : `\\u{${point.toString(16)}}`;
}
