# DDT Structural Commitment Profile v0.1 — Draft

**Project:** Diamond Data Chain (DDC)
**Specification ID:** `DDT-STRUCTURAL-COMMITMENT-PROFILE-0.1-DRAFT.1`
**Version:** `0.1.0-draft.1`
**Status:** DRAFT / TEST_ONLY — not approved for production conformance claims
**Date:** 2026-09-09
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`
**Envelope target:** `DDT-ENVELOPE-0.3-DRAFT.5`

## 1. Purpose

This profile defines the exact structural commitment construction used by
DDT Record Envelope v0.3 Draft.5.

It is the machine-bindable artifact for the Preservation Contract
`structuralCommitmentProfile` role.

This profile is separate from canonicalization, evidence commitment,
signature, Conformance Receipt, time, finality and renewal profiles.

## 2. Canonicalization dependency

Every structural JSON commitment defined by this profile uses the exact
historically bound Canonicalization Profile:

`DDT-CANONICALIZATION-PROFILE-ARTIFACT-0.1-DRAFT.1`

Profile ID:

`ddt.canonicalization.rfc8785-jcs-v1`

Artifact SHA-256:

`988a4b770177ebfb595de9c2e286a76cd4b4f108e8cffdd0844656d03d2f443e`

A verifier MUST verify those exact profile bytes and digest.

## 3. Digest representation

Every structural digest defined by this profile is:

- algorithm: `SHA-256`
- input encoding: UTF-8
- digest encoding: lowercase hexadecimal
- digest length: 64 hexadecimal characters
- prefix: none

## 4. Registered upstream commitment

Compute:

`registeredUpstreamCommitment = SHA-256(UTF8(JCS(envelope.upstream)))`

The complete `envelope.upstream` object is the input.

## 5. Evidence Manifest commitment

Compute:

`evidenceManifestCommitment = SHA-256(UTF8(JCS(envelope.evidenceManifest)))`

The complete exact Evidence Manifest is the input.

## 6. Preservation Contract commitment

Compute:

`preservationContractCommitment = SHA-256(UTF8(JCS(envelope.preservationContract)))`

The complete exact Preservation Contract is the input.

The contract's `normativeDependencies` and `closureDigest` are therefore
already protected by this commitment.

## 7. Canonical recordHash input

The exact derived object contains exactly these six members:

- `specification`
- `identity`
- `registeredUpstreamCommitment`
- `evidenceManifestCommitment`
- `preservationContractCommitment`
- `relationships`

Their values are copied exactly from the active Envelope Draft.5 structure
and the independently computed commitments above.

No other envelope member is inserted.

## 8. recordHash

Compute:

`recordHash = SHA-256(UTF8(JCS(canonicalRecordHashInput)))`

Excluded from direct `recordHash` input are:

- the complete `commitments` object;
- `commitments.recordHash`;
- the complete `registration` object;
- Conformance Receipt bytes;
- signature proof bytes;
- time-proof bytes;
- later checkpoint artifacts;
- later Event Coverage artifacts;
- later Network Finality artifacts;
- later Verification Results;
- later renewal events.

Upstream, Evidence Manifest and Preservation Contract content remain
cryptographically bound through their respective commitments.

## 9. registrationStatementHash

After `recordHash` and the complete Conformance Receipt commitment are known:

`registrationStatementHash = SHA-256(UTF8(JCS(envelope.registration.statement)))`

This hash MUST be computed before registration signature proofs or time proofs
are added.

The statement binds the exact:

- `recordHash`;
- `preservationContractCommitment`;
- complete Conformance Receipt commitment;
- registrant;
- registration mechanism;
- optional registration-time claim when present.

## 10. Construction order

The required order is:

1. registeredUpstreamCommitment
2. evidenceManifestCommitment
3. preservationContractCommitment
4. recordHash
5. Conformance Receipt
6. conformanceReceiptCommitment
7. registration statement
8. registrationStatementHash
9. registration signature and time proofs

Proof material MUST NOT be inserted retroactively into an earlier commitment
input.

## 11. Verification

A conforming verifier MUST independently recompute all five structural values:

- registeredUpstreamCommitment;
- evidenceManifestCommitment;
- preservationContractCommitment;
- recordHash;
- registrationStatementHash.

A verifier MUST NOT repair or silently replace historical registered values.

## 12. Tamper behavior

Changing upstream content changes the upstream commitment and `recordHash`.

Changing Evidence Manifest content changes the Evidence Manifest commitment
and `recordHash`.

Changing Preservation Contract content changes the Preservation Contract
commitment and `recordHash`.

Changing identity or relationships changes `recordHash`.

Changing any registration-statement field changes `registrationStatementHash`.

## 13. Claim boundary

Matching structural commitments establish structural integrity and exact
binding under this profile.

They do not establish substantive truth, provenance, signer identity,
signer authority, independent time, network finality, event-history
completeness or legal validity.

---

**End of DDT Structural Commitment Profile v0.1 Draft (`0.1.0-draft.1`)**
