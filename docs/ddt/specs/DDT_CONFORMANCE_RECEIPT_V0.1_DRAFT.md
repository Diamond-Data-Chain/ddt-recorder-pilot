# DDT Conformance Receipt v0.1 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-CONFORMANCE-RECEIPT-0.1-DRAFT.1`  
**Version:** `0.1.0-draft.1`  
**Status:** DRAFT — not approved for production conformance claims  
**Date:** 2026-09-03  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`

## 1. Purpose

A DDT Conformance Receipt preserves what a specific validator reported after evaluating a finalized DDT `recordHash` under one exact Preservation Contract.

It enables a later verifier to determine:

1. which record and Preservation Contract were evaluated;
2. which validator implementation and exact normative artifacts were used;
3. which mandatory, conditional and optional requirements were evaluated;
4. the result and reason codes for each requirement;
5. how the original overall result was derived;
6. whether the receipt core and receipt proof remain intact; and
7. whether an independent re-evaluation reproduces the preserved result.

The receipt preserves a validator result. It does not establish substantive truth, legal validity, authority or independent time unless separately supported by the corresponding evidence and verification axes.

## 2. Construction order and non-circularity

The required construction order is:

```text
finalized recordHash
  -> receiptCore
  -> receiptCoreHash
  -> receiptProofs
  -> conformanceReceiptCommitment
  -> registration statement
  -> registrationStatementHash
  -> registration proofs and time proofs
```

The Conformance Receipt MUST NOT participate in `recordHash`.

The receipt binds the already-finalized `recordHash`. The registration statement then binds the complete Conformance Receipt commitment. This prevents circular hashing while preserving an unambiguous cryptographic path.

## 3. Receipt structure

```json
{
  "specification": {
    "standard": "DDT-CONFORMANCE-RECEIPT",
    "version": "0.1.0-draft.1"
  },
  "receiptCore": {
    "receiptId": "receipt-example-001",
    "recordHash": {},
    "preservationContractCommitment": {},
    "validator": {},
    "validationInput": {},
    "artifactEvaluations": [],
    "evidenceEvaluations": [],
    "ruleResults": [],
    "overallResult": {},
    "claimBoundary": {},
    "validationTimeClaims": {}
  },
  "receiptCoreHash": {},
  "proofs": []
}
```

## 4. `specification`

For this draft:

```json
{
  "standard": "DDT-CONFORMANCE-RECEIPT",
  "version": "0.1.0-draft.1"
}
```

Both fields are REQUIRED and fixed.

## 5. Receipt identity and validation target

### 5.1 `receiptId`

`receiptId` is REQUIRED and MUST uniquely identify one immutable receipt artifact within its issuer namespace.

The identifier MUST NOT be reused for different receipt bytes or a later re-evaluation.

### 5.2 `recordHash`

`receiptCore.recordHash` MUST exactly equal the finalized DDT `commitments.recordHash` evaluated by the validator.

The receipt does not prove that the presented DDT bytes match this value until a verifier independently recomputes record integrity.

### 5.3 `preservationContractCommitment`

`receiptCore.preservationContractCommitment` MUST exactly equal the Preservation Contract commitment included in the evaluated DDT record and later registration statement.

The receipt does not by itself prove that the selected contract was externally applicable. Contract binding and contract applicability remain separate axes.

## 6. Validator identification

`receiptCore.validator` MUST contain:

- `validatorId`;
- `version`;
- validator artifact digest;
- immutable reference where required for independent retrieval;
- `executionId`; and
- optional `instanceIdentityRef`.

The validator ID/version/digest MUST match the validator artifact identified by the Preservation Contract.

`executionId` distinguishes this validation execution from another execution of the same implementation. It is an identifier, not proof of trustworthy execution.

The receipt proof establishes only the signed statement under its defined proof scope. Validator identity, key identity and authority require independent resolution under their bound profiles.

## 7. Validation input commitment

### 7.1 Input manifest

`validationInput` MUST contain:

- `recordHash`;
- `preservationContractCommitment`;
- `evaluatedArtifactSetHash`;
- `evaluatedEvidenceSetHash`; and
- `inputManifestHash`.

### 7.2 Evaluated artifact set

The validator forms a deterministically sorted array containing every normative artifact actually used for the result. Each entry contains:

- `role`;
- exact Artifact Reference;
- availability status; and
- integrity status.

The array is sorted by `role`, then `artifactId`, then `version`, then digest value using ascending Unicode code-point order.

```text
evaluatedArtifactSetHash =
  SHA-256(UTF8(JCS(receiptCore.artifactEvaluations)))
