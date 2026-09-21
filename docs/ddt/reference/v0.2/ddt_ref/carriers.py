from __future__ import annotations
from .digest import digest_object
from .errors import VerificationError
from .profiles import verify_signature_profile_ref
from .proof import verify_proof, validate_pair

CARRIER_BINDINGS = {
    "CHECKPOINT": ("checkpointCore", "checkpointCoreHash", "checkpointProofs", "CHECKPOINT_ATTESTATION", "CHECKPOINT_CORE_HASH"),
    "COVERAGE_TOMBSTONE": ("tombstoneCore", "tombstoneCoreHash", "tombstoneProofs", "COVERAGE_TOMBSTONE_ATTESTATION", "COVERAGE_TOMBSTONE_CORE_HASH"),
    "SOURCE_COVERAGE_STATEMENT": ("statementCore", "statementCoreHash", "statementProofs", "SOURCE_COVERAGE_ATTESTATION", "COVERAGE_STATEMENT_CORE_HASH"),
    "SOURCE_WITNESS_ATTESTATION": ("attestationCore", "attestationCoreHash", "attestationProofs", "SOURCE_WITNESS_ATTESTATION", "SOURCE_WITNESS_ATTESTATION_CORE_HASH"),
    "NETWORK_FINALITY": ("finalityCore", "finalityCoreHash", "finalityProofs", "NETWORK_FINALITY_ATTESTATION", "FINALITY_CORE_HASH"),
    "OFFLINE_PACKAGE": ("manifestCore", "manifestCoreHash", "manifestProofs", "OFFLINE_PACKAGE_ATTESTATION", "MANIFEST_CORE_HASH"),
    "CRYPTOGRAPHIC_RENEWAL": ("renewalCore", "renewalCoreHash", "renewalProofs", "CRYPTOGRAPHIC_RENEWAL_ATTESTATION", "RENEWAL_CORE_HASH"),
    "VERIFICATION_RESULT": ("resultCore", "resultCoreHash", "proofs", "VERIFICATION_RESULT_ATTESTATION", "VERIFICATION_RESULT_CORE_HASH"),
}


def _proof_ids(proofs: list) -> list[str]:
    if not isinstance(proofs, list) or not proofs:
        raise VerificationError("signature proof set must be non-empty")
    ids = []
    for p in proofs:
        if not isinstance(p, dict):
            raise VerificationError("proof entry must be an object")
        pid = p.get("proofId")
        if not isinstance(pid, str) or not pid:
            raise VerificationError("proofId missing")
        ids.append(pid)
    if ids != sorted(ids):
        raise VerificationError("proof set is not canonically ordered by proofId")
    if len(ids) != len(set(ids)):
        raise VerificationError("duplicate proofId")
    return ids


def verify_proof_set(proofs: list, *, expected_digest: dict, purpose: str, target_type: str,
                     ddt_root, keyring: dict | None = None) -> list[dict]:
    _proof_ids(proofs)
    out = []
    for proof in proofs:
        verify_signature_profile_ref(proof.get("proofProfile") or {}, ddt_root)
        validate_pair(proof, purpose, target_type)
        signed = (proof.get("signedObject") or {}).get("digest")
        if signed != expected_digest:
            raise VerificationError("signed object digest mismatch")
        vm = proof.get("verificationMethod")
        if keyring is None:
            out.append({"proofId": proof["proofId"], "profile": "MATCH", "signature": "NOT_EVALUATED_NO_KEYRING"})
            continue
        if vm not in keyring:
            raise VerificationError(f"public key unavailable for {vm}")
        verify_proof(
            proof, expected_digest=expected_digest, public_key=keyring[vm],
            expected_purpose=purpose, expected_target_type=target_type,
            expected_profile_digest=proof["proofProfile"]["digest"],
        )
        out.append({"proofId": proof["proofId"], "profile": "MATCH", "signature": "VALID"})
    return out


def verify_core_carrier(container: dict, *, core_key: str, hash_key: str, proofs_key: str,
                        purpose: str, target_type: str, ddt_root, keyring: dict | None = None) -> dict:
    if not isinstance(container, dict):
        raise VerificationError("carrier must be an object")
    if core_key not in container or hash_key not in container or proofs_key not in container:
        raise VerificationError("carrier core/hash/proofs member missing")
    expected = digest_object(container[core_key])
    if container[hash_key] != expected:
        raise VerificationError(f"{hash_key} mismatch")
    proof_results = verify_proof_set(
        container[proofs_key], expected_digest=expected, purpose=purpose, target_type=target_type,
        ddt_root=ddt_root, keyring=keyring,
    )
    return {hash_key: expected, "proofs": proof_results}


def verify_carrier(kind: str, obj: dict, *, ddt_root, keyring: dict | None = None) -> dict:
    try:
        core_key, hash_key, proofs_key, purpose, target_type = CARRIER_BINDINGS[kind]
    except KeyError as e:
        raise VerificationError(f"unknown signature carrier kind: {kind}") from e
    if kind == "CHECKPOINT":
        if obj.get("evidenceType") != "DDT_SIGNED_CHECKPOINT":
            raise VerificationError("checkpoint evidenceType mismatch")
        container = obj.get("body")
    elif kind in {"COVERAGE_TOMBSTONE", "SOURCE_COVERAGE_STATEMENT", "SOURCE_WITNESS_ATTESTATION"}:
        expected_type = kind
        if obj.get("evidenceType") != expected_type:
            raise VerificationError("event-coverage evidenceType mismatch")
        container = obj.get("body")
    elif kind == "NETWORK_FINALITY":
        container = obj.get("finalityCertificate")
    else:
        container = obj
    return verify_core_carrier(
        container, core_key=core_key, hash_key=hash_key, proofs_key=proofs_key,
        purpose=purpose, target_type=target_type, ddt_root=ddt_root, keyring=keyring,
    )
