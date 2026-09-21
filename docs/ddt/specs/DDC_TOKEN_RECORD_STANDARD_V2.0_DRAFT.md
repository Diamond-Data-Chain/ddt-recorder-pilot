# DDC Token Record Standard v2.0 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDC-TRS-2.0-DRAFT`  
**Version:** `2.0.0-draft.1`  
**Status:** DRAFT — not approved for production conformance claims  
**Date:** 2026-09-03  
**Language:** English

## Document status

This document is a development draft. It does not supersede `DDC-TRS-1.0` while this version remains a draft.

This revision consolidates the DDT record philosophy, the DDT Record Envelope v0.2 design work, independent-verifiability requirements, preservation-contract discovery findings and the bounded CASE-CRR-01 cryptographic-renewal review.

Conformance to this draft MUST NOT be represented as conformance to a final production standard.

## 1. Purpose

This specification defines the normative architecture and evidence boundaries of a Diamond Data Token record, referred to in this document as a **DDT Record**.

A DDT Record is a permanent, append-only evidence record that preserves:

- what exact record content was registered;
- which subject and record family it concerned;
- which external evidence commitments and relationships were presented;
- which schema, Enterprise Profile, validation rules and cryptographic profile governed registration;
- which validation and registration proofs were produced; and
- what an independent verifier can and cannot establish later.

A DDT Record does not make upstream content true merely by recording it. DDC MUST preserve the boundary between evidence, assertion, validation, interpretation and substantive truth.

## 2. Scope

This specification defines:

- DDT record identity and family identity;
- immutable and append-only lifecycle rules;
- the separation between upstream content and DDC-generated proof;
- the preservation-contract model;
- Enterprise Profile requirements;
- evidence-manifest and off-chain evidence requirements;
- deterministic commitments and proof-layer separation;
- relationship and family-continuity semantics;
- registration, identity, authority and time-proof boundaries;
- conformance receipts and historical conformance reproduction;
- multi-axis verification results;
- independent/offline verification requirements;
- cryptographic agility and append-only renewal;
- versioning, migration and historical-verification rules; and
- conformance and release requirements.

This specification does not define:

- whether an upstream assertion is factually correct;
- whether a decision was good, lawful, adequate or commercially appropriate;
- one universal business-data model for every industry;
- custody of confidential enterprise documents;
- custody of participant private signing keys;
- one mandatory blockchain, database or storage implementation for every deployment;
- DDC Coin economics, presale rules, staking or DAO governance; or
- user-interface design.

## 3. Normative language

The keywords **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY** and **OPTIONAL** are to be interpreted as normative requirement levels.

Normative requirements apply only where the named conformance class or profile is applicable.

## 4. Architectural boundary

### 4.1 DDT is a recorder, not a truth authority

DDT records that a particular event, assertion, observation, recommendation, response, approval, decision, correction, dispute, remedy, re-evaluation or other defined record was registered.

Registration establishes only those properties supported by the preserved commitments and proofs.

DDC MUST NOT represent any of the following as automatic consequences of registration:

- factual correctness;
- legal validity;
- institutional authority;
- adequacy of a decision;
- current applicability;
- completeness of all relevant history; or
- endorsement by DDC.

### 4.2 Upstream and DDC proof layers

An implementation MUST distinguish:

1. content asserted or supplied by an upstream source;
2. evidence objects or commitments presented with that content;
3. validation performed under a historically bound preservation contract;
4. DDC registration and proof artifacts; and
5. later verification or reconstruction conclusions.

Success in one layer MUST NOT be silently promoted into success in another.

### 4.3 Missing information

Information not preserved or not presented MUST remain explicitly absent, unavailable or unresolved.

An implementation MUST NOT substitute:

- a current document for an unbound historical document;
- a current policy for an unbound historical policy;
- a current key or authority state for an unresolved historical state;
- the newest record for an earlier meaning; or
- an inferred value for missing source content.

## 5. Terminology

### 5.1 DDC

Diamond Data Chain, the architecture and ecosystem within which DDT Records are formed, registered, preserved and verified.

### 5.2 DDT Record

One immutable registered evidence record with one permanent record identity and one record commitment.

The term **DDC Token Record** is retained for compatibility with `DDC-TRS-1.0`. **DDT Record** is the preferred technical term in this revision.

A DDT Record is not a transferable cryptocurrency asset.

### 5.3 `ddtRecordId`

