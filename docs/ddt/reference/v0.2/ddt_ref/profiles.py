from __future__ import annotations
from pathlib import Path
from .digest import sha256_bytes
from .strict_json import load_strict
from .errors import VerificationError

BASELINE_SIGNATURE_PROFILE_ID = "ddt.signature.ed25519-jcs-v2"
BASELINE_SIGNATURE_PROFILE_VERSION = "0.2.0-draft.1"
BASELINE_SIGNATURE_PROFILE_FILE = "ddt-ed25519-signature-profile-v0.2.json"


def baseline_signature_profile_ref(ddt_root: str | Path) -> dict:
    p = Path(ddt_root) / "profiles" / BASELINE_SIGNATURE_PROFILE_FILE
    if not p.is_file():
        raise VerificationError(f"signature profile bytes unavailable: {p}")
    doc = load_strict(p)
    if doc.get("profileId") != BASELINE_SIGNATURE_PROFILE_ID or doc.get("profileVersion") != BASELINE_SIGNATURE_PROFILE_VERSION:
        raise VerificationError("signature profile identity/version mismatch")
    return {
        "artifactId": BASELINE_SIGNATURE_PROFILE_ID,
        "version": BASELINE_SIGNATURE_PROFILE_VERSION,
        "digest": {"algorithm":"SHA-256","value":sha256_bytes(p.read_bytes())},
        "immutableRef": BASELINE_SIGNATURE_PROFILE_FILE,
        "mediaType": "application/json",
    }


def verify_signature_profile_ref(ref: dict, ddt_root: str | Path) -> dict:
    expected = baseline_signature_profile_ref(ddt_root)
    if ref.get("artifactId") != expected["artifactId"] or ref.get("version") != expected["version"]:
        raise VerificationError("unsupported historical signature profile reference")
    if ref.get("digest") != expected["digest"]:
        raise VerificationError("signature profile digest mismatch")
    # immutableRef/mediaType are signed metadata; they may be different immutable locators,
    # but the exact historical bytes are selected by ID/version/digest.
    return expected
