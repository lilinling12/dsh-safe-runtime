import {
  isAlias,
  isMap,
  isScalar,
  isSeq,
  parseAllDocuments,
  type Node,
} from "yaml";
import {
  DEFAULT_POLICY_DOCUMENT_LOADER_LIMITS,
  loaderFailure,
  type PolicyDocumentJsonValue,
  type PolicyDocumentLoaderLimits,
  type PolicyDocumentLoadFailureReason,
  type PolicyDocumentLoadResult,
} from "./policy-document-types.js";

interface ConversionState {
  readonly limits: PolicyDocumentLoaderLimits;
  containerEntries: number;
}

class YamlConversionFailure extends Error {
  public constructor(
    public readonly reason:
      | "POLICY_DOCUMENT_YAML_ALIAS_FORBIDDEN"
      | "POLICY_DOCUMENT_YAML_TAG_FORBIDDEN"
      | "POLICY_DOCUMENT_YAML_MERGE_FORBIDDEN"
      | "POLICY_DOCUMENT_NON_STRING_KEY"
      | "POLICY_DOCUMENT_NON_JSON_VALUE"
      | "POLICY_DOCUMENT_LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "YamlConversionFailure";
  }
}

export function parseYamlPolicyDocument(
  source: string,
  limits: PolicyDocumentLoaderLimits = DEFAULT_POLICY_DOCUMENT_LOADER_LIMITS,
): PolicyDocumentLoadResult {
  assertLimits(limits);
  if (new TextEncoder().encode(source).byteLength > limits.maxSourceBytes) {
    return loaderFailure(
      "POLICY_DOCUMENT_LIMIT_EXCEEDED",
      `Source exceeds configured maximum ${limits.maxSourceBytes} bytes.`,
    );
  }

  try {
    const documents = parseAllDocuments(source, {
      merge: false,
      prettyErrors: false,
      resolveKnownTags: false,
      schema: "core",
      strict: true,
      uniqueKeys: true,
      version: "1.2",
    });

    if (documents.length !== 1) {
      return loaderFailure(
        "POLICY_DOCUMENT_MULTIPLE_DOCUMENTS",
        `Expected exactly one YAML document, received ${documents.length}.`,
      );
    }

    const document = documents[0];
    if (document === undefined) {
      return loaderFailure(
        "POLICY_DOCUMENT_MULTIPLE_DOCUMENTS",
        "Expected exactly one YAML document.",
      );
    }

    const parserFailure = classifyParserErrors(document.errors);
    if (parserFailure !== undefined) {
      return parserFailure;
    }

    const state: ConversionState = { limits, containerEntries: 0 };
    const value = convertYamlNode(document.contents, 0, state);
    return Object.freeze({ ok: true as const, value });
  } catch (error: unknown) {
    if (error instanceof YamlConversionFailure) {
      return loaderFailure(error.reason, error.message);
    }
    if (error instanceof RangeError) {
      return loaderFailure(
        "POLICY_DOCUMENT_LIMIT_EXCEEDED",
        "YAML parser exceeded a finite runtime resource boundary.",
      );
    }
    return loaderFailure(
      "POLICY_DOCUMENT_SYNTAX_INVALID",
      "YAML parser rejected the input before a document could be produced.",
    );
  }
}

function classifyParserErrors(
  errors: readonly { readonly code: string; readonly message: string }[],
): ReturnType<typeof loaderFailure> | undefined {
  if (errors.length === 0) {
    return undefined;
  }

  const prioritized = [
    "DUPLICATE_KEY",
    "NON_STRING_KEY",
    "RESOURCE_EXHAUSTION",
  ] as const;

  for (const code of prioritized) {
    const match = errors.find(error => error.code === code);
    if (match === undefined) {
      continue;
    }
    switch (code) {
      case "DUPLICATE_KEY":
        return loaderFailure("POLICY_DOCUMENT_DUPLICATE_KEY", match.message);
      case "NON_STRING_KEY":
        return loaderFailure("POLICY_DOCUMENT_NON_STRING_KEY", match.message);
      case "RESOURCE_EXHAUSTION":
        return loaderFailure("POLICY_DOCUMENT_LIMIT_EXCEEDED", match.message);
    }
  }

  return loaderFailure("POLICY_DOCUMENT_SYNTAX_INVALID", errors[0]?.message);
}

