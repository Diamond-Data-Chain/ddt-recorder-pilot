# DDT Network Finality Adapter v0.1 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-NETWORK-FINALITY-ADAPTER-0.1-DRAFT.1`  
**Version:** `0.1.0-draft.1`  
**Status:** DRAFT — no production DDC network profile is claimed  
**Date:** 2026-09-04  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`  
**Time/checkpoint dependency:** `DDT-TIME-CHECKPOINT-PROFILE-0.1-DRAFT.1`

## 1. Purpose

This adapter defines the exact information a network-specific profile and evidence package must provide before DDC reports that a DDT commitment was included and finalized in a named historical network state.

It separates:

- the DDT commitment being anchored;
- its exact encoding inside a transaction or network object;
- transaction/object identity;
- inclusion in one exact block or finalized ledger unit;
- block identity, ancestry and network order;
- finality under the historically applicable consensus profile;
- conflicting-finality and reorganization handling;
- network time claims; and
- independently proven external UTC time.

## 2. Claim boundary

```text
transaction identifier known
  != transaction bytes verified

transaction bytes verified
  != DDT target commitment extracted correctly

valid inclusion proof
  != containing block finalized

block finalized
  != independent UTC time proven

network finality
  != substantive truth of the DDT payload
```

Network inclusion and finality support historical registration/order claims. They do not establish upstream factual truth, signer authority, source-event completeness or legal validity.

## 3. Companion artifacts

The companion artifacts are:

- `schemas/ddt-network-finality-profile-v0.1.schema.json`;
- `schemas/ddt-network-finality-evidence-v0.1.schema.json`; and
- `profiles/ddt-deterministic-finality-test-profile-v0.1.json`.

The included profile is explicitly `TEST_ONLY`. It exists to implement and test the adapter contract without pretending that the future DDC mainnet consensus has already been selected or deployed.

The bundled Evidence schema is likewise specific to this deterministic test profile. A production network profile MUST bind its own exact evidence schema, or an explicitly compatible successor, by version and digest.

A production network requires its own profile ID, version, digest, immutable protocol specification, network/genesis identity, proof procedures, historical validator/trust-state rules and independently reproducible fixtures.

## 4. Exact network profile

Every network proof MUST bind an exact Network Finality Profile Artifact Reference. The profile MUST define:

- stable network identifier and network class;
- chain/genesis identity;
- protocol specification and historical upgrade rules;
- transaction/object encoding and identifier derivation;
- exact target-extraction procedure;
- block/header encoding and block identifier derivation;
- inclusion tree/proof algorithm;
- finality model and threshold/rule;
- validator, committee or trust-state resolution;
- fork, reorganization and conflicting-finality behavior;
- network timestamp semantics;
- algorithm lifecycle and unsupported-upgrade behavior; and
- complete offline verification inputs.

A mutable RPC response or present-day node configuration MUST NOT substitute for the historically applicable profile or consensus state.

## 5. Network identity

A network profile MUST bind:

- `networkId` — stable identifier for the exact network;
- `networkClass` — `BLOCKCHAIN`, `BFT_LEDGER`, `TRANSPARENCY_LOG`, `TEST_LEDGER` or a future namespaced class;
- `genesisCommitment` — exact cryptographic identity of the genesis state;
- optional `chainId` where the protocol defines one;
- exact protocol specification; and
- historical upgrade registry/rule.

Equal chain IDs do not by themselves prove equal networks. A verifier MUST compare every profile-required network identity component.

For protocols with upgrades, the verifier MUST establish which exact protocol rules applied at the evaluated height/epoch. Current rules MUST NOT be applied retroactively.

## 6. Target binding

### 6.1 Allowed target types

The adapter baseline permits network binding of:

- `DDT_RECORD_HASH`;
- `DDT_REGISTRATION_STATEMENT_HASH`;
- `DDT_CHECKPOINT_CORE_HASH`;
- `DDT_COVERAGE_STATEMENT_CORE_HASH`; or
- an exact namespaced target type permitted by the network profile.

The evidence MUST preserve the target type, digest algorithm and digest value.

### 6.2 Extraction

The Network Finality Profile MUST identify a deterministic target-extraction procedure that takes the exact transaction or network-object bytes and returns the committed target tuple.

The verifier MUST compare:

1. the requested DDT target tuple;
2. the tuple extracted from the independently verified network object; and
3. the tuple asserted by the Network Finality Evidence.

Any mismatch fails target binding. Searching RPC text, event descriptions or UI fields without the profile-defined byte-level extraction procedure is insufficient.

## 7. Transaction or network-object integrity

The evidence MUST preserve or independently retrieve exact canonical bytes for the transaction/network object under the bound profile.

The verifier MUST:

1. decode under the exact historical object-encoding rules;
2. reject non-canonical encodings where the protocol requires canonical form;
3. independently recompute the object identifier;
4. compare it with the asserted identifier;
5. execute the target-extraction procedure; and
6. preserve the exact bytes/digest used.

A transaction identifier without verified transaction bytes makes target extraction `UNAVAILABLE` or `UNRESOLVED`.

## 8. Inclusion proof

The profile MUST define the exact commitment tree or authenticated data structure that binds the transaction/object into the containing block or ledger unit.

The proof MUST identify:

- transaction/object identifier and commitment;
- leaf index/key and tree size or equivalent authenticated coordinates;
- exact proof nodes/bytes;
- asserted root;
- containing block/header identifier and height; and
- inclusion procedure artifact.

The verifier MUST independently recompute the inclusion root and compare it with the root protected by the independently verified block/header.

A mathematically valid proof against a different root, block, object, target or network MUST fail.

## 9. Block/header integrity and ancestry

The exact block/header bytes MUST be decoded under the historical profile and its identifier independently recomputed.

The verifier MUST establish:

- network identity;
- height/epoch/round where applicable;
- parent or predecessor binding;
- inclusion root;
- state/auxiliary roots required by the profile;
- historical validator/trust-state reference; and
- embedded timestamp claim without upgrading it to independent time.

If the finality rule depends on ancestry depth, checkpoint ancestry or epoch transitions, every required intermediate header, proof or trusted checkpoint MUST be preserved or independently retrievable and integrity-verified.

Missing ancestry makes the affected finality result `UNAVAILABLE`; an implementation MUST NOT assume continuity from matching heights alone.

## 10. Finality models

A network profile selects exactly one model:

- `DETERMINISTIC_CERTIFICATE` — an exact certificate and historically valid signer/committee threshold finalize a block;
- `BFT_QUORUM_CERTIFICATE` — protocol-defined votes/quorum/round rules finalize a block;
- `PROBABILISTIC_DEPTH` — a block reaches a profile-defined confirmation depth but is never described as absolute deterministic finality;
- `EXTERNAL_CHECKPOINT` — an independently authenticated checkpoint finalizes a bounded ancestry; or
- a future namespaced model with exact deterministic verification rules.

The profile MUST define the status language permitted for its model. A probabilistic-depth result MUST NOT be reported as deterministic finality.

## 11. Historical trust and validator state

Finality verification MUST use the exact validator, committee, signer or trust-anchor state applicable to the target block.

The required evidence may include:

- validator-set artifact and commitment;
- activation and retirement boundaries;
- stake/weight snapshot and quorum calculation;
- committee selection proof;
- key lifecycle, rotation and revocation evidence;
- protocol upgrade state; and
- trust-root transition proof.

A currently valid key or validator list MUST NOT substitute for historical state.

Signature validity, signer identity, key lifecycle, finality authority and quorum satisfaction remain separate checks.

## 12. Non-circular finality certificate

For certificate-based profiles, the finalized certificate core MUST be constructed before its proofs:

```json
{
  "domain": "PROFILE_DEFINED_FINALITY_DOMAIN",
  "networkId": "example-network",
  "blockId": "example-block",
  "blockHeight": 42,
  "round": 0,
  "validatorSet": {},
  "finalityModel": "DETERMINISTIC_CERTIFICATE"
}
```

```text
finalityCoreHash = PROFILE_DEFINED_HASH(PROFILE_DEFINED_CANONICAL_BYTES(finalityCore))
```

Proofs bind `finalityCoreHash`; proof values are not inserted into `finalityCore`.

The finality certificate carrier contains the core, registered core hash and proof references. A verifier independently recomputes the core hash before verifying quorum/proofs.

## 13. Forks, reorganizations and conflicts

The profile MUST define:

- which branch-selection/finality rule is authoritative;
- whether finalized blocks can be reverted under the protocol model;
- maximum or unbounded reorganization assumptions;
- treatment of weak-subjectivity or trusted checkpoints where applicable;
- conflicting-certificate detection; and
- the result when independently valid evidence supports incompatible finalized states.

Two valid finality certificates for incompatible blocks under the same exclusive height/round/committee scope MUST produce `CONFLICTING` or `FAIL` according to the exact profile. A verifier MUST NOT silently choose the branch returned by its preferred RPC endpoint.

A later reorganization or finality violation creates a new verification result; it does not rewrite the historical evidence or earlier published result.

## 14. Network time is separate

`blockTimeClaim` is the timestamp field protected by the block/header. It proves only that the network object committed that value.

By default:

```text
NETWORK_TIME_CLAIM = ASSERTED
REGISTRATION_TIME_PROOF = UNAVAILABLE unless separate external-time evidence passes
```

A production network profile may qualify network time as independent external time only when it defines and passes exact time-source, accuracy, manipulation-resistance, consensus and trust requirements. Otherwise finality proves order/inclusion, not independent UTC time.

## 15. Evidence carrier

`DDT-NETWORK-FINALITY-EVIDENCE-0.1-DRAFT.1` contains:

- exact Network Finality Profile reference;
- target tuple;
- transaction/network-object identity, bytes commitment and extraction result;
- inclusion proof coordinates and asserted root;
- block/header identity, bytes commitment and required fields;
- finality certificate/checkpoint and historical trust-state references;
- ancestry evidence references;
- fork/conflict search evidence and observation boundary;
- block-time claim; and
- all required proof/dependency references.

The carrier is committed through the Evidence Manifest. External artifacts remain separate exact evidence objects and may remain off-chain subject to the historical Preservation Contract.

## 16. Verification procedure

A conforming independent verifier MUST:

1. resolve the exact profile and all transitive normative dependencies;
2. verify profile, network/genesis and historical protocol-version identity;
3. obtain and verify exact transaction/network-object bytes;
4. independently recompute the object identifier;
5. execute the exact target-extraction procedure and compare all target tuples;
6. verify the inclusion proof against the block/header root;
7. obtain and verify exact block/header bytes and block identifier;
8. verify required ancestry and historical protocol transitions;
9. resolve historical validator/trust state;
10. recompute finality-certificate/checkpoint core commitments;
11. verify proof signatures, signer identity/lifecycle, authority and quorum;
12. apply the exact finality and fork/reorganization rule;
13. search/evaluate conflict evidence to the profile-required observation boundary;
14. report inclusion, finality, provenance and time as separate axes; and
15. preserve every missing, failing, conflicting or unresolved dependency.

No network/RPC provider may be treated as authoritative merely because its response is available.

## 17. Verification Result integration

The next versioned Verification Result registry SHOULD add:

| Axis | Status class | Purpose |
|---|---|---|
| `NETWORK_TARGET_BINDING` | `BINDING` | Exact DDT target extracted from verified network object |
| `NETWORK_OBJECT_INCLUSION` | `VALIDITY` | Verified inclusion in exact block/header root |
| `NETWORK_FINALITY` | `FINALITY` | Finality status under exact historical network profile |

The `FINALITY` status class SHOULD permit:

- `FINALIZED`;
- `CONFIRMED_PROBABILISTIC`;
- `NOT_FINAL`;
- `REVERTED`;
- `CONFLICTING`;
- `UNAVAILABLE`;
- `UNRESOLVED`;
- `NOT_APPLICABLE`; and
- `NOT_EVALUATED`.

Existing `REGISTRATION_MECHANISM_PROOF` and `INDEPENDENT_PROVENANCE` MAY summarize scoped adapter outcomes only under an exact result-derivation profile. They MUST NOT hide the new underlying axes once registered.

## 18. Stable reason codes

The baseline defines:

- `NETWORK_PROFILE_UNAVAILABLE`;
- `NETWORK_PROFILE_INTEGRITY_FAILED`;
- `NETWORK_IDENTITY_MISMATCH`;
- `NETWORK_GENESIS_MISMATCH`;
- `NETWORK_PROTOCOL_VERSION_UNRESOLVED`;
- `NETWORK_OBJECT_BYTES_UNAVAILABLE`;
- `NETWORK_OBJECT_DECODING_FAILED`;
- `NETWORK_OBJECT_ID_MISMATCH`;
- `NETWORK_TARGET_EXTRACTION_FAILED`;
- `NETWORK_TARGET_BINDING_MISMATCH`;
- `NETWORK_INCLUSION_PROOF_UNAVAILABLE`;
- `NETWORK_INCLUSION_PROOF_INVALID`;
- `NETWORK_INCLUSION_ROOT_MISMATCH`;
- `NETWORK_BLOCK_BYTES_UNAVAILABLE`;
- `NETWORK_BLOCK_ID_MISMATCH`;
- `NETWORK_BLOCK_FIELD_MISMATCH`;
- `NETWORK_ANCESTRY_UNAVAILABLE`;
- `NETWORK_ANCESTRY_INVALID`;
- `NETWORK_HISTORICAL_TRUST_STATE_UNAVAILABLE`;
- `NETWORK_VALIDATOR_SET_MISMATCH`;
- `NETWORK_FINALITY_CERTIFICATE_INVALID`;
- `NETWORK_FINALITY_QUORUM_NOT_MET`;
- `NETWORK_FINALITY_NOT_REACHED`;
- `NETWORK_FINALITY_MODEL_OVERSTATED`;
- `NETWORK_REORGANIZATION_DETECTED`;
- `NETWORK_CONFLICTING_FINALITY`;
- `NETWORK_CONFLICT_OBSERVATION_INSUFFICIENT`;
- `NETWORK_BLOCK_TIME_ASSERTED_ONLY`;
- `NETWORK_EXTERNAL_TIME_UNAVAILABLE`; and
- `NETWORK_UNSUPPORTED_PROTOCOL_UPGRADE`.

Network-specific profiles MAY add namespaced codes and MUST NOT redefine these meanings.

## 19. Deterministic test profile

The bundled profile `ddt.network-finality.deterministic-test-v1` is for software tests only.

It defines:

- network class `TEST_LEDGER`;
- genesis identity `SHA-256(UTF8("DDT_TEST_LEDGER_GENESIS_V1")) = 893ffb702b2801ab493b804981cace29159e1c6ce8977c3dbbb5b1fd898f3acc`;
- exact JCS/UTF-8/SHA-256 transaction and block-header constructions;
- domain-separated SHA-256 transaction leaves and internal tree nodes;
- deterministic certificate core hashing;
- pure Ed25519 signature proofs under the DDT Signature Profile;
- one historically bound authorized test signer with minimum valid signature count one;
- no independent external-time claim; and
- conflict rather than branch preference when two incompatible valid certificates occupy the same height.

For this profile, the exact constructions are:

```text
canonicalTransactionBytes = UTF8(RFC8785-JCS(transactionCore))
transactionId = SHA-256(canonicalTransactionBytes)
transactionBytesCommitment = SHA-256(canonicalTransactionBytes)
extractedTarget = transactionCore at JSON Pointer /target

