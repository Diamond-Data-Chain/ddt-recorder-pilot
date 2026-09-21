# DDT Time, Ordering and Checkpoint Profile v0.2 Draft.1

**Registry ID:** `DDT-TIME-CHECKPOINT-PROFILE-0.2-DRAFT.1`  
**Profile artifact ID:** `ddt.time-checkpoint.sha256-jcs-v2`  
**Status:** DRAFT — Signature Proof v0.2 checkpoint carrier integrated; aligned signed/tampered, RFC 3161, network and interoperability fixtures pending  
**Date:** 2026-09-05

## 1. Purpose

This specification defines how DDT records preserve and later verify:

- distinct time claims;
- DDT network or authoritative ordering;
- direct external time proof;
- aggregate checkpoint inclusion;
- checkpoint continuity; and
- narrowly scoped event-coverage and gap claims.

Its central rule is:

```text
timestamp claim != independent time proof
network order != external UTC time
checkpoint inclusion != global event completeness
proven existence time != proof that the upstream event occurred then
```

The profile supports historical reconstruction without inventing a stronger time or completeness claim than the preserved evidence supports.

## 2. Scope

This draft defines:

- four common time/checkpoint evidence types;
- exact SHA-256/JCS Merkle checkpoint construction;
- checkpoint lineage and coverage fields;
- RFC 3161 external timestamp validation requirements;
- external network inclusion and finality boundaries;
- direct and aggregate time-proof derivation;
- limited omission/gap-detection rules;
- long-term preservation requirements;
- result-axis mapping and stable reason codes; and
- minimum fixtures required before candidate status.

This draft does not:

- treat a local clock value as independently proven time;
- treat a block timestamp as independent UTC time by default;
- prove that upstream data or an event is factually true;
- prove that every real-world event was captured merely because registered sequence numbers are continuous;
- make DDC a universal Time-Stamp Authority;
- define one mandatory external network; or
- promise cryptographic verification forever without renewal.

## 3. Normative language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY** and **OPTIONAL** are interpreted as described by BCP 14 when they appear in uppercase.

## 4. Artifact suite

This draft consists of:

- this normative specification;
- `schemas/ddt-time-checkpoint-evidence-v0.2.schema.json`;
- `schemas/ddt-time-checkpoint-profile-v0.2.schema.json`; and
- `profiles/ddt-time-checkpoint-profile-v0.2.json`.

The v0.2 checkpoint-proof carrier additionally depends on the exact Signature Proof v0.2 schema, exact Ed25519/JCS Signature Profile v0.2 bytes and Verification Result v0.2 schema bound by digest in the baseline profile. The baseline profile is `TEST_ONLY`.

Every use of the profile, evidence schema, external-time profile, network profile, coverage contract or trust artifact MUST bind the exact bytes by digest. Version labels and mutable URLs alone are insufficient.

Version 0.2 is the signature-carrier successor to v0.1. It does not change the v0.1 leaf hash, Merkle node hash, tree shape, checkpoint-core field semantics, RFC 3161 boundary or time-layer model. It replaces checkpoint proof references with the complete common Signature Proof v0.2 carrier and makes the checkpoint-core hash explicit. Historical v0.1 artifacts remain available for verification.

## 5. Time layers

The following layers are distinct:

### 5.1 Upstream event-time claim

The time an upstream source states that an event occurred. Unless independently supported, it is an upstream assertion.

### 5.2 Source signing-time claim

The time a source or signer claims a proof was created. A valid signature protects the claim from undetected modification but does not independently prove the clock value.

### 5.3 Submission/receipt-time claim

The time an intake service states that it received a registration request. It is independently meaningful only under a bound receipt and time-proof profile.

### 5.4 DDC registration-time claim

The time a DDC component states that registration occurred. Without independent evidence its maximum status is `ASSERTED`.

### 5.5 Network inclusion/order

The position of an object in a particular finalized network history under an exact network and finality profile. It can establish relative order and inclusion without necessarily establishing independent UTC time.

### 5.6 External time evidence

Evidence from an independently evaluated source that binds the target object or an aggregate containing it to a supported time bound.

These values MUST NOT be collapsed into one generic timestamp.

## 6. Common evidence model

The companion evidence schema recognizes:

