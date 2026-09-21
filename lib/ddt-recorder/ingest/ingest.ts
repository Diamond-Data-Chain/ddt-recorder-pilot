import type {
  DDTIngestedRecord,
  DDTIngestedEvidence,
  DDTRecorderEvidenceBinding,
  DDTRecorderEvidenceInput,
  DDTRecorderEvidenceRole,
  DDTRecorderInput,
  DDTRecorderSourceType,
} from "./types";

const MAX_EVIDENCE_ITEMS = 20;
const MAX_EVIDENCE_BYTES_PER_ITEM = 5 * 1024 * 1024;
const MAX_EVIDENCE_BASE64_CHARS =
  4 * Math.ceil(MAX_EVIDENCE_BYTES_PER_ITEM / 3);

const ALLOWED_EVIDENCE_ROLES =
  new Set<DDTRecorderEvidenceRole>([
    "SOURCE_PAYLOAD",
    "SUPPORTING_EVIDENCE",
    "SEMANTIC_DEPENDENCY",
    "POLICY_OR_RULEBOOK",
    "FRAMEWORK_OR_DEFINITION",
    "AUTHORITY_EVIDENCE",
    "IDENTITY_OR_KEY_EVIDENCE",
    "PROVENANCE_EVIDENCE",
    "TIME_OR_ORDERING_EVIDENCE",
    "VALIDATION_ARTIFACT",
    "PROFILE_DEFINED",
  ]);

const ALLOWED_EVIDENCE_BINDINGS =
  new Set<DDTRecorderEvidenceBinding>([
    "SEMANTIC_CONTEXT",
    "ACTOR_AUTHORITY",
  ]);

const ALLOWED_SOURCE_TYPES = new Set<DDTRecorderSourceType>([
  "HUMAN",
  "SYSTEM",
  "DEVICE",
  "SENSOR",
  "MODEL",
  "BLOCKCHAIN_NATIVE",
  "VERIFIED_EXTERNAL",
  "ORACLE",
  "OTHER",
]);

function validateSourceType(value: unknown): DDTRecorderSourceType {
  if (
    typeof value !== "string" ||
    !ALLOWED_SOURCE_TYPES.has(value as DDTRecorderSourceType)
  ) {
    throw new Error(
      "source.type must be one of: HUMAN, SYSTEM, DEVICE, SENSOR, MODEL, BLOCKCHAIN_NATIVE, VERIFIED_EXTERNAL, ORACLE, OTHER."
    );
  }

  return value as DDTRecorderSourceType;
}

