# DDT Signature Proof v0.2 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-SIGNATURE-PROOF-0.2-DRAFT.1`  
**Version:** `0.2.0-draft.1`  
**Status:** DRAFT / TEST_ONLY — not approved for production conformance claims  
**Date:** 2026-09-04  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`  
**Supersedes for new test artifacts:** `DDT-SIGNATURE-PROOF-0.1-DRAFT.1`  
**Envelope integration target:** successor to `DDT-ENVELOPE-0.3-DRAFT.2`

## 1. Purpose

This specification defines one closed DDT signature-proof structure and the exact test-only Ed25519/JCS profile used to protect the committed cores of the currently defined DDT carriers.

It preserves the v0.1 separation between:

- mathematical signature validity;
- exact signed-object binding;
- historical key resolution;
- signer identity and authority;
- independent time;
- network inclusion and finality;
- event-history completeness; and
- substantive truth.

Version 0.2 expands the closed purpose/target registry. It does not turn signatures into evidence for any of the separate axes above.

## 2. Normative artifacts and references

The exact machine-readable artifacts are:

- `schemas/ddt-signature-proof-v0.2.schema.json`;
- `schemas/ddt-signature-profile-v0.2.schema.json`; and
- `profiles/ddt-ed25519-signature-profile-v0.2.json`.

The cryptographic and serialization references are:

- RFC 8032 Ed25519;
- RFC 8785 JSON Canonicalization Scheme;
- RFC 4648 Section 5 base64url; and
- the exact schemas and profile above, each identified by version and SHA-256 digest.

The baseline algorithm is pure RFC 8032 Ed25519: no prehash, no Ed25519ctx and no Ed25519ph. DDT domain separation is supplied by the signing wrapper in Section 8.

## 3. Common proof object

```json
{
  "proofId": "renewal-proof-001",
  "proofType": "DDT_SIGNATURE",
  "proofPurpose": "CRYPTOGRAPHIC_RENEWAL_ATTESTATION",
  "proofProfile": {
    "artifactId": "ddt.signature.ed25519-jcs-v2",
    "version": "0.2.0-draft.1",
    "digest": {
      "algorithm": "SHA-256",
      "value": "..."
    },
    "immutableRef": "...",
    "mediaType": "application/json"
  },
  "algorithm": "Ed25519",
  "verificationMethod": "did:example:witness#key-1",
  "signedObject": {
    "type": "RENEWAL_CORE_HASH",
    "digest": {
      "algorithm": "SHA-256",
      "value": "..."
    }
  },
  "signatureEncoding": "base64url",
  "proofValue": "...",
  "createdAtClaim": "2026-09-04T10:00:00Z"
}
```

All properties except `createdAtClaim` are required. Unknown properties are rejected.

## 4. Field semantics

### 4.1 `proofId`

`proofId` permanently identifies one proof within its carrier. Proof arrays MUST be sorted by ascending Unicode code-point order of `proofId`. Duplicate IDs in one carrier MUST be rejected.

### 4.2 `proofType`

`proofType` MUST equal `DDT_SIGNATURE`.

### 4.3 `proofPurpose`

`proofPurpose` states the exact DDT purpose for which the signature was created. It is signed and MUST participate in one exact registered purpose/target pair from Section 5.

### 4.4 `proofProfile`

`proofProfile` identifies and digest-binds the exact machine-readable signature profile. A verifier MUST confirm the profile digest before interpreting or verifying the proof.

A current profile, similarly named profile or mutable URL response MUST NOT substitute for unavailable historical profile bytes.

### 4.5 `algorithm`

Under the baseline profile, `algorithm` MUST equal `Ed25519` and mean the exact RFC 8032 variant defined in the bound profile.

### 4.6 `verificationMethod`

`verificationMethod` identifies the historical key-resolution target selected by the signer. Because it is inside the proof core, changing it invalidates the signature.

The identifier alone does not establish historical public-key bytes, key lifecycle, signer identity or authority. Those are resolved independently under the historically bound Identity/Authority Profile.

### 4.7 `signedObject`

`signedObject.type` identifies the exact semantic commitment class. `signedObject.digest` is its exact SHA-256 commitment.

The verifier MUST independently recompute or obtain the expected carrier commitment and compare it byte-for-byte to this digest. A valid signature over a different object is not a valid proof for the requested carrier.

### 4.8 `signatureEncoding` and `proofValue`

`signatureEncoding` MUST equal `base64url`. `proofValue` is the canonical unpadded RFC 4648 Section 5 encoding of exactly 64 Ed25519 signature bytes.

The encoded value MUST:

- contain exactly 86 ASCII characters;
- contain no whitespace or padding;
- use only the base64url alphabet;
- have zero unused final bits;
- decode to exactly 64 bytes; and
- reproduce the original text after decode and canonical re-encode.

### 4.9 `createdAtClaim`

When present, `createdAtClaim` is signed. It preserves the signer’s time assertion but does not independently prove when signing occurred.

## 5. Closed purpose/target registry

Version 0.2 permits exactly these pairs:

| `proofPurpose` | `signedObject.type` | Exact carrier commitment |
|---|---|---|
| `CHECKPOINT_ATTESTATION` | `CHECKPOINT_CORE_HASH` | SHA-256 over the canonical signed checkpoint core |
| `CONFORMANCE_ATTESTATION` | `RECEIPT_CORE_HASH` | Conformance Receipt `receiptCoreHash` |
| `COVERAGE_TOMBSTONE_ATTESTATION` | `COVERAGE_TOMBSTONE_CORE_HASH` | Event Coverage `tombstoneCoreHash` |
| `CRYPTOGRAPHIC_RENEWAL_ATTESTATION` | `RENEWAL_CORE_HASH` | Cryptographic Renewal `renewalCoreHash` |
| `DDT_REGISTRATION` | `REGISTRATION_STATEMENT_HASH` | DDT `registrationStatementHash` |
| `NETWORK_FINALITY_ATTESTATION` | `FINALITY_CORE_HASH` | Network Finality `finalityCoreHash` |
| `OFFLINE_PACKAGE_ATTESTATION` | `MANIFEST_CORE_HASH` | Offline Verification Package `manifestCoreHash` |
| `SOURCE_COVERAGE_ATTESTATION` | `COVERAGE_STATEMENT_CORE_HASH` | Event Coverage `statementCoreHash` |
| `SOURCE_WITNESS_ATTESTATION` | `SOURCE_WITNESS_ATTESTATION_CORE_HASH` | Event Coverage `attestationCoreHash` |
| `VERIFICATION_RESULT_ATTESTATION` | `VERIFICATION_RESULT_CORE_HASH` | Verification Result `resultCoreHash` |

A verifier MUST reject every unregistered purpose, unregistered target type or mismatched pair with `PROOF_PURPOSE_TARGET_MISMATCH` before accepting the carrier binding.

A new carrier or commitment class requires a new governed proof-profile version. Free-form extension of these strings is forbidden.

## 6. Proof core

The proof core is the complete proof object with only `proofValue` omitted. Every other present property is retained exactly.

If `createdAtClaim` was absent, it remains absent. A producer or verifier MUST NOT insert `null`, an empty string or a default.

No field may be trimmed, lowercased, normalized, aliased or repaired when constructing the proof core.

## 7. Canonical validation

Before canonicalization, the proof core MUST:

- conform to the exact proof schema and bound profile;
- contain no duplicate JSON property names;
- be representable as I-JSON;
- contain only Unicode scalar-value strings;
- preserve string code points without Unicode normalization;
- use the exact registered purpose/target pair; and
- contain no unresolved defaults or inferred values.

Schema conformance is necessary but does not replace verification of the profile digest, carrier digest, signature or historical key state.

## 8. Signing input and v0.2 domain separation

Construct:

```json
{
  "domain": "DDT_SIGNATURE_PROOF_V2",
  "proofCore": {}
}
```

Then compute:

```text
signingInput = UTF8(RFC8785-JCS({
  "domain": "DDT_SIGNATURE_PROOF_V2",
  "proofCore": proofCore
}))
```

The UTF-8 bytes themselves are signed using pure Ed25519. They MUST NOT be prehashed by the DDT construction.

The v0.2 domain is intentionally different from v0.1. A v0.1 proof MUST remain a v0.1 proof and MUST NOT be reinterpreted under the expanded v0.2 binding registry.

## 9. Signature generation

A conforming producer MUST:

1. finalize and validate the exact carrier core;
2. compute its registered carrier commitment;
3. construct all proof-core properties;
4. verify the exact purpose/target pair;
5. verify the proof-profile bytes and digest;
6. omit only `proofValue` to form the proof core;
7. canonicalize and UTF-8 encode the Section 8 wrapper;
8. sign the bytes with pure RFC 8032 Ed25519;
9. encode the signature as canonical unpadded base64url;
10. insert `proofValue`; and
11. validate the complete proof before publication.

Private keys and credentials MUST NOT be included in a DDT record or offline package. DDC does not become custodian of participant private keys.

## 10. Verification procedure

A conforming verifier MUST:

1. validate the common proof structure;
2. obtain the exact v0.2 proof profile and confirm its digest;
3. reject a v0.1 profile, v0.1 signing domain or unregistered binding;
4. independently reconstruct the expected carrier commitment;
5. compare it exactly with `signedObject.digest`;
6. construct the proof core by omitting only `proofValue`;
7. construct and canonicalize the v0.2 domain wrapper;
8. strictly decode and canonical-reencode `proofValue`;
9. resolve the exact historical Ed25519 public-key bytes for `verificationMethod`;
10. verify the signature with strict RFC 8032 Ed25519 processing; and
11. report signature, object binding, key resolution, lifecycle, identity, authority, time and algorithm status separately.

An unavailable key, profile or carrier dependency is not automatically an invalid signature. The affected axis is `UNAVAILABLE` or `UNRESOLVED`; no missing dependency may be guessed.

## 11. Strict Ed25519 requirements

The profile requires:

- exactly 32 public-key bytes;
- exactly 64 signature bytes;
- strict RFC 8032 point and scalar parsing;
- rejection of non-canonical point encodings;
- rejection of small-order public keys and small-order `R`;
- rejection of out-of-range scalars;
- no algorithm, curve, prehash or context fallback; and
- a maintained implementation capable of the required strict checks.

The reference verifier MUST pass applicable RFC 8032 vectors and DDT-specific positive and tampered fixtures.

## 12. Claim boundary

A valid proof establishes only that the holder of the corresponding private key signed the exact v0.2 signing input and that the exact purpose, target digest and other proof-core metadata were included.

It does not by itself establish:

- signer civil or organizational identity;
- signer authority;
- historical key activation or lack of compromise;
- independent signing or creation time;
- current algorithm security;
- network inclusion or finality;
- event-history completeness;
- correctness, legality or wisdom of an action; or
- substantive truth of the signed content.

These questions remain independent verification axes.

## 13. Carrier and profile preservation

The exact proof bytes, proof schema, proof profile, carrier core, carrier commitment, canonicalization rules, historical key material or resolution evidence, algorithm identifiers and verifier dependencies MUST be preservable in an Offline Verification Package.

An unversioned library name, runtime default, current resolver state or DDC-operated API MUST NOT be the sole source of historical verification behavior.

## 14. Cryptographic renewal

An aging algorithm never authorizes rewriting the original proof. A first-class append-only renewal event may bind the original proof and its profile into a new cryptographic envelope.

Renewal evidence MUST distinguish:

- present independent verification of the original proof;
- an assertion that verification occurred at a claimed renewal time;
- independent evidence of the renewal time;
- validity of the renewal proof under the new profile; and
- substantive truth, which is not established by renewal.

## 15. Stable reason codes

The v0.2 baseline codes are registered in the machine-readable profile. At minimum, implementations distinguish schema invalidity, profile absence or mismatch, purpose/target mismatch, carrier digest mismatch, signing-domain/version mismatch, canonicalization failure, encoding failure, key unavailability, signature invalidity, unresolved lifecycle, identity, authority, time and algorithm status.

Reason codes MUST remain scoped to their verification axis. For example, unresolved signer authority does not change a mathematically valid signature into an invalid signature.

## 16. Required acceptance fixtures

Before candidate status, the implementation MUST include:

1. a valid independently verified proof for every one of the ten registered pairs;
2. every possible wrong purpose/target substitution rejected;
3. v0.1 proof/profile/domain replay into v0.2 rejected;
4. signed-object digest tampering rejected;
5. profile digest, verification method and `createdAtClaim` tampering rejected;
6. proof-core property-order independence under JCS;
7. duplicate-property and invalid-Unicode rejection before canonicalization;
8. padded, whitespace, standard-base64 and non-canonical-base64url rejection;
9. wrong signature and public-key lengths rejected;
10. non-canonical point, small-order and out-of-range scalar cases rejected;
11. unavailable profile and public-key results kept distinct from invalid signatures;
12. valid signature with unresolved identity, authority or time represented independently;
13. carrier-specific hash-reconstruction tests for all ten commitments; and
14. a second implementation reproducing the declared results and reason codes.

## 17. Integration and lifecycle

This specification and bundled profile remain `DRAFT` and `TEST_ONLY` until:

- each carrier references or embeds the common v0.2 proof schema without divergent local proof semantics;
- Verification Result registers the corresponding axes and reason codes;
- positive and tampered fixtures pass; and
- an independent implementation reproduces the results.

The v0.1 specification, schemas, profile and historical proofs remain available and verifiable under their original v0.1 contract. They are not overwritten or silently upgraded.

---

**End of DDT Signature Proof v0.2 Draft (`0.2.0-draft.1`)**
