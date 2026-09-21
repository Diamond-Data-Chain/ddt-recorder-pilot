from __future__ import annotations
from pathlib import Path
import json
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012
from .strict_json import load_strict
from .errors import SchemaValidationError


class LocalSchemaStore:
    def __init__(self, ddt_root: str | Path):
        self.ddt_root = Path(ddt_root)
        self.schemas_dir = self.ddt_root / "schemas"
        self.by_id = {}
        self.by_path = {}
        self.registry = Registry()
        self._load()

    def _load(self):
        if not self.schemas_dir.is_dir():
            raise SchemaValidationError(f"schema directory not found: {self.schemas_dir}")
        for p in sorted(self.schemas_dir.glob("*.json")):
            doc = load_strict(p)
            if not isinstance(doc, dict) or "$id" not in doc:
                continue
            sid = doc["$id"]
            if sid in self.by_id and self.by_id[sid] != doc:
                raise SchemaValidationError(f"duplicate schema $id with different bytes/content: {sid}")
            self.by_id[sid] = doc
            self.by_path[p.name] = doc
            try:
                resource = Resource.from_contents(doc, default_specification=DRAFT202012)
                self.registry = self.registry.with_resource(sid, resource)
            except Exception as e:
                raise SchemaValidationError(f"cannot register schema {p}: {e}") from e

    def schema_by_filename(self, filename: str):
        try:
            return self.by_path[filename]
        except KeyError as e:
            raise SchemaValidationError(f"schema not found locally: {filename}") from e

    def validate(self, instance, schema_filename: str):
        schema = self.schema_by_filename(schema_filename)
        validator = Draft202012Validator(schema, registry=self.registry, format_checker=FormatChecker())
        errors = sorted(validator.iter_errors(instance), key=lambda e: list(e.absolute_path))
        if errors:
            parts = []
            for e in errors[:20]:
                path = "$" + "".join(f"[{i}]" if isinstance(i, int) else f".{i}" for i in e.absolute_path)
                parts.append(f"{path}: {e.message}")
            if len(errors) > 20:
                parts.append(f"... {len(errors)-20} more errors")
            raise SchemaValidationError("; ".join(parts))
        return True

    def lint_all(self):
        """Check Draft 2020-12 schema syntax and ensure every external $ref is locally resolvable."""
        from urllib.parse import urldefrag
        problems = []
        def walk(v, source):
            if isinstance(v, dict):
                r = v.get("$ref")
                if isinstance(r, str) and not r.startswith("#"):
                    base, _ = urldefrag(r)
                    if base and base not in self.by_id:
                        problems.append(f"{source}: unresolved external $ref {r}")
                for x in v.values(): walk(x, source)
            elif isinstance(v, list):
                for x in v: walk(x, source)
        for name, schema in self.by_path.items():
            try:
                Draft202012Validator.check_schema(schema)
            except Exception as e:
                problems.append(f"{name}: invalid schema: {e}")
            walk(schema, name)
        if problems:
            raise SchemaValidationError("; ".join(problems[:50]))
        return {"schemas": len(self.by_path), "externalRefs": "LOCAL_ONLY_PASS"}
