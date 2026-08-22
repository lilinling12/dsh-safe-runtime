import {
  Parser,
  isAlias,
  isMap,
  isScalar,
  isSeq,
  parseAllDocuments,
} from "yaml";
import {
  DEFAULT_POLICY_DOCUMENT_LOADER_LIMITS,
  loaderFailure,
  type PolicyDocumentJsonValue,
  type PolicyDocumentLoaderLimits,
  type PolicyDocumentLoadResult,
} from "./policy-document-types.js";

interface ConversionState {
  readonly limits: PolicyDocumentLoaderLimits;
  containerEntries: number;
}

interface CstFrame {
  readonly node: unknown;
  readonly depth: number;
}

class YamlConversionFailure extends Error {
  public constructor(
    public readonly reason:
      | "POLICY_DOCUMENT_DUPLICATE_KEY"
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
    // The yaml package intentionally exposes its lexer/parser/composer pipeline.
    // Preflighting the parser's CST lets us enforce our own nesting limit before
    // the recursive composition stage sees attacker-controlled deep collections.
    preflightYamlNesting(source, limits);

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

function preflightYamlNesting(
  source: string,
  limits: PolicyDocumentLoaderLimits,
): void {
  const frames: CstFrame[] = [];
  for (const token of new Parser().parse(source)) {
    frames.push({ node: token, depth: 0 });
  }

  const visited = new WeakSet<object>();
  while (frames.length > 0) {
    const frame = frames.pop();
    if (frame === undefined || !isRecord(frame.node)) {
      continue;
    }
    if (visited.has(frame.node)) {
      continue;
    }
    visited.add(frame.node);

    const type = typeof frame.node["type"] === "string" ? frame.node["type"] : undefined;
    if (type === "document") {
      frames.push({ node: frame.node["value"], depth: frame.depth });
      continue;
    }

    if (isCstCollectionType(type)) {
      const collectionDepth = frame.depth + 1;
      assertDepth(collectionDepth, limits);
      const items = frame.node["items"];
      if (Array.isArray(items)) {
        for (const item of items) {
          frames.push({ node: item, depth: collectionDepth });
        }
      }
      continue;
    }

    // Block collection items are structural records without their own `type`.
    // Their key/value children remain at the parent collection depth; any child
    // collection increments the depth when its own frame is visited.
    if (type === undefined) {
      frames.push({ node: frame.node["key"], depth: frame.depth });
      frames.push({ node: frame.node["value"], depth: frame.depth });
    }
  }
}

function isCstCollectionType(type: string | undefined): boolean {
  return type === "block-map" || type === "block-seq" || type === "flow-collection";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
  input: unknown,
  depth: number,
  state: ConversionState,
): PolicyDocumentJsonValue {
  if (input === null) {
    return null;
  }

  if (isAlias(input)) {
    throw new YamlConversionFailure(
      "POLICY_DOCUMENT_YAML_ALIAS_FORBIDDEN",
      "YAML aliases are forbidden by the M4-001 portable loader profile.",
    );
  }

  if (isScalar(input)) {
    assertSafeNodeMetadata(input.anchor, input.tag);
    return convertScalar(input.value);
  }

  if (isSeq(input)) {
    assertSafeNodeMetadata(input.anchor, input.tag);
    const nextDepth = depth + 1;
    assertDepth(nextDepth, state.limits);
    const values: PolicyDocumentJsonValue[] = [];
    for (const item of input.items) {
      incrementEntries(state);
      values.push(convertYamlNode(item, nextDepth, state));
    }
    return values;
  }

  if (isMap(input)) {
    assertSafeNodeMetadata(input.anchor, input.tag);
    const nextDepth = depth + 1;
    assertDepth(nextDepth, state.limits);
    const keys = new Set<string>();
    const entries: Array<readonly [string, PolicyDocumentJsonValue]> = [];

    for (const pair of input.items) {
      const keyNode = pair.key;
      if (!isScalar(keyNode)) {
        throw new YamlConversionFailure(
          "POLICY_DOCUMENT_NON_STRING_KEY",
          "YAML mapping keys must be scalar strings.",
        );
      }
      assertSafeNodeMetadata(keyNode.anchor, keyNode.tag);
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

function assertSafeNodeMetadata(
  anchor: string | undefined,
  tag: string | undefined,
): void {
  if (anchor !== undefined) {
    throw new YamlConversionFailure(
      "POLICY_DOCUMENT_YAML_ALIAS_FORBIDDEN",
      "YAML anchors are forbidden by the M4-001 portable loader profile.",
    );
  }
  if (tag !== undefined) {
    throw new YamlConversionFailure(
      "POLICY_DOCUMENT_YAML_TAG_FORBIDDEN",
      `Explicit YAML tag ${tag} is forbidden by the M4-001 portable loader profile.`,
    );
  }
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
