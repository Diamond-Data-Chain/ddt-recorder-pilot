import type {
  DDTJsonValue,
} from "../producer/canonical";
import type {
  DDTRegisteredRecordBundle,
} from "../storage/recordStore";

export type DDTRawExactMatch = {
  matchType: "RAW_EXACT";
  ddtNumber: string;
  ddtRecordId: string;
  registrationTime: string;
  digest: string;
};

function asObject(
  value: DDTJsonValue,
): { [key: string]: DDTJsonValue } | null {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value;
}

function sourcePayloadDigest(
  bundle: DDTRegisteredRecordBundle,
): string | null {
  const envelope =
    asObject(bundle.envelope);

  if (!envelope) {
    return null;
  }

  const manifest =
    asObject(envelope.evidenceManifest);

  if (!manifest) {
    return null;
  }

  const entries = manifest.entries;

  if (!Array.isArray(entries)) {
    return null;
  }

  for (const value of entries) {
    const entry = asObject(value);

    if (
      !entry ||
      entry.role !== "SOURCE_PAYLOAD" ||
      entry.evidenceClass !== "document.upload"
    ) {
      continue;
    }

    const representation =
      asObject(entry.representation);

    const commitment =
      asObject(entry.commitment);

    if (
      !representation ||
      representation.mode !== "RAW_BYTES" ||
      !commitment ||
      commitment.commitmentType !== "DIGEST" ||
      commitment.encoding !== "LOWERCASE_HEX" ||
      typeof commitment.value !== "string" ||
      !/^[0-9a-f]{64}$/.test(commitment.value)
    ) {
      continue;
    }

    return commitment.value;
  }

  return null;
}

export function findEarliestRawExactMatch(
  bundles: DDTRegisteredRecordBundle[],
  digest: string,
): DDTRawExactMatch | null {
  const matches = bundles
    .filter(
      (bundle) =>
        sourcePayloadDigest(bundle) === digest,
    )
    .sort(
      (a, b) =>
        a.storedAt.localeCompare(b.storedAt),
    );

  const earliest = matches[0];

  if (!earliest) {
    return null;
  }

  return {
    matchType: "RAW_EXACT",
    ddtNumber: earliest.ddtNumber,
    ddtRecordId: earliest.ddtRecordId,
    registrationTime: earliest.storedAt,
    digest,
  };
}

import { createHash } from "crypto";

import {
  normalizeDDTContent,
} from "./contentNormalization";

import {
  extractPdfText,
  extractDocxText,
  extractJsonText,
  extractPlainText,
} from "./documentTextExtraction";

export type DDTContentExactMatch = {
  matchType: "CONTENT_EXACT";
  ddtNumber: string;
  ddtRecordId: string;
  registrationTime: string;
  digest: string;
};

function sha256Hex(
  bytes: Buffer
): string {
  return createHash("sha256")
    .update(bytes)
    .digest("hex");
}

function contentDigest(
  text: string
): string {
  return sha256Hex(
    Buffer.from(
      normalizeDDTContent(text),
      "utf8"
    )
  );
}

async function extractArchivedText(
  mediaType: string,
  name: string,
  bytes: Buffer
): Promise<string | null> {
  const lowerName =
    name.toLowerCase();

  if (
    mediaType === "application/pdf" ||
    lowerName.endsWith(".pdf")
  ) {
    return extractPdfText(bytes);
  }

  if (
    mediaType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    return extractDocxText(bytes);
  }

  if (
    mediaType === "application/json" ||
    lowerName.endsWith(".json")
  ) {
    return extractJsonText(bytes);
  }

  if (
    mediaType.startsWith("text/") ||
    /\.(txt|md|markdown|csv|log)$/.test(
      lowerName
    )
  ) {
    return extractPlainText(bytes);
  }

  return null;
}

async function sourcePayloadContentDigest(
  bundle: DDTRegisteredRecordBundle,
): Promise<string | null> {
  const rawDigest =
    sourcePayloadDigest(bundle);

  if (!rawDigest) {
    return null;
  }

  const envelope =
    asObject(bundle.envelope);

  const manifest =
    envelope
      ? asObject(
          envelope.evidenceManifest
        )
      : null;

  const entries =
    manifest?.entries;

  if (!Array.isArray(entries)) {
    return null;
  }

  const sourceEntry =
    entries.find((value) => {
      const entry =
        asObject(value);

      return (
        entry?.role ===
          "SOURCE_PAYLOAD" &&
        entry?.evidenceClass ===
          "document.upload"
      );
    });

  const entry =
    sourceEntry
      ? asObject(sourceEntry)
      : null;

  const representation =
    entry
      ? asObject(
          entry.representation
        )
      : null;

  if (
    !entry ||
    !representation ||
    typeof representation.byteLength !==
      "number" ||
    typeof entry.mediaType !==
      "string"
  ) {
    return null;
  }

  for (
    const archived
    of bundle.evidence
  ) {
    let bytes: Buffer;

    try {
      bytes =
        Buffer.from(
          archived.contentBase64,
          "base64"
        );
    } catch {
      continue;
    }

    if (
      bytes.length !==
        representation.byteLength ||
      archived.mediaType !==
        entry.mediaType ||
      sha256Hex(bytes) !==
        rawDigest
    ) {
      continue;
    }

    try {
      const text =
        await extractArchivedText(
          archived.mediaType,
          archived.name,
          bytes
        );

      if (
        text === null ||
        !text.trim()
      ) {
        return null;
      }

      return contentDigest(text);
    } catch {
      return null;
    }
  }

  return null;
}

export async function findEarliestContentExactMatch(
  bundles: DDTRegisteredRecordBundle[],
  extractedText: string,
): Promise<DDTContentExactMatch | null> {
  const digest =
    contentDigest(
      extractedText
    );

  const matches:
    DDTRegisteredRecordBundle[] =
      [];

  for (const bundle of bundles) {
    const priorDigest =
      await sourcePayloadContentDigest(
        bundle
      );

    if (
      priorDigest === digest
    ) {
      matches.push(bundle);
    }
  }

  matches.sort(
    (a, b) =>
      a.storedAt.localeCompare(
        b.storedAt
      )
  );

  const earliest =
    matches[0];

  if (!earliest) {
    return null;
  }

  return {
    matchType: "CONTENT_EXACT",
    ddtNumber:
      earliest.ddtNumber,
    ddtRecordId:
      earliest.ddtRecordId,
    registrationTime:
      earliest.storedAt,
    digest,
  };
}
