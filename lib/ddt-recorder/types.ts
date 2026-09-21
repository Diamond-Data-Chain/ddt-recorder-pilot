export type DDTStructuralDigest = {
  algorithm: "SHA-256";
  value: string;
};

export type DDTRegistrationStatus =
  | "PREPARED"
  | "VERIFICATION_PENDING"
  | "VERIFICATION_FAILED"
  | "READY_FOR_REGISTRATION"
  | "REGISTERED";

export type DDTVerificationDisposition =
  | "PASS"
  | "FAIL"
  | "REVIEW"
  | "UNRESOLVED";

export type DDTRegistrarIdentity = {
  registrarId: string;
  mechanism: string;
};

export type DDTRegistrationResult = {
  specification: {
    standard: "DDT-REGISTRATION-RESULT";
    version: "0.1.0-draft.1";
  };
  resultId: string;
  sequenceDomain: string;
  registrationSequence: number;
  ddtNumber: string;
  ddtRecordId: string;
  recordHash: DDTStructuralDigest;
  registrationStatementHash: DDTStructuralDigest;
  registrar: DDTRegistrarIdentity;
  registrationTimeClaim: string;
  mechanismEvidenceRefs: string[];
};

export type DDTRegistrationRequest = {
  ddtRecordId: string;
  recordHash: DDTStructuralDigest;
  registrationStatementHash: DDTStructuralDigest;
  verificationDisposition: DDTVerificationDisposition;
};

export type DDTStoredRegistration = {
  status: "REGISTERED";
  result: DDTRegistrationResult;
  storedAt: string;
};
