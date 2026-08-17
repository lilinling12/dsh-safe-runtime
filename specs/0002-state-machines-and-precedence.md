# SRP v0.1 — Deterministic Semantics Profile

> Status: DRAFT NORMATIVE PROFILE

This profile removes implementation freedom where divergent behavior would break interoperability.

## 1. Capability decision precedence

For v0.1 conforming policy engines, decision ordering is normative:

```text
1. canonicalize subject/resource/action
2. reject malformed or unclassifiable requests
3. collect matching rules
4. any matching explicit deny => DENY
5. otherwise select the most-specific matching resource scope
6. within equal specificity, higher numeric priority wins when priority is present
7. within equal specificity/priority: ASK > ALLOW
8. no matching rule => defaultEffect
9. missing/unknown defaultEffect => DENY / CONFIG_INVALID
```

A request MUST be re-evaluated when an execution adapter rewrites any policy-relevant argument after decision.

## 2. Guarantee ordering

Guarantee levels are ordered only for comparison of strength:

```text
advisory < tool-enforced < provider-enforced < process-isolated
```

An implementation MUST NOT report a stronger level than the weakest enforcement point required for the claim.

## 3. Delegation attenuation

For a child grant `C` delegated from parent grant `P`:

- capability(C) MUST equal or narrow capability(P);
- resource(C) MUST be contained within resource(P);
- expiry(C) MUST NOT be later than expiry(P);
- maxUses(C) MUST NOT exceed the parent's remaining delegable uses;
- constraints(C) MUST be equal or stricter;
- guarantee(C) MUST NOT be reported stronger solely because of delegation.

Failure of any attenuation proof => DENY.

## 4. Workspace transaction transitions

Allowed transitions:

```text
NEW -> PREPARING
PREPARING -> ACTIVE | FAILED | ABORTED
ACTIVE -> VERIFYING | ROLLING_BACK | FAILED | ABORTED
VERIFYING -> PREPARING_COMMIT | ROLLING_BACK | FAILED | ABORTED
PREPARING_COMMIT -> COMMITTING | CONFLICTED | ROLLING_BACK | FAILED
COMMITTING -> COMMITTED | RECOVERY_REQUIRED
RECOVERY_REQUIRED -> COMMITTED | ROLLED_BACK | FAILED
ROLLING_BACK -> ROLLED_BACK | FAILED
```

Terminal states:

```text
COMMITTED
ROLLED_BACK
CONFLICTED
ABORTED
FAILED
```

No other transition is conforming.

## 5. Acceptance verdict derivation

Verdict derivation for `all-required` contracts:

1. invalid contract/evidence linkage => `INVALID`;
2. verifier internal failure => `ERROR` unless a required check is known to be blocked by policy/runtime, then `BLOCKED`;
3. missing required check/evidence => `INCOMPLETE`;
4. any required check `fail` => `FAILED`;
5. any required check `error` => `ERROR` or `BLOCKED` according to cause;
6. all required checks `pass` => `VERIFIED`;
7. `skipped` required checks MUST NOT contribute to `VERIFIED`.

`VERIFIED` is therefore fail-closed and evidence-complete.

## 6. Canonical digest

Portable protocol digests SHOULD use RFC 8785 JSON Canonicalization Scheme for structured JSON payloads and SHA-256 by default.
The serialized digest form is:

```text
sha256:<lowercase-hex>
```

Adapters MUST NOT hash values after redaction and later claim that digest refers to the unredacted payload. The digest domain must be explicit in evidence metadata or profile documentation.
