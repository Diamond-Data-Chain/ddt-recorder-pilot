# DDT Canonicalization Profile v0.1 — Draft

**Project:** Diamond Data Chain (DDC)
**Specification ID:** `DDT-CANONICALIZATION-PROFILE-0.1-DRAFT.1`
**Version:** `0.1.0-draft.1`
**Status:** DRAFT / TEST_ONLY — not approved for production conformance claims
**Date:** 2026-09-09
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`
**Envelope target:** `DDT-ENVELOPE-0.3-DRAFT.5`

## 1. Purpose

This profile defines the exact baseline JSON canonicalization procedure used by the
DDT Reference Recorder and the active DDT v0.3 integration family.

It provides one historically bindable artifact for the Preservation Contract
`canonicalizationProfile` role.

This profile defines serialization only. It does not itself define a structural
hash, signature algorithm, authority result, time result, network-finality result,
event-completeness result or substantive-truth claim.

## 2. Normative baseline

The canonicalization method is RFC 8785 JSON Canonicalization Scheme (JCS).

Canonical output is the exact UTF-8 encoding of the RFC 8785 canonical JSON text.

Before canonicalization, an implementation MUST reject:

- duplicate JSON member names;
- values outside the interoperable JSON/I-JSON domain;
- non-finite numeric values;
- invalid Unicode scalar values; and
- unpaired UTF-16 surrogates.

An implementation MUST NOT silently trim, repair, normalize, coerce or replace
committed values.

## 3. Object member ordering

Object member names are ordered according to the RFC 8785 / ECMAScript ordering
model using lexicographic comparison of UTF-16 code units.

Input object property order has no commitment significance.

Array element order is preserved exactly.

## 4. String serialization

Strings are serialized according to RFC 8785 and the ECMAScript JSON string
serialization rules required by that specification.

Unicode content MUST NOT be normalized to NFC, NFD, NFKC or NFKD as part of
canonicalization.

Escaping and quoting are determined only by the canonical JSON serialization
procedure.

## 5. Number serialization

Numbers use the RFC 8785 ECMAScript-compatible JSON number serialization model.

A producer or verifier MUST NOT replace this with language-native formatting when
that formatting produces different canonical bytes.

NaN, positive infinity and negative infinity are invalid inputs.

## 6. Literals and arrays

The JSON literals are serialized exactly as:

- `null`;
- `true`; and
- `false`.

Array order is preserved. No element sorting, deduplication or normalization is
performed.

## 7. Canonical output

Canonical JSON output:

- uses UTF-8;
- contains no BOM;
- contains no insignificant whitespace; and
- preserves semantic string content without Unicode normalization.

The canonical byte sequence is the only output of this profile.

Hashing of those bytes is defined by the separately bound structural commitment
profile or carrier specification.

## 8. Verification

A verifier MUST:

1. verify the exact profile artifact digest before using the profile;
2. apply duplicate-member-aware JSON parsing or equivalent pre-parse detection;
3. reject invalid input rather than repair it;
4. independently canonicalize the accepted JSON value;
5. compare canonical bytes exactly where canonical re-encoding is being tested; and
6. report canonicalization failure separately from later digest, signature,
   authority, time or network verification failures.

A mutable service or current unversioned profile MUST NOT replace the historically
bound profile bytes.

## 9. Reference implementation compatibility

The DDT Reference Implementation uses local ECMAScript serialization behavior for
the RFC 8785 number, string and object-member-ordering semantics.

That implementation choice is executable evidence only. The normative behavior is
defined by this profile and RFC 8785, not by availability of a network service or a
particular JavaScript runtime.

## 10. Error codes

The baseline distinguishes at least:

- `CANONICALIZATION_DUPLICATE_MEMBER`;
- `CANONICALIZATION_NON_IJSON_VALUE`;
- `CANONICALIZATION_NON_FINITE_NUMBER`;
- `CANONICALIZATION_INVALID_UNICODE`;
- `CANONICALIZATION_UNPAIRED_SURROGATE`;
- `CANONICALIZATION_FAILED`; and
- `CANONICAL_REENCODING_MISMATCH`.

## 11. Claim boundary

Successful canonicalization establishes only that the accepted JSON value was
serialized according to the exact bound canonicalization profile.

It does not establish:

- evidence authenticity;
- substantive truth;
- signer identity or authority;
- independent time;
- network inclusion or finality;
- event-history completeness; or
- legal validity.

---

**End of DDT Canonicalization Profile v0.1 Draft (`0.1.0-draft.1`)**