function convertYamlNode(
  node: Node | null,
  depth: number,
  state: ConversionState,
): PolicyDocumentJsonValue {
  if (node === null) {
    return null;
  }
  if (isAlias(node)) {
    throw new YamlConversionFailure(
      "POLICY_DOCUMENT_YAML_ALIAS_FORBIDDEN",
      "YAML aliases are forbidden by the M4-001 portable loader profile.",
    );
  }
  if (node.anchor !== undefined) {
    throw new YamlConversionFailure(
      "POLICY_DOCUMENT_YAML_ALIAS_FORBIDDEN",
      "YAML anchors are forbidden by the M4-001 portable loader profile.",
    );
  }
  if (node.tag !== undefined) {
    throw new YamlConversionFailure(
      "POLICY_DOCUMENT_YAML_TAG_FORBIDDEN",
      `Explicit YAML tag ${node.tag} is forbidden by the M4-001 portable loader profile.`,
    );
  }

  if (isScalar(node)) {
    return convertScalar(node.value);
  }

  if (isSeq(node)) {
    const nextDepth = depth + 1;
    assertDepth(nextDepth, state.limits);
    const values: PolicyDocumentJsonValue[] = [];
    for (const item of node.items) {
      incrementEntries(state);
      values.push(convertYamlNode(item, nextDepth, state));
    }
    return values;
  }

  if (isMap(node)) {
    const nextDepth = depth + 1;
    assertDepth(nextDepth, state.limits);
    const keys = new Set<string>();
    const entries: Array<readonly [string, PolicyDocumentJsonValue]> = [];

    for (const pair of node.items) {
      const keyNode = pair.key;
      if (!isScalar(keyNode)) {
        throw new YamlConversionFailure(
          "POLICY_DOCUMENT_NON_STRING_KEY",
          "YAML mapping keys must be scalar strings.",
        );
      }
      if (keyNode.anchor !== undefined) {
        throw new YamlConversionFailure(
          "POLICY_DOCUMENT_YAML_ALIAS_FORBIDDEN",
          "YAML anchors are forbidden on mapping keys.",
        );
      }
      if (keyNode.tag !== undefined) {
        throw new YamlConversionFailure(
          "POLICY_DOCUMENT_YAML_TAG_FORBIDDEN",
          `Explicit YAML tag ${keyNode.tag} is forbidden on mapping keys.`,
        );
      }
      if (typeof keyNode.value !== "string") {
        throw new YamlConversionFailure(
          "POLICY_DOCUMENT_NON_STRING_KEY",
          "YAML mapping keys must resolve to strings without coercion.",
        );
      }

      const key = keyNode.value;
      if (key === "<<") {
        throw new YamlConversionFailure(
          "POLICY_DOCUMENT_YAML_MERGE_FORBIDDEN",
          "YAML merge keys are forbidden by the M4-001 portable loader profile.",
        );
      }
      if (keys.has(key)) {
        throw new YamlConversionFailure(
          "POLICY_DOCUMENT_DUPLICATE_KEY",
          `Duplicate YAML mapping key ${JSON.stringify(key)}.`,
        );
      }
      keys.add(key);
      incrementEntries(state);
      entries.push([key, convertYamlNode(pair.value, nextDepth, state)]);
    }

    return Object.fromEntries(entries) as {
      [key: string]: PolicyDocumentJsonValue;
    };
  }

  throw new YamlConversionFailure(
    "POLICY_DOCUMENT_NON_JSON_VALUE",
    "YAML node type is outside the JSON-compatible loader profile.",
  );
}

function convertScalar(value: unknown): PolicyDocumentJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new YamlConversionFailure(
        "POLICY_DOCUMENT_NON_JSON_VALUE",
        "YAML numbers must resolve to finite runtime numbers.",
      );
    }
    return value;
  }

  throw new YamlConversionFailure(
    "POLICY_DOCUMENT_NON_JSON_VALUE",
    `YAML scalar resolved to unsupported runtime type ${typeof value}.`,
  );
}

function assertLimits(limits: PolicyDocumentLoaderLimits): void {
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RangeError(`${name} must be a positive safe integer.`);
    }
  }
}

function assertDepth(depth: number, limits: PolicyDocumentLoaderLimits): void {
  if (depth > limits.maxDepth) {
    throw new YamlConversionFailure(
      "POLICY_DOCUMENT_LIMIT_EXCEEDED",
      `Container depth exceeds configured maximum ${limits.maxDepth}.`,
    );
  }
}

function incrementEntries(state: ConversionState): void {
  state.containerEntries += 1;
  if (state.containerEntries > state.limits.maxContainerEntries) {
    throw new YamlConversionFailure(
      "POLICY_DOCUMENT_LIMIT_EXCEEDED",
      `Container entries exceed configured maximum ${state.limits.maxContainerEntries}.`,
    );
  }
}
