# DDT Signature Proof v0.1 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-SIGNATURE-PROOF-0.1-DRAFT.1`  
**Version:** `0.1.0-draft.1`  
**Status:** DRAFT — not approved for production conformance claims  
**Date:** 2026-09-03  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`  
**Envelope integration target:** successor to `DDT-ENVELOPE-0.3-DRAFT.2`

## 1. Purpose

This specification defines one common DDT signature-proof structure and the baseline Ed25519/JCS proof profile used to protect:

- DDT registration statements;
- Conformance Receipt cores; and
- Verification Result cores.

It replaces carrier-specific field-name and signing-input assumptions with one exact, independently reproducible construction.

This specification does not define signer identity, signer authority, historical key status or independent time proof. Those are separate verification layers.

## 2. Normative references

- RFC 8032, Edwards-Curve Digital Signature Algorithm (EdDSA): `https://www.rfc-editor.org/rfc/rfc8032.html`;
- RFC 8785, JSON Canonicalization Scheme (JCS): `https://www.rfc-editor.org/rfc/rfc8785.html`;
- RFC 4648, Base-N Encodings, Section 5 base64url: `https://www.rfc-editor.org/rfc/rfc4648.html#section-5`;
- the exact DDT Signature Proof JSON Schema bound by digest; and
- the exact proof-profile artifact bound in each proof.

The baseline algorithm is RFC 8032 **Ed25519**, meaning PureEdDSA with no prehash and no Ed25519ctx context. DDT-level domain separation is provided by the canonical signing-input wrapper defined in Section 8, not by silently switching to Ed25519ctx or Ed25519ph.

## 3. Common proof object

```json
{
  "proofId": "registration-signature-001",
  "proofType": "DDT_SIGNATURE",
  "proofPurpose": "DDT_REGISTRATION",
  "proofProfile": {
    "artifactId": "ddt.signature.ed25519-jcs-v1",
    "version": "0.1.0-draft.1",
    "digest": {
      "algorithm": "SHA-256",
      "value": "..."
    },
    "immutableRef": "...",
    "mediaType": "application/json"
  },
  "algorithm": "Ed25519",
  "verificationMethod": "did:example:registrar#key-1",
  "signedObject": {
    "type": "REGISTRATION_STATEMENT_HASH",
    "digest": {
      "algorithm": "SHA-256",
      "value": "..."
    }
  },
  "signatureEncoding": "base64url",
  "proofValue": "...",
  "createdAtClaim": "2026-09-03T08:31:00Z"
}
```

All properties other than `createdAtClaim` are REQUIRED. Unknown properties are rejected under this version.

## 4. Field semantics

### 4.1 `proofId`

`proofId` identifies one proof within its carrier artifact. It is part of the signed proof core. Proof arrays MUST be sorted by ascending Unicode code-point order of `proofId`, and duplicate proof IDs in one carrier MUST be rejected.

### 4.2 `proofType`

`proofType` MUST equal `DDT_SIGNATURE`.

### 4.3 `proofPurpose`

`proofPurpose` states why the proof exists. It is cryptographically bound and MUST match one permitted signed-object type under Section 5.

### 4.4 `proofProfile`

`proofProfile` is the exact Artifact Reference for the machine-readable signature profile used to create and verify the proof. Its identifier and version are not sufficient without its digest.

A verifier MUST retrieve or receive the exact profile bytes and confirm their digest before using them. It MUST NOT replace an unavailable historical profile with a current profile, similarly named profile or mutable URL response.

### 4.5 `algorithm`

For the baseline profile, `algorithm` MUST equal `Ed25519` and MUST mean the exact RFC 8032 Ed25519 instance described in Section 2.

### 4.6 `verificationMethod`

`verificationMethod` identifies the key-resolution target selected by the signer. It is part of the signed proof core.

The string alone does not prove that the key belonged to a person or organization, was active at a relevant time or was authorized for the action. Exact public-key resolution and historical lifecycle evidence are required separately.

### 4.7 `signedObject`

`signedObject.type` identifies the semantic class of the protected object. `signedObject.digest` identifies its exact commitment. Under the baseline, the digest algorithm is `SHA-256` and the value is 64 lowercase hexadecimal characters.

The verifier MUST independently reconstruct or obtain the expected carrier commitment and compare it byte-for-byte with `signedObject.digest`. A mathematically valid signature over the wrong digest does not establish carrier binding.

### 4.8 `signatureEncoding` and `proofValue`

`signatureEncoding` MUST equal `base64url`.

`proofValue` is the RFC 4648 Section 5 base64url encoding of the exact 64-byte Ed25519 signature:

- padding is forbidden;
- whitespace is forbidden;
- the encoded value contains exactly 86 ASCII characters;
- unused final bits MUST be zero;
- decoding MUST produce exactly 64 bytes; and
- decode-then-re-encode MUST reproduce the original string exactly.

