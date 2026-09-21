import { randomUUID } from "crypto";

import type { DDTStructuralDigest } from "../types";
import type { DDTIngestedRecord } from "../ingest/types";

export type DDTPreviousRecordContext = {
  ddtNumber: string;
  ddtRecordId: string;
  ddtFamilyId: string;
  subjectNamespace: string;
  recordHash: DDTStructuralDigest;
};

export type DDTNormalizationProfileContext = {
  subjectNamespace: string;
};

export type DDTNormalizedRecord = {
  ddtRecordId: string;
  ddtFamilyId: string;

  subject: {
    namespace: string;
    reference: string;
  };

  recordType: string;

  publisher: {
    name: string;
    identifier?: string;
  };

  source: {
    type: DDTIngestedRecord["source"]["type"];
    reference: string;
    systemName?: string;
    version?: string;
  };

  eventTime: string;

  actor?: DDTIngestedRecord["actor"];

  description: string;

  payload?: DDTIngestedRecord["payload"];

  evidence: DDTIngestedRecord["evidence"];

  previousRecord?: {
    ddtNumber: string;
    ddtRecordId: string;
    recordHash: DDTStructuralDigest;
  };
};

function uuidUrn(): string {
  return `urn:uuid:${randomUUID()}`;
}

export function normalizeRecorderRecord(
  input: DDTIngestedRecord,
  profileContext: DDTNormalizationProfileContext,
  previous?: DDTPreviousRecordContext
): DDTNormalizedRecord {
  const subjectNamespace = profileContext.subjectNamespace.trim();

  if (!subjectNamespace) {
    throw new Error(
      "Enterprise Profile subject namespace is required for normalization."
    );
  }

  if (subjectNamespace.length > 255) {
    throw new Error(
      "Enterprise Profile subject namespace exceeds the Draft.5 maximum length."
    );
  }

  if (input.previousDDTNumber && !previous) {
    throw new Error(
      "previousDDTNumber was supplied but the previous registered DDT Record was not resolved."
    );
  }

  if (
    previous &&
    input.previousDDTNumber &&
    input.previousDDTNumber !== previous.ddtNumber
  ) {
    throw new Error(
      "Resolved previous DDT Record does not match previousDDTNumber."
    );
  }

  if (
    previous &&
    previous.subjectNamespace !== subjectNamespace
  ) {
    throw new Error(
      "Previous DDT Record subject namespace is outside the selected Enterprise Profile namespace."
    );
  }

  const ddtFamilyId = previous?.ddtFamilyId ?? uuidUrn();

  return {
    ddtRecordId: uuidUrn(),
    ddtFamilyId,

    subject: {
      namespace: subjectNamespace,
      reference: input.subject.reference,
    },

    recordType: input.recordType,

    publisher: input.publisher,
    source: input.source,

    eventTime: input.eventTime,

    ...(input.actor
      ? { actor: input.actor }
      : {}),

    description: input.description,

    ...(input.payload !== undefined
      ? { payload: input.payload }
      : {}),

    evidence: input.evidence,

    ...(previous
      ? {
          previousRecord: {
            ddtNumber: previous.ddtNumber,
            ddtRecordId: previous.ddtRecordId,
            recordHash: previous.recordHash,
          },
        }
      : {}),
  };
}
