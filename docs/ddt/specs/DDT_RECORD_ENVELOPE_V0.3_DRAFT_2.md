# DDT Record Envelope v0.3 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-ENVELOPE-0.3-DRAFT.2`  
**Version:** `0.3.0-draft.2`  
**Status:** DRAFT — not approved for production conformance claims  
**Date:** 2026-09-03  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`

## Document status

This document defines the proposed machine-readable structure and commitment rules for one DDT Record.

It is a clean successor candidate to the development work recorded in `DDT-ENVELOPE-0.2-DRAFT`. It does not modify the frozen `DDT-ENVELOPE-0.1` pilot baseline and does not make the v0.2 draft final.

This revision replaces the provisional embedded Evidence Manifest, Preservation Contract and Conformance Receipt shapes from Draft.1 with exact companion-artifact bindings. It remains a draft until the remaining proof profiles, reference implementations, fixtures and interoperability checks pass.

## 1. Purpose

The DDT Record Envelope preserves one immutable registered record and the exact commitments needed to verify:

- record identity;
- upstream content as presented;
- evidence dependencies and document commitments;
- historically applicable preservation rules;
- family and related-record links;
- registration statement and proof scope; and
- the boundary of what remains independently verifiable.

The envelope does not determine the substantive truth, legal validity or adequacy of upstream content.

## 2. Design changes from v0.2

This draft makes the following structural corrections and additions:

1. `ddtRecordId` explicitly identifies one immutable record; `ddtFamilyId` identifies the family.
2. Subject identity is namespace-scoped.
3. The full upstream object receives its own registered commitment.
4. The exact Evidence Manifest receives its own commitment.
5. The exact Preservation Contract receives its own commitment.
6. Both evidence and contract commitments participate in `recordHash`.
7. The record-level hash input is defined without hashing proof material created after the record commitment.
8. A separate Conformance Receipt binds `recordHash` to the validator result without circular hashing.
9. A registration statement binds `recordHash`, the Conformance Receipt, the registrant and the mechanism-specific registration claim.
10. Every signature proof identifies the exact signed object and proof profile.
11. Local time assertions and independent time proofs remain separate.
12. Pilot-specific Seven ROL fields are removed from the generic normative structure.
13. The embedded Evidence Manifest MUST conform to `DDT-EVIDENCE-MANIFEST-0.1-DRAFT.1` or an exact compatible successor bound by the historical Preservation Contract.
14. The embedded Preservation Contract MUST conform to `DDT-PRESERVATION-CONTRACT-0.1-DRAFT.1` or an exact compatible successor bound by the envelope schema and validation artifact set.
15. `verificationResultProfile`, contract applicability and structured materialized obligations are mandatory contract components.
16. The registration statement binds the complete Conformance Receipt commitment defined by `DDT-CONFORMANCE-RECEIPT-0.1-DRAFT.1`.
17. Verification output MUST conform to `DDT-VERIFICATION-RESULT-0.1-DRAFT.1` or an exact compatible successor selected by the historical contract.

## 3. Envelope layers

A DDT Record Envelope consists of the following logical layers:

1. `specification` — identifies this envelope format;
2. `identity` — identifies one immutable DDT Record, its family and scoped subject;
3. `upstream` — preserves attributed source content or an exact external-content commitment;
4. `evidenceManifest` — inventories evidence and historically load-bearing dependencies;
5. `preservationContract` — identifies the exact rules governing registration;
6. `relationships` — preserves predecessor and typed related-record assertions;
7. `commitments` — preserves deterministic commitments for the preceding layers and `recordHash`;
8. `registration` — binds the finalized record and conformance receipt to a registrant and registration mechanism.

The `registration` layer is not included directly in `recordHash`. It is separately protected by `registrationStatementHash` and its proof set.

## 4. Common data types

### 4.1 Digest

The v0.3 structural commitment profile uses:

```json
{
  "algorithm": "SHA-256",
  "value": "64-lowercase-hex-characters"
}
```

For all v0.3 structural commitments:

- `algorithm` MUST equal `SHA-256`;
- `value` MUST contain exactly 64 lowercase hexadecimal characters;
- no `0x` prefix is permitted; and
- the input bytes MUST be defined by the relevant section of this specification.

An Enterprise Profile MAY permit additional algorithms for external evidence objects, but the algorithm identifier and representation MUST be explicit and governed by the bound cryptographic profile.

### 4.2 Artifact Reference

A historically relevant specification/profile artifact is represented as:

```json
{
  "artifactId": "example-artifact-id",
  "version": "1.0.0",
  "digest": {
    "algorithm": "SHA-256",
    "value": "..."
  },
  "immutableRef": "https://example.org/specs/example/1.0.0",
  "mediaType": "application/schema+json"
}
```

Required fields:

- `artifactId`;
- `version`; and
- `digest`.

`immutableRef` SHOULD be present for independently retrievable artifacts. A reference is not considered immutable merely because its string does not change; the presented bytes MUST match `digest`.

`mediaType` SHOULD be present when representation affects parsing or verification.

### 4.3 Identifier rules

All normative identifiers MUST be non-empty UTF-8 strings and MUST obey the syntax and normalization rules of their applicable profile.

Identifier comparison MUST use the exact normalized value defined by that profile. Implementations MUST NOT apply undocumented case folding, whitespace trimming or Unicode normalization during verification.

### 4.4 Optional fields and `null`

If an optional value is unavailable, the member MUST be omitted unless a bound profile explicitly defines an allowed `null` semantic.

The generic v0.3 envelope schema does not use `null` to mean unknown, unavailable or not applicable.

A verifier reports those conditions in the Verification Result; it MUST NOT insert invented placeholder values into the historical record.

## 5. Top-level structure

The conceptual v0.3 envelope is:

```json
{
  "specification": {},
  "identity": {},
  "upstream": {},
  "evidenceManifest": {},
  "preservationContract": {},
  "relationships": {},
  "commitments": {},
  "registration": {}
}
```

All eight top-level members are REQUIRED for a production envelope.

The JSON Schema MUST set `additionalProperties` to `false` at every core structural object. Domain-specific content belongs inside the profile-governed upstream payload or a separately registered extension artifact, not as an unknown core field.

## 6. `specification`

The `specification` object is:

```json
{
  "standard": "DDT-RECORD-ENVELOPE",
  "version": "0.3.0-draft.2"
}
```

Both fields are REQUIRED and fixed for Draft.2.

The authoritative envelope JSON Schema is separately identified and bound inside `preservationContract.artifacts.envelopeSchema`.

If that schema resolves another schema or profile through `$ref` or an equivalent mechanism, every transitive normative dependency actually used MUST appear by exact Artifact Reference in the Conformance Receipt evaluated-artifact set and in any conforming Offline Verification Package. A verifier MUST NOT resolve an unversioned or changed current resource as a historical dependency. Missing exact dependency bytes make the affected historical validation or conformance reproduction `UNAVAILABLE` or `UNRESOLVED`; they do not authorize substitution.

## 7. `identity`

### 7.1 Structure

```json
{
  "ddtRecordId": "urn:ddt:record:example",
  "ddtFamilyId": "urn:ddt:family:example",
  "subject": {
    "namespace": "example-organization/case",
    "reference": "CASE-00042",
    "type": "case"
  },
  "recordType": "decision.approval",
  "displayId": "DDT-CASE-00042-003"
}
```

Required fields:

- `ddtRecordId`;
- `ddtFamilyId`;
- `subject.namespace`;
- `subject.reference`; and
- `recordType`.

Optional fields:

- `subject.type`;
- `displayId`.

### 7.2 Record identity

`ddtRecordId` MUST identify exactly one immutable DDT Record and MUST never be reused.

A profile MUST NOT derive `ddtRecordId` circularly from a `recordHash` input that already includes `ddtRecordId` unless a separate, fully specified non-circular pre-commitment construction is used.

### 7.3 Family identity

`ddtFamilyId` groups the intended chronological record family. It is not the identity of an individual DDT Record.

### 7.4 Subject identity

`subject.namespace` identifies the issuer/domain within which `subject.reference` is interpreted.

Two equal `subject.reference` strings in different namespaces MUST NOT be assumed to identify the same subject.

### 7.5 Display identifiers

`displayId` is optional and intended for human discovery. It participates in the `identity` object and therefore in `recordHash` when present.

It MUST NOT be used as the sole global collision-resistance or family-continuity mechanism.

## 8. `upstream`

### 8.1 Structure

```json
{
  "source": {
    "sourceId": "example-system",
    "sourceType": "SYSTEM",
    "sourceVersion": "4.2.1",
    "sourceRecordId": "DEC-8841"
  },
  "event": {
    "eventType": "DECISION_APPROVED",
    "eventTime": {
      "value": "2026-09-03T08:30:00Z",
      "basis": "SOURCE_ASSERTED",
      "sourceRef": "DEC-8841"
    },
    "actor": {
      "identityRef": "did:example:actor",
      "role": "approver",
      "authorityEvidenceRefs": ["evidence-authority-001"]
    },
    "semanticContextRefs": ["evidence-policy-007"]
  },
  "payload": {
    "mode": "EMBEDDED_JSON",
    "mediaType": "application/json",
    "content": {
      "decision": "approved"
    }
  }
}
```

### 8.2 Source

Required source fields:

- `source.sourceId`;
- `source.sourceType`.

Optional source fields:

- `source.sourceVersion`;
- `source.sourceRecordId`.

`sourceType` MUST be one of the values permitted by the Enterprise Profile. The base vocabulary is:

- `HUMAN`;
- `SYSTEM`;
- `DEVICE`;
- `SENSOR`;
- `MODEL`;
- `BLOCKCHAIN_NATIVE`;
- `VERIFIED_EXTERNAL`;
- `ORACLE`; or
- `OTHER`.

Source identification is an attributed upstream claim unless independently supported by a separate proof.

### 8.3 Event

`event.eventType` is REQUIRED and MUST be permitted by the Enterprise Profile.

`event.eventTime` is OPTIONAL. When present:

- `value` MUST be an RFC 3339 timestamp accepted by the bound profile;
- `basis` MUST equal `SOURCE_ASSERTED` in the generic v0.3 upstream layer; and
- `sourceRef` MAY identify the source field/object from which the value originated.

Presence of `eventTime` does not prove that the event occurred at that time.

### 8.4 Upstream actor

`event.actor` is OPTIONAL unless required by the Enterprise Profile.

An actor identity, role or authority reference remains an upstream assertion unless separately verified. `authorityEvidenceRefs` MUST refer to entries in `evidenceManifest` when present.

### 8.5 Semantic context

`semanticContextRefs` identifies historically load-bearing evidence entries such as:

- policy versions;
- rulebooks;
- framework definitions;
- model/code versions;
- external reference state; or
- authority state.

Every referenced identifier MUST resolve to exactly one `evidenceManifest.entries[].evidenceId`.

### 8.6 Payload modes

The base envelope supports two mutually exclusive modes.

**Embedded JSON**

```json
{
  "mode": "EMBEDDED_JSON",
  "mediaType": "application/json",
  "content": {}
}
```

`content` MAY contain any JSON value permitted by the Enterprise Profile. It MUST NOT contain non-finite numbers or other values incompatible with the bound canonicalization profile.

**External evidence**

```json
{
  "mode": "EXTERNAL_EVIDENCE",
  "mediaType": "application/pdf",
  "evidenceRef": "evidence-document-001"
}
```

`evidenceRef` MUST resolve to one Evidence Manifest entry. The external bytes are not part of the envelope, but their identifier, representation and exact commitment are committed through the Evidence Manifest.

An object MUST contain exactly the members allowed for its selected mode. It MUST NOT contain both `content` and `evidenceRef`.

## 9. `evidenceManifest`

### 9.1 Structure

```json
{
  "specification": {
    "standard": "DDT-EVIDENCE-MANIFEST",
    "version": "0.1.0-draft.1"
  },
  "manifestId": "evidence-manifest-example-001",
  "entries": [
    {
      "evidenceId": "evidence-policy-007",
      "role": "SEMANTIC_DEPENDENCY",
      "evidenceClass": "policy.version",
      "mediaType": "application/pdf",
      "representation": {},
      "commitment": {},
      "declaredIdentity": {},
      "custody": {},
      "confidentiality": {},
      "preservationObligationRefs": ["PROFILE-REQ-POLICY-001"],
      "provenance": {},
      "semanticScope": {},
      "relatedEvidence": []
    }
  ],
  "extensions": []
}
```

The complete object MUST conform to the exact Evidence Manifest specification and schema selected by the historical Preservation Contract. For Draft.2 testing, the required baseline is `DDT-EVIDENCE-MANIFEST-0.1-DRAFT.1`.

The envelope specification does not redefine or silently subset the Evidence Manifest. A validator MUST reject a provisional Draft.1 manifest shape that does not conform to the exact bound companion schema.

### 9.2 Manifest identity

`specification`, `manifestId`, `entries` and `extensions` are REQUIRED. `manifestId` is unique within the applicable DDT Record context.

An empty `entries` array is permitted only where the Enterprise Profile permits no associated evidence entries.

### 9.3 Evidence entry fields

Every evidence entry MUST include all fields required by the exact bound Evidence Manifest schema, including `evidenceId`, `role`, `evidenceClass`, `mediaType`, `representation`, `commitment`, `declaredIdentity`, `custody`, `confidentiality`, `preservationObligationRefs`, `provenance`, `semanticScope` and `relatedEvidence`.

`description` is optional and non-normative.

`evidenceId` values MUST be unique within the manifest.

### 9.4 Evidence roles

The base role vocabulary is:

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

An Enterprise Profile MAY restrict the vocabulary. `PROFILE_DEFINED` requires an exact versioned role-vocabulary artifact; undocumented free-text roles are forbidden.

### 9.5 Representation

`representation.mode` MUST identify the exact bytes or canonical form covered by the evidence commitment.

Base modes are:

- `RAW_BYTES`;
- `RFC8785_JCS`; or
- `PROFILE_DEFINED`.

For `PROFILE_DEFINED`, `representation.profile` is REQUIRED and MUST be an Artifact Reference.

The verifier MUST NOT normalize or transform evidence bytes using an undocumented procedure.

### 9.6 Evidence commitment

Every entry uses the exact `commitment` object defined by the Evidence Manifest companion specification. It identifies `commitmentType`, an exact commitment `profile`, the encoded `value` and its `encoding`.

For `RAW_BYTES`, the selected profile operates on the exact evidence byte sequence. For `RFC8785_JCS`, it operates on the UTF-8 encoding of the RFC 8785 serialization. For `PROFILE_DEFINED`, the exact representation profile defines the input formation.

The verifier MUST evaluate the named commitment profile and MUST NOT assume that every commitment is a public raw SHA-256 digest. A matching commitment proves representation matching under that profile, not substantive truth.

### 9.7 References and confidentiality

`custody` identifies the asserted custody mode and zero or more retrieval references. Retrieval references MUST NOT contain credentials, secret access tokens or private keys.

`confidentiality` is the structured object defined by the companion specification. It records classification, public-commitment risk, redaction permission and the exact disclosure profile where required.

The DDT commits these declarations but does not thereby prove custody, continuing availability or correct access-control enforcement. Those remain separate verification axes.

### 9.8 Deterministic ordering

`entries` MUST be sorted in ascending Unicode code-point order by normalized `evidenceId`.

A producer MUST reject duplicate or unsorted evidence identifiers before commitment formation.

## 10. `preservationContract`

### 10.1 Structure

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
  "validator": {
    "validatorId": "ddt-reference-validator",
    "version": "0.3.0",
    "digest": {
      "algorithm": "SHA-256",
      "value": "..."
    },
    "immutableRef": "https://example.org/validators/0.3.0"
  },
  "applicability": {
    "basis": "SIGNED_ASSIGNMENT",
    "evidenceRefs": ["evidence-contract-assignment-001"],
    "authorityProfile": {}
  },
  "obligations": [
    {
      "obligationId": "PROFILE-REQ-POLICY-001",
      "category": "EVIDENCE_AVAILABILITY",
      "targetRefs": ["evidence-policy-007"],
      "requirement": "REQUIRED",
      "temporalScope": {"mode": "INDEFINITE"},
      "failureCode": "REQUIRED_POLICY_UNAVAILABLE"
    }
  ]
}
```

