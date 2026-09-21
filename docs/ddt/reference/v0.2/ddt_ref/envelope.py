from __future__ import annotations
from .digest import digest_object
from .receipt import verify_receipt_internal
from .preservation import verify_normative_dependencies
from .errors import VerificationError


def record_hash_input(envelope: dict) -> dict:
    c = envelope["commitments"]
    return {
        "specification": envelope["specification"],
        "identity": envelope["identity"],
        "registeredUpstreamCommitment": c["registeredUpstreamCommitment"],
        "evidenceManifestCommitment": c["evidenceManifestCommitment"],
        "preservationContractCommitment": c["preservationContractCommitment"],
        "relationships": envelope["relationships"],
    }


def recompute_envelope_commitments(envelope: dict) -> dict:
    upstream = digest_object(envelope["upstream"])
    evidence = digest_object(envelope["evidenceManifest"])
    contract = digest_object(envelope["preservationContract"])
    temp = {**envelope, "commitments": {
        "registeredUpstreamCommitment": upstream,
        "evidenceManifestCommitment": evidence,
        "preservationContractCommitment": contract,
        "recordHash": {"algorithm":"SHA-256","value":"0"*64},
    }}
    record = digest_object(record_hash_input(temp))
    return {
        "registeredUpstreamCommitment": upstream,
        "evidenceManifestCommitment": evidence,
        "preservationContractCommitment": contract,
        "recordHash": record,
    }


def verify_envelope_commitments(envelope: dict, receipt: dict | None = None) -> dict:
    verify_normative_dependencies(envelope["preservationContract"])
    expected = recompute_envelope_commitments(envelope)
    for k,v in expected.items():
        if envelope["commitments"].get(k) != v:
            raise VerificationError(f"{k} mismatch")
    statement = envelope["registration"]["statement"]
    if statement["recordHash"] != expected["recordHash"]: raise VerificationError("registration statement recordHash mismatch")
    if statement["preservationContractCommitment"] != expected["preservationContractCommitment"]: raise VerificationError("registration statement preservationContractCommitment mismatch")
    reg_hash = digest_object(statement)
    if envelope["registration"]["registrationStatementHash"] != reg_hash:
        raise VerificationError("registrationStatementHash mismatch")
    result = {**expected, "registrationStatementHash": reg_hash}
    if receipt is not None:
        r = verify_receipt_internal(receipt)
        core = receipt["receiptCore"]
        if core["recordHash"] != expected["recordHash"]: raise VerificationError("receipt recordHash binding mismatch")
        if core["preservationContractCommitment"] != expected["preservationContractCommitment"]: raise VerificationError("receipt contract binding mismatch")
        contract_nd = envelope["preservationContract"]["normativeDependencies"]
        closure = contract_nd["closureDigest"]
        if core["validationInput"]["preservationContractDependencyClosureDigest"] != closure:
            raise VerificationError("receipt dependency closure binding mismatch")
        receipt_refs = [e["artifact"] for e in core["normativeDependencyEvaluations"]]
        if receipt_refs != contract_nd["artifacts"]:
            raise VerificationError("receipt normative dependency coverage differs from Preservation Contract closure")
        if statement["conformanceReceiptCommitment"] != r["conformanceReceiptCommitment"]:
            raise VerificationError("conformanceReceiptCommitment mismatch")
        result.update(r)
    return result


def finalize_envelope_commitments(envelope: dict, conformance_receipt_commitment: dict | None = None) -> dict:
    verify_normative_dependencies(envelope["preservationContract"])
    envelope["commitments"] = recompute_envelope_commitments(envelope)
    statement = envelope["registration"]["statement"]
    statement["recordHash"] = envelope["commitments"]["recordHash"]
    statement["preservationContractCommitment"] = envelope["commitments"]["preservationContractCommitment"]
    if conformance_receipt_commitment is not None:
        statement["conformanceReceiptCommitment"] = conformance_receipt_commitment
    envelope["registration"]["registrationStatementHash"] = digest_object(statement)
    return envelope
