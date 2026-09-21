from __future__ import annotations
import hashlib
from .canonical import canonicalize


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_jcs(value) -> str:
    return sha256_bytes(canonicalize(value))


def digest_object(value) -> dict:
    return {"algorithm": "SHA-256", "value": sha256_jcs(value)}


def raw_digest_object(data: bytes) -> dict:
    return {"algorithm": "SHA-256", "value": sha256_bytes(data)}


def same_digest(a: dict, b: dict) -> bool:
    return a == b and a.get("algorithm") == "SHA-256"
