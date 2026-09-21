# DDT Preservation Contract v0.3 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-PRESERVATION-CONTRACT-0.3-DRAFT.1`  
**Version:** `0.3.0-draft.1`  
**Status:** DRAFT — not approved for production conformance claims  
**Date:** 2026-09-05  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`
**Supersedes for new test artifacts:** `DDT-PRESERVATION-CONTRACT-0.2-DRAFT.1`

## 1. Purpose

A DDT Preservation Contract identifies the exact rules and artifacts under which one DDT Record was formed and validated.

Version 0.3 retains the thirteen exact core artifact roles and six explicit capability classes from v0.2 and closes the remaining dependency-resolution ambiguity by binding the complete normative dependency closure needed to parse, validate and verify the historical contract and its selected companion artifacts. The closure is deterministic, digest-bound and immutable for the life of that contract version.

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
    "version": "0.3.0-draft.1"
  },
  "contractId": "example-ai-decision-contract",
  "contractVersion": "1.0.0",
  "artifacts": {
    "envelopeSchema": {},
    "enterpriseProfile": {},
    "validationRuleSet": {},
    "canonicalizationProfile": {},
    "structuralCommitmentProfile": {},
    "identifierProfile": {},
    "evidenceManifestProfile": {},
    "relationshipVocabulary": {},
    "registrationSignatureProfile": {},
    "conformanceReceiptProfile": {},
    "verificationResultProfile": {},
    "verificationAxisRegistry": {},
    "verificationReasonCodeRegistry": {}
  },
  "normativeDependencies": {
    "artifacts": [],
    "closureDigest": {"algorithm": "SHA-256", "value": "<sha256-of-jcs-artifact-array>"}
  },
  "capabilities": {
    "identityAuthority": {"requirement": "REQUIRED", "profile": {}},
    "independentTime": {"requirement": "CONDITIONAL", "profile": {}, "conditionRuleId": "TIME-001"},
    "eventCoverage": {"requirement": "NOT_APPLICABLE", "notApplicableReasonCode": "EVENT_COVERAGE_OUTSIDE_CONTRACT"},
    "networkFinality": {"requirement": "REQUIRED", "profile": {}},
    "offlineVerification": {"requirement": "REQUIRED", "profile": {}},
    "cryptographicRenewal": {"requirement": "CONDITIONAL", "profile": {}, "conditionRuleId": "RETENTION-001"}
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
  "version": "0.3.0-draft.1"
}
```

Both fields are REQUIRED and fixed.

Before schema validation or canonicalization, an implementation MUST reject duplicate JSON property names, non-I-JSON values, invalid Unicode scalar values and non-finite numbers. It MUST NOT normalize, trim, repair or default contract values silently.

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
- `structuralCommitmentProfile`;
- `identifierProfile`;
- `evidenceManifestProfile`;
- `relationshipVocabulary`; and
- `registrationSignatureProfile`;
- `conformanceReceiptProfile`;
- `verificationResultProfile`;
- `verificationAxisRegistry`; and
- `verificationReasonCodeRegistry`.

The old v0.1 `cryptographicProfile` role is not reused because it could not distinguish structural commitment rules from signature construction, historical key state, time proof, network proof or cryptographic renewal. Each concern now has an exact selection point.

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

If the same `artifactId` and `version` appear more than once anywhere in the contract, every occurrence MUST contain the same digest. A single artifact MAY satisfy multiple roles only when its own exact specification explicitly declares those roles; equal bytes or a similar name alone are insufficient.

### 6.4 Artifact availability

If a required historical artifact cannot be obtained, the corresponding availability result is `UNAVAILABLE`, and conformance reproduction cannot be `PASS`.

The DDT record commitment itself MAY remain intact.



### 6.5 Normative dependency closure

`normativeDependencies` is REQUIRED in v0.3. It binds the exact transitive normative artifact set needed to interpret and reproduce the contract rather than allowing a later implementation to resolve whatever version is current.

It contains:

- `artifacts` — the exact Artifact References in the dependency closure; and
- `closureDigest` — the SHA-256 digest of the canonical dependency array.

For a concrete Preservation Contract, the closure MUST include:

1. every artifact directly selected by the thirteen `artifacts` roles;
2. every profile selected by a `REQUIRED` or `CONDITIONAL` capability;
3. every normative schema, profile, vocabulary and registry transitively required by those direct artifacts and capability profiles, including exact Signature Proof/Profile, Verification Result, Verification Axis Registry and Verification Reason-Code Registry dependencies where applicable; and
4. any exact algorithm/profile artifact required to reproduce canonicalization, structural commitments, signature verification, time/checkpoint verification, event coverage, network finality, offline verification or cryptographic renewal under that historical contract.

