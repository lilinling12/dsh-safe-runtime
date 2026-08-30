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
  type ProcessCapability,
  type ShellCommandOperand,
  type ShellDialect,
  type ShellExecutionMode,
  type ShellToolRequirement,
  type ShellWorkdirOperand,
} from "./builtin-shell.js";
import {
  inspectArgumentRecord,
  readOwnDataProperty,
} from "./hostile-input.js";
import type {
  ToolClassificationResolutionError,
  UnclassifiedToolResolution,
} from "./unknown-tool-fallback.js";

export const MAX_PLUGIN_CLASSIFIERS = 128;
export const MAX_PLUGIN_TOOL_NAMES_PER_CLASSIFIER = 128;
export const MAX_PLUGIN_TOOL_CLAIMS = 1024;
export const MAX_CLASSIFIER_ID_CODE_POINTS = 128;
export const MAX_TOOL_NAME_CODE_POINTS = 256;

export type PluginClassifierFamily = "FILESYSTEM" | "SHELL_PROCESS";

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

/**
 * Public registry handle. Ownership state is intentionally not exposed here;
 * the implementation stores it in a package-private WeakMap so callers cannot
 * mutate or forge a registry by constructing a structurally similar object.
 */
export interface PluginToolClassifierRegistry {
  readonly status: "READY";
}

export type PluginRegistryConstructionResult =
  | PluginToolClassifierRegistry
  | PluginRegistryError;

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
  | ClassifiedFilesystemTool
  | ClassifiedShellTool
  | PluginClassifierInvocationError
  | PluginRegistryError
  | ToolClassificationResolutionError
  | UnclassifiedToolResolution
  | Exclude<ReturnType<typeof classifyBuiltinFilesystemTool>, { readonly status: "NOT_APPLICABLE" }>
  | Exclude<ReturnType<typeof classifyBuiltinShellTool>, { readonly status: "NOT_APPLICABLE" }>;

type PluginCallback = (toolName: string, argumentsValue: unknown) => unknown;

interface OwnerRecord {
  readonly classifierId: string;
  readonly classify: PluginCallback;
}

interface RegistryState {
  readonly owners: ReadonlyMap<string, OwnerRecord>;
}

type DenseArrayReadResult =
  | { readonly status: "OK"; readonly values: readonly unknown[] }
  | { readonly status: "INVALID" }
  | { readonly status: "LIMIT_EXCEEDED" }
  | { readonly status: "UNREADABLE" };

type RegistrationReadResult =
  | {
      readonly status: "OK";
      readonly classifierId: string;
      readonly ownedToolNames: readonly string[];
      readonly classify: PluginCallback;
    }
  | { readonly status: "ERROR"; readonly reason: PluginRegistryErrorReason };

type PluginOutputNormalization =
  | { readonly status: "CLASSIFIED"; readonly value: ClassifiedFilesystemTool | ClassifiedShellTool }
  | { readonly status: "REJECTED" }
  | { readonly status: "ASYNC" }
  | { readonly status: "INVALID" };

const RESERVED_BUILTIN_TOOL_NAMES = new Set<string>([
  "read",
  "read_image",
  "write",
  "edit",
  "glob",
  "grep",
  "str_replace_editor",
  "bash",
  "pwsh",
]);

const registryStates = new WeakMap<object, RegistryState>();

const TOOL_NAME_INVALID: ToolClassificationResolutionError = Object.freeze({
  status: "ERROR",
  reason: "TOOL_NAME_INVALID",
});

const UNCLASSIFIED_BLOCKED: UnclassifiedToolResolution = Object.freeze({
  status: "UNCLASSIFIED",
  profile: "STRICT_DENY_V1",
  disposition: "BLOCK",
  reason: "NO_APPLICABLE_CLASSIFIER",
});

const REJECTED: PluginClassifierInvocationError = Object.freeze({
  status: "ERROR",
  reason: "PLUGIN_CLASSIFIER_REJECTED",
});

const THROWN: PluginClassifierInvocationError = Object.freeze({
  status: "ERROR",
  reason: "PLUGIN_CLASSIFIER_THROWN",
});

const RESULT_INVALID: PluginClassifierInvocationError = Object.freeze({
  status: "ERROR",
  reason: "PLUGIN_CLASSIFIER_RESULT_INVALID",
});

