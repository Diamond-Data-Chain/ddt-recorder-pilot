from __future__ import annotations

import argparse
import json
import tempfile
from pathlib import Path

from .digest import sha256_bytes, digest_object
from .offline import safe_extract
from .proof import load_keyring, load_private_key, create_proof
from .schema import LocalSchemaStore
from .strict_json import load_strict
from .validator import (
    _verify_profile_and_optionally_signature,
    verify_record_bundle,
)


REQUIRED_CHECKS = (
    "PACKAGE_STRUCTURE",
    "MANIFEST_INTEGRITY",
    "FILE_INTEGRITY",
    "MANIFEST_PROOF",
    "TARGET_BINDING",
    "DEPENDENCY_CLOSURE",
    "SCHEMA_VALIDATION",
    "HISTORICAL_CONFORMANCE",
    "RECORD_INTEGRITY",
    "EVIDENCE_INTEGRITY",
    "SIGNATURE_VALIDITY",
    "RELATIONSHIPS",
)


def _artifact_key(ref: dict) -> tuple:
    return (
        ref.get("artifactId"),
        ref.get("version"),
        ref.get("digest", {}).get("algorithm"),
        ref.get("digest", {}).get("value"),
        ref.get("immutableRef"),
        ref.get("mediaType"),
    )


def _require_file(root: Path, rel: str) -> Path:
    p = root / rel
    if not p.is_file():
        raise RuntimeError(f"required package file missing: {rel}")
    return p


def _receipt_overall_status(receipt: dict) -> str | None:
    value = receipt.get("receiptCore", {}).get("overallResult")
    if isinstance(value, dict):
        return value.get("status")
    if isinstance(value, str):
        return value
    return None


def _record_id(envelope: dict) -> str | None:
    return envelope.get("identity", {}).get("ddtRecordId")


def _record_hash(envelope: dict) -> dict | None:
    return envelope.get("commitments", {}).get("recordHash")


def _previous_ref(envelope: dict):
    return envelope.get("relationships", {}).get("previousRecordInFamily")


def _previous_id(prev: dict | None):
    if not isinstance(prev, dict):
        return None
    return (
        prev.get("ddtRecordId")
        or prev.get("recordId")
        or prev.get("targetId")
    )


def _previous_hash(prev: dict | None):
    if not isinstance(prev, dict):
        return None
    value = (
        prev.get("recordHash")
        or prev.get("commitment")
        or prev.get("targetCommitment")
    )
    return value if isinstance(value, dict) else None


