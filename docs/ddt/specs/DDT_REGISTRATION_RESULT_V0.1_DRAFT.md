# DDT Registration Result v0.1 Draft

**Standard identifier:** `DDT-REGISTRATION-RESULT-0.1-DRAFT.1`

**Status:** Active development draft; not approved for production conformance claims.

## 1. Purpose

The DDT Registration Result is the immutable post-registration artifact that records the outcome of one successfully accepted DDT registration.

It bridges the boundary between:

- the finalized pre-registration DDT Record and its `recordHash`;
- the signed or otherwise integrity-protected registration statement;
- the Registrar or registration mechanism that accepted the registration;
- the permanent DDT Number assigned by that successful registration; and
- later ordering, checkpoint, network-finality and historical-verification evidence.

The Registration Result does not replace the DDT Record Envelope, Conformance Receipt, Registration Proof, Network Finality Evidence or Verification Result.

## 2. Scope boundary

This artifact represents only a successful DDT registration.

A rejected, failed, reverted, unauthorized or otherwise unsuccessful registration attempt MUST NOT produce a conforming DDT Registration Result and MUST NOT receive a DDT Number or registered-record sequence position.

Failed attempts MAY be preserved in a separate operational audit log or another explicitly typed failure artifact, but MUST NOT be represented as registered DDT Records.

## 3. Identity layers

The following values have distinct meanings:

- `ddtRecordId` identifies exactly one immutable DDT Record before registration and participates in `recordHash`;
- `ddtFamilyId` identifies a chronological DDT record family and is not the identity of one registration;
- `subject.reference` is an upstream or organization-scoped subject identifier;
- `displayId` is an optional pre-registration human discovery label;
- `ddtNumber` is the permanent post-registration DDT Number assigned only after successful registration;
- `registrationSequence` is the numeric registered-record position from which the applicable profile derives the canonical DDT Number.

`ddtNumber` MUST NOT replace `ddtRecordId` as the cryptographic record identity.

`ddtNumber` MUST NOT participate retroactively in `recordHash`.

## 4. Required structure

A conforming Registration Result MUST contain at minimum:

- `specification`;
- `resultId`;
- `sequenceDomain`;
- `registrationSequence`;
- `ddtNumber`;
- `ddtRecordId`;
- `recordHash`;
- `registrationStatementHash`;
- `registrar`;
- `registrationTimeClaim`; and
- `mechanismEvidenceRefs`.

The exact JSON representation is defined by the companion Registration Result schema.

## 5. `resultId`

`resultId` MUST uniquely identify exactly one immutable Registration Result artifact.

It MUST NOT be reused for another registration result.

The baseline identifier method SHOULD follow the active DDT Identifier Profile unless a future Registration Result profile defines a different exact method.

## 6. Registered sequence

### 6.1 `sequenceDomain`

`sequenceDomain` identifies the exact domain in which `registrationSequence` is allocated.

A production registration profile MUST define the domain scope and resolution rules.

Two equal numeric sequence values in different sequence domains MUST NOT be assumed to identify the same registration.

### 6.2 `registrationSequence`

`registrationSequence` MUST be a non-negative integer position allocated only as part of successful DDT registration.

Within one sequence domain, the applicable registration profile MUST define:

- allocation authority;
- allocation atomicity;
- strict ordering rules;
- non-reuse behavior;
- concurrency behavior;
- failure/revert behavior;
- duplicate/replay behavior; and
- resolution from sequence position to the exact registered DDT Record.

For the baseline successful-registration sequence, failed registration attempts do not consume registered DDT positions.

## 7. DDT Number

Every conforming successful DDT registration MUST receive exactly one permanent `ddtNumber`.

The DDT Number:

- MUST be unique within the registration domain defined by the applicable profile;
- MUST never be reassigned to another DDT Record;
- MUST resolve to exactly one successful Registration Result;
- MUST remain permanently bound to the same `ddtRecordId`, `recordHash` and `registrationStatementHash`;
- MUST be deterministically derived from the assigned `registrationSequence` according to the applicable DDT Number profile; and
- MUST NOT be independently allocated from a second parallel counter.

The production profile MUST define the exact canonical textual syntax, prefix, width/range rules and parsing behavior.

## 8. Registration binding

A conforming Registration Result MUST bind the exact:

