# DDT Evidence Manifest v0.1 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-EVIDENCE-MANIFEST-0.1-DRAFT.1`  
**Version:** `0.1.0-draft.1`  
**Status:** DRAFT — not approved for production conformance claims  
**Date:** 2026-09-03  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`

## 1. Purpose

A DDT Evidence Manifest is the deterministic inventory of documents, structured objects, logs, measurements, approvals, policies, models, code, authority material and other evidence associated with one DDT Record.

It allows DDC to bind evidence identity and verification material without becoming a warehouse for confidential documents or business secrets.

The manifest enables a later verifier to distinguish:

1. which evidence object was referenced;
2. what exact representation was committed;
3. which commitment mechanism was used;
4. whether the evidence bytes were available for a particular verification;
5. whether available bytes match the commitment;
6. whether continuing availability was historically required;
7. whether the object was historically load-bearing for semantic reconstruction; and
8. what remains unavailable, unresolved or outside the original preservation contract.

## 2. Core boundary

The Evidence Manifest records evidence claims, references and commitments. It does not establish that the evidence is substantively true, complete, legally valid or authoritative.

Evidence bytes MAY remain in owner-controlled or enterprise-controlled storage.

The public DDT package MUST NOT contain credentials, private keys, passwords, bearer tokens, API keys or secret access material.

A missing off-chain object does not automatically make the DDT Record corrupt. Record integrity, evidence availability, evidence integrity and preservation-obligation compliance are separate axes.

## 3. Manifest structure

```json
{
  "specification": {
    "standard": "DDT-EVIDENCE-MANIFEST",
    "version": "0.1.0-draft.1"
  },
  "manifestId": "evidence-manifest-example-001",
  "entries": [],
  "extensions": []
}
```

## 4. Specification and identity

### 4.1 `specification`

For this draft:

```json
{
  "standard": "DDT-EVIDENCE-MANIFEST",
  "version": "0.1.0-draft.1"
}
```

Both fields are REQUIRED and fixed.

### 4.2 `manifestId`

`manifestId` is REQUIRED and unique within the applicable DDT Record context.

A manifest committed by a registered DDT MUST NOT be modified. A later evidence inventory or availability observation is a new append-only artifact or DDT event; it is not an edit to the historical manifest.

### 4.3 Empty manifest

An empty `entries` array is permitted only if the exact Enterprise Profile and Preservation Contract permit a record with no evidence entries.

Schema validity alone does not establish that an empty manifest is conformant.

## 5. Evidence entry

Every entry MUST contain:

- `evidenceId`;
- `role`;
- `evidenceClass`;
- `mediaType`;
- `representation`;
- `commitment`;
- `declaredIdentity`;
- `custody`;
- `confidentiality`;
- `preservationObligationRefs`;
- `provenance`;
- `semanticScope`; and
- `relatedEvidence`.

`description` is optional and non-normative.

`evidenceId` MUST be unique within the manifest and MUST resolve one exact entry.

The entry MUST NOT embed the evidence bytes themselves. A domain-specific envelope may separately embed a permitted upstream JSON payload, but the Evidence Manifest remains an inventory and commitment layer.

## 6. Evidence roles and classes

### 6.1 Base roles

`role` MUST be one of:

- `SOURCE_PAYLOAD`;
- `SUPPORTING_EVIDENCE`;
- `SEMANTIC_DEPENDENCY`;
- `POLICY_OR_RULEBOOK`;
- `FRAMEWORK_OR_DEFINITION`;
- `AUTHORITY_EVIDENCE`;
- `IDENTITY_OR_KEY_EVIDENCE`;
- `PROVENANCE_EVIDENCE`;
- `TIME_OR_ORDERING_EVIDENCE`;
- `VALIDATION_ARTIFACT`; or
- `PROFILE_DEFINED`.

`PROFILE_DEFINED` requires an exact role-vocabulary Artifact Reference in the Enterprise Profile and Preservation Contract.

### 6.2 Evidence class

`evidenceClass` is a stable machine-readable class defined by the exact Enterprise Profile or evidence vocabulary.

Examples include an approval decision, sensor batch, policy version, model build, authority credential or source document. These examples are not a universal business vocabulary.

Equal class labels from different domains MUST be interpreted only within their bound profile namespace.

## 7. Media type and representation

### 7.1 Media type

`mediaType` identifies the committed representation's media type. It MUST be a non-empty registered or profile-defined media-type string.

### 7.2 Representation modes

`representation.mode` MUST be:

- `RAW_BYTES`;
- `RFC8785_JCS`; or
- `PROFILE_DEFINED`.

For `RAW_BYTES`, the commitment input is the exact byte sequence with no newline, encoding, metadata or normalization changes.

For `RFC8785_JCS`, the evidence MUST be JSON compatible with RFC 8785; the commitment input is the UTF-8 encoding of its JCS serialization.

For `PROFILE_DEFINED`, `representation.profile` is REQUIRED and MUST identify the exact transformation/canonicalization artifact by version and digest.

`representation.byteLength` MAY record the length of the resulting committed byte sequence. If present, mismatch is a representation/integrity failure.

A verifier MUST NOT guess a missing transformation procedure.

## 8. Evidence commitment

### 8.1 Commitment object

`commitment` MUST contain:

- `commitmentType`;
- exact `profile` Artifact Reference;
- `value`; and
- `encoding`.

Base `commitmentType` values are:

- `DIGEST`;
- `RANDOMIZED_COMMITMENT`;
- `KEYED_COMMITMENT`;
- `ZERO_KNOWLEDGE_PROOF_COMMITMENT`; or
- `PROFILE_DEFINED`.

The commitment profile defines algorithm, parameters, domain separation, input formation and verification/disclosure procedure.

### 8.2 Encoding

`encoding` MUST be:

- `LOWERCASE_HEX`;
- `BASE64URL`;
- `MULTIBASE`; or
- `PROFILE_DEFINED`.

The value MUST conform to the selected profile and encoding. Generic schema syntax does not replace algorithm-specific validation.

### 8.3 Raw digest risk

A public raw digest may enable dictionary guessing, correlation or linkability for predictable, low-entropy or sensitive content.

The Enterprise Profile MUST decide whether a raw digest is allowed. Where unsafe, it MUST select a commitment profile that preserves the intended later verification or disclosure property without exposing the underlying content.

A keyed commitment is not independently verifiable unless the profile defines how authorized later verification can occur and what happens if key material becomes unavailable.

### 8.4 Commitment is not truth

A matching commitment proves that presented input matches the committed representation under the selected method. It does not prove the evidence statement is true, complete, lawfully obtained or authoritative.

## 9. Declared external identity and version

`declaredIdentity` MUST contain:

- `namespace`; and
- `objectId`.

It MAY contain:

- `objectVersion`;
- `issuerRef`; and
- `versionEvidenceRefs`.

These values preserve the identity/version asserted for the external object. Exact byte identity is established by the commitment, not by a mutable filename, URL or version label alone.

If historical meaning depends on the external version designation, the Enterprise Profile MUST require corresponding version evidence or a version-bound semantic dependency.

## 10. Custody and retrieval references

### 10.1 Custody

`custody.mode` MUST be:

- `OWNER_CONTROLLED`;
- `ENTERPRISE_CONTROLLED`;
- `THIRD_PARTY_REPOSITORY`;
- `PUBLIC_IMMUTABLE_REPOSITORY`;
- `DISTRIBUTED_CONTENT_ADDRESSING`; or
- `PROFILE_DEFINED`.

`custodianRef` MAY identify the asserted custodian. It does not prove custody, availability or authority without supporting evidence.

### 10.2 Retrieval reference

Each retrieval reference MUST contain:

- `referenceId`;
- `referenceType`;
- `value`;
- `accessMode`; and
- `immutable`.

Base `referenceType` values are:

- `IMMUTABLE_URI`;
- `CONTENT_ADDRESS`;
- `OWNER_CONTROLLED_REFERENCE`;
- `PUBLICATION_REFERENCE`; or
- `PROFILE_DEFINED`.

`accessMode` MUST be `PUBLIC`, `AUTHORIZED_REQUEST`, `PRIVATE_RESOLUTION` or `PROFILE_DEFINED`.

The reference value MUST NOT contain embedded credentials or secret tokens.

A mutable location is a discovery aid, not evidence identity. A verifier uses the evidence commitment to determine whether retrieved bytes are the committed object.

### 10.3 No reference

An empty retrieval-reference array is permitted only when the historical Enterprise Profile/Preservation Contract permits owner-mediated or later-presented evidence without a preserved locator.

Lack of a public locator MUST NOT be reported as lack of a commitment.

## 11. Confidentiality

`confidentiality` MUST contain:

- `classification`;
- `publicCommitmentRisk`;
- `disclosureProfile` when required; and
- `redactionPermitted`.

`classification` MUST be `PUBLIC`, `RESTRICTED`, `CONFIDENTIAL`, `SECRET` or `PROFILE_DEFINED`.

`publicCommitmentRisk` MUST be `LOW`, `REVIEWED`, `HIGH` or `UNRESOLVED`.

A classification is an asserted/profile-evaluated label. Its presence does not prove that actual access control, retention, erasure or legal compliance is correct.

If redaction is permitted, the profile MUST define whether a redacted derivative has its own evidence ID and commitment and how it relates to the original. A redacted object MUST NOT verify against the original object's commitment unless the selected proof profile explicitly proves that relationship.

## 12. Preservation obligations

`preservationObligationRefs` contains unique identifiers of concrete obligations in the bound Preservation Contract that govern this evidence entry.

Examples include:

- presentation at registration;
- availability on authorized request;
- retention until a defined time;
- indefinite archival;
- preservation as a historical semantic dependency; or
- confidentiality/disclosure control.

The Evidence Manifest records which obligations point to the object. The Preservation Contract defines their normative requirement and temporal scope.

If the array is empty, a later verifier MUST NOT invent a continuing preservation duty solely because the evidence entry exists. Other profile rules may still have applied at registration and must be evaluated through the historical contract/receipt.

## 13. Provenance claims

`provenance` MUST contain:

- `assertedBy`;
- `sourceSystemRef` when known;
- `capturedAtClaim` when reported;
- `signatureProofRefs`; and
- `authorityEvidenceRefs`.

Missing optional source or time data remains explicit; it is not inferred.

`capturedAtClaim` is an asserted value, not independent time proof.

Proof references MUST resolve to committed evidence/proof artifacts under the applicable profile. A valid signature, identity and authority remain separate results.

## 14. Historical semantic scope

`semanticScope` MUST contain:

- `historicallyLoadBearing`;
- `dependencyClass` when load-bearing;
- `reconstructionScopes`; and
- `unresolvedResult`.

When `historicallyLoadBearing` is `true`, `dependencyClass` and at least one reconstruction scope are REQUIRED.

`unresolvedResult` MUST be `PARTIAL`, `AMBIGUOUS`, `UNKNOWN`, `UNAVAILABLE`, `FAIL` or `NOT_APPLICABLE`.

`FAIL` is valid only when the historical Preservation Contract required preservation/verification and that requirement failed. If semantic context was outside the historical contract, incomplete reconstruction may legitimately be `PARTIAL`, `AMBIGUOUS`, `UNKNOWN` or `UNAVAILABLE` while record integrity remains `PASS`.

## 15. Related evidence

An evidence relationship entry MUST contain:

- `relationshipType`;
- `targetEvidenceId`;
- optional `targetCommitment`; and
- optional `evidenceRefs` supporting the relationship assertion.

The relationship MUST be interpreted under the exact relationship vocabulary bound by the Preservation Contract.

An internal evidence relationship commitment proves that the relationship assertion was preserved. It does not by itself prove substantive correctness.

Corrections, derivatives, redactions and later versions SHOULD use explicit typed relationships. Chronological order alone does not imply replacement or correction.

## 16. Deterministic ordering

Before commitment:

- `entries` MUST be sorted by `evidenceId`;
- each entry's retrieval references MUST be sorted by `referenceId`;
- `preservationObligationRefs`, provenance proof/evidence references and reconstruction scopes MUST be unique and sorted;
- related evidence MUST be sorted by `relationshipType`, then `targetEvidenceId`; and
- extension blocks MUST be sorted by namespace.

All ordering uses ascending Unicode code-point order after profile-defined identifier normalization.

Duplicate identifiers or unsorted committed arrays MUST be rejected.

## 17. Manifest commitment

For the DDT Envelope v0.3 baseline:

```text
evidenceManifestCommitment =
  SHA-256(UTF8(RFC8785-JCS(evidenceManifest)))