def verify_reference_recorder_offline_package(
    archive: str | Path,
) -> dict:
    archive = Path(archive)

    checks = {
        name: {
            "status": "NOT_EVALUATED",
            "detail": None,
        }
        for name in REQUIRED_CHECKS
    }

    with tempfile.TemporaryDirectory(
        prefix="ddt-offline-reference-"
    ) as tmp:
        root = Path(tmp) / "package"

        # inspect_zip is executed inside safe_extract. If this succeeds,
        # archive path safety, manifest/file set, byte lengths, raw SHA-256
        # digests and manifestCoreHash have all passed.
        report = safe_extract(
            archive,
            root,
        )

        checks["PACKAGE_STRUCTURE"] = {
            "status": "PASS",
            "detail": f'{report["entries"]} archive entries',
        }
        checks["MANIFEST_INTEGRITY"] = {
            "status": "PASS",
            "detail": report["manifestCoreHash"]["value"],
        }
        checks["FILE_INTEGRITY"] = {
            "status": "PASS",
            "detail": f'{report["entries"] - 1} listed files verified',
        }

        manifest = report["manifest"]
        core = manifest["manifestCore"]

        # All normative schemas/profiles used below are resolved from the
        # extracted package itself.
        store = LocalSchemaStore(root)
        store.validate(
            manifest,
            "ddt-offline-verification-package-v0.2.schema.json",
        )

        keyring_path = _require_file(
            root,
            "verification/keyring.json",
        )
        keyring = load_keyring(keyring_path)

        package_proofs = []
        for proof in manifest["manifestProofs"]:
            package_proofs.append(
                _verify_profile_and_optionally_signature(
                    proof,
                    ddt_root=root,
                    keyring=keyring,
                    expected_digest=manifest["manifestCoreHash"],
                    purpose="OFFLINE_PACKAGE_ATTESTATION",
                    target_type="MANIFEST_CORE_HASH",
                )
            )

        if not package_proofs or any(
            p.get("signature") != "VALID"
            for p in package_proofs
        ):
            checks["MANIFEST_PROOF"] = {
                "status": "FAIL",
                "detail": package_proofs,
            }
        else:
            checks["MANIFEST_PROOF"] = {
                "status": "PASS",
                "detail": package_proofs,
            }

        envelope = load_strict(
            _require_file(root, "record/envelope.json")
        )
        receipt = load_strict(
            _require_file(
                root,
                "record/conformance-receipt.json",
            )
        )
        registration_result = load_strict(
            _require_file(
                root,
                "record/registration-result.json",
            )
        )

        # Schemas are package-local.
        store.validate(
            envelope,
            "ddt-record-envelope-v0.3-draft.5.schema.json",
        )
        store.validate(
            receipt,
            "ddt-conformance-receipt-v0.3.schema.json",
        )
        store.validate(
            registration_result,
            "ddt-registration-result-v0.1.schema.json",
        )

        checks["SCHEMA_VALIDATION"] = {
            "status": "PASS",
            "detail": [
                "DDT Record Envelope",
                "Conformance Receipt",
                "Registration Result",
            ],
        }

        target = core["target"]
        rid = _record_id(envelope)
        rhash = _record_hash(envelope)

        registration_matches = (
            registration_result.get("ddtRecordId") == rid
            and registration_result.get("recordHash") == rhash
        )

        if (
            target.get("targetType") == "DDT_RECORD"
            and target.get("targetId") == rid
            and target.get("targetCommitment") == rhash
            and registration_matches
        ):
            checks["TARGET_BINDING"] = {
                "status": "PASS",
                "detail": {
                    "targetId": rid,
                    "recordHash": rhash,
                },
            }
        else:
            checks["TARGET_BINDING"] = {
                "status": "FAIL",
                "detail": {
                    "manifestTarget": target,
                    "recordId": rid,
                    "recordHash": rhash,
                    "registrationResultMatches": registration_matches,
                },
            }

        contract = envelope["preservationContract"]
        contract_deps = contract[
            "normativeDependencies"
        ]["artifacts"]
        package_deps = core["dependencyClosure"]

        contract_keys = sorted(
            _artifact_key(x)
            for x in contract_deps
        )
        package_keys = sorted(
            _artifact_key(x)
            for x in package_deps
        )

        dep_failures = []

        if contract_keys != package_keys:
            dep_failures.append(
                "manifest dependencyClosure differs from Preservation Contract"
            )

        listed_by_path = {
            entry["path"]: entry
            for entry in core["files"]
        }

        for dep in contract_deps:
            rel = dep.get("immutableRef")
            if not rel:
                dep_failures.append(
                    f'{dep.get("artifactId")}: missing immutableRef'
                )
                continue

            packaged = root / rel
            if not packaged.is_file():
                dep_failures.append(
                    f'{dep.get("artifactId")}: bytes unavailable at {rel}'
                )
                continue

            actual = sha256_bytes(
                packaged.read_bytes()
            )
            expected = dep["digest"]["value"]

            if actual != expected:
                dep_failures.append(
                    f'{dep.get("artifactId")}: digest mismatch'
                )

            if rel not in listed_by_path:
                dep_failures.append(
                    f'{dep.get("artifactId")}: not listed in manifest files'
                )

        checks["DEPENDENCY_CLOSURE"] = {
            "status": "FAIL" if dep_failures else "PASS",
            "detail": (
                dep_failures
                if dep_failures
                else {
                    "dependencies": len(contract_deps),
                    "exactContractMatch": True,
                }
            ),
        }

        try:
            record_report = verify_record_bundle(
                envelope,
                receipt,
                ddt_root=root,
                keyring=keyring,
            )
            checks["RECORD_INTEGRITY"] = {
                "status": "PASS",
                "detail": {
                    "schemaValidation":
                        record_report.get("schemaValidation"),
                    "commitmentValidation":
                        record_report.get("commitmentValidation"),
                    "recordHash":
                        record_report.get("recordHash"),
                },
            }
        except Exception as exc:
            record_report = None
            checks["RECORD_INTEGRITY"] = {
                "status": "FAIL",
                "detail": str(exc),
            }

        historical_status = _receipt_overall_status(
            receipt
        )
        if historical_status == "PASS":
            checks["HISTORICAL_CONFORMANCE"] = {
                "status": "PASS",
                "detail": {
                    "receiptOverallResult":
                        historical_status,
                },
            }
        else:
            checks["HISTORICAL_CONFORMANCE"] = {
                "status": (
                    "FAIL"
                    if historical_status == "FAIL"
                    else "INDETERMINATE"
                ),
                "detail": {
                    "receiptOverallResult":
                        historical_status,
                },
            }

        evidence_manifest = envelope[
            "evidenceManifest"
        ]
        evidence_entries = evidence_manifest.get(
            "entries",
            [],
        )

        evidence_files = [
            e
            for e in core["files"]
            if e.get("role")
            == "ORIGINAL_EVIDENCE_BYTES"
        ]

        evidence_failures = []
        evidence_verified = 0

        for entry in evidence_entries:
            evidence_id = entry.get("evidenceId")
            candidates = [
                f
                for f in evidence_files
                if evidence_id
                in f.get("appliesTo", [])
            ]

            if len(candidates) != 1:
                evidence_failures.append(
                    f"{evidence_id}: expected exactly one original evidence file, got {len(candidates)}"
                )
                continue

            file_entry = candidates[0]
            raw = _require_file(
                root,
                file_entry["path"],
            ).read_bytes()

            expected = entry.get(
                "commitment",
                {},
            ).get("value")

            actual = sha256_bytes(raw)

            if actual != expected:
                evidence_failures.append(
                    f"{evidence_id}: evidence commitment mismatch"
                )
            else:
                evidence_verified += 1

        checks["EVIDENCE_INTEGRITY"] = {
            "status": (
                "FAIL"
                if evidence_failures
                else "PASS"
            ),
            "detail": (
                evidence_failures
                if evidence_failures
                else {
                    "verifiedEvidenceObjects":
                        evidence_verified,
                }
            ),
        }

        all_proofs = list(package_proofs)

        if record_report is not None:
            all_proofs.extend(
                record_report.get("proofs", [])
            )

        invalid_proofs = [
            p
            for p in all_proofs
            if p.get("signature") != "VALID"
        ]

        checks["SIGNATURE_VALIDITY"] = {
            "status": (
                "FAIL"
                if invalid_proofs
                else "PASS"
            ),
            "detail": (
                invalid_proofs
                if invalid_proofs
                else {
                    "validProofs":
                        len(all_proofs),
                }
            ),
        }

        previous = _previous_ref(envelope)

        if not previous:
            checks["RELATIONSHIPS"] = {
                "status": "PASS",
                "detail": "No previousRecordInFamily relationship declared.",
            }
        else:
            prev_id = _previous_id(previous)
            prev_hash = _previous_hash(previous)

            additional_record_files = [
                e
                for e in core["files"]
                if e.get("role") == "DDT_RECORD"
                and e.get("path") != "record/envelope.json"
            ]

            matched_previous = None
            invalid_previous = []

            for candidate in additional_record_files:
                try:
                    candidate_path = root / candidate["path"]
                    candidate_record = load_strict(candidate_path)

                    if (
                        _record_id(candidate_record) != prev_id
                        or _record_hash(candidate_record) != prev_hash
                    ):
                        continue

                    base = candidate_path.parent

                    candidate_receipt = load_strict(
                        _require_file(
                            root,
                            str(
                                (
                                    base
                                    / "conformance-receipt.json"
                                ).relative_to(root)
                            ),
                        )
                    )

                    candidate_registration = load_strict(
                        _require_file(
                            root,
                            str(
                                (
                                    base
                                    / "registration-result.json"
                                ).relative_to(root)
                            ),
                        )
                    )

                    previous_report = verify_record_bundle(
                        candidate_record,
                        candidate_receipt,
                        ddt_root=root,
                        keyring=keyring,
                    )

                    store.validate(
                        candidate_registration,
                        "ddt-registration-result-v0.1.schema.json",
                    )

                    registration_ok = (
                        candidate_registration.get("ddtRecordId")
                        == prev_id
                        and candidate_registration.get("recordHash")
                        == prev_hash
                    )

                    current_family = envelope.get(
                        "identity",
                        {},
                    ).get("ddtFamilyId")

                    previous_family = candidate_record.get(
                        "identity",
                        {},
                    ).get("ddtFamilyId")

                    family_ok = (
                        current_family is not None
                        and previous_family == current_family
                    )

                    proof_ok = all(
                        proof.get("signature") == "VALID"
                        for proof in previous_report.get(
                            "proofs",
                            [],
                        )
                    )

                    if not registration_ok:
                        raise RuntimeError(
                            "predecessor Registration Result binding mismatch"
                        )

                    if not family_ok:
                        raise RuntimeError(
                            "predecessor ddtFamilyId does not match current record"
                        )

                    if not proof_ok:
                        raise RuntimeError(
                            "predecessor proof validation did not produce all VALID results"
                        )

                    matched_previous = {
                        "path": candidate["path"],
                        "ddtRecordId": prev_id,
                        "recordHash": prev_hash,
                        "ddtFamilyId": current_family,
                        "schemaValidation":
                            previous_report.get("schemaValidation"),
                        "commitmentValidation":
                            previous_report.get("commitmentValidation"),
                        "validProofs":
                            len(previous_report.get("proofs", [])),
                        "registrationResult":
                            candidate_registration.get("ddtNumber"),
                    }
                    break

                except Exception as exc:
                    invalid_previous.append(
                        {
                            "path": candidate.get("path"),
                            "error": str(exc),
                        }
                    )

            if matched_previous:
                checks["RELATIONSHIPS"] = {
                    "status": "PASS",
                    "detail": matched_previous,
                }
            elif invalid_previous:
                checks["RELATIONSHIPS"] = {
                    "status": "FAIL",
                    "detail": {
                        "reason":
                            "predecessor candidate exists but failed cryptographic/binding validation",
                        "previousRecordId": prev_id,
                        "previousRecordHash": prev_hash,
                        "failures": invalid_previous,
                    },
                }
            else:
                checks["RELATIONSHIPS"] = {
                    "status": "INDETERMINATE",
                    "detail": {
                        "reason":
                            "previousRecordInFamily is declared but predecessor Record bytes are not present in this package",
                        "previousRecordId": prev_id,
                        "previousRecordHash": prev_hash,
                    },
                }

        statuses = [
            v["status"]
            for v in checks.values()
        ]

        if "FAIL" in statuses:
            overall = "FAIL"
        elif any(
            x in statuses
            for x in (
                "INDETERMINATE",
                "UNAVAILABLE",
                "PARTIAL",
                "NOT_EVALUATED",
            )
        ):
            overall = "INDETERMINATE"
        else:
            overall = "PASS"

        return {
            "standard":
                "DDT-REFERENCE-RECORDER-OFFLINE-VERIFICATION",
            "version":
                "0.1.0-test.1",
            "target": {
                "targetId": rid,
                "recordHash": rhash,
            },
            "package": {
                "archive": str(archive),
                "manifestCoreHash":
                    report["manifestCoreHash"],
                "entries": report["entries"],
                "totalBytes": report["totalBytes"],
            },
            "requiredChecks": checks,
            "summary": {
                "status": overall,
                "pass": sum(
                    1
                    for x in statuses
                    if x == "PASS"
                ),
                "fail": sum(
                    1
                    for x in statuses
                    if x == "FAIL"
                ),
                "indeterminate": sum(
                    1
                    for x in statuses
                    if x == "INDETERMINATE"
                ),
                "total": len(statuses),
            },
        }