A globally unique, permanent and non-reused identifier for exactly one immutable DDT Record.

A correction, later version or later event MUST receive a different `ddtRecordId`.

### 5.4 `ddtFamilyId`

A stable identifier that groups a defined chronological sequence of DDT Records concerning the same scoped subject or operational record family.

Sharing a family identifier does not mean that all family members have identical meaning, status or authority.

### 5.5 Subject reference

A reference to the external person, object, case, asset, process, dataset or other subject described by the record.

A subject reference MUST be interpreted together with a defined namespace or issuer context. A bare identifier that may collide across organizations or domains is insufficient for global technical identity.

### 5.6 Source event or upstream assertion

Information supplied by a source system, person, device, organization, model, evaluator or other external actor.

DDC preservation of an upstream assertion does not convert it into a DDC conclusion.

### 5.7 Evidence object

A document, structured object, binary file, image, measurement, log, signature, approval, model output, transaction or other material relevant to a recorded assertion or event.

An evidence object may remain outside DDC.

### 5.8 Evidence Manifest

A deterministic, versioned inventory of evidence objects and commitments associated with a DDT Record.

### 5.9 Preservation Contract

The exact, historically bound set of schemas, profiles, validation rules, cryptographic rules and preservation obligations governing creation and conformance of a DDT Record at registration time.

### 5.10 Enterprise Profile

A versioned domain or organization-specific profile that defines required fields, evidence, permissions, validation rules and allowed unresolved states without changing the core semantics of this standard.

### 5.11 Conformance Receipt

A separate, non-circular, signed or otherwise integrity-protected result stating which record was validated, under which Preservation Contract, by which validator implementation and with what result.

### 5.12 Registration proof

Evidence binding a DDT Record commitment to a registration mechanism, registrant, signature or other defined registration claim.

### 5.13 Independent time proof

Evidence outside the unilateral control of the registering component that establishes a precisely stated time or ordering claim for a commitment.

### 5.14 Historical semantic resolution

A later verifier's ability to reconstruct the historically applicable meaning or context of a target record from preserved evidence.

Historical semantic resolution is not identical to record integrity or target identity binding.

### 5.15 Cryptographic Renewal Event

An append-only DDT event that preserves and binds an original evidence package and its historical proof scope into a new cryptographic profile without modifying the original record.

## 6. Core principles

Every conforming implementation MUST preserve the following principles:

1. one immutable record identity per DDT Record;
2. no reuse of an assigned record identity;
3. append rather than overwrite;
4. separation of source content from DDC proof;
5. deterministic commitment formation;
6. historically bound validation rules;
7. explicit proof scope;
8. independent verification without requiring trust in a DDC-operated dashboard or API;
9. privacy-preserving separation of records from confidential evidence;
10. multi-axis verification without semantic collapse;
11. historical verification under historical rules; and
12. claim strength limited to preserved evidence.

## 7. DDT record lifecycle

### 7.1 Lifecycle stages

A production DDT registration process MUST perform the following logical stages:

1. identify the upstream event/assertion and scoped subject;
2. resolve the applicable Preservation Contract;
3. assign or resolve `ddtRecordId` and `ddtFamilyId`;
4. construct the upstream payload and Evidence Manifest;
5. resolve predecessor and typed relationship commitments;
6. validate required input against the applicable Enterprise Profile and rule set;
7. canonicalize the committed structures under the bound canonicalization profile;
8. calculate evidence, payload, contract and record commitments;
9. produce the Conformance Receipt;
10. produce the required registration signature/proof;
11. obtain any required independent time or external anchor proof; and
12. preserve/export the required independent-verification package.

The mechanism-specific profile MAY define operational ordering within these stages, but MUST preserve the final commitment and proof dependencies defined by this standard.

### 7.2 Failed registration attempts

A validator MUST NOT produce a successful conformance result when mandatory Preservation Contract requirements fail.

A profile MUST define whether failed attempts are:

- rejected without creating a DDT Record;
- retained in a separate operational audit log; or
- registered as an explicitly typed failure/rejection event.

A rejected object MUST NOT be represented as a conforming registered DDT merely because its failure was logged.

### 7.3 Updates and corrections

A registered record MUST NOT be modified.

A correction or later state MUST:

- create a new `ddtRecordId`;
- preserve the earlier record unchanged;
- use the applicable new registration contract; and
- explicitly state the intended relationship to the earlier record where that relationship is claimed.

## 8. Record identity and family continuity

