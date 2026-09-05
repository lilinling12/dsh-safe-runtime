import type { StandardCapability } from "@dsh-safe/protocol";
import { isArgumentRecord, readOwnDataProperty } from "./hostile-input.js";

/** Standard process capabilities owned by the protocol vocabulary. */
export type ProcessCapability = Extract<StandardCapability, `process.${string}`>;

export type ShellDialect = "BASH" | "POWERSHELL";
export type ShellExecutionMode = "FOREGROUND" | "BACKGROUND";

export interface ArgumentWorkdirOperand {
  readonly source: "ARGUMENT_WORKDIR";
  readonly argumentName: "workdir";
  readonly rawWorkdir: string;
}

export interface ShellExecutionRootOperand {
  readonly source: "EXECUTION_ROOT";
}

export type ShellWorkdirOperand = ArgumentWorkdirOperand | ShellExecutionRootOperand;

export interface ShellCommandOperand {
  readonly source: "SHELL_COMMAND";
  readonly dialect: ShellDialect;
  readonly rawCommand: string;
  readonly executionMode: ShellExecutionMode;
  readonly workdir: ShellWorkdirOperand;
}

export interface ShellToolRequirement {
  readonly capability: ProcessCapability;
  readonly operand: ShellCommandOperand;
}

export interface ClassifiedShellTool {
  readonly status: "CLASSIFIED";
  readonly requirements: readonly ShellToolRequirement[];
}

export interface ShellToolNotApplicable {
  readonly status: "NOT_APPLICABLE";
}

export type ShellToolClassificationErrorReason =
  | "SHELL_TOOL_ARGUMENTS_INVALID"
  | "SHELL_TOOL_COMMAND_INVALID"
  | "SHELL_TOOL_WORKDIR_INVALID"
  | "SHELL_TOOL_BACKGROUND_INVALID"
  | "SHELL_TOOL_INPUT_UNREADABLE";

export interface ShellToolClassificationError {
  readonly status: "ERROR";
  readonly reason: ShellToolClassificationErrorReason;
}

export type BuiltinShellToolClassification =
  | ClassifiedShellTool
  | ShellToolNotApplicable
  | ShellToolClassificationError;

type RecognizedShellTool = {
  readonly dialect: ShellDialect;
};

type CommandReadResult =
  | { readonly status: "OK"; readonly command: string }
  | { readonly status: "ERROR"; readonly reason: ShellToolClassificationErrorReason };

type WorkdirReadResult =
  | { readonly status: "OK"; readonly workdir: ShellWorkdirOperand }
  | { readonly status: "ERROR"; readonly reason: ShellToolClassificationErrorReason };

type ExecutionModeReadResult =
  | { readonly status: "OK"; readonly executionMode: ShellExecutionMode }
  | { readonly status: "ERROR"; readonly reason: ShellToolClassificationErrorReason };

const BASH_TOOL: RecognizedShellTool = Object.freeze({
  dialect: "BASH",
});

const POWERSHELL_TOOL: RecognizedShellTool = Object.freeze({
  dialect: "POWERSHELL",
});

const NOT_APPLICABLE: ShellToolNotApplicable = Object.freeze({
  status: "NOT_APPLICABLE",
});

const ARGUMENTS_INVALID: ShellToolClassificationError = Object.freeze({
  status: "ERROR",
  reason: "SHELL_TOOL_ARGUMENTS_INVALID",
});

const COMMAND_INVALID: ShellToolClassificationError = Object.freeze({
  status: "ERROR",
  reason: "SHELL_TOOL_COMMAND_INVALID",
});

const WORKDIR_INVALID: ShellToolClassificationError = Object.freeze({
  status: "ERROR",
  reason: "SHELL_TOOL_WORKDIR_INVALID",
});

const BACKGROUND_INVALID: ShellToolClassificationError = Object.freeze({
  status: "ERROR",
  reason: "SHELL_TOOL_BACKGROUND_INVALID",
});

const INPUT_UNREADABLE: ShellToolClassificationError = Object.freeze({
  status: "ERROR",
  reason: "SHELL_TOOL_INPUT_UNREADABLE",
});

/**
 * Classifies the exact built-in shell tool surface pinned by Spec 0027.
 *
 * Shell command text remains opaque evidence. This classifier does not parse
 * shell syntax, infer nested filesystem/network effects, resolve executables or
 * workdirs, request a terminal, manufacture signal authority, authorize policy,
 * or invoke a provider.
 */
