import type { DDTNormalizedRecord } from "../normalize/normalize";
import type { DDTStructuralDigest } from "../types";
import type { DDTJsonValue } from "./canonical";
import {
  evidenceIdsFor,
  produceEvidenceManifest,
  type DDTArtifactReference,
  type DDTEvidenceManifest,
  type DDTEvidenceManifestPolicyContext,
} from "./evidenceManifest";
import {
  produceDraft5Identity,
  produceDraft5Upstream,
  type DDTDraft5Identity,
  type DDTDraft5Upstream,
} from "./identityUpstream";
import {
  computeEnvelopeCommitments,
  computeRegistrationStatementHash,
  type DDTEnvelopeCommitments,
} from "./envelopeCommitments";

const DRAFT5_SPECIFICATION = {
  standard: "DDT-RECORD-ENVELOPE",
  version: "0.3.0-draft.5",
} as const;

export type DDTDraft5Relationships = {
  previousRecordInFamily?: {
    ddtRecordId: string;
    recordHash: DDTStructuralDigest;
  };
  relatedRecords: [];
};

export type DDTPreparedDraft5Record = {
  specification: typeof DRAFT5_SPECIFICATION;
  identity: DDTDraft5Identity;
  upstream: DDTDraft5Upstream;
  evidenceManifest: DDTEvidenceManifest;
  preservationContract: DDTJsonValue;
  relationships: DDTDraft5Relationships;
  commitments: DDTEnvelopeCommitments;
};

export type DDTRegistrant = {
  identityRef: string;
  identityType:
    | "PERSON"
    | "ORGANIZATION"
    | "ORGANIZATION_SERVICE"
    | "DEVICE"
    | "SYSTEM"
    | "OTHER";
  authorityEvidenceRefs?: string[];
};

export type DDTRegistrationMechanism = {
  profile: DDTArtifactReference;
  network?: string;
  transactionRef?: string;
  blockRef?: string;
};

export type DDTFinalizeDraft5Input = {
  conformanceReceiptCommitment: DDTStructuralDigest;
  registrant: DDTRegistrant;
  registrationMechanism: DDTRegistrationMechanism;
  signatureProofs: DDTJsonValue[];
  timeProofs?: DDTJsonValue[];
  registrationTimeClaim?: string;
};

export function prepareDraft5RecordCore(
  record: DDTNormalizedRecord,
  evidencePolicy: DDTEvidenceManifestPolicyContext,
  preservationContract: DDTJsonValue
): DDTPreparedDraft5Record {
  const identity = produceDraft5Identity(record);

  const evidenceManifest =
    produceEvidenceManifest(
      record,
      evidencePolicy
    );

  const evidenceIds =
    evidenceIdsFor(
      record,
      evidencePolicy
    );

  const semanticContextRefs =
    evidenceIds.filter(
      (_, index) =>
        record.evidence[index]
          .bindings
          ?.includes("SEMANTIC_CONTEXT")
    );

  const authorityEvidenceRefs =
    evidenceIds.filter(
      (_, index) =>
        record.evidence[index]
          .bindings
          ?.includes("ACTOR_AUTHORITY")
    );

  const upstream =
    produceDraft5Upstream(
      record,
      {
        semanticContextRefs,
        authorityEvidenceRefs,
      }
    );

  const relationships: DDTDraft5Relationships = record.previousRecord
    ? {
        previousRecordInFamily: {
          ddtRecordId: record.previousRecord.ddtRecordId,
          recordHash: record.previousRecord.recordHash,
        },
        relatedRecords: [],
      }
    : { relatedRecords: [] };

  const commitments = computeEnvelopeCommitments({
    specification: DRAFT5_SPECIFICATION,
    identity: identity as unknown as DDTJsonValue,
    upstream: upstream as unknown as DDTJsonValue,
    evidenceManifest: evidenceManifest as unknown as DDTJsonValue,
    preservationContract,
    relationships: relationships as unknown as DDTJsonValue,
  });

  return {
    specification: DRAFT5_SPECIFICATION,
    identity,
    upstream,
    evidenceManifest,
    preservationContract,
    relationships,
    commitments,
  };
}

export type DDTPrepareDraft5RegistrationInput = Omit<
  DDTFinalizeDraft5Input,
  "signatureProofs"
>;

export function prepareDraft5EnvelopeForSigning(
  prepared: DDTPreparedDraft5Record,
  input: DDTPrepareDraft5RegistrationInput
) {
  const statement = {
    recordHash: prepared.commitments.recordHash,
    preservationContractCommitment:
      prepared.commitments.preservationContractCommitment,
    conformanceReceiptCommitment: input.conformanceReceiptCommitment,
    registrant: input.registrant,
    ...(input.registrationTimeClaim
      ? { registrationTimeClaim: input.registrationTimeClaim }
      : {}),
    registrationMechanism: input.registrationMechanism,
  };

  const registrationStatementHash = computeRegistrationStatementHash(
    statement as unknown as DDTJsonValue
  );

  return {
    ...prepared,
    registration: {
      statement,
      registrationStatementHash,
      signatureProofs: [] as DDTJsonValue[],
      timeProofs: input.timeProofs ?? [],
    },
  };
}

export function finalizeDraft5Envelope(
  prepared: DDTPreparedDraft5Record,
  input: DDTFinalizeDraft5Input
) {
  if (input.signatureProofs.length === 0) {
    throw new Error(
      "Draft.5 registration requires at least one DDT registration signature proof."
    );
  }

  const unsigned = prepareDraft5EnvelopeForSigning(prepared, {
    conformanceReceiptCommitment: input.conformanceReceiptCommitment,
    registrant: input.registrant,
    registrationMechanism: input.registrationMechanism,
    timeProofs: input.timeProofs,
    registrationTimeClaim: input.registrationTimeClaim,
  });

  return {
    ...unsigned,
    registration: {
      ...unsigned.registration,
      signatureProofs: input.signatureProofs,
    },
  };
}
