# M4-020 Subject Resolution Portable Fixture Encoding

`cases.json` is language-independent test data for Spec 0031.

Most fixture values are literal JSON values. Boundary cases may use this test-only expansion directive in a position where the runtime input/output value is a string:

```json
{
  "$fixtureString": {
    "repeat": "a",
    "count": 512
  }
}
```

A fixture consumer MUST expand the directive before calling the runtime under test:

1. the directive object MUST contain exactly `$fixtureString`;
2. `$fixtureString` MUST contain exactly `repeat` and `count`;
3. `repeat` MUST be exactly one Unicode code point;
4. `count` MUST be a non-negative integer no greater than 513 for this corpus;
5. expansion produces `repeat` repeated `count` times;
6. expansion applies recursively to `subject`, `requestSessionRef`, and `expected` fixture data only.

`$fixtureString` is **not** a Safe Runtime protocol value, Subject field, policy field, or production API feature. A production resolver receiving this object must treat it as an ordinary invalid non-string runtime value. The directive exists only to keep 512/513-code-point portable boundary cases reviewable without embedding large repeated strings.
