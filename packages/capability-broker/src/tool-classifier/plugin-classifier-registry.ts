import {
  classifyBuiltinFilesystemTool,
  type ClassifiedFilesystemTool,
  type FilesystemCapability,
  type FilesystemToolOperand,
  type FilesystemToolRequirement,
} from "./builtin-filesystem.js";
import {
  classifyBuiltinShellTool,
  type ClassifiedShellTool,
  type ShellCommandOperand,
  type ShellDialect,
  type ShellExecutionMode,
  type ShellToolRequirement,
  type ShellWorkdirOperand,
} from "./builtin-shell.js";
import { inspectArgumentRecord, readOwnDataProperty } from "./hostile-input.js";
import type {
  ToolClassificationResolutionError,
  UnclassifiedToolResolution,
} from "./unknown-tool-fallback.js";

export const MAX_PLUGIN_CLASSIFIERS = 128;
export const MAX_PLUGIN_TOOL_NAMES_PER_CLASSIFIER = 128;
export const MAX_PLUGIN_TOOL_CLAIMS = 1024;
export const MAX_CLASSIFIER_ID_CODE_POINTS = 128;
export const MAX_TOOL_NAME_CODE_POINTS = 256;

export interface PluginClassifierRegistration {
  readonly classifierId: string;
  readonly ownedToolNames: readonly string[];
  readonly classify: (toolName: string, argumentsValue: unknown) => unknown;
}

export type PluginRegistryErrorReason =
  | "PLUGIN_REGISTRY_INVALID"
  | "PLUGIN_REGISTRY_LIMIT_EXCEEDED"
  | "PLUGIN_CLASSIFIER_ID_INVALID"
  | "PLUGIN_CLASSIFIER_ID_DUPLICATE"
  | "PLUGIN_TOOL_NAMES_INVALID"
  | "PLUGIN_TOOL_NAME_INVALID"
  | "PLUGIN_TOOL_NAME_DUPLICATE"
  | "PLUGIN_TOOL_NAME_RESERVED"
  | "PLUGIN_TOOL_OWNERSHIP_CONFLICT"
  | "PLUGIN_CLASSIFIER_CALLBACK_INVALID"
  | "PLUGIN_REGISTRY_INPUT_UNREADABLE";

export interface PluginRegistryError {
  readonly status: "ERROR";
  readonly reason: PluginRegistryErrorReason;
}

/** Opaque, immutable handle; the ownership map is kept package-private. */
export interface PluginToolClassifierRegistry {
  readonly status: "READY";
}

export type PluginRegistryConstructionResult = PluginToolClassifierRegistry | PluginRegistryError;

export type PluginClassifierInvocationErrorReason =
  | "PLUGIN_CLASSIFIER_REJECTED"
  | "PLUGIN_CLASSIFIER_THROWN"
  | "PLUGIN_CLASSIFIER_RESULT_INVALID"
  | "PLUGIN_CLASSIFIER_ASYNC_UNSUPPORTED";

export interface PluginClassifierInvocationError {
  readonly status: "ERROR";
  readonly reason: PluginClassifierInvocationErrorReason;
}

export type RegistryAwareToolClassification =
  | Exclude<ReturnType<typeof classifyBuiltinFilesystemTool>, { readonly status: "NOT_APPLICABLE" }>
  | Exclude<ReturnType<typeof classifyBuiltinShellTool>, { readonly status: "NOT_APPLICABLE" }>
  | PluginClassifierInvocationError
  | PluginRegistryError
  | ToolClassificationResolutionError
  | UnclassifiedToolResolution;

type Callback = (toolName: string, argumentsValue: unknown) => unknown;
interface Owner { readonly classifierId: string; readonly classify: Callback }
interface RegistryState { readonly owners: ReadonlyMap<string, Owner> }

type DenseRead =
  | { readonly status: "OK"; readonly values: readonly unknown[] }
  | { readonly status: "INVALID" | "LIMIT_EXCEEDED" | "UNREADABLE" };

type RegistrationRead =
  | { readonly status: "OK"; readonly classifierId: string; readonly names: readonly string[]; readonly classify: Callback }
  | { readonly status: "ERROR"; readonly reason: PluginRegistryErrorReason };

const RESERVED = new Set([
  "read", "read_image", "write", "edit", "glob", "grep", "str_replace_editor", "bash", "pwsh",
]);
const states = new WeakMap<object, RegistryState>();

