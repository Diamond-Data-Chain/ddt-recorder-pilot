# DDT Historical Identity, Key Lifecycle and Authority Profile v0.1 Draft.1

**Registry ID:** `DDT-IDENTITY-AUTHORITY-PROFILE-0.1-DRAFT.1`  
**Profile artifact ID:** `ddt.identity-authority.historical-v1`  
**Status:** Active draft; not approved for production conformance claims  
**Date:** 2026-09-03

## 1. Purpose

This specification defines how a later verifier evaluates four different historical questions:

1. which exact public key a DDT proof identified;
2. what lifecycle state that key had at the relevant historical moment;
3. which civil, organizational, service or device identity was bound to the cryptographic controller; and
4. whether that identity had authority for the exact DDT action and scope.

Those questions are related but not interchangeable.

```text
valid signature
  != resolved historical key state
  != verified signer identity
  != verified signer authority
  != substantive truth
```

The profile prevents a verifier from turning successful signature mathematics into an unsupported identity or authority claim.

## 2. Scope

This draft defines:

- a common evidence structure for verification-method descriptors, key lifecycle events, identity bindings, authority grants and their status events;
- the historical moment and ordering evidence required for resolution;
- minimum key-lifecycle state rules;
- identity-binding verification requirements;
- scoped authority and delegation verification requirements;
- conflict, absence and incomplete-history behavior;
- privacy and trust-boundary rules;
- required result axes and reason codes; and
- minimum fixtures required before candidate status.

This draft does not:

- make DDC a universal identity provider, certificate authority or employment/role registry;
- require one identity technology such as DID, X.509 or Verifiable Credentials;
- keep participant private keys;
- prove a person's legal identity from key possession alone;
- prove that an authorized statement is factually true or a decision is correct;
- convert a current resolver response into historical proof; or
- make unavailable confidential identity or authority documents public.

## 3. Normative language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY** and **OPTIONAL** are interpreted as described by BCP 14 when they appear in uppercase.

## 4. Artifact suite

This draft consists of:

- this normative specification;
- `schemas/ddt-identity-authority-evidence-v0.1.schema.json`;
- `schemas/ddt-identity-authority-profile-v0.1.schema.json`; and
- `profiles/ddt-historical-identity-authority-profile-v0.1.json`.

Every use of the machine-readable profile or an evidence-schema version MUST identify the exact artifact by digest. A mutable URL, version label or current registry result is insufficient by itself.

## 5. Core separation

### 5.1 Verification method

A verification method identifies public verification material and its asserted controller. It answers which key bytes and algorithm a verifier should use.

It does not by itself establish:

- that the controller is a specific human or organization;
- that the key was active at the relevant moment;
- that the key was authorized for a DDT action; or
- that the signed assertion is true.

### 5.2 Key lifecycle

Key lifecycle evaluation determines whether the selected key was active, suspended, rotated out, expired, revoked or subject to an unresolved compromise effect at the relevant moment.

A valid signature can coexist with a non-active or unresolved key-lifecycle result.

### 5.3 Signer identity

Signer identity evaluation determines whether preserved evidence binds the cryptographic controller to a named identity under an exact assurance and trust profile.

Self-assertion alone MUST NOT exceed `ASSERTED`.

### 5.4 Signer authority

Authority evaluation determines whether the resolved identity was permitted to perform the exact action in the exact organization, domain, record type, subject namespace and proof-purpose scope.

A role label, email address, DID controller field, certificate subject or valid signature MUST NOT alone establish DDT authority.

## 6. Evidence boundary

### 6.1 Common evidence object

Every evidence object conforming to the companion schema contains:

- a stable evidence identifier;
- an exact evidence type and schema version;
- issuer identity, verification method, proof reference and authority-evidence references;
- an issued-time claim where supplied;
- a declared effective-order basis; and
- a type-specific body.

Evidence objects MUST be preserved or referenced through the DDT Evidence Manifest with exact commitments. The Evidence Manifest may keep confidential evidence off-chain, but the applicable Preservation Contract MUST state whether later availability is required.

### 6.2 Evidence authenticity is not self-proving

The `issuer` section is an assertion until its referenced proof, key, identity and authority are independently evaluated.

An evidence object MUST NOT bootstrap its own trust merely by naming its issuer or by containing an issuer-controlled key.

### 6.3 Accepted evidence types

The baseline evidence schema recognizes:

- `VERIFICATION_METHOD_DESCRIPTOR`;
- `KEY_LIFECYCLE_EVENT`;
- `IDENTITY_BINDING`;
- `IDENTITY_BINDING_STATUS_EVENT`;
- `AUTHORITY_GRANT`; and
- `AUTHORITY_STATUS_EVENT`.

