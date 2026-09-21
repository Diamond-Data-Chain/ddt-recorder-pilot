from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class RegistrationResultIssue:
    code: str
    message: str


def validate_registration_result_semantics(
    result: dict[str, Any],
) -> list[RegistrationResultIssue]:
    """
    Semantic checks that cannot be expressed reliably by JSON Schema alone.

    JSON Schema validation MUST run separately before this function.
    """
    issues: list[RegistrationResultIssue] = []

    sequence = result.get("registrationSequence")
    ddt_number = result.get("ddtNumber")

    if isinstance(sequence, int) and isinstance(ddt_number, str):
        if ddt_number.startswith("DDT-"):
            numeric_part = ddt_number[4:]

            if numeric_part.isdigit():
                if int(numeric_part) != sequence:
                    issues.append(
                        RegistrationResultIssue(
                            code="DDT_NUMBER_SEQUENCE_MISMATCH",
                            message=(
                                f"ddtNumber {ddt_number!r} resolves to "
                                f"{int(numeric_part)}, but registrationSequence "
                                f"is {sequence}."
                            ),
                        )
                    )

    record_id = result.get("ddtRecordId")
    record_hash = result.get("recordHash")
    statement_hash = result.get("registrationStatementHash")

    if (
        isinstance(record_hash, dict)
        and isinstance(statement_hash, dict)
        and record_hash.get("value") == statement_hash.get("value")
    ):
        issues.append(
            RegistrationResultIssue(
                code="RECORD_AND_STATEMENT_HASH_COLLISION",
                message=(
                    "recordHash and registrationStatementHash unexpectedly "
                    "contain the same digest value."
                ),
            )
        )

    if not record_id:
        issues.append(
            RegistrationResultIssue(
                code="DDT_RECORD_ID_MISSING",
                message="ddtRecordId is required for registration binding.",
            )
        )

    return issues
