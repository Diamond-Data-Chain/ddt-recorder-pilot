from __future__ import annotations
import copy
from .digest import digest_object
from .preservation import artifact_tuple
from .errors import VerificationError


def _ensure_sorted_unique_normative(evals: list):
    def key(e): return artifact_tuple(e.get("artifact", {}))
    if evals != sorted(evals, key=key):
        raise VerificationError("normativeDependencyEvaluations not canonically ordered")
    pairs = [(e.get("artifact",{}).get("artifactId"), e.get("artifact",{}).get("version")) for e in evals]
    if len(set(pairs)) != len(pairs):
        raise VerificationError("duplicate normative dependency evaluation")


def _ensure_sorted_unique_evidence(evals: list):
    ids = [e.get("evaluationId") for e in evals]
    if ids != sorted(ids):
        raise VerificationError("evidenceEvaluations not ordered by evaluationId")
    if len(set(ids)) != len(ids):
        raise VerificationError("duplicate evidence evaluationId")


def verify_receipt_internal(receipt: dict) -> dict:
    core = receipt["receiptCore"]
    _ensure_sorted_unique_normative(core["normativeDependencyEvaluations"])
    _ensure_sorted_unique_evidence(core["evidenceEvaluations"])
    vi = core["validationInput"]
    if vi["recordHash"] != core["recordHash"]: raise VerificationError("validationInput recordHash mismatch")
    if vi["preservationContractCommitment"] != core["preservationContractCommitment"]: raise VerificationError("validationInput preservationContractCommitment mismatch")
    art_hash = digest_object(core["artifactEvaluations"])
    norm_hash = digest_object(core["normativeDependencyEvaluations"])
    ev_hash = digest_object(core["evidenceEvaluations"])
    if vi["evaluatedArtifactSetHash"] != art_hash: raise VerificationError("evaluatedArtifactSetHash mismatch")
    if vi["evaluatedNormativeDependencySetHash"] != norm_hash: raise VerificationError("evaluatedNormativeDependencySetHash mismatch")
    if vi["evaluatedEvidenceSetHash"] != ev_hash: raise VerificationError("evaluatedEvidenceSetHash mismatch")
    manifest = {
        "recordHash": vi["recordHash"],
        "preservationContractCommitment": vi["preservationContractCommitment"],
        "preservationContractDependencyClosureDigest": vi["preservationContractDependencyClosureDigest"],
        "evaluatedArtifactSetHash": vi["evaluatedArtifactSetHash"],
        "evaluatedNormativeDependencySetHash": vi["evaluatedNormativeDependencySetHash"],
        "evaluatedEvidenceSetHash": vi["evaluatedEvidenceSetHash"],
    }
    if vi["inputManifestHash"] != digest_object(manifest): raise VerificationError("inputManifestHash mismatch")
    expected_core = digest_object(core)
    if receipt["receiptCoreHash"] != expected_core: raise VerificationError("receiptCoreHash mismatch")
    return {
        "receiptCoreHash": expected_core,
        "conformanceReceiptCommitment": complete_receipt_commitment(receipt),
    }


def complete_receipt_commitment(receipt: dict) -> dict:
    proofs = receipt.get("proofs", [])
    ids = [p.get("proofId") for p in proofs]
    if ids != sorted(ids): raise VerificationError("receipt proofs not ordered by proofId")
    if len(set(ids)) != len(ids): raise VerificationError("duplicate receipt proofId")
    obj = {
        "specification": receipt["specification"],
        "receiptCore": receipt["receiptCore"],
        "receiptCoreHash": receipt["receiptCoreHash"],
        "proofs": proofs,
    }
    return digest_object(obj)


def finalize_receipt_hashes(receipt: dict) -> dict:
    core = receipt["receiptCore"]
    core["normativeDependencyEvaluations"] = sorted(core["normativeDependencyEvaluations"], key=lambda e: artifact_tuple(e["artifact"]))
    core["evidenceEvaluations"] = sorted(core["evidenceEvaluations"], key=lambda e: e["evaluationId"])
    vi = core["validationInput"]
    if vi["recordHash"] != core["recordHash"]: raise VerificationError("validationInput recordHash mismatch")
    if vi["preservationContractCommitment"] != core["preservationContractCommitment"]: raise VerificationError("validationInput preservationContractCommitment mismatch")
    vi["evaluatedArtifactSetHash"] = digest_object(core["artifactEvaluations"])
    vi["evaluatedNormativeDependencySetHash"] = digest_object(core["normativeDependencyEvaluations"])
    vi["evaluatedEvidenceSetHash"] = digest_object(core["evidenceEvaluations"])
    manifest = {k: vi[k] for k in ["recordHash","preservationContractCommitment","preservationContractDependencyClosureDigest","evaluatedArtifactSetHash","evaluatedNormativeDependencySetHash","evaluatedEvidenceSetHash"]}
    vi["inputManifestHash"] = digest_object(manifest)
    receipt["receiptCoreHash"] = digest_object(core)
    receipt["proofs"] = sorted(receipt.get("proofs", []), key=lambda p: p["proofId"])
    return receipt
