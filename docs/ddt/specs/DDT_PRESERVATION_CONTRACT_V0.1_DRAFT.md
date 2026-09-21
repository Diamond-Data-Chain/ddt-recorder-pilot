# DDT Preservation Contract v0.1 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-PRESERVATION-CONTRACT-0.1-DRAFT.1`  
**Version:** `0.1.0-draft.1`  
**Status:** DRAFT — not approved for production conformance claims  
**Date:** 2026-09-03  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`

## 1. Purpose

A DDT Preservation Contract identifies the exact rules and artifacts under which one DDT Record was formed and validated.

It enables a later verifier to answer separately:

1. which contract was selected and cryptographically bound to the DDT Record;
2. whether evidence supports that the contract was applicable or governing at registration;
3. whether the record conformed to that contract at registration;
4. whether the original conformance result can be reproduced later; and
5. whether continuing preservation obligations remain satisfied.

These questions MUST NOT be collapsed into one result.

## 2. Core distinctions

### 2.1 Contract identity

Identifies the contract object and version represented by the bytes presented to the verifier.

### 2.2 Contract binding

Confirms that the exact contract commitment participates in the DDT `recordHash`.

### 2.3 Contract applicability

Evaluates evidence that the selected Enterprise Profile, rules and obligations actually governed the registration under the relevant organizational, domain or network policy.

Binding proves **which contract the DDT committed to**. It does not automatically prove **that an external authority had validly made that contract applicable**.

### 2.4 Registration conformance

Evaluates the record against the contract bound at registration.

### 2.5 Conformance reproducibility

Evaluates whether a later verifier can retrieve the exact historical artifacts and independently reproduce the validation result.

### 2.6 Continuing preservation obligation

Evaluates whether evidence required to remain available after registration is still available according to the historically applicable obligation.

## 3. Contract structure

The proposed structure is:

```json
{
  "specification": {
    "standard": "DDT-PRESERVATION-CONTRACT",
    "version": "0.1.0-draft.1"
  },
  "contractId": "example-ai-decision-contract",
  "contractVersion": "1.0.0",
  "artifacts": {
    "envelopeSchema": {},
    "enterpriseProfile": {},
    "validationRuleSet": {},
    "canonicalizationProfile": {},
    "cryptographicProfile": {},
    "evidenceManifestProfile": {},
    "relationshipVocabulary": {},
    "verificationResultProfile": {}
  },
  "validator": {},
  "applicability": {
    "basis": "SIGNED_ASSIGNMENT",
    "evidenceRefs": ["evidence-contract-assignment-001"],
    "authorityProfile": {}
  },
  "obligations": []
}
```

## 4. `specification`

For this draft:

```json
{
  "standard": "DDT-PRESERVATION-CONTRACT",
  "version": "0.1.0-draft.1"
}
```

Both fields are REQUIRED and fixed.

## 5. Contract identity

`contractId` and `contractVersion` are REQUIRED.

`contractId` identifies the logical contract series. `contractVersion` identifies the exact declared version within that series.

Identity/version strings alone do not establish exact bytes. The entire contract is canonicalized and hashed, and every contract artifact is separately identified by digest.

A changed contract requires a new version and new commitment. A frozen contract MUST NOT be edited in place.

## 6. Artifact references

### 6.1 Required artifact roles

The contract MUST identify the following exact artifacts:

- `envelopeSchema`;
- `enterpriseProfile`;
- `validationRuleSet`;
- `canonicalizationProfile`;
- `cryptographicProfile`;
- `evidenceManifestProfile`;
- `relationshipVocabulary`; and
- `verificationResultProfile`.

### 6.2 Artifact Reference fields

Each Artifact Reference MUST contain:

- `artifactId`;
- `version`;
- digest algorithm;
- digest value.

It SHOULD contain:

- immutable/versioned retrieval reference; and
- media type.

The digest, not the mutable location string, determines exact artifact identity.

### 6.3 Artifact substitution

A verifier MUST reject any presented artifact whose digest differs from the contract.

A current artifact at the same unversioned URL MUST NOT replace the historically bound bytes.

### 6.4 Artifact availability

If a required historical artifact cannot be obtained, the corresponding availability result is `UNAVAILABLE`, and conformance reproduction cannot be `PASS`.

The DDT record commitment itself MAY remain intact.

## 7. Validator artifact

The `validator` object MUST contain:

- `validatorId`;
- `version`;
- artifact digest; and
- immutable reference where independent retrieval is required.

This identifies the implementation that produced the original Conformance Receipt.

The validator implementation is evidence about how validation was performed. It MUST NOT silently replace the normative schema/profile/rule artifacts.

A later independent verifier MAY use a different implementation. It MUST report which implementation it used and whether it reproduced the preserved result.

## 8. Applicability evidence

### 8.1 Requirement

Every production Preservation Contract MUST state the basis on which it was treated as applicable.

### 8.2 Base applicability bases

`applicability.basis` MUST be one of:

- `PROFILE_REGISTRY_STATE` — a versioned registry state identifies the profile/contract as active;
- `SIGNED_ASSIGNMENT` — an authorized party signed an assignment of the contract to the relevant scope;
- `CONTRACT_SIGNATURE` — the contract itself carries an authority-governed signature/proof;
- `NETWORK_GOVERNANCE_STATE` — a verifiable network governance state selected the contract;
- `REGISTRANT_ASSERTED` — the registrant asserted the contract's applicability without independent authority proof; or
- `PROFILE_DEFINED` — another mechanism precisely defined by a bound authority/applicability profile.

### 8.3 Evidence references

`applicability.evidenceRefs` MUST contain unique, deterministically ordered identifiers of committed evidence or exact proof artifacts supporting the applicability claim.

For `REGISTRANT_ASSERTED`, an empty list is permitted, but the applicability result MUST NOT exceed `ASSERTED` solely on that basis.

For all other bases, at least one evidence reference is REQUIRED.

### 8.4 Authority profile

`applicability.authorityProfile` is REQUIRED unless the Enterprise Profile explicitly defines the same applicability rules in a uniquely bound artifact.

The authority profile specifies:

- authorized issuers/assigners;
- scope of assignment;
- validity intervals or ordering rules;
- revocation/supersession behavior;
- proof format;
- historical resolution procedure; and
- verification result semantics.

### 8.5 Applicability status

A verifier MUST distinguish:

- `VERIFIED` — the bound evidence successfully establishes applicability under the authority profile;
- `ASSERTED` — the contract was selected/bound and applicability was asserted, but not independently established;
- `FAILED` — required applicability evidence was present/expected and failed verification;
- `UNAVAILABLE` — required evidence cannot currently be obtained; and
- `UNRESOLVED` — available evidence is insufficient for a determinate conclusion.

Contract binding MAY pass while applicability remains asserted, unavailable or unresolved.

## 9. Preservation obligations

### 9.1 Obligation structure

Each `obligations` entry is:

```json
{
  "obligationId": "PROFILE-REQ-POLICY-001",
  "category": "EVIDENCE_AVAILABILITY",
  "targetRefs": ["evidence-policy-007"],
  "requirement": "REQUIRED",
  "temporalScope": {
    "mode": "UNTIL",
    "until": "2041-09-03T00:00:00Z"
  },
  "failureCode": "REQUIRED_POLICY_UNAVAILABLE"
}
```

### 9.2 Base categories

Base obligation categories are:

- `FIELD_PRESENCE`;
- `EVIDENCE_PRESENTATION_AT_REGISTRATION`;
- `EVIDENCE_AVAILABILITY`;
- `SEMANTIC_DEPENDENCY_PRESERVATION`;
- `SIGNATURE_REQUIREMENT`;
- `AUTHORITY_EVIDENCE`;
- `TIME_PROOF_REQUIREMENT`;
- `RELATIONSHIP_REQUIREMENT`;
- `CONFIDENTIALITY_CONTROL`;
- `RETENTION_OR_ARCHIVE`; or
- `PROFILE_DEFINED`.

### 9.3 Requirement level

`requirement` MUST be:

- `REQUIRED`;
- `CONDITIONAL`; or
- `OPTIONAL`.

Conditional requirements MUST identify a deterministic rule in the bound validation rule set. Free-text conditions are non-normative and insufficient for reproducible conformance.

### 9.4 Target references

`targetRefs` identifies the fields, evidence IDs, proof IDs or stable requirement/rule IDs governed by the obligation.

Targets MUST be unambiguous under the bound profile.

### 9.5 Temporal scope

Base `temporalScope.mode` values are:

- `AT_REGISTRATION`;
- `INDEFINITE`;
- `UNTIL`;
- `PROFILE_DEFINED`.

`UNTIL` requires `until`.

`PROFILE_DEFINED` requires an exact `temporalRuleRef` into a bound rule artifact.

An asserted end time does not prove when registration occurred; evaluation of an obligation's current state depends on the applicable verified/asserted time evidence and MUST expose that dependency.

### 9.6 Stable failure code

Every `REQUIRED` or `CONDITIONAL` obligation MUST define a stable machine-readable `failureCode`.

Human-readable descriptions MAY supplement but MUST NOT replace the code.

### 9.7 Deterministic ordering

`obligations` MUST be sorted by normalized `obligationId` in ascending Unicode code-point order.

`targetRefs` MUST be unique and sorted.

Duplicate obligation identifiers MUST be rejected.

## 10. Contract commitment

### 10.1 Input

The complete Preservation Contract object, including `specification`, is canonicalized using the canonicalization profile identified by the contract.

For the DDT Envelope v0.3 baseline:

```text
preservationContractCommitment =
  SHA-256(UTF8(RFC8785-JCS(preservationContract)))