A capability declared `NOT_APPLICABLE` does not cause its profile family to enter the historical dependency closure merely because a newer implementation knows that family exists.

The `artifacts` array MUST be sorted in ascending Unicode code-point order by the tuple:

```text
(artifactId, version, digest.value, immutableRef-or-empty-string)
```

Duplicate `(artifactId, version)` pairs are forbidden. If the same logical artifact serves more than one direct role, it appears once in `normativeDependencies.artifacts`; the direct role bindings remain separately present under `artifacts` or `capabilities`.

The closure digest is:

```text
closureDigest = SHA-256(UTF8(RFC8785-JCS(normativeDependencies.artifacts)))
```

The array MUST NOT contain the concrete Preservation Contract object itself. This avoids self-reference. The exact Preservation Contract schema and any external normative artifacts needed to validate it MAY be included because their bytes are independent from the contract instance.

A verifier MUST independently reconstruct the required closure from the historical direct bindings and transitive references and compare both membership and `closureDigest`. Missing, extra, substituted or byte-mismatched normative dependencies prevent complete conformance reproduction. A mutable current URL, package manager resolution or network lookup MUST NOT repair a historical closure silently.


## 7. Capability bindings

### 7.1 Purpose

`capabilities` records whether each conditional preservation capability was part of the contract that governed registration. A later verifier MUST NOT infer applicability from a current deployment, later profile or investigator request.

All six base capability entries are REQUIRED:

- `identityAuthority`;
- `independentTime`;
- `eventCoverage`;
- `networkFinality`;
- `offlineVerification`; and
- `cryptographicRenewal`.

### 7.2 Requirement states

Each capability uses exactly one state:

- `REQUIRED` — the exact profile is required and MUST be identified;
- `CONDITIONAL` — the exact profile and stable condition-rule ID are required; or
- `NOT_APPLICABLE` — the capability was outside the registration contract and a stable reason code is required.

`REQUIRED` and `CONDITIONAL` MUST contain `profile` and MUST NOT contain `notApplicableReasonCode`.

`CONDITIONAL` MUST contain `conditionRuleId`. The rule MUST resolve inside the exact `validationRuleSet` or Enterprise Profile bound by the contract.

`NOT_APPLICABLE` MUST contain `notApplicableReasonCode` and MUST NOT contain `profile` or `conditionRuleId`. The reason code MUST resolve in the bound base Reason-Code Registry or an exact namespaced extension registry.

### 7.3 Missing versus outside the contract

If a capability was `REQUIRED` or its condition evaluated true, unavailable profile or evidence bytes affect conformance and the corresponding verification axes.

If a capability was `NOT_APPLICABLE`, its absence is not a preservation-contract failure. A later reconstruction may still be `PARTIAL`, `UNAVAILABLE` or `UNRESOLVED` on the affected axis.

This distinction prevents both retroactive expansion and silent weakening of the historical preservation contract.

### 7.4 Capability profiles

The profile for each applicable capability MUST define its exact evidence structure, validation procedure, result axes, claim boundaries and transitive dependencies. A generic label or mutable service endpoint is insufficient.

The six capability profiles do not become embedded evidence merely because they are referenced here. Their exact bytes and digests are historical validation dependencies and MUST be retained in the Conformance Receipt and Offline Verification Package dependency sets.

## 8. Validator artifact

The `validator` object MUST contain:

- `validatorId`;
- `version`;
- artifact digest; and
- immutable reference where independent retrieval is required.

This identifies the implementation that produced the original Conformance Receipt.

The validator implementation is evidence about how validation was performed. It MUST NOT silently replace the normative schema/profile/rule artifacts.

A later independent verifier MAY use a different implementation. It MUST report which implementation it used and whether it reproduced the preserved result.

## 9. Applicability evidence

### 9.1 Requirement

Every production Preservation Contract MUST state the basis on which it was treated as applicable.

### 9.2 Base applicability bases

`applicability.basis` MUST be one of:

- `PROFILE_REGISTRY_STATE` — a versioned registry state identifies the profile/contract as active;
- `SIGNED_ASSIGNMENT` — an authorized party signed an assignment of the contract to the relevant scope;
- `CONTRACT_SIGNATURE` — the contract itself carries an authority-governed signature/proof;
- `NETWORK_GOVERNANCE_STATE` — a verifiable network governance state selected the contract;
- `REGISTRANT_ASSERTED` — the registrant asserted the contract's applicability without independent authority proof; or
- `PROFILE_DEFINED` — another mechanism precisely defined by a bound authority/applicability profile.

### 9.3 Evidence references

`applicability.evidenceRefs` MUST contain unique, deterministically ordered identifiers of committed evidence or exact proof artifacts supporting the applicability claim.

For `REGISTRANT_ASSERTED`, an empty list is permitted, but the applicability result MUST NOT exceed `ASSERTED` solely on that basis.

