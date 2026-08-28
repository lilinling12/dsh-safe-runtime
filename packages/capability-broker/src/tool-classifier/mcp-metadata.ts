import { isArgumentRecord, readOwnDataProperty } from "./hostile-input.js";

/** Provenance for one normalized standard MCP ToolAnnotations boolean hint. */
export type McpToolHintSource = "EXPLICIT" | "MCP_DEFAULT";

/** Applicability defined by MCP for hints that are meaningless on read-only tools. */
export type McpConditionalHintApplicability =
  | "APPLICABLE"
  | "NOT_APPLICABLE_READ_ONLY";

export interface McpBooleanHintEvidence {
  readonly value: boolean;
  readonly source: McpToolHintSource;
}

export interface McpConditionalBooleanHintEvidence extends McpBooleanHintEvidence {
  readonly applicability: McpConditionalHintApplicability;
}

export interface McpToolAnnotationHints {
  readonly readOnlyHint: McpBooleanHintEvidence;
  readonly destructiveHint: McpConditionalBooleanHintEvidence;
  readonly idempotentHint: McpConditionalBooleanHintEvidence;
  readonly openWorldHint: McpBooleanHintEvidence;
}

/**
 * Normalized MCP ToolAnnotations evidence.
 *
 * `authority` and `trust` are intentionally fixed negative-boundary markers:
 * this value is advisory metadata, not a capability requirement or a server
 * trust attestation.
 */
export interface McpToolAnnotationsEvidence {
  readonly kind: "MCP_TOOL_ANNOTATIONS";
  readonly profile: "MCP_2025_11_25";
  readonly authority: "ADVISORY_ONLY";
  readonly trust: "UNVERIFIED_SERVER";
  readonly hints: McpToolAnnotationHints;
}

export interface ClassifiedMcpToolMetadata {
  readonly status: "CLASSIFIED";
  readonly evidence: McpToolAnnotationsEvidence;
}

export type McpToolMetadataClassificationErrorReason =
  | "MCP_TOOL_METADATA_INVALID"
  | "MCP_TOOL_ANNOTATIONS_INVALID"
  | "MCP_TOOL_READ_ONLY_HINT_INVALID"
  | "MCP_TOOL_DESTRUCTIVE_HINT_INVALID"
  | "MCP_TOOL_IDEMPOTENT_HINT_INVALID"
  | "MCP_TOOL_OPEN_WORLD_HINT_INVALID"
  | "MCP_TOOL_METADATA_UNREADABLE";

export interface McpToolMetadataClassificationError {
  readonly status: "ERROR";
  readonly reason: McpToolMetadataClassificationErrorReason;
}

export type McpToolMetadataClassification =
  | ClassifiedMcpToolMetadata
  | McpToolMetadataClassificationError;

type KnownBooleanHintName =
  | "readOnlyHint"
  | "destructiveHint"
  | "idempotentHint"
  | "openWorldHint";

type HintReadResult =
  | { readonly status: "OK"; readonly hint: McpBooleanHintEvidence }
  | { readonly status: "ERROR"; readonly reason: McpToolMetadataClassificationErrorReason };

const METADATA_INVALID: McpToolMetadataClassificationError = Object.freeze({
  status: "ERROR",
  reason: "MCP_TOOL_METADATA_INVALID",
});

const ANNOTATIONS_INVALID: McpToolMetadataClassificationError = Object.freeze({
  status: "ERROR",
  reason: "MCP_TOOL_ANNOTATIONS_INVALID",
});

const READ_ONLY_HINT_INVALID: McpToolMetadataClassificationError = Object.freeze({
  status: "ERROR",
  reason: "MCP_TOOL_READ_ONLY_HINT_INVALID",
});

const DESTRUCTIVE_HINT_INVALID: McpToolMetadataClassificationError = Object.freeze({
  status: "ERROR",
  reason: "MCP_TOOL_DESTRUCTIVE_HINT_INVALID",
});

const IDEMPOTENT_HINT_INVALID: McpToolMetadataClassificationError = Object.freeze({
  status: "ERROR",
  reason: "MCP_TOOL_IDEMPOTENT_HINT_INVALID",
});

const OPEN_WORLD_HINT_INVALID: McpToolMetadataClassificationError = Object.freeze({
  status: "ERROR",
  reason: "MCP_TOOL_OPEN_WORLD_HINT_INVALID",
});

const METADATA_UNREADABLE: McpToolMetadataClassificationError = Object.freeze({
  status: "ERROR",
  reason: "MCP_TOOL_METADATA_UNREADABLE",
});

/**
 * Normalizes the MCP 2025-11-25 ToolAnnotations behavior hints as unverified,
 * advisory-only evidence.
 *
 * The caller owns MCP source/profile selection. This primitive deliberately
 * performs no authorization, capability inference, server-trust evaluation,
 * tool-name parsing, or Adapter lookup.
 */