The complete object MUST conform to the exact Preservation Contract specification and schema applicable to Draft.2. The baseline is `DDT-PRESERVATION-CONTRACT-0.1-DRAFT.1`.

The envelope MUST NOT accept the provisional Draft.1 `obligationRefs` structure as a substitute for materialized obligations.

### 10.2 Required artifacts

All eight artifact references shown above are REQUIRED for a production v0.3 contract, including `verificationResultProfile`.

If a relationship vocabulary is not used beyond the envelope's base vocabulary, the contract MUST still bind the applicable base vocabulary artifact rather than omit the field.

### 10.3 Validator identification

`validator` identifies the implementation that produced the registration-time Conformance Receipt.

It MUST include:

- `validatorId`;
- `version`; and
- `digest`.

`immutableRef` SHOULD identify independently retrievable exact bytes.

The validator implementation does not replace the normative contract artifacts. A later independent verifier MAY use another implementation and compare its result against the preserved receipt.

### 10.4 Applicability

`applicability` is REQUIRED and states why this exact contract was treated as governing the record. Its basis, evidence references and authority profile are committed facts, but contract binding and independently verified applicability remain separate verification axes.

Every applicability evidence reference MUST resolve to committed evidence or to an exact profile-permitted external proof. `REGISTRANT_ASSERTED` MUST NOT be reported as independently established applicability without additional valid evidence.

