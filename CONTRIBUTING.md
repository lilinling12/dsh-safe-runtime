# Contributing

## Required development order

Do not implement new protocol behavior directly in runtime code.

1. Open or update an RFC when behavior is new or controversial.
2. Update the normative spec.
3. Update schemas and fixtures.
4. Update TCK assertions.
5. Only then change the reference implementation.
6. Attach acceptance evidence before marking the change ready.

## Pull request requirements

Every PR that changes normative behavior MUST include:

- spec delta;
- schema delta;
- positive and negative fixtures;
- TCK delta;
- compatibility impact;
- security impact;
- migration note when required.

Do not weaken validators, schemas, or tests to make CI green.
