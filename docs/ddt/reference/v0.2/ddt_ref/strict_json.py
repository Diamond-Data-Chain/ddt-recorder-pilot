from __future__ import annotations
import json, math
from pathlib import Path
from .errors import StrictJSONError

MAX_SAFE_INTEGER = 9007199254740991


def _pairs_hook(pairs):
    out = {}
    for k, v in pairs:
        if k in out:
            raise StrictJSONError(f"duplicate JSON member: {k!r}")
        out[k] = v
    return out


def _validate_string(s: str, where: str) -> None:
    i = 0
    while i < len(s):
        cp = ord(s[i])
        if 0xD800 <= cp <= 0xDBFF:
            if i + 1 >= len(s) or not (0xDC00 <= ord(s[i + 1]) <= 0xDFFF):
                raise StrictJSONError(f"unpaired high surrogate at {where}")
            i += 2
            continue
        if 0xDC00 <= cp <= 0xDFFF:
            raise StrictJSONError(f"unpaired low surrogate at {where}")
        i += 1


def validate_ijson_value(value, where: str = "$") -> None:
    if value is None or isinstance(value, bool):
        return
    if isinstance(value, str):
        _validate_string(value, where)
        return
    if isinstance(value, int) and not isinstance(value, bool):
        if abs(value) > MAX_SAFE_INTEGER:
            raise StrictJSONError(f"integer outside I-JSON interoperable range at {where}: {value}")
        return
    if isinstance(value, float):
        if not math.isfinite(value):
            raise StrictJSONError(f"non-finite number at {where}")
        return
    if isinstance(value, list):
        for i, item in enumerate(value):
            validate_ijson_value(item, f"{where}[{i}]")
        return
    if isinstance(value, dict):
        for k, v in value.items():
            if not isinstance(k, str):
                raise StrictJSONError(f"non-string object key at {where}")
            _validate_string(k, f"{where}.<key>")
            validate_ijson_value(v, f"{where}.{k}")
        return
    raise StrictJSONError(f"unsupported JSON value at {where}: {type(value).__name__}")


def loads_strict(text: str):
    try:
        value = json.loads(text, object_pairs_hook=_pairs_hook, parse_constant=lambda x: (_ for _ in ()).throw(StrictJSONError(f"invalid JSON number constant: {x}")))
    except StrictJSONError:
        raise
    except Exception as e:
        raise StrictJSONError(str(e)) from e
    validate_ijson_value(value)
    return value


def load_strict(path: str | Path):
    p = Path(path)
    return loads_strict(p.read_text(encoding="utf-8"))


def dump_pretty(value, path: str | Path) -> None:
    validate_ijson_value(value)
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