### 10.5 Materialized obligations

`obligations` is a deterministically sorted array of concrete per-record duties. Each obligation MUST preserve its stable `obligationId`, category, target references, requirement level, temporal scope and failure code.

An obligation produced from an Enterprise Profile rule or template MUST retain the originating stable identifier. The validator MUST NOT infer or silently regenerate historical obligations from a later profile version.

### 10.6 Contract ordering and commitment

The complete `preservationContract` object is canonicalized and committed as defined in Section 12.

Changing specification identity, any artifact digest/version/reference, validator value, applicability field or materialized obligation MUST change `preservationContractCommitment` and therefore `recordHash`.

## 11. `relationships`

### 11.1 Structure

```json
{
  "previousRecordInFamily": {
    "ddtRecordId": "urn:ddt:record:previous",
    "recordHash": {
      "algorithm": "SHA-256",
      "value": "..."
    }
  },
  "relatedRecords": [
    {
      "targetRecordId": "urn:ddt:record:target",
      "targetRecordHash": {
        "algorithm": "SHA-256",
        "value": "..."
      },
      "relationshipType": "REFERENCES",
      "assertedBy": {
        "layer": "UPSTREAM",
        "identityRef": "did:example:actor"
      },
      "evidenceRefs": ["evidence-document-001"]
    }
  ]
}
```

