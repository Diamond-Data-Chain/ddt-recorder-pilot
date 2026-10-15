# DDT Conformance Receipt v0.4 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-CONFORMANCE-RECEIPT-0.4-DRAFT.1`  
**Version:** `0.4.0-draft.1`  
**Status:** DRAFT / TEST_ONLY — not approved for production conformance claims  
**Date:** 2026-09-05  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`  
**Supersedes for new test artifacts:** `DDT-CONFORMANCE-RECEIPT-0.3-DRAFT.1`  
**Preservation Contract baseline:** `DDT-PRESERVATION-CONTRACT-0.3-DRAFT.1`  
**Signature baseline:** `DDT-SIGNATURE-PROOF-0.3-DRAFT.1`

## 1. Purpose

A DDT Conformance Receipt preserves what one identified validator reported after evaluating one finalized DDT `recordHash` against the exact Preservation Contract applicable to that registration attempt.

It enables a later verifier to establish independently:

1. which record and contract were evaluated;
2. which exact validator and normative artifacts were used;
3. which evidence inputs were presented or unavailable;
4. whether every materialized rule, obligation and capability was accounted for;
5. how the overall conformance result was derived;
6. whether the receipt core and its proof remain intact; and
7. whether a later evaluation reproduces the historical result.

The receipt preserves a validation result. It does not establish substantive truth, legal validity, document availability after registration, signer authority, independent time, network finality, event-history completeness or historical semantic sufficiency unless those questions are separately evaluated under their own evidence and verification axes.

## 2. Version boundary

Version 0.4 retains the complete v0.3 receipt model and adds an optional,
cryptographically bound Historical Identity Authority evaluation carrier for registrations
whose applicable Preservation Contract selects that capability.

The v0.4 additions are:

- optional `receiptCore.historicalIdentityAuthority`;
- preservation of the exact semantic signing-key lifecycle state separately from generic
  rule-result status;
- Signature Proof v0.3 for Conformance Receipt attestation; and
- integration with Verification Result v0.3 for the four existing Historical Identity
  Authority axes.

The carrier MUST NOT appear merely because an implementation knows how to evaluate
Historical Identity Authority. It is emitted only when that capability was actually
applicable and evaluated under the historical Preservation Contract.

Version 0.3 remains immutable and historically verifiable. A v0.3 receipt MUST NOT be
relabeled as v0.4 or treated as if it contained Historical Identity Authority evaluation
state that was not present in its original receipt core.

## 3. Construction order and non-circularity

The required order is:

```text
finalized recordHash
  -> receiptCore
  -> receiptCoreHash
  -> receipt proofs
  -> conformanceReceiptCommitment
  -> registration statement
  -> registrationStatementHash
  -> registration proofs and independent-time evidence
```

The Conformance Receipt MUST NOT participate in `recordHash`. The receipt binds the already-finalized record. The later registration statement binds the complete receipt commitment.

## 4. Receipt structure

```json
{
  "specification": {
    "standard": "DDT-CONFORMANCE-RECEIPT",
    "version": "0.4.0-draft.1"
  },
  "receiptCore": {
    "receiptId": "urn:uuid:00000000-0000-4000-8000-000000000001",
    "recordHash": {},
    "preservationContractCommitment": {},
    "validator": {},
    "validationInput": {},
    "artifactEvaluations": {},
    "normativeDependencyEvaluations": [],
    "evidenceEvaluations": [],
    "ruleResults": [],
    "capabilityResults": {},
    "historicalIdentityAuthority": {},
    "overallResult": {},
    "claimBoundary": {},
    "validationTimeClaims": {}
  },
  "receiptCoreHash": {},
  "proofs": []
}
```

Unknown properties are rejected by the machine schema. Duplicate JSON object member names, invalid Unicode, non-I-JSON numbers and non-finite values MUST be rejected before schema validation or canonicalization.

## 5. Receipt identity and target

### 5.1 `receiptId`

`receiptId` uniquely identifies one immutable receipt. It MUST NOT be reused for different receipt bytes, another execution or a later re-evaluation.

### 5.2 `recordHash`

`receiptCore.recordHash` MUST exactly equal the finalized DDT `commitments.recordHash` evaluated by the validator. This binding does not by itself prove record integrity; the later verifier still recomputes the record hash.

### 5.3 `preservationContractCommitment`

`receiptCore.preservationContractCommitment` MUST exactly equal the commitment to the Preservation Contract carried by the evaluated record and registration package. Contract integrity, historical applicability and conformance are separate results.

## 6. Validator identification

`receiptCore.validator` contains:

- `validatorId`;
- `version`;
- exact validator artifact digest;
- immutable reference when available;
- `executionId`; and
- optional `instanceIdentityRef`.

The validator ID, version and digest MUST equal the validator selected by the contract. The implementation is evidence about what ran; it is not allowed to replace the contract's normative schemas, profiles and rules.

## 7. Exact validation input

`validationInput` contains:

- `recordHash`;
- `preservationContractCommitment`;
- `preservationContractDependencyClosureDigest`;
- `evaluatedArtifactSetHash`;
- `evaluatedNormativeDependencySetHash`;
- `evaluatedEvidenceSetHash`; and
- `inputManifestHash`.

The first two values MUST equal their same-named `receiptCore` values. `preservationContractDependencyClosureDigest` MUST equal the exact `preservationContract.normativeDependencies.closureDigest` stored in the evaluated Preservation Contract v0.3.

```text
evaluatedArtifactSetHash =
  SHA-256(UTF8(JCS(receiptCore.artifactEvaluations)))