A verifier MUST NOT accept standard base64 characters, added padding, ignored whitespace or alternate encodings.

### 4.9 `createdAtClaim`

`createdAtClaim`, when present, is included in the signed proof core. The signature therefore protects what time the signer claimed, but it does not independently prove that time. Independent time evidence remains a separate axis.

## 5. Permitted purpose/target bindings

Draft.1 permits exactly:

| `proofPurpose` | `signedObject.type` | Carrier commitment |
|---|---|---|
| `DDT_REGISTRATION` | `REGISTRATION_STATEMENT_HASH` | DDT `registrationStatementHash` |
| `CONFORMANCE_ATTESTATION` | `RECEIPT_CORE_HASH` | Conformance Receipt `receiptCoreHash` |
| `VERIFICATION_RESULT_ATTESTATION` | `VERIFICATION_RESULT_CORE_HASH` | Verification Result `resultCoreHash` |

A mismatched pair MUST fail with `PROOF_PURPOSE_TARGET_MISMATCH` before cryptographic acceptance.

New purposes require a new exact profile version or a separately governed compatible proof profile. A free-form string does not create a new valid purpose.

## 6. Proof core

The proof core is the proof object with `proofValue` omitted and every other present field retained exactly:

```json
{
  "proofId": "...",
  "proofType": "DDT_SIGNATURE",
  "proofPurpose": "...",
  "proofProfile": {},
  "algorithm": "Ed25519",
  "verificationMethod": "...",
  "signedObject": {},
  "signatureEncoding": "base64url",
  "createdAtClaim": "..."
}
```

If `createdAtClaim` was absent from the proof, it is absent from the proof core. It MUST NOT be inserted as `null`, an empty string or a default.

No other proof property may be omitted from or added to the proof core.

## 7. Canonical proof-core validation

Before canonicalization, the proof core MUST:

- conform to the exact proof schema and profile;
- be parsed as I-JSON compatible data;
- contain no duplicate property names;
- contain only Unicode scalar-value strings;
- preserve string code points exactly without Unicode normalization; and
- contain no unresolved defaults or inferred values.

A producer or verifier MUST NOT trim, lowercase, normalize, alias or otherwise repair committed proof-core values.

## 8. Signing input and domain separation

Construct:

```json
{
  "domain": "DDT_SIGNATURE_PROOF_V1",
  "proofCore": {}
}
```

where `proofCore` is the exact object from Section 6.

Then compute the signing input:

```text
signingInput = UTF8(RFC8785-JCS({
  "domain": "DDT_SIGNATURE_PROOF_V1",
  "proofCore": proofCore
}))
```

The UTF-8 byte sequence itself is signed with pure Ed25519. The DDT construction MUST NOT prehash `signingInput` before passing it to the Ed25519 operation.

The explicit domain prevents the same signature from being silently reinterpreted as a non-DDT signature or as another DDT proof construction.

## 9. Signature generation

A conforming producer MUST:

1. finalize and validate the carrier commitment;
2. create every proof-core field, including the exact profile reference and verification method;
3. verify the permitted purpose/target pair;
4. construct the proof core by omitting only `proofValue`;
5. canonicalize the domain wrapper under RFC 8785;
6. UTF-8 encode the canonical result;
7. sign those bytes using RFC 8032 Ed25519;
8. encode the 64-byte signature as canonical unpadded base64url;
9. add the result as `proofValue`; and
10. validate the complete proof before publication.

Private-key generation, protection, backup, access control and custody remain outside the DDT record. DDC MUST NOT require a central custodian for participant private keys.

## 10. Verification procedure

A conforming verifier MUST perform the following without guessing:

1. validate the common proof structure;
2. retrieve the exact proof-profile bytes and verify their digest;
3. validate every profile constant and permitted purpose/target binding;
4. independently reconstruct the expected carrier commitment;
5. compare the expected commitment to `signedObject.digest`;
6. construct the exact proof core by omitting only `proofValue`;
7. construct and canonicalize the Section 8 domain wrapper;
8. strictly decode `proofValue` and enforce its canonical encoding and length;
9. resolve the exact historical Ed25519 public-key bytes for `verificationMethod` under the applicable key profile;
10. verify the signature using strict RFC 8032 Ed25519 verification; and
11. report signature validity, key resolution, key lifecycle, signer identity, signer authority, time and algorithm status independently.

Failure at Step 4 or 5 is a signed-object binding failure even if the signature is mathematically valid over the proof's claimed digest.

An unavailable key or profile is not automatically an invalid signature. It makes the relevant verification unavailable or unresolved until the required dependency is supplied.

## 11. Strict Ed25519 requirements

The baseline profile requires:

- an exact 32-byte Ed25519 public key;
- an exact 64-byte signature;
- RFC 8032 decoding of public key and signature components;
- rejection of non-canonical encoded curve points;
- rejection of small-order public keys and small-order `R` components under this DDT profile;
- rejection when decoding fails;
- rejection when the scalar component is outside the permitted range;
- no silent algorithm fallback;
- no Ed25519ph or Ed25519ctx substitution; and
- use of a maintained implementation capable of strict verification.

The reference verifier MUST pass the RFC 8032 Ed25519 test vectors relevant to its implementation in addition to DDT-specific vectors.

## 12. Profile and dependency preservation

The exact proof schema, proof profile, canonicalization rules, public-key material or historical key-resolution evidence and verifier dependencies required to reproduce a result MUST be preservable in the Offline Verification Package.

An unversioned library name, runtime default or current web resolver MUST NOT be the sole definition of historical verification behavior.

The verifier implementation is evidence of one execution; it is not the sole normative definition. A second implementation must be able to reproduce the result from the specification, artifacts and fixtures.

## 13. Verification axes and claim boundary

At minimum, a verification result keeps these questions separate:

- proof-schema conformance;
- proof-profile availability and digest binding;
- signed-object binding;
- signature validity;
- verification-method/key resolution;
- key lifecycle status at the relevant time;
- signer identity;
- signer authority;
- created-time claim;
- independent time proof; and
- algorithm security/lifecycle status.

A valid Ed25519 signature establishes that the holder of the corresponding private key produced a valid signature over the exact DDT signing input.

It does not by itself establish:

- the civil or organizational identity of the signer;
- the signer's authority;
- that the key was active and uncompromised at a relevant historical time;
- that `createdAtClaim` is true;
- substantive truth, legality or correctness of the signed content; or
- completeness of event history.

## 14. Cryptographic agility and renewal

No profile may promise verification forever. Algorithm lifecycle and implementation security MUST be assessed separately from historical mathematical validity.

An aging or deprecated algorithm does not permit rewriting the original proof. A controlled cryptographic-renewal event may append evidence that the original proof was successfully verified at renewal time and bind it into a new profile. Such renewal does not restore a proof that had already become unverifiable and does not establish substantive truth.

## 15. Stable error and reason codes

The baseline codes are:

- `PROOF_SCHEMA_INVALID`;
- `PROOF_PROFILE_UNAVAILABLE`;
- `PROOF_PROFILE_DIGEST_MISMATCH`;
- `PROOF_PROFILE_BINDING_MISMATCH`;
- `PROOF_PURPOSE_TARGET_MISMATCH`;
- `SIGNED_OBJECT_BINDING_MISMATCH`;
- `PROOF_CORE_CANONICALIZATION_FAILED`;
- `PROOF_VALUE_ENCODING_INVALID`;
- `PUBLIC_KEY_UNAVAILABLE`;
- `PUBLIC_KEY_ENCODING_INVALID`;
- `PUBLIC_KEY_SMALL_ORDER`;
- `SIGNATURE_INVALID`;
- `SIGNATURE_R_SMALL_ORDER`;
- `SIGNATURE_SCALAR_OUT_OF_RANGE`;
- `CREATED_AT_CLAIM_UNPROVEN`;
- `KEY_LIFECYCLE_UNRESOLVED`;
- `SIGNER_IDENTITY_UNRESOLVED`;
- `SIGNER_AUTHORITY_UNRESOLVED`; and
- `ALGORITHM_STATUS_UNRESOLVED`.

Reason codes MUST be interpreted within their registered verification axes. For example, `SIGNER_AUTHORITY_UNRESOLVED` does not turn a mathematically valid signature into an invalid signature.

## 16. Required fixtures before candidate status

At minimum:

1. valid proof for each permitted purpose/target pair;
2. tampered signed-object digest;
3. purpose/target substitution;
4. proof-profile digest substitution;
5. verification-method substitution;
6. `createdAtClaim` addition, removal and modification;
7. canonical proof-core property-order independence;
8. duplicate JSON property rejection before canonicalization;
9. Unicode-string preservation without normalization;
10. padded, whitespace-containing, standard-base64 and non-canonical-base64url rejection;
11. incorrect signature length;
12. invalid public-key encoding;
13. non-canonical point, small-order public-key/`R` and out-of-range scalar cases;
14. unavailable proof profile and unavailable public key;
15. signature valid while signer identity or authority remains unresolved;
16. signature valid while created-time proof remains unavailable;
17. deprecated/compromised algorithm status without rewriting the original proof; and
18. two independent implementations producing the same result and reason codes.

## 17. Integration rule

The next integration revision of the DDT Envelope, Conformance Receipt and Verification Result specifications MUST reference the common proof schema rather than maintain divergent local proof structures.

The existing Draft.2 Envelope and Draft.1 companion proof shapes remain historical development drafts. They are not silently overwritten.

---

**End of DDT Signature Proof v0.1 Draft (`0.1.0-draft.1`)**