### 11.2 Genesis and predecessor

For a family genesis record, `previousRecordInFamily` MUST be omitted.

For every non-genesis family record, `previousRecordInFamily` is REQUIRED and MUST identify the immediately preceding DDT Record and its exact record commitment under the applicable family-ordering rules.

An empty or fabricated predecessor MUST NOT be inserted.

### 11.3 Related records

Each related-record entry MUST contain:

- `targetRecordId`;
- `targetRecordHash`; and
- `relationshipType`.

`assertedBy` and `evidenceRefs` are optional unless required by the Enterprise Profile.

`assertedBy.layer` MUST be `UPSTREAM` or `REGISTRANT`. It identifies the assertion layer and does not itself verify identity or authority.

Every `evidenceRefs` value MUST resolve to the Evidence Manifest.

### 11.4 Base relationship vocabulary

The base vocabulary is:

- `REFERENCES`;
- `RESPONDS_TO`;
- `DISPUTES`;
- `CORRECTS`;
- `REMEDIES`;
- `SUPERSEDES`;
- `REVERSES`;
- `REPLACES`;
- `DERIVED_FROM`;
- `CONFIRMS_ASSERTION`; or
- `CONTRADICTS_ASSERTION`.

The contract-bound relationship vocabulary defines exact semantics and permitted extensions.