```

### 7.3 Evaluated evidence set

The validator forms `receiptCore.evidenceEvaluations`, a deterministically sorted array of the evidence/proof identifiers used by rule evaluations, including each referenced commitment where available. Each entry states availability, integrity status and reason codes.

```text
evaluatedEvidenceSetHash =
  SHA-256(UTF8(JCS(receiptCore.evidenceEvaluations)))
```

The receipt need not disclose confidential evidence bytes. It MUST preserve enough identifiers and commitments to determine what the validator claims to have evaluated.

### 7.4 Input manifest

The exact input is:

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

All four values MUST be present in `validationInput` and independently recomputable.

## 8. Artifact evaluations

Each `artifactEvaluations` entry MUST contain:

- `role` — stable role such as `ENVELOPE_SCHEMA`, `ENTERPRISE_PROFILE`, `VALIDATION_RULE_SET` or `CRYPTOGRAPHIC_PROFILE`;
- `artifact` — exact Artifact Reference;
- `availability` — `AVAILABLE` or `UNAVAILABLE`;
- `integrity` — `PASS`, `FAIL`, `UNAVAILABLE` or `NOT_EVALUATED`; and
- zero or more stable `reasonCodes`.

An artifact required by the Preservation Contract that is unavailable or fails integrity MUST affect the applicable rule and overall result. It MUST NOT disappear inside a generic warning.

An implementation artifact may be unavailable later while normative artifacts remain sufficient for independent reproduction. This affects implementation reproduction, not necessarily normative conformance reproduction.

## 9. Rule results

### 9.1 One result per evaluated source

Each `ruleResults` entry MUST contain:

- `resultId` — unique within the receipt;
- `sourceType`;
- `sourceId`;
- optional `originTemplateId`;
- `requirement` — `REQUIRED`, `CONDITIONAL` or `OPTIONAL`;
- `applicability` — `APPLICABLE`, `NOT_APPLICABLE` or `UNRESOLVED`;
- `status`;
- `reasonCodes`;
- `targetRefs`; and
- `evidenceRefs`.

`sourceType` MUST be one of:

- `CORE_REQUIREMENT`;
- `SCHEMA_RULE`;
- `PROFILE_RULE`;
- `CONTRACT_OBLIGATION`; or
- `EXTENSION_RULE`.

For a materialized Preservation Contract obligation, `sourceType` is `CONTRACT_OBLIGATION`, `sourceId` is the concrete `obligationId`, and `originTemplateId` identifies the Enterprise Profile template/rule that produced it.

### 9.2 Result status

`status` MUST be:

- `PASS`;
- `FAIL`;
- `INDETERMINATE`; or
- `NOT_APPLICABLE`.

The permitted combinations are:

- `APPLICABLE` with `PASS`, `FAIL` or `INDETERMINATE`;
- `NOT_APPLICABLE` with `NOT_APPLICABLE`; and
- `UNRESOLVED` with `INDETERMINATE`.

A rule MUST NOT be reported as `PASS` when its applicability is unresolved.

### 9.3 Conditional requirements

For `CONDITIONAL`, the receipt MUST preserve the condition-rule result as a separate `ruleResults` entry or a stable `conditionResultRef` to such an entry.

The validator MUST NOT rely on an unrecorded free-text interpretation of the condition.

### 9.4 Reason codes

Every `FAIL` or `INDETERMINATE` result MUST contain at least one stable machine-readable reason code.

Human-readable messages MAY be included in a separate presentation layer but MUST NOT replace reason codes.

### 9.5 Ordering and coverage

`ruleResults` MUST be sorted by `sourceType`, `sourceId`, then `resultId` using ascending Unicode code-point order.

Every materialized Preservation Contract obligation MUST have exactly one corresponding `CONTRACT_OBLIGATION` result.

Every applicable required profile/core/schema rule selected by the historical contract MUST be represented directly or through an exact result-set commitment defined by the bound result profile.

Missing required coverage makes the receipt `INDETERMINATE` or `FAIL` according to the exact result-derivation profile; it cannot produce `PASS`.

## 10. Overall result

`overallResult` MUST contain:

- `status` — `PASS`, `FAIL` or `INDETERMINATE`;
- exact `derivationProfile` Artifact Reference;
- `ruleResultSetHash`;
- counts of each rule status; and
- zero or more overall `reasonCodes`.

For the base derivation rule:

1. `FAIL` if any applicable `REQUIRED` rule is `FAIL`;
2. otherwise `INDETERMINATE` if any required rule is missing, has unresolved applicability or is `INDETERMINATE`;
3. otherwise `PASS` if every applicable required rule is `PASS` and every non-applicable required rule is validly classified under the contract.

Optional-rule failure does not automatically produce overall `FAIL` unless the exact derivation profile says it contributes to a mandatory aggregate rule.

Warnings MUST NOT create ambiguous states such as `PASS_WITH_WARNINGS`. A receipt may be `PASS` with explicit non-failing reason entries, while each independent verification axis remains visible.

```text
ruleResultSetHash = SHA-256(UTF8(JCS(receiptCore.ruleResults)))
```

The preserved counts MUST equal the recomputed counts.

## 11. Claim boundary

`claimBoundary` MUST explicitly state the receipt's non-claims:

```json
{
  "substantiveTruth": "NOT_EVALUATED",
  "legalValidity": "NOT_EVALUATED",
  "registrantAuthority": "SEPARATE_AXIS",
  "independentTime": "SEPARATE_AXIS",
  "contractApplicability": "SEPARATE_AXIS"
}
```

A domain profile MAY require additional claim-boundary fields but MUST NOT weaken these base boundaries.

## 12. Validation time claims

`validationTimeClaims` MAY contain `startedAt` and `completedAt` values reported by the validator.

These values are assertions bound into the receipt core. They are not independently proven time unless a separate valid time proof binds `receiptCoreHash`, `conformanceReceiptCommitment`, `registrationStatementHash` or a profile-permitted aggregate containing the relevant target.

The receipt MUST NOT use field names that imply independent time proof for an unverified local clock value.

## 13. Receipt core commitment

The receipt core hash is:

```text
receiptCoreHash = SHA-256(UTF8(JCS(receiptCore)))
```

For this draft, the bootstrap canonicalization is RFC 8785 JCS, text encoding is UTF-8, the hash algorithm is SHA-256 and the digest encoding is lowercase hexadecimal without prefix.

The stored `receiptCoreHash` MUST equal the independently recomputed value.

## 14. Receipt proofs

### 14.1 Required proof

A production receipt MUST contain at least one proof over `receiptCoreHash`.

Each proof MUST contain:

- `proofId`;
- `proofType`;
- exact `proofProfile` Artifact Reference;
- `verificationMethod`;
- `proofPurpose` equal to `CONFORMANCE_ATTESTATION`;
- `signedObject.type` equal to `RECEIPT_CORE_HASH`;
- `signedObject.digest` equal to `receiptCoreHash`;
- `proofValue` or exact `proofRef`; and
- optional `createdAtClaim`.

The exact proof profile defines signing input, domain separation, encoding and verification procedure. A verifier MUST NOT guess them.

### 14.2 Proof meaning

A valid receipt proof establishes that the corresponding verification method produced a valid proof over the defined signing input.

It does not alone prove:

- validator identity;
- organizational identity;
- authority to issue the receipt;
- accuracy or completeness of the validation implementation;
- independent time; or
- substantive truth.

Those questions remain separate axes.

## 15. Complete receipt commitment

The commitment included in the DDT registration statement is:

```text
conformanceReceiptCommitment =
  SHA-256(UTF8(JCS({
    "specification": receipt.specification,
    "receiptCore": receipt.receiptCore,
    "receiptCoreHash": receipt.receiptCoreHash,
    "proofs": receipt.proofs
  })))
