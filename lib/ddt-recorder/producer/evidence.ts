import { createHash } from "crypto";

import type { DDTStructuralDigest } from "../types";
import type { DDTNormalizedRecord } from "../normalize/normalize";

export type DDTProducedEvidenceItem = {
  name: string;
  mediaType: string;
  byteLength: number;
  digest: DDTStructuralDigest;
};

export type DDTProducedEvidenceSet = {
  items: DDTProducedEvidenceItem[];
};

function sha256(bytes: Uint8Array): DDTStructuralDigest {
  return {
    algorithm: "SHA-256",
    value: createHash("sha256").update(bytes).digest("hex"),
  };
}

export function produceEvidenceSet(
  record: DDTNormalizedRecord
): DDTProducedEvidenceSet {
  return {
    items: record.evidence.map((item) => ({
      name: item.name,
      mediaType: item.mediaType,
      byteLength: item.bytes.byteLength,
      digest: sha256(item.bytes),
    })),
  };
}