### 11.5 Deterministic ordering

`relatedRecords` MUST be sorted by the tuple:

1. normalized `relationshipType`;
2. normalized `targetRecordId`;
3. lowercase `targetRecordHash.value`.

`evidenceRefs` MUST be unique and sorted in ascending Unicode code-point order.

Duplicate relationship tuples MUST be rejected.

### 11.6 Proof boundary

A valid related-record commitment proves which target identity, target commitment and relationship assertion were committed.

It does not prove that the asserted relationship is factually, legally or institutionally correct.

The predecessor link proves claimed structural family continuity, not semantic succession.

## 12. `commitments`

### 12.1 Structure

```json
{
  "registeredUpstreamCommitment": {
    "algorithm": "SHA-256",
    "value": "..."
  },
  "evidenceManifestCommitment": {
    "algorithm": "SHA-256",
    "value": "..."
  },
  "preservationContractCommitment": {
    "algorithm": "SHA-256",
    "value": "..."
  },
  "recordHash": {
    "algorithm": "SHA-256",
    "value": "..."
  }
}
```

All four commitments are REQUIRED.

### 12.2 Canonicalization baseline

The v0.3 structural commitment baseline is:

- canonicalization: RFC 8785 JSON Canonicalization Scheme;
- text encoding: UTF-8;
- hash algorithm: SHA-256;
- digest encoding: lowercase hexadecimal without prefix.

The exact canonicalization profile artifact MUST be bound in the Preservation Contract.

### 12.3 Upstream commitment

Compute:

```text
registeredUpstreamCommitment =
  SHA-256(UTF8(JCS(envelope.upstream)))
```

The value in `commitments.registeredUpstreamCommitment` is the commitment preserved at registration.

A later recomputed value belongs in the Verification Result and MUST NOT replace the registered value.

### 12.4 Evidence Manifest commitment

Compute:

```text
evidenceManifestCommitment =
  SHA-256(UTF8(JCS(envelope.evidenceManifest)))
```

### 12.5 Preservation Contract commitment

Compute:

```text
preservationContractCommitment =
  SHA-256(UTF8(JCS(envelope.preservationContract)))
```

### 12.6 Canonical `recordHash` input

The exact v0.3 record-level input is the following derived object:

```json
{
  "specification": {
    "standard": "DDT-RECORD-ENVELOPE",
    "version": "0.3.0-draft.2"
  },
  "identity": {},
  "registeredUpstreamCommitment": {
    "algorithm": "SHA-256",
    "value": "..."
  },
  "evidenceManifestCommitment": {
    "algorithm": "SHA-256",
    "value": "..."
  },
  "preservationContractCommitment": {
    "algorithm": "SHA-256",
    "value": "..."
  },
  "relationships": {}
}
```

Values MUST be copied exactly from:

- `envelope.specification`;
- `envelope.identity`;
- the first three registered commitments; and
- `envelope.relationships`.

Compute:

```text
recordHash = SHA-256(UTF8(JCS(canonicalRecordHashInput)))
```

### 12.7 Fields excluded from `recordHash`

The following are excluded from direct record-hash input:

- the `commitments` object as a whole;
- `commitments.recordHash`;
- the `registration` object;
- Conformance Receipt bytes;
- signature proof bytes;
- time-proof bytes;
- later verification results; and
- later renewal events.

The registered upstream, Evidence Manifest and Preservation Contract content are indirectly but cryptographically bound through their respective commitments.

Excluded proof-layer material MUST be bound by the proof construction defined in Sections 13–15 or by a separate append-only proof/renewal artifact.

### 12.8 Tamper behavior

A conforming verifier MUST independently recompute all four commitments.

Changing any committed source object without updating its registered commitment MUST fail that object's integrity axis.

Changing a registered subcommitment, identity or relationship without updating `recordHash` MUST fail record integrity.

Recalculating hashes after unauthorized modification does not create a valid registration proof because the registration statement and signatures remain bound to the original commitments.

## 13. Conformance Receipt binding

### 13.1 Separate artifact

The Conformance Receipt is a separate artifact produced after `recordHash` is finalized.

For Draft.2, the complete receipt MUST conform to `DDT-CONFORMANCE-RECEIPT-0.1-DRAFT.1`. The envelope does not define a second or reduced receipt structure.