const ASYNC_UNSUPPORTED: PluginClassifierInvocationError = Object.freeze({
  status: "ERROR",
  reason: "PLUGIN_CLASSIFIER_ASYNC_UNSUPPORTED",
});

/**
 * Atomically constructs the immutable M4-014 exact-owner registry.
 *
 * Registration objects are treated as hostile boundary values: security-
 * relevant fields are read only as own data properties and arrays must be
 * ordinary dense index lists with no named or symbol properties. Callbacks are
 * deliberately retained because invoking the exact owner is the registry's
 * purpose; caller-owned registration containers and name arrays are not.
 */
export function createPluginToolClassifierRegistry(
  registrationsValue: unknown,
): PluginRegistryConstructionResult {
  const registrations = readDenseArray(registrationsValue, MAX_PLUGIN_CLASSIFIERS);
  if (registrations.status === "UNREADABLE") {
    return registryError("PLUGIN_REGISTRY_INPUT_UNREADABLE");
  }
  if (registrations.status === "LIMIT_EXCEEDED") {
    return registryError("PLUGIN_REGISTRY_LIMIT_EXCEEDED");
  }
  if (registrations.status !== "OK") {
    return registryError("PLUGIN_REGISTRY_INVALID");
  }

  const classifierIds = new Set<string>();
  const owners = new Map<string, OwnerRecord>();
  let totalClaims = 0;

  for (const rawRegistration of registrations.values) {
    const registration = readRegistration(rawRegistration);
    if (registration.status === "ERROR") {
      return registryError(registration.reason);
    }

    if (classifierIds.has(registration.classifierId)) {
      return registryError("PLUGIN_CLASSIFIER_ID_DUPLICATE");
    }
    classifierIds.add(registration.classifierId);

    const localNames = new Set<string>();
    for (const toolName of registration.ownedToolNames) {
      totalClaims += 1;
      if (totalClaims > MAX_PLUGIN_TOOL_CLAIMS) {
        return registryError("PLUGIN_REGISTRY_LIMIT_EXCEEDED");
      }
      if (localNames.has(toolName)) {
        return registryError("PLUGIN_TOOL_NAME_DUPLICATE");
      }
      localNames.add(toolName);
      if (RESERVED_BUILTIN_TOOL_NAMES.has(toolName)) {
        return registryError("PLUGIN_TOOL_NAME_RESERVED");
      }
      if (owners.has(toolName)) {
        return registryError("PLUGIN_TOOL_OWNERSHIP_CONFLICT");
      }
      owners.set(toolName, Object.freeze({
        classifierId: registration.classifierId,
        classify: registration.classify,
      }));
    }
  }

  // Map is never exposed. All state becomes reachable only through this frozen
  // opaque handle, making post-construction caller mutation irrelevant.
  const handle: PluginToolClassifierRegistry = Object.freeze({ status: "READY" });
  registryStates.set(handle, { owners });
  return handle;
}

/**
 * Resolves a tool invocation against built-ins, one exact plugin owner, then
 * the accepted M4-013 strict fallback.
 *
 * The accepted M4-013 resolver is intentionally not called here because its
 * public input validation remains frozen. This new resolver owns the stricter
 * M4-014 non-blank / code-point-bounded tool-name rule while preserving the
 * exact built-in composition and terminal strict fallback semantics.
 */
export function resolveToolClassificationWithRegistry(
  registry: unknown,
  toolName: unknown,
  argumentsValue: unknown,
): RegistryAwareToolClassification {
  if (!isValidInvocationToolName(toolName)) {
    return TOOL_NAME_INVALID;
  }

  const filesystem = classifyBuiltinFilesystemTool(toolName, argumentsValue);
  if (filesystem.status !== "NOT_APPLICABLE") {
    return filesystem;
  }

  const shell = classifyBuiltinShellTool(toolName, argumentsValue);
  if (shell.status !== "NOT_APPLICABLE") {
    return shell;
  }

  if (typeof registry !== "object" || registry === null) {
    return registryError("PLUGIN_REGISTRY_INVALID");
  }
  const state = registryStates.get(registry);
  if (state === undefined) {
    return registryError("PLUGIN_REGISTRY_INVALID");
  }

  const owner = state.owners.get(toolName);
  if (owner === undefined) {
    return UNCLASSIFIED_BLOCKED;
  }

  let rawResult: unknown;
  try {
    rawResult = owner.classify(toolName, argumentsValue);
  } catch {
    return THROWN;
  }

  const normalized = normalizePluginOutput(rawResult);
  switch (normalized.status) {
    case "CLASSIFIED":
      return normalized.value;
    case "REJECTED":
      return REJECTED;
    case "ASYNC":
      return ASYNC_UNSUPPORTED;
    case "INVALID":
      return RESULT_INVALID;
  }
}

