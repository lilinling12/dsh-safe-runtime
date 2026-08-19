export const FAKE_EXECUTION_WORLD_ERROR_CODES = [
  "FAKE_EXECUTION_WORLD_INVALID_CONFIG",
  "FAKE_FILESYSTEM_INVALID_REQUEST",
  "FAKE_FILESYSTEM_UNKNOWN_RESOLUTION",
  "FAKE_FILESYSTEM_UNKNOWN_CONTAINMENT",
  "FAKE_FILESYSTEM_UNKNOWN_TARGET",
  "FAKE_FILESYSTEM_NOT_READABLE",
  "FAKE_SUBPROCESS_INVALID_REQUEST",
  "FAKE_SUBPROCESS_UNKNOWN_EXECUTABLE",
  "FAKE_SUBPROCESS_UNEXPECTED_REQUEST",
  "FAKE_SUBPROCESS_SCRIPT_EXHAUSTED",
] as const;

export type FakeExecutionWorldErrorCode = (typeof FAKE_EXECUTION_WORLD_ERROR_CODES)[number];

export class FakeExecutionWorldError extends Error {
  readonly code: FakeExecutionWorldErrorCode;

  constructor(code: FakeExecutionWorldErrorCode, message: string) {
    super(message);
    this.name = "FakeExecutionWorldError";
    this.code = code;
  }
}

export interface FakeFilesystemTargetRef {
  readonly targetRef: string;
  readonly displayPath: string;
}

export interface FakeFilesystemInfo {
  readonly version: string;
  readonly type: "file" | "directory" | "other";
  readonly size?: number;
}

export interface FakeFilesystemResolutionRequest {
  readonly path: string;
  readonly cwd?: string;
}

export interface FakeExecutableResolutionRequest {
  readonly command: string;
  readonly env?: Readonly<Record<string, string>>;
}

export interface FakeSubprocessSpawnRequest {
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly graceMs: number;
  readonly stdin?: string;
  readonly stdoutMaxBytes: number;
  readonly stderrMaxBytes: number;
}

export interface FakeSubprocessOutcome {
  readonly exitCode: number | null;
  readonly signal: string | null;
}

export interface FakeSubprocessOutputSnapshot {
  readonly text: string;
  readonly nextOffset: number;
  readonly lossy: boolean;
  readonly spillPath?: string;
}

export interface FakeSubprocessExecutionSnapshot {
  readonly pid: number;
  readonly outcome: Readonly<FakeSubprocessOutcome>;
  readonly stdout: Readonly<FakeSubprocessOutputSnapshot>;
  readonly stderr: Readonly<FakeSubprocessOutputSnapshot>;
}

export interface FakeSubprocessObservation {
  readonly ordinal: number;
  readonly request: Readonly<FakeSubprocessSpawnRequest>;
  readonly execution: Readonly<FakeSubprocessExecutionSnapshot>;
}

type ParsedFilesystemTarget = Readonly<{
  targetRef: string;
  displayPath: string;
  processPath: string;
  info: Readonly<FakeFilesystemInfo> | null;
  text?: string;
}>;

type ParsedResolution = Readonly<{
  request: Readonly<FakeFilesystemResolutionRequest>;
  targetRef: string;
}>;

type ParsedContainment = Readonly<{
  parentRef: string;
  childRef: string;
  result: boolean;
}>;

type ParsedExecutableResolution = Readonly<{
  request: Readonly<FakeExecutableResolutionRequest>;
  resolvedPath: string;
}>;

type ParsedSpawnScriptEntry = Readonly<{
  request: Readonly<FakeSubprocessSpawnRequest>;
  execution: Readonly<FakeSubprocessExecutionSnapshot>;
}>;

function isOrdinaryRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) && Object.getOwnPropertySymbols(value).length === 0;
}

function requireRecord(
  value: unknown,
  label: string,
  code: FakeExecutionWorldErrorCode,
): Record<string, unknown> {
  if (!isOrdinaryRecord(value)) {
    throw new FakeExecutionWorldError(code, `${label} must be an ordinary object`);
  }
  return value;
}