- `ddtRecordId`;
- `recordHash`;
- `registrationStatementHash`;
- `sequenceDomain`;
- `registrationSequence`;
- `ddtNumber`; and
- Registrar or registration mechanism identity.

A later verifier MUST reject or report conflict when any of these values resolve inconsistently.

## 9. Registrar

The `registrar` object identifies the component or mechanism that accepted the registration and assigned the registered position.

The generic DDT standard does not require one specific implementation.

Examples may include:

- a DDT Reference Registrar used for development and interoperability testing;
- an enterprise or consortium registration mechanism permitted by an exact profile; or
- a future DDC Network Registrar.

A production profile MUST define how Registrar identity, authority and historical state are verified.

## 10. Registration time

`registrationTimeClaim` is the Registrar's claimed registration time.

It MUST NOT automatically be treated as independently proven UTC time.

Independent time proof, network ordering and network finality remain separate proof questions under their applicable DDT profiles.

## 11. Mechanism evidence

`mechanismEvidenceRefs` MAY reference mechanism-specific evidence proving the successful registration.

Depending on the applicable profile, such evidence may include:

- durable registrar log commitments;
- transaction identifiers;
- execution results;
- registry events;
- state proofs;
- block references;
- inclusion proofs;
- finality evidence; or
- external transparency/checkpoint evidence.

The generic Registration Result MUST NOT require a blockchain transaction because the generic DDT standard does not hard-code one network mechanism.

A future DDC Network Registration Profile MAY make DDC transaction, execution, block and finality evidence mandatory.

## 12. Relationship to `REGISTERED_RECORD_SEQUENCE`

When the applicable Time Checkpoint Profile uses `REGISTERED_RECORD_SEQUENCE`, the checkpoint leaf `sequence` MUST equal the Registration Result's `registrationSequence` for the same `sequenceDomain`.

An implementation MUST NOT maintain an independent checkpoint sequence counter for the same registered-record sequence domain.

## 13. Immutability

A published Registration Result MUST NOT be modified.

A later correction, dispute, re-registration, reassessment or network-status change creates a new append-only artifact and MUST NOT rewrite the original Registration Result.

The DDT Number and registration sequence assigned to the original successful registration remain unchanged.

## 14. Reconstruction

Given a DDT Number, an independent verifier SHOULD be able to resolve the exact Registration Result and from it the bound `ddtRecordId`, `recordHash`, `registrationStatementHash`, `sequenceDomain`, `registrationSequence`, Registrar identity and applicable historical DDT artifacts.

Unavailable later evidence MUST be reported according to the applicable Verification Result semantics and MUST NOT cause the Registration Result to be silently rewritten.

## 15. Security considerations

Implementations MUST evaluate at least:

- duplicate DDT Number assignment;
- sequence reuse;
- concurrent registration races;
- pre-allocation omission;
- independent parallel counters;
- DDT Number / sequence mismatch;
- `ddtRecordId` substitution;
- `recordHash` substitution;
- `registrationStatementHash` substitution;
- Registrar impersonation;
- replay of an earlier successful Registration Result;
- mechanism-evidence substitution; and
- historical Registrar identity or authority ambiguity.

## 16. Required fixtures before candidate status

At minimum:

1. first successful registration;
2. multiple sequential successful registrations;
3. rejected registration receives no DDT Number;
4. failed or reverted registration consumes no registered position;
5. duplicate exact replay;
6. conflicting reuse of an existing `ddtRecordId`;
7. concurrent registration atomicity;
8. duplicate DDT Number rejection;
9. sequence reuse rejection;
10. DDT Number / sequence mismatch rejection;
11. `recordHash` substitution;
12. `registrationStatementHash` substitution;
13. Registrar substitution;
14. registered-sequence checkpoint reconciliation;
15. historical lookup from DDT Number to exact record;
16. complete offline reconstruction from preserved artifacts; and
17. two independent implementations reproducing the same successful registration bindings.

## 17. Claim boundary

A valid DDT Registration Result may establish that a defined Registrar or registration mechanism accepted a specific DDT Record commitment and assigned it a permanent DDT Number and registered-record sequence position.

It does not, by itself, prove substantive truth of upstream content, legal validity, signer authority, independently proven time, blockchain inclusion, network finality, event-history completeness or continued availability of external evidence.

Those remain separate verification axes and companion-proof responsibilities.