function readRegistration(value: unknown): RegistrationReadResult {
  const record = inspectArgumentRecord(value);
  if (record.status === "UNREADABLE") {
    return { status: "ERROR", reason: "PLUGIN_REGISTRY_INPUT_UNREADABLE" };
  }
  if (record.status !== "RECORD") {
    return { status: "ERROR", reason: "PLUGIN_REGISTRY_INVALID" };
  }

  const exactShape = hasExactOwnDataKeys(
    record.value,
    ["classifierId", "ownedToolNames", "classify"],
  );
  if (exactShape === "UNREADABLE") {
    return { status: "ERROR", reason: "PLUGIN_REGISTRY_INPUT_UNREADABLE" };
  }
  if (!exactShape) {
    return { status: "ERROR", reason: "PLUGIN_REGISTRY_INVALID" };
  }

  const classifierId = readOwnDataProperty(record.value, "classifierId");
  if (classifierId.status === "UNREADABLE") {
    return { status: "ERROR", reason: "PLUGIN_REGISTRY_INPUT_UNREADABLE" };
  }
  if (
    classifierId.status !== "VALUE"
    || !isBoundedNonBlankString(classifierId.value, MAX_CLASSIFIER_ID_CODE_POINTS)
  ) {
    return { status: "ERROR", reason: "PLUGIN_CLASSIFIER_ID_INVALID" };
  }

  const ownedNamesProperty = readOwnDataProperty(record.value, "ownedToolNames");
  if (ownedNamesProperty.status === "UNREADABLE") {
    return { status: "ERROR", reason: "PLUGIN_REGISTRY_INPUT_UNREADABLE" };
  }
  if (ownedNamesProperty.status !== "VALUE") {
    return { status: "ERROR", reason: "PLUGIN_TOOL_NAMES_INVALID" };
  }
  const ownedNames = readDenseArray(
    ownedNamesProperty.value,
    MAX_PLUGIN_TOOL_NAMES_PER_CLASSIFIER,
  );
  if (ownedNames.status === "UNREADABLE") {
    return { status: "ERROR", reason: "PLUGIN_REGISTRY_INPUT_UNREADABLE" };
  }
  if (ownedNames.status === "LIMIT_EXCEEDED") {
    return { status: "ERROR", reason: "PLUGIN_REGISTRY_LIMIT_EXCEEDED" };
  }
  if (ownedNames.status !== "OK" || ownedNames.values.length === 0) {
    return { status: "ERROR", reason: "PLUGIN_TOOL_NAMES_INVALID" };
  }

  const copiedNames: string[] = [];
  for (const name of ownedNames.values) {
    if (!isBoundedNonBlankString(name, MAX_TOOL_NAME_CODE_POINTS)) {
      return { status: "ERROR", reason: "PLUGIN_TOOL_NAME_INVALID" };
    }
    copiedNames.push(name);
  }

  const callback = readOwnDataProperty(record.value, "classify");
  if (callback.status === "UNREADABLE") {
    return { status: "ERROR", reason: "PLUGIN_REGISTRY_INPUT_UNREADABLE" };
  }
  if (callback.status !== "VALUE" || typeof callback.value !== "function") {
    return { status: "ERROR", reason: "PLUGIN_CLASSIFIER_CALLBACK_INVALID" };
  }

  return {
    status: "OK",
    classifierId: classifierId.value,
    ownedToolNames: Object.freeze(copiedNames),
    classify: callback.value as PluginCallback,
  };
}

