import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const PAYLOAD = "m4-051-benign-shell-witness";
const EXPECTED_BYTES = Buffer.from(PAYLOAD, "utf8");
const SENTINEL = "sentinel.txt";
const MATCH_LITERAL = `printf '%s' '${PAYLOAD}' >`;
const REFERENCE_COMMAND = `${MATCH_LITERAL} ${SENTINEL}`;
const ALTERNATIVE_COMMAND = `> ${SENTINEL} printf '%s' '${PAYLOAD}'`;

type MatcherResult = "MATCH" | "NO_MATCH";
type BoundaryClassification =
  | "EXPECTED_STRING_MATCHER_BYPASS"
  | "ENVIRONMENT_UNSUPPORTED"
  | "INVALID_EVIDENCE";

interface ShellEffectObservation {
  readonly sentinelExistsBefore: boolean;
  readonly commandSucceeded: boolean;
  readonly sentinelBytesAfter: Buffer;
}

interface EquivalentSpellingEvidence {
  readonly referenceCommand: string;
  readonly alternativeCommand: string;
  readonly referenceMatcherResult: MatcherResult;
  readonly alternativeMatcherResult: MatcherResult;
  readonly referenceEffect: ShellEffectObservation;
  readonly alternativeEffect: ShellEffectObservation;
}

function literalDenySubstringMatcher(rawCommand: string, literal: string): MatcherResult {
  if (literal.length === 0) {
    throw new Error("M4-051 test matcher literal must be non-empty");
  }
  return rawCommand.includes(literal) ? "MATCH" : "NO_MATCH";
}

function classifyBoundary(evidence: EquivalentSpellingEvidence): BoundaryClassification {
  const commandsAreDistinct = evidence.referenceCommand !== evidence.alternativeCommand;
  const matcherAsymmetry =
    evidence.referenceMatcherResult === "MATCH"
    && evidence.alternativeMatcherResult === "NO_MATCH";
  const isolatedProvenance =
    !evidence.referenceEffect.sentinelExistsBefore
    && !evidence.alternativeEffect.sentinelExistsBefore;
  const bothSucceeded =
    evidence.referenceEffect.commandSucceeded
    && evidence.alternativeEffect.commandSucceeded;
  const exactReferenceEffect = evidence.referenceEffect.sentinelBytesAfter.equals(EXPECTED_BYTES);
  const exactAlternativeEffect = evidence.alternativeEffect.sentinelBytesAfter.equals(EXPECTED_BYTES);
  const sameMeasuredEffect = evidence.referenceEffect.sentinelBytesAfter.equals(
    evidence.alternativeEffect.sentinelBytesAfter,
  );

  return commandsAreDistinct
    && matcherAsymmetry
    && isolatedProvenance
    && bothSucceeded
    && exactReferenceEffect
    && exactAlternativeEffect
    && sameMeasuredEffect
    ? "EXPECTED_STRING_MATCHER_BYPASS"
    : "INVALID_EVIDENCE";
}

async function sentinelExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function executeBashEffect(root: string, command: string): Promise<ShellEffectObservation> {
  const sentinel = join(root, SENTINEL);
  const before = await sentinelExists(sentinel);
  let commandSucceeded = false;

  await execFileAsync("bash", ["-c", command], {
    cwd: root,
    encoding: "utf8",
  });
  commandSucceeded = true;

  return Object.freeze({
    sentinelExistsBefore: before,
    commandSucceeded,
    sentinelBytesAfter: await readFile(sentinel),
  });
}