The receipt MUST bind:

- `recordHash`;
- `preservationContractCommitment`;
- validator identity/version/digest;
- validation result and reason codes; and
- its own exact proof scope.

### 13.2 Non-circular construction

The receipt is not included in `recordHash`.

Instead, `conformanceReceiptCommitment` is computed exactly as defined by the bound Conformance Receipt specification over its `specification`, `receiptCore`, `receiptCoreHash` and deterministically ordered `proofs`. That commitment is included in the registration statement.

This order is REQUIRED:

```text
recordHash
  -> Conformance Receipt
  -> conformanceReceiptCommitment
  -> registration statement
  -> registrationStatementHash
  -> registration proofs/time proofs
```

### 13.3 Failed conformance

A successful production registration MUST NOT contain a receipt claiming `PASS` when mandatory validation requirements failed.

The receipt MUST preserve the exact validation input commitment, complete evaluated-artifact and evaluated-evidence sets, per-rule coverage, materialized-obligation origins, deterministic overall-result derivation and receipt proof scope required by its companion specification.

If a profile permits registration of an explicit rejected/failure event, that event MUST use its own record type and Preservation Contract. It MUST NOT masquerade as the rejected conforming record.

## 14. `registration`

### 14.1 Structure

```json
{
  "statement": {
    "recordHash": {
      "algorithm": "SHA-256",
      "value": "..."
    },
    "preservationContractCommitment": {
      "algorithm": "SHA-256",
      "value": "..."
    },
    "conformanceReceiptCommitment": {
      "algorithm": "SHA-256",
      "value": "..."
    },
    "registrant": {
      "identityRef": "did:example:registrar",
      "identityType": "ORGANIZATION_SERVICE",
      "authorityEvidenceRefs": ["evidence-authority-registrar"]
    },
    "registrationTimeClaim": "2026-09-03T08:31:00Z",
    "registrationMechanism": {
      "profile": {},
      "network": "example-network",
      "transactionRef": "example-transaction",
      "blockRef": "example-block"
    }
  },
  "registrationStatementHash": {
    "algorithm": "SHA-256",
    "value": "..."
  },
  "signatureProofs": [],
  "timeProofs": []
}
```

### 14.2 Statement bindings

The three commitment values in `statement` MUST exactly match:

- `commitments.recordHash`;
- `commitments.preservationContractCommitment`; and
- the independently recomputed Conformance Receipt commitment.

### 14.3 Registrant

`registrant.identityRef` and `registrant.identityType` are REQUIRED.

`authorityEvidenceRefs` is required when the Enterprise Profile requires proof of registration authority. Each reference MUST resolve to committed evidence or to another exact proof artifact identified by the applicable profile.

Presence of `identityRef` does not prove identity or authority without successful resolution of the applicable evidence.

### 14.4 Registration-time claim

`registrationTimeClaim` is OPTIONAL only where the registration profile permits its absence.

Presence of this field establishes an asserted value bound into the registration statement. It is not independently proven time unless a valid time proof supports the relevant statement/commitment.

### 14.5 Registration mechanism

`registrationMechanism.profile` is a REQUIRED Artifact Reference defining mechanism-specific semantics and validation rules.

`network`, `transactionRef` and `blockRef` are profile-dependent. A DDC blockchain registration profile MAY require all three. Their presence alone does not establish validity; the mechanism-specific verifier must confirm them.

### 14.6 Registration statement commitment

Compute:

```text
registrationStatementHash =
  SHA-256(UTF8(JCS(envelope.registration.statement)))
```

`registrationStatementHash` MUST be computed before signature or time proofs are added.

### 14.7 Immutability of registration package

Once registration is complete, the original `registration` object and proof set MUST NOT be modified.

A proof obtained later MUST be preserved as a separately identified append-only proof augmentation or renewal event. It MUST NOT be inserted retrospectively into the original envelope while retaining the same historical package identity.

## 15. Signature proofs

### 15.1 Structure

Each `signatureProofs` entry is:

```json
{
  "proofId": "registration-signature-001",
  "proofPurpose": "DDT_REGISTRATION",
  "proofProfile": {},
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
  "signature": "...",
  "createdAtClaim": "2026-09-03T08:31:00Z"
}
```

### 15.2 Required proof fields

Every signature proof MUST include:

- `proofId`;
- `proofPurpose`;
- `proofProfile`;
- `algorithm`;
- `verificationMethod`;
- `signedObject.type`;
- `signedObject.digest`;
- `signatureEncoding`; and
- `signature`.

`createdAtClaim` is optional and remains an assertion unless independently proven.

### 15.3 Signed object

For a registration signature, `signedObject.type` MUST equal `REGISTRATION_STATEMENT_HASH`, and the digest MUST equal `registration.registrationStatementHash`.

The bound proof profile MUST define the exact signing input, including domain separation and encoding. A verifier MUST NOT guess how a signature input was constructed.

### 15.4 Identity and authority boundary

