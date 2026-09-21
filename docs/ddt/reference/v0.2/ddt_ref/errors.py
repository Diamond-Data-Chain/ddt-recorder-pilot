class DDTError(Exception):
    """Base error for the DDT reference implementation."""

class StrictJSONError(DDTError):
    pass

class CanonicalizationError(DDTError):
    pass

class SchemaValidationError(DDTError):
    pass

class VerificationError(DDTError):
    pass

class OfflinePackageError(DDTError):
    pass
