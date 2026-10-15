from __future__ import annotations
from .schema import LocalSchemaStore
from .envelope import verify_envelope_commitments
from .proof import verify_proof
from .profiles import verify_signature_profile_ref
from .errors import VerificationError


def _verify_profile_and_optionally_signature(proof: dict, *, ddt_root, keyring, expected_digest, purpose, target_type):
    verify_signature_profile_ref(proof["proofProfile"], ddt_root)
    if keyring is None:
        return {"proofId":proof["proofId"],"profile":"MATCH","signature":"NOT_EVALUATED_NO_KEYRING"}
    vm = proof["verificationMethod"]
    if vm not in keyring:
        return {"proofId":proof["proofId"],"profile":"MATCH","signature":"UNAVAILABLE_KEY","verificationMethod":vm}
    verify_proof(proof, expected_digest=expected_digest, public_key=keyring[vm], expected_purpose=purpose, expected_target_type=target_type)
    return {"proofId":proof["proofId"],"profile":"MATCH","signature":"VALID"}


def verify_record_bundle(envelope: dict, receipt: dict, *, ddt_root, keyring: dict | None = None) -> dict:
    store = LocalSchemaStore(ddt_root)
    store.validate(envelope, "ddt-record-envelope-v0.3-draft.5.schema.json")
    store.validate(receipt, "ddt-conformance-receipt-v0.3.schema.json")
    result = verify_envelope_commitments(envelope, receipt)
    proof_results = []
    for p in receipt["proofs"]:
        proof_results.append(_verify_profile_and_optionally_signature(
            p, ddt_root=ddt_root, keyring=keyring, expected_digest=receipt["receiptCoreHash"],
            purpose="CONFORMANCE_ATTESTATION", target_type="RECEIPT_CORE_HASH"))
    for p in envelope["registration"]["signatureProofs"]:
        proof_results.append(_verify_profile_and_optionally_signature(
            p, ddt_root=ddt_root, keyring=keyring, expected_digest=envelope["registration"]["registrationStatementHash"],
            purpose="DDT_REGISTRATION", target_type="REGISTRATION_STATEMENT_HASH"))
    result["proofs"] = proof_results
    result["schemaValidation"] = "PASS"
    result["commitmentValidation"] = "PASS"
    return result
