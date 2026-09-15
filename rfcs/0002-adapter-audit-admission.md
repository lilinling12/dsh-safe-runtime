# RFC 0002 — Separate Adapter Audit Admission from Runtime Observation

Status: **PROPOSED**  
Date: `2026-09-06`  
Scope: M4-045, candidate Spec 0049  
Evidence: `docs/review-notes-m4-045-audit-privacy.md`

## Problem

Ordinary Adapter events omit raw bodies but still carry host-supplied digests,
opaque identifiers, names and codes. Observation failure callbacks carry arbitrary
errors. None is an implemented privacy gate. Core requires redaction before
persistence, and M4-024/M4-043 deliberately leave that responsibility unimplemented.

Adding a secret-shaped regex would not establish provenance of arbitrary strings.
A successful test with a trusted digest callback would not constrain an unsafe
callback in product wiring. There is no observed durable leak in the reviewed
repository; this RFC closes an integration boundary before default storage exists.

## Proposed decision

Add a concrete Adapter `observeAudit` extension with a closed event projection.
Source bodies are digested directly at their accepted authoritative seams using
owned SHA-256 and explicitly documented canonical domains. Opaque metadata is
wholly substituted with typed digests. Required correlation is preserved as
session-scoped audit keys; existing RuntimeEvent and portable record refs remain
unchanged. Projection failure delivers no event and reports only fixed diagnostics
with an explicit incomplete subscription result.

Treat all free-form strings as sensitive for this narrow profile. This is a
conservative whole-field redaction policy, not a general detector implementation.
Ordinary observation/diagnostics remain privileged; new default audit wiring must
select the separate owned projection. Native Harness logs remain outside it.

## Alternatives considered

- Trust the existing Digest callback and validate its output syntax: rejected
  because shape cannot prove computation over the correct source or exclude
  chosen raw data. The audit path owns hashing; ordinary callback use is unchanged.
- Sanitize ordinary RuntimeEvent in place: rejected because it would silently
  change policy/replay/correlation consumers and accepted Adapter contracts.
- Hash already-normalized digests: rejected because it loses original source
  evidence and can mislabel digest-of-digest as the authoritative result digest.
- Pattern-based partial redaction: deferred to M5 detector/policy work; it cannot
  make arbitrary identifiers or diagnostic objects safe by default.
- Omit every identifier: rejected because requested/completed/approval correlation
  would be lost. Explicit domains preserve joins without copying source refs.
- Build the durable ledger now: outside M4-045 and unnecessary for defining an
  owned, testable audit exit.

## Consequences and limits

The audit consumer sees digest identifiers and closed outcomes rather than
display names/raw refs. Audit keys are unsuitable as replacements in runtime
control interfaces. SHA-256 substitution retains equality and is vulnerable to
guessing low-entropy inputs; this proposal does not claim encryption or protection
against a malicious in-process host. Restricted input encoding can reject facts
that ordinary observation accepts; rejection is explicit and never becomes a
tool-success or persistence verdict.

Source callbacks must capture facts before normalization loses raw digest input.
Coexisting subscribers must share classification without consuming denial state
twice. A bounded private encoder is necessary for this exit but does not deliver
M5 canonical ledger records, chain verification, retention or storage.

Spec 0049 is the candidate normative contract. Existing portable schemas have no
delta because the new type is an Adapter extension, not a portable persisted
document. Requirement corpus and later executable TCK must precede production;
this proposed RFC does not close M4-045 or authorize later Gates.
