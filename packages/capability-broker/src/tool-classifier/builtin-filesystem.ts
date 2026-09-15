import type { StandardCapability } from "@dsh-safe/protocol";
import { isArgumentRecord, readOwnDataProperty } from "./hostile-input.js";

/** Standard filesystem capabilities owned by the protocol vocabulary. */
export type FilesystemCapability = Extract<StandardCapability, `fs.${string}`>;

export type FilesystemOperandReach = "EXACT" | "SELF_OR_DESCENDANTS";

export interface ArgumentPathOperand {
  readonly source: "ARGUMENT_PATH";
  readonly argumentName: "file_path" | "path";
  readonly rawPath: string;
  readonly reach: FilesystemOperandReach;
}

export interface ExecutionRootOperand {
  readonly source: "EXECUTION_ROOT";
  readonly reach: "SELF_OR_DESCENDANTS";
}

export type FilesystemToolOperand = ArgumentPathOperand | ExecutionRootOperand;

export interface FilesystemToolRequirement {
  readonly capability: FilesystemCapability;
  readonly operand: FilesystemToolOperand;
}

export interface ClassifiedFilesystemTool {
  readonly status: "CLASSIFIED";
  readonly requirements: readonly FilesystemToolRequirement[];
}

export interface FilesystemToolNotApplicable {
  readonly status: "NOT_APPLICABLE";
}

export type FilesystemToolClassificationErrorReason =
  | "FS_TOOL_ARGUMENTS_INVALID"
  | "FS_TOOL_PATH_INVALID"
  | "FS_TOOL_COMMAND_INVALID"
  | "FS_TOOL_INPUT_UNREADABLE";

export interface FilesystemToolClassificationError {
  readonly status: "ERROR";
  readonly reason: FilesystemToolClassificationErrorReason;
}

export type BuiltinFilesystemToolClassification =
  | ClassifiedFilesystemTool
  | FilesystemToolNotApplicable
  | FilesystemToolClassificationError;

type RecognizedFilesystemTool =
  | "read"
  | "read_image"
  | "write"
  | "edit"
  | "glob"
  | "grep"
  | "str_replace_editor";

type EditorCommand = "view" | "create" | "str_replace" | "insert";
type PathArgumentName = "file_path" | "path";

type PathReadResult =
  | { readonly status: "OK"; readonly path: string }
  | { readonly status: "ERROR"; readonly reason: FilesystemToolClassificationErrorReason };

const NOT_APPLICABLE: FilesystemToolNotApplicable = Object.freeze({
  status: "NOT_APPLICABLE",
});

const ARGUMENTS_INVALID: FilesystemToolClassificationError = Object.freeze({
  status: "ERROR",
  reason: "FS_TOOL_ARGUMENTS_INVALID",
});

const PATH_INVALID: FilesystemToolClassificationError = Object.freeze({
  status: "ERROR",
  reason: "FS_TOOL_PATH_INVALID",
});

const COMMAND_INVALID: FilesystemToolClassificationError = Object.freeze({
  status: "ERROR",
  reason: "FS_TOOL_COMMAND_INVALID",
});

const INPUT_UNREADABLE: FilesystemToolClassificationError = Object.freeze({
  status: "ERROR",
  reason: "FS_TOOL_INPUT_UNREADABLE",
});

/**
 * Classifies the exact built-in filesystem tool surface pinned by Spec 0026.
 *
 * This function deliberately performs no IO and returns unresolved operands.
 * Provider resolution, containment, resource canonicalization, authorization,
 * and tool execution belong to later enforcement stages.
 */
export function classifyBuiltinFilesystemTool(
  toolName: string,
  argumentsValue: unknown,
): BuiltinFilesystemToolClassification {
  const recognized = recognizeTool(toolName);
  if (recognized === undefined) {
    // Unknown-tool policy is intentionally deferred to M4-013. In particular,
    // do not touch a hostile argument object for a tool this classifier does not own.
    return NOT_APPLICABLE;
  }

  if (!isArgumentRecord(argumentsValue)) {
    return ARGUMENTS_INVALID;
  }

  switch (recognized) {
    case "read":
    case "read_image":
      return classifyRequiredPathTool(
        argumentsValue,
        "file_path",
        "EXACT",
        ["fs.stat", "fs.read"],
      );
    case "write":
      return classifyRequiredPathTool(
        argumentsValue,
        "file_path",
        "EXACT",
        ["fs.create", "fs.write"],
      );
    case "edit":
      return classifyRequiredPathTool(
        argumentsValue,
        "file_path",
        "EXACT",
        ["fs.edit"],
      );
    case "glob":
      return classifySearchTool(argumentsValue, "fs.list");
    case "grep":
      return classifySearchTool(argumentsValue, "fs.read");
    case "str_replace_editor":
      return classifyStringReplaceEditor(argumentsValue);
  }
}