### 8.1 Immutable record identity

`ddtRecordId` MUST identify exactly one immutable record and MUST NOT be reassigned to different bytes, content, subject or semantics.

The production identifier profile MUST define:

- namespace and issuer rules;
- syntax and normalization;
- uniqueness mechanism;
- collision handling;
- resolution behavior;
- whether an opaque internal identifier and a separate display identifier are used; and
- behavior when an apparent duplicate registration is detected.

The identifier construction MUST avoid circular derivation. If an identifier is derived from a commitment, the profile MUST define a separate pre-commitment or other deterministic construction that does not require hashing a value that depends on itself.

### 8.2 Family identity

`ddtFamilyId` MUST identify the intended record family scope and MUST remain distinct from `ddtRecordId`.

The first record in a family MUST be explicitly identifiable as the family genesis under the applicable envelope rules.

Every non-genesis record MUST bind the exact preceding record identity and commitment required by the applicable family-ordering profile.

### 8.3 Chronology and `LATEST`

`LATEST` MAY be exposed as a derived discovery label meaning only the most recently registered record known to the queried index or view.

`LATEST` MUST NOT mean:

- true;
- valid;
- approved;
- authoritative;
- legally effective;
- not disputed; or
- semantically superior to an earlier record.

### 8.4 Completeness boundary

A valid internal predecessor chain demonstrates continuity relative to the presented chain of commitments.

It does not, by itself, prove that no alternate internally consistent chain exists. Profiles requiring independently detectable resistance to retroactive alternate history MUST require external checkpoints, transparency mechanisms or other independently witnessed commitments.

## 9. Preservation Contract

### 9.1 Requirement

Every production DDT Record MUST bind one exact Preservation Contract applicable to that registration.

A Preservation Contract MUST identify, at minimum:

- core DDT envelope schema ID, version, digest and immutable reference;
- Enterprise Profile ID, version, digest and immutable reference;
- validation-rule-set ID, version, digest and immutable reference;
- canonicalization profile ID and version;
- cryptographic profile ID and version;
- relationship vocabulary/profile ID and version where applicable;
- evidence-manifest schema/profile ID and version;
- validator implementation ID, version and digest used at registration; and
- preservation/availability obligations applicable to required external artifacts.

An implementation MAY include additional historically relevant artifacts. Each such artifact MUST be unambiguously identified by content digest and profile-defined reference semantics.

### 9.2 Contract commitment

The deterministic Preservation Contract commitment MUST be included in the DDT record-level commitment.

A human-readable version label without an exact artifact digest is insufficient for independent historical reproduction.

### 9.3 Historical applicability

A later verifier MUST evaluate historical registration conformance using the exact Preservation Contract bound to the record.

A later schema, profile or validator MUST NOT retroactively add obligations to or remove obligations from an earlier registration.

### 9.4 Contract availability

If a historically required contract artifact is unavailable, the verifier MUST report the corresponding artifact-availability and conformance-reproducibility axes as unavailable or unresolved according to the verification-result specification.

Loss of a contract artifact does not automatically prove that the DDT record commitment itself is corrupt.

## 10. Enterprise Profiles

### 10.1 Purpose

The generic DDT envelope preserves common evidence semantics. Enterprise Profiles define domain-specific content and validation obligations.

Profiles MAY be created for manufacturing, transport and logistics, AI decisions, finance, energy, healthcare, regulatory records or other domains.

### 10.2 Mandatory profile content

A production Enterprise Profile MUST define:

- profile identity, semantic version, digest and immutable reference;
- applicable record types and subject namespaces;
- required and optional upstream fields;
- required evidence objects or evidence commitments;
- historically load-bearing semantic dependencies and the version/state binding required for each;
- accepted evidence representation and digest rules;
- required actors, roles, approvals or authority evidence;
- required signatures and time proofs;
- validation rules and stable machine-readable failure codes;
- permitted unknown, unresolved, redacted or unavailable values;
- relationship types and constraints applicable to the profile;
- evidence availability and retention obligations;
- confidentiality and disclosure rules;
- permitted cryptographic profiles; and
- compatibility and migration policy.

### 10.3 Profile extensions

An Enterprise Profile MAY add domain-specific content but MUST NOT redefine the core meaning of:

- record identity;
- record immutability;
- source assertion;
- record commitment;
- registration proof;
- evidence availability;
- proof-layer separation; or
- historical verification.

### 10.4 Profile changes

