import {
  createHash,
  createPrivateKey,
  sign as cryptoSign,
} from "crypto";
import { promises as fs } from "fs";
import path from "path";

import {
  canonicalizeJcs,
  type DDTJsonValue,
} from "../producer/canonical";
import type { DDTArtifactReference } from "../producer/evidenceManifest";
import type { DDTStructuralDigest } from "../types";

const SIGNATURE_DOMAIN = "DDT_SIGNATURE_PROOF_V2";

const SIGNATURE_PROFILE_ID =
  "ddt.signature.ed25519-jcs-v2";

const SIGNATURE_PROFILE_VERSION =
  "0.2.0-draft.1";

const SIGNATURE_PROFILE_FILE =
  "ddt-ed25519-signature-profile-v0.2.json";

const PURPOSE_TARGET_PAIRS = {
  CONFORMANCE_ATTESTATION: "RECEIPT_CORE_HASH",
  DDT_REGISTRATION: "REGISTRATION_STATEMENT_HASH",
} as const;

export type DDTSupportedProofPurpose =
  keyof typeof PURPOSE_TARGET_PAIRS;

export type DDTSupportedSignedObjectType =
  (typeof PURPOSE_TARGET_PAIRS)[DDTSupportedProofPurpose];

export type DDTSignatureProof = {
  proofId: string;
  proofType: "DDT_SIGNATURE";
  proofPurpose: DDTSupportedProofPurpose;
  proofProfile: DDTArtifactReference;
  algorithm: "Ed25519";
  verificationMethod: string;
  signedObject: {
    type: DDTSupportedSignedObjectType;
    digest: DDTStructuralDigest;
  };
  signatureEncoding: "base64url";
  proofValue: string;
  createdAtClaim?: string;
};

function base64url(data: Buffer): string {
  return data
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function requireNonEmpty(
  value: string,
  label: string
): string {
  if (!value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return value;
}

export async function loadBaselineSignatureProfileRef(
  ddtRoot = path.join(process.cwd(), "docs", "ddt")
): Promise<DDTArtifactReference> {
  const profilePath = path.join(
    ddtRoot,
    "profiles",
    SIGNATURE_PROFILE_FILE
  );

  const bytes = await fs.readFile(profilePath);
  const document = JSON.parse(
    bytes.toString("utf8")
  ) as {
    profileId?: unknown;
    profileVersion?: unknown;
  };

  if (
    document.profileId !== SIGNATURE_PROFILE_ID ||
    document.profileVersion !==
      SIGNATURE_PROFILE_VERSION
  ) {
    throw new Error(
      "Signature Profile identity/version mismatch."
    );
  }

  return {
    artifactId: SIGNATURE_PROFILE_ID,
    version: SIGNATURE_PROFILE_VERSION,
    digest: {
      algorithm: "SHA-256",
      value: createHash("sha256")
        .update(bytes)
        .digest("hex"),
    },
    immutableRef: SIGNATURE_PROFILE_FILE,
    mediaType: "application/json",
  };
}

export async function createEd25519Proof(input: {
  proofId: string;
  purpose: DDTSupportedProofPurpose;
  targetDigest: DDTStructuralDigest;
  verificationMethod: string;
  privateKeyPem: string | Buffer;
  createdAtClaim?: string;
  ddtRoot?: string;
}): Promise<DDTSignatureProof> {
  const proofId = requireNonEmpty(
    input.proofId,
    "proofId"
  );

  const verificationMethod = requireNonEmpty(
    input.verificationMethod,
    "verificationMethod"
  );

  const targetType =
    PURPOSE_TARGET_PAIRS[input.purpose];

  if (!targetType) {
    throw new Error(
      `Unsupported proof purpose: ${input.purpose}`
    );
  }

  if (
    input.targetDigest.algorithm !== "SHA-256" ||
    !/^[0-9a-f]{64}$/.test(
      input.targetDigest.value
    )
  ) {
    throw new Error(
      "targetDigest must be a lowercase SHA-256 digest."
    );
  }

  const proofProfile =
    await loadBaselineSignatureProfileRef(
      input.ddtRoot
    );

  const proofWithoutValue = {
    proofId,
    proofType: "DDT_SIGNATURE" as const,
    proofPurpose: input.purpose,
    proofProfile,
    algorithm: "Ed25519" as const,
    verificationMethod,
    signedObject: {
      type: targetType,
      digest: input.targetDigest,
    },
    signatureEncoding: "base64url" as const,
    ...(input.createdAtClaim
      ? {
          createdAtClaim:
            input.createdAtClaim,
        }
      : {}),
  };

  const signingInput = Buffer.from(
    canonicalizeJcs({
      domain: SIGNATURE_DOMAIN,
      proofCore:
        proofWithoutValue as unknown as DDTJsonValue,
    }),
    "utf8"
  );

  const privateKey = createPrivateKey(
    input.privateKeyPem
  );

  if (
    privateKey.asymmetricKeyType !== "ed25519"
  ) {
    throw new Error(
      "Private key is not Ed25519."
    );
  }

  const signature = cryptoSign(
    null,
    signingInput,
    privateKey
  );

  if (signature.length !== 64) {
    throw new Error(
      "Ed25519 signature must be 64 bytes."
    );
  }

  const proofValue = base64url(signature);

  if (proofValue.length !== 86) {
    throw new Error(
      "Ed25519 proofValue must be exactly 86 base64url characters."
    );
  }

  return {
    ...proofWithoutValue,
    proofValue,
  };
}
