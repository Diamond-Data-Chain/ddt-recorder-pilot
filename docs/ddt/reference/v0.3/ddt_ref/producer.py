from __future__ import annotations
from .preservation import finalize_normative_dependencies
from .receipt import finalize_receipt_hashes, complete_receipt_commitment
from .envelope import finalize_envelope_commitments
from .proof import create_proof


def finalize_contract(contract: dict) -> dict:
    return finalize_normative_dependencies(contract)


def finalize_receipt(receipt: dict, *, proof_profile: dict | None = None, proof_id: str | None = None,
                     verification_method: str | None = None, private_key=None, created_at_claim: str | None = None) -> dict:
    receipt = finalize_receipt_hashes(receipt)
    if private_key is not None:
        if not all([proof_profile, proof_id, verification_method]):
            raise ValueError("proof_profile, proof_id and verification_method required for signing")
        p = create_proof(proof_id=proof_id, purpose="CONFORMANCE_ATTESTATION", target_type="RECEIPT_CORE_HASH",
                         target_digest=receipt["receiptCoreHash"], proof_profile=proof_profile,
                         verification_method=verification_method, private_key=private_key, created_at_claim=created_at_claim)
        receipt["proofs"].append(p)
        receipt["proofs"] = sorted(receipt["proofs"], key=lambda x: x["proofId"])
    return receipt


def finalize_envelope(envelope: dict, receipt: dict, *, proof_profile: dict | None = None, proof_id: str | None = None,
                      verification_method: str | None = None, private_key=None, created_at_claim: str | None = None) -> dict:
    crc = complete_receipt_commitment(receipt)
    envelope = finalize_envelope_commitments(envelope, crc)
    if private_key is not None:
        if not all([proof_profile, proof_id, verification_method]):
            raise ValueError("proof_profile, proof_id and verification_method required for signing")
        p = create_proof(proof_id=proof_id, purpose="DDT_REGISTRATION", target_type="REGISTRATION_STATEMENT_HASH",
                         target_digest=envelope["registration"]["registrationStatementHash"], proof_profile=proof_profile,
                         verification_method=verification_method, private_key=private_key, created_at_claim=created_at_claim)
        envelope["registration"]["signatureProofs"].append(p)
        envelope["registration"]["signatureProofs"] = sorted(envelope["registration"]["signatureProofs"], key=lambda x:x["proofId"])
    return envelope