A changed profile MUST receive a new version and digest.

Profile version `N+1` MUST NOT alter the historical obligations of records bound to profile version `N`.

## 11. Evidence Manifest and off-chain evidence

### 11.1 Evidence separation

Original documents and evidence MAY remain in enterprise-controlled or owner-controlled storage.

A DDT Record MUST NOT claim document integrity unless the document representation defined by the applicable evidence profile can be obtained and successfully verified against its bound commitment.

### 11.2 Evidence-manifest entries

Each evidence entry MUST define, where applicable:

- evidence identifier and namespace;
- evidence role or type;
- immutable or versioned reference semantics;
- media/serialization type;
- whether the commitment covers raw bytes or a defined canonical representation;
- canonicalization/normalization profile, if any;
- digest algorithm and digest value;
- size or other representation constraints where required;
- confidentiality/disclosure classification;
- availability or retention obligation;
- custodian or resolver role without exposing private credentials;
- relationship to the upstream assertion or DDT Record; and
- any required independent provenance or signature proof.

Evidence roles SHOULD distinguish ordinary supporting evidence from historically load-bearing dependencies such as policy versions, framework definitions, authority state, code/model versions and external reference state. A profile MUST state which such dependencies are required for its intended reconstruction claim.

### 11.3 Evidence-manifest commitment

The exact Evidence Manifest commitment MUST be included in the record-level commitment.

Changing an evidence identifier, digest, representation rule, evidence role or committed preservation obligation MUST change the record-level commitment.

### 11.4 Availability versus integrity

Verification MUST distinguish:

- no evidence object was required;
- an evidence commitment was registered but the object is not currently available;
- an object is available and matches the commitment;
- an object is available and does not match the commitment; and
- the representation rules are insufficient or unavailable for verification.

A missing off-chain document MUST NOT automatically change DDT record integrity from pass to fail.

If the historically applicable Preservation Contract required continuing availability and that obligation is currently violated, the preservation-obligation axis MUST surface that failure separately.

### 11.5 Privacy and commitment safety

A digest can reveal or enable guessing of low-entropy or predictable sensitive content. Profiles MUST evaluate dictionary, correlation and linkability risk before requiring a raw public hash.

Where a raw digest is unsafe, a profile SHOULD define a suitable randomized commitment, keyed commitment, privacy-preserving proof or access-controlled commitment mechanism while retaining independent-verification requirements.

Secrets, private keys and access credentials MUST NOT appear in a DDT Record, public Evidence Manifest or public verification package.

## 12. Canonicalization and record commitments

### 12.1 Determinism

Every committed structure MUST use an explicitly identified deterministic serialization/canonicalization profile.

The profile MUST define:

- character encoding;
- object-member ordering;
- array-order semantics;
- number representation;
- Unicode handling;
- treatment of missing and explicit `null` values;
- treatment of unknown extension fields;
- binary evidence representation; and
- algorithm identifier and digest encoding.

### 12.2 Commitment layers

At minimum, the architecture MUST distinguish:

1. evidence-object commitment;
2. Evidence Manifest commitment;
3. upstream payload commitment;
4. Preservation Contract commitment;
5. DDT record-level commitment; and
6. post-commit registration, conformance, time and renewal proofs.

### 12.3 Record commitment

The DDT Record Envelope specification MUST define one exact canonical input for `recordHash`.

The input MUST bind, at minimum:

- immutable record identity;
- family and scoped subject identity;
- record type and envelope schema version;
- registered upstream payload commitment;
- Evidence Manifest commitment;
- Preservation Contract commitment;
- predecessor commitment where applicable; and
- committed typed relationships.

Any field excluded from `recordHash` MUST be enumerated by the envelope specification. If an excluded field supports a proof claim, the applicable proof MUST define exactly how that field is separately bound.

### 12.4 Recomputed versus registered commitments

A verifier MUST distinguish the commitment preserved at registration from a commitment recomputed from bytes presented later.

The recomputed value MUST NOT overwrite or silently replace the historical registered value.

## 13. Relationships and succession

### 13.1 Relationship commitment

A committed related-record edge MUST identify:

- target DDT record identity;
- target record commitment;
- relationship type; and
- assertion/proof metadata required by the applicable profile.

A changed target, target commitment or relationship type MUST change the referring record commitment.

### 13.2 Assertion boundary

A valid relationship commitment proves that the relationship assertion was included in the committed record.

