import {
  classifyBuiltinFilesystemTool,
  type BuiltinFilesystemToolClassification,
} from "./builtin-filesystem.js";
import {
  classifyBuiltinShellTool,
  type BuiltinShellToolClassification,
} from "./builtin-shell.js";

/**
 * The only portable unknown-tool fallback profile defined by Spec 0029.
 *
 * This is intentionally a closed profile rather than an extensible registry.
 * M4-014 owns generic/plugin classifier registration and precedence semantics.
 */
export type UnknownToolFallbackProfile = "STRICT_DENY_V1";

/**
 * A successful classification or recognized-tool error owned by an accepted
 * built-in classifier. `NOT_APPLICABLE` is internal composition state and never
 * escapes the M4-013 resolver.
 */
export type ResolvedBuiltinToolClassification = Exclude<
  BuiltinFilesystemToolClassification | BuiltinShellToolClassification,
  { readonly status: "NOT_APPLICABLE" }
>;

export interface UnclassifiedToolResolution {
  readonly status: "UNCLASSIFIED";
  readonly profile: "STRICT_DENY_V1";
  readonly disposition: "BLOCK";
  readonly reason: "NO_APPLICABLE_CLASSIFIER";
}

export type ToolClassificationResolutionErrorReason =
  | "UNKNOWN_TOOL_PROFILE_INVALID"
  | "TOOL_NAME_INVALID";

export interface ToolClassificationResolutionError {
  readonly status: "ERROR";
  readonly reason: ToolClassificationResolutionErrorReason;
}

export type ToolClassificationResolution =
  | ResolvedBuiltinToolClassification
  | UnclassifiedToolResolution
  | ToolClassificationResolutionError;

const STRICT_DENY_PROFILE: UnknownToolFallbackProfile = "STRICT_DENY_V1";

const PROFILE_INVALID: ToolClassificationResolutionError = Object.freeze({
  status: "ERROR",
  reason: "UNKNOWN_TOOL_PROFILE_INVALID",
});

const TOOL_NAME_INVALID: ToolClassificationResolutionError = Object.freeze({
  status: "ERROR",
  reason: "TOOL_NAME_INVALID",
});

const UNCLASSIFIED_BLOCKED: UnclassifiedToolResolution = Object.freeze({
  status: "UNCLASSIFIED",
  profile: STRICT_DENY_PROFILE,
  disposition: "BLOCK",
  reason: "NO_APPLICABLE_CLASSIFIER",
});

/**
 * Resolves a model-facing tool call against the fixed M4-013 classifier set.
 *
 * The resolver is deliberately narrower than a PDP or enforcement point:
 *
 * - profile and tool-name validation fail closed before argument inspection;
 * - accepted filesystem/shell classifier results are preserved as-is;
 * - only an all-NOT_APPLICABLE path becomes strict unknown-tool blocking;
 * - unknown-tool arguments are never inspected or retained;
 * - no synthetic capability, resource, approval, lease or decision is created.
 *
 * The current classifier order is deterministic composition over reviewed,
 * disjoint built-in name sets. It is not a generic precedence mechanism.
 * M4-014 must define conflict/precedence semantics before dynamic or overlapping
 * classifiers can be introduced.
 */
export function resolveToolClassification(
  fallbackProfile: unknown,
  toolName: unknown,
  argumentsValue: unknown,
): ToolClassificationResolution {
  if (fallbackProfile !== STRICT_DENY_PROFILE) {
    return PROFILE_INVALID;
  }

  if (typeof toolName !== "string" || toolName.length === 0) {
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

  return UNCLASSIFIED_BLOCKED;
}