- `RFC3161_TIMESTAMP_TOKEN`;
- `DDT_SIGNED_CHECKPOINT`;
- `DDT_CHECKPOINT_INCLUSION_PROOF`; and
- `NETWORK_INCLUSION_PROOF`.

Each object identifies:

- the exact target and digest;
- the evidence producer;
- proof and authority references where applicable;
- a type-specific body; and
- the exact schema version.

All evidence bytes and dependencies MUST be preserved or referenced through an Evidence Manifest or Offline Verification Package with exact commitments.

## 7. DDT checkpoint leaf

### 7.1 Leaf object

For every included DDT record, construct exactly:

```json
{
  "domain": "DDT_CHECKPOINT_LEAF_V1",
  "recordHash": {
    "algorithm": "SHA-256",
    "value": "<64 lowercase hexadecimal characters>"
  },
  "sequence": 0
}
```

`sequence` is the non-negative integer position in the checkpoint's declared `sequenceDomain`.

Unknown properties are forbidden in the baseline leaf object.

### 7.2 Leaf serialization

The leaf object MUST:

1. be parsed as I-JSON with duplicate properties rejected;
2. preserve strings without Unicode normalization;
3. be canonicalized with RFC 8785 JCS; and
4. be encoded as UTF-8.

### 7.3 Leaf hash

Let `LeafBytes` be the exact UTF-8 JCS bytes.

```text
LeafHash = SHA-256(0x00 || LeafBytes)
```

The `0x00` prefix is one byte, not the two ASCII characters `00`.

## 8. Merkle tree

### 8.1 Node hash

For two 32-byte child hashes:

```text
NodeHash = SHA-256(0x01 || LeftHash || RightHash)
```

The `0x01` prefix is one byte. `LeftHash` and `RightHash` are raw 32-byte values, not hexadecimal text.

### 8.2 Tree shape

Leaves are ordered by ascending `sequence`. Implementations MUST NOT sort by record hash, identifier or arrival order after the sequence has been assigned.

For `n > 1`, split the ordered leaf list at `k`, the largest power of two strictly less than `n`, recursively compute the left and right subtree roots, and hash them using the node rule.

The baseline:

- does not pad the tree;
- does not duplicate the last node;
- does not permit an empty checkpoint tree; and
- does not reorder leaves.

### 8.3 Inclusion proof

An inclusion proof contains:

- the exact checkpoint artifact reference;
- the exact tree-profile reference;
- leaf sequence and zero-based leaf index;
- tree size;
- recomputed leaf hash;
- ordered audit-path hashes; and
- expected root hash.

The verifier MUST reconstruct the root using the exact tree shape and compare it with both the signed checkpoint root and the inclusion proof's expected root.

An inclusion proof that verifies mathematically but points to a different checkpoint, tree size, sequence or target record hash MUST fail.

## 9. Signed checkpoint

### 9.1 Checkpoint core

The signed checkpoint core contains:

- `checkpointId`;
- `checkpointSequence`;
- exact previous-checkpoint identity and digest after genesis;
- exact tree-profile reference;
- tree size and root hash;
- coverage declaration;
- checkpoint close-time claim; and
- any other field explicitly added by a later versioned profile.

The checkpoint core is canonicalized with RFC 8785 JCS and encoded as UTF-8 before its digest is calculated.

Proof values and later external anchor artifacts are not inserted into the already finalized checkpoint core. They bind the finalized core or its root through separately committed evidence.

### 9.2 Checkpoint core hash and proof carrier

Version 0.2 preserves the v0.1 checkpoint-core field semantics and Merkle construction. For `DDT_SIGNED_CHECKPOINT`, the `body` is a carrier with exactly three members: `checkpointCore`, `checkpointCoreHash` and `checkpointProofs`. `checkpointCore` uses the schema-defined v0.1 core fields unchanged; `checkpointCoreHash` is a SHA-256 structural digest; and `checkpointProofs` is a non-empty array of complete Signature Proof v0.2 objects.

The verifier MUST parse the checkpoint core as I-JSON with duplicate members rejected, canonicalize `checkpointCore` with RFC 8785 JCS, encode the canonical form as UTF-8, and compute:

```text
checkpointCoreHash = SHA-256(UTF8(RFC8785-JCS(checkpointCore)))
```