leafHash = SHA-256(HEX(00) || UTF8(RFC8785-JCS(transactionLeaf)))
internalHash = SHA-256(HEX(01) || RAW(leftDigest) || RAW(rightDigest))

blockId = SHA-256(UTF8(RFC8785-JCS(blockHeaderCore)))
finalityCoreHash = SHA-256(UTF8(RFC8785-JCS(finalityCore)))
```

Audit-path orientation is derived only from `transactionIndex`, `treeSize` and the defined largest-power-of-two split rule. No duplicate-last-node or padding convention is permitted.

Passing this profile demonstrates adapter implementation behavior. It does not demonstrate production DDC mainnet finality, decentralization or independent trust.

## 20. Required fixtures before candidate status

At minimum:

1. valid target extraction, inclusion and deterministic test finality;
2. transaction byte tamper;
3. transaction identifier mismatch;
4. DDT target substitution;
5. target type substitution;
6. inclusion path tamper;
7. proof against a different block root;
8. block/header byte tamper;
9. block identifier mismatch;
10. parent/ancestry substitution;
11. wrong genesis/network profile;
12. current validator set substituted for historical set;
13. unauthorized signer;
14. insufficient quorum;
15. finality certificate core tamper;
16. unsupported protocol upgrade;
17. two incompatible valid finality certificates;
18. reorganization after a non-final inclusion;
19. missing required conflict-observation evidence;
20. block time preserved as asserted but not independent UTC proof;
21. valid external timestamp over finalized block/checkpoint as a separate time proof;
22. `NETWORK_FINALITY = FINALIZED` with `SUBSTANTIVE_TRUTH = NOT_APPLICABLE`;
23. historical re-evaluation that appends rather than rewrites; and
24. offline reproduction with all network APIs disabled.

## 21. Production-profile gate

No profile may be called a production DDC network profile until the DDC network protocol and consensus/finality rules are frozen and the profile has:

- exact network/genesis identity;
- historical upgrade and validator-state procedures;
- complete inclusion/finality verifier implementation;
- positive, tampered, fork and conflict fixtures;
- independently reproducible offline results; and
- a claim review confirming that network time, completeness and substantive truth are not overstated.
