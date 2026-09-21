# DDT Identifier Profile v0.1 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-IDENTIFIER-PROFILE-0.1-DRAFT.1`  
**Version:** `0.1.0-draft.1`  
**Status:** DRAFT — not approved for production conformance claims  
**Date:** 2026-09-03  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`  
**Envelope target:** `DDT-ENVELOPE-0.3-DRAFT.2`

## 1. Purpose

This profile defines the exact baseline syntax, generation, comparison, uniqueness, replay and collision behavior for:

- `identity.ddtRecordId`;
- `identity.ddtFamilyId`;
- `identity.subject.namespace`;
- `identity.subject.reference`; and
- optional `identity.displayId`.

It prevents identifier ambiguity, circular record identity, silent reuse and accidental reliance on human-readable labels.

## 2. Normative references and baseline

UUID construction follows IETF RFC 9562. The baseline uses UUID version 4 with the RFC variant because it can be generated before record commitment without deriving identity from mutable business content, timestamps, network order or `recordHash`.

The identifier string uses the standard UUID URN form `urn:uuid:<uuid>`. DDT does not define or depend on a private or unregistered URN namespace. The containing DDT field determines whether the UUID acts as a record, family or subject-namespace identifier.

The UUID generator MUST use a cryptographically secure pseudorandom number generator. UUID values MUST be treated as opaque identifiers. They are not timestamps, credentials, authority evidence or security capabilities.

## 3. Core distinctions

The following values are different identity layers:

- `ddtRecordId` identifies exactly one immutable DDT Record;
- `ddtFamilyId` identifies one chronological record family;
- `subject.namespace` scopes interpretation of an external/local subject reference;
- `subject.reference` identifies the subject only inside that namespace; and
- `displayId` is a human discovery label.

Equality at one layer MUST NOT be inferred from equality at another layer.

## 4. Profile artifact

The canonical baseline profile artifact is `profiles/ddt-identifier-profile-v0.1.json`. It MUST conform to `schemas/ddt-identifier-profile-v0.1.schema.json`.

Every Enterprise Profile using this identifier method MUST bind the exact profile artifact by version and digest through `compatibility.requiredArtifacts`. The registration-time Conformance Receipt MUST list the exact artifact in `artifactEvaluations`. An Offline Verification Package MUST preserve the exact bytes.

An implementation MUST NOT select a current identifier profile by an unversioned URL when verifying a historical record.

## 5. Canonical UUID text

The UUID text component MUST:

- contain exactly 36 ASCII characters;
- use the `8-4-4-4-12` hexadecimal-and-hyphen form;
- use lowercase hexadecimal letters only;
- encode UUID version 4;
- encode the RFC 9562 variant;
- contain no braces, whitespace, prefix or suffix; and
- not equal the Nil UUID or Max UUID.

Canonical UUIDv4 pattern:

```text
[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}
```

A verifier MUST reject a non-canonical textual representation. It MUST NOT silently lowercase, trim or reformat committed identifier text.

## 6. DDT Record identifier

### 6.1 Syntax

```text
urn:uuid:<uuidv4>
```

Example:

```text
urn:uuid:4f35a8d2-34d4-4cc7-aee0-3e6c6c05bd17
```

The complete identifier is ASCII and MUST match:

```text
^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

### 6.2 Generation

The producer MUST generate the UUIDv4 using a CSPRNG before `recordHash` is computed.

`ddtRecordId` MUST NOT be derived from:

- `recordHash`;
- a hash input that already contains `ddtRecordId`;
- `displayId`;
- subject reference alone;
- event or registration time alone;
- a database sequence alone; or
- mutable external business content.

The identifier participates in the committed `identity` object and therefore in `recordHash`.

### 6.3 Permanence

One `ddtRecordId` identifies one immutable DDT Record forever. It MUST NOT be reassigned, recycled, redirected or reused for a correction, migration, renewal, re-registration or later state.

A changed record receives a new `ddtRecordId`.

## 7. DDT Family identifier

### 7.1 Syntax

```text
urn:uuid:<uuidv4>
```

The complete identifier MUST match:

```text
^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

### 7.2 Genesis

A family-genesis record creates a new CSPRNG-generated UUIDv4 family identifier and omits `previousRecordInFamily`.

### 7.3 Continuation

A non-genesis family record MUST:

- use a new `ddtRecordId`;
- copy the exact `ddtFamilyId` from its immediate predecessor; and
- bind the predecessor's exact `ddtRecordId` and `recordHash`.

A family identifier does not prove that the records concern the same substantive real-world matter. It proves the committed family grouping and, with valid predecessor bindings, claimed structural continuity.

### 7.4 Merge and split

One DDT Record belongs to exactly one chronological family.

A merge of multiple prior lines MUST create a new family and use typed related-record edges to the source records. A split MUST create new family identifiers for the new lines and use typed related-record edges to the source. Merge/split semantics MUST NOT be represented by silently reusing or changing earlier family identifiers.

## 8. Subject namespace

### 8.1 Syntax

The baseline DDT subject namespace identifier uses the same standard UUID URN form. Its role is determined by the `subject.namespace` field, not by inventing an unregistered URN namespace:

```text
urn:uuid:<uuidv4>
```

The complete namespace MUST match:

```text
^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

