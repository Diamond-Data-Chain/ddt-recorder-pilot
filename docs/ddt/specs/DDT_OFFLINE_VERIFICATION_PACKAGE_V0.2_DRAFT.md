# DDT Offline Verification Package v0.2 — Draft

**Project:** Diamond Data Chain (DDC)  
**Specification ID:** `DDT-OFFLINE-VERIFICATION-PACKAGE-0.2-DRAFT.1`  
**Version:** `0.2.0-draft.1`  
**Status:** DRAFT — Signature Proof v0.2 integrated; reference packager/verifier and complete fixtures pending  
**Date:** 2026-09-05  
**Parent standard:** `DDC-TRS-2.0-DRAFT.1`

## 1. Purpose

This specification defines a deterministic evidence package that a later verifier can inspect without a DDC-operated API, mutable registry, dashboard, live blockchain endpoint or proprietary service.

It preserves the exact artifacts and assumptions required to determine what the available evidence proves and what remains unavailable, unresolved, partial, conflicting or not applicable.

## 2. Claim boundary

An intact package proves only that its manifest and embedded artifacts match their registered commitments. It does not by itself prove:

- substantive truth of an upstream assertion;
- legal validity or adequacy;
- signer identity or authority;
- independent time;
- network finality;
- source-event completeness;
- availability of confidential external evidence; or
- that the original registration was conformant.

Those questions require their own exact artifacts, procedures and result axes.

## 3. Package model

A package consists of:

1. one `package-manifest.json` carrier conforming to the companion schema;
2. every embedded file listed exactly once in `manifestCore.files`;
3. one or more package-manifest proofs carried outside `manifestCore` using Signature Proof v0.2;
4. no unlisted ordinary payload files; and
5. optional transport metadata that is explicitly non-normative.

The archive format is only a transport. The manifest and file bytes define the verification package.

## 4. Non-circular manifest construction

The manifest is constructed in this order:

1. finalize `manifestCore` without `manifestCoreHash` or `manifestProofs`;
2. compute `manifestCoreHash = SHA-256(UTF8(RFC8785-JCS(manifestCore)))`;
3. create Signature Proof v0.2 objects that sign the exact `manifestCoreHash` under a bound proof profile; and
4. place `manifestCore`, `manifestCoreHash` and the complete proof objects in the carrier.

The manifest carrier itself is not listed in `manifestCore.files`. `manifestProofs` are outside the hashed core and therefore do not create a signature/file-digest cycle. Each proof is nevertheless self-binding because every proof-core field except `proofValue` participates in the Signature Proof v0.2 signing input.

Changing any core field or listed file changes `manifestCoreHash`. Changing any proof field does not change the core hash, but changes the proof signing input and causes proof verification to fail.

## 5. Canonical file inventory

Every embedded file entry MUST contain:

- normalized package-relative path;
- media type;
- semantic role;
- exact byte length;
- SHA-256 digest of the raw packaged bytes;
- whether the file is required for the declared verification plan; and
- applicable target or dependency identifiers.

Paths MUST use `/`, MUST be relative, MUST NOT contain empty, `.` or `..` segments, backslashes, NUL, leading `/` or platform-dependent normalization. Duplicate paths, Unicode-normalization aliases and case-folding collisions MUST be rejected.

Regular files are the only permitted listed entry type. Symlinks, hard links, device nodes, FIFOs and executable install hooks are forbidden.

## 6. Required semantic roles

Depending on the target and historical Preservation Contract, a complete package may require:

- DDT Record Envelope and registration statement;
- Evidence Manifest and Preservation Contract;
- Enterprise Profile and materialized obligations;
- Conformance Receipt and validation dependencies;
- exact schemas, profiles, vocabularies and rulesets;
- signature proofs and historical identity/authority evidence;
- time/checkpoint evidence;
- network inclusion/finality evidence;
- relationship and event-coverage artifacts;
- earlier Verification Results and append-only corrections;
- cryptographic-renewal evidence;
- reference verifier source or reproducible executable;
- positive and tampered fixtures plus expected results; and
- human-readable documentation.

The package MUST NOT claim completeness merely because a familiar filename is present. Required roles are derived from the exact historical Preservation Contract, Enterprise Profile, target type and verification request.

## 7. Exact dependency closure

`manifestCore.dependencyClosure` lists every normative artifact actually required by the verification plan, including transitive schema/profile/ruleset dependencies.

Each dependency binds:

- artifact ID;
- version;
- SHA-256 digest;
- media type; and
- exact local path or immutable external reference.

