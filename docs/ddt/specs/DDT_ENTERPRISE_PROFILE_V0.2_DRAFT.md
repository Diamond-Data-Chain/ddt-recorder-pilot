# DDT Enterprise Profile v0.2 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-ENTERPRISE-PROFILE-0.2-DRAFT.1`  
**Version:** `0.2.0-draft.1`  
**Status:** DRAFT — not approved for production conformance claims  
**Date:** 2026-09-10  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`

## 1. Purpose

A DDT Enterprise Profile specializes the generic DDT architecture for a defined operational domain without changing the meaning of core DDT fields, commitments or verification axes.

Profiles allow AI governance, manufacturing, transport, energy, healthcare and other domains to require different payload fields, evidence classes, authority rules, relationship types, time proofs, privacy controls and preservation obligations.

An Enterprise Profile is a versioned normative artifact. It is not a mutable organization setting, an application screen or a free-text policy document.

## 2. Boundary between profile, contract and record

The three layers MUST remain separate:

1. **Enterprise Profile** — defines domain rules and permitted/required structures for a class of registrations;
2. **Preservation Contract** — identifies the exact historical artifacts and materializes the obligations applicable to one registration; and
3. **DDT Record** — preserves the presented upstream data, evidence commitments, relationships and registration proof for one immutable record.

A profile rule does not become historical evidence merely because it appears in a current profile. The exact profile bytes and their applicability MUST be bound through the Preservation Contract used at registration.

## 3. Non-negotiable core semantics

An Enterprise Profile MUST NOT:

- redefine one `ddtRecordId` to identify more than one immutable record;
- permit mutation or deletion of a registered DDT Record;
- collapse `ddtRecordId` and `ddtFamilyId`;
- treat a later record as a correction, replacement, reversal or supersession without an explicit typed relationship;
- convert an upstream assertion into a DDC truth judgment;
- treat a valid signature as automatic proof of identity, authority, time or substantive truth;
- treat current profile rules as retroactively applicable to earlier records;
- require DDC to store confidential evidence bytes merely to preserve their commitment;
- collapse record integrity, evidence availability, evidence integrity, conformance, authority, time and semantic reconstruction into one verdict; or
- weaken requirements imposed by the bound core DDT specification.

Any profile containing such a rule is non-conformant.

## 4. Profile structure

The proposed structure is:

```json
{
  "specification": {
    "standard": "DDT-ENTERPRISE-PROFILE",
    "version": "0.2.0-draft.1"
  },
  "profileId": "example.ai.decision",
  "profileVersion": "1.0.0",
  "lifecycle": {},
  "domain": {},
  "compatibility": {},
  "payload": {},
  "requirements": {},
  "governance": {},
  "registration": {},
  "privacy": {},
  "obligationTemplates": [],
  "extensions": []
}
```

## 5. Specification and profile identity

### 5.1 `specification`

For this draft:

```json
{
  "standard": "DDT-ENTERPRISE-PROFILE",
  "version": "0.2.0-draft.1"
}
```

Both fields are REQUIRED and fixed.

### 5.2 Profile identity

`profileId` and `profileVersion` are REQUIRED.

`profileId` identifies the logical profile series. `profileVersion` identifies the declared version within that series.

Identity and version labels do not establish exact bytes. Every use of a profile in a Preservation Contract MUST include its digest.

One profile identifier/version pair MUST identify one exact byte sequence. A changed normative byte requires a new profile version and new digest.

## 6. Lifecycle

`lifecycle` MUST contain:

- `status` — `DRAFT`, `CANDIDATE`, `ACTIVE`, `RETIRED` or `SUPERSEDED`;
- `issuedAtClaim` — optional claimed publication time;
- `effectiveFromClaim` — optional claimed beginning of applicability;
- `effectiveUntilClaim` — optional claimed end of applicability;
- `predecessor` — optional exact Artifact Reference; and
- `governanceEvidenceRefs` — zero or more identifiers for evidence supporting publication, activation, retirement or supersession.

Lifecycle timestamps are assertions until verified through the applicable governance/time proof.

`ACTIVE` in the presented bytes proves only the stored profile state. Historical applicability to a particular registration is evaluated separately under the Preservation Contract.

Retirement or supersession affects new registrations according to the applicable governance rules. It MUST NOT invalidate or redefine a historical DDT that correctly bound an earlier profile.

## 7. Domain scope

`domain` MUST contain:

- `namespace` — stable collision-resistant domain namespace;
- `name` — human-readable domain name;
- `recordTypes` — non-empty set of record types governed by the profile;
- `subjectNamespaces` — non-empty set of permitted subject-reference namespaces;
- `sourceTypes` — non-empty set of permitted Draft.5 `upstream.source.sourceType` values;
- `eventTypes` — non-empty set of permitted Draft.5 `upstream.event.eventType` values; and
- optional `jurisdictionScopes` and `organizationScopes`.

The scope MUST be machine-evaluable. A human description MAY supplement it but MUST NOT be the only scope definition.

A validator MUST reject a record when its `identity.recordType`, `identity.subject.namespace`, `upstream.source.sourceType` or `upstream.event.eventType` is outside the corresponding bound profile scope.

`sourceTypes` MUST use values from the base source-type vocabulary defined by the bound DDT Record Envelope specification. `eventTypes` are profile-defined stable identifiers. A domain-specific payload field also named `eventType` does not substitute for the Draft.5 `upstream.event.eventType` scope.

## 8. Compatibility

`compatibility` identifies exact specification families with which the profile is designed to operate.

It MUST contain non-empty Artifact Reference arrays for:

- `envelopeSpecifications`;
- `preservationContractSpecifications`; and
- `evidenceManifestProfiles`; and
- `validationRuleSets`.

It MUST declare `materializationMode` as `FULLY_MATERIALIZED` or `COMPOSED`.

It MAY identify a `baseProfile` and additional `requiredArtifacts`.

### 8.1 No implicit inheritance

If `materializationMode` is `FULLY_MATERIALIZED`, all normative rules used for validation MUST be directly represented by or exactly referenced from the published profile bytes.

If `materializationMode` is `COMPOSED`, `baseProfile` and an exact `compositionRule` Artifact Reference are REQUIRED. The composition rule MUST define merge order, conflicts, deletion, replacement and array handling deterministically.

A verifier MUST NOT guess inheritance, merge order or conflict resolution from mutable external state.

### 8.2 Compatibility is not applicability

Compatibility proves that a profile declares support for a specification. It does not prove that the profile governed a particular registration.

## 9. Payload policy

`payload` MUST define:

- one or more exact `payloadSchemas`;
- permitted `mediaTypes`;
- `unknownFieldPolicy` — `REJECT`, `ALLOW_COMMITTED` or `PROFILE_RULED`; and
- whether detached/external payload bytes are permitted.

`ALLOW_COMMITTED` means unknown fields remain within the payload commitment. It does not make their semantics defined by DDC.

`PROFILE_RULED` requires a stable rule identifier in the bound validation rule set.

Payload schemas validate structure. They MUST NOT be presented as proof that a substantively correct real-world event occurred.

## 10. Requirement rules

### 10.1 Common rule fields

Every rule MUST contain:

- `ruleId` — stable identifier unique within the profile;
- `requirement` — `REQUIRED`, `CONDITIONAL` or `OPTIONAL`;
- `failureCode` — stable result code; and
- optional `conditionRuleId`, required when `requirement` is `CONDITIONAL`.

Free-text conditions are explanatory only. Reproducible conditional behavior MUST resolve to a deterministic rule in the exact bound validation rule set.

Rule arrays and identifiers MUST be deterministically ordered and duplicate identifiers rejected.

### 10.2 Field rules

A field rule identifies:

- a JSON Pointer or other profile-declared stable `targetPath`;
- permitted data type or schema fragment through `constraintRefs`; and
- presence/validation requirement.

Field rules MUST NOT depend on UI labels or display order.

### 10.3 Evidence rules

An evidence rule defines:

- `evidenceClass`;
- whether evidence bytes must be presented at registration;
- whether an evidence commitment is required;
- permitted/required commitment profile references;
- availability requirement after registration;
- confidentiality class; and
- verification behavior when bytes are unavailable.

The base availability modes are:

- `NOT_REQUIRED_AFTER_REGISTRATION`;
- `ON_REQUEST`;
- `UNTIL`;
- `INDEFINITE`; and
- `PROFILE_DEFINED`.

`UNTIL` requires a deterministic end rule or exact end value. `PROFILE_DEFINED` requires a bound rule reference.

Evidence bytes MAY remain outside DDC. A profile MUST distinguish a missing required object from an object that was never required to remain available.

### 10.4 Relationship rules

A relationship rule defines:

- permitted/required `relationshipType` values;
- permitted target record types;
- whether `targetRecordHash` is required;
- whether assertion identity/authority evidence is required; and
- whether relationship evidence references are required.

Requiring a relationship commitment does not assert that the relationship is substantively true.

### 10.5 Proof rules

A proof rule defines:

- `proofPurpose`;
- exact permitted proof-profile artifacts;
- required signed/anchored target type;
- identity-resolution requirement;
- authority-resolution requirement; and
- independent-time requirement.

The profile MUST NOT infer one proof property from another. Signature validity, identity, authority and time remain separate axes.

### 10.6 Semantic dependency rules

A semantic dependency rule identifies historically load-bearing context required to interpret a record in the profile's defined reconstruction scope.

It MUST state:

- `dependencyClass`;
- `source` or target path/evidence class;
- whether the dependency must be version-bound;
- whether it must remain available; and
- the result when it cannot be resolved.

Permitted unresolved results are `PARTIAL`, `AMBIGUOUS`, `UNKNOWN`, `UNAVAILABLE` and `FAIL`.

`FAIL` is appropriate only when the applicable contract required preservation or verification and that requirement failed. Context outside the historical contract MUST NOT be converted into a retroactive failure.

## 11. Governance and authority

`governance` MUST define:

- permitted contract-applicability bases;
- exact authority/applicability profile references;
- whether registrant-only assertion is permitted; and
- evidence classes used to establish profile assignment or authority.

If registrant-only assertion is permitted, the resulting applicability status MUST NOT exceed `ASSERTED` without additional valid evidence.

The profile MUST define how historical activation, revocation, suspension, expiration and supersession are resolved when those states affect authority or applicability.

## 12. Registration policy

`registration` MUST define:

- permitted registration-mechanism profile artifacts;
- failed-attempt policy;
- whether a registration-time claim is required;
- whether independent time proof is required;
- whether registrant identity resolution is required; and
- whether registrant authority resolution is required.

The failed-attempt policy MUST be one of:

- `REJECT_NO_DDT`;
- `OPERATIONAL_LOG_ONLY`; or
- `SEPARATE_FAILURE_RECORD`.

`SEPARATE_FAILURE_RECORD` requires a dedicated failure `recordType` included in domain scope and its own applicable Preservation Contract.

## 13. Privacy and confidentiality

`privacy` MUST define:

- prohibited data classes for public DDT fields;
- permitted confidentiality classifications;
- policy for public raw digests of sensitive or low-entropy evidence;
- required safer commitment profile references where applicable; and
- whether public retrieval references are permitted for each evidence class through evidence rules.

The raw-digest policy is:

- `ALLOWED`;
- `CONTEXTUAL_REVIEW_REQUIRED`; or
- `FORBIDDEN_FOR_SENSITIVE_LOW_ENTROPY`.

Profiles MUST NOT require credentials, private keys, bearer tokens, passwords or secret access tokens in a DDT Record or public artifact.

Privacy controls MUST NOT be described as proof of regulatory compliance unless the relevant legal requirements and conformance scope are explicitly bound and evaluated.

## 14. Obligation templates and materialization

`obligationTemplates` defines profile rules from which record-specific Preservation Contract obligations are deterministically materialized.

Each template MUST contain:

- `templateId`;
- preservation category;
- requirement level;
- target selector or deterministic target-selection rule;
- temporal scope rule;
- failure code; and
- optional conditional rule ID.

The validator MUST record which template/rule produced every materialized obligation.

The Preservation Contract MUST contain the resolved obligation with concrete target references. A later verifier MUST NOT rerun a current profile to invent historical obligations that were absent from the bound contract.

If a required template could not be deterministically materialized, registration conformance MUST NOT be `PASS`.

## 15. Extensions

Profiles MAY define domain extensions as an ordered array.

Each extension MUST contain:

- globally scoped `namespace`;
- exact `schema` Artifact Reference; and
- `value` validated under that schema.

Extension values participate in the profile artifact digest because they are part of the profile bytes.

An extension MUST NOT override core field names or semantics. Unknown extension namespaces needed for validation produce `UNAVAILABLE` or `INDETERMINATE` according to the historical contract; they MUST NOT be silently ignored when required.

## 16. Profile commitment and publication

For this draft, exact profile identity is:

```text
enterpriseProfileDigest = SHA-256(exact published profile bytes)
```

The profile publication package MUST state whether the digest covers raw published bytes or a defined canonical representation. The Preservation Contract Artifact Reference MUST use the same declared digest procedure.

Before candidate freeze, the publication profile MUST select one exact byte-level procedure and provide cross-implementation fixtures.

The exact profile Artifact Reference is included in the Preservation Contract, whose commitment is included in the DDT `recordHash`.

## 17. Profile conformance

A conforming Enterprise Profile MUST:

1. validate against the exact Enterprise Profile schema;
2. preserve all non-negotiable core semantics;
3. use stable, unique and deterministically ordered rule identifiers;
4. identify every normative external artifact by version and digest;
5. define machine-evaluable domain scope;
6. define payload, evidence, relationship, proof, governance, registration and privacy policies;
7. define deterministic materialization for preservation obligations;
8. contain no unresolved mutable dependency required for validation;
9. state all permitted extension namespaces and schemas; and
10. ship positive and negative examples before candidate status.

Schema validity alone is insufficient for profile conformance.

## 18. Versioning

A frozen profile is immutable.

The following require a new profile version and digest:

- a changed domain scope, record type, permitted source type or permitted upstream event type;
- a changed required/conditional rule;
- a changed payload/evidence schema;
- a changed relationship, proof, authority, time or privacy rule;
- a changed obligation template;
- a changed extension schema or normative extension value; or
- any other normative byte change.

Editorial changes after publication also require a new exact artifact version if they change the published bytes. Implementations MAY maintain a separate non-normative commentary document.

Profile succession MUST be explicit. A newer version MAY apply to new registrations but MUST NOT retroactively alter an earlier DDT's conformance or historical semantic result.

## 19. Required verification axes

Enterprise Profile verification MUST expose at least:

- `ENTERPRISE_PROFILE_IDENTITY`;
- `ENTERPRISE_PROFILE_INTEGRITY`;
- `ENTERPRISE_PROFILE_BOUND_TO_CONTRACT`;
- `ENTERPRISE_PROFILE_COMPATIBILITY`;
- `ENTERPRISE_PROFILE_APPLICABILITY`;
- `PROFILE_ARTIFACT_AVAILABILITY`;
- `PROFILE_ARTIFACT_INTEGRITY`;
- `PROFILE_RULE_EVALUATION`;
- `OBLIGATION_MATERIALIZATION`; and
- `PROFILE_EXTENSION_RESOLUTION`.

These results MUST NOT replace record, document, authority, time, preservation-contract or semantic-resolution axes.

## 20. Required test families

Before candidate status, test at least:

1. AI decision profile and manufacturing process profile using the same core envelope;
2. out-of-scope `recordType` and subject namespace;
3. required, conditional and optional field rules;
4. required evidence presented, withheld and later unavailable;
5. evidence outside the preservation obligation;
6. low-entropy confidential evidence under each digest policy;
7. exact and missing target-record-hash relationship rules;
8. signature valid but identity or authority unresolved;
9. asserted registration time without independent time proof;
10. valid and invalid profile applicability evidence;
11. deterministic obligation materialization and tampered materialized obligation;
12. profile v1.0 historical verification after v1.1 activation;
13. unavailable required extension schema;
14. base-profile/composition ambiguity rejection; and
15. second implementation reproducing rule outcomes.

## Appendix A — Known integration work

Before the DDT Envelope v0.3 and Preservation Contract reach candidate status:

1. their schemas MUST bind this exact Enterprise Profile artifact form;
2. Preservation Contract obligations MUST retain the originating profile rule/template identifier;
3. the Conformance Receipt MUST report per-rule results and materialized obligation identifiers;
4. the Verification Result Profile MUST include the axes in Section 19; and
5. AI and manufacturing examples MUST demonstrate domain adaptation without core-envelope changes.

---

**End of DDT Enterprise Profile v0.2 Draft (`0.2.0-draft.1`)**