A mathematically valid signature establishes only that the corresponding private key produced a valid proof over the defined signing input.

Key identity, registrant identity, key lifecycle, registrant authority and time MUST be evaluated separately.

### 15.5 Deterministic ordering

`signatureProofs` MUST be sorted in ascending Unicode code-point order by `proofId`, and duplicate proof identifiers MUST be rejected.

## 16. Time proofs

### 16.1 Structure

Each `timeProofs` entry is:

```json
{
  "proofId": "registration-time-proof-001",
  "proofType": "RFC3161",
  "proofProfile": {},
  "target": {
    "type": "REGISTRATION_STATEMENT_HASH",
    "digest": {
      "algorithm": "SHA-256",
      "value": "..."
    }
  },
  "proofRef": "https://example.org/proofs/time-proof-001.tsr",
  "assertedTime": "2026-09-03T08:31:05Z"
}
```

### 16.2 Required fields

Every time proof MUST include:

- `proofId`;
- `proofType`;
- `proofProfile`;
- `target.type`;
- `target.digest`; and
- at least one of `proofRef` or embedded `proof` as defined by the profile.

`assertedTime` MAY preserve a value reported by the proof source. The verifier assigns `PROVEN` only after validating the proof under its exact profile.

### 16.3 Preferred target

The preferred target is `registrationStatementHash` because it binds the record, contract, conformance receipt, registrant and registration claim.

A profile MAY permit `RECORD_HASH` or an aggregate/batch commitment. The proof package MUST then preserve an unambiguous cryptographic path from the anchored target to the DDT Record.

### 16.4 Deterministic ordering

`timeProofs` MUST be sorted in ascending Unicode code-point order by `proofId`, and duplicate proof identifiers MUST be rejected.

## 17. Validation procedure

A conforming registration validator MUST perform at least the following checks in the stated dependency order:

1. parse the envelope under the exact schema identified by the Preservation Contract;
2. reject unknown core fields and schema violations;
3. verify normalized identifier syntax and uniqueness constraints available to the validator;
4. verify Evidence Manifest uniqueness, references and ordering;
5. verify relationship references, duplicates and ordering;
6. verify Preservation Contract structure and artifact digests where artifacts are available;
7. validate upstream content/evidence requirements under the exact Enterprise Profile and rule set;
8. recompute `registeredUpstreamCommitment`;
9. recompute `evidenceManifestCommitment`;
10. recompute `preservationContractCommitment`;
11. reconstruct the canonical `recordHash` input and recompute `recordHash`;
12. produce and protect the Conformance Receipt;
13. recompute and bind `conformanceReceiptCommitment` in the registration statement;
14. verify statement bindings and recompute `registrationStatementHash`;
15. produce or verify the required registration signature set;
16. obtain or verify required time/registration-mechanism proofs; and
17. emit a result conforming to the exact `verificationResultProfile` bound by the Preservation Contract, without collapsing proof layers.

Steps that require later-produced artifacts MAY be completed by the appropriate registration component, but the final verification procedure MUST preserve the same dependency order and bindings.

## 18. Independent verification procedure

A conforming verifier MUST:

1. obtain the envelope, Conformance Receipt and required verification package;
2. resolve every historically bound artifact by exact digest;
3. validate the envelope with the historical schema;
4. recompute all four record commitments;
5. verify evidence objects that are presented and report unavailable objects separately;
6. verify target hashes and family continuity for records that are presented/resolvable;
7. verify the Conformance Receipt and reproduce validation where possible;
8. verify registration-statement binding and signature proofs;
9. resolve historical key identity, lifecycle and authority evidence under the applicable profiles;
10. verify time and registration-mechanism proofs independently;
11. evaluate current preservation obligations separately from registration conformance;
12. evaluate historical semantic resolution only for a defined reconstruction request; and
13. emit axis-specific statuses, reason codes, evaluated artifact digests and verifier metadata using the exact bound Verification Result/Axis Registry.

A verifier MUST NOT change the original envelope or receipt while recording a later result.

## 19. Verification boundaries

The following implications are prohibited:

```text
recordHash matches
  != source assertion is true

document hash matches
  != document is factually correct

signature verifies
  != signer identity is resolved

signer identity resolves
  != signer had authority

registrationTimeClaim exists
  != registration time is independently proven

target identity/hash is bound
  != every historical meaning of the target is recoverable

family predecessor verifies
  != later record supersedes earlier record

conformance passes
  != decision was good, legal or substantively correct
```

## 20. Privacy and disclosure

The envelope MUST NOT contain private keys, passwords, bearer tokens, API keys or access credentials.

An Evidence Manifest reference MUST NOT expose a secret solely to make an object retrievable.

Enterprise Profiles MUST evaluate whether a public raw digest of sensitive, predictable or low-entropy content enables guessing or correlation. Where necessary, they MUST select a safer commitment or disclosure mechanism.

Absence of confidential evidence bytes from a public package is permitted when the contract allows it. The verifier must then report the document/evidence availability and integrity axes accurately.

