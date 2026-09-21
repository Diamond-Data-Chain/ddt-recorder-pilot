# DDT Event Coverage Profile v0.1 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-EVENT-COVERAGE-PROFILE-0.1-DRAFT.1`  
**Version:** `0.1.0-draft.1`  
**Status:** DRAFT — not approved for production conformance or completeness claims  
**Date:** 2026-09-04  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`  
**Time/checkpoint dependency:** `DDT-TIME-CHECKPOINT-PROFILE-0.1-DRAFT.1`

## 1. Purpose

This profile defines what additional evidence is required before DDC can report that all events required by a historically applicable contract were captured for a precise source, event class and closed interval.

It prevents an intact DDT sequence from being overstated as proof that an upstream system disclosed every event that should have been registered.

The profile separates:

- integrity and continuity of DDT records that exist;
- completeness of assigned DDT positions;
- completeness of events emitted by an upstream source;
- conformance with the historical event-selection and registration contract;
- independent witness of the source state; and
- substantive truth of the underlying events.

## 2. Core boundary

```text
continuous DDT sequence
  != every required upstream event was emitted

complete source sequence
  != every source event was registered as a DDT

coverage contract conformance
  != substantive truth of every event

DDC assertion of completeness
  != independent omission evidence
```

DDC can establish scoped completeness only when the source-side evidence and independent witness requirements defined below pass. It cannot prove the absence of an event from a source it did not control or independently observe merely because no DDT record exists for that event.

## 3. Companion artifacts

The normative companion artifacts are:

- `schemas/ddt-event-coverage-contract-v0.1.schema.json`;
- `schemas/ddt-event-coverage-evidence-v0.1.schema.json`; and
- `schemas/ddt-event-coverage-profile-v0.1.schema.json`; and
- `profiles/ddt-closed-event-coverage-profile-v0.1.json`.

The exact profile, contract, schemas, selection rules, commitment procedures, witness rules and validation dependencies used MUST be identified by version and digest. Mutable current resources MUST NOT replace historical bytes.

## 4. Coverage contract applicability

A coverage contract is a historically versioned contract for a defined source and scope. It does not govern a DDT Record merely because a registrant names it.

Applicability MUST be supported by exact assignment or governance evidence under the Preservation Contract and Enterprise Profile. The verifier MUST distinguish:

- `CONTRACT_BOUND` — exact bytes are committed;
- `CONTRACT_APPLICABILITY_VERIFIED` — historical assignment/authority evidence passes;
- `CONTRACT_APPLICABILITY_ASSERTED` — assignment is only claimed; and
- `CONTRACT_APPLICABILITY_UNRESOLVED` — the available evidence is insufficient.

A completeness result MUST NOT be `COMPLETE` when historical applicability is only asserted or unresolved.

## 5. Required contract scope

Every Event Coverage Contract MUST define:

- one stable source identity and namespace;
- the source identity/authority evidence required for coverage statements;
- included record types and upstream event types;
- an exact deterministic event-selection rule;
- an exact exclusion rule or an explicit statement that no exclusions are permitted;
- an inclusive first source position and exclusive end source position, or a deterministic rule for closing that interval;
- stable source-event identity and position extraction paths;
- source-position allocation, non-reuse and ordering rules;
- treatment of duplicates, corrections, rejected events and failed DDT submissions;
- the DDT registration trigger and maximum permitted delay;
- source-state and event-set commitment procedures;
- witness independence, quorum, signature and time requirements;
- required retention/availability obligations; and
- exact results for gaps, mismatches and unavailable evidence.

Human prose MAY explain the contract but MUST NOT replace its machine-evaluable rules.

## 6. Event-selection rules

The contract's `selectionRule` MUST be an exact Artifact Reference to deterministic executable rules or a closed declarative rule set.

For the closed interval, the rule MUST determine for every source event exactly one disposition:

- `REQUIRED_FOR_DDT`;
- `EXCLUDED_BY_CONTRACT`; or
- `OUTSIDE_CONTRACT_SCOPE`.

The result MUST depend only on inputs and artifacts historically bound by the contract. A validator MUST NOT use a later policy version or undocumented discretionary decision.

If selection cannot be reproduced, coverage conformance and completeness are `UNAVAILABLE` or `UNRESOLVED`; they are not presumed to pass.

## 7. Source event identity and position

### 7.1 Stable event identity

Each in-scope source event MUST have a non-empty stable `sourceEventId` that is unique inside the contract's `sourceNamespace`.

The corresponding DDT Record MUST bind the same source identity and source event ID through the upstream object and committed coverage evidence required by the Enterprise Profile.

### 7.2 Source position

The baseline uses a non-negative safe integer `sourceSequence` not exceeding `9007199254740991`.

The source position MUST be:

- allocated atomically with the durable source-event commit;
- strictly increasing inside one `sequenceDomain`;
- non-reusable;
- unaffected by DDT registration success or failure; and
- preserved in the source event and coverage evidence.

A sequence allocated only after successful DDT registration is not sufficient to detect source events that were never submitted.

### 7.3 Continuous interval

For a closed interval `[firstSequence, endSequenceExclusive)`, every integer position MUST have exactly one committed leaf disposition:

- `REGISTERED` — the required event has a bound DDT Record;
- `PENDING_WITHIN_ALLOWED_DELAY` — permitted only before interval closure;
- `FAILED_REGISTRATION` — failure is preserved and still visible;
- `EXCLUDED_BY_CONTRACT` — exclusion and rule result are preserved; or
- `VOIDED_SOURCE_POSITION` — allocation was voided but cannot disappear.

At final interval closure, `PENDING_WITHIN_ALLOWED_DELAY` is forbidden.

## 8. Failure, exclusion and tombstone records

A source position MUST NOT vanish because ingestion, validation, authorization, privacy review or DDT registration failed.

Every non-registered allocated position MUST produce a committed tombstone carrier. Its `tombstoneCore` contains:

- domain `DDT_EVENT_COVERAGE_TOMBSTONE_V1` and stable tombstone ID;
- contract, source and sequence identity;
- source event ID when one exists;
- disposition and stable reason code;
- the source-event commitment when bytes existed;
- selection-rule result evidence where applicable;
- retry/successor references where applicable.

The carrier additionally contains the registered `tombstoneCoreHash` and proof references. The hash is:

```text
tombstoneCoreHash = SHA-256(UTF8(RFC8785-JCS(tombstoneCore)))
```

Proof values and proof references are not members of `tombstoneCore`. The corresponding coverage leaf's `tombstoneCommitment` MUST equal `tombstoneCoreHash`.

A tombstone proves that the position and declared disposition were preserved. It does not prove the substantive correctness of the reason.

An excluded event counts as covered only when the exact historical selection rule independently reproduces `EXCLUDED_BY_CONTRACT`.

## 9. Exact event-set commitment

### 9.1 Coverage leaf

The baseline coverage leaf object is:

```json
{
  "domain": "DDT_EVENT_COVERAGE_LEAF_V1",
  "contractId": "example-contract",
  "contractVersion": "1.0.0",
  "sourceId": "example-source",
  "sequenceDomain": "example-source-events",
  "sourceSequence": 42,
  "sourceEventId": "event-42",
  "sourceEventCommitment": {
    "algorithm": "SHA-256",
    "value": "..."
  },
  "disposition": "REGISTERED",
  "ddtRecordId": "urn:uuid:...",
  "ddtRecordHash": {
    "algorithm": "SHA-256",
    "value": "..."
  }
}
```

For a position without source bytes, `sourceEventId` and `sourceEventCommitment` MAY be omitted only for `VOIDED_SOURCE_POSITION` when the contract explicitly permits that condition. The tombstone commitment remains mandatory.

For `REGISTERED`, `ddtRecordId` and `ddtRecordHash` are REQUIRED.

For every non-registered disposition, `tombstoneCommitment` is REQUIRED and DDT target fields are omitted.

### 9.2 Leaf hashing

```text
leafBytes = UTF8(RFC8785-JCS(coverageLeaf))
leafHash  = SHA-256(0x00 || leafBytes)
```

### 9.3 Tree construction

The event-set tree uses the exact domain-separated SHA-256 tree construction of `DDT-TIME-CHECKPOINT-PROFILE-0.1-DRAFT.1`:

- leaves ordered by ascending `sourceSequence`;
- internal hash `SHA-256(0x01 || left32 || right32)`;
- largest-power-of-two split for non-power-of-two trees;
- no padding;
- no duplicated last node; and
- non-empty tree.

The resulting `eventSetRoot` commits every source position and disposition in the interval.

## 10. Source coverage statement

A Source Coverage Statement closes exactly one interval. Its `statementCore` contains:

- domain `DDT_SOURCE_COVERAGE_STATEMENT_V1`;
- statement identity and exact contract reference;
- source and sequence-domain identity;
- `firstSequence` and `endSequenceExclusive`;
- `positionCount`;
- counts by disposition;
- `eventSetRoot`;
- `sourceStateCommitment`;
- optional previous statement identity/digest for statement lineage;
- close-time claim;
- signer identity.

The statement carrier contains `statementCore`, the registered `statementCoreHash` and proof references:

```text
statementCoreHash = SHA-256(UTF8(RFC8785-JCS(statementCore)))
```

The proof signs or otherwise protects `statementCoreHash` under an exact bound Signature Proof/Profile. Proof values, proof references and later witness attestations are not inserted into `statementCore`. This avoids circular commitment construction.

Independent witness attestations bind the finalized statement core hash as separate artifacts. They are never retroactively inserted into the finalized statement.

The following arithmetic MUST hold:

```text
positionCount = endSequenceExclusive - firstSequence
positionCount = sum(dispositionCounts)
```

The statement MUST fail validation if these equalities do not hold.

`eventSetRoot` and `sourceStateCommitment` are different commitments. The first binds the normalized coverage leaf set. The second binds the source's own historically defined state representation. Equality is neither required nor assumed.

## 11. Source-state commitment

The contract MUST identify the exact source-state snapshot schema, canonicalization and digest procedure.

The source-state snapshot SHOULD bind at least:

- source identity and software/schema version;
- sequence-domain identity;
- current allocation boundary;
- count/state summaries needed by the contract;
- event-store root, database snapshot commitment or equivalent source-native state commitment;
- previous snapshot identity/digest where applicable; and
- snapshot-time claim.

A DDC-generated restatement of DDT records is not independent source-state evidence.

If required source-state bytes are unavailable, source comparison cannot pass even when the DDT event-set tree is internally valid.

## 12. Independent witness

### 12.1 Independence

The contract MUST define machine-evaluable independence requirements and minimum witness quorum.

A witness assertion is not independent merely because it uses a different key. Independence evidence SHOULD address control, organization, infrastructure and data-access separation required by the domain profile.

The source producer, DDT registrant and witness identities MAY be different verification subjects and MUST be resolved separately.

### 12.2 Witness scope

A witness attestation uses a non-circular carrier. Its `attestationCore` contains domain `DDT_SOURCE_WITNESS_ATTESTATION_V1`, witness and statement identity, observation scope, observed roots/commitments, independence evidence references and optional witnessed-time claim. The carrier separately contains `attestationCoreHash`, proof references and external-time evidence references.

```text
attestationCoreHash = SHA-256(UTF8(RFC8785-JCS(attestationCore)))
```

The witness MUST state exactly what it observed and verified, for example:

- source state and allocation boundary;
- event-set root reproduction;
- DDT binding for every `REGISTERED` leaf;
- tombstone existence for every non-registered position;
- selection-rule reproduction;
- gap absence inside the closed interval; and
- source coverage statement signature.

An assertion that says only “complete” without this scope is insufficient.

### 12.3 Witness time

A signed `witnessedAtClaim` is a protected time claim, not independent time proof. Independent witness time requires separate valid time evidence under the Time/Checkpoint Profile.

## 13. DDT checkpoint binding

A DDT checkpoint claiming `CLOSED_EVENT_COVERAGE` MUST bind:

- the exact Event Coverage Contract Artifact Reference;
- the finalized Source Coverage Statement digest;
- the source-state commitment;
- the DDT checkpoint sequence range/count;
- the corresponding event-set root or a deterministic binding to it; and
- required witness evidence references.

The DDT checkpoint and the Source Coverage Statement MAY close at different boundaries only when the contract defines exact reconciliation rules. Unexplained boundary or count differences fail coverage conformance.

## 14. Registration delay and late records

The contract MUST define a maximum registration delay or explicitly prohibit delayed registration.

A required event not yet registered may be `PENDING_WITHIN_ALLOWED_DELAY` only before interval closure and only when source event/position evidence already exists.

After the deadline:

- the original position becomes `FAILED_REGISTRATION` unless registration completed;
- a later successful DDT registration MAY be appended and linked to the failure/tombstone;
- the historical failure is not erased; and
- a later coverage result may report remediation without rewriting the original result.

## 15. Duplicate and correction semantics

The contract MUST distinguish:

- exact replay of the same source event;
- conflicting reuse of a source event ID or sequence;
- duplicate business content with different source identity;
- correction of an earlier event; and
- retry of a failed registration.

A correction is a new source event and a new DDT Record linked through an explicit typed relationship. It does not replace the original leaf or source position.

Conflicting reuse of `sourceSequence` or `sourceEventId` MUST fail coverage integrity.

## 16. Completeness evaluation

### 16.1 `COMPLETE`

`EVENT_HISTORY_COMPLETENESS = COMPLETE` is permitted only when all historically required conditions pass:

1. exact contract availability, integrity and applicability;
2. deterministic selection-rule reproduction;
3. complete contiguous source-position coverage;
4. exact event-set root reproduction;
5. source-state commitment verification;
6. all `REGISTERED` leaves bind exact DDT record IDs and hashes;
7. every other allocated position has a valid tombstone and disposition;
8. Source Coverage Statement integrity, signature, signer identity and authority;
9. required independent witness scope, identity, authority and quorum;
10. DDT checkpoint/coverage-statement reconciliation; and
11. no unresolved conflict, gap, count mismatch or source-state mismatch.

The result is limited to the named contract, source, event classes and closed interval.

### 16.2 Other results

- `PARTIAL` — only a defined sub-scope or subset was provably complete and the request permits a scoped result;
- `INCOMPLETE` — complete available evidence demonstrates one or more required events/positions were not covered as required;
- `UNAVAILABLE` — required contract, source, witness, leaf, statement or proof bytes cannot be obtained;
- `UNRESOLVED` — available evidence does not support a unique determination;
- `CONFLICTING` — independently valid evidence supports incompatible coverage states;
- `NOT_APPLICABLE` — the contract does not govern the requested scope; or
- `NOT_EVALUATED` — completeness was not requested or performed.

`INCOMPLETE` is not automatically `DDT_RECORD_INTEGRITY = FAIL`. The existing DDT records may remain intact while the broader preservation/coverage contract failed.

## 17. Verification Result integration

The next versioned Verification Result axis registry MUST add:

| Axis | Status class | Permitted statuses |
|---|---|---|
| `EVENT_HISTORY_COMPLETENESS` | `COMPLETENESS` | `COMPLETE`, `PARTIAL`, `INCOMPLETE`, `UNAVAILABLE`, `UNRESOLVED`, `CONFLICTING`, `NOT_APPLICABLE`, `NOT_EVALUATED` |

Until that versioned axis exists and is bound by the historical Preservation Contract, an implementation MUST report coverage findings as scoped diagnostics and MUST NOT emit an unregistered generic completeness verdict.

Completeness MUST remain separate from:

- `RECORD_INTEGRITY`;
- `FAMILY_CONTINUITY`;
- `REGISTRATION_CONFORMANCE`;
- `INDEPENDENT_PROVENANCE`;
- `REGISTRATION_TIME_PROOF`; and
- `SUBSTANTIVE_TRUTH`.

## 18. Stable reason codes

The baseline defines:

- `COVERAGE_CONTRACT_UNAVAILABLE`;
- `COVERAGE_CONTRACT_INTEGRITY_FAILED`;
- `COVERAGE_CONTRACT_APPLICABILITY_UNRESOLVED`;
- `COVERAGE_SELECTION_RULE_UNAVAILABLE`;
- `COVERAGE_SELECTION_REPRODUCTION_FAILED`;
- `COVERAGE_SOURCE_POSITION_GAP`;
- `COVERAGE_SOURCE_POSITION_REUSED`;
- `COVERAGE_SOURCE_EVENT_ID_REUSED`;
- `COVERAGE_PENDING_AT_CLOSURE`;
- `COVERAGE_TOMBSTONE_MISSING`;
- `COVERAGE_TOMBSTONE_INVALID`;
- `COVERAGE_EVENT_SET_ROOT_MISMATCH`;
- `COVERAGE_SOURCE_STATE_UNAVAILABLE`;
- `COVERAGE_SOURCE_STATE_MISMATCH`;
- `COVERAGE_RANGE_COUNT_MISMATCH`;
- `COVERAGE_DDT_BINDING_MISSING`;
- `COVERAGE_DDT_BINDING_MISMATCH`;
- `COVERAGE_STATEMENT_SIGNATURE_INVALID`;
- `COVERAGE_STATEMENT_AUTHORITY_UNRESOLVED`;
- `COVERAGE_WITNESS_EVIDENCE_UNAVAILABLE`;
- `COVERAGE_WITNESS_INDEPENDENCE_UNRESOLVED`;
- `COVERAGE_WITNESS_QUORUM_NOT_MET`;
- `COVERAGE_WITNESS_SCOPE_INSUFFICIENT`;
- `COVERAGE_CHECKPOINT_RECONCILIATION_FAILED`;
- `COVERAGE_CONFLICTING_EVIDENCE`; and
- `COVERAGE_REQUEST_OUTSIDE_SCOPE`.

Profiles MAY add namespaced codes but MUST NOT redefine base codes.

## 19. Offline preservation

An Offline Verification Package for a completeness result MUST preserve:

- exact coverage contract and all transitive normative dependencies;
- contract applicability evidence;
- selection and exclusion rule bytes;
- source event-position evidence;
- all coverage leaves or a complete deterministic reproduction source;
- tombstones and their commitments;
- Source Coverage Statement bytes and proofs;
- source-state snapshot bytes or exact independently retrievable commitments and procedures;
- witness statements, identity/authority/independence evidence and proof profiles;
- DDT record and checkpoint bindings;
- canonicalization and Merkle procedures;
- verification request, per-axis result and reason codes; and
- a signed package manifest.

Long-term renewal MUST preserve the original evidence and claim scope. It cannot restore omitted source events that were never committed.

## 20. Required fixtures before candidate status

At minimum:

1. complete five-position interval with five registered DDT records;
2. complete interval containing a contract-valid exclusion tombstone;
3. source sequence gap;
4. reused source sequence;
5. reused source event ID with different bytes;
6. missing tombstone;
7. pending position at closure;
8. DDT target ID/hash mismatch;
9. event-set leaf tamper;
10. event-set root mismatch;
11. arithmetic range/count mismatch;
12. missing source-state snapshot;
13. source-state commitment mismatch;
14. DDT-only completeness claim without source witness;
15. witness controlled by the source when independence is required;
16. insufficient witness quorum;
17. witness scope that did not include gap detection;
18. unavailable historical selection rule;
19. current selection rule substituted for the historical rule;
20. valid records outside contract scope not treated as omissions;
21. registration failure followed by later append-only remediation;
22. correction preserved as a new event/record;
23. conflicting source and witness statements;
24. DDT checkpoint/coverage-statement boundary mismatch;
25. `RECORD_INTEGRITY = PASS` with `EVENT_HISTORY_COMPLETENESS = INCOMPLETE`;
26. exact scoped `COMPLETE` result without any global-history wording; and
27. offline reproduction with DDC-operated services disabled.

## 21. Draft limitation

This document defines the coverage contract and evidence boundary. It does not yet constitute an implemented completeness service.

Candidate status additionally requires:

- complete JSON Schema engine validation;
- the versioned Verification Result `COMPLETENESS` axis;
- envelope, Enterprise Profile, Preservation Contract and checkpoint integration;
- a reference coverage producer and independent verifier;
- passing positive and tampered fixtures; and
- at least one bounded independent reproduction.