An Enterprise Profile MAY accept external evidence formats, including DID documents, Verifiable Credentials, X.509 paths, organizational registers or contract records, only through an exact digest-bound adapter or evidence profile that defines their historical resolution semantics.

## 7. Trust model

### 7.1 No universal DDC identity authority

DDC is not the universal authority that decides who a participant is or which business powers that participant holds.

The applicable Enterprise Profile or Preservation Contract MUST identify:

- trusted identity-binding issuers or roots;
- trusted authority issuers or roots;
- accepted evidence profiles;
- proof and key profiles;
- required assurance levels;
- lifecycle/status sources;
- conflict and precedence rules; and
- preservation and availability obligations.

If this trust configuration is missing, unavailable or not digest-bound, identity and authority resolution MUST remain `UNRESOLVED` even if the signature is valid.

### 7.2 Trust-root history

The verifier MUST use the trust configuration that governed the DDT at registration or at the explicitly selected historical moment. A current trust list MUST NOT silently replace the historical one.

Changes to trust roots, issuer accreditation or organizational delegation MUST be append-only, versioned and historically resolvable.

## 8. Relevant historical moment

### 8.1 Required selection

Key, identity and authority state are always evaluated at an explicit relevant moment. The verification request or applicable profile MUST identify which moment is being tested, such as:

- upstream event time;
- source-signing time;
- submission time;
- registration order/time; or
- another profile-defined action time.

The verifier MUST report which moment and evidence basis it used.

### 8.2 Acceptable ordering bases

The baseline accepts:

- independently proven time;
- DDT network inclusion/order evidence; or
- a complete authoritative sequence under a bound profile.

A signer-created timestamp or issuer time claim alone is asserted time. It MUST NOT independently establish historical precedence.

### 8.3 Unresolved moment

If the verifier cannot position the proof and lifecycle/authority events relative to the required moment, the affected historical state MUST be `UNRESOLVED`. The verifier MUST NOT use current state as a substitute.

## 9. Verification-method resolution

For every signature, the verifier MUST:

1. read the exact `verificationMethod` from the signed proof core;
2. obtain the historical `VERIFICATION_METHOD_DESCRIPTOR` or an accepted exact external equivalent;
3. verify the descriptor bytes and digest against the Evidence Manifest or bound package manifest;
4. verify the descriptor issuer proof and applicable issuer authority;
5. compare the descriptor identifier with the proof's `verificationMethod` exactly;
6. compare the declared key algorithm with the signature profile;
7. recompute and compare the public-key fingerprint;
8. verify that the proof purpose is permitted for that method; and
9. report key resolution separately from signature validity.

If the public key can be obtained only from a current network resolver and its historical bytes are not independently bound, `SIGNING_KEY_IDENTITY` MUST remain `UNRESOLVED`.

## 10. Key lifecycle

### 10.1 Recognized events

The baseline recognizes:

- `ACTIVATE`;
- `SUSPEND`;
- `RESUME`;
- `ROTATE_OUT`;
- `REVOKE`;
- `EXPIRE`; and
- `COMPROMISE_DECLARED`.

Events after sequence zero MUST bind the previous event identifier and digest. Sequence gaps, duplicate sequence positions with different event bytes or broken predecessor commitments prevent a unique lifecycle result.

### 10.2 Closed coverage requirement

The absence of a revocation event from an incomplete collection does not prove that a key was active.

An `ACTIVE` result requires one of the following under an exact bound profile:

1. a complete ordered lifecycle stream with deterministic gap detection and an independently supported checkpoint;
2. an authoritative historical snapshot with integrity, status and applicable non-revocation proof; or
3. another exact external mechanism that provides equivalent historical coverage and omission resistance.

If the evidence shows activation but cannot establish closed coverage through the relevant moment, the result MUST be `UNRESOLVED`, not `ACTIVE`.

### 10.3 State derivation

Subject to valid issuer authority, intact lineage and sufficient ordering evidence:

- `ACTIVATE` establishes `ACTIVE` from its effective position;
- `SUSPEND` establishes `SUSPENDED` until a valid `RESUME`;
- `RESUME` restores `ACTIVE` only if the profile permits it and no terminal event already applies;
- `ROTATE_OUT` establishes `ROTATED_OUT` and identifies a replacement method without transferring identity or authority automatically;
- `REVOKE` establishes `REVOKED` from its effective position;
- `EXPIRE` establishes `EXPIRED` from its effective position; and
- `COMPROMISE_DECLARED` establishes the effect defined by the applicable profile and evidence.

