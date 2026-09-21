import { createHash } from "crypto";

import type { DDTJsonValue } from "../producer/canonical";
import type {
  DDTRecordStore,
  DDTRegisteredRecordBundle,
} from "../storage/recordStore";
import type { DDTStructuralDigest } from "../types";

export type DDTOfflinePackageFileRole =
  | "DDT_RECORD"
  | "CONFORMANCE_RECEIPT"
  | "REGISTRATION_RESULT"
  | "ORIGINAL_EVIDENCE_BYTES";

export type DDTOfflineAssembledFile = {
  path: string;
  mediaType: string;
  role: DDTOfflinePackageFileRole;
  appliesTo: string[];
  bytes: Buffer;
};

export type DDTOfflineFamilyMember = {
  ddtNumber: string;
  ddtRecordId: string;
  ddtFamilyId: string;
  recordHash: DDTStructuralDigest;
  isTarget: boolean;
};

export type DDTOfflinePackageAssembly = {
  target: {
    ddtNumber: string;
    ddtRecordId: string;
    ddtFamilyId: string;
    recordHash: DDTStructuralDigest;
  };

  /**
   * Oldest known member first, target last.
   */
  familyChain: DDTOfflineFamilyMember[];

  files: DDTOfflineAssembledFile[];
};

type PreviousRecordRef = {
  ddtRecordId: string;
  recordHash: DDTStructuralDigest;
};

type EvidenceManifestEntry = {
  evidenceId: string;
  mediaType: string;
  byteLength: number;
  commitment: DDTStructuralDigest;
};

