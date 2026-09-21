# DDT Verification Result and Axis Registry v0.1 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-VERIFICATION-RESULT-0.1-DRAFT.1`  
**Version:** `0.1.0-draft.1`  
**Status:** DRAFT — not approved for production conformance claims  
**Date:** 2026-09-03  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`

## 1. Purpose

A DDT Verification Result reports what an identified verifier established, failed to establish or could not evaluate for a defined DDT target and verification request.

It prevents one generic `VERIFIED` label from implying success across unrelated questions such as record integrity, document availability, signature validity, identity, authority, time, conformance and historical meaning.

The result is append-only evidence about a verification execution. It does not modify the DDT Record, Evidence Manifest, Preservation Contract or original Conformance Receipt.

## 2. Multi-axis rule

Every result MUST expose each evaluated axis independently.

An implementation MUST NOT infer:

- substantive truth from record or document integrity;
- identity from a mathematically valid signature;
- authority from resolved identity;
- independent time from a local timestamp claim;
- historical meaning from exact target identity;
- successful current preservation from historical registration conformance; or
- complete reconstruction from high retrieval quality.

An unavailable or partial axis MUST remain visible even if an optional summary is positive.

## 3. Result structure

```json
{
  "specification": {
    "standard": "DDT-VERIFICATION-RESULT",
    "version": "0.1.0-draft.1"
  },
  "resultCore": {
    "resultId": "verification-example-001",
    "target": {},
    "verifier": {},
    "verificationRequest": {},
    "axisRegistry": {},
    "reasonCodeRegistry": {},
    "artifactEvaluations": [],
    "axisResults": [],
    "summary": {},
    "evaluatedAtClaim": "2026-09-03T12:00:00Z"
  },
  "resultCoreHash": {},
  "proofs": []
}
```

## 4. Specification and result identity

`specification.standard` MUST be `DDT-VERIFICATION-RESULT` and `specification.version` MUST be `0.1.0-draft.1`.

`resultId` MUST uniquely identify one immutable verification execution result in the verifier's namespace.

Re-running verification creates a new result ID and artifact. A new result MUST NOT overwrite an older result, even when the same inputs are used.

## 5. Verification target

`target` MUST identify:

- `targetType`;
- `targetId`; and
- exact `targetCommitment`.

Base `targetType` values are:

- `DDT_RECORD`;
- `CONFORMANCE_RECEIPT`;
- `EVIDENCE_OBJECT`;
- `PRESERVATION_CONTRACT`;
- `ENTERPRISE_PROFILE`;
- `RENEWAL_EVENT`;
- `OFFLINE_PACKAGE`; or
- `PROFILE_DEFINED`.

For a DDT Record, `targetId` is the immutable `ddtRecordId` and `targetCommitment` is `recordHash`.

Target identification in the result is a verifier claim until its applicable identity/binding axes pass.

## 6. Verifier identification

`verifier` MUST contain:

- exact verifier implementation Artifact Reference;
- `executionId`;
- optional `operatorIdentityRef`; and
- `executionEnvironmentCommitment` when required by the verification profile.

Identifying verifier code supports reproduction but does not make that implementation authoritative. An independent implementation MAY evaluate the same target and produce a separate result.

## 7. Verification request and scope

`verificationRequest` MUST contain:

- `requestId`;
- `requiredAxes`;
- `optionalAxes`;
- `scopeProfile` Artifact Reference; and
- optional `reconstructionRequest`.

Every reported axis MUST be requested or be a profile-required dependency/diagnostic axis.

Every requested required axis MUST appear exactly once for each profile-required subject. Missing required coverage prevents a `PASS` summary.

### 7.1 Reconstruction request

Historical semantic resolution is meaningful only for a defined question/scope.

`reconstructionRequest` MUST identify:

- `reconstructionId`;
- `questionClass`;
- `subjectRefs`;
- exact `reconstructionProfile`; and
- required semantic dependency classes.

A verifier MUST NOT report `HISTORICAL_SEMANTIC_RESOLUTION = COMPLETE` without a defined reconstruction request.

## 8. Bound registries

The result MUST identify exact version-and-digest Artifact References for:

- `axisRegistry`; and
- `reasonCodeRegistry`.

The axis registry determines valid axes, status classes and status meanings. The reason-code registry determines stable machine-readable reasons.

A later unversioned registry MUST NOT reinterpret a historical result.

Profile-defined axes require a separately bound registry extension. Unknown required axes or statuses are not silently ignored.

## 9. Status classes

Each axis belongs to exactly one status class.

| Status class | Permitted statuses |
|---|---|
| `INTEGRITY` | `PASS`, `FAIL`, `UNAVAILABLE`, `NOT_EVALUATED` |
| `AVAILABILITY` | `AVAILABLE`, `UNAVAILABLE`, `NOT_REQUIRED`, `NOT_EVALUATED` |
| `BINDING` | `BOUND`, `UNBOUND`, `FAIL`, `UNAVAILABLE`, `UNRESOLVED`, `NOT_APPLICABLE`, `NOT_EVALUATED` |
| `CONFORMANCE` | `PASS`, `FAIL`, `INDETERMINATE`, `UNAVAILABLE`, `NOT_APPLICABLE`, `NOT_EVALUATED` |
| `VALIDITY` | `VALID`, `INVALID`, `UNAVAILABLE`, `UNRESOLVED`, `NOT_APPLICABLE`, `NOT_EVALUATED` |
| `RESOLUTION` | `VERIFIED`, `FAILED`, `UNAVAILABLE`, `UNRESOLVED`, `NOT_APPLICABLE`, `NOT_EVALUATED` |
| `LIFECYCLE` | `VALID`, `EXPIRED`, `SUSPENDED`, `REVOKED`, `COMPROMISED`, `UNAVAILABLE`, `UNRESOLVED`, `NOT_EVALUATED` |
| `TIME` | `ASSERTED`, `PROVEN`, `FAILED`, `UNAVAILABLE`, `UNRESOLVED`, `NOT_APPLICABLE`, `NOT_EVALUATED` |
| `REPRODUCTION` | `MATCH`, `MISMATCH`, `PARTIAL`, `UNAVAILABLE`, `INDETERMINATE`, `NOT_EVALUATED` |
| `SEMANTIC` | `COMPLETE`, `PARTIAL`, `AMBIGUOUS`, `UNKNOWN`, `UNAVAILABLE`, `FAIL`, `NOT_APPLICABLE`, `NOT_EVALUATED` |
| `PRESERVATION` | `PASS`, `FAIL`, `UNAVAILABLE`, `INDETERMINATE`, `NOT_APPLICABLE`, `NOT_EVALUATED` |
| `TRUTH_BOUNDARY` | `NOT_APPLICABLE` |

The literal status alone is insufficient without the axis ID and status class.

## 10. Base axis registry

### 10.1 Record, payload and evidence

| Axis ID | Status class |
|---|---|
| `DDT_RECORD_IDENTITY` | `RESOLUTION` |
| `DDT_RECORD_INTEGRITY` | `INTEGRITY` |
| `UPSTREAM_PAYLOAD_AVAILABILITY` | `AVAILABILITY` |
| `UPSTREAM_PAYLOAD_INTEGRITY` | `INTEGRITY` |
| `EVIDENCE_MANIFEST_IDENTITY` | `RESOLUTION` |
| `EVIDENCE_MANIFEST_INTEGRITY` | `INTEGRITY` |
| `EVIDENCE_MANIFEST_BOUND_TO_RECORD` | `BINDING` |
| `EVIDENCE_OBJECT_IDENTITY` | `RESOLUTION` |
| `EVIDENCE_REPRESENTATION_RESOLUTION` | `RESOLUTION` |
| `EVIDENCE_COMMITMENT_INTEGRITY` | `INTEGRITY` |
| `EVIDENCE_AVAILABILITY` | `AVAILABILITY` |
| `EVIDENCE_INTEGRITY` | `INTEGRITY` |
| `EVIDENCE_PROVENANCE` | `RESOLUTION` |
| `EVIDENCE_SIGNER_IDENTITY` | `RESOLUTION` |
| `EVIDENCE_SIGNER_AUTHORITY` | `RESOLUTION` |
| `EVIDENCE_TIME` | `TIME` |
| `EVIDENCE_PRESERVATION_OBLIGATION` | `PRESERVATION` |
| `SEMANTIC_DEPENDENCY_RESOLUTION` | `SEMANTIC` |

### 10.2 Relationships and continuity

| Axis ID | Status class |
|---|---|
| `HISTORICAL_TARGET_IDENTITY` | `BINDING` |
| `TARGET_COMMITMENT_BINDING` | `BINDING` |
| `FAMILY_CONTINUITY` | `INTEGRITY` |
| `RELATIONSHIP_ASSERTION_INTEGRITY` | `INTEGRITY` |
| `RELATIONSHIP_ASSERTION_AUTHORITY` | `RESOLUTION` |

### 10.3 Historical artifacts, profile and contract

| Axis ID | Status class |
|---|---|
| `SCHEMA_AVAILABILITY` | `AVAILABILITY` |
| `SCHEMA_INTEGRITY` | `INTEGRITY` |
| `ENTERPRISE_PROFILE_IDENTITY` | `RESOLUTION` |
| `ENTERPRISE_PROFILE_INTEGRITY` | `INTEGRITY` |
| `ENTERPRISE_PROFILE_BOUND_TO_CONTRACT` | `BINDING` |
| `ENTERPRISE_PROFILE_COMPATIBILITY` | `CONFORMANCE` |
| `ENTERPRISE_PROFILE_APPLICABILITY` | `RESOLUTION` |
| `PROFILE_ARTIFACT_AVAILABILITY` | `AVAILABILITY` |
| `PROFILE_ARTIFACT_INTEGRITY` | `INTEGRITY` |
| `PROFILE_RULE_EVALUATION` | `CONFORMANCE` |
| `OBLIGATION_MATERIALIZATION` | `CONFORMANCE` |
| `PROFILE_EXTENSION_RESOLUTION` | `RESOLUTION` |
| `PRESERVATION_CONTRACT_IDENTITY` | `RESOLUTION` |
| `PRESERVATION_CONTRACT_INTEGRITY` | `INTEGRITY` |
| `PRESERVATION_CONTRACT_BOUND_TO_RECORD` | `BINDING` |
| `PRESERVATION_CONTRACT_APPLICABILITY` | `RESOLUTION` |
| `CONTRACT_ARTIFACT_AVAILABILITY` | `AVAILABILITY` |
| `CONTRACT_ARTIFACT_INTEGRITY` | `INTEGRITY` |
| `REGISTRATION_CONFORMANCE` | `CONFORMANCE` |
| `CURRENT_PRESERVATION_OBLIGATION` | `PRESERVATION` |

### 10.4 Receipt and reproduction

| Axis ID | Status class |
|---|---|
| `CONFORMANCE_RECEIPT_IDENTITY` | `RESOLUTION` |
| `CONFORMANCE_RECEIPT_CORE_INTEGRITY` | `INTEGRITY` |
| `CONFORMANCE_RECEIPT_PROOF_VALIDITY` | `VALIDITY` |
| `RECEIPT_ISSUER_IDENTITY` | `RESOLUTION` |
| `RECEIPT_ISSUER_AUTHORITY` | `RESOLUTION` |
| `RECEIPT_RECORD_BINDING` | `BINDING` |
| `RECEIPT_CONTRACT_BINDING` | `BINDING` |
| `RECEIPT_REGISTRATION_STATEMENT_BINDING` | `BINDING` |
| `VALIDATION_INPUT_REPRODUCIBILITY` | `REPRODUCTION` |
| `RULE_RESULT_COVERAGE` | `CONFORMANCE` |
| `OVERALL_RESULT_DERIVATION` | `CONFORMANCE` |
| `CONFORMANCE_REPRODUCIBILITY` | `REPRODUCTION` |

### 10.5 Registration, signature, identity, authority and time

| Axis ID | Status class |
|---|---|
| `REGISTRATION_STATEMENT_INTEGRITY` | `INTEGRITY` |
| `REGISTRATION_SIGNATURE` | `VALIDITY` |
| `SIGNING_KEY_IDENTITY` | `RESOLUTION` |
| `SIGNING_KEY_LIFECYCLE` | `LIFECYCLE` |
| `REGISTRANT_IDENTITY` | `RESOLUTION` |
| `REGISTRANT_AUTHORITY` | `RESOLUTION` |
| `REGISTRATION_TIME_CLAIM` | `TIME` |
| `REGISTRATION_TIME_PROOF` | `TIME` |
| `REGISTRATION_MECHANISM_PROOF` | `VALIDITY` |
| `INDEPENDENT_PROVENANCE` | `RESOLUTION` |

### 10.6 Reconstruction, renewal and truth boundary

| Axis ID | Status class |
|---|---|
| `HISTORICAL_SEMANTIC_RESOLUTION` | `SEMANTIC` |
| `RENEWAL_RECORD_INTEGRITY` | `INTEGRITY` |
| `ORIGINAL_PROOF_INDEPENDENTLY_VERIFIABLE` | `VALIDITY` |
| `RENEWAL_VERIFICATION_ASSERTION_BOUND` | `BINDING` |
| `RENEWAL_SIGNATURE` | `VALIDITY` |
| `RENEWAL_TIME_PROOF` | `TIME` |
| `SUBSTANTIVE_TRUTH` | `TRUTH_BOUNDARY` |

## 11. Axis result structure

Each `axisResults` entry MUST contain:

- `axisId`;
- `statusClass`;
- `subject`;
- `requirement` — `REQUIRED`, `OPTIONAL` or `INFORMATIONAL`;
- `status` permitted for that axis/status class;
- `procedureProfile` Artifact Reference;
- `reasonCodes`;
- `evaluatedArtifactRefs`;
- `evidenceRefs`;
- `dependencies`; and
- optional non-normative `detail`.

`subject` identifies the exact object or sub-object evaluated. Multiple results for one axis are permitted only for different unambiguous subjects.

The tuple `(axisId, subject.type, subject.ref)` MUST be unique in one result.

Every result status MUST match the axis's registered status class. Unknown base-axis/status combinations are invalid.

## 12. Reasons, dependencies and evaluated artifacts

### 12.1 Reason codes

Every failure, limitation, unavailable, unresolved, indeterminate, ambiguous, unknown, revoked, suspended, expired or compromised result MUST contain at least one stable reason code.

A success result MAY contain reason codes describing verified conditions without changing its status.

Human-readable detail is non-normative and MUST NOT replace a code.

### 12.2 Dependencies

Each dependency identifies:

- another `axisResultRef`;
- whether the dependency was required; and
- the observed dependency status.

A result MUST NOT claim success if its registered semantics require a dependency that failed, is unavailable or unresolved.

Dependency references MUST be acyclic. A verifier MUST reject cyclic result dependencies.

### 12.3 Artifact evaluations

`artifactEvaluations` inventories exact artifacts used by this verification execution, their role, availability and integrity.

Axis results refer to entries by stable artifact-evaluation ID. This prevents mutable URLs or current schemas from silently replacing historical inputs.

## 13. Overall summary

A summary is OPTIONAL for consumers but, when present in the result artifact, MUST contain:

- `status` — `PASS`, `PASS_WITH_LIMITATIONS`, `FAIL` or `INDETERMINATE`;
- exact `derivationProfile` Artifact Reference;
- `requiredAxisResultRefs`;
- `limitingAxisResultRefs`;
- `failingAxisResultRefs`;
- `unresolvedAxisResultRefs`; and
- `reasonCodes`.

The derivation profile MUST define status classification and precedence.

At minimum:

- `FAIL` cannot hide any required failing result;
- `INDETERMINATE` applies when a required result is missing or cannot be determined and no higher-priority failure rule applies;
- `PASS_WITH_LIMITATIONS` requires all mandatory success conditions to pass while one or more explicitly non-fatal limitations remain; and
- `PASS` requires all mandatory conditions to pass with no limitation classified by the profile as summary-relevant.

`PASS_WITH_LIMITATIONS` MUST NOT be shortened or displayed as `PASS` without the limitation axes.

No summary status establishes substantive truth.

## 14. Evaluation-time claim

`evaluatedAtClaim` is the verifier's reported evaluation time. It is bound into the result core but is not independently proven unless a separate time proof validates an allowed target.

If no reliable clock value is available, the field MAY be omitted only when the scope profile permits it. The result must then expose the relevant time axis as unavailable or not evaluated.

## 15. Result integrity and proofs

### 15.1 Core hash

```text
resultCoreHash = SHA-256(UTF8(RFC8785-JCS(resultCore)))
```

The stored hash MUST equal the independently recomputed value.

### 15.2 Proofs

A published verification result MUST contain at least one proof over `resultCoreHash`.

Every proof MUST identify:

- `proofId`;
- `proofType`;
- exact proof-profile Artifact Reference;
- `verificationMethod`;
- `proofPurpose` equal to `VERIFICATION_RESULT_ATTESTATION`;
- signed object type `VERIFICATION_RESULT_CORE_HASH` and matching digest;
- `proofValue` or immutable `proofRef`; and
- optional `createdAtClaim`.

Proofs are sorted by `proofId`; duplicates are rejected.

A valid result proof does not prove that the verifier implementation was correct or authorized. Those claims remain separate.

## 16. Result immutability and comparison

The result artifact is immutable after publication.

A later verifier produces a new result and MAY link it to previous result IDs/hashes through an append-only comparison or reassessment artifact.

Disagreement between two verifiers MUST be reported as disagreement with exact inputs, profiles and reason codes. It MUST NOT cause either historical result to be silently rewritten.

## 17. Extension axes

A domain profile MAY add an axis only through an exact namespaced axis-registry extension that defines:

- axis ID;
- status class or exact status set;
- status meanings;
- success/failure/limitation classification;
- required dependencies;
- procedure profile; and
- summary behavior.

Extension axes MUST NOT redefine a base axis or reuse its ID with different semantics.

## 18. Required tests

Before candidate status, test at least:

1. each base axis with every permitted status;
2. rejection of an invalid status for an axis;
3. record integrity `PASS` with document availability `UNAVAILABLE`;
4. target binding `BOUND` with semantic resolution `PARTIAL`;
5. signature `VALID` with identity or authority `UNRESOLVED`;
6. registration time `ASSERTED` with time proof `UNAVAILABLE`;
7. registration conformance `PASS` with current preservation obligation `FAIL`;
8. loss after commitment versus insufficient preservation at registration;
9. required reason code missing for a limitation/failure;
10. missing required axis result;
11. duplicate subject/axis tuple;
12. cyclic axis dependencies;
13. artifact substitution at a mutable URL;
14. summary `PASS_WITH_LIMITATIONS` preserving all limitation axes;
15. summary attempting to hide a required failure;
16. historical semantic `COMPLETE` without a reconstruction request;
17. unknown required extension axis;
18. result-core tamper;
19. result-proof tamper; and
20. two independent verifiers producing a preserved mismatch.

## Appendix A — Integration requirements

The DDT Envelope, Preservation Contract, Enterprise Profile, Evidence Manifest, Conformance Receipt, Offline Package and Renewal Event specifications MUST reference this result model or an exact compatible successor by version and digest.

The reference verifier MUST emit this structure and enforce the registered axis/status mapping, reason-code rules, dependency acyclicity and summary derivation.

---

**End of DDT Verification Result and Axis Registry v0.1 Draft (`0.1.0-draft.1`)**
