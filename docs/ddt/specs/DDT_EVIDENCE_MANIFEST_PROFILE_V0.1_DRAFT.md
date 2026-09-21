# DDT Evidence Manifest Profile v0.1 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-EVIDENCE-MANIFEST-PROFILE-0.1-DRAFT.1`  
**Version:** `0.1.0-draft.1`  
**Status:** DRAFT — TEST_ONLY — not approved for production conformance claims  
**Date:** 2026-09-10  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`

## 1. Purpose

This profile selects the exact Evidence Manifest behavior used by the current DDT Reference Recorder baseline.

It does not redefine the DDT Evidence Manifest specification. It narrows the generic Evidence Manifest v0.1 capability set to one deterministic, locally verifiable TEST_ONLY baseline suitable for Recorder integration testing.

The profile binds:

- the exact Evidence Manifest specification and schema;
- the permitted representation mode;
- the permitted commitment type and exact commitment profile;
- deterministic committed-array ordering;
- duplicate rejection;
- semantic-scope constraints;
- confidentiality and public-commitment-risk constraints;
- extension policy; and
- claim boundaries.

## 2. Profile identity

The machine-readable profile uses:

```json
{
  "profileId": "ddt.evidence-manifest.reference-recorder-v1",
  "profileVersion": "0.1.0-draft.1"
}
```

The exact Evidence Manifest target is:

- Standard: `DDT-EVIDENCE-MANIFEST`
- Version: `0.1.0-draft.1`
- Specification ID: `DDT-EVIDENCE-MANIFEST-0.1-DRAFT.1`

The exact schema is:

- Artifact ID: `DDT-EVIDENCE-MANIFEST-SCHEMA-0.1-DRAFT.1`
- Version: `0.1.0-draft.1`
- SHA-256: `150e7f7f59ff86349d107d3f9db86314f378119b9f403cbc32a76e3f490593c6`

## 3. Representation policy

The Reference Recorder baseline permits exactly:

```text
representation.mode = RAW_BYTES
```

The commitment input is the exact original evidence byte sequence.

The Recorder MUST NOT apply:

- newline conversion;
- character encoding conversion;
- Unicode normalization;
- metadata injection;
- decompression;
- reserialization; or
- any other transformation

before the evidence commitment is calculated.

`representation.byteLength` MUST equal the exact committed byte length.

`RFC8785_JCS` and `PROFILE_DEFINED` evidence representations are outside this baseline profile.

## 4. Commitment policy

The Reference Recorder baseline permits exactly:

```text
commitmentType = DIGEST
encoding = LOWERCASE_HEX
```

The exact commitment profile is:

- Artifact ID: `DDT-EVIDENCE-DIGEST-COMMITMENT-PROFILE-ARTIFACT-0.1-DRAFT.1`
- Version: `0.1.0-draft.1`
- SHA-256: `d0408be2633164aff62e5341064e971644e07105fd85abbdbb9b081d55b056e8`
- Profile ID: `ddt.evidence-commitment.sha256-raw-bytes-v1`

The selected commitment procedure is:

```text
SHA-256(exact original evidence bytes)
```

encoded as 64 lowercase hexadecimal characters with no prefix.

Other commitment mechanisms remain valid in the generic Evidence Manifest specification but are outside this TEST_ONLY Recorder baseline.

## 5. Evidence-entry policy

Every generated entry MUST contain all fields required by `DDT-EVIDENCE-MANIFEST-0.1-DRAFT.1`.

The Reference Recorder permits the base role vocabulary:

- `SOURCE_PAYLOAD`;
- `SUPPORTING_EVIDENCE`;
- `SEMANTIC_DEPENDENCY`;
- `POLICY_OR_RULEBOOK`;
- `FRAMEWORK_OR_DEFINITION`;
- `AUTHORITY_EVIDENCE`;
- `IDENTITY_OR_KEY_EVIDENCE`;
- `PROVENANCE_EVIDENCE`;
- `TIME_OR_ORDERING_EVIDENCE`;
- `VALIDATION_ARTIFACT`; and
- `PROFILE_DEFINED`.

Use of `PROFILE_DEFINED` does not create semantics by itself. The exact applicable Enterprise Profile and Preservation Contract MUST bind the vocabulary that defines the role.

`evidenceClass` remains profile/domain-defined and MUST NOT be interpreted outside its bound profile namespace.

The number of materialized evidence-policy entries MUST equal the number of ingested evidence objects exactly.

## 6. Semantic-scope policy

For an entry where:

```text
historicallyLoadBearing = true
```

the following are REQUIRED:

- `dependencyClass`;
- at least one `reconstructionScopes` entry; and
- `unresolvedResult` other than `NOT_APPLICABLE`.

For an entry where:

```text
historicallyLoadBearing = false
```

the following apply:

- `dependencyClass` MUST be absent;
- `unresolvedResult` MUST equal `NOT_APPLICABLE`.

The Evidence Manifest does not establish substantive truth or completeness.

## 7. Confidentiality policy

For this Reference Recorder profile, an exact `disclosureProfile` is REQUIRED when:

- `classification` is not `PUBLIC`; or
- `redactionPermitted` is `true`.

Because this baseline uses a public raw SHA-256 digest commitment, the Recorder MUST reject evidence when:

```text
publicCommitmentRisk = HIGH
```

or:

```text
publicCommitmentRisk = UNRESOLVED
```

A matching evidence digest proves byte integrity only. It does not establish truth, provenance, authority, legality, completeness or confidentiality.

## 8. Deterministic ordering

Before the Evidence Manifest is committed, the Recorder MUST enforce deterministic ordering.

The following arrays MUST contain unique members and MUST be sorted:

- manifest `entries` by `evidenceId`;
- `custody.retrievalRefs` by `referenceId`;
- `preservationObligationRefs`;
- `provenance.signatureProofRefs`;
- `provenance.authorityEvidenceRefs`;
- `semanticScope.reconstructionScopes`;
- each related-evidence `evidenceRefs` array; and
- `relatedEvidence` by `relationshipType`, then `targetEvidenceId`.

Duplicate identifiers or duplicate relationship tuples MUST be rejected.

Ordering follows ascending Unicode code-point order for the identifiers governed by this profile.

The current Reference Recorder generates UUID URN evidence identifiers before final manifest ordering.

## 9. Empty-manifest policy

The generic Evidence Manifest specification permits an empty manifest only when the exact Enterprise Profile and Preservation Contract permit it.

This Evidence Manifest Profile does not independently authorize an empty manifest.

The Recorder MUST defer that decision to the exact historically bound Enterprise Profile and Preservation Contract.

Schema validity alone MUST NOT be treated as permission for zero evidence entries.

## 10. Retrieval-reference policy

Retrieval references are optional only where the exact Enterprise Profile and Preservation Contract permit owner-mediated or later-presented evidence without a preserved locator.

A retrieval-reference value MUST NOT contain credentials, secret tokens or access secrets.

A mutable retrieval location does not establish evidence identity. Exact evidence identity is determined by the selected commitment procedure.

## 11. Extension policy

For the current Reference Recorder baseline:

```text
extensions = []
```

Evidence Manifest extensions are not permitted by this profile.

A later profile version may enable extensions only by binding their exact schemas and deterministic ordering semantics.

## 12. Manifest commitment boundary

This profile does not define a second manifest hash algorithm.

The structural commitment profile separately defines:

```text
E =
SHA-256(
  UTF8(
    RFC8785-JCS(
      envelope.evidenceManifest
    )
  )
)
```

The complete Evidence Manifest participates in `E`.

The Evidence Manifest Profile defines the permitted manifest content and deterministic preparation rules; the Structural Commitment Profile defines the structural hash operation.

## 13. Verification requirements

A verifier evaluating this profile MUST independently check:

1. the exact historical profile bytes and digest;
2. the exact Evidence Manifest schema binding;
3. Evidence Manifest schema validity;
4. exact evidence-count/materialized-policy correspondence where Recorder reconstruction is evaluated;
5. permitted representation mode;
6. exact commitment-profile binding;
7. digest encoding;
8. semantic-scope rules;
9. confidentiality/disclosure requirements;
10. public raw-digest risk gating;
11. deterministic ordering;
12. duplicate rejection; and
13. extension prohibition.

A verifier MUST NOT silently reorder, deduplicate, normalize or repair a non-conforming historical manifest and then report it as conforming.

## 14. Claim boundary

Conformance to this profile establishes only that the Evidence Manifest was constructed according to the exact selected structural, representation, commitment, ordering and policy rules.

It does not establish:

- substantive truth;
- evidence completeness;
- lawful collection;
- provenance correctness;
- signer identity;
- signer authority;
- independent time;
- network finality;
- continuing availability;
- legal validity; or
- regulatory compliance.

Those properties require their own evidence, profiles and verification axes.

## 15. Error conditions

The machine-readable profile defines stable error codes for at least:

- Evidence count mismatch;
- unsupported representation;
- commitment-profile mismatch;
- commitment encoding mismatch;
- duplicate evidence ID;
- duplicate retrieval reference;
- duplicate committed reference;
- duplicate related-evidence tuple;
- committed-array ordering failure;
- semantic-scope violation;
- required disclosure profile missing;
- unsafe raw public commitment;
- extension not permitted; and
- evidence-manifest schema mismatch.

## 16. Status

This profile is `TEST_ONLY`.

It exists to close the exact `evidenceManifestProfile` role required by Preservation Contract v0.3 and Conformance Receipt v0.3 for the current DDT Reference Recorder baseline.

It MUST NOT be represented as a production-standardized Evidence Manifest policy until independently reviewed and promoted by a later version decision.