`checkpointProofs` and `checkpointCoreHash` are outside `checkpointCore` and therefore do not participate in the core hash. This preserves non-circular construction.

Every checkpoint MUST carry at least one complete common Signature Proof v0.2 object. Every `checkpointProofs` entry MUST use exactly:

```text
proofPurpose      = CHECKPOINT_ATTESTATION
signedObject.type = CHECKPOINT_CORE_HASH
signedObject.digest = independently recomputed checkpointCoreHash
```

Proofs MUST be ordered by ascending Unicode code-point order of `proofId`; duplicate proof IDs MUST be rejected. The common proof's exact profile bytes and digest MUST be preserved. A valid signature over another purpose, another signed-object type or another digest is not a valid checkpoint proof.

For `DDT_SIGNED_CHECKPOINT`, the legacy `producer.proofRefs` array MUST be empty in the v0.2 evidence carrier. This prevents two competing authoritative checkpoint-proof sets. Historical v0.1 evidence remains interpreted under v0.1 and is never rewritten as v0.2.

Signature validity does not by itself establish signer identity, historical authority, checkpoint external time, event completeness or substantive truth. Those remain independent verification axes. Until the required signed/tampered and interoperability fixtures exist, this profile remains draft-only.

### 9.3 Checkpoint lineage

Checkpoint zero is genesis and has no predecessor. Every later checkpoint MUST bind the immediately preceding checkpoint identifier and exact digest.

Broken lineage, duplicate checkpoint sequence with different bytes or incompatible valid branches MUST be reported. A current checkpoint MUST NOT silently replace a historical branch.

### 9.4 Coverage consistency

For a declared contiguous range:

```text
leafCount = lastSequence - firstSequence + 1
treeSize = leafCount
```

The verifier MUST also confirm that each included leaf sequence occupies the expected position without duplicates or gaps.

## 10. Checkpoint time

`closedAtClaim` is a signed checkpoint claim. A signature preserves the claim but does not prove the clock.

Without an independent anchor, checkpoint inclusion establishes membership and relative ordering within the checkpoint. The checkpoint's external time status remains `ASSERTED` or `UNRESOLVED` according to the requested axis.

To derive `REGISTRATION_TIME_PROOF = PROVEN` through a checkpoint, a verifier needs:

1. a valid DDT record commitment;
2. a valid leaf construction;
3. a valid inclusion path to the exact signed checkpoint root;
4. a valid checkpoint proof and historical signer authority;
5. a valid external time proof binding that root or finalized checkpoint core; and
6. all historical trust, algorithm and validation dependencies required by the external-time profile.

## 11. RFC 3161 external timestamp

### 11.1 Preserved token and inputs

An RFC 3161 evidence object MUST preserve or digest-bind:

- original DER token bytes;
- message-imprint algorithm OID and value;
- TSA policy OID;
- TSA identity and certificate path;
- `genTime`;
- stated accuracy or the exact TSA policy that supplies it;
- ordering flag;
- nonce when used; and
- certificate, revocation and algorithm dependencies required for historical validation.

This baseline accepts the SHA-256 message-imprint algorithm identified by OID `2.16.840.1.101.3.4.2.1`. Additional imprint algorithms require a newly versioned profile; algorithm fallback is forbidden.

### 11.2 Validation

The verifier MUST:

1. decode the token without accepting malformed or ambiguous DER;
2. verify the token status and required fields;
3. confirm the message-imprint algorithm and length;
4. recompute the target imprint and require an exact match;
5. verify the TSA signature;
6. verify the TSA certificate path under the exact historical trust profile;
7. verify the critical time-stamping extended-key usage;
8. verify historically applicable certificate status and algorithm policy;
9. verify the TSA policy OID is permitted by the bound DDT profile;
10. check the nonce when present; and
11. reject unknown critical extensions.

### 11.3 Minimum time claim

A valid RFC 3161 token establishes evidence that the target datum existed no later than the supported upper bound of token generation time.

Where token accuracy is `a`:

```text
provenUpperBound = genTime + a
```

The verifier MUST report the bound and its evidence. It MUST NOT restate that result as proof that the upstream event occurred at `genTime`, that the record was first created then or that it did not exist earlier.