function recognizeTool(toolName: string): RecognizedFilesystemTool | undefined {
  switch (toolName) {
    case "read":
    case "read_image":
    case "write":
    case "edit":
    case "glob":
    case "grep":
    case "str_replace_editor":
      return toolName;
    default:
      return undefined;
  }
}

function readRequiredPath(target: object, argumentName: PathArgumentName): PathReadResult {
  const property = readOwnDataProperty(target, argumentName);
  if (property.status === "UNREADABLE") {
    return { status: "ERROR", reason: "FS_TOOL_INPUT_UNREADABLE" };
  }
  if (
    property.status === "MISSING"
    || typeof property.value !== "string"
    || property.value.trim().length === 0
  ) {
    return { status: "ERROR", reason: "FS_TOOL_PATH_INVALID" };
  }
  return { status: "OK", path: property.value };
}

function classifyRequiredPathTool(
  argumentsValue: object,
  argumentName: PathArgumentName,
  reach: FilesystemOperandReach,
  capabilities: readonly FilesystemCapability[],
): BuiltinFilesystemToolClassification {
  const path = readRequiredPath(argumentsValue, argumentName);
  if (path.status === "ERROR") {
    return errorResult(path.reason);
  }
  return classified(
    capabilities,
    argumentPathOperand(argumentName, path.path, reach),
  );
}

function classifySearchTool(
  argumentsValue: object,
  capability: FilesystemCapability,
): BuiltinFilesystemToolClassification {
  const property = readOwnDataProperty(argumentsValue, "path");
  if (property.status === "UNREADABLE") {
    return INPUT_UNREADABLE;
  }
  if (property.status === "MISSING") {
    return classified([capability], executionRootOperand());
  }
  if (typeof property.value !== "string" || property.value.trim().length === 0) {
    return PATH_INVALID;
  }
  return classified(
    [capability],
    argumentPathOperand("path", property.value, "SELF_OR_DESCENDANTS"),
  );
}

function classifyStringReplaceEditor(
  argumentsValue: object,
): BuiltinFilesystemToolClassification {
  const commandProperty = readOwnDataProperty(argumentsValue, "command");
  if (commandProperty.status === "UNREADABLE") {
    return INPUT_UNREADABLE;
  }
  if (
    commandProperty.status === "MISSING"
    || !isEditorCommand(commandProperty.value)
  ) {
    return COMMAND_INVALID;
  }

  const path = readRequiredPath(argumentsValue, "path");
  if (path.status === "ERROR") {
    return errorResult(path.reason);
  }

  switch (commandProperty.value) {
    case "view":
      return classified(
        ["fs.stat", "fs.read", "fs.list"],
        argumentPathOperand("path", path.path, "SELF_OR_DESCENDANTS"),
      );
    case "create":
      return classified(
        ["fs.stat", "fs.create"],
        argumentPathOperand("path", path.path, "EXACT"),
      );
    case "str_replace":
    case "insert":
      return classified(
        ["fs.stat", "fs.read", "fs.write"],
        argumentPathOperand("path", path.path, "EXACT"),
      );
  }
}

function isEditorCommand(value: unknown): value is EditorCommand {
  return value === "view"
    || value === "create"
    || value === "str_replace"
    || value === "insert";
}

function argumentPathOperand(
  argumentName: PathArgumentName,
  rawPath: string,
  reach: FilesystemOperandReach,
): ArgumentPathOperand {
  return Object.freeze({
    source: "ARGUMENT_PATH",
    argumentName,
    rawPath,
    reach,
  });
}

function executionRootOperand(): ExecutionRootOperand {
  return Object.freeze({
    source: "EXECUTION_ROOT",
    reach: "SELF_OR_DESCENDANTS",
  });
}

function classified(
  capabilities: readonly FilesystemCapability[],
  operand: FilesystemToolOperand,
): ClassifiedFilesystemTool {
  const requirements = capabilities.map((capability) =>
    Object.freeze({ capability, operand } satisfies FilesystemToolRequirement));
  return Object.freeze({
    status: "CLASSIFIED",
    requirements: Object.freeze(requirements),
  });
}

function errorResult(
  reason: FilesystemToolClassificationErrorReason,
): FilesystemToolClassificationError {
  switch (reason) {
    case "FS_TOOL_ARGUMENTS_INVALID":
      return ARGUMENTS_INVALID;
    case "FS_TOOL_PATH_INVALID":
      return PATH_INVALID;
    case "FS_TOOL_COMMAND_INVALID":
      return COMMAND_INVALID;
    case "FS_TOOL_INPUT_UNREADABLE":
      return INPUT_UNREADABLE;
  }
}
