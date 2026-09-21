# DDT Evidence Digest Commitment Profile v0.1 Draft.1

## 1. Purpose

This specification defines a deterministic commitment profile for DDT evidence represented as an exact raw byte sequence and committed using SHA-256.

Its purpose is to ensure that a verifier can reproduce an evidence commitment without guessing:

- which bytes were committed;
- whether any transformation occurred;
- which digest algorithm was used;
- how the digest value was encoded; or
- how a later presented evidence object is compared with the historical commitment.

This profile is intended for use by the DDT Evidence Manifest where an applicable Enterprise Profile permits a public raw digest for the relevant evidence class and confidentiality context.

## 2. Specification identity

The specification identifier is:

`DDT-EVIDENCE-DIGEST-COMMITMENT-PROFILE`

The version defined by this draft is:

`0.1.0-draft.1`

A machine-readable profile conforming to this specification MUST identify its exact version and exact artifact digest.

A mutable URL, current registry lookup or human-readable version label alone is insufficient for historical verification.

## 3. Scope

This profile defines only the deterministic construction and verification of a raw-byte SHA-256 evidence commitment.

It does not define:

- whether evidence is truthful;
- whether evidence is complete;
- whether evidence was lawfully obtained;
- whether an asserted source is authoritative;
- whether a signer had authority;
- whether evidence must remain available after registration;
- whether a raw public digest is privacy-safe;
- storage or custody requirements;
- retrieval authorization;
- redaction policy; or
- enterprise-specific evidence requirements.

Those concerns belong to other DDT layers, including the Evidence Manifest, Enterprise Profile, Identity/Authority Profile, Preservation Contract and Verification Result.

## 4. Commitment type

A commitment produced under this profile MUST use:

`commitmentType = "DIGEST"`

The digest algorithm MUST be:

`SHA-256`

The digest encoding MUST be:

`LOWERCASE_HEX`

The encoded value MUST consist of exactly 64 lowercase hexadecimal characters.

## 5. Representation

The baseline representation mode is:

`RAW_BYTES`

The commitment input is the exact byte sequence supplied as the evidence representation.

No transformation is permitted before hashing.

In particular, an implementation MUST NOT:

- decode the bytes as text;
- normalize Unicode;
- normalize line endings;
- trim leading or trailing bytes;
- parse JSON;
- apply RFC 8785 JCS;
- reorder object properties;
- reserialize structured data;
- decompress or recompress content;
- transcode character encodings;
- alter metadata;
- rewrite container formats; or
- otherwise modify the byte sequence.

If transformed or canonicalized evidence is required, that evidence MUST use a different exact representation/profile.

## 6. Commitment construction

Given the exact evidence byte sequence `B`, the commitment value is:

`LOWERCASE_HEX(SHA-256(B))`

No prefix, suffix, salt, domain string, length field, identifier, media type or other value is prepended or appended to `B`.

Therefore the construction parameters are:

- representation: `RAW_BYTES`;
- input: exact evidence bytes;
- digest algorithm: `SHA-256`;
- digest encoding: lowercase hexadecimal;
- domain separation: none;
- randomization: none;
- secret key: none.

The absence of domain separation is deliberate because this profile commits directly to an opaque byte representation. The profile identity itself defines the interpretation of the resulting digest.

## 7. Byte length

Where the Evidence Manifest representation declares `byteLength`, it MUST equal the number of bytes in the exact committed representation.

The byte length is verification metadata and is not part of the SHA-256 input.

A byte-length mismatch MUST be reported separately from a digest mismatch.

## 8. Evidence Manifest binding

An Evidence Manifest entry using this profile MUST bind the commitment to an exact artifact reference identifying the machine-readable commitment profile by:

- artifact identifier;
- version;
- SHA-256 artifact digest; and
- immutable reference when available.

The Evidence Manifest commitment MUST use:

- `commitmentType = "DIGEST"`;
- this exact commitment profile reference;
- the lowercase hexadecimal SHA-256 value; and
- `encoding = "LOWERCASE_HEX"`.

The Evidence Manifest representation MUST use:

- `mode = "RAW_BYTES"`; and
- the exact committed `byteLength` when known.

## 9. Verification procedure

To verify later-presented evidence under this profile, a conforming verifier MUST:

1. resolve the exact historical profile artifact referenced by the Evidence Manifest;
2. verify the profile artifact digest;
3. obtain the presented evidence as an exact byte sequence;
4. determine the byte length of that sequence;
5. compare it with the declared `representation.byteLength` when present;
6. compute SHA-256 over the exact presented bytes without transformation;
7. encode the digest as lowercase hexadecimal;
8. compare the result byte-for-byte with the Evidence Manifest commitment value; and
9. report the evidence-integrity result without inferring truth, authority, completeness or provenance.

