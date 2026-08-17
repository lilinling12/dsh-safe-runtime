# Schema Compatibility Policy

`v1alpha1` is pre-stable. Every schema carries a versioned `$id` and MUST NOT be
silently repurposed after publication.

Within a published schema version:

- changing enum meaning is breaking;
- making an optional field required is breaking;
- removing a field is breaking;
- changing an identifier's semantic domain is breaking;
- widening an enforcement claim without stronger evidence is forbidden;
- adding optional fields may still require a TCK update when behavior changes.

A breaking contract change requires a new protocol/schema version and migration note.