function readDenseArray(value: unknown, maxEntries: number): DenseArrayReadResult {
  let isArray: boolean;
  try {
    isArray = Array.isArray(value);
  } catch {
    return { status: "UNREADABLE" };
  }
  if (!isArray) {
    return { status: "INVALID" };
  }

  const lengthProperty = readOwnDataProperty(value, "length");
  if (
    lengthProperty.status !== "VALUE"
    || typeof lengthProperty.value !== "number"
    || !Number.isSafeInteger(lengthProperty.value)
    || lengthProperty.value < 0
  ) {
    return lengthProperty.status === "UNREADABLE"
      ? { status: "UNREADABLE" }
      : { status: "INVALID" };
  }
  if (lengthProperty.value > maxEntries) {
    return { status: "LIMIT_EXCEEDED" };
  }

  let keys: readonly PropertyKey[];
  try {
    keys = Reflect.ownKeys(value);
  } catch {
    return { status: "UNREADABLE" };
  }
  if (keys.length !== lengthProperty.value + 1 || !keys.includes("length")) {
    return { status: "INVALID" };
  }

  const values: unknown[] = [];
  for (let index = 0; index < lengthProperty.value; index += 1) {
    const key = String(index);
    if (!keys.includes(key)) {
      return { status: "INVALID" };
    }
    const property = readOwnDataProperty(value, key);
    if (property.status === "UNREADABLE") {
      return { status: "UNREADABLE" };
    }
    if (property.status !== "VALUE") {
      return { status: "INVALID" };
    }
    values.push(property.value);
  }

  return { status: "OK", values: Object.freeze(values) };
}

function hasExactOwnDataKeys(
  target: object,
  expectedKeys: readonly string[],
): boolean | "UNREADABLE" {
  let keys: readonly PropertyKey[];
  try {
    keys = Reflect.ownKeys(target);
  } catch {
    return "UNREADABLE";
  }
  if (
    keys.length !== expectedKeys.length
    || keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    return false;
  }
  for (const key of expectedKeys) {
    const property = readOwnDataProperty(target, key);
    if (property.status === "UNREADABLE") {
      return "UNREADABLE";
    }
    if (property.status !== "VALUE") {
      return false;
    }
  }
  return true;
}

function isBoundedNonBlankString(value: unknown, maxCodePoints: number): value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }
  let count = 0;
  for (const _codePoint of value) {
    count += 1;
    if (count > maxCodePoints) {
      return false;
    }
  }
  return true;
}

function isValidInvocationToolName(value: unknown): value is string {
  return isBoundedNonBlankString(value, MAX_TOOL_NAME_CODE_POINTS);
}

function normalizePluginOutput(value: unknown): PluginOutputNormalization {
  if (isNativePromise(value)) {
    return { status: "ASYNC" };
  }

  const record = inspectArgumentRecord(value);
  if (record.status !== "RECORD") {
    return { status: "INVALID" };
  }

  const ownThen = readOwnDataProperty(record.value, "then");
  if (ownThen.status === "UNREADABLE") {
    return { status: "INVALID" };
  }
  if (ownThen.status === "VALUE" && typeof ownThen.value === "function") {
    return { status: "ASYNC" };
  }

  const status = readOwnDataProperty(record.value, "status");
  if (status.status !== "VALUE") {
    return { status: "INVALID" };
  }
  if (status.value === "REJECTED") {
    return hasExactOwnDataKeys(record.value, ["status"]) === true
      ? { status: "REJECTED" }
      : { status: "INVALID" };
  }
  if (status.value !== "CLASSIFIED") {
    return { status: "INVALID" };
  }
  if (hasExactOwnDataKeys(record.value, ["status", "family", "requirements"]) !== true) {
    return { status: "INVALID" };
  }

  const family = readOwnDataProperty(record.value, "family");
  const requirements = readOwnDataProperty(record.value, "requirements");
  if (family.status !== "VALUE" || requirements.status !== "VALUE") {
    return { status: "INVALID" };
  }

  if (family.value === "FILESYSTEM") {
    const normalized = normalizeFilesystemRequirements(requirements.value);
    return normalized === undefined
      ? { status: "INVALID" }
      : { status: "CLASSIFIED", value: normalized };
  }
  if (family.value === "SHELL_PROCESS") {
    const normalized = normalizeShellRequirements(requirements.value);
    return normalized === undefined
      ? { status: "INVALID" }
      : { status: "CLASSIFIED", value: normalized };
  }
  return { status: "INVALID" };
}

