import type { DDTNormalizedRecord } from "../normalize/normalize";
import type { DDTJsonValue } from "./canonical";

export type DDTDraft5Identity = {
  ddtRecordId: string;
  ddtFamilyId: string;
  subject: {
    namespace: string;
    reference: string;
  };
  recordType: string;
};

export type DDTDraft5UpstreamBindings = {
  authorityEvidenceRefs?: string[];
  semanticContextRefs?: string[];
};

export type DDTDraft5Upstream = {
  source: {
    sourceId: string;
    sourceType: DDTNormalizedRecord["source"]["type"];
    sourceVersion?: string;
    sourceRecordId?: string;
  };

  event: {
    eventType: string;

    eventTime: {
      value: string;
      basis: "SOURCE_ASSERTED";
      sourceRef: string;
    };

    actor?: {
      identityRef?: string;
      role?: string;
      authorityEvidenceRefs?: string[];
    };

    semanticContextRefs?: string[];
  };

  payload: {
    mode: "EMBEDDED_JSON";
    mediaType: "application/json";
    content: DDTJsonValue;
  };
};

export function produceDraft5Identity(
  record: DDTNormalizedRecord
): DDTDraft5Identity {
  return {
    ddtRecordId: record.ddtRecordId,
    ddtFamilyId: record.ddtFamilyId,
    subject: {
      namespace: record.subject.namespace,
      reference: record.subject.reference,
    },
    recordType: record.recordType,
  };
}

export function produceDraft5Upstream(
  record: DDTNormalizedRecord,
  bindings: DDTDraft5UpstreamBindings = {}
): DDTDraft5Upstream {
  const systemName = record.source.systemName?.trim();

  const source =
    systemName
      ? {
          sourceId: systemName,
          sourceType: record.source.type,
          ...(record.source.version
            ? { sourceVersion: record.source.version }
            : {}),
          sourceRecordId: record.source.reference,
        }
      : {
          sourceId: record.source.reference,
          sourceType: record.source.type,
          ...(record.source.version
            ? { sourceVersion: record.source.version }
            : {}),
        };

  return {
    source,
    event: {
      eventType: record.recordType,

      eventTime: {
        value: record.eventTime,
        basis: "SOURCE_ASSERTED",
        sourceRef: record.source.reference,
      },

      ...(record.actor ||
      (bindings.authorityEvidenceRefs?.length ?? 0) > 0
        ? {
            actor: {
              ...(record.actor?.identityRef
                ? {
                    identityRef:
                      record.actor.identityRef,
                  }
                : {}),

              ...(record.actor?.role
                ? { role: record.actor.role }
                : {}),

              ...(bindings.authorityEvidenceRefs?.length
                ? {
                    authorityEvidenceRefs:
                      [...bindings.authorityEvidenceRefs],
                  }
                : {}),
            },
          }
        : {}),

      ...(bindings.semanticContextRefs?.length
        ? {
            semanticContextRefs:
              [...bindings.semanticContextRefs],
          }
        : {}),
    },

    payload: {
      mode: "EMBEDDED_JSON",
      mediaType: "application/json",

      content: {
        publisher: {
          name: record.publisher.name,
          ...(record.publisher.identifier
            ? { identifier: record.publisher.identifier }
            : {}),
        },

        description: record.description,

        ...(record.payload !== undefined
          ? { data: record.payload }
          : {}),
      },
    },
  };
}