A verifier MUST NOT substitute a newer profile version or current policy for the historically referenced profile.

## 10. Deterministic result

For the same exact input byte sequence, every conforming implementation MUST produce the same commitment value.

For any different byte sequence, including a one-byte alteration, verification MUST recompute the digest from the presented bytes and compare it with the historical commitment.

A digest mismatch MUST NOT be repaired, normalized away or converted into a successful integrity result.

## 11. Privacy boundary

This profile does not declare raw public digests safe for all evidence.

Predictable, low-entropy or sensitive evidence may be vulnerable to:

- dictionary guessing;
- correlation;
- confirmation attacks; or
- linkability.

The applicable Enterprise Profile MUST determine whether this profile is permitted for the relevant evidence class and confidentiality classification.

If historical policy forbids a public raw digest, a Recorder MUST NOT use this profile merely because the evidence bytes are available.

A safer randomized, keyed, zero-knowledge or other profile-defined commitment MUST be used where required.

## 12. Availability boundary

A matching commitment proves only that presented bytes match the historically committed byte representation.

It does not prove that those bytes:

- were available at registration;
- remained available continuously;
- were retained by the required custodian; or
- can still be retrieved from a historical reference.

Those properties are evaluated through the Evidence Manifest, Preservation Contract, Conformance Receipt and applicable verification axes.

## 13. Identity and provenance boundary

This profile does not authenticate the party that supplied the evidence.

Identity, signature validity, key state, authority and provenance MUST be evaluated independently through their applicable DDT profiles and evidence.

A correct evidence digest MUST NOT cause an identity, authority or provenance axis to pass.

## 14. Failure conditions

A conforming verifier MUST reject or report failure for this profile when any of the following applies:

- the referenced profile artifact cannot be resolved exactly;
- the profile artifact digest does not match;
- the commitment type is not `DIGEST`;
- the encoding is not `LOWERCASE_HEX`;
- the representation mode is not `RAW_BYTES`;
- the commitment value is not 64 lowercase hexadecimal characters;
- the presented bytes are unavailable when verification requires them;
- the declared byte length does not match the presented representation; or
- the recomputed SHA-256 digest does not equal the historical commitment.

A policy-level prohibition on raw public digests MUST be reported separately from byte-integrity failure.

## 15. Historical verification

Historical verification MUST use:

- the exact Evidence Manifest;
- the exact referenced commitment profile artifact;
- the exact historical Enterprise Profile and policy artifacts where applicable; and
- the exact evidence bytes presented for verification.

Current profile state MUST NOT substitute for unavailable historical dependencies.

If an exact required historical dependency cannot be resolved, the affected verification result MUST remain unresolved according to the applicable DDT verification rules.

## 16. Security considerations

SHA-256 collision resistance does not make arbitrary evidence truthful or private.

Implementations MUST preserve the distinction between:

- integrity of bytes;
- authenticity of source;
- authority of actor;
- semantic validity;
- completeness;
- historical availability; and
- confidentiality safety.

Implementations MUST also avoid accidental transformation of evidence by application frameworks, character encoding conversions, multipart parsers or storage systems before commitment construction.

The bytes hashed by the Recorder MUST be the same exact bytes preserved or otherwise identified as the committed evidence representation.

## 17. Required fixtures

Before candidate status, the profile implementation MUST include tests covering at least:

1. empty byte sequence where permitted by the applicable evidence rule;
2. ordinary UTF-8 text bytes;
3. binary evidence containing zero bytes;
4. JSON bytes without canonicalization;
5. identical bytes producing identical digest;
6. one-byte alteration producing digest mismatch;
7. line-ending alteration producing digest mismatch;
8. Unicode normalization alteration producing digest mismatch;
9. same semantic JSON with different serialization producing digest mismatch;
10. incorrect declared byte length;
11. uppercase hexadecimal commitment rejected;
12. malformed digest length rejected;
13. wrong commitment profile digest;
14. unavailable historical profile artifact;
15. raw digest forbidden by Enterprise Profile privacy policy; and
16. later-presented bytes successfully matching the historical commitment.

## 18. Claim boundary

Successful verification under this profile means only:

> the presented exact byte sequence matches the SHA-256 raw-byte commitment recorded under the exact referenced historical commitment profile.

It MUST NOT be represented as proof that the evidence statement itself is true, complete, authoritative, lawful or independently corroborated.
