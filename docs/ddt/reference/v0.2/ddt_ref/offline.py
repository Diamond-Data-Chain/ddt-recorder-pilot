from __future__ import annotations
import os, stat, unicodedata, zipfile
from pathlib import PurePosixPath, Path
from .strict_json import loads_strict
from .digest import sha256_bytes, digest_object
from .errors import OfflinePackageError


def normalize_package_path(name: str) -> str:
    if not isinstance(name, str) or not name:
        raise OfflinePackageError("empty archive path")
    if "\\" in name or "\x00" in name or name.startswith("/"):
        raise OfflinePackageError(f"unsafe archive path: {name!r}")
    parts = name.split("/")
    if any(p in ("", ".", "..") for p in parts):
        raise OfflinePackageError(f"unsafe archive path segment: {name!r}")
    return "/".join(parts)


def _unix_mode(info: zipfile.ZipInfo) -> int:
    return (info.external_attr >> 16) & 0xFFFF

def _is_symlink(info: zipfile.ZipInfo) -> bool:
    return stat.S_ISLNK(_unix_mode(info))

def _reject_special_file(info: zipfile.ZipInfo) -> None:
    mode = _unix_mode(info)
    ftype = stat.S_IFMT(mode)
    if ftype and not stat.S_ISREG(mode):
        raise OfflinePackageError(f"non-regular archive entry forbidden: {info.filename}")


def inspect_zip(zip_path: str | Path, *, manifest_name="package-manifest.json") -> dict:
    with zipfile.ZipFile(zip_path, "r") as z:
        infos = z.infolist()
        names, folded, nfc = set(), set(), set()
        if len(infos) == 0: raise OfflinePackageError("empty archive")
        for info in infos:
            if info.is_dir():
                raise OfflinePackageError("directory entries are forbidden; package uses regular files only")
            name = normalize_package_path(info.filename)
            if _is_symlink(info): raise OfflinePackageError(f"symlink entry forbidden: {name}")
            _reject_special_file(info)
            if name in names: raise OfflinePackageError(f"duplicate path: {name}")
            f = name.casefold(); u = unicodedata.normalize("NFC", name)
            if f in folded: raise OfflinePackageError(f"case-fold collision: {name}")
            if u in nfc: raise OfflinePackageError(f"Unicode-normalization collision: {name}")
            names.add(name); folded.add(f); nfc.add(u)
        if manifest_name not in names: raise OfflinePackageError(f"missing {manifest_name}")
        manifest = loads_strict(z.read(manifest_name).decode("utf-8"))
        core = manifest.get("manifestCore", {})
        limits = core.get("resourceLimits", {})
        max_entries = int(limits.get("maxEntries", len(infos)))
        max_file = int(limits.get("maxFileBytes", 2**63-1))
        max_total = int(limits.get("maxTotalBytes", 2**63-1))
        max_path = int(limits.get("maxPathLength", 4096))
        max_depth = int(limits.get("maxPathDepth", 100))
        max_ratio = int(limits.get("maxCompressionRatio", 1000000))
        if len(infos) > max_entries: raise OfflinePackageError("maxEntries exceeded")
        total = 0
        for info in infos:
            name = info.filename
            if len(name) > max_path or len(name.split("/")) > max_depth: raise OfflinePackageError(f"path limit exceeded: {name}")
            if info.file_size > max_file: raise OfflinePackageError(f"maxFileBytes exceeded: {name}")
            total += info.file_size
            if total > max_total: raise OfflinePackageError("maxTotalBytes exceeded")
            comp = max(info.compress_size, 1)
            if info.file_size / comp > max_ratio: raise OfflinePackageError(f"compression ratio exceeded: {name}")
        listed = core.get("files", [])
        listed_paths = [e.get("path") for e in listed]
        if len(set(listed_paths)) != len(listed_paths): raise OfflinePackageError("duplicate manifest file path")
        expected_names = set(listed_paths) | {manifest_name}
        if names != expected_names:
            extra = sorted(names - expected_names); missing = sorted(expected_names - names)
            raise OfflinePackageError(f"archive/manifest path mismatch extra={extra} missing={missing}")
        for e in listed:
            p = normalize_package_path(e["path"])
            data = z.read(p)
            if e["byteLength"] != len(data): raise OfflinePackageError(f"byteLength mismatch: {p}")
            if e["digest"] != {"algorithm":"SHA-256","value":sha256_bytes(data)}: raise OfflinePackageError(f"digest mismatch: {p}")
        expected_manifest_hash = digest_object(core)
        if manifest.get("manifestCoreHash") != expected_manifest_hash:
            raise OfflinePackageError("manifestCoreHash mismatch")
        return {"manifest": manifest, "manifestCoreHash": expected_manifest_hash, "entries": len(infos), "totalBytes": total}


def safe_extract(zip_path: str | Path, dest: str | Path, *, manifest_name="package-manifest.json") -> dict:
    report = inspect_zip(zip_path, manifest_name=manifest_name)
    dest = Path(dest)
    dest.mkdir(parents=True, exist_ok=False)
    with zipfile.ZipFile(zip_path, "r") as z:
        for info in z.infolist():
            target = dest / PurePosixPath(info.filename)
            target.parent.mkdir(parents=True, exist_ok=True)
            with z.open(info, "r") as src, open(target, "xb") as out:
                while True:
                    chunk = src.read(1024*1024)
                    if not chunk: break
                    out.write(chunk)
    return report
