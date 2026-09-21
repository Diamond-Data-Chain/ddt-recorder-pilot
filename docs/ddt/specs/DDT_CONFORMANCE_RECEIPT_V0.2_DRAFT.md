# DDT Conformance Receipt v0.2 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-CONFORMANCE-RECEIPT-0.2-DRAFT.1`  
**Version:** `0.2.0-draft.1`  
**Status:** DRAFT / TEST_ONLY — not approved for production conformance claims  
**Date:** 2026-09-04  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`  
**Supersedes for new test artifacts:** `DDT-CONFORMANCE-RECEIPT-0.1-DRAFT.1`  
**Preservation Contract baseline:** `DDT-PRESERVATION-CONTRACT-0.2-DRAFT.1`  
**Signature baseline:** `DDT-SIGNATURE-PROOF-0.2-DRAFT.1`

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

Version 0.2 adds exact coverage for Preservation Contract v0.2:

- thirteen mandatory core artifact roles;
- six explicit capability classes;
- exact materialized-obligation failure bindings;
- independent rule and capability result commitments;
- deterministic failure propagation; and
- the common Signature Proof v0.2 object.

Version 0.1 remains immutable and historically verifiable under its original contract. A v0.1 receipt MUST NOT be reinterpreted as satisfying v0.2 coverage.

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
    "version": "0.2.0-draft.1"
  },
  "receiptCore": {
    "receiptId": "urn:uuid:00000000-0000-4000-8000-000000000001",
    "recordHash": {},
    "preservationContractCommitment": {},
    "validator": {},
    "validationInput": {},
    "artifactEvaluations": {},
    "evidenceEvaluations": [],
    "ruleResults": [],
    "capabilityResults": {},
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
- `evaluatedArtifactSetHash`;
- `evaluatedEvidenceSetHash`; and
- `inputManifestHash`.

The first two values MUST equal their same-named `receiptCore` values.

```text
evaluatedArtifactSetHash =
  SHA-256(UTF8(JCS(receiptCore.artifactEvaluations)))

evaluatedEvidenceSetHash =
  SHA-256(UTF8(JCS(receiptCore.evidenceEvaluations)))
```

`evidenceEvaluations` MUST be sorted by `evaluationId` in ascending Unicode code-point order. Duplicate evaluation IDs are rejected.

The exact input manifest is:

```json
{
  "recordHash": {},
  "preservationContractCommitment": {},
  "evaluatedArtifactSetHash": {},
  "evaluatedEvidenceSetHash": {}
}
```

```text
inputManifestHash = SHA-256(UTF8(JCS(input manifest)))
```

## 8. Artifact coverage

`artifactEvaluations` is a closed object containing exactly the thirteen Preservation Contract v0.2 core roles:

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
2. otherwise `INDETERMINATE` if any mandatory result is absent, duplicated, unresolved or `INDETERMINATE`, any required historical input cannot be evaluated, or any stored set hash/count is wrong;
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

## 13. Claim boundary

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

## 14. Validation-time claims

`startedAt` and `completedAt` are validator clock assertions bound into the receipt core. They are not independently proven time. Independent proof requires valid timestamp or checkpoint evidence over a profile-permitted committed target.

## 15. Receipt core and proof

```text
receiptCoreHash = SHA-256(UTF8(JCS(receiptCore)))
```

The bootstrap structural profile is RFC 8785 JCS, UTF-8 and SHA-256 with lowercase hexadecimal digest encoding.

A v0.2 receipt MUST contain at least one Signature Proof v0.2 object with exactly:

```text
proofPurpose     = CONFORMANCE_ATTESTATION
signedObject.type = RECEIPT_CORE_HASH
signedObject.digest = receiptCoreHash
```

The proof profile defines the signing input, domain, encoding and verification procedure. Proof validity remains separate from verification-method history, issuer identity, authority and time.

## 16. Complete receipt commitment

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

## 17. Registration acceptance

A successful production registration requires:

1. `overallResult.status = PASS`;
2. exact record and Preservation Contract binding;
3. complete artifact, evidence, rule, obligation and capability accounting;
4. correct input, result-set, core and complete-receipt commitments;
5. at least one valid required receipt proof;
6. validator identification matching the contract; and
7. all additional Enterprise Profile requirements passing.

A `FAIL` or `INDETERMINATE` receipt may be retained as audit evidence but MUST NOT be represented as successful conformance.

## 18. Later reproduction

A later verifier does not modify this receipt. It emits a separate Verification Result v0.2 covering at least:

- receipt identity, core integrity and proof validity;
- issuer identity and authority;
- record, contract and registration-statement binding;
- validation-input reproducibility;
- artifact, evidence, rule and capability coverage;
- overall-result derivation; and
- conformance reproduction as `MATCH`, `MISMATCH`, `PARTIAL`, `UNAVAILABLE` or `INDETERMINATE` where permitted by the applicable verification axis.

A reproduction mismatch may identify tampering, unavailable inputs, artifact substitution, validator error or interpretation divergence. It never authorizes silent replacement of the original receipt.

## 19. Corrections and reassessments

Validator defects, corrections and reassessments are append-only. A later artifact binds the original receipt ID, core hash, complete commitment, affected record, correction scope, new result and issuer proof. The historical receipt remains unchanged.

## 20. Required receipt verification axes

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

Artifact, evidence and capability coverage contribute to the registered `VALIDATION_INPUT_REPRODUCIBILITY`, `RULE_RESULT_COVERAGE` and `REGISTRATION_CONFORMANCE` axes. Implementations MUST NOT invent unregistered base-axis identifiers. No success in one axis determines another.

## 21. Required test families

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
19. append-only validator-defect correction preserving the original receipt.

## 22. Integration target

The next Envelope v0.3 revision MUST bind Preservation Contract v0.2 and this complete v0.2 receipt commitment, retain Signature Proof v0.2 registration semantics and preserve Verification Result v0.2 as a separate append-only output.

---

**End of DDT Conformance Receipt v0.2 Draft (`0.2.0-draft.1`)**