evaluatedNormativeDependencySetHash =
  SHA-256(UTF8(JCS(receiptCore.normativeDependencyEvaluations)))

evaluatedEvidenceSetHash =
  SHA-256(UTF8(JCS(receiptCore.evidenceEvaluations)))
```

`normativeDependencyEvaluations` MUST be sorted by the canonical Artifact Reference tuple defined by Preservation Contract v0.3. Duplicate `(artifactId, version)` pairs are rejected. `evidenceEvaluations` MUST be sorted by `evaluationId` in ascending Unicode code-point order. Duplicate evaluation IDs are rejected.

The exact input manifest is:

```json
{
  "recordHash": {},
  "preservationContractCommitment": {},
  "preservationContractDependencyClosureDigest": {},
  "evaluatedArtifactSetHash": {},
  "evaluatedNormativeDependencySetHash": {},
  "evaluatedEvidenceSetHash": {}
}
```

```text
inputManifestHash = SHA-256(UTF8(JCS(input manifest)))
```

## 8. Artifact and normative dependency coverage

### 8.1 Direct artifact coverage

`artifactEvaluations` is a closed object containing exactly the thirteen Preservation Contract v0.3 direct core roles:

1. `envelopeSchema`;
2. `enterpriseProfile`;
3. `validationRuleSet`;
4. `canonicalizationProfile`;
5. `structuralCommitmentProfile`;
6. `identifierProfile`;
7. `evidenceManifestProfile`;
8. `relationshipVocabulary`;
9. `registrationSignatureProfile`;
10. `conformanceReceiptProfile`;
11. `verificationResultProfile`;
12. `verificationAxisRegistry`; and
13. `verificationReasonCodeRegistry`.

Each evaluation binds the exact Artifact Reference, availability, integrity, reason codes and the rule result that propagates any failure. The Artifact Reference MUST equal the corresponding contract entry byte-for-byte after canonical parsing.

An unavailable or altered required artifact MUST produce the contract-defined failure or an `INDETERMINATE` result where the evidence cannot distinguish failure from non-evaluation. It MUST NOT be omitted or reported only as a warning.

### 8.2 Normative dependency closure coverage

`normativeDependencyEvaluations` is a closed ordered array over the exact Artifact References in `preservationContract.normativeDependencies.artifacts`. It does not replace the thirteen direct-role evaluations. A direct artifact that is also a member of the transitive closure remains represented in both places because the two structures answer different questions: direct historical role versus complete reproducibility dependency membership.

For every contract dependency there MUST be exactly one evaluation containing the exact Artifact Reference, availability, integrity, reason codes and a `ruleResultRef`. The verifier MUST independently reconstruct the expected closure from the Preservation Contract direct bindings and applicable capability profiles, recompute the contract `closureDigest`, compare ordered membership byte-for-byte after canonical parsing and then compare `evaluatedNormativeDependencySetHash`.

Missing, extra, reordered, substituted or digest-mismatched dependency entries prevent `PASS`. A live URL, current package-manager version or mutable resource MUST NOT silently repair a missing historical dependency. A capability that was historically `NOT_APPLICABLE` MUST NOT pull its profile family into the closure merely because the current validator knows that family.

## 9. Evidence coverage

Each `evidenceEvaluations` entry identifies one evidence item actually used or required during validation and records:

- stable evaluation and evidence references;
- commitment where available;
- `availabilityAtValidation`;
- integrity status;
- reason codes; and
- rule results depending on that evidence.

`PRESENTED` means the validator reports that evidence was available to that validation execution. It is an assertion bound into the receipt, not independent proof of historical availability unless a separately verified mechanism supports it.

Later presentation of bytes may establish a commitment match. It MUST NOT be used to infer that those bytes were available or evaluated at registration.

Confidential evidence bytes need not be embedded in the DDT or receipt.

## 10. Rule results

### 10.1 Coverage

Every rule selected by the historical contract and every materialized contract obligation MUST have exactly one result.

For a `CONTRACT_OBLIGATION` result:

- `sourceId` is the exact `obligationId`;
- `originTemplateId` identifies the Enterprise Profile template or rule;
- `contractFailureBinding.failureCode` equals the obligation `failureCode` for every required or conditional obligation; and
- `contractFailureBinding.failureAxis` equals the obligation `failureAxis` for every required or conditional obligation.

An optional obligation carries `contractFailureBinding` only when that same binding exists in the historical contract.

This prevents a validator from applying an obligation but discarding its historical origin or prescribed failure semantics.

### 10.2 Applicability and status

Permitted pairs are:

- `APPLICABLE` with `PASS`, `FAIL` or `INDETERMINATE`;
- `NOT_APPLICABLE` with `NOT_APPLICABLE`; and
- `UNRESOLVED` with `INDETERMINATE`.

A conditional rule binds a separate `conditionResultRef`. A validator MUST NOT replace a missing condition result with free text.

Every `FAIL` or `INDETERMINATE` result contains at least one registered reason code. Every required or conditional contract obligation uses its bound failure code and axis when that obligation fails.

### 10.3 Ordering and commitment

`ruleResults` MUST be sorted by `sourceType`, `sourceId`, then `resultId`. Duplicate `resultId` values and duplicate results for one required source are rejected.

```text
ruleResultSetHash = SHA-256(UTF8(JCS(receiptCore.ruleResults)))
```

## 11. Capability results

`capabilityResults` is a closed object containing exactly:

- `identityAuthority`;
- `independentTime`;
- `eventCoverage`;
- `networkFinality`;
- `offlineVerification`; and
- `cryptographicRenewal`.

Each result repeats the exact historical contract branch and evaluates it:

- `REQUIRED` binds the profile and is applicable;
- `CONDITIONAL` binds the profile, condition rule and condition result;
- `NOT_APPLICABLE` binds the contract reason and is not applicable.

The receipt MUST reject a branch that does not exactly match the contract. An applicable required or conditional capability may be `PASS`, `FAIL` or `INDETERMINATE`. A not-applicable capability MUST be `NOT_APPLICABLE`; it is not missing and does not prevent overall conformance.

```text
capabilityResultSetHash =
  SHA-256(UTF8(JCS(receiptCore.capabilityResults)))
