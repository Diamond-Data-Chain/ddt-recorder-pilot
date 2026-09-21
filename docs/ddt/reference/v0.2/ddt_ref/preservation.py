from __future__ import annotations
from .digest import digest_object
from .errors import VerificationError


def artifact_tuple(ref: dict):
    return (
        ref.get("artifactId", ""), ref.get("version", ""),
        (ref.get("digest") or {}).get("value", ""), ref.get("immutableRef", "")
    )


def verify_normative_dependencies(contract: dict) -> bool:
    nd = contract.get("normativeDependencies")
    if not isinstance(nd, dict) or not isinstance(nd.get("artifacts"), list):
        raise VerificationError("normativeDependencies.artifacts missing")
    refs = nd["artifacts"]
    if refs != sorted(refs, key=artifact_tuple):
        raise VerificationError("normative dependency closure is not canonically ordered")
    pairs = [(r.get("artifactId"), r.get("version")) for r in refs]
    if len(set(pairs)) != len(pairs):
        raise VerificationError("duplicate (artifactId, version) in normative dependency closure")
    expected = digest_object(refs)
    if nd.get("closureDigest") != expected:
        raise VerificationError("normative dependency closureDigest mismatch")
    return True


def finalize_normative_dependencies(contract: dict) -> dict:
    nd = contract["normativeDependencies"]
    nd["artifacts"] = sorted(nd["artifacts"], key=artifact_tuple)
    pairs = [(r.get("artifactId"), r.get("version")) for r in nd["artifacts"]]
    if len(set(pairs)) != len(pairs):
        raise VerificationError("duplicate (artifactId, version) in normative dependency closure")
    nd["closureDigest"] = digest_object(nd["artifacts"])
    return contract