def _raw_artifact_ref(
    root: Path,
    rel: str,
    *,
    artifact_id: str,
    version: str,
    immutable_ref: str | None = None,
    media_type: str = "application/json",
) -> dict:
    p = root / rel
    if not p.is_file():
        raise RuntimeError(
            f"artifact missing for Verification Result: {rel}"
        )

    return {
        "artifactId": artifact_id,
        "version": version,
        "digest": {
            "algorithm": "SHA-256",
            "value": sha256_bytes(p.read_bytes()),
        },
        "immutableRef": immutable_ref or rel,
        "mediaType": media_type,
    }


def _created_at() -> str:
    from datetime import datetime, timezone

    return (
        datetime.now(timezone.utc)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z")
    )


def _uuid_urn() -> str:
    import uuid
    return f"urn:uuid:{uuid.uuid4()}"


def _detail_string(value) -> str:
    import json

    if isinstance(value, str):
        text = value
    else:
        text = json.dumps(
            value,
            sort_keys=True,
            separators=(",", ":"),
        )

    return text[:20000]


def _create_proof_compat(
    *,
    proof_id: str,
    purpose: str,
    target_type: str,
    target_digest: dict,
    proof_profile: dict,
    verification_method: str,
    private_key,
    created_at_claim: str,
) -> dict:
    import inspect

    sig = inspect.signature(create_proof)

    values = {
        "proof_id": proof_id,
        "purpose": purpose,
        "proof_purpose": purpose,
        "target_type": target_type,
        "signed_object_type": target_type,
        "target_digest": target_digest,
        "signed_object_digest": target_digest,
        "digest": target_digest,
        "proof_profile": proof_profile,
        "proof_profile_ref": proof_profile,
        "profile_ref": proof_profile,
        "verification_method": verification_method,
        "private_key": private_key,
        "created_at_claim": created_at_claim,
        "created_at": created_at_claim,
    }

    kwargs = {}

    for name, param in sig.parameters.items():
        if name in values:
            kwargs[name] = values[name]
        elif (
            param.default is inspect.Parameter.empty
            and param.kind
            not in (
                inspect.Parameter.VAR_POSITIONAL,
                inspect.Parameter.VAR_KEYWORD,
            )
        ):
            raise RuntimeError(
                f"unsupported required create_proof parameter: {name}"
            )

    return create_proof(**kwargs)