const TOOL_NAME_INVALID: ToolClassificationResolutionError = Object.freeze({ status: "ERROR", reason: "TOOL_NAME_INVALID" });
const BLOCKED: UnclassifiedToolResolution = Object.freeze({
  status: "UNCLASSIFIED", profile: "STRICT_DENY_V1", disposition: "BLOCK", reason: "NO_APPLICABLE_CLASSIFIER",
});
const REJECTED: PluginClassifierInvocationError = Object.freeze({ status: "ERROR", reason: "PLUGIN_CLASSIFIER_REJECTED" });
const THROWN: PluginClassifierInvocationError = Object.freeze({ status: "ERROR", reason: "PLUGIN_CLASSIFIER_THROWN" });
const INVALID_RESULT: PluginClassifierInvocationError = Object.freeze({ status: "ERROR", reason: "PLUGIN_CLASSIFIER_RESULT_INVALID" });
const ASYNC: PluginClassifierInvocationError = Object.freeze({ status: "ERROR", reason: "PLUGIN_CLASSIFIER_ASYNC_UNSUPPORTED" });

/**
 * Builds one atomic exact-name ownership snapshot. Security-relevant registration
 * fields are read as own data properties only; no callback runs while building.
 */
export function createPluginToolClassifierRegistry(value: unknown): PluginRegistryConstructionResult {
  const registrations = denseArray(value, MAX_PLUGIN_CLASSIFIERS);
  if (registrations.status === "UNREADABLE") return registryError("PLUGIN_REGISTRY_INPUT_UNREADABLE");
  if (registrations.status === "LIMIT_EXCEEDED") return registryError("PLUGIN_REGISTRY_LIMIT_EXCEEDED");
  if (registrations.status !== "OK") return registryError("PLUGIN_REGISTRY_INVALID");

  const ids = new Set<string>();
  const owners = new Map<string, Owner>();
  let claims = 0;

  for (const raw of registrations.values) {
    const registration = registrationFrom(raw);
    if (registration.status === "ERROR") return registryError(registration.reason);
    if (ids.has(registration.classifierId)) return registryError("PLUGIN_CLASSIFIER_ID_DUPLICATE");
    ids.add(registration.classifierId);

    const local = new Set<string>();
    for (const name of registration.names) {
      claims += 1;
      if (claims > MAX_PLUGIN_TOOL_CLAIMS) return registryError("PLUGIN_REGISTRY_LIMIT_EXCEEDED");
      if (local.has(name)) return registryError("PLUGIN_TOOL_NAME_DUPLICATE");
      local.add(name);
      if (RESERVED.has(name)) return registryError("PLUGIN_TOOL_NAME_RESERVED");
      if (owners.has(name)) return registryError("PLUGIN_TOOL_OWNERSHIP_CONFLICT");
      owners.set(name, Object.freeze({ classifierId: registration.classifierId, classify: registration.classify }));
    }
  }

  const handle: PluginToolClassifierRegistry = Object.freeze({ status: "READY" });
  states.set(handle, { owners });
  return handle;
}

/**
 * Built-ins retain first ownership. Only an all-NOT_APPLICABLE path performs an
 * exact plugin lookup; no owner terminates at the accepted strict block.
 */
export function resolveToolClassificationWithRegistry(
  registry: unknown,
  toolName: unknown,
  argumentsValue: unknown,
): RegistryAwareToolClassification {
  if (!boundedNonBlank(toolName, MAX_TOOL_NAME_CODE_POINTS)) return TOOL_NAME_INVALID;

  const filesystem = classifyBuiltinFilesystemTool(toolName, argumentsValue);
  if (filesystem.status !== "NOT_APPLICABLE") return filesystem;
  const shell = classifyBuiltinShellTool(toolName, argumentsValue);
  if (shell.status !== "NOT_APPLICABLE") return shell;

  if (typeof registry !== "object" || registry === null) return registryError("PLUGIN_REGISTRY_INVALID");
  const state = states.get(registry);
  if (state === undefined) return registryError("PLUGIN_REGISTRY_INVALID");
  const owner = state.owners.get(toolName);
  if (owner === undefined) return BLOCKED;

  let raw: unknown;
  try {
    raw = owner.classify(toolName, argumentsValue);
  } catch {
    return THROWN;
  }
  return normalizeCallbackResult(raw);
}