```

This distinction answers whether information violated the historical preservation contract or was outside it from the start.

## 13. Historical Identity Authority evaluation carrier

`receiptCore.historicalIdentityAuthority` is OPTIONAL at the receipt schema level so that
the v0.4 format does not falsely imply Historical Identity Authority applicability.

When present, it records deterministic Historical Identity Authority evaluation state
needed by later Verification Result processing. The current carrier contains the optional
`signingKeyLifecycle` object with:

- `state`; and
- `reasonCodes`.

The permitted semantic lifecycle states are:

- `ACTIVE`;
- `SUSPENDED`;
- `ROTATED_OUT`;
- `REVOKED`;
- `EXPIRED`;
- `COMPROMISE_EFFECT_UNRESOLVED`; and
- `UNRESOLVED`.

This semantic state is distinct from the generic `ruleResults[].status`. In particular,
`ACTIVE` MUST NOT be reduced to generic `PASS` or historical lifecycle `VALID`, and
`ROTATED_OUT` MUST NOT be collapsed into another state.

The carrier is part of `receiptCore` and therefore covered by `receiptCoreHash` and the
Conformance Receipt proof. It is not an independent assertion outside the signed receipt.

The carrier does not replace the underlying Historical Identity Authority evidence,
Evidence Manifest commitments, trust configuration, rule results or capability result.
Those inputs remain independently preserved and digest-bound as required by their
applicable profiles and Preservation Contract.

## 12. Overall result

`overallResult` binds:

- exact result-derivation profile;
- `ruleResultSetHash`;
- `capabilityResultSetHash`;
- exact rule counts;
- exact capability counts;
- final status; and
- reason codes.

For the base derivation:

1. `FAIL` if any applicable required rule, contract obligation, core artifact rule or required/applicable conditional capability is `FAIL`;
2. otherwise `INDETERMINATE` if any mandatory result is absent, duplicated, unresolved or `INDETERMINATE`, any required historical input cannot be evaluated, the normative dependency closure cannot be reproduced exactly, or any stored set hash/count is wrong;
3. otherwise `PASS` when every applicable mandatory result passes and every not-applicable result is validly justified by the contract.

Optional rule failures do not automatically fail the receipt unless the bound derivation profile makes them part of a mandatory aggregate rule.

`PARTIAL` is not a conformance-receipt status. It belongs to later multi-axis verification questions such as historical semantic resolution. A conformant record may therefore have:

```text
DDT RECORD INTEGRITY = PASS
DOCUMENT INTEGRITY = PASS
PRESERVATION CONTRACT CONFORMANCE = PASS
HISTORICAL SEMANTIC RESOLUTION = PARTIAL
```

No overall result may hide a required `FAIL` or `INDETERMINATE` condition.

## 14. Claim boundary

The receipt core fixes these boundaries:

```json
{
  "substantiveTruth": "NOT_EVALUATED",
  "legalValidity": "NOT_EVALUATED",
  "recordIntegrity": "SEPARATE_AXIS",
  "documentAvailability": "SEPARATE_AXIS",
  "documentIntegrity": "SEPARATE_AXIS",
  "registrantAuthority": "SEPARATE_AXIS",
  "independentTime": "SEPARATE_AXIS",
  "networkFinality": "SEPARATE_AXIS",
  "eventHistoryCompleteness": "SEPARATE_AXIS",
  "historicalSemanticResolution": "SEPARATE_AXIS",
  "contractApplicability": "SEPARATE_AXIS"
}
```

Passing conformance proves only that the evaluated record satisfied the exact historically bound preservation contract according to the preserved validator result and independently reproducible rules. It does not prove that every recorded assertion was true.

## 15. Validation-time claims

`startedAt` and `completedAt` are validator clock assertions bound into the receipt core. They are not independently proven time. Independent proof requires valid timestamp or checkpoint evidence over a profile-permitted committed target.

## 16. Receipt core and proof

```text
receiptCoreHash = SHA-256(UTF8(JCS(receiptCore)))
```

The bootstrap structural profile is RFC 8785 JCS, UTF-8 and SHA-256 with lowercase hexadecimal digest encoding.

A v0.4 receipt MUST contain at least one Signature Proof v0.3 object with exactly:

```text
proofPurpose     = CONFORMANCE_ATTESTATION
signedObject.type = RECEIPT_CORE_HASH
signedObject.digest = receiptCoreHash
```

The proof profile defines the signing input, domain, encoding and verification procedure. Proof validity remains separate from verification-method history, issuer identity, authority and time.

## 17. Complete receipt commitment

Proofs MUST be sorted by `proofId`; duplicate proof IDs are rejected.

```text
conformanceReceiptCommitment =
  SHA-256(UTF8(JCS({
    "specification": receipt.specification,
    "receiptCore": receipt.receiptCore,
    "receiptCoreHash": receipt.receiptCoreHash,
    "proofs": receipt.proofs
  })))