For all other bases, at least one evidence reference is REQUIRED.

### 9.4 Authority profile

`applicability.authorityProfile` is REQUIRED unless the Enterprise Profile explicitly defines the same applicability rules in a uniquely bound artifact.

The authority profile specifies:

- authorized issuers/assigners;
- scope of assignment;
- validity intervals or ordering rules;
- revocation/supersession behavior;
- proof format;
- historical resolution procedure; and
- verification result semantics.

### 9.5 Applicability status

A verifier MUST distinguish:

- `VERIFIED` — the bound evidence successfully establishes applicability under the authority profile;
- `ASSERTED` — the contract was selected/bound and applicability was asserted, but not independently established;
- `FAILED` — required applicability evidence was present/expected and failed verification;
- `UNAVAILABLE` — required evidence cannot currently be obtained; and
- `UNRESOLVED` — available evidence is insufficient for a determinate conclusion.

Contract binding MAY pass while applicability remains asserted, unavailable or unresolved.

## 10. Preservation obligations

### 10.1 Obligation structure

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
  "failureCode": "REQUIRED_POLICY_UNAVAILABLE",
  "failureAxis": "CURRENT_PRESERVATION_OBLIGATION"
}
```

### 10.2 Base categories

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
- `RETENTION_OR_ARCHIVE`;
- `HISTORICAL_ARTIFACT_AVAILABILITY`;
- `OFFLINE_PACKAGE_PRESERVATION`;
- `CRYPTOGRAPHIC_RENEWAL`;
- `EVENT_COVERAGE`;
- `NETWORK_PROOF_PRESERVATION`; or
- `PROFILE_DEFINED`.

### 10.3 Requirement level

`requirement` MUST be:

- `REQUIRED`;
- `CONDITIONAL`; or
- `OPTIONAL`.

Conditional requirements MUST identify a deterministic rule in the bound validation rule set. Free-text conditions are non-normative and insufficient for reproducible conformance.

### 10.4 Target references

`targetRefs` identifies the fields, evidence IDs, proof IDs or stable requirement/rule IDs governed by the obligation.

Targets MUST be unambiguous under the bound profile.

### 10.5 Temporal scope

Base `temporalScope.mode` values are:

- `AT_REGISTRATION`;
- `INDEFINITE`;
- `UNTIL`;
- `PROFILE_DEFINED`.

`UNTIL` requires `until`.

`PROFILE_DEFINED` requires an exact `temporalRuleRef` into a bound rule artifact.

An asserted end time does not prove when registration occurred; evaluation of an obligation's current state depends on the applicable verified/asserted time evidence and MUST expose that dependency.

### 10.6 Stable failure code and axis

Every `REQUIRED` or `CONDITIONAL` obligation MUST define a stable machine-readable `failureCode` and `failureAxis` from the exact bound Verification Axis Registry.

Human-readable descriptions MAY supplement but MUST NOT replace the code or axis.

### 10.7 Deterministic ordering

`obligations` MUST be sorted by normalized `obligationId` in ascending Unicode code-point order.

`targetRefs` MUST be unique and sorted.

Duplicate obligation identifiers MUST be rejected.

## 11. Contract commitment

### 11.1 Input

The complete Preservation Contract object, including `specification`, is canonicalized using the canonicalization profile identified by the contract. The bound `normativeDependencies` object and its independently recomputable `closureDigest` are part of the contract bytes and therefore part of the contract commitment.

For the DDT Envelope v0.3 baseline:

```text
preservationContractCommitment =
  SHA-256(UTF8(RFC8785-JCS(preservationContract)))