It does not, by itself, prove that the relationship is factually, legally or institutionally correct.

### 13.3 Chronology versus succession

A family predecessor link expresses chronological/structural continuity only.

The following meanings require explicit typed relationships:

- supersedes;
- corrects;
- disputes;
- responds to;
- reverses;
- remedies;
- replaces; or
- other profile-governed semantic relations.

A later record MUST NOT be interpreted as silently cancelling an earlier record.

### 13.4 Relationship vocabulary

Relationship vocabularies MUST be versioned, governed and historically available. An implementation MUST NOT invent a new relationship type while claiming conformance to a closed vocabulary.

## 14. Registration, signatures, identity and authority

### 14.1 Registration statement

Each production registration MUST have a precisely defined signed or otherwise integrity-protected statement binding the finalized DDT record commitment to the applicable registration claim.

The proof profile MUST define:

- exact signed bytes or canonical signed structure;
- proof purpose;
- signed-object type and digest;
- domain/context separation;
- algorithm and parameters;
- verification method or key identifier;
- signature encoding; and
- any replay-prevention or network-specific fields.

### 14.2 Proof-layer separation

Verification interfaces MUST preserve the following distinctions:

`valid signature != verified key identity`

`verified key identity != verified registrant identity`

`verified registrant identity != verified registrant authority`

`valid signature != proven signing or registration time`

`registration proof != substantive truth`

### 14.3 Historical key state

A production key profile MUST define:

- key creation/activation;
- rotation;
- suspension;
- expiration;
- revocation;
- compromise handling;
- historical status resolution; and
- evidence required to determine key state at the relevant time.

Later revocation MUST NOT automatically erase a previously established historical state. Conversely, the mere existence of a current key MUST NOT establish that it was valid at an earlier time.

### 14.4 Authority evidence

Where authority is required, the applicable profile MUST identify evidence sufficient to evaluate:

- the relevant identity;
- role or delegation;
- permitted event/action scope;
- organization/domain;
- validity interval or ordering evidence;
- revocation/termination behavior; and
- historical resolution procedure.

An asserted authority reference without independently resolvable evidence MUST remain asserted or unresolved.

### 14.5 Key custody

DDC MUST NOT require central custody of participant private keys as a condition of the generic DDT standard.

## 15. Time and ordering evidence

### 15.1 Separate time claims

The standard distinguishes at least:

- upstream event time;
- source signing time;
- submission/receipt time;
- local DDC registration-time assertion;
- network inclusion/order evidence; and
- independently established external time evidence.

These values MUST NOT be collapsed into one generic timestamp.

### 15.2 Assertion versus proof

A timestamp generated by an upstream source, application, server or unilateral DDC component is an assertion unless the applicable profile supplies independently verifiable supporting evidence.

### 15.3 Independent time proof

An independent time proof MUST state exactly:

- which commitment was anchored;
- how that commitment binds to the DDT Record;
- which mechanism was used;
- which time or ordering claim the mechanism supports;
- where the proof can be obtained; and
- how it can be verified independently.

Where a batch, Merkle root, transparency-log entry or aggregate commitment is anchored, the verification package MUST preserve the required inclusion proof.

The minimum defensible result SHOULD be expressed as existence no later than a verified external time unless the mechanism proves a stronger and precisely defined claim.

### 15.4 DDC network profiles

The generic DDT record format does not hard-code one network mechanism.

A DDC Network registration profile MAY require DDC blockchain transaction, block, finality and timestamp evidence. Such fields are requirements of that network profile, not automatic substitutes for every other proof axis.

## 16. Conformance Receipt

### 16.1 Purpose

The Conformance Receipt preserves the registration-time validator's result without requiring circular inclusion of the receipt in the record it validates.

### 16.2 Mandatory receipt claims

A production Conformance Receipt MUST bind:

- finalized `recordHash`;
- Preservation Contract commitment;
- validator implementation ID, version and digest;
- validation rules or contract artifacts evaluated;
- result and stable machine-readable reason codes;
- errors and warnings;
- validator identity/proof method;
- exact proof scope; and
- validation-time assertion and any separate independent time proof.

### 16.3 Historical reproduction

A later verifier SHOULD be able to:

1. verify receipt integrity and proof;
2. retrieve or obtain the historically bound contract artifacts;
3. independently re-run validation against the same record and contract;
4. compare the reproduced result with the preserved receipt; and
5. expose any mismatch without changing the original receipt.