function requireArray(
  value: unknown,
  label: string,
  code: FakeExecutionWorldErrorCode,
): readonly unknown[] {
  if (!Array.isArray(value) || Object.keys(value).length !== value.length) {
    throw new FakeExecutionWorldError(code, `${label} must be a dense array`);
  }
  return value;
}

function requireString(
  value: unknown,
  label: string,
  code: FakeExecutionWorldErrorCode,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FakeExecutionWorldError(code, `${label} must be a non-empty string`);
  }
  return value;
}

function requireNonNegativeInteger(
  value: unknown,
  label: string,
  code: FakeExecutionWorldErrorCode,
): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new FakeExecutionWorldError(code, `${label} must be a non-negative safe integer`);
  }
  return value as number;
}

function requirePositiveInteger(
  value: unknown,
  label: string,
  code: FakeExecutionWorldErrorCode,
): number {
  const parsed = requireNonNegativeInteger(value, label, code);
  if (parsed === 0) {
    throw new FakeExecutionWorldError(code, `${label} must be greater than zero`);
  }
  return parsed;
}

function validateExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
  code: FakeExecutionWorldErrorCode,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new FakeExecutionWorldError(code, `${label} contains unsupported or missing fields`);
  }
}

function validateAllowedKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
  code: FakeExecutionWorldErrorCode,
): void {
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      throw new FakeExecutionWorldError(code, `${label} is missing ${key}`);
    }
  }
  const allowed = new Set([...required, ...optional]);
  if (Object.keys(value).some(key => !allowed.has(key))) {
    throw new FakeExecutionWorldError(code, `${label} contains unsupported fields`);
  }
}

function parseStringMap(
  value: unknown,
  label: string,
  code: FakeExecutionWorldErrorCode,
): Readonly<Record<string, string>> {
  const record = requireRecord(value, label, code);
  const parsed: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [key, entry] of Object.entries(record)) {
    if (key.length === 0 || typeof entry !== "string") {
      throw new FakeExecutionWorldError(code, `${label} must contain string keys and string values`);
    }
    parsed[key] = entry;
  }
  return Object.freeze(parsed);
}

function parseFilesystemInfo(value: unknown, label: string): Readonly<FakeFilesystemInfo> | null {
  const code = "FAKE_EXECUTION_WORLD_INVALID_CONFIG" as const;
  if (value === null) {
    return null;
  }
  const record = requireRecord(value, label, code);
  validateAllowedKeys(record, ["type", "version"], ["size"], label, code);
  const type = record.type;
  if (type !== "file" && type !== "directory" && type !== "other") {
    throw new FakeExecutionWorldError(code, `${label}.type is unsupported`);
  }
  const base = {
    version: requireString(record.version, `${label}.version`, code),
    type,
  } as const;
  return Object.freeze(Object.hasOwn(record, "size")
    ? { ...base, size: requireNonNegativeInteger(record.size, `${label}.size`, code) }
    : base);
}

function parseResolutionRequest(
  value: unknown,
  code: FakeExecutionWorldErrorCode,
  label = "filesystem resolution request",
): Readonly<FakeFilesystemResolutionRequest> {
  const record = requireRecord(value, label, code);
  validateAllowedKeys(record, ["path"], ["cwd"], label, code);
  const path = requireString(record.path, `${label}.path`, code);
  return Object.freeze(Object.hasOwn(record, "cwd")
    ? { path, cwd: requireString(record.cwd, `${label}.cwd`, code) }
    : { path });
}

function parseExecutableRequest(
  value: unknown,
  code: FakeExecutionWorldErrorCode,
  label = "executable resolution request",
): Readonly<FakeExecutableResolutionRequest> {
  const record = requireRecord(value, label, code);
  validateAllowedKeys(record, ["command"], ["env"], label, code);
  const command = requireString(record.command, `${label}.command`, code);
  return Object.freeze(Object.hasOwn(record, "env")
    ? { command, env: parseStringMap(record.env, `${label}.env`, code) }
    : { command });
}