Terminal states MUST NOT be silently reversed. Any permitted exceptional restoration requires a new explicit event type in a newly versioned lifecycle profile.

### 10.4 Later revocation and compromise

A later prospective revocation MUST NOT automatically invalidate a use that was independently established as active before revocation.

A later compromise declaration may affect confidence in an earlier interval. If the evidence cannot establish when control was lost, the earlier lifecycle result SHOULD become `COMPROMISE_EFFECT_UNRESOLVED` in a new Verification Result. The original record and previous Verification Result remain unchanged.

An event that claims retroactive effect is itself a later claim. It MUST NOT rewrite history. Its effect is evaluated under the exact authority, time and conflict rules of the applicable profile.

### 10.5 Conflict

Two cryptographically valid but incompatible lifecycle events produce `AMBIGUOUS` unless a historically bound deterministic precedence rule resolves them. Silent last-write-wins is forbidden.

## 11. Identity binding

### 11.1 Required binding

To report `REGISTRANT_IDENTITY = VERIFIED`, the verifier MUST establish:

- the exact cryptographic controller reference;
- the exact bound identity reference and namespace;
- the intended binding scope;
- the exact identity-assurance profile;
- the issuer's trusted identity and authority;
- the binding's historical lifecycle state; and
- all evidence required by the applicable Preservation Contract.

Control of a public key alone does not prove a civil or organizational identity.

### 11.2 Binding status

Identity bindings use append-only lifecycle events:

- `ACTIVATE`;
- `SUSPEND`;
- `RESUME`;
- `REVOKE`;
- `EXPIRE`; and
- `SUPERSEDE`.

Supersession names a successor binding but does not rewrite the predecessor or cause the successor to inherit proof status automatically.

### 11.3 Identity results

- `VERIFIED` — all historically applicable required binding evidence and trust conditions pass;
- `ASSERTED` — an identity was declared but not independently verified;
- `AMBIGUOUS` — valid preserved evidence supports incompatible identities or binding states;
- `UNRESOLVED` — required evidence, trust configuration, history or ordering is insufficient; or
- `FAIL` — complete applicable evidence proves that the claimed binding is invalid or mismatched.

## 12. Authority grants

### 12.1 Minimum grant scope

An authority grant identifies:

- grantor identity;
- grantee identity;
- role;
- permitted proof purposes;
- permitted actions;
- permitted DDT record types;
- permitted subject namespaces;
- organization and domain scopes;
- constraints;
- delegation permission and remaining depth;
- parent grants; and
- supporting evidence.

An Enterprise Profile MUST define the exact vocabulary and matching rules for these fields.

### 12.2 Root authority

Every successful authority path MUST terminate at a historically applicable trust root or governing authority artifact identified by the Enterprise Profile or Preservation Contract.

DDC does not supply a universal root by default.

### 12.3 Delegation chain

For each delegation link, the verifier MUST establish:

1. the grantor identity;
2. the grantor's active authority to delegate at the grant moment;
3. that delegation was permitted;
4. that the remaining delegation depth was not exceeded;
5. that the child scope is a subset of the parent scope;
6. that the grant and all parent grants were active at the relevant moment; and
7. that the grant evidence and proof are intact.

No child grant may increase actions, purposes, record types, subject namespaces, organizations, domains, constraints or delegation depth beyond its parent.

### 12.4 Authority status

Authority grants use append-only status events:

- `ACTIVATE`;
- `SUSPEND`;
- `RESUME`;
- `REVOKE`;
- `TERMINATE`; and
- `SUPERSEDE`.

Later succession does not silently erase the historical grant.

### 12.5 Authority results

- `VERIFIED` — the complete trusted grant path was active and covered the exact action and scope;
- `ASSERTED` — authority was declared but independent resolution was not required or completed;
- `AMBIGUOUS` — preserved valid evidence supports incompatible authority states;
- `UNRESOLVED` — the grant path, trust root, history, order or required evidence is incomplete; or
- `FAIL` — the complete applicable evidence shows no valid grant, a revoked/terminated grant, prohibited delegation or a scope mismatch.

Missing evidence MUST NOT be restated as proof of unauthorized action. Conversely, a valid signature MUST NOT fill an incomplete authority chain.

## 13. External identity and authority systems

### 13.1 DID interoperability

When a DID method is used, the exact DID method specification and the historical DID document or verifiable version-resolution evidence MUST be preserved. A latest DID document response is not automatically evidence of the document that applied earlier.

The verification relationship used by the DDT proof MUST be appropriate for the proof purpose under the accepted DID adapter profile. Controller status and verification relationship do not by themselves establish business authority.