### 16.4 Distinct questions

Verification MUST distinguish:

- whether registration conformed to the historical contract;
- whether that conformance can be reproduced now;
- whether current evidence-availability obligations are satisfied; and
- whether enough historical context exists for a requested semantic reconstruction.

## 17. Multi-axis verification model

### 17.1 No semantic collapse

A conforming verifier MUST expose proof axes independently. It MUST NOT use one generic `VERIFIED` label to imply success across unrelated layers.

The minimum axis registry MUST cover, where applicable:

- DDT record identity;
- DDT record integrity;
- upstream payload availability and integrity;
- evidence/document availability;
- evidence/document integrity;
- Evidence Manifest integrity;
- target identity and target-commitment binding;
- family continuity;
- schema availability and integrity;
- Enterprise Profile availability and integrity;
- validator artifact availability and integrity;
- Preservation Contract conformance at registration;
- current preservation-obligation status;
- conformance reproducibility;
- registration signature;
- signing-key identity and lifecycle state;
- registrant identity;
- registrant authority;
- registration-time assertion;
- independent registration-time proof;
- independent provenance;
- historical semantic resolution;
- cryptographic-renewal integrity and proof; and
- substantive truth applicability.

### 17.2 Axis-specific states

Each axis MUST define only states meaningful for that axis.

Common state terms MAY include:

- `PASS`;
- `FAIL`;
- `PARTIAL`;
- `AVAILABLE`;
- `UNAVAILABLE`;
- `UNRESOLVED`;
- `ASSERTED`;
- `PROVEN`;
- `VALID`;
- `EXPIRED`;
- `SUSPENDED`;
- `REVOKED`; and
- `NOT_APPLICABLE`.

The Verification Result specification MUST define the permitted state set and deterministic meaning for every registered axis.

### 17.3 Reasons and evidence

Every non-trivial axis result MUST include:

- stable reason code;
- human-readable detail;
- verification procedure/profile version;
- evaluated artifact references or digests; and
- verifier and evaluation-time metadata where required.

### 17.4 Overall summaries

An implementation MAY expose an overall summary such as `PASS_WITH_LIMITATIONS` for convenience only if:

- derivation rules are deterministic and versioned;
- all underlying axes remain visible;
- no failed, unavailable, unresolved or partial axis is hidden; and
- the summary is not represented as substantive truth or blanket validity.

## 18. Historical reconstruction and semantic resolution

### 18.1 Reconstruction boundary

Reconstruction MUST be evaluated only from preserved evidence and the historically applicable Preservation Contract.

An implementation MUST NOT produce a stronger unique historical conclusion merely because retrieval quality is high or a later state appears plausible.

### 18.2 Target identity versus meaning

A verifier may prove exactly which immutable DDT Record was referenced while remaining unable to reconstruct every contextual meaning applicable at that historical time.

Where a target's meaning depends on a policy, framework, definition, authority state, code/model version or other external context, the applicable profile MUST state whether that dependency is required and how its historical version or state is bound.

The valid result may therefore include:

- target identity/commitment binding: pass; and
- historical semantic resolution: partial or unresolved.

### 18.3 Loss after commitment

If a historically load-bearing dependency was required and committed but is later missing, altered or unverifiable, the affected availability, integrity or preservation-obligation axis MUST expose the failure or unavailability.

`PARTIAL` semantic resolution MUST NOT hide a separately demonstrable integrity or preservation failure.

### 18.4 Insufficient preservation at registration

If historical context was not required by the applicable Preservation Contract and was never preserved, record integrity and registration conformance MAY still pass while historical semantic resolution is legitimately partial.

### 18.5 Context-dependent result

Historical semantic resolution depends on the reconstruction question and required context. It MUST NOT be treated as a timeless intrinsic property of a record without identifying the reconstruction request, rules and evidence evaluated.

## 19. Independent and offline verification

### 19.1 Independence requirement

A record MUST NOT be described as independently verifiable if verification requires trust in or continued availability of a DDC-operated API, dashboard, proprietary database or undisclosed algorithm.

### 19.2 Verification package

A production offline package MUST contain or immutably reference, subject to the applicable disclosure rules:

- DDT Record Envelope;
- exact registered commitments;
- Evidence Manifest;
- Preservation Contract;
- exact historical schema/profile/rule artifacts;
- Conformance Receipt;
- registration proofs and signatures;
- public keys or historical resolution evidence;
- historical key/authority evidence required by the profile;
- independent time and external anchor proofs;
- family and relationship verification material;
- cryptographic-renewal records;
- algorithm and canonicalization identifiers/parameters;
- verifier specification and test vectors; and
- a deterministic package manifest containing a digest for every packaged artifact.