Mutable URLs and current registries are discovery aids only. They MUST NOT substitute for historical bytes whose digest was bound at registration.

A dependency is satisfied only when the independently computed byte digest matches the declared digest. Same version label with different bytes is a failure.

## 8. Target binding

The manifest MUST identify one exact primary verification target and MAY identify additional root artifacts. A target includes its type, stable identifier and cryptographic commitment.

The verifier MUST establish an unbroken cryptographic path from every result-bearing artifact to the declared target. Filename similarity, directory location or UI linkage is insufficient.

## 9. Confidential and external evidence

DDT is not a document warehouse. Confidential documents and business secrets MAY remain outside a public package when the historical Preservation Contract permits it.

`manifestCore.externalDependencies` records the exact commitment, semantic role, disclosure mode, historical preservation obligation, observed availability and the verification checks affected by absence.

The package MUST distinguish:

- evidence bytes not required by the historical contract;
- required evidence intentionally retained by an external custodian;
- evidence available only through authorized disclosure;
- evidence expected but currently unavailable; and
- evidence whose integrity fails when presented.

A missing external document does not automatically corrupt the DDT Record. It may make document integrity or semantic reconstruction `UNAVAILABLE` or `PARTIAL`. If preservation of those bytes was mandatory, the separate preservation-conformance axis may fail.

## 10. Verification plan

The manifest binds the declared checks and exact result profile. Baseline checks include:

- package structure and path safety;
- manifest-core recomputation;
- embedded-file digest and size verification;
- manifest-proof verification using the exact Signature Proof v0.2 carrier binding;
- target and dependency closure;
- schema and historical conformance reproduction;
- record and evidence commitments;
- signatures, identity and authority;
- time/checkpoint and network/finality evidence;
- relationship and event-coverage evidence;
- renewal lineage; and
- historical semantic resolution when explicitly requested.

The plan uses `networkAccess = DENY`. A conforming offline run MUST NOT silently retrieve missing material. A separately declared online augmentation may discover additional evidence, but produces a new result and does not rewrite the offline package or run.

## 11. Independent verification procedure

A verifier MUST:

1. extract into a new bounded directory without following archive links;
2. reject unsafe, duplicate, aliased or unlisted paths;
3. parse the manifest under the exact companion schema;
4. recompute `manifestCoreHash` over exact JCS/UTF-8 core bytes;
5. verify each embedded raw-byte size and digest;
6. verify each `manifestProofs` object, its exact purpose/target pair and its signed-object digest;
7. resolve the exact dependency closure using package bytes only;
8. verify target bindings and execute every declared check it supports;
9. report unsupported or missing procedures as `UNAVAILABLE` or `NOT_EVALUATED`, never as pass;
10. preserve all multi-axis results and reason codes;
11. refuse network access during the declared offline run; and
12. produce a deterministic run artifact that identifies verifier code, environment, inputs and results.

The verifier MUST NOT use filesystem metadata such as modification time as evidence of historical event, signing or registration time.

## 12. Archive and resource safety

Before extraction, implementations MUST enforce profile-defined limits for:

- total entries;
- individual uncompressed bytes;
- total uncompressed bytes;
- path length and nesting depth;
- compression ratio;
- JSON nesting and collection sizes; and
- verifier execution time and memory.

Limit rejection is a package-processing result, not proof that the underlying DDT is invalid.

## 13. Manifest proof and identity

A package MUST carry at least one Signature Proof v0.2 object with exactly:

```text
proofPurpose      = OFFLINE_PACKAGE_ATTESTATION
signedObject.type = MANIFEST_CORE_HASH
signedObject.digest = manifestCoreHash
```

Proofs MUST be deterministically ordered by `proofId`, and duplicate proof identifiers MUST be rejected. Proof validity, verification-method integrity, signer identity, signer authority and proof time remain separate axes.

The proof MUST sign `MANIFEST_CORE_HASH`, not an ambiguous archive filename or mutable URL. Private keys and credentials MUST never be included.

Version 0.2 directly references `DDT-SIGNATURE-PROOF-0.2-DRAFT.1` and restricts every manifest proof to the registered `OFFLINE_PACKAGE_ATTESTATION` / `MANIFEST_CORE_HASH` pair. The format remains DRAFT until full schema-engine, signature, archive-security and independent offline-reproduction fixtures pass.

## 14. Verification results

Package verification MUST NOT collapse all checks into one `VERIFIED` flag. At minimum it reports independently:

- `PACKAGE_MANIFEST_INTEGRITY`;
- `PACKAGE_FILE_INTEGRITY`;
- `PACKAGE_DEPENDENCY_CLOSURE`;
- `PACKAGE_PROOF_VALIDITY`;
- `PACKAGE_OFFLINE_REPRODUCIBILITY`;
- the underlying DDT verification axes requested by the plan; and
- `SUBSTANTIVE_TRUTH = NOT_APPLICABLE` for package-integrity verification.

An overall summary is permitted only under an exact derivation profile and must preserve every failing, unavailable, unresolved, conflicting or partial axis.

## 15. Append-only lifecycle

A package is immutable once its manifest core is signed or externally committed. Adding evidence, fixing a packaging error, changing a verifier or producing a renewal creates a new package ID and manifest that references its predecessor and states the relationship.

The original package and result remain available. Later packaging MUST NOT imply that previously unavailable evidence was present during an earlier registration or verification.

## 16. Cryptographic lifecycle

The package MUST preserve algorithm identifiers, parameters, canonicalization profiles, verification methods and historical trust evidence required by its contents.

Before a required algorithm or trust anchor becomes inadequate, a renewal event MAY bind the still-verifiable package manifest core into a new cryptographic profile. Renewal does not rewrite original bytes or restore a proof that was already unverifiable.

## 17. Stable reason codes

- `PACKAGE_SCHEMA_INVALID`;
- `PACKAGE_MANIFEST_HASH_MISMATCH`;
- `PACKAGE_MANIFEST_PROOF_UNAVAILABLE`;
- `PACKAGE_MANIFEST_PROOF_INVALID`;
- `PACKAGE_UNSAFE_PATH`;
- `PACKAGE_DUPLICATE_PATH`;
- `PACKAGE_UNLISTED_FILE`;
- `PACKAGE_LISTED_FILE_MISSING`;
- `PACKAGE_FILE_SIZE_MISMATCH`;
- `PACKAGE_FILE_DIGEST_MISMATCH`;
- `PACKAGE_DEPENDENCY_MISSING`;
- `PACKAGE_DEPENDENCY_DIGEST_MISMATCH`;
- `PACKAGE_TARGET_BINDING_FAILED`;
- `PACKAGE_REQUIRED_ROLE_MISSING`;
- `PACKAGE_EXTERNAL_EVIDENCE_UNAVAILABLE`;
- `PACKAGE_NETWORK_ACCESS_ATTEMPTED`;
- `PACKAGE_VERIFIER_UNAVAILABLE`;
- `PACKAGE_VERIFIER_UNSUPPORTED_CHECK`;
- `PACKAGE_RESULT_DERIVATION_FAILED`;
- `PACKAGE_RESOURCE_LIMIT_EXCEEDED`;
- `PACKAGE_ARCHIVE_ENTRY_FORBIDDEN`;
- `PACKAGE_HISTORICAL_PROFILE_UNRESOLVED`;
- `PACKAGE_NONDETERMINISTIC_RESULT`; and
- `PACKAGE_SUBSTANTIVE_TRUTH_OVERSTATED`.

## 18. Required fixtures before candidate status

1. valid self-contained package with network disabled;
2. one-byte manifest-core tamper;
3. one-byte embedded-file tamper;
4. listed file missing;
5. unlisted file inserted;
6. duplicate and case-colliding paths;
7. `../`, absolute-path, backslash and symlink archive attacks;
8. dependency version equal but bytes/digest changed;
9. missing transitive schema reference;
10. invalid manifest proof, wrong purpose/target pair, wrong signed-object digest or duplicate proof ID;
11. valid proof with unresolved signer authority;
12. confidential document legitimately absent;
13. mandatory externally retained document unavailable;
14. attempted live API/RPC access during offline mode;
15. resource-exhaustion archive;
16. deterministic repeat run with byte-identical result core;
17. append-only successor package;
18. renewal of a still-verifiable package;
19. expired/compromised historical algorithm result; and
20. intact package with `SUBSTANTIVE_TRUTH = NOT_APPLICABLE`.

## 19. Candidate and final gates

Candidate status requires the companion schema, reference packager, independent offline verifier, all mandatory fixtures and deterministic result reproduction.

Final status additionally requires:

- no unresolved normative dependency;
- independent implementation or bounded external reproduction;
- security review of archive extraction and resource limits;
- complete signed, tampered and independently reproduced Signature Proof v0.2 fixtures plus Verification Result integration; and
- a claim audit confirming that package integrity is not described as substantive truth, authority, time, completeness or finality.
