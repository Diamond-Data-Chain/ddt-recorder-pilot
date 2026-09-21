from __future__ import annotations
import argparse, json
from .strict_json import load_strict, dump_pretty
from .proof import load_keyring, load_private_key
from .validator import verify_record_bundle
from .offline import inspect_zip, safe_extract
from .schema import LocalSchemaStore
from .producer import finalize_contract, finalize_receipt, finalize_envelope
from .profiles import baseline_signature_profile_ref
from .packager import build_offline_package
from .receipt import complete_receipt_commitment
from .errors import DDTError
from .carriers import CARRIER_BINDINGS, verify_carrier
from .registration_result import validate_registration_result_semantics


def _json_out(value): print(json.dumps(value,ensure_ascii=False,indent=2,sort_keys=True))

def _sign_args(p):
    p.add_argument("--private-key"); p.add_argument("--verification-method"); p.add_argument("--proof-id"); p.add_argument("--created-at-claim"); p.add_argument("--ddt-root",default="docs/ddt")

def main(argv=None):
    ap=argparse.ArgumentParser(prog="ddt-ref",description="DDT reference producer/validator/offline verifier")
    sp=ap.add_subparsers(dest="cmd",required=True)
    p=sp.add_parser("schema-validate"); p.add_argument("json_file"); p.add_argument("schema_filename"); p.add_argument("--ddt-root",default="docs/ddt")
    p=sp.add_parser("schema-lint"); p.add_argument("--ddt-root",default="docs/ddt")
    p=sp.add_parser("verify-record"); p.add_argument("envelope"); p.add_argument("receipt"); p.add_argument("--ddt-root",default="docs/ddt"); p.add_argument("--keyring")
    p=sp.add_parser("verify-carrier"); p.add_argument("kind",choices=sorted(CARRIER_BINDINGS)); p.add_argument("json_file"); p.add_argument("--ddt-root",default="docs/ddt"); p.add_argument("--keyring")
    p=sp.add_parser("verify-registration-result"); p.add_argument("json_file"); p.add_argument("--ddt-root",default="docs/ddt")
    p=sp.add_parser("verify-offline"); p.add_argument("archive"); p.add_argument("--manifest",default="package-manifest.json"); p.add_argument("--extract-to"); p.add_argument("--ddt-root",default="docs/ddt"); p.add_argument("--keyring")
    p=sp.add_parser("finalize-contract"); p.add_argument("input"); p.add_argument("output")
    p=sp.add_parser("finalize-receipt"); p.add_argument("input"); p.add_argument("output"); _sign_args(p)
    p=sp.add_parser("finalize-envelope"); p.add_argument("input"); p.add_argument("receipt"); p.add_argument("output"); _sign_args(p)
    p=sp.add_parser("build-offline"); p.add_argument("manifest_template"); p.add_argument("source_dir"); p.add_argument("output_zip"); _sign_args(p)
    args=ap.parse_args(argv)
    try:
        if args.cmd=="schema-validate":
            LocalSchemaStore(args.ddt_root).validate(load_strict(args.json_file),args.schema_filename); _json_out({"status":"PASS"})
        elif args.cmd=="schema-lint": _json_out({"status":"PASS",**LocalSchemaStore(args.ddt_root).lint_all()})
        elif args.cmd=="verify-record":
            keys=load_keyring(args.keyring) if args.keyring else None; _json_out(verify_record_bundle(load_strict(args.envelope),load_strict(args.receipt),ddt_root=args.ddt_root,keyring=keys))
        elif args.cmd=="verify-carrier":
            keys=load_keyring(args.keyring) if args.keyring else None; _json_out({"status":"PASS",**verify_carrier(args.kind,load_strict(args.json_file),ddt_root=args.ddt_root,keyring=keys)})
        elif args.cmd=="verify-registration-result":
            obj=load_strict(args.json_file)
            LocalSchemaStore(args.ddt_root).validate(obj,"ddt-registration-result-v0.1.schema.json")
            issues=validate_registration_result_semantics(obj)
            if issues:
                raise ValueError("; ".join(f"{i.code}: {i.message}" for i in issues))
            _json_out({
                "status":"PASS",
                "ddtNumber":obj["ddtNumber"],
                "registrationSequence":obj["registrationSequence"],
                "ddtRecordId":obj["ddtRecordId"],
                "recordHash":obj["recordHash"]
            })
        elif args.cmd=="verify-offline":
            rep=safe_extract(args.archive,args.extract_to,manifest_name=args.manifest) if args.extract_to else inspect_zip(args.archive,manifest_name=args.manifest)
            manifest=rep["manifest"]; LocalSchemaStore(args.ddt_root).validate(manifest,"ddt-offline-verification-package-v0.2.schema.json")
            from .profiles import verify_signature_profile_ref
            from .proof import verify_proof
            keys=load_keyring(args.keyring) if args.keyring else None; prs=[]
            for pr in manifest["manifestProofs"]:
                verify_signature_profile_ref(pr["proofProfile"],args.ddt_root); item={"proofId":pr["proofId"],"profile":"MATCH","signature":"NOT_EVALUATED_NO_KEYRING"}
                if keys is not None:
                    vm=pr["verificationMethod"]
                    if vm in keys:
                        verify_proof(pr,expected_digest=manifest["manifestCoreHash"],public_key=keys[vm],expected_purpose="OFFLINE_PACKAGE_ATTESTATION",expected_target_type="MANIFEST_CORE_HASH"); item["signature"]="VALID"
                    else:item["signature"]="UNAVAILABLE_KEY"
                prs.append(item)
            out={k:v for k,v in rep.items() if k!="manifest"}; out.update({"status":"PASS","schemaValidation":"PASS","proofs":prs}); _json_out(out)
        elif args.cmd=="finalize-contract": dump_pretty(finalize_contract(load_strict(args.input)),args.output); _json_out({"status":"PASS","output":args.output})
        elif args.cmd=="finalize-receipt":
            obj=load_strict(args.input); sk=load_private_key(args.private_key) if args.private_key else None; profile=baseline_signature_profile_ref(args.ddt_root) if sk else None
            out=finalize_receipt(obj,proof_profile=profile,proof_id=args.proof_id,verification_method=args.verification_method,private_key=sk,created_at_claim=args.created_at_claim); dump_pretty(out,args.output); LocalSchemaStore(args.ddt_root).validate(out,"ddt-conformance-receipt-v0.3.schema.json"); _json_out({"status":"PASS","output":args.output,"commitment":complete_receipt_commitment(out)})
        elif args.cmd=="finalize-envelope":
            env=load_strict(args.input); rec=load_strict(args.receipt); sk=load_private_key(args.private_key) if args.private_key else None; profile=baseline_signature_profile_ref(args.ddt_root) if sk else None
            out=finalize_envelope(env,rec,proof_profile=profile,proof_id=args.proof_id,verification_method=args.verification_method,private_key=sk,created_at_claim=args.created_at_claim); dump_pretty(out,args.output); LocalSchemaStore(args.ddt_root).validate(out,"ddt-record-envelope-v0.3-draft.5.schema.json"); _json_out({"status":"PASS","output":args.output,"recordHash":out["commitments"]["recordHash"]})
        elif args.cmd=="build-offline":
            sk=load_private_key(args.private_key) if args.private_key else None; rep=build_offline_package(load_strict(args.manifest_template),source_dir=args.source_dir,output_zip=args.output_zip,ddt_root=args.ddt_root,private_key=sk,verification_method=args.verification_method,proof_id=args.proof_id or "offline-package-proof-001",created_at_claim=args.created_at_claim); LocalSchemaStore(args.ddt_root).validate(rep["manifest"],"ddt-offline-verification-package-v0.2.schema.json"); _json_out({k:v for k,v in rep.items() if k!="manifest"}|{"status":"PASS"})
        return 0
    except (DDTError,KeyError,ValueError) as e: _json_out({"status":"FAIL","error":str(e)}); return 2

if __name__=="__main__": raise SystemExit(main())