The namespace UUID is generated with the same UUIDv4/CSPRNG rules. It is stable and MUST NOT be repurposed for a different semantic scope.

### 8.2 Namespace meaning and control

The namespace value prevents collisions; it does not alone prove who controls the namespace or what it means.

An Enterprise Profile MUST bind an exact namespace assignment, registry state or equivalent evidence defining:

- the namespace identifier;
- its semantic scope;
- asserted controller;
- permitted subject-reference class;
- lifecycle state where applicable; and
- authority/provenance evidence required by the profile.

Namespace-control, assignment and historical applicability are separate verification questions. An unresolved namespace assignment does not permit the verifier to substitute a current organization or naming convention.

## 9. Subject reference

`subject.reference` is a non-empty UTF-8 string interpreted only inside the exact `subject.namespace` and Enterprise Profile.

The producer MUST supply it in Unicode Normalization Form C (NFC). It MUST NOT:

- contain Unicode control characters;
- contain an unpaired surrogate;
- begin or end with Unicode whitespace; or
- exceed 512 UTF-8 bytes under this baseline.

The validator checks that the submitted value is already canonical. It MUST reject, not silently normalize, a non-NFC or whitespace-ambiguous value.

After validation, equality comparison uses the exact committed code-point sequence. Two equal reference strings under different namespaces MUST NOT be treated as the same subject.

An Enterprise Profile MAY impose a stricter subject-reference syntax and length, but MUST NOT weaken the baseline ambiguity protections.

## 10. Human-readable display identifier

`displayId` is optional. It MAY be readable, sequential or organization-specific.

It:

- need not be globally unique;
- MUST NOT be the target of a cryptographic relationship;
- MUST NOT replace `ddtRecordId` in verification;
- MUST NOT determine family continuity; and
- MUST NOT be treated as authority or provenance evidence.

When present, its exact bytes remain committed through the envelope identity object.

## 11. Atomic uniqueness and collision handling

### 11.1 Producer checks

The producer SHOULD reject an identifier already known in its local generation scope and generate a fresh UUIDv4.

Local absence is not sufficient for registration. The registrar is authoritative only for whether that identifier is already registered in the registration domain being verified.

### 11.2 Registrar checks

Registration MUST perform an atomic create-if-absent operation on normalized `ddtRecordId`. A read followed by a non-atomic write is non-conformant because two concurrent registrations could pass the same preliminary check.

The registrar MUST maintain a permanent non-reuse constraint for every accepted `ddtRecordId`.

The registration domain MUST also maintain one permanent UUID-role index covering accepted `ddtRecordId`, `ddtFamilyId` and `subject.namespace` UUID components. A UUID component first accepted in one of those roles MUST NOT later be allocated in either of the other roles. An attempted cross-role allocation MUST fail with `UUID_ROLE_REUSE`.

This cross-role rule prevents one standard `urn:uuid:` value from acquiring multiple DDT meanings. It does not make the UUID a credential, prove authority over a namespace or remove the need to validate each field in context.

### 11.3 Exact replay

If the same `ddtRecordId` is submitted again and the complete committed record identity, `recordHash` and registration package match the existing registration exactly, the registrar MUST classify the request as `EXACT_REPLAY_DETECTED`.

It MUST return or reference the existing registration and MUST NOT create a second DDT Record, second ordering position or new registration time claim.

### 11.4 Conflicting reuse or collision

If an existing `ddtRecordId` is presented with a different `recordHash`, identity object or registration package, registration MUST fail with `DDT_RECORD_ID_COLLISION_OR_REUSE`.

The existing record remains unchanged. The rejected submission MUST NOT overwrite, merge with or become a new version of the existing record. A producer MAY retry only with a newly generated `ddtRecordId`.

### 11.5 Family identifier conflicts

A new family-genesis record MUST allocate a family UUID component not already registered in the family role. Attempted reuse of an existing family identifier for another genesis MUST fail with `FAMILY_ID_COLLISION_OR_REUSE`.

An existing family identifier may otherwise be used only under the continuation rules in Section 7. A non-genesis record with an absent, unresolved or mismatching predecessor MUST fail family-continuity validation even if its UUID syntax is valid.