export function classifyMcpToolMetadata(
  metadata: unknown,
): McpToolMetadataClassification {
  if (!isArgumentRecord(metadata)) {
    return METADATA_INVALID;
  }

  const annotationsProperty = readOwnDataProperty(metadata, "annotations");
  if (annotationsProperty.status === "UNREADABLE") {
    return METADATA_UNREADABLE;
  }
  if (annotationsProperty.status === "MISSING") {
    return classified(
      defaultHint(false),
      defaultHint(true),
      defaultHint(false),
      defaultHint(true),
    );
  }
  if (!isArgumentRecord(annotationsProperty.value)) {
    return ANNOTATIONS_INVALID;
  }

  const annotations = annotationsProperty.value;

  // This order is normative (Spec 0028 §4.2) so hostile multi-field input has
  // deterministic diagnostics across implementations.
  const readOnly = readBooleanHint(
    annotations,
    "readOnlyHint",
    false,
    "MCP_TOOL_READ_ONLY_HINT_INVALID",
  );
  if (readOnly.status === "ERROR") {
    return errorResult(readOnly.reason);
  }

  const destructive = readBooleanHint(
    annotations,
    "destructiveHint",
    true,
    "MCP_TOOL_DESTRUCTIVE_HINT_INVALID",
  );
  if (destructive.status === "ERROR") {
    return errorResult(destructive.reason);
  }

  const idempotent = readBooleanHint(
    annotations,
    "idempotentHint",
    false,
    "MCP_TOOL_IDEMPOTENT_HINT_INVALID",
  );
  if (idempotent.status === "ERROR") {
    return errorResult(idempotent.reason);
  }

  const openWorld = readBooleanHint(
    annotations,
    "openWorldHint",
    true,
    "MCP_TOOL_OPEN_WORLD_HINT_INVALID",
  );
  if (openWorld.status === "ERROR") {
    return errorResult(openWorld.reason);
  }

  return classified(
    readOnly.hint,
    destructive.hint,
    idempotent.hint,
    openWorld.hint,
  );
}

function readBooleanHint(
  annotations: object,
  name: KnownBooleanHintName,
  defaultValue: boolean,
  invalidReason: McpToolMetadataClassificationErrorReason,
): HintReadResult {
  const property = readOwnDataProperty(annotations, name);
  if (property.status === "UNREADABLE") {
    return { status: "ERROR", reason: "MCP_TOOL_METADATA_UNREADABLE" };
  }
  if (property.status === "MISSING") {
    return { status: "OK", hint: defaultHint(defaultValue) };
  }
  if (typeof property.value !== "boolean") {
    return { status: "ERROR", reason: invalidReason };
  }
  return {
    status: "OK",
    hint: Object.freeze({
      value: property.value,
      source: "EXPLICIT",
    }),
  };
}

function defaultHint(value: boolean): McpBooleanHintEvidence {
  return Object.freeze({
    value,
    source: "MCP_DEFAULT",
  });
}

function classified(
  readOnlyHint: McpBooleanHintEvidence,
  destructiveHint: McpBooleanHintEvidence,
  idempotentHint: McpBooleanHintEvidence,
  openWorldHint: McpBooleanHintEvidence,
): ClassifiedMcpToolMetadata {
  const applicability: McpConditionalHintApplicability = readOnlyHint.value
    ? "NOT_APPLICABLE_READ_ONLY"
    : "APPLICABLE";

  const hints: McpToolAnnotationHints = Object.freeze({
    readOnlyHint: Object.freeze({
      value: readOnlyHint.value,
      source: readOnlyHint.source,
    }),
    destructiveHint: Object.freeze({
      value: destructiveHint.value,
      source: destructiveHint.source,
      applicability,
    }),
    idempotentHint: Object.freeze({
      value: idempotentHint.value,
      source: idempotentHint.source,
      applicability,
    }),
    openWorldHint: Object.freeze({
      value: openWorldHint.value,
      source: openWorldHint.source,
    }),
  });

  const evidence: McpToolAnnotationsEvidence = Object.freeze({
    kind: "MCP_TOOL_ANNOTATIONS",
    profile: "MCP_2025_11_25",
    authority: "ADVISORY_ONLY",
    trust: "UNVERIFIED_SERVER",
    hints,
  });

  return Object.freeze({
    status: "CLASSIFIED",
    evidence,
  });
}

function errorResult(
  reason: McpToolMetadataClassificationErrorReason,
): McpToolMetadataClassificationError {
  switch (reason) {
    case "MCP_TOOL_METADATA_INVALID":
      return METADATA_INVALID;
    case "MCP_TOOL_ANNOTATIONS_INVALID":
      return ANNOTATIONS_INVALID;
    case "MCP_TOOL_READ_ONLY_HINT_INVALID":
      return READ_ONLY_HINT_INVALID;
    case "MCP_TOOL_DESTRUCTIVE_HINT_INVALID":
      return DESTRUCTIVE_HINT_INVALID;
    case "MCP_TOOL_IDEMPOTENT_HINT_INVALID":
      return IDEMPOTENT_HINT_INVALID;
    case "MCP_TOOL_OPEN_WORLD_HINT_INVALID":
      return OPEN_WORLD_HINT_INVALID;
    case "MCP_TOOL_METADATA_UNREADABLE":
      return METADATA_UNREADABLE;
  }
}
