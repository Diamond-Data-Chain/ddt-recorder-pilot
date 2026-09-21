# DDT Cryptographic Renewal Event v0.1 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-CRYPTOGRAPHIC-RENEWAL-EVENT-0.1-DRAFT.1`  
**Version:** `0.1.0-draft.1`  
**Status:** DRAFT — aligned fixture and integrated proof-purpose tests pending  
**Date:** 2026-09-04  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`  
**External design fixture:** `CASE-CRR-01`, Git commit `41549e5`

## 1. Purpose

This specification defines an append-only DDT event that binds an older record, proof or evidence package into a new cryptographic profile while preserving the original bytes, proof scope, verification result and limitations.

Renewal extends independently inspectable cryptographic continuity. It never rewrites the original and never converts cryptographic validity into substantive truth.

## 2. Claim boundary

```text
original bytes match their commitment
  != original assertion is substantively true

original proof is independently verifiable now
  != proof was independently verified at a proven historical time

renewal record asserts verification at time T
  != time T is independently proven

new renewal proof is valid
  != an already-unverifiable old proof has been restored
```

If the original proof cannot be independently verified when renewal is attempted, a later signature may preserve bytes and the failed attempt, but MUST NOT produce `SUCCESSFUL_RENEWAL`.

## 3. Companion artifacts

- `schemas/ddt-cryptographic-renewal-event-v0.1.schema.json`;
- `schemas/ddt-cryptographic-renewal-profile-v0.1.schema.json`; and
- `profiles/ddt-baseline-cryptographic-renewal-profile-v0.1.json`.

The bundled baseline is `TEST_ONLY` until the common Signature Proof successor registers renewal proof purpose and target type, the aligned fixtures pass, and an independent verifier reproduces the result.

## 4. First-class DDT event

A renewal is registered as a new DDT Record whose `recordType` is `CRYPTOGRAPHIC_RENEWAL`. The renewal event core is the committed payload. It receives its own permanent `ddtRecordId`, `recordHash`, registration proof and relationships.

The original DDT Record, external artifact, proof and package remain byte-for-byte unchanged.

The renewal relationship MUST bind the exact original identity and commitment. A human label, mutable URL or latest-version pointer is insufficient.

## 5. Renewal classes

The event declares exactly one class:

- `SUCCESSFUL_RENEWAL` — every profile-required original byte/proof check passed before the old mechanism became prohibited or unverifiable;
- `FAILED_RENEWAL_ATTEMPT` — one or more required original checks failed, were unavailable, unsupported or occurred after the bound policy prohibited continuity;
- `PRESERVATION_ONLY_MIGRATION` — original material was copied or rebound, but no claim of successful verification continuity is made.

Only `SUCCESSFUL_RENEWAL` may assert preserved cryptographic continuity.

## 6. Renewal target and lineage

The core MUST bind:

- target type and stable identity;
- exact original target commitment;
- original artifact/proof Artifact References;
- original canonicalization and cryptographic profiles;
- exact original verification procedure and verifier implementation;
- the original verification result artifact;
- new cryptographic profile;
- predecessor renewal where one exists; and
- scope being renewed.

Targets may be a DDT Record hash, an Offline Verification Package manifest-core hash, an evidence-package manifest, a checkpoint core or an external attestation commitment.

Lineage is directional: the new renewal event refers to the original or prior renewal. The original is not modified to point forward.

## 7. Original bytes and proof evaluation

For every required original artifact, the renewing verifier MUST:

1. obtain the exact bytes permitted by the historical preservation/disclosure contract;
2. recompute and compare the registered digest;
3. reconstruct the original canonical signing input under the exact historical profile;
4. resolve the historical verification method and required trust state;
5. verify the original proof and scope;
6. evaluate the original algorithm under the exact renewal policy; and
7. preserve the resulting Verification Result artifact.

The event core records the result reference and summary status; the detailed result remains independently inspectable.

## 8. Original proof statuses

Each original proof evaluation uses:

- `VALID`;
- `INVALID`;
- `UNAVAILABLE`;
- `UNSUPPORTED`; or
- `NOT_EVALUATED`.

Algorithm-policy status is separate:

- `ACCEPTABLE`;
- `DEPRECATED_BUT_ACCEPTABLE_FOR_RENEWAL`;
- `PROHIBITED`;
- `COMPROMISED`;
- `UNKNOWN`; or
- `NOT_EVALUATED`.

A valid mathematical signature under an algorithm already classified `COMPROMISED` or `PROHIBITED` does not satisfy successful-continuity policy unless an exact exceptional policy explicitly permits that result without overstating it.

## 9. Renewal trigger policy

The exact Renewal Profile defines triggers and eligibility. Baseline trigger classes are:

- scheduled age threshold;
- planned algorithm deprecation;
- key/trust-anchor migration;
- newly identified weakness;
- archive/checkpoint policy;
- regulatory retention requirement; and
- manual controlled migration.

Trigger claims are evidence-bearing assertions. Their time, authority and policy applicability remain separately verifiable.

## 10. Non-circular construction

The event is constructed as:

```text
renewalCoreHash = SHA-256(UTF8(RFC8785-JCS(renewalCore)))
```

`renewalProofs`, `renewalTimeEvidenceRefs` and the containing DDT registration proof are created after `renewalCoreHash` and are not inserted into `renewalCore`.

Every renewal proof MUST sign the exact `RENEWAL_CORE_HASH`. Every independent time proof MUST bind the exact core hash directly or through a reproducible aggregate inclusion path.

## 11. Verification time semantics

`verifiedAtClaim` means only that the renewal record asserts when verification occurred.

The following are independent:

1. the renewal record contains a verification-at-time assertion;
2. that assertion is bound into `renewalCoreHash`;
3. the original proof remains independently verifiable under its original profile; and
4. an external timestamp/checkpoint independently supports the renewal time.

Without item 4:

```text
RENEWAL_VERIFICATION_ASSERTION_BOUND = BOUND
ORIGINAL_PROOF_INDEPENDENTLY_VERIFIABLE = VALID
RENEWAL_TIME_PROOF = UNAVAILABLE
```

The phrase `ORIGINAL_PROOF_VALID_AT_RENEWAL` MUST NOT be used as a substitute for independent proof of when renewal occurred.

## 12. Renewal proof and witness

A renewal proof binds the core hash under the new profile. Verification separates:

- signature validity;
- verification-method integrity and lifecycle;
- renewing witness identity;
- witness authority and scope;
- independent time; and
- substantive truth.

Possession of the new private key does not prove authority to renew the target.

The common Signature Proof successor MUST register:

- proof purpose `CRYPTOGRAPHIC_RENEWAL_ATTESTATION`; and
- signed-object type `RENEWAL_CORE_HASH`.

Until that successor is defined, integrated and tested, this event remains DRAFT.

## 13. Successful-renewal derivation

`SUCCESSFUL_RENEWAL` requires all profile-mandatory conditions:

- original target identity/commitment bound;
- required original bytes available and matching;
- required original proofs independently `VALID`;
- historical key/trust state sufficiently resolved;
- original proof scope preserved exactly;
- algorithm policy eligible at the asserted renewal evaluation;
- verification result artifact bound;
- new profile exactly identified;
- renewal core intact;
- renewal proof valid;
- witness identity and required authority resolved; and
- no prohibited claim expansion.

Independent renewal time is required only where the exact Renewal Profile or Preservation Contract requires it. Its absence still remains visible and may yield `PASS_WITH_LIMITATIONS`; it can never be silently inferred.

## 14. Failed and late renewal

A failed or late renewal attempt remains useful append-only evidence. It MUST preserve:

- the attempted target;
- procedure and policy used;
- every available input;
- exact failure/unavailability reason;
- asserted attempt time and any independent time proof; and
- witness/proof of the failed-attempt record.

It MUST NOT claim cryptographic continuity.

## 15. Verification Result axes

The integrated registry MUST expose at least:

| Axis | Status class |
|---|---|
| `ORIGINAL_BYTES_INTEGRITY` | `INTEGRITY` |
| `ORIGINAL_PROOF_INDEPENDENTLY_VERIFIABLE` | `VALIDITY` |
| `ORIGINAL_PROOF_SCOPE_PRESERVED` | `BINDING` |
| `ORIGINAL_ALGORITHM_POLICY` | `LIFECYCLE` |
| `RENEWAL_TARGET_BINDING` | `BINDING` |
| `RENEWAL_VERIFICATION_ASSERTION_BOUND` | `BINDING` |
| `RENEWAL_RECORD_INTEGRITY` | `INTEGRITY` |
| `RENEWAL_SIGNATURE` | `VALIDITY` |
| `RENEWING_WITNESS_IDENTITY` | `RESOLUTION` |
| `RENEWING_WITNESS_AUTHORITY` | `RESOLUTION` |
| `RENEWAL_TIME_CLAIM` | `TIME` |
| `RENEWAL_TIME_PROOF` | `TIME` |
| `CRYPTOGRAPHIC_CONTINUITY` | `CONTINUITY` |
| `SUBSTANTIVE_TRUTH` | `TRUTH_BOUNDARY` |

The future `CONTINUITY` class permits `PRESERVED`, `NOT_PRESERVED`, `UNAVAILABLE`, `UNRESOLVED`, `NOT_APPLICABLE` and `NOT_EVALUATED`.

## 16. Claim boundary in the event

Every core carries constant-false statements confirming that renewal does not imply:

- substantive truth;
- legal validity;
- historical signer authority;
- independent renewal time;
- restoration of lost verification capability; or
- modification of original evidence.

These constants are committed data, not explanatory UI text.

## 17. CASE-CRR-01 disposition

The commit-pinned external fixture demonstrated:

- exact original-byte preservation;
- independent reconstruction of the original RFC 8785/RFC 7797 ES256K proof;
- append-only binding into a second Ed25519-protected candidate record;
- tamper detection for original bytes, lineage and renewal signature; and
- `SUBSTANTIVE_TRUTH = NOT_APPLICABLE`.

Its bounded external review returned `PASS_WITH_LIMITATIONS` and identified one required refinement: because no independent timestamp/checkpoint was included, the asserted renewal verification time is bound but not independently proven.

The existing fixture remains historical input. An aligned fixture MUST be generated under this exact event schema without rewriting the published original fixture.

## 18. Stable reason codes

- `RENEWAL_PROFILE_UNAVAILABLE`;
- `RENEWAL_PROFILE_INTEGRITY_FAILED`;
- `RENEWAL_TARGET_UNAVAILABLE`;
- `RENEWAL_TARGET_BINDING_FAILED`;
- `RENEWAL_ORIGINAL_BYTES_UNAVAILABLE`;
- `RENEWAL_ORIGINAL_BYTES_INTEGRITY_FAILED`;
- `RENEWAL_ORIGINAL_PROFILE_UNAVAILABLE`;
- `RENEWAL_ORIGINAL_PROOF_UNAVAILABLE`;
- `RENEWAL_ORIGINAL_PROOF_INVALID`;
- `RENEWAL_ORIGINAL_PROOF_UNSUPPORTED`;
- `RENEWAL_ORIGINAL_PROOF_SCOPE_MISMATCH`;
- `RENEWAL_HISTORICAL_TRUST_STATE_UNAVAILABLE`;
- `RENEWAL_ORIGINAL_ALGORITHM_PROHIBITED`;
- `RENEWAL_ORIGINAL_ALGORITHM_COMPROMISED`;
- `RENEWAL_TRIGGER_POLICY_UNRESOLVED`;
- `RENEWAL_VERIFICATION_RESULT_UNAVAILABLE`;
- `RENEWAL_VERIFICATION_ASSERTION_MISMATCH`;
- `RENEWAL_CORE_HASH_MISMATCH`;
- `RENEWAL_SIGNATURE_UNAVAILABLE`;
- `RENEWAL_SIGNATURE_INVALID`;
- `RENEWAL_WITNESS_IDENTITY_UNRESOLVED`;
- `RENEWAL_WITNESS_AUTHORITY_UNRESOLVED`;
- `RENEWAL_TIME_ASSERTED_ONLY`;
- `RENEWAL_TIME_PROOF_UNAVAILABLE`;
- `RENEWAL_TIME_PROOF_INVALID`;
- `RENEWAL_ALREADY_UNVERIFIABLE`;
- `RENEWAL_CLASS_OVERSTATED`;
- `RENEWAL_CLAIM_SCOPE_EXPANDED`;
- `RENEWAL_LINEAGE_CONFLICT`;
- `RENEWAL_ORIGINAL_EVIDENCE_MODIFICATION_ATTEMPTED`; and
- `RENEWAL_SUBSTANTIVE_TRUTH_OVERSTATED`.

## 19. Required fixtures before candidate status

1. aligned positive `CASE-CRR-01` with time proof unavailable;
2. valid renewal with independent time proof;
3. original byte tamper;
4. original proof tamper;
5. original proof scope substitution;
6. original profile substitution;
7. missing historical key state;
8. deprecated-but-eligible original algorithm;
9. prohibited original algorithm;
10. compromised original algorithm;
11. renewal attempted after original proof became unverifiable;
12. renewal target substitution;
13. lineage substitution;
14. renewal core tamper;
15. renewal proof tamper;
16. unauthorized renewing witness;
17. asserted time without external time proof;
18. time proof bound to another core;
19. failed-attempt event preserved without continuity claim;
20. preservation-only migration;
21. second renewal chaining from the first;
22. two conflicting renewals preserved;
23. substantive-truth overclaim rejected; and
24. complete offline reproduction with DDC services disabled.

## 20. Candidate and final gates

Candidate status requires the event/profile schemas, exact profile artifact, compatible Signature Proof and Verification Result successors, reference verifier and all mandatory fixtures.

Final status additionally requires independent reproduction, algorithm-lifecycle governance, security review, exact offline-package integration and disposition of all bounded-review findings.