```

### 10.2 Bootstrap rule

Because the contract identifies the canonicalization profile used to hash itself, the DDT envelope version MUST define an unambiguous bootstrap canonicalization and structural hash rule.

For v0.3, that bootstrap is RFC 8785 JCS, UTF-8 and SHA-256.

A future envelope version MAY use a different bootstrap rule but MUST NOT retroactively alter v0.3 verification.

### 10.3 Record binding

`preservationContractCommitment` MUST participate in the DDT `recordHash` input.

The same value MUST appear in the registration statement and the Conformance Receipt.

Mismatch between those values is a structural failure.

## 11. Conformance semantics

### 11.1 Registration conformance

The original validator evaluates the record under the exact contract and emits a Conformance Receipt.

The registration-conformance result MUST be:

- `PASS` — every applicable required obligation passed;
- `FAIL` — at least one applicable required obligation failed; or
- `INDETERMINATE` — validation could not determine one or more mandatory results.

Warnings do not create a separate pass state. They are preserved as reason entries while the mandatory-result derivation remains deterministic.

`FAIL` and `INDETERMINATE` MUST NOT be represented as successful production conformance.

### 11.2 Later reproduction

A later verifier evaluates the same historical record under the exact bound contract and reports:

- historical artifacts available/integrity;
- reproduced per-requirement results;
- reproduced overall conformance result;
- comparison with the original receipt; and
- any unresolved dependencies.

### 11.3 Continuing obligations

Current preservation-obligation evaluation is a later result. It MUST NOT rewrite the original registration-conformance result.

For example:

```text
REGISTRATION_CONFORMANCE = PASS
CURRENT_DOCUMENT_AVAILABILITY = UNAVAILABLE
CURRENT_PRESERVATION_OBLIGATION = FAIL
DDT_RECORD_INTEGRITY = PASS
```

is a valid multi-axis outcome.

### 11.4 Context outside the contract

If context was not required by the historical contract and was never preserved:

```text
REGISTRATION_CONFORMANCE = PASS
HISTORICAL_SEMANTIC_RESOLUTION = PARTIAL
```

MAY be correct. A later verifier MUST NOT invent a retroactive preservation requirement.

## 12. Privacy

The contract MUST NOT embed credentials, private keys or secret access tokens.

An obligation may require preservation of a confidential evidence commitment without requiring public disclosure of the evidence bytes.

Profiles MUST consider whether public raw hashes expose low-entropy or linkable confidential content and MUST define safer commitment mechanisms where necessary.

## 13. Versioning and migration

A frozen contract is immutable.

A changed artifact, applicability rule, obligation, validation rule, cryptographic profile or validator version requires a new contract version and commitment.

Old DDT Records remain evaluated under their original contracts.

A later contract MAY supersede an earlier contract for new registrations only. It MUST NOT retroactively change earlier obligations or conformance.

## 14. Required verification axes

A Preservation Contract verifier MUST expose at least:

- `PRESERVATION_CONTRACT_IDENTITY`;
- `PRESERVATION_CONTRACT_INTEGRITY`;
- `PRESERVATION_CONTRACT_BOUND_TO_RECORD`;
- `PRESERVATION_CONTRACT_APPLICABILITY`;
- `CONTRACT_ARTIFACT_AVAILABILITY`;
- `CONTRACT_ARTIFACT_INTEGRITY`;
- `REGISTRATION_CONFORMANCE`;
- `CONFORMANCE_RECEIPT_INTEGRITY`;
- `CONFORMANCE_REPRODUCIBILITY`; and
- `CURRENT_PRESERVATION_OBLIGATION`.

Success in one axis MUST NOT automatically determine another.

## 15. Required tests

Before candidate status, the implementation MUST test:

1. exact contract binding to `recordHash`;
2. altered contract byte;
3. substituted schema/profile artifact at the same URL;
4. unavailable historical profile;
5. valid signed applicability assignment;
6. registrant-asserted applicability without independent evidence;
7. invalid/revoked applicability authority;
8. required obligation missing at registration;
9. optional context missing at registration;
10. required evidence lost after successful registration;
11. temporal obligation not yet expired and expired;
12. validator implementation unavailable but normative artifacts available;
13. independent implementation reproducing the original result;
14. reproduced result differing from the original receipt; and
15. profile v1.1 published after a record governed by profile v1.0.

## Appendix A — Integration change for Envelope v0.3 Draft.2

The next DDT Envelope v0.3 revision MUST:

1. add `specification` to the embedded Preservation Contract object;
2. add `verificationResultProfile` to required contract artifacts;
3. replace the current `obligationRefs` list with the structured `obligations` array;
4. add the `applicability` object;
5. include the resulting complete contract commitment in `recordHash`; and
6. add a separate `PRESERVATION_CONTRACT_APPLICABILITY` verification axis.

This appendix records a known required change and prevents `DDT-ENVELOPE-0.3-DRAFT.1` from being mistaken for a freeze candidate.

---

**End of DDT Preservation Contract v0.1 Draft (`0.1.0-draft.1`)**