## 21. Compatibility with earlier DDT drafts

### 21.1 v0.1

Records formed under `DDT-ENVELOPE-0.1` remain historical v0.1 records and MUST be verified under the v0.1 rules and limitations.

They MUST NOT be rewritten into v0.3 while retaining the same record identity.

### 21.2 v0.2

`DDT-ENVELOPE-0.2-DRAFT` remains a development source, not a final production format.

This v0.3 draft changes the commitment boundary by adding explicit Evidence Manifest and Preservation Contract commitments and by defining a non-circular registration statement/receipt sequence.

An implementation MUST NOT claim that a v0.2 record automatically conforms to v0.3 without a separately identified migration/re-attestation event and successful verification of available historical evidence.

### 21.3 Legacy event schemas

Legacy `DDC-EVENT-*` objects MAY be preserved inside `upstream.payload.content` or referenced as external evidence.

Legacy validation and truth-score fields remain attributed upstream/evaluator assertions. They do not become DDC proof axes merely because they are embedded in a DDT Record.

## 22. Conformance requirements

A v0.3 envelope implementation claiming conformance to this draft MUST:

- implement the exact JSON Schema associated with this draft;
- reject unknown core properties;
- implement the exact commitment constructions in Section 12;
- preserve the non-circular sequence in Section 13;
- implement registration statement and proof-scope binding;
- enforce deterministic collection ordering;
- preserve missing values without invention;
- support exact historical artifact identification by digest;
- validate the complete companion Evidence Manifest and Preservation Contract structures;
- use the exact Conformance Receipt commitment and proof scope;
- emit multi-axis verification results under the exact contract-bound Verification Result Profile; and
- pass the normative positive and tampered fixtures.

Because this document is a draft, such a claim MUST be expressed as `implements DDT-ENVELOPE-0.3-DRAFT.2 for testing` and MUST NOT be expressed as final production conformance.

## 23. Required fixtures before candidate status

At minimum:

1. valid embedded JSON payload;
2. valid external confidential document commitment;
3. upstream payload tamper;
4. Evidence Manifest entry/commitment tamper;
5. Preservation Contract artifact/version tamper;
6. identity and subject-namespace tamper;
7. predecessor substitution and missing predecessor;
8. target identity/hash/relationship-type tamper;
9. unsorted and duplicate collection rejection;
10. Conformance Receipt substitution;
11. registration statement substitution;
12. registration signature tamper;
13. unresolved key identity and revoked-key historical-state cases;
14. missing and invalid external time proof;
15. required missing evidence versus non-required missing context;
16. historical profile v1.0 verification after profile v1.1 publication;
17. offline verification with all DDC-operated services unavailable;
18. cross-language RFC 8785 commitment reproduction;
19. `CASE-HTB-01`, `CASE-HSR-01A`, `CASE-HSR-01B`, `CASE-PCR-01`; and
20. a v0.3-aligned cryptographic-renewal case derived from `CASE-CRR-01`.

## Appendix A — Canonical commitment summary

```text
U = SHA-256(UTF8(JCS(upstream)))
E = SHA-256(UTF8(JCS(evidenceManifest)))
P = SHA-256(UTF8(JCS(preservationContract)))

R_input = {
  specification,
  identity,
  registeredUpstreamCommitment: U,
  evidenceManifestCommitment: E,
  preservationContractCommitment: P,
  relationships
}

R = SHA-256(UTF8(JCS(R_input)))

C = SHA-256(Conformance Receipt commitment input defined by its specification)

S_input = {
  recordHash: R,
  preservationContractCommitment: P,
  conformanceReceiptCommitment: C,
  registrant,
  registrationTimeClaim if present,
  registrationMechanism
}

S = SHA-256(UTF8(JCS(S_input)))

Registration signatures sign the exact profile-defined signing input for S.
Independent time proofs bind S, R or a verifiable aggregate containing the permitted target.
```

## Appendix B — Open items before freeze

Draft.2 integrates the current Preservation Contract, Enterprise Profile, Evidence Manifest, Conformance Receipt and Verification Result companion drafts. They remain non-final until their fixtures pass.

The following work is still required before freeze:

1. final identifier syntax/construction and collision-handling profile;
2. immutable artifact publication and dependency-resolution policy;
3. final canonicalization, commitment, registration-signature and proof profiles;
4. historical identity, authority and key-lifecycle profiles;
5. independent time, checkpoint, sequence-gap and history-completeness profiles;
6. append-only proof-augmentation structure;
7. governed relationship-vocabulary artifact;
8. offline package manifest/signature and artifact-resolution profile;
9. v0.3 cryptographic-renewal event specification;
10. migration and backward-verification procedure;
11. reference producer, validator and independent verifier;
12. all required positive, tampered, historical and cross-implementation fixtures; and
13. resolution of every remaining companion-draft review finding.

---

**End of DDT Record Envelope v0.3 Draft.2 (`0.3.0-draft.2`)**
