# Engineering Handoff

`docs/handoff/` is the operational continuity record for DSH Safe Runtime.
It exists so work can resume safely across conversations, machines, and
contributors without treating chat history as engineering state.

## Authority

These files are **non-normative**.

They MUST NOT override or redefine:

1. approved RFCs / ADRs;
2. normative protocol specifications;
3. JSON Schemas and compatibility rules;
4. TCK expectations;
5. accepted implementation evidence.

If a handoff conflicts with a normative artifact, the normative artifact wins
and the handoff must be corrected.

## Files

- `CURRENT.md` — the single current operational snapshot and next gate.
- `HISTORY.md` — append-only summaries of material handoff changes.

## Resume protocol

A new work session MUST NOT assume `CURRENT.md` is still live truth merely
because it is the newest committed snapshot.

Before changing code, the session should:

1. read `docs/handoff/CURRENT.md`;
2. fetch the current PR metadata and head SHA from GitHub;
3. fetch workflow runs for that exact head SHA;
4. compare live state with the handoff snapshot;
5. use live evidence when the two differ;
6. continue from the recorded gate rather than redesigning completed phases.

For failing GitHub Actions, inspect the failing job/step and obtain the first
useful diagnostic before editing code. Do not infer a current failure from an
older run.

## Maintenance rule

Update `CURRENT.md` when a material engineering boundary changes, including:

- phase or milestone changes;
- upstream compatibility baseline changes;
- PR/branch changes;
- a quality gate changes from pass to fail or fail to pass;
- the active blocker changes;
- the next allowed phase changes.

Append a short entry to `HISTORY.md` for the same change.

Do not rewrite historical entries to make prior states look cleaner than they
were.

## Quality rule

A handoff must never instruct a future session to make CI green by weakening
validators, schemas, TCKs, type checks, tests, security boundaries, or frozen
reproducibility requirements. Unknown adapter semantics remain fail-closed.