function parseSpawnRequest(
  value: unknown,
  code: FakeExecutionWorldErrorCode,
  label = "subprocess spawn request",
): Readonly<FakeSubprocessSpawnRequest> {
  const record = requireRecord(value, label, code);
  validateAllowedKeys(
    record,
    ["argv", "cwd", "graceMs", "stdoutMaxBytes", "stderrMaxBytes"],
    ["env", "stdin"],
    label,
    code,
  );
  const argv = requireArray(record.argv, `${label}.argv`, code);
  if (argv.length === 0) {
    throw new FakeExecutionWorldError(code, `${label}.argv must not be empty`);
  }
  const parsedArgv = Object.freeze(argv.map((entry, index) => requireString(entry, `${label}.argv[${index}]`, code)));
  const base = {
    argv: parsedArgv,
    cwd: requireString(record.cwd, `${label}.cwd`, code),
    graceMs: requireNonNegativeInteger(record.graceMs, `${label}.graceMs`, code),
    stdoutMaxBytes: requireNonNegativeInteger(record.stdoutMaxBytes, `${label}.stdoutMaxBytes`, code),
    stderrMaxBytes: requireNonNegativeInteger(record.stderrMaxBytes, `${label}.stderrMaxBytes`, code),
  };
  const optional: { env?: Readonly<Record<string, string>>; stdin?: string } = {};
  if (Object.hasOwn(record, "env")) {
    optional.env = parseStringMap(record.env, `${label}.env`, code);
  }
  if (Object.hasOwn(record, "stdin")) {
    optional.stdin = typeof record.stdin === "string"
      ? record.stdin
      : (() => { throw new FakeExecutionWorldError(code, `${label}.stdin must be a string`); })();
  }
  return Object.freeze({ ...base, ...optional });
}

function parseOutput(value: unknown, label: string): Readonly<FakeSubprocessOutputSnapshot> {
  const code = "FAKE_EXECUTION_WORLD_INVALID_CONFIG" as const;
  const record = requireRecord(value, label, code);
  validateAllowedKeys(record, ["lossy", "nextOffset", "text"], ["spillPath"], label, code);
  if (typeof record.text !== "string" || typeof record.lossy !== "boolean") {
    throw new FakeExecutionWorldError(code, `${label} has invalid text/lossy fields`);
  }
  const base = {
    text: record.text,
    nextOffset: requireNonNegativeInteger(record.nextOffset, `${label}.nextOffset`, code),
    lossy: record.lossy,
  };
  return Object.freeze(Object.hasOwn(record, "spillPath")
    ? { ...base, spillPath: requireString(record.spillPath, `${label}.spillPath`, code) }
    : base);
}