```

Any mutation changes this commitment and breaks the registration-statement binding.

## 18. Registration acceptance

A successful production registration requires:

1. `overallResult.status = PASS`;
2. exact record and Preservation Contract binding;
3. complete direct-artifact, normative-dependency, evidence, rule, obligation and capability accounting;
4. correct input, result-set, core and complete-receipt commitments;
5. at least one valid required receipt proof;
6. validator identification matching the contract; and
7. all additional Enterprise Profile requirements passing.

A `FAIL` or `INDETERMINATE` receipt may be retained as audit evidence but MUST NOT be represented as successful conformance.

## 19. Later reproduction

A later verifier does not modify this receipt. It emits a separate Verification Result v0.3 covering at least:

- receipt identity, core integrity and proof validity;
- issuer identity and authority;
- record, contract and registration-statement binding;
- validation-input reproducibility;
- exact Preservation Contract v0.3 dependency-closure reproduction;
- direct artifact, normative dependency, evidence, rule and capability coverage;
- overall-result derivation; and
- conformance reproduction as `MATCH`, `MISMATCH`, `PARTIAL`, `UNAVAILABLE` or `INDETERMINATE` where permitted by the applicable verification axis.

A reproduction mismatch may identify tampering, unavailable inputs, artifact substitution, validator error or interpretation divergence. It never authorizes silent replacement of the original receipt.

## 20. Corrections and reassessments

Validator defects, corrections and reassessments are append-only. A later artifact binds the original receipt ID, core hash, complete commitment, affected record, correction scope, new result and issuer proof. The historical receipt remains unchanged.

## 21. Required receipt verification axes

Verification MUST expose at least:

- `CONFORMANCE_RECEIPT_IDENTITY`;
- `CONFORMANCE_RECEIPT_CORE_INTEGRITY`;
- `CONFORMANCE_RECEIPT_PROOF_VALIDITY`;
- `RECEIPT_ISSUER_IDENTITY`;
- `RECEIPT_ISSUER_AUTHORITY`;
- `RECEIPT_RECORD_BINDING`;
- `RECEIPT_CONTRACT_BINDING`;
- `RECEIPT_REGISTRATION_STATEMENT_BINDING`;
- `VALIDATION_INPUT_REPRODUCIBILITY`;
- `RULE_RESULT_COVERAGE`;
- `OVERALL_RESULT_DERIVATION`; and
- `CONFORMANCE_REPRODUCIBILITY`.

Direct-artifact, normative-dependency, evidence and capability coverage contribute to the registered `VALIDATION_INPUT_REPRODUCIBILITY`, `RULE_RESULT_COVERAGE` and `REGISTRATION_CONFORMANCE` axes. Implementations MUST NOT invent unregistered base-axis identifiers. No success in one axis determines another.

## 22. Required test families

Before candidate status, test at least:

1. valid complete receipt;
2. each of thirteen artifact roles missing, substituted, unavailable and altered;
3. each of six capability branches under `REQUIRED`, `CONDITIONAL` and `NOT_APPLICABLE`;
4. capability branch different from the bound contract;
5. missing or duplicate contract obligation result;
6. altered obligation origin, failure code or failure axis;
7. conditional rule with absent or altered condition result;
8. unresolved applicability reported as `PASS`;
9. incorrect input, rule-set or capability-set hash;
10. incorrect counts or overall derivation;
11. required failure hidden behind optional success;
12. receipt core, proof-purpose, target or signature tamper;
13. receipt commitment mismatch in the registration statement;
14. later-presented evidence falsely represented as available at registration;
15. asserted validation time without independent time evidence;
16. reproduction `MATCH`, `MISMATCH`, `PARTIAL`, `UNAVAILABLE` and `INDETERMINATE`;
17. conformance `PASS` with semantic resolution `PARTIAL`;
18. missing required preservation versus historically `NOT_APPLICABLE` capability; and
19. append-only validator-defect correction preserving the original receipt;
20. exact Preservation Contract v0.3 dependency closure reproduced;
21. missing closure dependency;
22. extra or reordered closure dependency;
23. dependency Artifact Reference or digest substitution;
24. `preservationContractDependencyClosureDigest` mismatch;
25. `evaluatedNormativeDependencySetHash` mismatch; and
26. attempted live resolution of a missing historical dependency rejected;
27. v0.3 receipt remains valid without a Historical Identity Authority carrier;
28. applicable Historical Identity Authority evaluation is preserved in a v0.4 receipt;
29. signing-key lifecycle `ACTIVE`, `ROTATED_OUT` and `COMPROMISE_EFFECT_UNRESOLVED`
    survive receipt serialization without lossy mapping;
30. mutation of the Historical Identity Authority carrier changes `receiptCoreHash`; and
31. a v0.4 receipt proof is accepted only under the Signature Proof v0.3
    `CONFORMANCE_ATTESTATION` / `RECEIPT_CORE_HASH` binding.

## 23. Integration target

Preservation Contracts selecting this receipt revision MUST bind the exact Conformance
Receipt v0.4 specification and schema by version and digest.

Historical Identity Authority capable registrations MUST preserve the applicable profile,
evidence schema, trust configuration and evidence commitments required to reproduce the
four existing Verification Result axes:

- `SIGNING_KEY_IDENTITY`;
- `SIGNING_KEY_LIFECYCLE`;
- `REGISTRANT_IDENTITY`; and
- `REGISTRANT_AUTHORITY`.

The Offline Verification Package MUST preserve the identity/authority evidence and trust
dependencies required for later reproduction.

Older local proof structures MUST NOT silently acquire the identity-evidence,
authority-evidence or lifecycle-evidence issuance semantics defined by Signature Proof
v0.3.

Verification Result v0.3 remains a separate append-only output; the Conformance Receipt
carrier preserves deterministic historical evaluation state but does not replace that
result model.

---

**End of DDT Conformance Receipt v0.4 Draft (`0.4.0-draft.1`)**