### 13.2 Verifiable Credential interoperability

When a Verifiable Credential supplies identity or authority evidence, the verifier MUST preserve and evaluate:

- exact credential bytes or commitment;
- issuer and securing mechanism;
- schema and context dependencies;
- validity interval;
- historical status evidence;
- credential subject and claim scope; and
- the Enterprise Profile's trust and fitness-for-purpose rules.

Credential verification does not imply that every encoded claim is substantively true.

### 13.3 X.509 interoperability

When X.509 supplies key or identity evidence, the exact certificate path, trust-anchor state, validation policy, relevant-time inputs and applicable revocation evidence MUST be available under a bound adapter profile.

A certificate subject name or successful path validation does not by itself establish DDT business authority.

## 14. Privacy and custody

Private keys, passwords, bearer credentials, seed phrases and secret access tokens MUST NOT appear in DDT records, public profiles or public verification packages.

Civil-identity and authority documents MAY remain confidential and off-chain. Their Evidence Manifest entries MUST preserve the exact commitment, representation, evidence class, custody/retrieval claim and preservation obligation required by the applicable contract.

A public raw digest of low-entropy or sensitive identity data MUST NOT be used when it enables guessing, correlation or unwanted disclosure. The Enterprise Profile MUST choose an appropriate safer commitment mechanism and later verification procedure.

## 15. Verification procedure

A conforming verifier performs the following steps without collapsing results:

1. verify the requested DDT record and proof bindings;
2. resolve the exact historical identity/authority profile and its digest;
3. resolve the relevant historical moment and its evidence basis;
4. retrieve the exact verification-method descriptor and verify its commitment;
5. verify descriptor authorship and issuer authority under the bound trust model;
6. verify key identifier, algorithm, fingerprint and permitted purpose;
7. reconstruct the key lifecycle through the relevant moment and test coverage/gaps;
8. evaluate the signature separately under its exact Signature Profile;
9. resolve the cryptographic controller's identity through the exact identity binding and status history;
10. resolve the authority root and complete delegation chain;
11. compare the requested DDT action with every applicable authority-scope dimension;
12. report conflicts, unavailable evidence and unresolved ordering explicitly;
13. emit independent axis results and stable reason codes; and
14. preserve the Verification Result as a new immutable result artifact.

## 16. Required result axes

At minimum, the profile contributes:

| Axis | Status class | Question |
|---|---|---|
| `SIGNING_KEY_IDENTITY` | `RESOLUTION` | Were the exact historical verification method and key bytes resolved? |
| `SIGNING_KEY_LIFECYCLE` | `LIFECYCLE` | What state did that key have at the relevant moment? |
| `REGISTRANT_IDENTITY` | `RESOLUTION` | Was the cryptographic controller bound to the asserted signer identity? |
| `REGISTRANT_AUTHORITY` | `RESOLUTION` | Did that identity have authority for the exact action and scope? |

These results do not replace `REGISTRATION_SIGNATURE`, time, record integrity, evidence integrity, conformance, semantic resolution or substantive-truth boundary axes.

## 17. Stable reason codes

The baseline profile registers:

- `AUTHORITY_EVIDENCE_UNAVAILABLE`;
- `AUTHORITY_GRANT_CHAIN_INCOMPLETE`;
- `AUTHORITY_GRANT_INVALID`;
- `AUTHORITY_SCOPE_MISMATCH`;
- `AUTHORITY_STATE_AMBIGUOUS`;
- `AUTHORITY_STATUS_UNRESOLVED`;
- `CURRENT_STATE_SUBSTITUTION_FORBIDDEN`;
- `EVIDENCE_DIGEST_MISMATCH`;
- `EVIDENCE_ISSUER_AUTHORITY_UNRESOLVED`;
- `HISTORICAL_MOMENT_UNRESOLVED`;
- `IDENTITY_BINDING_AMBIGUOUS`;
- `IDENTITY_BINDING_INVALID`;
- `IDENTITY_BINDING_UNAVAILABLE`;
- `IDENTITY_BINDING_UNRESOLVED`;
- `KEY_ALGORITHM_MISMATCH`;
- `KEY_CONTROLLER_UNRESOLVED`;
- `KEY_DESCRIPTOR_UNAVAILABLE`;
- `KEY_LIFECYCLE_CONFLICT`;
- `KEY_LIFECYCLE_GAP`;
- `KEY_LIFECYCLE_UNRESOLVED`;
- `KEY_PURPOSE_MISMATCH`;
- `PUBLIC_KEY_FINGERPRINT_MISMATCH`;
- `RETROACTIVE_EFFECT_UNRESOLVED`;
- `TRUST_CONFIGURATION_UNAVAILABLE`; and
- `VERIFICATION_METHOD_MISMATCH`.