def _axis_result(
    *,
    execution_id: str,
    axis_id: str,
    status_class: str,
    status: str,
    package_id: str,
    package_commitment: dict,
    procedure_profile: dict,
    detail,
    reason_codes: list[str] | None = None,
) -> dict:
    return {
        "axisResultId":
            f"{execution_id}:axis:{axis_id}",
        "axisId": axis_id,
        "statusClass": status_class,
        "subject": {
            "type": "OFFLINE_PACKAGE",
            "ref": package_id,
            "commitment": package_commitment,
        },
        "requirement": "REQUIRED",
        "status": status,
        "procedureProfile": procedure_profile,
        "reasonCodes": reason_codes or [],
        "evaluatedArtifactRefs": [],
        "evidenceRefs": [],
        "dependencies": [],
        "detail": _detail_string(detail),
    }


def build_formal_verification_result(
    archive: str | Path,
    *,
    private_key_path: str | Path,
    verification_method: str,
) -> dict:
    archive = Path(archive)

    internal = (
        verify_reference_recorder_offline_package(
            archive
        )
    )

    import hashlib as _hashlib
    import json as _json

    def _repro_projection(
        result: dict,
    ) -> dict:
        return {
            "manifestCoreHash":
                result["package"][
                    "manifestCoreHash"
                ],
            "target":
                result["target"],
            "requiredChecks":
                result["requiredChecks"],
        }

    primary_projection = (
        _repro_projection(
            internal
        )
    )

    primary_projection_bytes = (
        _json.dumps(
            primary_projection,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
    )

    primary_projection_sha256 = (
        _hashlib.sha256(
            primary_projection_bytes
        ).hexdigest()
    )

    replay_error = None
    replay_projection_sha256 = None
    replay_match = False

    try:
        internal_replay = (
            verify_reference_recorder_offline_package(
                archive
            )
        )

        replay_projection = (
            _repro_projection(
                internal_replay
            )
        )

        replay_projection_bytes = (
            _json.dumps(
                replay_projection,
                sort_keys=True,
                separators=(",", ":"),
            ).encode("utf-8")
        )

        replay_projection_sha256 = (
            _hashlib.sha256(
                replay_projection_bytes
            ).hexdigest()
        )

        replay_match = (
            primary_projection ==
            replay_projection
        )

        reproducibility_status = (
            "MATCH"
            if replay_match
            else "MISMATCH"
        )

        reproducibility_reasons = []

    except Exception as exc:
        reproducibility_status = (
            "INDETERMINATE"
        )

        reproducibility_reasons = []

        replay_error = (
            f"{type(exc).__name__}: {exc}"
        )

    with tempfile.TemporaryDirectory(
        prefix="ddt-formal-result-"
    ) as tmp:
        root = Path(tmp) / "package"

        package_report = safe_extract(
            archive,
            root,
        )

        manifest = package_report["manifest"]
        core = manifest["manifestCore"]

        envelope = load_strict(
            _require_file(
                root,
                "record/envelope.json",
            )
        )

        keyring = load_keyring(
            _require_file(
                root,
                "verification/keyring.json",
            )
        )

        store = LocalSchemaStore(root)

        offline_profile_rel = (
            "profiles/"
            "ddt-reference-recorder-offline-verification-profile-v0.1.json"
        )

        offline_profile = load_strict(
            _require_file(
                root,
                offline_profile_rel,
            )
        )

        required_axes = list(
            offline_profile["requiredAxes"]
        )

        scope_profile = _raw_artifact_ref(
            root,
            offline_profile_rel,
            artifact_id=(
                "DDT-REFERENCE-RECORDER-"
                "OFFLINE-VERIFICATION-PROFILE-0.1-DRAFT.1"
            ),
            version="0.1.0-draft.1",
        )

        summary_profile_rel = (
            "profiles/"
            "ddt-verification-result-summary-derivation-profile-v0.1.json"
        )

        summary_profile = _raw_artifact_ref(
            root,
            summary_profile_rel,
            artifact_id=(
                "DDT-VERIFICATION-RESULT-"
                "SUMMARY-DERIVATION-PROFILE-0.1-DRAFT.1"
            ),
            version="0.1.0-draft.1",
        )

        axis_registry_rel = (
            "profiles/"
            "ddt-verification-axis-registry-v0.2.json"
        )

        reason_registry_rel = (
            "profiles/"
            "ddt-verification-reason-code-registry-v0.2.json"
        )

        axis_digest = sha256_bytes(
            _require_file(
                root,
                axis_registry_rel,
            ).read_bytes()
        )

        reason_digest = sha256_bytes(
            _require_file(
                root,
                reason_registry_rel,
            ).read_bytes()
        )

        expected_axis_digest = (
            "adc0c50393cf0e285c0732dcc4dcd0ed"
            "777776f5e8be52caef0b58fbeaf737a6"
        )

        expected_reason_digest = (
            "f5f1e7310439c8407f14942da6e4d71d"
            "808fa120d41ab7fe2a5d95050e8e0d35"
        )

        if axis_digest != expected_axis_digest:
            raise RuntimeError(
                "axis registry digest does not match "
                "DDT Verification Result v0.2"
            )

        if reason_digest != expected_reason_digest:
            raise RuntimeError(
                "reason-code registry digest does not match "
                "DDT Verification Result v0.2"
            )

        axis_registry = {
            "artifactId":
                "ddt.verification.axis-registry.v2",
            "version": "0.2.0-draft.1",
            "digest": {
                "algorithm": "SHA-256",
                "value": axis_digest,
            },
            "immutableRef": (
                "https://diamonddatachain.org/"
                "specifications/ddt/"
                "verification-axis-registry/"
                "0.2.0-draft.1/registry.json"
            ),
            "mediaType": "application/json",
        }

        reason_registry = {
            "artifactId":
                "ddt.verification.reason-code-registry.v2",
            "version": "0.2.0-draft.1",
            "digest": {
                "algorithm": "SHA-256",
                "value": reason_digest,
            },
            "immutableRef": (
                "https://diamonddatachain.org/"
                "specifications/ddt/"
                "verification-reason-code-registry/"
                "0.2.0-draft.1/registry.json"
            ),
            "mediaType": "application/json",
        }

        verifier_descriptor_rel = (
            "verifier/"
            "DDT_REFERENCE_OFFLINE_VERIFIER_V0.1_DRAFT.json"
        )

        verifier_descriptor = load_strict(
            _require_file(
                root,
                verifier_descriptor_rel,
            )
        )

        verifier_ref = _raw_artifact_ref(
            root,
            verifier_descriptor_rel,
            artifact_id=(
                verifier_descriptor[
                    "implementationId"
                ]
            ),
            version=verifier_descriptor["version"],
        )

        checks = internal["requiredChecks"]

        all_internal_pass = all(
            value["status"] == "PASS"
            for value in checks.values()
        )

        any_internal_fail = any(
            value["status"] == "FAIL"
            for value in checks.values()
        )

        external_dependencies = core.get(
            "externalDependencies",
            [],
        )

        execution_id = _uuid_urn()

        package_id = core["packageId"]

        package_commitment = (
            package_report["manifestCoreHash"]
        )

        axes = []

        axes.append(
            _axis_result(
                execution_id=execution_id,
                axis_id=(
                    "OFFLINE_PACKAGE_MANIFEST_INTEGRITY"
                ),
                status_class="INTEGRITY",
                status=(
                    "PASS"
                    if checks["MANIFEST_INTEGRITY"]["status"]
                    == "PASS"
                    else "FAIL"
                ),
                package_id=package_id,
                package_commitment=package_commitment,
                procedure_profile=scope_profile,
                detail=checks["MANIFEST_INTEGRITY"],
                reason_codes=(
                    []
                    if checks["MANIFEST_INTEGRITY"]["status"]
                    == "PASS"
                    else ["DOCUMENT_HASH_MISMATCH"]
                ),
            )
        )

        axes.append(
            _axis_result(
                execution_id=execution_id,
                axis_id="OFFLINE_PACKAGE_SIGNATURE",
                status_class="VALIDITY",
                status=(
                    "VALID"
                    if checks["MANIFEST_PROOF"]["status"]
                    == "PASS"
                    else "INVALID"
                ),
                package_id=package_id,
                package_commitment=package_commitment,
                procedure_profile=scope_profile,
                detail=checks["MANIFEST_PROOF"],
                reason_codes=(
                    []
                    if checks["MANIFEST_PROOF"]["status"]
                    == "PASS"
                    else ["SIGNATURE_INVALID"]
                ),
            )
        )

        axes.append(
            _axis_result(
                execution_id=execution_id,
                axis_id=(
                    "OFFLINE_PACKAGE_TARGET_BINDING"
                ),
                status_class="BINDING",
                status=(
                    "BOUND"
                    if checks["TARGET_BINDING"]["status"]
                    == "PASS"
                    else "UNBOUND"
                ),
                package_id=package_id,
                package_commitment=package_commitment,
                procedure_profile=scope_profile,
                detail=checks["TARGET_BINDING"],
                reason_codes=(
                    []
                    if checks["TARGET_BINDING"]["status"]
                    == "PASS"
                    else ["TARGET_COMMITMENT_UNBOUND"]
                ),
            )
        )

        axes.append(
            _axis_result(
                execution_id=execution_id,
                axis_id=(
                    "OFFLINE_PACKAGE_FILE_INTEGRITY"
                ),
                status_class="INTEGRITY",
                status=(
                    "PASS"
                    if checks["FILE_INTEGRITY"]["status"]
                    == "PASS"
                    else "FAIL"
                ),
                package_id=package_id,
                package_commitment=package_commitment,
                procedure_profile=scope_profile,
                detail=checks["FILE_INTEGRITY"],
                reason_codes=(
                    []
                    if checks["FILE_INTEGRITY"]["status"]
                    == "PASS"
                    else ["PACKAGE_FILE_DIGEST_MISMATCH"]
                ),
            )
        )

        axes.append(
            _axis_result(
                execution_id=execution_id,
                axis_id=(
                    "OFFLINE_EXTERNAL_DEPENDENCY_AVAILABILITY"
                ),
                status_class="AVAILABILITY",
                status=(
                    "AVAILABLE"
                    if not external_dependencies
                    else "UNAVAILABLE"
                ),
                package_id=package_id,
                package_commitment=package_commitment,
                procedure_profile=scope_profile,
                detail={
                    "externalDependencies":
                        external_dependencies,
                    "policy":
                        "all required historical dependencies "
                        "must be package-local for this profile",
                },
                reason_codes=(
                    []
                    if not external_dependencies
                    else ["DEPENDENCY_UNAVAILABLE"]
                ),
            )
        )

        axes.append(
            _axis_result(
                execution_id=execution_id,
                axis_id=(
                    "OFFLINE_PACKAGE_DEPENDENCY_CLOSURE"
                ),
                status_class="CONFORMANCE",
                status=(
                    "PASS"
                    if checks["DEPENDENCY_CLOSURE"]["status"]
                    == "PASS"
                    else "FAIL"
                ),
                package_id=package_id,
                package_commitment=package_commitment,
                procedure_profile=scope_profile,
                detail=checks["DEPENDENCY_CLOSURE"],
                reason_codes=(
                    []
                    if checks["DEPENDENCY_CLOSURE"]["status"]
                    == "PASS"
                    else [
                        "OFFLINE_DEPENDENCY_CLOSURE_INCOMPLETE"
                    ]
                ),
            )
        )

        axes.append(
            _axis_result(
                execution_id=execution_id,
                axis_id=(
                    "OFFLINE_PACKAGE_EXTRACTION_SAFETY"
                ),
                status_class="CONFORMANCE",
                status=(
                    "PASS"
                    if checks["PACKAGE_STRUCTURE"]["status"]
                    == "PASS"
                    else "FAIL"
                ),
                package_id=package_id,
                package_commitment=package_commitment,
                procedure_profile=scope_profile,
                detail=checks["PACKAGE_STRUCTURE"],
                reason_codes=(
                    []
                    if checks["PACKAGE_STRUCTURE"]["status"]
                    == "PASS"
                    else ["OFFLINE_EXTRACTION_UNSAFE"]
                ),
            )
        )

        axes.append(
            _axis_result(
                execution_id=execution_id,
                axis_id=(
                    "OFFLINE_EXECUTION_NETWORK_ISOLATION"
                ),
                status_class="CONFORMANCE",
                status="PASS",
                package_id=package_id,
                package_commitment=package_commitment,
                procedure_profile=scope_profile,
                detail={
                    "networkAccessPolicy":
                        core["verificationPlan"][
                            "networkAccess"
                        ],
                    "networkAccessPerformed": False,
                    "resolution":
                        "package-local normative artifacts only",
                },
            )
        )

        axes.append(
            _axis_result(
                execution_id=execution_id,
                axis_id=(
                    "OFFLINE_VERIFICATION_REPRODUCIBILITY"
                ),
                status_class="REPRODUCTION",
                status=reproducibility_status,
                package_id=package_id,
                package_commitment=package_commitment,
                procedure_profile=scope_profile,
                detail={
                    "requiredChecks":
                        checks,
                    "requiredCheckCount":
                        len(checks),
                    "replayExecuted":
                        replay_error is None,
                    "replayMatch":
                        replay_match,
                    "primaryProjectionSha256":
                        primary_projection_sha256,
                    "replayProjectionSha256":
                        replay_projection_sha256,
                    "replayError":
                        replay_error,
                },
                reason_codes=reproducibility_reasons,
            )
        )

        axis_by_id = {
            a["axisId"]: a
            for a in axes
        }

        missing_axes = [
            axis
            for axis in required_axes
            if axis not in axis_by_id
        ]

        duplicate_axes = (
            len(axis_by_id) != len(axes)
        )

        if missing_axes or duplicate_axes:
            raise RuntimeError(
                "required Verification Result axis coverage invalid: "
                f"missing={missing_axes} duplicate={duplicate_axes}"
            )

        positive = {
            "INTEGRITY": {"PASS"},
            "AVAILABILITY":
                {"AVAILABLE", "NOT_REQUIRED"},
            "BINDING":
                {"BOUND", "NOT_APPLICABLE"},
            "CONFORMANCE":
                {"PASS", "NOT_APPLICABLE"},
            "VALIDITY":
                {"VALID", "NOT_APPLICABLE"},
            "RESOLUTION":
                {"VERIFIED", "NOT_APPLICABLE"},
            "LIFECYCLE": {"VALID"},
            "TIME":
                {"ASSERTED", "PROVEN", "NOT_APPLICABLE"},
            "REPRODUCTION": {"MATCH"},
            "SEMANTIC":
                {"COMPLETE", "NOT_APPLICABLE"},
            "PRESERVATION":
                {"PASS", "NOT_APPLICABLE"},
            "COMPLETENESS":
                {"COMPLETE", "NOT_APPLICABLE"},
            "FINALITY":
                {"FINAL", "NOT_APPLICABLE"},
            "CONTINUITY":
                {"PRESERVED", "NOT_APPLICABLE"},
            "TRUTH_BOUNDARY":
                {"NOT_APPLICABLE"},
        }

        hard_fail = {
            "FAIL",
            "FAILED",
            "INVALID",
            "UNBOUND",
            "MISMATCH",
            "INCOMPLETE",
            "NOT_FINAL",
            "NOT_PRESERVED",
        }

        required_refs = [
            axis_by_id[axis]["axisResultId"]
            for axis in required_axes
        ]

        failing_refs = []
        unresolved_refs = []

        for axis_id in required_axes:
            axis = axis_by_id[axis_id]
            status = axis["status"]

            if status in hard_fail:
                failing_refs.append(
                    axis["axisResultId"]
                )
            elif status not in positive.get(
                axis["statusClass"],
                set(),
            ):
                unresolved_refs.append(
                    axis["axisResultId"]
                )

        if failing_refs:
            summary_status = "FAIL"
            summary_reasons = [
                "DEPENDENCY_FAILED"
            ]
        elif unresolved_refs:
            summary_status = "INDETERMINATE"
            summary_reasons = [
                "REQUIRED_AXIS_MISSING"
            ]
        else:
            summary_status = "PASS"
            summary_reasons = []

        result_core = {
            "resultId": _uuid_urn(),
            "target": {
                "targetType": "DDT_RECORD",
                "targetId":
                    internal["target"]["targetId"],
                "targetCommitment":
                    internal["target"]["recordHash"],
            },
            "verifier": {
                "implementation":
                    verifier_ref,
                "executionId":
                    execution_id,
            },
            "verificationRequest": {
                "requestId": _uuid_urn(),
                "requiredAxes":
                    required_axes,
                "optionalAxes": [],
                "scopeProfile":
                    scope_profile,
            },
            "axisRegistry":
                axis_registry,
            "reasonCodeRegistry":
                reason_registry,
            "artifactEvaluations": [],
            "axisResults":
                axes,
            "summary": {
                "status":
                    summary_status,
                "derivationProfile":
                    summary_profile,
                "requiredAxisResultRefs":
                    required_refs,
                "limitingAxisResultRefs": [],
                "failingAxisResultRefs":
                    failing_refs,
                "unresolvedAxisResultRefs":
                    unresolved_refs,
                "reasonCodes":
                    summary_reasons,
            },
            "evaluatedAtClaim":
                _created_at(),
        }

        result_core_hash = digest_object(
            result_core
        )

        registration_proofs = (
            envelope["registration"][
                "signatureProofs"
            ]
        )

        if not registration_proofs:
            raise RuntimeError(
                "cannot resolve baseline Signature Proof profile"
            )

        proof_profile = (
            registration_proofs[0][
                "proofProfile"
            ]
        )

        private_key = load_private_key(
            private_key_path
        )

        result_proof = _create_proof_compat(
            proof_id=(
                "verification-result-proof-"
                + result_core["resultId"].split(":")[-1]
            ),
            purpose=(
                "VERIFICATION_RESULT_ATTESTATION"
            ),
            target_type=(
                "VERIFICATION_RESULT_CORE_HASH"
            ),
            target_digest=result_core_hash,
            proof_profile=proof_profile,
            verification_method=
                verification_method,
            private_key=private_key,
            created_at_claim=_created_at(),
        )

        result = {
            "specification": {
                "standard":
                    "DDT-VERIFICATION-RESULT",
                "version":
                    "0.2.0-draft.1",
            },
            "resultCore":
                result_core,
            "resultCoreHash":
                result_core_hash,
            "proofs": [
                result_proof
            ],
        }

        store.validate(
            result,
            "ddt-verification-result-v0.2.schema.json",
        )

        proof_check = (
            _verify_profile_and_optionally_signature(
                result_proof,
                ddt_root=root,
                keyring=keyring,
                expected_digest=
                    result_core_hash,
                purpose=(
                    "VERIFICATION_RESULT_ATTESTATION"
                ),
                target_type=(
                    "VERIFICATION_RESULT_CORE_HASH"
                ),
            )
        )

        if proof_check.get(
            "signature"
        ) != "VALID":
            raise RuntimeError(
                "Verification Result proof did not validate: "
                + repr(proof_check)
            )

        return result


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="python -m ddt_ref.offline_reference"
    )

    parser.add_argument("archive")
    parser.add_argument("--private-key")
    parser.add_argument("--verification-method")
    parser.add_argument("--output")

    args = parser.parse_args(argv)

    try:
        if (
            args.private_key
            and args.verification_method
        ):
            result = (
                build_formal_verification_result(
                    args.archive,
                    private_key_path=
                        args.private_key,
                    verification_method=
                        args.verification_method,
                )
            )

            if args.output:
                Path(args.output).write_text(
                    json.dumps(
                        result,
                        indent=2,
                        sort_keys=True,
                    ) + "\n"
                )

            print(
                json.dumps(
                    result,
                    indent=2,
                    sort_keys=True,
                )
            )

            return (
                0
                if result["resultCore"][
                    "summary"
                ]["status"] == "PASS"
                else 2
            )

        result = (
            verify_reference_recorder_offline_package(
                args.archive
            )
        )

        print(
            json.dumps(
                result,
                indent=2,
                sort_keys=True,
            )
        )

        return (
            0
            if result["summary"]["status"]
            == "PASS"
            else 2
        )

    except Exception as exc:
        print(
            json.dumps(
                {
                    "status": "FAIL",
                    "error": str(exc),
                },
                indent=2,
                sort_keys=True,
            )
        )
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