Confidential evidence bytes MAY be omitted. Their omission and later verification procedure MUST be explicit.

### 19.3 Offline acceptance test

Before a production independent-verifiability claim, a third party MUST be able to verify a preserved package with DDC-operated infrastructure unavailable.

## 20. Cryptographic agility and renewal

### 20.1 Algorithm identification

Every cryptographic proof and commitment MUST identify its algorithm, profile version and relevant parameters.

New registrations MUST NOT use an algorithm prohibited by the applicable current cryptographic profile.

### 20.2 Historical algorithms

Historical records remain immutable when algorithms age. Verification results MUST state the algorithm's historical/current evaluation under a versioned policy without rewriting the original record.

### 20.3 Renewal trigger policy

A production renewal profile MUST define triggers such as:

- scheduled age threshold;
- planned algorithm deprecation;
- key or trust-anchor migration;
- newly identified cryptographic weakness;
- archive/checkpoint policy; or
- regulatory retention requirement.

### 20.4 Renewal event requirements

A Cryptographic Renewal Event MUST:

- be append-only and separately identified;
- bind the original record hash or complete evidence-package manifest commitment;
- preserve original bytes or their exact immutable reference and digest;
- identify the original cryptographic/canonicalization profile;
- preserve the original proof and proof scope;
- state what was successfully verified during renewal;
- identify the new cryptographic profile;
- identify the renewing witness and proof scope;
- separate renewal-time assertion from independent time proof; and
- avoid any claim of substantive truth, legal authority or restoration of already-lost verification capability.

### 20.5 Renewal semantic axes

Renewal verification MUST distinguish at least:

- original bytes integrity;
- original identity/key resolution;
- present independent verifiability of the original proof;
- bound assertion that verification occurred during renewal;
- independent proof of the renewal time;
- renewal record integrity;
- lineage binding;
- renewal signature/proof; and
- substantive truth applicability.

## 21. Versioning and migration

### 21.1 Immutable historical artifacts

A published/frozen schema, profile, validator, vocabulary or cryptographic profile MUST NOT be changed in place.

One specification/version identifier MUST resolve to one exact byte sequence. A changed artifact requires a new version and registry entry.

### 21.2 Historical verification

Old DDT Records MUST remain verifiable using their original envelope, Preservation Contract and proof rules.

A current verifier MAY support historical formats but MUST identify which historical rules were applied.

### 21.3 Validator defects

Discovery of a defect in an old validator MUST be recorded transparently.

The original Conformance Receipt MUST remain unchanged. A later correction, reassessment or invalidation statement MUST be append-only and linked to the affected receipt/record.

### 21.4 Legacy DDC event schemas

Legacy `DDC-EVENT-*` schemas are upstream event formats and do not define the DDT Record Envelope.

Legacy fields such as `truthScore` MUST be preserved as attributed upstream/evaluator claims when mapped into DDT. They MUST NOT be represented as DDC's own truth judgment.

Known historical identifier collisions MUST be resolved by exact digest and qualified registry ID.

## 22. Conformance classes

### 22.1 DDT Producer

A conforming producer forms records, commitments and required evidence structures deterministically under a bound Preservation Contract.

### 22.2 DDT Registration Validator

A conforming registration validator evaluates all mandatory contract requirements and produces a verifiable Conformance Receipt.

### 22.3 DDT Registrar

A conforming registrar preserves the immutable record and required registration proof without modifying prior records.

### 22.4 DDT Verifier

A conforming verifier independently evaluates defined proof axes, preserves unresolved states and produces reproducible machine-readable results.

### 22.5 DDT Archive/Package Provider

A conforming archive/package provider preserves or exports the exact historical artifacts required by the applicable preservation obligations and offline verification profile.

### 22.6 Enterprise Profile

A conforming Enterprise Profile specializes content and evidence obligations without redefining core DDT semantics.

No implementation may claim a conformance class unless it satisfies every `MUST` applicable to that class and publishes the evidence required by the conformance suite.

## 23. Security considerations

A production profile and implementation MUST evaluate at least:

- record and evidence substitution;
- schema/profile/validator substitution;
- identifier reuse and collision;
- canonicalization ambiguity;
- signature wrapping and proof-scope confusion;
- replay across domains or networks;
- compromised, rotated, expired or revoked keys;
- false or stale authority evidence;
- timestamp backdating and unverifiable local clocks;
- family deletion, insertion, reordering and alternate-history forks;
- missing, altered or selectively disclosed evidence;
- raw-hash dictionary and linkability attacks;
- unavailable DDC-operated services;
- deprecated/compromised algorithms and late renewal;
- misleading overall verification summaries; and
- confusion between cryptographic verification and substantive truth.

Passing cryptographic checks does not establish that a physical-world event occurred as claimed. Profiles requiring physical-world attribution MUST define the external evidence and trust assumptions separately.

## 24. Privacy and data minimization

A profile MUST collect and register only information necessary for its stated verification purpose.

Implementations MUST support separation between publicly shareable DDT commitments and access-controlled evidence.

Retention, erasure, confidentiality and disclosure obligations applicable to off-chain content remain the responsibility of the evidence owner/custodian under the applicable policy and law. DDT immutability MUST NOT be misrepresented as permission to publish protected content.

## 25. Governance and registries

DDC MUST maintain versioned registries for:

- standards and schemas;
- Enterprise Profiles;
- Preservation Contract artifacts;
- validation rule sets;
- validator implementations;
- canonicalization profiles;
- cryptographic profiles;
- relationship vocabularies;
- verification axes and reason codes; and
- deprecated or prohibited artifacts.

Each registry entry MUST provide lifecycle status, exact version, digest and immutable reference. Normative governance MUST define who may publish, deprecate or supersede entries and how conflicting/colliding historical artifacts are represented.

## 26. Claim discipline

Public and implementation claims MUST match available evidence.

In particular:

- a draft is not a final standard;
- a passing fixture is not production deployment validation;
- an integration design is not an implemented integration;
- a valid signature is not verified identity or authority;
- an asserted time is not independently proven time;
- record integrity is not document availability;
- conformance is not substantive correctness; and
- exact target identity is not necessarily complete historical semantic resolution.

## 27. Candidate-to-final acceptance criteria

This draft MUST NOT advance to final status until:

1. the DDT Record Envelope and all mandatory companion schemas are complete;
2. all exact canonicalization and commitment inputs are frozen;
3. Preservation Contract, Enterprise Profile, Evidence Manifest, Conformance Receipt, Verification Result, Offline Package and Renewal Event formats are defined;
4. every normative requirement is mapped in the requirements traceability matrix;
5. every testable `MUST` has positive and negative fixtures;
6. historical v0.1 and candidate-version verification behavior is demonstrated;
7. PCR, HTB, HSR and CRR boundary cases pass their stated acceptance conditions;
8. offline verification succeeds with DDC-operated services unavailable;
9. at least one independent implementation or bounded reproduction confirms interoperability-critical results;
10. a security/threat-model review is completed;
11. known limitations and unresolved dependencies are published;
12. public claims are reviewed against implementation evidence; and
13. final artifacts are versioned, hashed, immutably published and entered in the DDT Version Registry.

## Appendix A — Mandatory companion artifacts

The final standard package is incomplete without:

1. DDT Record Envelope specification and JSON Schema;
2. Preservation Contract specification and JSON Schema;
3. Enterprise Profile base specification and at least two domain examples;
4. Evidence Manifest specification and JSON Schema;
5. Conformance Receipt specification and JSON Schema;
6. Verification Result/Axis Registry specification and JSON Schema;
7. registration, identity/authority and time-proof profiles;
8. Offline Verification Package specification;
9. Cryptographic Renewal Event specification and JSON Schema;
10. reference registration validator;
11. independent/offline verifier;
12. positive and tampered fixtures;
13. requirements traceability matrix;
14. version registry and decision log;
15. security considerations/threat model;
16. migration and backward-verification guidance; and
17. conformance and interoperability report.

## Appendix B — Initial boundary cases

- `CASE-HTB-01` — historical target identity binding versus semantic meaning.
- `CASE-HSR-01A` — required committed dependency lost or altered after commitment.
- `CASE-HSR-01B` — context outside the registration-time preservation contract.
- `CASE-PCR-01` — historical Preservation Contract reproducibility.
- `CASE-CRR-01` — append-only cryptographic renewal with original proof-scope preservation.

---

**End of DDC Token Record Standard v2.0 Draft (`2.0.0-draft.1`)**