export function classifyBuiltinShellTool(
  toolName: string,
  argumentsValue: unknown,
): BuiltinShellToolClassification {
  const recognized = recognizeTool(toolName);
  if (recognized === undefined) {
    // Unknown-tool fallback belongs to M4-013. Do not inspect hostile arguments
    // for a tool name this classifier does not own.
    return NOT_APPLICABLE;
  }

  if (!isArgumentRecord(argumentsValue)) {
    return ARGUMENTS_INVALID;
  }

  // Inspection order is normative and intentionally bounded. It keeps the
  // fail-closed diagnostic deterministic when multiple hostile fields exist.
  const command = readCommand(argumentsValue);
  if (command.status === "ERROR") {
    return errorResult(command.reason);
  }

  const workdir = readWorkdir(argumentsValue);
  if (workdir.status === "ERROR") {
    return errorResult(workdir.reason);
  }

  const executionMode = readExecutionMode(argumentsValue);
  if (executionMode.status === "ERROR") {
    return errorResult(executionMode.reason);
  }

  return classified(
    recognized.dialect,
    command.command,
    executionMode.executionMode,
    workdir.workdir,
  );
}

function recognizeTool(toolName: string): RecognizedShellTool | undefined {
  switch (toolName) {
    case "bash":
      return BASH_TOOL;
    case "pwsh":
      return POWERSHELL_TOOL;
    default:
      return undefined;
  }
}

function readCommand(target: object): CommandReadResult {
  const property = readOwnDataProperty(target, "command");
  if (property.status === "UNREADABLE") {
    return { status: "ERROR", reason: "SHELL_TOOL_INPUT_UNREADABLE" };
  }
  if (
    property.status === "MISSING"
    || typeof property.value !== "string"
    || property.value.trim().length === 0
  ) {
    return { status: "ERROR", reason: "SHELL_TOOL_COMMAND_INVALID" };
  }
  return { status: "OK", command: property.value };
}

function readWorkdir(target: object): WorkdirReadResult {
  const property = readOwnDataProperty(target, "workdir");
  if (property.status === "UNREADABLE") {
    return { status: "ERROR", reason: "SHELL_TOOL_INPUT_UNREADABLE" };
  }
  if (property.status === "MISSING") {
    return { status: "OK", workdir: executionRootOperand() };
  }
  if (typeof property.value !== "string" || property.value.trim().length === 0) {
    return { status: "ERROR", reason: "SHELL_TOOL_WORKDIR_INVALID" };
  }
  return {
    status: "OK",
    workdir: argumentWorkdirOperand(property.value),
  };
}

function readExecutionMode(target: object): ExecutionModeReadResult {
  const property = readOwnDataProperty(target, "run_in_background");
  if (property.status === "UNREADABLE") {
    return { status: "ERROR", reason: "SHELL_TOOL_INPUT_UNREADABLE" };
  }
  if (property.status === "MISSING" || property.value === false) {
    return { status: "OK", executionMode: "FOREGROUND" };
  }
  if (property.value === true) {
    return { status: "OK", executionMode: "BACKGROUND" };
  }
  return { status: "ERROR", reason: "SHELL_TOOL_BACKGROUND_INVALID" };
}

function argumentWorkdirOperand(rawWorkdir: string): ArgumentWorkdirOperand {
  return Object.freeze({
    source: "ARGUMENT_WORKDIR",
    argumentName: "workdir",
    rawWorkdir,
  });
}

function executionRootOperand(): ShellExecutionRootOperand {
  return Object.freeze({
    source: "EXECUTION_ROOT",
  });
}

function classified(
  dialect: ShellDialect,
  rawCommand: string,
  executionMode: ShellExecutionMode,
  workdir: ShellWorkdirOperand,
): ClassifiedShellTool {
  const operand = Object.freeze({
    source: "SHELL_COMMAND",
    dialect,
    rawCommand,
    executionMode,
    workdir,
  } satisfies ShellCommandOperand);

  const requirement = Object.freeze({
    capability: "process.exec",
    operand,
  } satisfies ShellToolRequirement);

  return Object.freeze({
    status: "CLASSIFIED",
    requirements: Object.freeze([requirement]),
  });
}

function errorResult(
  reason: ShellToolClassificationErrorReason,
): ShellToolClassificationError {
  switch (reason) {
    case "SHELL_TOOL_ARGUMENTS_INVALID":
      return ARGUMENTS_INVALID;
    case "SHELL_TOOL_COMMAND_INVALID":
      return COMMAND_INVALID;
    case "SHELL_TOOL_WORKDIR_INVALID":
      return WORKDIR_INVALID;
    case "SHELL_TOOL_BACKGROUND_INVALID":
      return BACKGROUND_INVALID;
    case "SHELL_TOOL_INPUT_UNREADABLE":
      return INPUT_UNREADABLE;
  }
}