function asObject(
  value: DDTJsonValue | undefined,
  label: string
): Record<string, DDTJsonValue> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} must be an object.`);
  }

  return value;
}

function asArray(
  value: DDTJsonValue | undefined,
  label: string
): DDTJsonValue[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  return value;
}

function asString(
  value: DDTJsonValue | undefined,
  label: string
): string {
  if (
    typeof value !== "string" ||
    value.length === 0
  ) {
    throw new Error(
      `${label} must be a non-empty string.`
    );
  }

  return value;
}

function asDigest(
  value: DDTJsonValue | undefined,
  label: string
): DDTStructuralDigest {
  const object = asObject(
    value,
    label
  );

  const algorithm = asString(
    object.algorithm,
    `${label}.algorithm`
  );

  const digestValue = asString(
    object.value,
    `${label}.value`
  );

  if (algorithm !== "SHA-256") {
    throw new Error(
      `${label}.algorithm must be SHA-256.`
    );
  }

  if (
    !/^[0-9a-f]{64}$/.test(
      digestValue
    )
  ) {
    throw new Error(
      `${label}.value must be a SHA-256 hex digest.`
    );
  }

  return {
    algorithm: "SHA-256",
    value: digestValue,
  };
}

function sameDigest(
  a: DDTStructuralDigest,
  b: DDTStructuralDigest
): boolean {
  return (
    a.algorithm === b.algorithm &&
    a.value === b.value
  );
}

function sha256(
  bytes: Buffer
): DDTStructuralDigest {
  return {
    algorithm: "SHA-256",
    value: createHash("sha256")
      .update(bytes)
      .digest("hex"),
  };
}

function jsonBytes(
  value: DDTJsonValue | object
): Buffer {
  return Buffer.from(
    `${JSON.stringify(
      value,
      null,
      2
    )}\n`,
    "utf8"
  );
}

function safeFileName(
  value: string
): string {
  const base = value
    .replace(/\\/g, "/")
    .split("/")
    .pop() || "evidence.bin";

  const cleaned = base
    .normalize("NFC")
    .replace(
      /[^A-Za-z0-9._-]+/g,
      "_"
    )
    .replace(
      /^[_\.]+|[_\.]+$/g,
      ""
    );

  return (
    cleaned.slice(0, 120) ||
    "evidence.bin"
  );
}

function uniqueStrings(
  values: string[]
): string[] {
  return [
    ...new Set(values),
  ];
}

function previousRecordRef(
  bundle: DDTRegisteredRecordBundle
): PreviousRecordRef | null {
  const envelope = asObject(
    bundle.envelope,
    "envelope"
  );

  const relationships = asObject(
    envelope.relationships,
    "envelope.relationships"
  );

  const previous =
    relationships.previousRecordInFamily;

  if (
    previous === null ||
    previous === undefined
  ) {
    return null;
  }

  const previousObject = asObject(
    previous,
    "envelope.relationships.previousRecordInFamily"
  );

  return {
    ddtRecordId: asString(
      previousObject.ddtRecordId,
      "previousRecordInFamily.ddtRecordId"
    ),

    recordHash: asDigest(
      previousObject.recordHash,
      "previousRecordInFamily.recordHash"
    ),
  };
}

function evidenceManifestEntries(
  bundle: DDTRegisteredRecordBundle
): EvidenceManifestEntry[] {
  const envelope = asObject(
    bundle.envelope,
    "envelope"
  );

  const manifest = asObject(
    envelope.evidenceManifest,
    "envelope.evidenceManifest"
  );

  const entries = asArray(
    manifest.entries,
    "envelope.evidenceManifest.entries"
  );

  return entries.map(
    (
      value,
      index
    ): EvidenceManifestEntry => {
      const entry = asObject(
        value,
        `evidenceManifest.entries[${index}]`
      );

      const representation =
        asObject(
          entry.representation,
          `evidenceManifest.entries[${index}].representation`
        );

      const mode =
        asString(
          representation.mode,
          `evidenceManifest.entries[${index}].representation.mode`
        );

      if (mode !== "RAW_BYTES") {
        throw new Error(
          `evidenceManifest.entries[${index}].representation.mode ` +
          `must be RAW_BYTES for archived original evidence.`
        );
      }

      const byteLength =
        representation.byteLength;

      if (
        typeof byteLength !== "number" ||
        !Number.isSafeInteger(byteLength) ||
        byteLength < 0
      ) {
        throw new Error(
          `evidenceManifest.entries[${index}].representation.byteLength ` +
          `must be a non-negative safe integer.`
        );
      }

      const commitment =
        asObject(
          entry.commitment,
          `evidenceManifest.entries[${index}].commitment`
        );

      const commitmentType =
        asString(
          commitment.commitmentType,
          `evidenceManifest.entries[${index}].commitment.commitmentType`
        );

      if (
        commitmentType !== "DIGEST"
      ) {
        throw new Error(
          `evidenceManifest.entries[${index}].commitment.commitmentType ` +
          `must be DIGEST.`
        );
      }

      const encoding =
        asString(
          commitment.encoding,
          `evidenceManifest.entries[${index}].commitment.encoding`
        );

      if (
        encoding !== "LOWERCASE_HEX"
      ) {
        throw new Error(
          `evidenceManifest.entries[${index}].commitment.encoding ` +
          `must be LOWERCASE_HEX.`
        );
      }

      const digestValue =
        asString(
          commitment.value,
          `evidenceManifest.entries[${index}].commitment.value`
        );

      if (
        !/^[0-9a-f]{64}$/.test(
          digestValue
        )
      ) {
        throw new Error(
          `evidenceManifest.entries[${index}].commitment.value ` +
          `must be a SHA-256 lowercase hex digest.`
        );
      }

      return {
        evidenceId:
          asString(
            entry.evidenceId,
            `evidenceManifest.entries[${index}].evidenceId`
          ),

        mediaType:
          asString(
            entry.mediaType,
            `evidenceManifest.entries[${index}].mediaType`
          ),

        byteLength,

        commitment: {
          algorithm: "SHA-256",
          value: digestValue,
        },
      };
    }
  );
}

function assertBundleIdentity(
  bundle: DDTRegisteredRecordBundle
): void {
  const envelope = asObject(
    bundle.envelope,
    "envelope"
  );

  const identity = asObject(
    envelope.identity,
    "envelope.identity"
  );

  const envelopeRecordId =
    asString(
      identity.ddtRecordId,
      "envelope.identity.ddtRecordId"
    );

  const envelopeFamilyId =
    asString(
      identity.ddtFamilyId,
      "envelope.identity.ddtFamilyId"
    );

  const commitments = asObject(
    envelope.commitments,
    "envelope.commitments"
  );

  const envelopeRecordHash =
    asDigest(
      commitments.recordHash,
      "envelope.commitments.recordHash"
    );

  if (
    envelopeRecordId !==
    bundle.ddtRecordId
  ) {
    throw new Error(
      `${bundle.ddtNumber}: Envelope record ID mismatch.`
    );
  }

  if (
    envelopeFamilyId !==
    bundle.ddtFamilyId
  ) {
    throw new Error(
      `${bundle.ddtNumber}: Envelope family ID mismatch.`
    );
  }

  if (
    !sameDigest(
      envelopeRecordHash,
      bundle.recordHash
    )
  ) {
    throw new Error(
      `${bundle.ddtNumber}: Envelope record hash mismatch.`
    );
  }
}

function addBundleJsonFiles(
  files: DDTOfflineAssembledFile[],
  bundle: DDTRegisteredRecordBundle,
  targetRecordId: string,
  isTarget: boolean
): void {
  const base = isTarget
    ? "record"
    : `relationships/${bundle.ddtNumber}`;

  const appliesTo =
    uniqueStrings([
      targetRecordId,
      bundle.ddtRecordId,
    ]);

  files.push(
    {
      path:
        `${base}/envelope.json`,
      mediaType:
        "application/json",
      role:
        "DDT_RECORD",
      appliesTo,
      bytes:
        jsonBytes(bundle.envelope),
    },
    {
      path:
        `${base}/conformance-receipt.json`,
      mediaType:
        "application/json",
      role:
        "CONFORMANCE_RECEIPT",
      appliesTo,
      bytes:
        jsonBytes(
          bundle.conformanceReceipt
        ),
    },
    {
      path:
        `${base}/registration-result.json`,
      mediaType:
        "application/json",
      role:
        "REGISTRATION_RESULT",
      appliesTo,
      bytes:
        jsonBytes(
          bundle.registrationResult
        ),
    }
  );
}

function addBundleEvidenceFiles(
  files: DDTOfflineAssembledFile[],
  bundle: DDTRegisteredRecordBundle,
  targetRecordId: string,
  isTarget: boolean
): void {
  const entries =
    evidenceManifestEntries(
      bundle
    );

  if (
    entries.length !==
    bundle.evidence.length
  ) {
    throw new Error(
      `${bundle.ddtNumber}: Evidence Manifest contains ` +
      `${entries.length} entries but Record Store contains ` +
      `${bundle.evidence.length} evidence objects.`
    );
  }

  /*
   * Evidence Manifest entries are canonically sorted by evidenceId,
   * while Record Store evidence remains in original source-input order.
   *
   * Therefore these collections MUST NOT be bound by array position.
   * Match each committed Manifest entry to one unused archived Evidence
   * object by its committed byte properties.
   */
  const unmatchedEvidence =
    bundle.evidence.map(
      archived => {
        const bytes =
          Buffer.from(
            archived.contentBase64,
            "base64"
          );

        return {
          archived,
          bytes,
          digest:
            sha256(bytes),
        };
      }
    );

  entries.forEach(
    (
      entry,
      index
    ) => {
      const matchedIndex =
        unmatchedEvidence.findIndex(
          candidate =>
            candidate.bytes.length ===
              entry.byteLength &&
            candidate.archived.mediaType ===
              entry.mediaType &&
            sameDigest(
              candidate.digest,
              entry.commitment
            )
        );

      if (matchedIndex < 0) {
        throw new Error(
          `${bundle.ddtNumber}: Evidence ${entry.evidenceId} ` +
          `has no matching archived Evidence object for its ` +
          `committed digest/mediaType/byteLength.`
        );
      }

      const {
        archived,
        bytes,
      } =
        unmatchedEvidence.splice(
          matchedIndex,
          1
        )[0];

      const prefix =
        isTarget
          ? "evidence"
          : `relationships/${bundle.ddtNumber}/evidence`;

      const ordinal =
        String(index + 1)
          .padStart(
            4,
            "0"
          );

      files.push({
        path:
          `${prefix}/${ordinal}-${safeFileName(
            archived.name
          )}`,

        mediaType:
          archived.mediaType,

        role:
          "ORIGINAL_EVIDENCE_BYTES",

        appliesTo:
          uniqueStrings([
            targetRecordId,
            bundle.ddtRecordId,
            entry.evidenceId,
          ]),

        bytes,
      });
    }
  );

  if (
    unmatchedEvidence.length !== 0
  ) {
    throw new Error(
      `${bundle.ddtNumber}: Record Store contains unmatched archived Evidence objects.`
    );
  }
}

async function resolveFamilyChain(
  recordStore: DDTRecordStore,
  target: DDTRegisteredRecordBundle,
  maxFamilyDepth: number
): Promise<
  DDTRegisteredRecordBundle[]
> {
  const newestToOldest:
    DDTRegisteredRecordBundle[] = [];

  const seenRecordIds =
    new Set<string>();

  let current:
    DDTRegisteredRecordBundle | null =
      target;

  while (current) {
    assertBundleIdentity(
      current
    );

    if (
      seenRecordIds.has(
        current.ddtRecordId
      )
    ) {
      throw new Error(
        `Family relationship cycle detected at ${current.ddtRecordId}.`
      );
    }

    seenRecordIds.add(
      current.ddtRecordId
    );

    newestToOldest.push(
      current
    );

    if (
      newestToOldest.length >
      maxFamilyDepth
    ) {
      throw new Error(
        `Family chain exceeds maximum depth ${maxFamilyDepth}.`
      );
    }

    const previous =
      previousRecordRef(
        current
      );

    if (!previous) {
      break;
    }

    const predecessor =
      await recordStore.getByRecordId(
        previous.ddtRecordId
      );

    if (!predecessor) {
      throw new Error(
        `${current.ddtNumber}: predecessor ` +
        `${previous.ddtRecordId} is not available in Record Store.`
      );
    }

    if (
      predecessor.ddtFamilyId !==
      target.ddtFamilyId
    ) {
      throw new Error(
        `${current.ddtNumber}: predecessor belongs to a different DDT family.`
      );
    }

    if (
      predecessor.subjectNamespace !==
      target.subjectNamespace
    ) {
      throw new Error(
        `${current.ddtNumber}: predecessor subject namespace mismatch.`
      );
    }

    if (
      !sameDigest(
        predecessor.recordHash,
        previous.recordHash
      )
    ) {
      throw new Error(
        `${current.ddtNumber}: previousRecordInFamily hash ` +
        `does not match predecessor Record Store bundle.`
      );
    }

    current =
      predecessor;
  }

  return newestToOldest.reverse();
}

export async function assembleOfflinePackageFromRecordStore(
  options: {
    recordStore: DDTRecordStore;
    ddtNumber: string;
    maxFamilyDepth?: number;
  }
): Promise<DDTOfflinePackageAssembly> {
  const {
    recordStore,
    ddtNumber,
  } = options;

  if (
    !/^DDT-[0-9]{8}$/.test(
      ddtNumber
    )
  ) {
    throw new Error(
      "ddtNumber must match DDT-[0-9]{8}."
    );
  }

  const target =
    await recordStore.getByDDTNumber(
      ddtNumber
    );

  if (!target) {
    throw new Error(
      `DDT Record not found: ${ddtNumber}`
    );
  }

  const chain =
    await resolveFamilyChain(
      recordStore,
      target,
      options.maxFamilyDepth ?? 256
    );

  const files:
    DDTOfflineAssembledFile[] = [];

  for (
    const bundle of chain
  ) {
    const isTarget =
      bundle.ddtRecordId ===
      target.ddtRecordId;

    addBundleJsonFiles(
      files,
      bundle,
      target.ddtRecordId,
      isTarget
    );

    addBundleEvidenceFiles(
      files,
      bundle,
      target.ddtRecordId,
      isTarget
    );
  }

  files.sort(
    (
      a,
      b
    ) =>
      a.path.localeCompare(
        b.path,
        "en"
      )
  );

  const duplicatePaths =
    files
      .map(
        (file) =>
          file.path
      )
      .filter(
        (
          value,
          index,
          all
        ) =>
          all.indexOf(
            value
          ) !== index
      );

  if (
    duplicatePaths.length > 0
  ) {
    throw new Error(
      `Offline package assembly produced duplicate paths: ` +
      `${[
        ...new Set(
          duplicatePaths
        ),
      ].join(", ")}`
    );
  }

  return {
    target: {
      ddtNumber:
        target.ddtNumber,

      ddtRecordId:
        target.ddtRecordId,

      ddtFamilyId:
        target.ddtFamilyId,

      recordHash:
        target.recordHash,
    },

    familyChain:
      chain.map(
        (bundle) => ({
          ddtNumber:
            bundle.ddtNumber,

          ddtRecordId:
            bundle.ddtRecordId,

          ddtFamilyId:
            bundle.ddtFamilyId,

          recordHash:
            bundle.recordHash,

          isTarget:
            bundle.ddtRecordId ===
            target.ddtRecordId,
        })
      ),

    files,
  };
}