function parseExecution(value: unknown, label: string): Readonly<FakeSubprocessExecutionSnapshot> {
  const code = "FAKE_EXECUTION_WORLD_INVALID_CONFIG" as const;
  const record = requireRecord(value, label, code);
  validateExactKeys(record, ["outcome", "pid", "stderr", "stdout"], label, code);
  const outcomeRecord = requireRecord(record.outcome, `${label}.outcome`, code);
  validateExactKeys(outcomeRecord, ["exitCode", "signal"], `${label}.outcome`, code);
  const exitCode = outcomeRecord.exitCode;
  if (exitCode !== null && !Number.isSafeInteger(exitCode)) {
    throw new FakeExecutionWorldError(code, `${label}.outcome.exitCode must be an integer or null`);
  }
  const signal = outcomeRecord.signal;
  if (signal !== null && typeof signal !== "string") {
    throw new FakeExecutionWorldError(code, `${label}.outcome.signal must be a string or null`);
  }
  return Object.freeze({
    pid: requirePositiveInteger(record.pid, `${label}.pid`, code),
    outcome: Object.freeze({ exitCode: exitCode as number | null, signal }),
    stdout: parseOutput(record.stdout, `${label}.stdout`),
    stderr: parseOutput(record.stderr, `${label}.stderr`),
  });
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (isOrdinaryRecord(value)) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function cloneSpawnRequest(request: Readonly<FakeSubprocessSpawnRequest>): Readonly<FakeSubprocessSpawnRequest> {
  return Object.freeze({
    argv: Object.freeze([...request.argv]),
    cwd: request.cwd,
    graceMs: request.graceMs,
    stdoutMaxBytes: request.stdoutMaxBytes,
    stderrMaxBytes: request.stderrMaxBytes,
    ...(request.env === undefined ? {} : { env: Object.freeze({ ...request.env }) }),
    ...(request.stdin === undefined ? {} : { stdin: request.stdin }),
  });
}

function cloneExecution(execution: Readonly<FakeSubprocessExecutionSnapshot>): Readonly<FakeSubprocessExecutionSnapshot> {
  const cloneOutput = (output: Readonly<FakeSubprocessOutputSnapshot>) => Object.freeze({ ...output });
  return Object.freeze({
    pid: execution.pid,
    outcome: Object.freeze({ ...execution.outcome }),
    stdout: cloneOutput(execution.stdout),
    stderr: cloneOutput(execution.stderr),
  });
}

/**
 * Deterministic projection of Spec 0007 filesystem facts.
 *
 * Deliberately no path library is used here. Treating scripted display/process
 * paths as host paths would silently introduce normalization and containment
 * semantics that M3-006 explicitly does not authorize.
 */
export class FakeFilesystem {
  readonly #targets: ReadonlyMap<string, ParsedFilesystemTarget>;
  readonly #resolutions: ReadonlyMap<string, ParsedResolution>;
  readonly #containments: ReadonlyMap<string, ParsedContainment>;

  constructor(configValue: unknown) {
    const code = "FAKE_EXECUTION_WORLD_INVALID_CONFIG" as const;
    const config = requireRecord(configValue, "filesystem config", code);
    validateExactKeys(config, ["containments", "resolutions", "targets"], "filesystem config", code);

    const targets = new Map<string, ParsedFilesystemTarget>();
    for (const [index, raw] of requireArray(config.targets, "filesystem targets", code).entries()) {
      const target = requireRecord(raw, `filesystem target ${index}`, code);
      validateAllowedKeys(target, ["displayPath", "info", "processPath", "targetRef"], ["text"], `filesystem target ${index}`, code);
      const targetRef = requireString(target.targetRef, `filesystem target ${index}.targetRef`, code);
      if (targets.has(targetRef)) {
        throw new FakeExecutionWorldError(code, `duplicate filesystem targetRef: ${targetRef}`);
      }
      const parsed: ParsedFilesystemTarget = Object.freeze({
        targetRef,
        displayPath: requireString(target.displayPath, `filesystem target ${index}.displayPath`, code),
        processPath: requireString(target.processPath, `filesystem target ${index}.processPath`, code),
        info: parseFilesystemInfo(target.info, `filesystem target ${index}.info`),
        ...(Object.hasOwn(target, "text")
          ? { text: typeof target.text === "string" ? target.text : (() => { throw new FakeExecutionWorldError(code, `filesystem target ${index}.text must be a string`); })() }
          : {}),
      });
      targets.set(targetRef, parsed);
    }

    const resolutions = new Map<string, ParsedResolution>();
    for (const [index, raw] of requireArray(config.resolutions, "filesystem resolutions", code).entries()) {
      const entry = requireRecord(raw, `filesystem resolution ${index}`, code);
      validateExactKeys(entry, ["request", "targetRef"], `filesystem resolution ${index}`, code);
      const request = parseResolutionRequest(entry.request, code, `filesystem resolution ${index}.request`);
      const targetRef = requireString(entry.targetRef, `filesystem resolution ${index}.targetRef`, code);
      if (!targets.has(targetRef)) {
        throw new FakeExecutionWorldError(code, `filesystem resolution ${index} references unknown targetRef`);
      }
      const key = stableJson(request);
      if (resolutions.has(key)) {
        throw new FakeExecutionWorldError(code, `duplicate filesystem resolution request at index ${index}`);
      }
      resolutions.set(key, Object.freeze({ request, targetRef }));
    }

    const containments = new Map<string, ParsedContainment>();
    for (const [index, raw] of requireArray(config.containments, "filesystem containments", code).entries()) {
      const entry = requireRecord(raw, `filesystem containment ${index}`, code);
      validateExactKeys(entry, ["childRef", "parentRef", "result"], `filesystem containment ${index}`, code);
      const parentRef = requireString(entry.parentRef, `filesystem containment ${index}.parentRef`, code);
      const childRef = requireString(entry.childRef, `filesystem containment ${index}.childRef`, code);
      if (!targets.has(parentRef) || !targets.has(childRef) || typeof entry.result !== "boolean") {
        throw new FakeExecutionWorldError(code, `filesystem containment ${index} is invalid`);
      }
      const key = stableJson([parentRef, childRef]);
      if (containments.has(key)) {
        throw new FakeExecutionWorldError(code, `duplicate filesystem containment fact at index ${index}`);
      }
      containments.set(key, Object.freeze({ parentRef, childRef, result: entry.result }));
    }

    this.#targets = targets;
    this.#resolutions = resolutions;
    this.#containments = containments;
  }

  resolve(requestValue: unknown): Readonly<FakeFilesystemTargetRef> {
    const request = parseResolutionRequest(requestValue, "FAKE_FILESYSTEM_INVALID_REQUEST");
    const resolution = this.#resolutions.get(stableJson(request));
    if (resolution === undefined) {
      throw new FakeExecutionWorldError("FAKE_FILESYSTEM_UNKNOWN_RESOLUTION", "filesystem resolution is not scripted");
    }
    const target = this.#requireTarget(resolution.targetRef);
    return Object.freeze({ targetRef: target.targetRef, displayPath: target.displayPath });
  }

  stat(targetRefValue: unknown): Readonly<FakeFilesystemInfo> | null {
    const target = this.#requireRequestedTarget(targetRefValue);
    return target.info === null ? null : Object.freeze({ ...target.info });
  }

  contains(parentRefValue: unknown, childRefValue: unknown): boolean {
    const parentRef = this.#parseTargetRef(parentRefValue);
    const childRef = this.#parseTargetRef(childRefValue);
    this.#requireTarget(parentRef);
    this.#requireTarget(childRef);
    const fact = this.#containments.get(stableJson([parentRef, childRef]));
    if (fact === undefined) {
      throw new FakeExecutionWorldError("FAKE_FILESYSTEM_UNKNOWN_CONTAINMENT", "filesystem containment fact is not scripted");
    }
    return fact.result;
  }

  readText(targetRefValue: unknown): string {
    const target = this.#requireRequestedTarget(targetRefValue);
    if (target.text === undefined) {
      throw new FakeExecutionWorldError("FAKE_FILESYSTEM_NOT_READABLE", "filesystem target has no scripted text content");
    }
    return target.text;
  }

  processPath(targetRefValue: unknown): string {
    return this.#requireRequestedTarget(targetRefValue).processPath;
  }

  #parseTargetRef(value: unknown): string {
    return requireString(value, "filesystem targetRef", "FAKE_FILESYSTEM_INVALID_REQUEST");
  }

  #requireRequestedTarget(value: unknown): ParsedFilesystemTarget {
    return this.#requireTarget(this.#parseTargetRef(value));
  }

  #requireTarget(targetRef: string): ParsedFilesystemTarget {
    const target = this.#targets.get(targetRef);
    if (target === undefined) {
      throw new FakeExecutionWorldError("FAKE_FILESYSTEM_UNKNOWN_TARGET", `unknown filesystem targetRef: ${targetRef}`);
    }
    return target;
  }
}