function registrationFrom(value: unknown): RegistrationRead {
  const record = inspectArgumentRecord(value);
  if (record.status === "UNREADABLE") return registrationError("PLUGIN_REGISTRY_INPUT_UNREADABLE");
  if (record.status !== "RECORD") return registrationError("PLUGIN_REGISTRY_INVALID");
  const shape = exactDataShape(record.value, ["classifierId", "ownedToolNames", "classify"]);
  if (shape === "UNREADABLE") return registrationError("PLUGIN_REGISTRY_INPUT_UNREADABLE");
  if (!shape) return registrationError("PLUGIN_REGISTRY_INVALID");

  const id = readOwnDataProperty(record.value, "classifierId");
  if (id.status === "UNREADABLE") return registrationError("PLUGIN_REGISTRY_INPUT_UNREADABLE");
  if (id.status !== "VALUE" || !boundedNonBlank(id.value, MAX_CLASSIFIER_ID_CODE_POINTS)) {
    return registrationError("PLUGIN_CLASSIFIER_ID_INVALID");
  }

  const namesProperty = readOwnDataProperty(record.value, "ownedToolNames");
  if (namesProperty.status === "UNREADABLE") return registrationError("PLUGIN_REGISTRY_INPUT_UNREADABLE");
  if (namesProperty.status !== "VALUE") return registrationError("PLUGIN_TOOL_NAMES_INVALID");
  const names = denseArray(namesProperty.value, MAX_PLUGIN_TOOL_NAMES_PER_CLASSIFIER);
  if (names.status === "UNREADABLE") return registrationError("PLUGIN_REGISTRY_INPUT_UNREADABLE");
  if (names.status === "LIMIT_EXCEEDED") return registrationError("PLUGIN_REGISTRY_LIMIT_EXCEEDED");
  if (names.status !== "OK" || names.values.length === 0) return registrationError("PLUGIN_TOOL_NAMES_INVALID");
  const copied: string[] = [];
  for (const name of names.values) {
    if (!boundedNonBlank(name, MAX_TOOL_NAME_CODE_POINTS)) return registrationError("PLUGIN_TOOL_NAME_INVALID");
    copied.push(name);
  }

  const callback = readOwnDataProperty(record.value, "classify");
  if (callback.status === "UNREADABLE") return registrationError("PLUGIN_REGISTRY_INPUT_UNREADABLE");
  if (callback.status !== "VALUE" || typeof callback.value !== "function") {
    return registrationError("PLUGIN_CLASSIFIER_CALLBACK_INVALID");
  }
  return { status: "OK", classifierId: id.value, names: Object.freeze(copied), classify: callback.value as Callback };
}

function denseArray(value: unknown, max: number): DenseRead {
  let arrayValue: unknown[];
  try {
    if (!Array.isArray(value)) return { status: "INVALID" };
    arrayValue = value;
  } catch {
    return { status: "UNREADABLE" };
  }
  const length = readOwnDataProperty(arrayValue, "length");
  if (length.status === "UNREADABLE") return { status: "UNREADABLE" };
  if (length.status !== "VALUE" || typeof length.value !== "number" || !Number.isSafeInteger(length.value) || length.value < 0) {
    return { status: "INVALID" };
  }
  if (length.value > max) return { status: "LIMIT_EXCEEDED" };

  let keys: readonly PropertyKey[];
  try { keys = Reflect.ownKeys(arrayValue); } catch { return { status: "UNREADABLE" }; }
  if (keys.length !== length.value + 1 || !keys.includes("length")) return { status: "INVALID" };

  const values: unknown[] = [];
  for (let i = 0; i < length.value; i += 1) {
    const key = String(i);
    if (!keys.includes(key)) return { status: "INVALID" };
    const item = readOwnDataProperty(arrayValue, key);
    if (item.status === "UNREADABLE") return { status: "UNREADABLE" };
    if (item.status !== "VALUE") return { status: "INVALID" };
    values.push(item.value);
  }
  return { status: "OK", values: Object.freeze(values) };
}

