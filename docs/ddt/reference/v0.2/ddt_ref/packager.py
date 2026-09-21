from __future__ import annotations
import copy, zipfile
from pathlib import Path
from .digest import raw_digest_object, digest_object
from .offline import normalize_package_path
from .proof import create_proof
from .profiles import baseline_signature_profile_ref
from .errors import OfflinePackageError


def build_offline_package(manifest: dict, *, source_dir: str | Path, output_zip: str | Path,
                          ddt_root: str | Path, private_key=None, verification_method: str | None = None,
                          proof_id: str = "offline-package-proof-001", created_at_claim: str | None = None) -> dict:
    """Finalize file digests/manifest hash, optionally sign, and write a transport ZIP.

    The manifest carrier itself is intentionally not listed in manifestCore.files.
    """
    manifest = copy.deepcopy(manifest)
    core = manifest["manifestCore"]
    source = Path(source_dir)
    seen = set()
    total = 0
    for entry in core["files"]:
        rel = normalize_package_path(entry["path"])
        if rel in seen: raise OfflinePackageError(f"duplicate manifest path: {rel}")
        seen.add(rel)
        p = source / rel
        if not p.is_file() or p.is_symlink(): raise OfflinePackageError(f"listed source is not a regular file: {rel}")
        data = p.read_bytes()
        entry["byteLength"] = len(data)
        entry["digest"] = raw_digest_object(data)
        total += len(data)
    core["files"] = sorted(core["files"], key=lambda e: e["path"])
    manifest["manifestCoreHash"] = digest_object(core)
    manifest.setdefault("manifestProofs", [])
    if private_key is not None:
        if not verification_method: raise OfflinePackageError("verification_method required when signing package")
        profile_ref = baseline_signature_profile_ref(ddt_root)
        proof = create_proof(
            proof_id=proof_id, purpose="OFFLINE_PACKAGE_ATTESTATION", target_type="MANIFEST_CORE_HASH",
            target_digest=manifest["manifestCoreHash"], proof_profile=profile_ref,
            verification_method=verification_method, private_key=private_key, created_at_claim=created_at_claim)
        manifest["manifestProofs"].append(proof)
    manifest["manifestProofs"] = sorted(manifest["manifestProofs"], key=lambda p: p["proofId"])
    ids=[p["proofId"] for p in manifest["manifestProofs"]]
    if len(ids) != len(set(ids)): raise OfflinePackageError("duplicate manifest proofId")
    out=Path(output_zip); out.parent.mkdir(parents=True,exist_ok=True)
    import json
    with zipfile.ZipFile(out,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        z.writestr("package-manifest.json", json.dumps(manifest,ensure_ascii=False,separators=(",",":")) + "\n")
        for entry in core["files"]:
            z.write(source/entry["path"],arcname=entry["path"])
    return {"manifest":manifest,"archive":str(out),"listedBytes":total,"listedFiles":len(core["files"])}
