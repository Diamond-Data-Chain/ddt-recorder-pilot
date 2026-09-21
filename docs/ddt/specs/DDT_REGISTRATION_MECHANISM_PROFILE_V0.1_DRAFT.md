# DDT Registration Mechanism Profile v0.1 — Draft

**Project:** Diamond Data Chain (DDC)
**Specification ID:** `DDT-REGISTRATION-MECHANISM-PROFILE-0.1-DRAFT.1`
**Version:** `0.1.0-draft.1`
**Status:** DRAFT — TEST_ONLY — not approved for production conformance claims
**Date:** 2026-09-10
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`
**Reference mechanism:** `REFERENCE_REGISTRAR`

## 1. Purpose

This profile defines the exact TEST_ONLY registration-mechanism semantics used by the current DDT Reference Registrar.

It is the machine-bindable artifact used by an Enterprise Profile `registration.mechanismProfiles` entry and by `registrationMechanism.profile` in DDT Record Envelope v0.3 Draft.5.

This profile does not define the production DDC Network Registrar, production DDT Number syntax, distributed consensus, blockchain inclusion or network finality.

## 2. Profile identity

The machine-readable profile uses:

```json
{
  "profileId": "ddt.registration.reference-registrar-v1",
  "profileVersion": "0.1.0-draft.1"
}
```

The mechanism identity is:

- mechanism ID: `REFERENCE_REGISTRAR`;
- environment: `TEST_ONLY`;
- Registrar ID: `urn:uuid:62e49885-2d51-4a19-bf0f-8025c741f110`;
- sequence domain: `urn:uuid:7bb23862-0f3a-4c77-9d8c-9f2873338591`.

A verifier MUST reject substitution of any of these profile-bound values.

## 3. Registration gate

The Reference Registrar accepts a registration only when `verificationDisposition == PASS`.

The dispositions `FAIL`, `REVIEW` and `UNRESOLVED` MUST be rejected.

A rejected registration MUST NOT receive a DDT Number, receive a registered-record sequence position, or create a successful DDT Registration Result.

The failed-attempt policy is `REJECT_NO_DDT`.

## 4. Registered sequence allocation

The first successful sequence value is `1`.

Within the Reference Registrar sequence domain, the next successful registration position is `max(existing registrationSequence values) + 1`.

Sequence allocation is performed inside the local registration-store exclusive lock.

The allocated `registrationSequence` MUST equal the value used to construct the successful Registration Result.

The same `(sequenceDomain, registrationSequence)` pair MUST NOT be assigned twice.

Failed or rejected attempts MUST NOT consume a registered position.

An independent parallel counter for DDT Number allocation is forbidden.

## 5. TEST_ONLY DDT Number rendering

The Reference Registrar derives its DDT Number directly from `registrationSequence`.

The rendering rule is `DDT-` followed by the decimal registration sequence left-padded to at least 8 digits.

For example, sequence `42` produces `DDT-00000042`.

The minimum valid sequence is `1`.

This rendering is TEST_ONLY and MUST NOT be represented as the final production DDT Number syntax.

## 6. Exact replay

An exact replay is defined by equality of all three bindings: `ddtRecordId`, `recordHash` and `registrationStatementHash`.

When an already registered `ddtRecordId` is presented with the same three bindings, the Reference Registrar MUST return the existing successful registration.

An exact replay MUST NOT allocate a new sequence position and MUST NOT create a second DDT Number.

Concurrent exact replays are subject to the same idempotency rule.

## 7. Conflicting reuse

If an existing `ddtRecordId` is presented with a different `recordHash` or different `registrationStatementHash`, registration MUST be rejected.

The local store MUST additionally reject duplicate `ddtRecordId`, duplicate DDT Number and duplicate `(sequenceDomain, registrationSequence)`.

A conflicting attempt MUST NOT consume a successful registered position.

## 8. Registration Result binding

A successful registration emits a result conforming to:

- Specification ID: `DDT-REGISTRATION-RESULT-0.1-DRAFT.1`
- Specification SHA-256: `9b9be27679b36d31bc280088a093ab4c224b1ab898ce540ca8078d5c7e330457`
- Schema ID: `DDT-REGISTRATION-RESULT-SCHEMA-0.1-DRAFT.1`
- Schema SHA-256: `e4d3a79933b333835e4b0f763cab6c4af6f337ff495950ae867d55ee930ddcfe`

The Registration Result MUST bind the exact `ddtRecordId`, `recordHash`, `registrationStatementHash`, `sequenceDomain`, `registrationSequence`, `ddtNumber`, Registrar identity and mechanism identity.

The Reference Registrar mechanism value in the Registration Result is `REFERENCE_REGISTRAR`.

## 9. Lookup consistency

The Reference Registrar storage interface supports resolution by DDT Number, `ddtRecordId` and `(sequenceDomain, registrationSequence)`.

All successful lookups referring to the same registration MUST resolve to the same Registration Result.

A verifier MUST report inconsistent cross-resolution as a binding failure and MUST NOT silently repair it.

## 10. Persistence boundary

The current TEST_ONLY implementation uses one local JSON registration store, an exclusive lock file for registration mutation, a temporary output file and filesystem rename to replace the store after construction and validation.

This profile claims normal-process atomic registration behavior only within that local lock scope.

This profile does not establish power-loss durability, explicit `fsync` persistence, crash-consistent recovery, stale-lock automatic recovery, distributed storage, distributed consensus, blockchain inclusion, network finality or production high availability.

Absence of those claims MUST NOT be interpreted as proof that those properties fail. They are outside the established scope of this TEST_ONLY mechanism.

## 11. Verification requirements

A verifier of a Reference Registrar registration MUST:

1. resolve the exact historical Registration Mechanism Profile by digest;
2. validate the Registration Result against its exact historical schema;
3. apply Registration Result semantic validation;
4. verify `ddtNumber` derivation from `registrationSequence`;
5. verify the exact `sequenceDomain`;
6. verify the exact Registrar identity;
7. verify the `REFERENCE_REGISTRAR` mechanism identity;
8. verify the bound `ddtRecordId`, `recordHash` and `registrationStatementHash`;
9. verify exact-replay behavior where replay evidence is evaluated;
10. reject inconsistent lookup bindings; and
11. preserve unsupported durability, authority, time and finality claims as separate unresolved or not-established axes.

Historical registered values MUST NOT be silently repaired.

## 12. Executable acceptance evidence

The current Reference Recorder acceptance fixture is `fixtures/reference-recorder/validate_reference_registrar.ts`.

The reproduced integration fixture establishes profile/implementation binding, PASS-only registration gating, rejection of `FAIL`, `REVIEW` and `UNRESOLVED`, no sequence consumption by rejected attempts, concurrent exact-replay idempotency, conflicting reuse rejection, successful sequence continuity, TEST_ONLY `DDT-%08d` rendering, consistent lookup by DDT Number, record ID and registered sequence, and readable persisted registrations after reopening the local JSON store.

The fixture deliberately does not claim power-loss durability or stale-lock recovery.

## 13. Error conditions

The machine-readable profile defines stable error codes for at least non-PASS registration attempt, conflicting record-ID reuse, duplicate DDT Number, duplicate registered sequence, sequence-domain mismatch, sequence-allocation mismatch, lookup-binding mismatch, invalid Registration Result schema, invalid Registration Result semantics and profile mismatch.

## 14. Claim boundary

Successful validation under this profile may establish that the defined TEST_ONLY Reference Registrar accepted a specific registration binding and assigned the corresponding Reference Registrar registered position and DDT Number.

It does not establish substantive truth of upstream content, registrant authority, independently proven time, blockchain inclusion, network finality, power-loss durability or production readiness.

Those properties require their own exact artifacts, mechanisms and verification evidence.

## 15. Status

This profile is `TEST_ONLY`.

It exists to provide the exact registration-mechanism artifact required by DDT Record Envelope v0.3 Draft.5 and Enterprise Profile v0.2 for the current Reference Recorder integration baseline.

A future DDC Network Registration Profile may define different authority, persistence, numbering, transaction, execution and finality rules without modifying historical Reference Registrar artifacts.

---

**End of DDT Registration Mechanism Profile v0.1 Draft (`0.1.0-draft.1`)**