function exactDataShape(target: object, expected: readonly string[]): boolean | "UNREADABLE" {
  let keys: readonly PropertyKey[];
  try { keys = Reflect.ownKeys(target); } catch { return "UNREADABLE"; }
  if (keys.length !== expected.length || keys.some((key) => typeof key !== "string" || !expected.includes(key))) return false;
  for (const key of expected) {
    const property = readOwnDataProperty(target, key);
    if (property.status === "UNREADABLE") return "UNREADABLE";
    if (property.status !== "VALUE") return false;
  }
  return true;
}

function boundedNonBlank(value: unknown, max: number): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  let count = 0;
  for (const _codePoint of value) {
    count += 1;
    if (count > max) return false;
  }
  return true;
}

function normalizeCallbackResult(value: unknown): RegistryAwareToolClassification {
  if (nativePromise(value)) return ASYNC;
  const record = inspectArgumentRecord(value);
  if (record.status !== "RECORD") return INVALID_RESULT;

  const then = readOwnDataProperty(record.value, "then");
  if (then.status === "VALUE" && typeof then.value === "function") return ASYNC;
  if (then.status === "UNREADABLE") return INVALID_RESULT;

  const status = readOwnDataProperty(record.value, "status");
  if (status.status !== "VALUE") return INVALID_RESULT;
  if (status.value === "REJECTED") return exactDataShape(record.value, ["status"]) === true ? REJECTED : INVALID_RESULT;
  if (status.value !== "CLASSIFIED" || exactDataShape(record.value, ["status", "family", "requirements"]) !== true) return INVALID_RESULT;

  const family = readOwnDataProperty(record.value, "family");
  const requirements = readOwnDataProperty(record.value, "requirements");
  if (family.status !== "VALUE" || requirements.status !== "VALUE") return INVALID_RESULT;
  if (family.value === "FILESYSTEM") return normalizeFilesystem(requirements.value) ?? INVALID_RESULT;
  if (family.value === "SHELL_PROCESS") return normalizeShell(requirements.value) ?? INVALID_RESULT;
  return INVALID_RESULT;
}

function normalizeFilesystem(value: unknown): ClassifiedFilesystemTool | undefined {
  const list = denseArray(value, Number.MAX_SAFE_INTEGER);
  if (list.status !== "OK" || list.values.length === 0) return undefined;
  const output: FilesystemToolRequirement[] = [];
  for (const raw of list.values) {
    const record = inspectArgumentRecord(raw);
    if (record.status !== "RECORD" || exactDataShape(record.value, ["capability", "operand"]) !== true) return undefined;
    const capability = readOwnDataProperty(record.value, "capability");
    const operand = readOwnDataProperty(record.value, "operand");
    if (capability.status !== "VALUE" || !filesystemCapability(capability.value) || operand.status !== "VALUE") return undefined;
    const normalizedOperand = filesystemOperand(operand.value);
    if (normalizedOperand === undefined) return undefined;
    output.push(Object.freeze({ capability: capability.value, operand: normalizedOperand }));
  }
  return Object.freeze({ status: "CLASSIFIED", requirements: Object.freeze(output) });
}

function filesystemOperand(value: unknown): FilesystemToolOperand | undefined {
  const record = inspectArgumentRecord(value);
  if (record.status !== "RECORD") return undefined;
  const source = readOwnDataProperty(record.value, "source");
  if (source.status !== "VALUE") return undefined;
  if (source.value === "EXECUTION_ROOT") {
    const reach = readOwnDataProperty(record.value, "reach");
    return exactDataShape(record.value, ["source", "reach"]) === true && reach.status === "VALUE" && reach.value === "SELF_OR_DESCENDANTS"
      ? Object.freeze({ source: "EXECUTION_ROOT", reach: "SELF_OR_DESCENDANTS" }) : undefined;
  }
  if (source.value !== "ARGUMENT_PATH" || exactDataShape(record.value, ["source", "argumentName", "rawPath", "reach"]) !== true) return undefined;
  const argumentName = readOwnDataProperty(record.value, "argumentName");
  const rawPath = readOwnDataProperty(record.value, "rawPath");
  const reach = readOwnDataProperty(record.value, "reach");
  if (argumentName.status !== "VALUE" || (argumentName.value !== "file_path" && argumentName.value !== "path")
    || rawPath.status !== "VALUE" || typeof rawPath.value !== "string" || rawPath.value.trim().length === 0
    || reach.status !== "VALUE" || (reach.value !== "EXACT" && reach.value !== "SELF_OR_DESCENDANTS")) return undefined;
  return Object.freeze({ source: "ARGUMENT_PATH", argumentName: argumentName.value, rawPath: rawPath.value, reach: reach.value });
}

