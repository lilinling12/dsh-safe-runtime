import { revokeCapabilityLease } from "./lease-revoke.js";
import {
  LEASE_REVOKE_PROFILE,
  type LeaseAlreadyRevoked,
  type LeaseNotRevoked,
  type LeaseRevocationStore,
  type LeaseRevokeFailure,
  type LeaseRevokeInput,
  type LeaseRevokeResult,
  type LeaseRevoked,
} from "./lease-revoke-types.js";

export const LEASE_REVOKE_CLI_PROFILE = "M4-036_LEASE_REVOKE_CLI_V1" as const;

export type LeaseRevokeOutputFormat = "HUMAN" | "JSON";

export type LeaseRevokeCommandResult =
  | {
      readonly status: "SUCCESS";
      readonly format: LeaseRevokeOutputFormat;
      readonly brokerInput: LeaseRevokeInput;
      readonly result: LeaseRevoked | LeaseAlreadyRevoked;
      readonly output: string;
    }
  | {
      readonly status: "NOT_FOUND";
      readonly format: LeaseRevokeOutputFormat;
      readonly brokerInput: LeaseRevokeInput;
      readonly result: LeaseNotRevoked;
      readonly output: string;
    }
  | {
      readonly status: "CLI_USAGE_ERROR";
      readonly reasonCode: "LEASE_REVOKE_CLI_ARGUMENT_INVALID";
    }
  | {
      readonly status: "RUNTIME_FAILURE";
      readonly format: LeaseRevokeOutputFormat;
      readonly brokerInput: LeaseRevokeInput;
      readonly result: LeaseRevokeFailure;
      readonly output: string;
    };

interface ParsedCommand {
  readonly format: LeaseRevokeOutputFormat;
  readonly leaseRef: string;
}

/**
 * Gate-local adapter for the M4-036 logical `lease revoke` command.
 *
 * The adapter contributes no revocation semantics of its own. It validates one
 * exact opaque Lease identity, constructs the already accepted M4-033 request,
 * invokes that primitive once, and renders only its stable result algebra.
 * Product-wide binary naming, remote admin authorization, numeric exit codes,
 * audit metadata, bulk/cascade mutation and M10 command integration remain out
 * of scope.
 */
export async function runLeaseRevokeCommand(
  argv: unknown,
  store: LeaseRevocationStore,
): Promise<LeaseRevokeCommandResult> {
  const parsed = parseArgv(argv);
  if (parsed === undefined) return usageError();

  const brokerInput = Object.freeze({
    profile: LEASE_REVOKE_PROFILE,
    leaseRef: parsed.leaseRef,
  });
  const result = await revokeCapabilityLease(brokerInput, store);
  const output = parsed.format === "JSON"
    ? renderLeaseRevokeJson(result)
    : renderLeaseRevokeHuman(result);

  switch (result.status) {
    case "REVOKED":
    case "ALREADY_REVOKED":
      return Object.freeze({
        status: "SUCCESS",
        format: parsed.format,
        brokerInput,
        result,
        output,
      });
    case "NOT_REVOKED":
      return Object.freeze({
        status: "NOT_FOUND",
        format: parsed.format,
        brokerInput,
        result,
        output,
      });
    case "FAIL_CLOSED":
      return Object.freeze({
        status: "RUNTIME_FAILURE",
        format: parsed.format,
        brokerInput,
        result,
        output,
      });
  }
}

/** Render only the fixed M4-033 result vocabulary; the target ref is not echoed. */
export function renderLeaseRevokeHuman(result: LeaseRevokeResult): string {
  if (result.status === "FAIL_CLOSED") {
    return `FAIL_CLOSED\t${result.stage}\t${result.reasonCode}`;
  }
  return `${result.status}\t${result.reasonCode}`;
}

/**
 * Machine rendering contains only the accepted M4-033 result object.
 * No caller identity, store diagnostic or host exception is added.
 */
export function renderLeaseRevokeJson(result: LeaseRevokeResult): string {
  return JSON.stringify(result);
}

function parseArgv(input: unknown): ParsedCommand | undefined {
  const argv = denseStringArray(input);
  if (argv === undefined || (argv.length !== 4 && argv.length !== 5)) return undefined;
  if (argv[0] !== "lease" || argv[1] !== "revoke") return undefined;

  let leaseRef: string | undefined;
  let format: LeaseRevokeOutputFormat = "HUMAN";
  let seenLeaseRef = false;
  let seenJson = false;

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--lease-ref") {
      if (seenLeaseRef || index + 1 >= argv.length) return undefined;
      seenLeaseRef = true;
      leaseRef = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === "--json") {
      if (seenJson) return undefined;
      seenJson = true;
      format = "JSON";
      continue;
    }
    return undefined;
  }

  if (!seenLeaseRef || leaseRef === undefined || !validLeaseRef(leaseRef)) return undefined;
  return Object.freeze({ format, leaseRef });
}

function denseStringArray(value: unknown): readonly string[] | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  try {
    if (!Array.isArray(value)) return undefined;
  } catch {
    return undefined;
  }

  let keys: readonly PropertyKey[];
  let lengthDescriptor: PropertyDescriptor | undefined;
  try {
    keys = Reflect.ownKeys(value);
    lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  } catch {
    return undefined;
  }

  if (
    lengthDescriptor === undefined
    || !("value" in lengthDescriptor)
    || typeof lengthDescriptor.value !== "number"
    || !Number.isSafeInteger(lengthDescriptor.value)
    || lengthDescriptor.value < 0
    || lengthDescriptor.value > 5
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
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    } catch {
      return undefined;
    }
    if (descriptor === undefined || !("value" in descriptor) || typeof descriptor.value !== "string") {
      return undefined;
    }
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

function validLeaseRef(value: string): boolean {
  let length = 0;
  for (const _codePoint of value) {
    length += 1;
    if (length > 512) return false;
  }
  return length >= 1;
}

function usageError(): LeaseRevokeCommandResult {
  return Object.freeze({
    status: "CLI_USAGE_ERROR",
    reasonCode: "LEASE_REVOKE_CLI_ARGUMENT_INVALID",
  });
}