## 12. Comparison rules

For canonical DDT record, family and namespace identifiers:

- comparison is byte-for-byte ASCII equality;
- comparison is case-sensitive;
- no percent-decoding is performed;
- no URI redirect or alias is followed;
- no whitespace trimming is performed; and
- no current registry state may rewrite historical identity.

For subject references, Section 9 applies.

## 13. Stable result and error codes

The base codes are:

- `IDENTIFIER_SYNTAX_INVALID`;
- `UUID_VERSION_INVALID`;
- `UUID_VARIANT_INVALID`;
- `UUID_CANONICAL_CASE_INVALID`;
- `UUID_NIL_OR_MAX_FORBIDDEN`;
- `UUID_ROLE_REUSE`;
- `DDT_RECORD_ID_COLLISION_OR_REUSE`;
- `EXACT_REPLAY_DETECTED`;
- `FAMILY_ID_COLLISION_OR_REUSE`;
- `FAMILY_ID_MISMATCH`;
- `FAMILY_PREDECESSOR_REQUIRED`;
- `FAMILY_PREDECESSOR_FORBIDDEN_FOR_GENESIS`;
- `SUBJECT_NAMESPACE_SYNTAX_INVALID`;
- `SUBJECT_NAMESPACE_ASSIGNMENT_UNRESOLVED`;
- `SUBJECT_REFERENCE_NOT_NFC`;
- `SUBJECT_REFERENCE_UNPAIRED_SURROGATE`;
- `SUBJECT_REFERENCE_WHITESPACE_AMBIGUOUS`;
- `SUBJECT_REFERENCE_CONTROL_CHARACTER`;
- `SUBJECT_REFERENCE_TOO_LONG`; and
- `DISPLAY_ID_USED_AS_CRYPTOGRAPHIC_IDENTITY`.

`EXACT_REPLAY_DETECTED` is an idempotency outcome, not a new successful registration and not evidence of a collision attack.

## 14. Verification axes

Identifier verification contributes to, but does not collapse:

- `DDT_RECORD_IDENTITY`;
- `FAMILY_CONTINUITY`;
- `HISTORICAL_TARGET_IDENTITY`;
- `REGISTRANT_IDENTITY`; and
- `PRESERVATION_CONTRACT_APPLICABILITY` where namespace assignment affects applicability.

Valid syntax alone does not produce `VERIFIED` identity. Resolution, commitment binding, registration non-reuse and relevant authority evidence remain separate dependencies.

## 15. Privacy and security

Identifiers MUST NOT embed names, email addresses, account numbers, vehicle identifiers, case numbers, timestamps or other business/PII values. Those belong in the profile-governed subject reference or protected evidence as appropriate.

UUIDs MUST NOT be treated as access tokens or secrets. Authorization must be enforced independently.

A compromised or defective UUID generator is a security incident. Detection does not permit rewriting accepted identifiers. New registrations use a corrected generator; conflicts and affected historical records are handled through append-only findings and migration/renewal procedures.

## 16. Required tests

Before candidate status, the profile MUST pass at least:

1. valid record, family and namespace UUIDv4 values;
2. uppercase UUID rejection;
3. UUIDv1, v5 and v7 rejection under this profile;
4. invalid RFC variant rejection;
5. Nil and Max UUID rejection;
6. braces, whitespace and malformed-hyphen rejection;
7. record-ID reuse with different `recordHash` rejection;
8. reuse of one UUID component across record, family or subject-namespace roles rejects with `UUID_ROLE_REUSE`;
9. exact replay returns the existing registration without a new history position;
10. concurrent duplicate registration atomicity;
11. non-genesis family record with exact predecessor pass;
12. attempted reuse of an existing family identifier for another genesis rejection;
13. family mismatch and missing predecessor rejection;
14. merge and split represented through new families and typed edges;
15. equal subject references under different namespaces remain distinct;
16. unresolved namespace assignment remains unresolved;
17. non-NFC, control-character, unpaired-surrogate, surrounding-whitespace and over-length subject rejection;
18. attempted use of `displayId` as relationship target rejection; and
19. independent implementation reproduces every acceptance and rejection result.

## 17. Claim boundary

Conformance to this profile may establish canonical syntax, practical collision resistance, recorded non-reuse, exact identity binding and structural family continuity.

It does not establish:

- absolute mathematical global uniqueness;
- factual identity of the real-world subject;
- authority over a namespace;
- substantive truth of a record;
- event time; or
- completeness of history.

Those claims require their own evidence and verification axes.

---

**End of DDT Identifier Profile v0.1 Draft (`0.1.0-draft.1`)**
