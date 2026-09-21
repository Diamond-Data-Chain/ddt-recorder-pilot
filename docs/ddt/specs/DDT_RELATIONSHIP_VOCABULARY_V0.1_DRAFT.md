# DDT Relationship Vocabulary v0.1 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-RELATIONSHIP-VOCABULARY-0.1-DRAFT.1`  
**Version:** `0.1.0-draft.1`  
**Status:** DRAFT — not approved for production conformance claims  
**Date:** 2026-09-04  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`  
**Envelope target:** `DDT-ENVELOPE-0.3-DRAFT.2`

## 1. Purpose

This specification defines the controlled baseline vocabulary and verification rules for typed links from one immutable DDT Record to another.

It makes the following distinctions explicit:

- a target record identity is not a human-readable display identifier;
- a target identity binding is not merely a target hash copied without context;
- a committed relationship assertion is not proof that the assertion is substantively correct;
- chronological family continuity is not semantic succession;
- correction, dispute, reversal, replacement and supersession are different assertions;
- a relationship's committed existence is separate from the identity, authority and evidence supporting it; and
- a later record never edits, deletes or silently changes the meaning of an earlier record.

## 2. Normative companion artifacts

The canonical baseline vocabulary artifact is:

```text
profiles/ddt-base-relationship-vocabulary-v0.1.json
```

It MUST conform to:

```text
schemas/ddt-relationship-vocabulary-v0.1.schema.json
```

The exact vocabulary bytes MUST be bound as `preservationContract.artifacts.relationshipVocabulary`. The registration-time Conformance Receipt MUST list and evaluate the exact artifact. An Offline Verification Package MUST preserve the exact bytes and digest.

A version label or mutable URL alone is insufficient for historical interpretation.

## 3. Relationship carrier

This vocabulary applies to each member of:

```text
relationships.relatedRecords[]
```

under `DDT-ENVELOPE-0.3-DRAFT.2`.

Every base relationship entry MUST contain:

- `targetRecordId` — the permanent identifier of exactly one immutable target DDT Record;
- `targetRecordHash` — the exact committed hash of that target record;
- `relationshipType` — one code defined by the historically bound vocabulary.

The relationship entry MAY contain `assertedBy` and `evidenceRefs`, but the bound vocabulary or Enterprise Profile can make them mandatory for a type.

The current DDT Record containing the relationship is the **source record**. The record named by `targetRecordId` is the **target record**.

All base relationship codes use `SOURCE_TO_TARGET` direction. A verifier MUST NOT reverse an edge or synthesize an inverse edge.

## 4. Target identity and commitment binding

### 4.1 Exact target

At registration, the validator MUST resolve `targetRecordId` to exactly one DDT Record in the applicable registration domain and verify that its registered `recordHash` equals `targetRecordHash`.

The validator MUST reject:

- an unresolved target;
- a target identifier that resolves ambiguously;
- a target hash mismatch;
- a self-reference where source and target `ddtRecordId` are equal; or
- use of `displayId` as the cryptographic target.

Target availability during a later verification is a separate result. Later unavailability does not alter the bytes or integrity of the referring record, but target-binding re-verification becomes `UNAVAILABLE` when required target evidence cannot be obtained.

### 4.2 Historical meaning

Successful target identity and hash verification establishes which historical DDT Record was named. It does not automatically establish every external definition, policy, authority state or other semantic dependency needed to interpret that target.

Therefore these outcomes may coexist:

```text
HISTORICAL_TARGET_IDENTITY = BOUND
TARGET_COMMITMENT_BINDING = BOUND
HISTORICAL_SEMANTIC_RESOLUTION = PARTIAL
```

## 5. Baseline relationship codes

### 5.1 `REFERENCES`

The source asserts that it cites or points to the target for context.

It does not by itself assert dependency, agreement, disagreement, derivation, correction, replacement, reversal, succession or target invalidity.

### 5.2 `RESPONDS_TO`

The source asserts that it is a response to the target.

It does not imply agreement, dispute resolution, correction, replacement or that the response was accepted.

### 5.3 `DISPUTES`

The source asserts a challenge to a claim, interpretation, authority, result or other scoped aspect of the target.

It does not establish that the dispute is justified or resolved and does not invalidate the target.

### 5.4 `CORRECTS`

The source asserts that it supplies a correction to a specifically identified aspect of the target.

It does not erase the target, prove that the target was wrong or imply full replacement. The correction scope MUST be recoverable from committed evidence under the Enterprise Profile. If the scope cannot be resolved later, the committed `CORRECTS` assertion may remain intact while its semantic effect is `UNRESOLVED` or `PARTIAL`.

### 5.5 `REMEDIES`

The source asserts that it records an action or state intended to remedy a specifically identified issue associated with the target.

It does not prove that the remedy was adequate, successful or legally sufficient and does not automatically replace the target.

### 5.6 `SUPERSEDES`

The source asserts that it takes precedence over the target for a defined semantic scope from the asserted effective boundary onward.

It does not delete or alter the target, does not apply outside the recoverable scope and does not prove authority to supersede. The applicable scope, effective-boundary evidence and required authority MUST be defined by the Enterprise Profile and preserved through committed evidence.

### 5.7 `REVERSES`

The source asserts that a defined target outcome, decision or state is reversed within a specified scope.

It does not erase the historical target or prove that the reversal was authorized, effective or substantively justified.

### 5.8 `REPLACES`

The source asserts that it substitutes for the target in a defined role or use.

Replacement does not imply that the target was incorrect, does not erase the target and does not necessarily imply reversal. Scope, effective boundary and authority MUST be recoverable where required by the Enterprise Profile.

### 5.9 `DERIVED_FROM`

The source asserts that its content or result was produced using or transforming the target.

It does not imply byte equality, semantic equivalence, endorsement, correctness or complete disclosure of the derivation procedure. A profile claiming reproducible derivation MUST separately require the procedure, inputs, versions and evidence needed to reproduce it.

### 5.10 `CONFIRMS_ASSERTION`

The source asserts support for a specifically scoped assertion contained in the target.

It does not confirm every statement in the target and does not make the confirmed assertion substantively true merely because the relationship was committed.

### 5.11 `CONTRADICTS_ASSERTION`

The source asserts conflict with a specifically scoped assertion contained in the target.

It does not establish which assertion is correct and does not invalidate the target as a whole.

## 6. Type classes and minimum evidence rules

The baseline artifact assigns each type to one class:

- `REFERENCE` — contextual pointer without semantic state effect;
- `DIALOGUE` — response or dispute assertion;
- `SUCCESSION` — claimed correction, supersession, reversal or replacement;
- `REMEDIATION` — claimed remedy;
- `PROVENANCE` — derivation assertion; or
- `ASSERTION_EVALUATION` — claimed confirmation or contradiction of a scoped assertion.

For `REFERENCES`, `assertedBy` and `evidenceRefs` are optional unless an Enterprise Profile requires them.

For all other baseline types:

- `assertedBy` is REQUIRED;
- `assertedBy.identityRef` is REQUIRED;
- at least one `evidenceRefs` member is REQUIRED; and
- every evidence reference MUST resolve to an entry in the committed Evidence Manifest.

For `CORRECTS`, `SUPERSEDES`, `REVERSES`, `REPLACES`, `CONFIRMS_ASSERTION` and `CONTRADICTS_ASSERTION`, committed evidence MUST make the affected semantic scope identifiable under the historically applicable Enterprise Profile.

For a relationship with a claimed institutional, legal or operational state effect, the Enterprise Profile MUST identify the required historical authority evidence and verification procedure. A valid relationship commitment without resolved authority MUST NOT be presented as an effective authorized succession.

## 7. Chronology and succession

`previousRecordInFamily` is not a member of this typed vocabulary. It establishes the claimed immediate structural predecessor and exact predecessor hash for one DDT family.

It does not imply any of the base relationship types.

A later registration, a higher family position or a `LATEST` discovery label MUST NOT be treated as an implicit correction, replacement, reversal or supersession.

Semantic succession exists only when:

1. the exact typed relationship is committed;
2. the target identity and commitment bind successfully;
3. required assertion evidence is available and valid;
4. required asserter identity and authority resolve under the historical profile;
5. the relationship scope and effective boundary resolve; and
6. no applicable profile rule produces an unresolved conflict.

Failure of items 3–6 does not rewrite the relationship bytes. It limits the separately reported semantic-effect result.

## 8. No implicit graph inference

No base relationship is transitive or symmetric for DDT verification purposes.

Accordingly:

- `A REFERENCES B` and `B REFERENCES C` do not establish `A REFERENCES C`;
- `A CONFIRMS_ASSERTION B` does not establish that B confirms A;
- `A SUPERSEDES B` and `B SUPERSEDES C` may describe a succession path, but a verifier MUST NOT invent an uncommitted direct `A SUPERSEDES C` edge; and
- `A CONTRADICTS_ASSERTION B` does not automatically create a reverse committed edge.

A derived graph view MAY display traversed paths, but every derived edge or conclusion MUST be labeled as derived, identify its derivation profile and preserve the underlying committed edges.

## 9. Duplicate, ordering and conflict handling

### 9.1 Deterministic order

`relatedRecords` MUST be sorted by:

1. normalized `relationshipType`;
2. normalized `targetRecordId`;
3. lowercase `targetRecordHash.value`.

Each `evidenceRefs` array MUST contain unique values sorted in ascending Unicode code-point order.

### 9.2 Duplicate tuple

The tuple:

```text
(relationshipType, targetRecordId, targetRecordHash.value)
```

MUST be unique in one source record.

### 9.3 Multiple assertions and conflicts

Multiple different relationships to the same target are allowed only when every entry satisfies its own evidence and authority rules.

Conflicting committed assertions are preserved as conflicts. A validator MUST NOT delete one, select a winner or collapse them into a single relation unless an exact Enterprise Profile contains a deterministic conflict rule that was applicable at registration.

Preserving a conflict does not make the record structurally invalid when the historical contract permitted it. Resolution remains a separate result.

## 10. Vocabulary closure and extensions

The baseline vocabulary is closed for `DDT-ENVELOPE-0.3-DRAFT.2` because that envelope's schema enumerates the eleven base codes.

An implementation claiming Draft.2 conformance MUST reject an unknown relationship type with `RELATIONSHIP_TYPE_UNKNOWN`.

A future envelope version MAY permit namespaced extensions only when:

- the extension vocabulary has a globally unique identifier and version;
- its exact bytes and digest are bound by the Preservation Contract;
- every code has a non-conflicting machine-readable definition;
- its direction, evidence, scope, authority, inference and conflict rules are explicit;
- the Enterprise Profile permits it; and
- the verifier has the exact required schema and procedure.

An unavailable required extension produces `UNAVAILABLE` or `UNRESOLVED` according to the historical contract. It MUST NOT be interpreted as `REFERENCES` or ignored.

## 11. Verification outputs

Relationship verification MUST keep at least these questions separate using the applicable Verification Result axes:

- `RELATIONSHIP_ASSERTION_INTEGRITY` — was the exact relationship assertion committed without alteration;
- `HISTORICAL_TARGET_IDENTITY` — is the exact immutable target identity bound;
- `TARGET_COMMITMENT_BINDING` — does the target record match the committed target hash;
- `RELATIONSHIP_ASSERTION_AUTHORITY` — was the relationship assertion made with the historically required authority;
- `HISTORICAL_SEMANTIC_RESOLUTION` — does enough historically applicable context survive to interpret the relationship's scoped meaning.

`FAMILY_CONTINUITY` is separately evaluated for `previousRecordInFamily`.

A verifier MUST NOT replace these results with one generic `RELATIONSHIP_VALID` value.

## 12. Validation error codes

Implementations MUST use stable machine-readable reason codes. The baseline defines:

- `RELATIONSHIP_TYPE_UNKNOWN`;
- `RELATIONSHIP_EXTENSION_UNBOUND`;
- `RELATIONSHIP_TARGET_SELF`;
- `RELATIONSHIP_TARGET_UNRESOLVED`;
- `RELATIONSHIP_TARGET_AMBIGUOUS`;
- `RELATIONSHIP_TARGET_HASH_MISMATCH`;
- `RELATIONSHIP_DUPLICATE`;
- `RELATIONSHIP_ORDER_INVALID`;
- `RELATIONSHIP_ASSERTED_BY_REQUIRED`;
- `RELATIONSHIP_EVIDENCE_REQUIRED`;
- `RELATIONSHIP_EVIDENCE_UNRESOLVED`;
- `RELATIONSHIP_SCOPE_UNRESOLVED`;
- `RELATIONSHIP_AUTHORITY_UNRESOLVED`;
- `RELATIONSHIP_EFFECTIVE_BOUNDARY_UNRESOLVED`; and
- `RELATIONSHIP_CONFLICT_UNRESOLVED`.

An Enterprise Profile MAY define additional namespaced codes but MUST NOT redefine a base code.

## 13. Registration validation procedure

For each related-record entry, a conforming registration validator MUST:

1. resolve the exact contract-bound relationship vocabulary;
2. verify vocabulary artifact availability, digest and schema conformance;
3. confirm that `relationshipType` is permitted by the vocabulary and Enterprise Profile;
4. verify the target is not the source record;
5. resolve `targetRecordId` to one immutable DDT Record;
6. compare its registered `recordHash` to `targetRecordHash`;
7. apply the type's `assertedBy`, asserter-identity, evidence and scope requirements;
8. resolve all `evidenceRefs` to the committed Evidence Manifest;
9. evaluate any Enterprise Profile authority and effective-boundary requirements;
10. verify deterministic relationship and evidence-reference ordering;
11. reject duplicate tuples;
12. preserve conflicts permitted by the profile without inventing resolution; and
13. emit per-rule Conformance Receipt results and separate verification axes.

The validator MUST NOT infer substantive truth from a passing relationship rule.

## 14. Required fixtures before candidate status

At minimum, the following fixtures are required:

1. `REFERENCES` with exact target ID and hash;
2. target ID correct but target hash altered;
3. target hash copied under a different target ID;
4. target unavailable at later verification;
5. self-reference;
6. unknown relationship type;
7. duplicate tuple;
8. non-canonical relationship ordering;
9. strong relationship missing `assertedBy`;
10. strong relationship missing evidence;
11. evidence reference absent from the Evidence Manifest;
12. predecessor link with no succession relationship;
13. `CORRECTS` with resolved target but unresolved correction scope;
14. `SUPERSEDES` with valid assertion integrity but unresolved authority;
15. `DISPUTES` preserved without treating either side as correct;
16. `DERIVED_FROM` without falsely claiming reproducibility;
17. contradictory relations preserved as conflict;
18. transitive-edge inference attempt rejected or labeled derived;
19. relationship entry one-byte tamper changing `recordHash`; and
20. historical target identity `BOUND` with semantic resolution `PARTIAL`.

## 15. Claim boundary

For a conforming relationship:

```text
relationship assertion committed
  != relationship assertion substantively correct

target identity and hash bound
  != all historical target meaning recovered

later record present
  != earlier record superseded

succession assertion intact
  != succession authority or effectiveness proven
```

DDT preserves what relationship was asserted, by whom where captured, against which immutable target and under which historical preservation rules. It does not invent missing relationship meaning and does not turn an asserted edge into factual or legal truth.
