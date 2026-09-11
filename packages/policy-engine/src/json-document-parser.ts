import {
  DEFAULT_POLICY_DOCUMENT_LOADER_LIMITS,
  loaderFailure,
  type PolicyDocumentJsonValue,
  type PolicyDocumentLoaderLimits,
  type PolicyDocumentLoadResult,
} from "./policy-document-types.js";

const JSON_WHITESPACE = new Set([" ", "\t", "\n", "\r"]);
const HEX_DIGIT = /^[0-9a-fA-F]$/;

class JsonDocumentParser {
  private offset = 0;
  private containerEntries = 0;

  public constructor(
    private readonly source: string,
    private readonly limits: PolicyDocumentLoaderLimits,
  ) {}

  public parse(): PolicyDocumentJsonValue {
    this.skipWhitespace();
    const value = this.parseValue(0);
    this.skipWhitespace();
    if (!this.isAtEnd()) {
      throw new JsonParseFailure(
        "POLICY_DOCUMENT_SYNTAX_INVALID",
        "Trailing non-whitespace content after the JSON value.",
      );
    }
    return value;
  }

  private parseValue(depth: number): PolicyDocumentJsonValue {
    const token = this.peek();
    switch (token) {
      case "{":
        return this.parseObject(depth + 1);
      case "[":
        return this.parseArray(depth + 1);
      case '"':
        return this.parseString();
      case "t":
        this.consumeLiteral("true");
        return true;
      case "f":
        this.consumeLiteral("false");
        return false;
      case "n":
        this.consumeLiteral("null");
        return null;
      default:
        if (token === "-" || isAsciiDigit(token)) {
          return this.parseNumber();
        }
        throw new JsonParseFailure(
          "POLICY_DOCUMENT_SYNTAX_INVALID",
          `Unexpected token at offset ${this.offset}.`,
        );
    }
  }

  private parseObject(depth: number): { [key: string]: PolicyDocumentJsonValue } {
    this.assertDepth(depth);
    this.expect("{");
    this.skipWhitespace();

    const entries: Array<readonly [string, PolicyDocumentJsonValue]> = [];
    const keys = new Set<string>();
    if (this.tryConsume("}")) {
      return {};
    }

    while (true) {
      if (this.peek() !== '"') {
        throw new JsonParseFailure(
          "POLICY_DOCUMENT_SYNTAX_INVALID",
          `Expected an object key at offset ${this.offset}.`,
        );
      }
      const key = this.parseString();
      if (keys.has(key)) {
        throw new JsonParseFailure(
          "POLICY_DOCUMENT_DUPLICATE_KEY",
          `Duplicate JSON object key ${JSON.stringify(key)}.`,
        );
      }
      keys.add(key);
      this.incrementEntries();

      this.skipWhitespace();
      this.expect(":");
      this.skipWhitespace();
      entries.push([key, this.parseValue(depth)]);
      this.skipWhitespace();

      if (this.tryConsume("}")) {
        return Object.fromEntries(entries) as {
          [key: string]: PolicyDocumentJsonValue;
        };
      }
      this.expect(",");
      this.skipWhitespace();
    }
  }

  private parseArray(depth: number): PolicyDocumentJsonValue[] {
    this.assertDepth(depth);
    this.expect("[");
    this.skipWhitespace();

    const values: PolicyDocumentJsonValue[] = [];
    if (this.tryConsume("]")) {
      return values;
    }

    while (true) {
      this.incrementEntries();
      values.push(this.parseValue(depth));
      this.skipWhitespace();
      if (this.tryConsume("]")) {
        return values;
      }
      this.expect(",");
      this.skipWhitespace();
    }
  }

  private parseString(): string {
    const start = this.offset;
    this.expect('"');

    while (!this.isAtEnd()) {
      const char = this.source[this.offset];
      if (char === '"') {
        this.offset += 1;
        const raw = this.source.slice(start, this.offset);
        try {
          const decoded: unknown = JSON.parse(raw);
          if (typeof decoded !== "string") {
            throw new Error("JSON string parser produced a non-string value.");
          }
          return decoded;
        } catch {
          throw new JsonParseFailure(
            "POLICY_DOCUMENT_SYNTAX_INVALID",
            `Invalid JSON string at offset ${start}.`,
          );
        }
      }

      if (char === "\\") {
        this.offset += 1;
        const escaped = this.source[this.offset];
        if (escaped === undefined) {
          break;
        }
        if (escaped === "u") {
          for (let index = 1; index <= 4; index += 1) {
            const digit = this.source[this.offset + index];
            if (digit === undefined || !HEX_DIGIT.test(digit)) {
              throw new JsonParseFailure(
                "POLICY_DOCUMENT_SYNTAX_INVALID",
                `Invalid Unicode escape at offset ${this.offset - 1}.`,
              );
            }
          }
          this.offset += 5;
          continue;
        }
        if (!['"', "\\", "/", "b", "f", "n", "r", "t"].includes(escaped)) {
          throw new JsonParseFailure(
            "POLICY_DOCUMENT_SYNTAX_INVALID",
            `Invalid JSON escape at offset ${this.offset - 1}.`,
          );
        }
        this.offset += 1;
        continue;
      }

      if (char === undefined || char.charCodeAt(0) < 0x20) {
        throw new JsonParseFailure(
          "POLICY_DOCUMENT_SYNTAX_INVALID",
          `Unescaped control character in JSON string at offset ${this.offset}.`,
        );
      }
      this.offset += 1;
    }

    throw new JsonParseFailure(
      "POLICY_DOCUMENT_SYNTAX_INVALID",
      `Unterminated JSON string at offset ${start}.`,
    );
  }

