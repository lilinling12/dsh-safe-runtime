# RFC 0001: Protocol Authority and Adapter Boundary

Status: ACCEPTED FOR v0.1 DRAFT

## Problem

DeepSeek Harness is the first target runtime, but it is a rapidly changing developer-preview project.
If Safe Runtime core types copy Harness event payloads directly, implementation details can silently
become protocol semantics.

## Normative proposal

1. `specs/` is the semantic authority.
2. `schemas/` is the machine-readable contract projection.
3. `fixtures/` and TCK assert semantics independently of the reference implementation.
4. `packages/protocol` contains language-specific type projections only; it is not normative.
5. `packages/adapter-dsh` is the only package allowed to translate DeepSeek Harness concrete types/events.
6. Unsupported adapter guarantees fail explicitly and never silently become success.

## Security model

An adapter reports an explicit `GuaranteeLevel`. It may not upgrade its own enforcement claim based on
configuration names or optimistic inference.

## Compatibility impact

Breaking changes in DeepSeek Harness should normally require an adapter change and TCK requalification,
not a protocol revision.