function normalizeShell(value: unknown): ClassifiedShellTool | undefined {
  const list = denseArray(value, 1);
  if (list.status !== "OK" || list.values.length !== 1) return undefined;
  const record = inspectArgumentRecord(list.values[0]);
  if (record.status !== "RECORD" || exactDataShape(record.value, ["capability", "operand"]) !== true) return undefined;
  const capability = readOwnDataProperty(record.value, "capability");
  const operand = readOwnDataProperty(record.value, "operand");
  if (capability.status !== "VALUE" || capability.value !== "process.exec" || operand.status !== "VALUE") return undefined;
  const normalizedOperand = shellOperand(operand.value);
  if (normalizedOperand === undefined) return undefined;
  const requirement: ShellToolRequirement = Object.freeze({ capability: "process.exec", operand: normalizedOperand });
  return Object.freeze({ status: "CLASSIFIED", requirements: Object.freeze([requirement]) });
}

function shellOperand(value: unknown): ShellCommandOperand | undefined {
  const record = inspectArgumentRecord(value);
  if (record.status !== "RECORD" || exactDataShape(record.value, ["source", "dialect", "rawCommand", "executionMode", "workdir"]) !== true) return undefined;
  const source = readOwnDataProperty(record.value, "source");
  const dialect = readOwnDataProperty(record.value, "dialect");
  const command = readOwnDataProperty(record.value, "rawCommand");
  const mode = readOwnDataProperty(record.value, "executionMode");
  const workdir = readOwnDataProperty(record.value, "workdir");
  if (source.status !== "VALUE" || source.value !== "SHELL_COMMAND" || dialect.status !== "VALUE" || !shellDialect(dialect.value)
    || command.status !== "VALUE" || typeof command.value !== "string" || command.value.trim().length === 0
    || mode.status !== "VALUE" || !shellMode(mode.value) || workdir.status !== "VALUE") return undefined;
  const normalizedWorkdir = shellWorkdir(workdir.value);
  return normalizedWorkdir === undefined ? undefined : Object.freeze({
    source: "SHELL_COMMAND", dialect: dialect.value, rawCommand: command.value, executionMode: mode.value, workdir: normalizedWorkdir,
  });
}

function shellWorkdir(value: unknown): ShellWorkdirOperand | undefined {
  const record = inspectArgumentRecord(value);
  if (record.status !== "RECORD") return undefined;
  const source = readOwnDataProperty(record.value, "source");
  if (source.status !== "VALUE") return undefined;
  if (source.value === "EXECUTION_ROOT") return exactDataShape(record.value, ["source"]) === true ? Object.freeze({ source: "EXECUTION_ROOT" }) : undefined;
  if (source.value !== "ARGUMENT_WORKDIR" || exactDataShape(record.value, ["source", "argumentName", "rawWorkdir"]) !== true) return undefined;
  const name = readOwnDataProperty(record.value, "argumentName");
  const raw = readOwnDataProperty(record.value, "rawWorkdir");
  return name.status === "VALUE" && name.value === "workdir" && raw.status === "VALUE" && typeof raw.value === "string" && raw.value.trim().length > 0
    ? Object.freeze({ source: "ARGUMENT_WORKDIR", argumentName: "workdir", rawWorkdir: raw.value }) : undefined;
}

function filesystemCapability(value: unknown): value is FilesystemCapability {
  return value === "fs.read" || value === "fs.stat" || value === "fs.list" || value === "fs.create" || value === "fs.write"
    || value === "fs.edit" || value === "fs.delete" || value === "fs.move" || value === "fs.link";
}
function shellDialect(value: unknown): value is ShellDialect { return value === "BASH" || value === "POWERSHELL"; }
function shellMode(value: unknown): value is ShellExecutionMode { return value === "FOREGROUND" || value === "BACKGROUND"; }
function nativePromise(value: unknown): boolean { try { return value instanceof Promise; } catch { return false; } }
function registryError(reason: PluginRegistryErrorReason): PluginRegistryError { return Object.freeze({ status: "ERROR", reason }); }
function registrationError(reason: PluginRegistryErrorReason): RegistrationRead { return { status: "ERROR", reason }; }