If accuracy cannot be obtained from the token or exact accepted TSA policy, the precision/bound result MUST remain `UNRESOLVED` under this baseline.

### 11.4 Ordering

Two RFC 3161 token times do not necessarily establish a strict order when their accuracy intervals overlap. The token's ordering flag and RFC 3161 rules MUST be evaluated exactly.

## 12. Direct time proof

A direct time proof binds the finalized `DDT_RECORD_HASH`, `DDT_REGISTRATION_STATEMENT_HASH` or another permitted exact artifact digest in the external timestamp's message imprint.

The verifier MUST compare:

- requested target type;
- target identifier where present;
- digest algorithm;
- digest value; and
- token message imprint.

Any target-type or digest substitution fails the binding even if the external token is otherwise valid.

## 13. Aggregate time proof

An aggregate proof may timestamp many DDT records through one checkpoint root.

The derived time proof is valid only when:

- the record hash is the exact leaf target;
- leaf canonicalization and hashing pass;
- the inclusion path reconstructs the exact root;
- checkpoint size, sequence and root match;
- checkpoint signature and authority pass; and
- the external timestamp binds that exact root or finalized checkpoint core.

Failure or unavailability at any required link MUST remain visible. A valid timestamp over a root does not repair an invalid leaf, inclusion path or checkpoint proof.

## 14. External network inclusion

### 14.1 Exact network profile

Every network inclusion proof MUST identify a digest-bound network profile defining:

- network and chain/genesis identity;
- transaction and block encoding;
- inclusion-proof algorithm;
- consensus/finality rule;
- fork and reorganization handling;
- trusted or independently verifiable inputs;
- historical node/state dependencies; and
- algorithm lifecycle.

### 14.2 Required proof

The verifier MUST establish:

- exact target commitment in the transaction or registered network object;
- valid transaction/object inclusion in the exact block;
- exact block identity and height/order;
- finality under the selected historical profile; and
- absence of an unresolved conflicting finalized branch under that profile.

### 14.3 Time boundary

Network inclusion may prove inclusion, ordering and finality. A block's embedded timestamp is not automatically independent external UTC time.

A network profile may qualify as external time evidence only if it explicitly defines and passes independent time-source, accuracy, manipulation-resistance and trust requirements. Otherwise its block time remains a network claim.

## 15. Registered sequence continuity

A checkpoint in `REGISTERED_RECORD_SEQUENCE` mode proves only what its evidence supports about DDT records that received positions in the named sequence domain.

Continuous positions can demonstrate:

- no missing registered position inside the sealed interval;
- exact order of included DDT record hashes; and
- integrity of the sealed root and checkpoint chain.

It does not prove that an upstream producer submitted every event that should have been recorded.

## 16. Closed event coverage

### 16.1 Additional contract

A claim that all required events were captured within a scope requires `CLOSED_EVENT_COVERAGE` and an exact coverage contract defining at least:

- event source and source identity;
- event classes included and excluded;
- start/end boundary;
- deterministic source sequence or equivalent omission-detection rule;
- registration trigger and permitted delay;
- treatment of failed submissions;
- expected counts or source-state commitment;
- correction/duplicate semantics;
- witness independence and quorum; and
- result when required evidence is unavailable.

### 16.2 Source evidence

The checkpoint MUST bind:

- the exact coverage contract;
- source-state commitment;
- checkpoint sequence range and count; and
- at least one source-witness evidence reference required by the contract.

The verifier MUST compare the sealed DDT interval with independently supported source state. A DDT-only assertion that it saw every event is insufficient for a global completeness claim.

### 16.3 Result limits

- a proven gap, count mismatch or source-state mismatch is `FAIL` for the affected coverage contract;
- unavailable required witness/source evidence is `UNRESOLVED` or `UNAVAILABLE` as defined by its axis;
- events outside the historically applicable coverage contract are not retroactive failures; and
- even a passing result is limited to the exact source, event classes, interval and contract.

## 17. Result model

This profile uses the existing Verification Result base axes:

| Axis | Status class | Use |
|---|---|---|
| `REGISTRATION_TIME_CLAIM` | `TIME` | Preserved DDC time assertion |
| `REGISTRATION_TIME_PROOF` | `TIME` | Direct or aggregate independently supported time bound |
| `EVIDENCE_TIME` | `TIME` | Time status of a specific supporting artifact |
| `INDEPENDENT_PROVENANCE` | `RESOLUTION` | Checkpoint/network/external-source provenance for a named subject |

The next versioned axis-registry revision MUST add a dedicated `EVENT_HISTORY_COMPLETENESS` axis before any DDT implementation reports a generic machine-readable completeness verdict. Until then, coverage findings remain scoped diagnostics and MUST NOT be collapsed into `REGISTRATION_TIME_PROOF`.

Multiple `EVIDENCE_TIME` or `INDEPENDENT_PROVENANCE` results are permitted only for different explicit subjects as required by the Verification Result uniqueness rule.

## 18. Status semantics

### 18.1 Time

- `ASSERTED` — time value is preserved and integrity-protected but not independently proven;
- `PROVEN` — required external-time evidence and all bindings/dependencies pass;
- `FAILED` — available complete evidence proves a binding, signature, policy or validation failure;
- `UNAVAILABLE` — required evidence bytes cannot be obtained;
- `UNRESOLVED` — available evidence is insufficient for a unique supported result; or
- `NOT_APPLICABLE` / `NOT_EVALUATED` as defined by the result profile.

### 18.2 Provenance

`INDEPENDENT_PROVENANCE = VERIFIED` means only that the exact named checkpoint, network or witness procedure passed for the explicit subject. It does not establish time, authority, completeness or substantive truth unless their separate axes also pass.

## 19. Stable reason codes

The baseline registers:

- `CHECKPOINT_CORE_SIGNATURE_INVALID`;
- `CHECKPOINT_INCLUSION_INVALID`;
- `CHECKPOINT_LEAF_MISMATCH`;
- `CHECKPOINT_LINEAGE_BROKEN`;
- `CHECKPOINT_RANGE_COUNT_MISMATCH`;
- `CHECKPOINT_ROOT_MISMATCH`;
- `COVERAGE_CONTRACT_UNAVAILABLE`;
- `EVENT_COVERAGE_UNRESOLVED`;
- `EVENT_SEQUENCE_GAP`;
- `EXTERNAL_ANCHOR_UNAVAILABLE`;
- `EXTERNAL_TIME_PROOF_INVALID`;
- `NETWORK_FINALITY_UNRESOLVED`;
- `NETWORK_FORK_CONFLICT`;
- `NETWORK_INCLUSION_INVALID`;
- `RFC3161_CERTIFICATE_STATUS_UNRESOLVED`;
- `RFC3161_MESSAGE_IMPRINT_MISMATCH`;
- `RFC3161_POLICY_UNACCEPTED`;
- `RFC3161_SIGNATURE_INVALID`;
- `RFC3161_TOKEN_UNAVAILABLE`;
- `RFC3161_TSA_IDENTITY_UNRESOLVED`;
- `SOURCE_STATE_COMMITMENT_MISMATCH`;
- `TIME_ACCURACY_UNRESOLVED`;
- `TIME_CLAIM_ONLY`;
- `TIME_LAYER_CONFLATION`;
- `TIMESTAMP_TARGET_BINDING_MISMATCH`;
- `UNBOUND_CURRENT_TIME_SOURCE`; and
- `WITNESS_AUTHORITY_UNRESOLVED`.

## 20. Preservation and renewal

The Offline Verification Package MUST preserve, where applicable:

- DDT record and registration-statement bytes;
- leaf construction inputs;
- checkpoint core and proof bytes;
- inclusion paths;
- external timestamp token bytes;
- TSA certificate path, policy and historical status evidence;
- network transaction, block, inclusion and finality evidence;
- coverage contract and source witness evidence;
- exact schemas, profiles and validation procedures; and
- all algorithm identifiers.

Before any algorithm, trust anchor, TSA certificate path or network verification dependency becomes inadequate, a cryptographic-renewal event SHOULD bind the still-verifiable package into a new profile without rewriting original evidence.

Renewal proves only what was successfully verified at renewal time. It does not restore a time proof that was already unverifiable.

## 21. Claim boundary

A valid time proof establishes the supported existence bound of the exact committed target. It does not establish:

- that the upstream event occurred at that time;
- that the timestamp is the first time the data existed;
- that the data is true;
- that the signer was authorized;
- that every relevant event was recorded; or
- that historical semantic reconstruction is complete.

A valid checkpoint inclusion establishes membership in the exact checkpoint root and ordering under the profile. It does not establish external UTC time without a valid external anchor.

## 22. Security considerations

Implementations MUST address:

- target-digest and target-type substitution;
- duplicate JSON properties and canonicalization mismatch;
- Merkle leaf reordering, duplication, padding and tree-shape disagreement;
- forged or truncated audit paths;
- checkpoint forks, rollback and predecessor substitution;
- checkpoint signer compromise or unauthorized signing;
- RFC 3161 message-imprint, policy, nonce, certificate and extension failures;
- TSA compromise, revocation and algorithm aging;
- blockchain/network fork, reorganization, weak finality and fabricated block time;
- sequence allocation that permits silent pre-allocation omission;
- false source-state counts or witness collusion;
- current trust or network state substituted for historical state;
- unavailable off-chain time and witness evidence; and
- overstated claims derived from valid lower-layer proofs.

## 23. Required fixtures before candidate status

At minimum:

1. one-leaf, two-leaf, three-leaf and non-power-of-two tree roots;
2. property-order independent leaf canonicalization;
3. duplicate-property and Unicode-normalization boundary cases;
4. altered record hash, sequence, leaf index and tree size;
5. altered, shortened, extended and reordered audit paths;
6. padding and duplicate-last-node implementations rejected;
7. valid genesis and multi-checkpoint lineage;
8. missing predecessor, substituted predecessor and checkpoint fork;
9. checkpoint range/count mismatch and sequence gap;
10. valid checkpoint signature and unauthorized signer;
11. unanchored checkpoint yielding asserted, not proven, time;
12. valid direct RFC 3161 timestamp over a DDT record hash;
13. valid aggregate RFC 3161 timestamp over a checkpoint root;
14. message-imprint, algorithm-OID, TSA policy and signature tamper;
15. invalid or historically unresolved TSA certificate status;
16. missing accuracy and overlapping-accuracy ordering case;
17. valid network inclusion/finality under an exact profile;
18. transaction substitution, block substitution, insufficient finality and fork conflict;
19. block-time claim not promoted to external time;
20. continuous registered sequence without source completeness evidence;
21. valid closed event-coverage contract with source witness;
22. omitted source event, source-count mismatch and unavailable witness;
23. out-of-contract event not converted into retroactive failure;
24. time proof valid while record truth and signer authority remain separate;
25. complete offline re-verification without a DDC-operated service; and
26. two independent implementations producing the same roots, paths, bounds, statuses and reason codes.

## 24. Integration requirements

The next versioned integration revision MUST:

- preserve the integrated Signature Proof v0.2 `CHECKPOINT_ATTESTATION` / `CHECKPOINT_CORE_HASH` binding;
- bind the selected Time/Checkpoint Profile through the Enterprise Profile and Preservation Contract;
- preserve time/checkpoint evidence through the Evidence Manifest and Offline Verification Package;
- add the dedicated event-history completeness axis through a bound axis-registry revision;
- connect registration-time conformance rules to required time evidence; and
- keep all legacy envelope and proof artifacts unchanged.

## 25. Draft limitations

This draft defines exact checkpoint mathematics, evidence structures and claim boundaries, but it is not yet a production implementation.

Before candidate status, DDC still requires:

- normative checkpoint and timestamp fixtures;
- a reference Merkle/checkpoint verifier;
- an RFC 3161 validation implementation or exact external adapter;
- at least one exact network/finality profile and fixture;
- a closed event-coverage contract fixture;
- aligned Signature Proof v0.2 and Verification Result v0.2 fixtures;
- offline-package integration; and
- independent second-implementation reproduction.

## 26. External references

- BCP 14: RFC 2119 and RFC 8174 normative-language interpretation.
- RFC 3161, Internet X.509 Public Key Infrastructure Time-Stamp Protocol.
- RFC 3339, Date and Time on the Internet: Timestamps.
- RFC 8785, JSON Canonicalization Scheme.
- RFC 9162, Certificate Transparency Version 2.0, used as the domain-separated binary Merkle-tree construction reference.