/**
 * Deterministic projection of Spec 0007 subprocess facts.
 *
 * Requests are structural data only. The class intentionally has no process,
 * shell, filesystem, network, clock, or environment dependency. A mismatch does
 * not advance the FIFO cursor, which keeps bad tests fail-closed and diagnosable.
 */
export class FakeSubprocess {
  readonly #executables: ReadonlyMap<string, ParsedExecutableResolution>;
  readonly #script: readonly ParsedSpawnScriptEntry[];
  readonly #observations: FakeSubprocessObservation[] = [];
  #cursor = 0;

  constructor(configValue: unknown) {
    const code = "FAKE_EXECUTION_WORLD_INVALID_CONFIG" as const;
    const config = requireRecord(configValue, "subprocess config", code);
    validateExactKeys(config, ["executables", "script"], "subprocess config", code);

    const executables = new Map<string, ParsedExecutableResolution>();
    for (const [index, raw] of requireArray(config.executables, "subprocess executables", code).entries()) {
      const entry = requireRecord(raw, `subprocess executable ${index}`, code);
      validateExactKeys(entry, ["request", "resolvedPath"], `subprocess executable ${index}`, code);
      const request = parseExecutableRequest(entry.request, code, `subprocess executable ${index}.request`);
      const key = stableJson(request);
      if (executables.has(key)) {
        throw new FakeExecutionWorldError(code, `duplicate executable resolution request at index ${index}`);
      }
      executables.set(key, Object.freeze({
        request,
        resolvedPath: requireString(entry.resolvedPath, `subprocess executable ${index}.resolvedPath`, code),
      }));
    }
    this.#executables = executables;

    this.#script = Object.freeze(requireArray(config.script, "subprocess script", code).map((raw, index) => {
      const entry = requireRecord(raw, `subprocess script entry ${index}`, code);
      validateExactKeys(entry, ["execution", "request"], `subprocess script entry ${index}`, code);
      return Object.freeze({
        request: parseSpawnRequest(entry.request, code, `subprocess script entry ${index}.request`),
        execution: parseExecution(entry.execution, `subprocess script entry ${index}.execution`),
      });
    }));
  }

  resolveExecutable(requestValue: unknown): string {
    const request = parseExecutableRequest(requestValue, "FAKE_SUBPROCESS_INVALID_REQUEST");
    const resolution = this.#executables.get(stableJson(request));
    if (resolution === undefined) {
      throw new FakeExecutionWorldError("FAKE_SUBPROCESS_UNKNOWN_EXECUTABLE", "executable resolution is not scripted");
    }
    return resolution.resolvedPath;
  }

  spawn(requestValue: unknown): Readonly<FakeSubprocessExecutionSnapshot> {
    const request = parseSpawnRequest(requestValue, "FAKE_SUBPROCESS_INVALID_REQUEST");
    const scripted = this.#script[this.#cursor];
    if (scripted === undefined) {
      throw new FakeExecutionWorldError("FAKE_SUBPROCESS_SCRIPT_EXHAUSTED", "subprocess script is exhausted");
    }
    if (stableJson(request) !== stableJson(scripted.request)) {
      throw new FakeExecutionWorldError("FAKE_SUBPROCESS_UNEXPECTED_REQUEST", "spawn request does not match the next scripted request");
    }

    const execution = cloneExecution(scripted.execution);
    this.#observations.push(Object.freeze({
      ordinal: this.#cursor + 1,
      request: cloneSpawnRequest(request),
      execution,
    }));
    this.#cursor += 1;
    return cloneExecution(execution);
  }

  observations(): readonly Readonly<FakeSubprocessObservation>[] {
    return this.#observations.map(observation => Object.freeze({
      ordinal: observation.ordinal,
      request: cloneSpawnRequest(observation.request),
      execution: cloneExecution(observation.execution),
    }));
  }

  remaining(): number {
    return this.#script.length - this.#cursor;
  }
}

/**
 * Correlates the two fake services without claiming that one mediates the
 * other's effects. `worldRef` is identity metadata only, never an isolation or
 * transaction guarantee.
 */
export class FakeExecutionWorld {
  readonly worldRef: string;
  readonly filesystem: FakeFilesystem;
  readonly subprocess: FakeSubprocess;

  constructor(configValue: unknown) {
    const code = "FAKE_EXECUTION_WORLD_INVALID_CONFIG" as const;
    const config = requireRecord(configValue, "execution world config", code);
    validateExactKeys(config, ["filesystem", "subprocess", "worldRef"], "execution world config", code);
    this.worldRef = requireString(config.worldRef, "execution world worldRef", code);
    this.filesystem = new FakeFilesystem(config.filesystem);
    this.subprocess = new FakeSubprocess(config.subprocess);
  }
}