```

The complete manifest, including `specification` and extensions, participates in this commitment.

`evidenceManifestCommitment` MUST participate in `recordHash`.

Changing an evidence ID, representation, commitment, role, class, reference, confidentiality state, obligation reference, provenance claim, semantic scope or related-evidence assertion changes the manifest commitment.

## 18. Registration-time and later verification

### 18.1 Registration-time validation

The validator evaluates the exact profile/contract requirements and records evidence availability/integrity results in the Conformance Receipt.

The Evidence Manifest itself MUST NOT be rewritten to contain the validator's outcome.

### 18.2 Later presentation

When previously withheld evidence bytes are later presented, the verifier:

1. resolves the historical representation and commitment profiles;
2. reconstructs the commitment input;
3. verifies the presented bytes;
4. reports current evidence availability and integrity; and
5. evaluates current preservation obligations separately.

A later successful presentation does not prove that the bytes were available at registration unless the historical receipt/proof supports that claim.

### 18.3 Later loss or alteration

If evidence required to remain available is later missing:

```text
DDT_RECORD_INTEGRITY = PASS
EVIDENCE_AVAILABILITY = UNAVAILABLE
CURRENT_PRESERVATION_OBLIGATION = FAIL
```

may be correct.

If presented bytes differ:

```text
DDT_RECORD_INTEGRITY = PASS
EVIDENCE_AVAILABILITY = AVAILABLE
EVIDENCE_INTEGRITY = FAIL
```

may be correct.

## 19. Extensions

Extensions are an ordered array of:

- globally scoped `namespace`;
- exact `schema` Artifact Reference; and
- extension `value`.

An extension MUST NOT redefine base fields or verification meanings.

A required extension schema that is unavailable or fails integrity produces a separate artifact/extension result and prevents conformant validation where the historical contract required it.

## 20. Required verification axes

Evidence verification MUST expose at least:

- `EVIDENCE_MANIFEST_IDENTITY`;
- `EVIDENCE_MANIFEST_INTEGRITY`;
- `EVIDENCE_MANIFEST_BOUND_TO_RECORD`;
- `EVIDENCE_OBJECT_IDENTITY`;
- `EVIDENCE_REPRESENTATION_RESOLUTION`;
- `EVIDENCE_COMMITMENT_INTEGRITY`;
- `EVIDENCE_AVAILABILITY`;
- `EVIDENCE_INTEGRITY`;
- `EVIDENCE_PROVENANCE`;
- `EVIDENCE_SIGNER_IDENTITY`;
- `EVIDENCE_SIGNER_AUTHORITY`;
- `EVIDENCE_TIME`;
- `EVIDENCE_PRESERVATION_OBLIGATION`; and
- `SEMANTIC_DEPENDENCY_RESOLUTION`.

Success or failure in one axis MUST NOT silently determine another.

## 21. Required test families

Before candidate status, test at least:

1. public raw-byte evidence that matches its commitment;
2. JSON evidence under RFC 8785 JCS;
3. profile-defined representation available and unavailable;
4. owner-controlled confidential document withheld at registration as permitted;
5. withheld document later presented and successfully verified;
6. altered evidence bytes;
7. missing evidence required at registration;
8. evidence not required to remain available;
9. required evidence lost after successful registration;
10. low-entropy confidential evidence under raw-digest rejection policy;
11. randomized/keyed commitment with and without required verification material;
12. mutable retrieval location returning substituted bytes;
13. external version label changed while committed bytes remain exact;
14. historically load-bearing dependency unavailable;
15. non-required historical context unavailable with semantic result `PARTIAL`;
16. redacted derivative incorrectly presented as the original;
17. duplicate/unsorted evidence IDs and references;
18. unknown required extension schema;
19. manifest field tamper changing `recordHash`; and
20. availability observation appended without rewriting the original manifest.

## Appendix A — Integration changes for Envelope v0.3 Draft.2

The next DDT Envelope v0.3 revision MUST:

1. replace its provisional Evidence Manifest entry with the structure defined here;
2. include the complete Evidence Manifest commitment in `recordHash`;
3. require exact evidence/commitment/representation profile references through the Preservation Contract;
4. remove any implication that a public raw SHA-256 digest is universally safe;
5. use the Conformance Receipt for registration-time evidence results; and
6. expose later availability, integrity and preservation-obligation results separately.

---

**End of DDT Evidence Manifest v0.1 Draft (`0.1.0-draft.1`)**