Reason codes are axis-specific. For example, `AUTHORITY_STATUS_UNRESOLVED` does not turn a mathematically valid signature into an invalid signature.

## 18. Claim boundary

`REGISTRANT_IDENTITY = VERIFIED` establishes only the exact identity-binding result under the bound historical profile and evidence.

`REGISTRANT_AUTHORITY = VERIFIED` establishes only that the bound authority rules covered the exact evaluated action and scope at the relevant moment.

Neither result establishes:

- that upstream data was factually correct;
- that a decision was wise, fair or lawful under rules outside the bound profile;
- that every relevant event was registered;
- that confidential source documents were publicly available; or
- that historical semantic reconstruction is complete.

## 19. Security considerations

Implementations MUST address:

- key substitution and verification-method identifier collisions;
- current-state substitution for historical state;
- lifecycle event deletion, reordering, fork and gap attacks;
- backdated activation, revocation or authority claims;
- compromised issuers and trust-root changes;
- authority scope amplification through delegation;
- confused-deputy and proof-purpose substitution;
- circular identity or authority evidence;
- self-signed evidence masquerading as independent authority;
- correlation and guessing attacks against public identity commitments;
- stale status sources and resolver equivocation; and
- denial of access to required off-chain evidence.

## 20. Required fixtures before candidate status

At minimum:

1. valid historical key resolution with exact descriptor and fingerprint;
2. verification-method substitution;
3. public-key substitution with unchanged identifier;
4. algorithm and proof-purpose mismatch;
5. activation followed by valid use;
6. use during suspension;
7. resume after suspension;
8. rotation without automatic transfer of identity or authority;
9. revocation before use and revocation after use;
10. expired key;
11. incomplete lifecycle stream where no revocation event is visible;
12. missing sequence event and broken predecessor digest;
13. conflicting valid lifecycle events;
14. later compromise with unknown compromise start;
15. identity self-assertion limited to `ASSERTED`;
16. valid trusted identity binding;
17. revoked, expired and superseded identity bindings;
18. valid root authority grant;
19. valid multi-hop delegation;
20. incomplete delegation chain;
21. prohibited delegation and delegation-depth overflow;
22. child scope amplification;
23. action, proof-purpose, record-type, namespace, organization and domain mismatches;
24. authority revoked before and after the evaluated action;
25. missing historical trust configuration;
26. current resolver data offered as the sole historical evidence;
27. valid signature with key lifecycle, identity or authority unresolved;
28. authority verified while substantive truth remains not established;
29. confidential off-chain authority evidence available and unavailable variants; and
30. two independent implementations producing the same axis results and reason codes.

## 21. Integration requirements

The next versioned integration revision of the DDT Envelope, Conformance Receipt, Verification Result and Signature Proof/Profile artifacts MUST:

- reference this exact profile and evidence schema where selected;
- add an exact proof-purpose and signed-object binding for identity/authority evidence issuance or bind an approved external securing profile;
- preserve all identity/authority evidence and trust dependencies in the Offline Verification Package;
- map the four required axes to the Verification Result registry; and
- prohibit old local proof structures from silently acquiring these semantics.

Existing drafts remain historical development artifacts and are not overwritten.

## 22. Draft limitations

This draft and its schemas define the resolution contract, evidence model and failure boundaries. They do not yet demonstrate production readiness.

Before candidate status, DDC still requires:

- complete positive and tampered fixtures;
- a reference historical resolver;
- at least one domain-specific trust/authority profile;
- at least one external interoperability adapter and fixture;
- integration into a newly versioned envelope/proof revision;
- independent second-implementation reproduction; and
- review of privacy, revocation, compromise and organizational-authority edge cases.

## 23. External references

- BCP 14: RFC 2119 and RFC 8174 normative-language interpretation.
- W3C Decentralized Identifiers (DIDs) v1.0, Recommendation 19 July 2022, for optional verification-method/controller interoperability.
- W3C Verifiable Credentials Data Model v2.0, Recommendation 15 May 2025, for optional credential, status and trust-policy interoperability.
- RFC 5280, Internet X.509 Public Key Infrastructure Certificate and CRL Profile, for optional PKI interoperability.

These external formats are not mandatory DDT identity systems. They become applicable only when an exact Enterprise Profile or Preservation Contract selects and digest-binds the corresponding adapter, trust and historical-resolution rules.
