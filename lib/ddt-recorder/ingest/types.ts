import type { DDTJsonValue } from "../producer/canonical";

export type DDTRecorderSourceType =
  | "HUMAN"
  | "SYSTEM"
  | "DEVICE"
  | "SENSOR"
  | "MODEL"
  | "BLOCKCHAIN_NATIVE"
  | "VERIFIED_EXTERNAL"
  | "ORACLE"
  | "OTHER";

export type DDTRecorderEvidenceRole =
  | "SOURCE_PAYLOAD"
  | "SUPPORTING_EVIDENCE"
  | "SEMANTIC_DEPENDENCY"
  | "POLICY_OR_RULEBOOK"
  | "FRAMEWORK_OR_DEFINITION"
  | "AUTHORITY_EVIDENCE"
  | "IDENTITY_OR_KEY_EVIDENCE"
  | "PROVENANCE_EVIDENCE"
  | "TIME_OR_ORDERING_EVIDENCE"
  | "VALIDATION_ARTIFACT"
  | "PROFILE_DEFINED";

export type DDTRecorderEvidenceBinding =
  | "SEMANTIC_CONTEXT"
  | "ACTOR_AUTHORITY";

export type DDTRecorderEvidenceInput = {
  name: string;
  mediaType: string;
  contentBase64: string;

  role?: DDTRecorderEvidenceRole;
  evidenceClass?: string;
  bindings?: DDTRecorderEvidenceBinding[];
};

export type DDTRecorderInput = {
  recordType: string;

  publisher: {
    name: string;
    identifier?: string;
  };

  subject: {
    reference: string;
  };

  source: {
    type: DDTRecorderSourceType;
    reference: string;
    systemName?: string;
    version?: string;
  };

  eventTime: string;

  actor?: {
    identityRef?: string;
    role?: string;
  };

  description: string;

  payload?: DDTJsonValue;

  evidence: DDTRecorderEvidenceInput[];

  previousDDTNumber?: string;
};

export type DDTIngestedEvidence = {
  name: string;
  mediaType: string;
  bytes: Uint8Array;

  role?: DDTRecorderEvidenceRole;
  evidenceClass?: string;
  bindings?: DDTRecorderEvidenceBinding[];
};

export type DDTIngestedRecord = {
  recordType: string;

  publisher: {
    name: string;
    identifier?: string;
  };

  subject: {
    reference: string;
  };

  source: {
    type: DDTRecorderSourceType;
    reference: string;
    systemName?: string;
    version?: string;
  };

  eventTime: string;

  actor?: {
    identityRef?: string;
    role?: string;
  };

  description: string;

  payload?: DDTJsonValue;

  evidence: DDTIngestedEvidence[];

  previousDDTNumber?: string;
};