```

Proofs MUST be sorted by `proofId` before this commitment is computed. Duplicate proof IDs are rejected.

Any change to the receipt core, stored hash or proof set changes the commitment and breaks the registration-statement binding unless a new legitimate registration package is created. The historical registration package MUST NOT be rewritten.

## 16. Registration acceptance

A successful production DDT registration MUST satisfy all of the following:

1. `overallResult.status` is `PASS`;
2. every required rule/obligation is accounted for;
3. `receiptCoreHash` verifies;
4. at least one required receipt proof verifies under its exact profile;
5. receipt validator identification matches the Preservation Contract;
6. receipt record/contract commitments match the DDT;
7. the independently recomputed receipt commitment matches the registration statement; and
8. all additional profile-required receipt conditions pass.

A receipt with `FAIL` or `INDETERMINATE` MAY be preserved as audit evidence, but it MUST NOT be represented as successful production conformance.

If a profile permits a DDT recording of a rejected attempt, it uses a separate failure record and contract as defined by the Enterprise Profile.

## 17. Later reproduction

A later verifier MUST NOT modify the original receipt.

It produces a separate Verification Result that reports:

- receipt core integrity;
- receipt proof validity;
- validator identity and authority resolution;
- historical artifact availability and integrity;
- reproduced per-rule results;
- reproduced overall result;
- comparison outcome: `MATCH`, `MISMATCH`, `PARTIAL`, `UNAVAILABLE` or `INDETERMINATE`; and
- exact reason codes and dependencies.

A mismatch may reveal a validator defect, artifact substitution, different interpretation, missing input or tampering. It does not authorize silent replacement of the original receipt.

## 18. Corrections and reassessments

A discovered validator defect, later reassessment or invalidation statement MUST be append-only.

It MUST bind:

- original `receiptId`;
- original `receiptCoreHash`;
- original `conformanceReceiptCommitment`;
- affected DDT `recordHash`;
- type and scope of the correction/reassessment;
- new evidence/result; and
- issuer proof.

The original receipt remains available and unchanged.

## 19. Required verification axes

Receipt verification MUST expose at least:

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

No success in one axis automatically determines another.

## 20. Required test families

Before candidate status, test at least:

1. valid receipt and successful registration binding;
2. altered record hash;
3. altered Preservation Contract commitment;
4. substituted validator artifact;
5. missing required contract obligation result;
6. duplicate or unsorted result identifiers;
7. conditional rule with absent condition result;
8. applicable required rule reported `NOT_APPLICABLE`;
9. unresolved applicability reported as `PASS`;
10. incorrect overall result derivation;
11. incorrect result counts or result-set hash;
12. receipt core tamper;
13. receipt proof tamper;
14. receipt commitment mismatch in registration statement;
15. receipt with asserted validation time but no independent time proof;
16. independent reproduction `MATCH`;
17. independent reproduction `MISMATCH`;
18. reproduction `PARTIAL` because optional historical context is unavailable;
19. original validator unavailable but normative artifacts reproducible; and
20. append-only validator-defect correction preserving the original receipt.

## Appendix A — Integration changes for Envelope v0.3 Draft.2

The next DDT Envelope v0.3 revision MUST:

1. use the exact receipt structure and commitment procedure defined here;
2. bind `conformanceReceiptCommitment` in the registration statement;
3. require registration signatures after the complete receipt commitment exists;
4. prohibit receipt mutation after registration;
5. expose receipt proof, issuer, record, contract and registration binding as separate axes; and
6. update examples and schema to eliminate the earlier placeholder receipt structure.

---

**End of DDT Conformance Receipt v0.1 Draft (`0.1.0-draft.1`)**