  private parseNumber(): number {
    const remaining = this.source.slice(this.offset);
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(remaining);
    if (match === null) {
      throw new JsonParseFailure(
        "POLICY_DOCUMENT_SYNTAX_INVALID",
        `Invalid JSON number at offset ${this.offset}.`,
      );
    }

    const raw = match[0];
    const next = remaining[raw.length];
    if (next !== undefined && !isJsonValueBoundary(next)) {
      throw new JsonParseFailure(
        "POLICY_DOCUMENT_SYNTAX_INVALID",
        `Invalid token after JSON number at offset ${this.offset + raw.length}.`,
      );
    }

    this.offset += raw.length;
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      throw new JsonParseFailure(
        "POLICY_DOCUMENT_NON_JSON_VALUE",
        "JSON number cannot be represented as a finite runtime number.",
      );
    }
    return value;
  }

  private consumeLiteral(literal: "true" | "false" | "null"): void {
    if (!this.source.startsWith(literal, this.offset)) {
      throw new JsonParseFailure(
        "POLICY_DOCUMENT_SYNTAX_INVALID",
        `Invalid JSON literal at offset ${this.offset}.`,
      );
    }
    const next = this.source[this.offset + literal.length];
    if (next !== undefined && !isJsonValueBoundary(next)) {
      throw new JsonParseFailure(
        "POLICY_DOCUMENT_SYNTAX_INVALID",
        `Invalid token after JSON literal at offset ${this.offset + literal.length}.`,
      );
    }
    this.offset += literal.length;
  }

  private assertDepth(depth: number): void {
    if (depth > this.limits.maxDepth) {
      throw new JsonParseFailure(
        "POLICY_DOCUMENT_LIMIT_EXCEEDED",
        `Container depth exceeds configured maximum ${this.limits.maxDepth}.`,
      );
    }
  }

  private incrementEntries(): void {
    this.containerEntries += 1;
    if (this.containerEntries > this.limits.maxContainerEntries) {
      throw new JsonParseFailure(
        "POLICY_DOCUMENT_LIMIT_EXCEEDED",
        `Container entries exceed configured maximum ${this.limits.maxContainerEntries}.`,
      );
    }
  }

  private skipWhitespace(): void {
    while (JSON_WHITESPACE.has(this.source[this.offset] ?? "")) {
      this.offset += 1;
    }
  }

  private expect(expected: string): void {
    if (this.source[this.offset] !== expected) {
      throw new JsonParseFailure(
        "POLICY_DOCUMENT_SYNTAX_INVALID",
        `Expected ${JSON.stringify(expected)} at offset ${this.offset}.`,
      );
    }
    this.offset += 1;
  }

  private tryConsume(expected: string): boolean {
    if (this.source[this.offset] !== expected) {
      return false;
    }
    this.offset += 1;
    return true;
  }

  private peek(): string | undefined {
    return this.source[this.offset];
  }

  private isAtEnd(): boolean {
    return this.offset >= this.source.length;
  }
}

class JsonParseFailure extends Error {
  public constructor(
    public readonly reason:
      | "POLICY_DOCUMENT_SYNTAX_INVALID"
      | "POLICY_DOCUMENT_DUPLICATE_KEY"
      | "POLICY_DOCUMENT_NON_JSON_VALUE"
      | "POLICY_DOCUMENT_LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "JsonParseFailure";
  }
}

export function parseJsonPolicyDocument(
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
    return Object.freeze({
      ok: true as const,
      value: new JsonDocumentParser(source, limits).parse(),
    });
  } catch (error: unknown) {
    if (error instanceof JsonParseFailure) {
      return loaderFailure(error.reason, error.message);
    }
    throw error;
  }
}

function assertLimits(limits: PolicyDocumentLoaderLimits): void {
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RangeError(`${name} must be a positive safe integer.`);
    }
  }
}

function isAsciiDigit(value: string | undefined): boolean {
  return value !== undefined && value >= "0" && value <= "9";
}

function isJsonValueBoundary(value: string): boolean {
  return JSON_WHITESPACE.has(value) || value === "," || value === "]" || value === "}";
}