function requireText(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${field} is required.`);
  }

  return normalized;
}

function validateEventTime(value: string): string {
  const normalized = requireText(value, "eventTime");
  const parsed = Date.parse(normalized);

  if (Number.isNaN(parsed)) {
    throw new Error("eventTime must be a valid date-time.");
  }

  return new Date(parsed).toISOString();
}

function decodeEvidence(
  evidence: DDTRecorderEvidenceInput
): DDTIngestedEvidence {
  const name = requireText(evidence.name, "evidence.name");
  const mediaType = requireText(
    evidence.mediaType,
    "evidence.mediaType"
  );

  if (
    typeof evidence.contentBase64 !== "string" ||
    evidence.contentBase64.length === 0
  ) {
    throw new Error(`Evidence ${name} has no content.`);
  }

  const base64 = evidence.contentBase64;

  if (base64.length > MAX_EVIDENCE_BASE64_CHARS) {
    throw new Error(
      `Evidence ${name} exceeds the encoded demo input limit.`
    );
  }

  // Strict RFC 4648 standard Base64.
  // Reject whitespace, malformed padding, non-alphabet characters,
  // truncated quartets and non-canonical encodings before Buffer.from().
  const canonicalBase64 =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

  if (
    base64.length % 4 !== 0 ||
    !canonicalBase64.test(base64)
  ) {
    throw new Error(
      `Evidence ${name} contentBase64 is not valid canonical Base64.`
    );
  }

  const buffer = Buffer.from(base64, "base64");

  if (
    buffer.length === 0 ||
    buffer.toString("base64") !== base64
  ) {
    throw new Error(
      `Evidence ${name} contentBase64 is not valid canonical Base64.`
    );
  }

  if (buffer.length > MAX_EVIDENCE_BYTES_PER_ITEM) {
    throw new Error(
      `Evidence ${name} exceeds the ${MAX_EVIDENCE_BYTES_PER_ITEM} byte demo limit.`
    );
  }

  let role: DDTRecorderEvidenceRole | undefined;

  if (evidence.role !== undefined) {
    if (
      typeof evidence.role !== "string" ||
      !ALLOWED_EVIDENCE_ROLES.has(
        evidence.role as DDTRecorderEvidenceRole
      )
    ) {
      throw new Error(
        `Evidence ${name} has an unsupported role.`
      );
    }

    role = evidence.role as DDTRecorderEvidenceRole;
  }

  let evidenceClass: string | undefined;

  if (evidence.evidenceClass !== undefined) {
    if (typeof evidence.evidenceClass !== "string") {
      throw new Error(
        `Evidence ${name} evidenceClass must be text.`
      );
    }

    evidenceClass = requireText(
      evidence.evidenceClass,
      `Evidence ${name} evidenceClass`
    );
  }

  let bindings: DDTRecorderEvidenceBinding[] | undefined;

  if (evidence.bindings !== undefined) {
    if (!Array.isArray(evidence.bindings)) {
      throw new Error(
        `Evidence ${name} bindings must be an array.`
      );
    }

    const normalizedBindings =
      evidence.bindings.map((binding) => {
        if (
          typeof binding !== "string" ||
          !ALLOWED_EVIDENCE_BINDINGS.has(
            binding as DDTRecorderEvidenceBinding
          )
        ) {
          throw new Error(
            `Evidence ${name} has an unsupported binding.`
          );
        }

        return binding as DDTRecorderEvidenceBinding;
      });

    if (
      new Set(normalizedBindings).size !==
      normalizedBindings.length
    ) {
      throw new Error(
        `Evidence ${name} contains duplicate bindings.`
      );
    }

    if (normalizedBindings.length > 0) {
      bindings = normalizedBindings;
    }
  }

  return {
    name,
    mediaType,
    bytes: new Uint8Array(buffer),

    ...(role ? { role } : {}),
    ...(evidenceClass ? { evidenceClass } : {}),
    ...(bindings ? { bindings } : {}),
  };
}

export function ingestRecorderInput(
  input: DDTRecorderInput
): DDTIngestedRecord {
  const recordType = requireText(input.recordType, "recordType");

  const publisherName = requireText(
    input.publisher.name,
    "publisher.name"
  );

  const subjectReference = requireText(
    input.subject.reference,
    "subject.reference"
  );

  const sourceReference = requireText(
    input.source.reference,
    "source.reference"
  );

  const description = requireText(
    input.description,
    "description"
  );

  let actor:
    | {
        identityRef?: string;
        role?: string;
      }
    | undefined;

  if (input.actor !== undefined) {
    if (
      input.actor === null ||
      typeof input.actor !== "object"
    ) {
      throw new Error("actor must be an object.");
    }

    const identityRef =
      typeof input.actor.identityRef === "string"
        ? input.actor.identityRef.trim()
        : "";

    const actorRole =
      typeof input.actor.role === "string"
        ? input.actor.role.trim()
        : "";

    if (!identityRef && !actorRole) {
      throw new Error(
        "actor requires identityRef and/or role."
      );
    }

    actor = {
      ...(identityRef ? { identityRef } : {}),
      ...(actorRole ? { role: actorRole } : {}),
    };
  }

  if (!Array.isArray(input.evidence)) {
    throw new Error("evidence must be an array.");
  }

  if (input.evidence.length < 1) {
    throw new Error(
      "The Reference Recorder baseline requires at least one evidence item."
    );
  }

  if (input.evidence.length > MAX_EVIDENCE_ITEMS) {
    throw new Error(
      `A Recorder submission may contain at most ${MAX_EVIDENCE_ITEMS} evidence items.`
    );
  }

  const decodedEvidence =
    input.evidence.map(decodeEvidence);

  if (
    decodedEvidence.some((item) =>
      item.bindings?.includes("ACTOR_AUTHORITY")
    ) &&
    !actor
  ) {
    throw new Error(
      "ACTOR_AUTHORITY evidence requires actor identity and/or role."
    );
  }

  return {
    recordType,
    publisher: {
      name: publisherName,
      ...(input.publisher.identifier?.trim()
        ? { identifier: input.publisher.identifier.trim() }
        : {}),
    },
    subject: {
      reference: subjectReference,
    },
    source: {
      type: validateSourceType(input.source.type),
      reference: sourceReference,
      ...(input.source.systemName?.trim()
        ? { systemName: input.source.systemName.trim() }
        : {}),
      ...(input.source.version?.trim()
        ? { version: input.source.version.trim() }
        : {}),
    },

    eventTime: validateEventTime(input.eventTime),

    ...(actor ? { actor } : {}),

    description,

    ...(input.payload !== undefined
      ? { payload: input.payload }
      : {}),

    evidence: decodedEvidence,
    ...(input.previousDDTNumber?.trim()
      ? { previousDDTNumber: input.previousDDTNumber.trim() }
      : {}),
  };
}