describe("M4-051 equivalent shell spelling string-matcher negative boundary", () => {
  const roots = new Set<string>();

  afterEach(async () => {
    await Promise.all(Array.from(roots, async (root) => {
      await rm(root, { recursive: true, force: true });
      roots.delete(root);
    }));
  });

  it("proves a fixed literal nested-effect matcher misses an effect-equivalent Bash spelling", async () => {
    const root = await mkdtemp(join(tmpdir(), "dsh-m4-051-"));
    roots.add(root);
    const sentinel = join(root, SENTINEL);

    const referenceMatcherResult = literalDenySubstringMatcher(
      REFERENCE_COMMAND,
      MATCH_LITERAL,
    );
    const alternativeMatcherResult = literalDenySubstringMatcher(
      ALTERNATIVE_COMMAND,
      MATCH_LITERAL,
    );

    const referenceEffect = await executeBashEffect(root, REFERENCE_COMMAND);

    // Reset the exact target before the second measured execution. The alternative
    // must prove its own effect rather than inheriting the reference sentinel.
    await rm(sentinel, { force: true });
    expect(await sentinelExists(sentinel)).toBe(false);

    const alternativeEffect = await executeBashEffect(root, ALTERNATIVE_COMMAND);

    const evidence: EquivalentSpellingEvidence = Object.freeze({
      referenceCommand: REFERENCE_COMMAND,
      alternativeCommand: ALTERNATIVE_COMMAND,
      referenceMatcherResult,
      alternativeMatcherResult,
      referenceEffect,
      alternativeEffect,
    });

    expect(REFERENCE_COMMAND).not.toBe(ALTERNATIVE_COMMAND);
    expect(referenceMatcherResult).toBe("MATCH");
    expect(alternativeMatcherResult).toBe("NO_MATCH");
    expect(referenceEffect.sentinelExistsBefore).toBe(false);
    expect(alternativeEffect.sentinelExistsBefore).toBe(false);
    expect(referenceEffect.commandSucceeded).toBe(true);
    expect(alternativeEffect.commandSucceeded).toBe(true);
    expect(referenceEffect.sentinelBytesAfter).toEqual(EXPECTED_BYTES);
    expect(alternativeEffect.sentinelBytesAfter).toEqual(EXPECTED_BYTES);
    expect(referenceEffect.sentinelBytesAfter).toEqual(alternativeEffect.sentinelBytesAfter);
    expect(classifyBoundary(evidence)).toBe("EXPECTED_STRING_MATCHER_BYPASS");
  });

  it("rejects contradictory matcher, provenance, command-identity and effect evidence", () => {
    const effect = (): ShellEffectObservation => ({
      sentinelExistsBefore: false,
      commandSucceeded: true,
      sentinelBytesAfter: Buffer.from(EXPECTED_BYTES),
    });
    const baseline: EquivalentSpellingEvidence = {
      referenceCommand: REFERENCE_COMMAND,
      alternativeCommand: ALTERNATIVE_COMMAND,
      referenceMatcherResult: "MATCH",
      alternativeMatcherResult: "NO_MATCH",
      referenceEffect: effect(),
      alternativeEffect: effect(),
    };

    expect(classifyBoundary({ ...baseline, alternativeCommand: REFERENCE_COMMAND }))
      .toBe("INVALID_EVIDENCE");
    expect(classifyBoundary({ ...baseline, referenceMatcherResult: "NO_MATCH" }))
      .toBe("INVALID_EVIDENCE");
    expect(classifyBoundary({ ...baseline, alternativeMatcherResult: "MATCH" }))
      .toBe("INVALID_EVIDENCE");
    expect(classifyBoundary({
      ...baseline,
      alternativeEffect: { ...effect(), sentinelExistsBefore: true },
    })).toBe("INVALID_EVIDENCE");
    expect(classifyBoundary({
      ...baseline,
      alternativeEffect: {
        ...effect(),
        sentinelBytesAfter: Buffer.from("different", "utf8"),
      },
    })).toBe("INVALID_EVIDENCE");
  });

  it("keeps the Gate-local matcher deliberately lexical and non-authoritative", () => {
    expect(literalDenySubstringMatcher("ABC", "A")).toBe("MATCH");
    expect(literalDenySubstringMatcher("abc", "A")).toBe("NO_MATCH");
    expect(literalDenySubstringMatcher(" a ", "a")).toBe("MATCH");
    expect(() => literalDenySubstringMatcher("anything", "")).toThrow(
      "M4-051 test matcher literal must be non-empty",
    );
  });
});