function normalizeFilesystemRequirements(value: unknown): ClassifiedFilesystemTool | undefined {
  const requirements = readDenseArray(value, Number.MAX_SAFE_INTEGER);
  if (requirements.status !== "OK" || requirements.values.length === 0) {
    return undefined;
  }
  const normalized: FilesystemToolRequirement[] = [];
  for (const requirement of requirements.values) {
    const item = normalizeFilesystemRequirement(requirement);
    if (item === undefined) {
      return undefined;
    }
    normalized.push(item);
  }
  return Object.freeze({
    status: "CLASSIFIED",
    requirements: Object.freeze(normalized),
  });
}

function normalizeFilesystemRequirement(value: unknown): FilesystemToolRequirement | undefined {
  const record = inspectArgumentRecord(value);
  if (
    record.status !== "RECORD"
    || hasExactOwnDataKeys(record.value, ["capability", "operand"]) !== true
  ) {
    return undefined;
  }
  const capability = readOwnDataProperty(record.value, "capability");
  const operand = readOwnDataProperty(record.value, "operand");
  if (
    capability.status !== "VALUE"
    || !isFilesystemCapability(capability.value)
    || operand.status !== "VALUE"
  ) {
    return undefined;
  }
  const normalizedOperand = normalizeFilesystemOperand(operand.value);
  if (normalizedOperand === undefined) {
    return undefined;
  }
  return Object.freeze({ capability: capability.value, operand: normalizedOperand });
}

function normalizeFilesystemOperand(value: unknown): FilesystemToolOperand | undefined {
  const record = inspectArgumentRecord(value);
  if (record.status !== "RECORD") {
    return undefined;
  }
  const source = readOwnDataProperty(record.value, "source");
  if (source.status !== "VALUE") {
    return undefined;
  }

  if (source.value === "EXECUTION_ROOT") {
    if (hasExactOwnDataKeys(record.value, ["source", "reach"]) !== true) {
      return undefined;
    }
    const reach = readOwnDataProperty(record.value, "reach");
    return reach.status === "VALUE" && reach.value === "SELF_OR_DESCENDANTS"
      ? Object.freeze({ source: "EXECUTION_ROOT", reach: "SELF_OR_DESCENDANTS" })
      : undefined;
  }

  if (source.value !== "ARGUMENT_PATH") {
    return undefined;
  }
  if (
    hasExactOwnDataKeys(
      record.value,
      ["source", "argumentName", "rawPath", "reach"],
    ) !== true
  ) {
    return undefined;
  }
  const argumentName = readOwnDataProperty(record.value, "argumentName");
  const rawPath = readOwnDataProperty(record.value, "rawPath");
  const reach = readOwnDataProperty(record.value, "reach");
  if (
    argumentName.status !== "VALUE"
    || (argumentName.value !== "file_path" && argumentName.value !== "path")
    || rawPath.status !== "VALUE"
    || typeof rawPath.value !== "string"
    || rawPath.value.trim().length === 0
    || reach.status !== "VALUE"
    || (reach.value !== "EXACT" && reach.value !== "SELF_OR_DESCENDANTS")
  ) {
    return undefined;
  }
  return Object.freeze({
    source: "ARGUMENT_PATH",
    argumentName: argumentName.value,
    rawPath: rawPath.value,
    reach: reach.value,
  });
}

function normalizeShellRequirements(value: unknown): ClassifiedShellTool | undefined {
  const requirements = readDenseArray(value, 1);
  if (requirements.status !== "OK" || requirements.values.length !== 1) {
    return undefined;
  }
  const requirement = normalizeShellRequirement(requirements.values[0]);
  if (requirement === undefined) {
    return undefined;
  }
  return Object.freeze({
    status: "CLASSIFIED",
    requirements: Object.freeze([requirement]),
  });
}

