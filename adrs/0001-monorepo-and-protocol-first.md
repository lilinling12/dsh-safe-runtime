# ADR 0001: Monorepo and Protocol-First Development

Status: ACCEPTED

## Context

Capability authorization, transactional execution, acceptance, evidence, adapters, and their TCK evolve
together during the initial alpha period.

## Decision

Use a pnpm TypeScript monorepo. Keep protocol semantics in normative Markdown + JSON Schema, with
TypeScript as a non-normative projection. Runtime packages remain stubs until schema/TCK gates exist.

## Consequences

- Cross-package changes can be reviewed atomically.
- Package dependency boundaries are enforceable in CI.
- Publishing can later split packages without splitting semantic governance.
