from __future__ import annotations
import base64, copy
from pathlib import Path
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.exceptions import InvalidSignature
from .canonical import canonicalize
from .digest import sha256_bytes
from .strict_json import load_strict
from .errors import VerificationError

PAIR_REGISTRY = {
    "CHECKPOINT_ATTESTATION": "CHECKPOINT_CORE_HASH",
    "CONFORMANCE_ATTESTATION": "RECEIPT_CORE_HASH",
    "COVERAGE_TOMBSTONE_ATTESTATION": "COVERAGE_TOMBSTONE_CORE_HASH",
    "CRYPTOGRAPHIC_RENEWAL_ATTESTATION": "RENEWAL_CORE_HASH",
    "DDT_REGISTRATION": "REGISTRATION_STATEMENT_HASH",
    "NETWORK_FINALITY_ATTESTATION": "FINALITY_CORE_HASH",
    "OFFLINE_PACKAGE_ATTESTATION": "MANIFEST_CORE_HASH",
    "SOURCE_COVERAGE_ATTESTATION": "COVERAGE_STATEMENT_CORE_HASH",
    "SOURCE_WITNESS_ATTESTATION": "SOURCE_WITNESS_ATTESTATION_CORE_HASH",
    "VERIFICATION_RESULT_ATTESTATION": "VERIFICATION_RESULT_CORE_HASH",
}


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64url_decode_strict(text: str, expected_len: int | None = None) -> bytes:
    if not isinstance(text, str) or "=" in text or any(c.isspace() for c in text):
        raise VerificationError("non-canonical base64url encoding")
    if any(c not in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_" for c in text):
        raise VerificationError("invalid base64url alphabet")
    pad = "=" * ((4 - len(text) % 4) % 4)
    try:
        raw = base64.urlsafe_b64decode(text + pad)
    except Exception as e:
        raise VerificationError("invalid base64url data") from e
    if expected_len is not None and len(raw) != expected_len:
        raise VerificationError(f"decoded length {len(raw)} != expected {expected_len}")
    if _b64url_encode(raw) != text:
        raise VerificationError("non-canonical base64url encoding")
    return raw


def proof_core(proof: dict) -> dict:
    if "proofValue" not in proof:
        raise VerificationError("proofValue missing")
    core = copy.deepcopy(proof)
    del core["proofValue"]
    return core


def signing_input(proof: dict) -> bytes:
    return canonicalize({"domain": "DDT_SIGNATURE_PROOF_V2", "proofCore": proof_core(proof)})


def validate_pair(proof: dict, expected_purpose: str | None = None, expected_target_type: str | None = None):
    purpose = proof.get("proofPurpose")
    stype = (proof.get("signedObject") or {}).get("type")
    if purpose not in PAIR_REGISTRY or PAIR_REGISTRY[purpose] != stype:
        raise VerificationError("PROOF_PURPOSE_TARGET_MISMATCH")
    if expected_purpose is not None and purpose != expected_purpose:
        raise VerificationError(f"unexpected proof purpose: {purpose}")
    if expected_target_type is not None and stype != expected_target_type:
        raise VerificationError(f"unexpected signedObject.type: {stype}")


def load_private_key(path: str | Path) -> Ed25519PrivateKey:
    data = Path(path).read_bytes()
    key = serialization.load_pem_private_key(data, password=None)
    if not isinstance(key, Ed25519PrivateKey):
        raise VerificationError("private key is not Ed25519")
    return key


def load_public_key(path: str | Path) -> Ed25519PublicKey:
    data = Path(path).read_bytes()
    key = serialization.load_pem_public_key(data)
    if not isinstance(key, Ed25519PublicKey):
        raise VerificationError("public key is not Ed25519")
    return key


def create_proof(*, proof_id: str, purpose: str, target_type: str, target_digest: dict,
                 proof_profile: dict, verification_method: str, private_key: Ed25519PrivateKey,
                 created_at_claim: str | None = None) -> dict:
    proof = {
        "proofId": proof_id,
        "proofType": "DDT_SIGNATURE",
        "proofPurpose": purpose,
        "proofProfile": copy.deepcopy(proof_profile),
        "algorithm": "Ed25519",
        "verificationMethod": verification_method,
        "signedObject": {"type": target_type, "digest": copy.deepcopy(target_digest)},
        "signatureEncoding": "base64url",
        "proofValue": "",
    }
    if created_at_claim is not None:
        proof["createdAtClaim"] = created_at_claim
    validate_pair(proof, purpose, target_type)
    sig = private_key.sign(signing_input(proof))
    proof["proofValue"] = _b64url_encode(sig)
    return proof


def verify_proof(proof: dict, *, expected_digest: dict, public_key: Ed25519PublicKey,
                 expected_purpose: str | None = None, expected_target_type: str | None = None,
                 expected_profile_digest: dict | None = None) -> bool:
    if proof.get("proofType") != "DDT_SIGNATURE" or proof.get("algorithm") != "Ed25519" or proof.get("signatureEncoding") != "base64url":
        raise VerificationError("unsupported or invalid proof type/algorithm/encoding")
    validate_pair(proof, expected_purpose, expected_target_type)
    if (proof.get("signedObject") or {}).get("digest") != expected_digest:
        raise VerificationError("signed object digest mismatch")
    if expected_profile_digest is not None:
        pp = proof.get("proofProfile") or {}
        if pp.get("digest") != expected_profile_digest:
            raise VerificationError("proof profile digest mismatch")
    sig_text = proof.get("proofValue")
    if not isinstance(sig_text, str) or len(sig_text) != 86:
        raise VerificationError("Ed25519 proofValue must be exactly 86 base64url characters")
    sig = _b64url_decode_strict(sig_text, 64)
    try:
        public_key.verify(sig, signing_input(proof))
    except InvalidSignature as e:
        raise VerificationError("signature invalid") from e
    return True


def load_keyring(path: str | Path) -> dict[str, Ed25519PublicKey]:
    obj = load_strict(path)
    if not isinstance(obj, dict) or "keys" not in obj or not isinstance(obj["keys"], list):
        raise VerificationError("keyring must contain a keys array")
    out = {}
    for item in obj["keys"]:
        vm = item.get("verificationMethod")
        raw = _b64url_decode_strict(item.get("publicKeyBase64url", ""), 32)
        if not vm or vm in out:
            raise VerificationError("missing or duplicate verificationMethod in keyring")
        out[vm] = Ed25519PublicKey.from_public_bytes(raw)
    return out


def public_key_to_base64url(key: Ed25519PublicKey) -> str:
    raw = key.public_bytes(encoding=serialization.Encoding.Raw, format=serialization.PublicFormat.Raw)
    return _b64url_encode(raw)
