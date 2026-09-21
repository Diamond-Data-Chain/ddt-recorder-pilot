from __future__ import annotations
import json, subprocess
from pathlib import Path
from .strict_json import validate_ijson_value
from .errors import CanonicalizationError

_NODE = Path(__file__).with_name("jcs_node.js")


def canonicalize(value) -> bytes:
    """RFC 8785 JCS bytes using the repository's Node runtime for ECMAScript number semantics."""
    validate_ijson_value(value)
    transport = json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    try:
        p = subprocess.run(
            ["node", str(_NODE)], input=transport.encode("utf-8"),
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False
        )
    except FileNotFoundError as e:
        raise CanonicalizationError("Node.js is required for the reference JCS engine") from e
    if p.returncode != 0:
        raise CanonicalizationError(p.stderr.decode("utf-8", "replace") or "JCS canonicalization failed")
    return p.stdout
