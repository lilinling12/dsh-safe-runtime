# M0 + M1 Implementation Status

Date: 2026-08-17

## M0 — Repository / Governance

| Item | Status | Evidence |
|---|---|---|
| Monorepo structure | DONE | `packages/*`, workspace config |
| Package boundaries | DONE | `scripts/verify-boundaries.mjs` |
| Normative directories | DONE | `specs/`, `schemas/`, `fixtures/`, `rfcs/`, `adrs/` |
| Protocol dependency rule | DONE | boundary check passes |
| Governance workflow | DONE | `GOVERNANCE.md`, `CONTRIBUTING.md` |
| RFC / ADR templates | DONE | `rfcs/0000-template.md`, `adrs/0000-template.md` |
| CI skeleton | DONE | `.github/workflows/ci.yml` |
| CODEOWNERS binding | PENDING_REPOSITORY_OWNER | owner/team must be chosen when GitHub repo is created |
| pnpm lockfile / fresh-clone install | PENDING_NETWORKED_BOOTSTRAP | package registry unavailable in current execution environment |

## M1 — Normative Protocol + Schemas

| Area | Status | Evidence |
|---|---|---|
| Trust / Guarantee model | DONE | `specs/0001-*` |
| Deterministic precedence | DONE | `specs/0002-*` |
| Subject / resource / capability | DONE | spec + schemas + TS projection |
| Request / decision / lease / receipt | DONE | schemas + fixtures |
| Transaction state machine | DONE | spec + semantic fixtures |
| Commit / recovery contracts | DONE | schemas + fixtures |
| Acceptance contract/result/verdict | DONE | schemas + fixtures |
| Evidence episode / privacy profile | DONE | schemas + fixtures |
| Draft 2020-12 schema set | DONE | 15 schema documents |
| Positive/negative fixtures | DONE | 28 schema cases |
| Schema validation | DONE | all 28 cases validated locally |
| Protocol TS type projection | DONE | typecheck passes with available TypeScript 5.8.3 |
| Runtime TCK | NOT_STARTED | M3; must follow Harness adapter M2 |

## Validation actually executed

- architecture boundary check: PASS;
- schema shape check: PASS, 15 schemas;
- protocol TypeScript typecheck: PASS;
- JSON Schema Draft 2020-12 fixture validation: PASS, 28/28;
- full pnpm dependency installation / Vitest / Oxlint: not executed because the current container cannot reach the npm registry.

No CI requirement has been weakened to compensate for that environment limitation.