```

### 11.2 Bootstrap rule

Because the contract identifies the canonicalization profile used to hash itself, the DDT envelope version MUST define an unambiguous bootstrap canonicalization and structural hash rule.

For v0.3, that bootstrap is RFC 8785 JCS, UTF-8 and SHA-256.

A future envelope version MAY use a different bootstrap rule but MUST NOT retroactively alter v0.3 verification.

### 11.3 Record binding

`preservationContractCommitment` MUST participate in the DDT `recordHash` input.

The same value MUST appear in the registration statement and the Conformance Receipt.

Mismatch between those values is a structural failure.

## 12. Conformance semantics

### 12.1 Registration conformance

The original validator evaluates the record under the exact contract and emits a Conformance Receipt.

The registration-conformance result MUST be:

- `PASS` — every applicable required obligation passed;
- `FAIL` — at least one applicable required obligation failed; or
- `INDETERMINATE` — validation could not determine one or more mandatory results.

Warnings do not create a separate pass state. They are preserved as reason entries while the mandatory-result derivation remains deterministic.

`FAIL` and `INDETERMINATE` MUST NOT be represented as successful production conformance.

### 12.2 Later reproduction

A later verifier evaluates the same historical record under the exact bound contract and reports:

- historical artifacts available/integrity;
- reproduced per-requirement results;
- reproduced overall conformance result;
- comparison with the original receipt; and
- any unresolved dependencies.

### 12.3 Continuing obligations

Current preservation-obligation evaluation is a later result. It MUST NOT rewrite the original registration-conformance result.

For example:

```text
REGISTRATION_CONFORMANCE = PASS
CURRENT_DOCUMENT_AVAILABILITY = UNAVAILABLE
CURRENT_PRESERVATION_OBLIGATION = FAIL
DDT_RECORD_INTEGRITY = PASS
```

is a valid multi-axis outcome.

### 12.4 Context outside the contract

If context was not required by the historical contract and was never preserved:

```text
REGISTRATION_CONFORMANCE = PASS
HISTORICAL_SEMANTIC_RESOLUTION = PARTIAL
```

MAY be correct. A later verifier MUST NOT invent a retroactive preservation requirement.

## 13. Privacy

The contract MUST NOT embed credentials, private keys or secret access tokens.

An obligation may require preservation of a confidential evidence commitment without requiring public disclosure of the evidence bytes.

Profiles MUST consider whether public raw hashes expose low-entropy or linkable confidential content and MUST define safer commitment mechanisms where necessary.

## 14. Versioning and migration

A frozen contract is immutable.

A changed artifact, applicability rule, obligation, validation rule, cryptographic profile or validator version requires a new contract version and commitment.

Old DDT Records remain evaluated under their original contracts.

A later contract MAY supersede an earlier contract for new registrations only. It MUST NOT retroactively change earlier obligations or conformance.

A v0.1 or v0.2 Preservation Contract remains an artifact of its original version. It MUST NOT be relabeled as v0.3 or interpreted as having a normative dependency closure that its original bytes did not contain. Historical verification uses the exact structure and rules of the bound version.

## 15. Required verification axes

A Preservation Contract verifier MUST expose at least:

- `PRESERVATION_CONTRACT_IDENTITY`;
- `PRESERVATION_CONTRACT_INTEGRITY`;
- `PRESERVATION_CONTRACT_BOUND_TO_RECORD`;
- `PRESERVATION_CONTRACT_APPLICABILITY`;
- `CONTRACT_ARTIFACT_AVAILABILITY`;
- `CONTRACT_ARTIFACT_INTEGRITY`;
- `PROFILE_ARTIFACT_AVAILABILITY`;
- `PROFILE_ARTIFACT_INTEGRITY`;
- `REGISTRATION_CONFORMANCE`;
- `CONFORMANCE_RECEIPT_INTEGRITY`;
- `CONFORMANCE_REPRODUCIBILITY`; and
- `CURRENT_PRESERVATION_OBLIGATION`.

Success in one axis MUST NOT automatically determine another.

## 16. Required tests

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
14. reproduced result differing from the original receipt;
15. profile v1.1 published after a record governed by profile v1.0;
16. every required core artifact role present;
17. structural commitment and signature profiles cannot be substituted for one another;
18. required capability without a profile;
19. conditional capability without a condition rule;
20. not-applicable capability carrying a profile;
21. required missing capability evidence versus capability outside the contract;
22. unavailable Verification Axis or Reason-Code Registry;
23. obligation failure code with an unregistered `failureAxis`;
24. v0.1 contract preserved and verified without v0.2 reinterpretation; and
25. exact transitive dependency closure reproduced offline;
26. dependency array reorder without semantic membership change;
27. missing transitive schema/profile/registry;
28. extra unbound dependency inserted into the closure;
29. same artifact ID/version with substituted digest;
30. `closureDigest` mismatch after otherwise valid artifact-reference mutation; and
31. v0.2 contract preserved and verified without retroactive v0.3 closure requirements.

## Appendix A — Integration change for the next Envelope revision

The next Record Envelope successor MUST:

1. bind the complete v0.3 Preservation Contract structure without a local reduced duplicate;
2. preserve the thirteen direct artifact roles and six capability declarations;
3. include the complete `normativeDependencies` closure and its digest in the contract commitment that participates in `recordHash`;
4. require the Conformance Receipt and Offline Verification Package to carry/reproduce the exact historical dependency closure rather than resolve current resources;
5. use the completed Signature Proof v0.2 carrier family for registration, conformance, verification result, checkpoint, event coverage, network finality, offline package and cryptographic renewal where those capabilities apply; and
6. preserve every limiting capability result separately in Verification Result v0.2.

This successor closes the dependency-binding item that remained open in Envelope v0.3 Draft.4. It does not make any `TEST_ONLY` cryptographic or network profile production-ready.

---

**End of DDT Preservation Contract v0.3 Draft (`0.3.0-draft.1`)**