function normalizeShellRequirement(value: unknown): ShellToolRequirement | undefined {
  const record = inspectArgumentRecord(value);
  if (
    record.status !== "RECORD"
    || hasExactOwnDataKeys(record.value, ["capability", "operand"]) !== true
  ) {
    return undefined;
  }
  const capability = readOwnDataProperty(record.value, "capability");
  const operand = readOwnDataProperty(record.value, "operand");
  if (
    capability.status !== "VALUE"
    || capability.value !== "process.exec"
    || operand.status !== "VALUE"
  ) {
    return undefined;
  }
  const normalizedOperand = normalizeShellOperand(operand.value);
  return normalizedOperand === undefined
    ? undefined
    : Object.freeze({
        capability: capability.value satisfies ProcessCapability,
        operand: normalizedOperand,
      });
}

function normalizeShellOperand(value: unknown): ShellCommandOperand | undefined {
  const record = inspectArgumentRecord(value);
  if (
    record.status !== "RECORD"
    || hasExactOwnDataKeys(
      record.value,
      ["source", "dialect", "rawCommand", "executionMode", "workdir"],
    ) !== true
  ) {
    return undefined;
  }
  const source = readOwnDataProperty(record.value, "source");
  const dialect = readOwnDataProperty(record.value, "dialect");
  const rawCommand = readOwnDataProperty(record.value, "rawCommand");
  const executionMode = readOwnDataProperty(record.value, "executionMode");
  const workdir = readOwnDataProperty(record.value, "workdir");
  if (
    source.status !== "VALUE"
    || source.value !== "SHELL_COMMAND"
    || dialect.status !== "VALUE"
    || !isShellDialect(dialect.value)
    || rawCommand.status !== "VALUE"
    || typeof rawCommand.value !== "string"
    || rawCommand.value.trim().length === 0
    || executionMode.status !== "VALUE"
    || !isShellExecutionMode(executionMode.value)
    || workdir.status !== "VALUE"
  ) {
    return undefined;
  }
  const normalizedWorkdir = normalizeShellWorkdir(workdir.value);
  if (normalizedWorkdir === undefined) {
    return undefined;
  }
  return Object.freeze({
    source: "SHELL_COMMAND",
    dialect: dialect.value,
    rawCommand: rawCommand.value,
    executionMode: executionMode.value,
    workdir: normalizedWorkdir,
  });
}

function normalizeShellWorkdir(value: unknown): ShellWorkdirOperand | undefined {
  const record = inspectArgumentRecord(value);
  if (record.status !== "RECORD") {
    return undefined;
  }
  const source = readOwnDataProperty(record.value, "source");
  if (source.status !== "VALUE") {
    return undefined;
  }
  if (source.value === "EXECUTION_ROOT") {
    return hasExactOwnDataKeys(record.value, ["source"]) === true
      ? Object.freeze({ source: "EXECUTION_ROOT" })
      : undefined;
  }
  if (source.value !== "ARGUMENT_WORKDIR") {
    return undefined;
  }
  if (
    hasExactOwnDataKeys(
      record.value,
      ["source", "argumentName", "rawWorkdir"],
    ) !== true
  ) {
    return undefined;
  }
  const argumentName = readOwnDataProperty(record.value, "argumentName");
  const rawWorkdir = readOwnDataProperty(record.value, "rawWorkdir");
  if (
    argumentName.status !== "VALUE"
    || argumentName.value !== "workdir"
    || rawWorkdir.status !== "VALUE"
    || typeof rawWorkdir.value !== "string"
    || rawWorkdir.value.trim().length === 0
  ) {
    return undefined;
  }
  return Object.freeze({
    source: "ARGUMENT_WORKDIR",
    argumentName: "workdir",
    rawWorkdir: rawWorkdir.value,
  });
}

function isFilesystemCapability(value: unknown): value is FilesystemCapability {
  return value === "fs.read"
    || value === "fs.stat"
    || value === "fs.list"
    || value === "fs.create"
    || value === "fs.write"
    || value === "fs.edit"
    || value === "fs.delete"
    || value === "fs.move"
    || value === "fs.link";
}

function isShellDialect(value: unknown): value is ShellDialect {
  return value === "BASH" || value === "POWERSHELL";
}

function isShellExecutionMode(value: unknown): value is ShellExecutionMode {
  return value === "FOREGROUND" || value === "BACKGROUND";
}

function isNativePromise(value: unknown): boolean {
  try {
    return value instanceof Promise;
  } catch {
    return false;
  }
}

function registryError(reason: PluginRegistryErrorReason): PluginRegistryError {
  return Object.freeze({ status: "ERROR", reason });
}
